import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";
import { sendWhatsAppTemplate } from "../utils/whatsapp";

// Helper to get a fresh DB connection
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
  });
}

// Helper to create a notification
export async function createNotification(params: {
  recipientUserId: number;
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria' | 'fechamento_carga' | 'fechamento_semanal' | 'geral';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO notifications (recipient_user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)`,
      [params.recipientUserId, params.type, params.title, params.message || null, params.relatedId || null, params.relatedType || null]
    );
  } finally {
    await conn.end();
  }
}

// Helper to notify multiple users
export async function notifyUsers(params: {
  recipientUserIds: number[];
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria' | 'fechamento_carga' | 'fechamento_semanal' | 'geral';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  const conn = await getConnection();
  try {
    for (const userId of params.recipientUserIds) {
      await conn.execute(
        `INSERT INTO notifications (recipient_user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, params.type, params.title, params.message || null, params.relatedId || null, params.relatedType || null]
      );
    }
  } finally {
    await conn.end();
  }
}

// Helper to find users by role or name for notification targeting
export async function findUsersByRole(role: 'admin' | 'user'): Promise<number[]> {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE role = ?`,
      [role]
    ) as any;
    return rows.map((r: any) => r.id);
  } finally {
    await conn.end();
  }
}

// Find user by name (partial match)
export async function findUserByName(name: string): Promise<number | null> {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE name LIKE ? LIMIT 1`,
      [`%${name}%`]
    ) as any;
    return rows.length > 0 ? rows[0].id : null;
  } finally {
    await conn.end();
  }
}

// Notify financeiro (Julia Mary)
export async function notifyFinanceiro(params: {
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  // Find Julia Mary by name
  let juliaId = await findUserByName("Julia");
  if (!juliaId) juliaId = await findUserByName("julia");
  
  // Also notify all admins
  const adminIds = await findUsersByRole('admin');
  
  const allRecipients = new Set<number>();
  if (juliaId) allRecipients.add(juliaId);
  adminIds.forEach(id => allRecipients.add(id));
  
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params,
    });
  }
}

// Notify ADM/Comercial (Fábio)
export async function notifyAdmComercial(params: {
  type: 'fechamento_carga' | 'fechamento_semanal';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  // Find Fábio by name
  let fabioId = await findUserByName("Fábio");
  if (!fabioId) fabioId = await findUserByName("Fabio");
  
  // Also notify all admins
  const adminIds = await findUsersByRole('admin');
  
  const allRecipients = new Set<number>();
  if (fabioId) allRecipients.add(fabioId);
  adminIds.forEach(id => allRecipients.add(id));
  
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params,
    });
  }
}

// Busca quem está configurado em Configurações → Notificações como responsável(is) pela
// emissão de NF — pode ser mais de um, cada um sendo um colaborador cadastrado
// (collaboratorId) OU um contato avulso (manualName/manualPhone). Aceita o formato antigo
// (um único item direto, sem "recipients") pra manter compatibilidade com o que já foi salvo.
async function getNfResponsavelRecipients(): Promise<{ name: string; phone: string }[]> {
  const conn = await getConnection();
  try {
    const [rows]: any = await conn.execute(`SELECT value FROM notification_settings WHERE \`key\` = 'cargoNfResponsible'`);
    const raw = rows?.[0]?.value;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const rawRecipients: any[] = Array.isArray(parsed?.recipients)
      ? parsed.recipients
      : (parsed?.collaboratorId || parsed?.manualPhone) ? [parsed] : [];
    if (rawRecipients.length === 0) return [];

    const result: { name: string; phone: string }[] = [];
    for (const r of rawRecipients) {
      if (r?.collaboratorId) {
        const [collabRows]: any = await conn.execute(`SELECT name, phone FROM collaborators WHERE id = ? LIMIT 1`, [r.collaboratorId]);
        const collab = collabRows?.[0];
        if (collab?.phone) result.push({ name: collab.name, phone: collab.phone });
      } else if (r?.manualPhone) {
        result.push({ name: r.manualName || 'Responsável', phone: r.manualPhone });
      }
    }
    return result;
  } catch {
    return [];
  } finally {
    await conn.end();
  }
}

// Ao criar uma carga: avisa o responsável (global, configurável) pela emissão de NF via
// WhatsApp — placa, peso/m³, destino e nº da carga — com o link (sem login) pra anexar a NF
// direto naquela carga específica.
// Formata peso/volume pra exibição, priorizando a unidade cadastrada no destino/comprador
// (ton/m3) sobre o "chute" de olhar qual campo está preenchido — que falha quando a carga
// ainda não foi pesada mas o destino cobra por tonelada (ou vice-versa).
export function formatPesoOuVolume(weightNetKg: string | null | undefined, volumeM3: string | null | undefined, unit: 'ton' | 'm3' | null | undefined): string {
  const peso = weightNetKg ? parseFloat(weightNetKg) : 0;
  const vol = volumeM3 ? parseFloat(volumeM3) : 0;
  if (unit === 'ton') return `${(peso > 0 ? peso / 1000 : vol).toFixed(2)} ton`;
  if (unit === 'm3') return `${(vol > 0 ? vol : peso / 1000).toFixed(2)} m³`;
  return peso > 0 ? `${(peso / 1000).toFixed(2)} ton` : `${vol.toFixed(2)} m³`;
}

export async function notifyNfResponsavelNovaCarga(params: {
  db: any;
  cargoId: number;
  vehiclePlate: string;
  volumeM3?: string;
  weightNetKg?: string;
  destination: string;
  uploadToken: string;
  origin?: string;
  /** Unidade cadastrada no destino/comprador (ton/m3) — tem prioridade sobre o "chute"
   * de olhar qual campo (peso ou volume) está preenchido, que falha quando a carga ainda
   * não foi pesada mas o destino cobra por tonelada. */
  unit?: 'ton' | 'm3' | null;
}) {
  const recipients = await getNfResponsavelRecipients();
  if (recipients.length === 0) {
    console.log('[notifyNfResponsavelNovaCarga] Nenhum responsável pela emissão de NF configurado (ou sem telefone) — aviso pulado.');
    return;
  }
  const pesoOuVolume = formatPesoOuVolume(params.weightNetKg, params.volumeM3, params.unit);
  const baseUrl = params.origin || 'https://btreeambiental.com';
  const link = `${baseUrl}/nf-upload/${params.uploadToken}`;
  for (const recipient of recipients) {
    await sendWhatsAppTemplate({
      toPhone: recipient.phone,
      templateName: process.env.WHATSAPP_TEMPLATE_NOVA_CARGA,
      bodyParams: [params.vehiclePlate, pesoOuVolume, params.destination || 'N/I', String(params.cargoId), link],
    });
  }
}

// Ao anexar a NF de uma carga: avisa o responsável POR AQUELA carga (campo próprio da carga,
// editável) via WhatsApp que a NF foi anexada.
export async function notifyResponsavelCargaNfAnexada(params: {
  cargoId: number; responsavelCargaId: number | null; invoiceUrl: string | null;
  vehiclePlate?: string | null; volumeM3?: string | null; weightNetKg?: string | null; destination?: string | null;
  unit?: 'ton' | 'm3' | null;
}) {
  if (!params.responsavelCargaId) return;
  const conn = await getConnection();
  let phone: string | null = null;
  let name = '';
  try {
    const [rows]: any = await conn.execute(`SELECT phone, name FROM collaborators WHERE id = ? LIMIT 1`, [params.responsavelCargaId]);
    phone = rows?.[0]?.phone ?? null;
    name = rows?.[0]?.name ?? '';
  } finally {
    await conn.end();
  }
  if (!phone) {
    console.log(`[notifyResponsavelCargaNfAnexada] Responsável (${name || params.responsavelCargaId}) sem telefone — aviso pulado.`);
    return;
  }
  const pesoOuVolume = formatPesoOuVolume(params.weightNetKg, params.volumeM3, params.unit);
  await sendWhatsAppTemplate({
    toPhone: phone,
    templateName: process.env.WHATSAPP_TEMPLATE_NF_ANEXADA,
    bodyParams: [String(params.cargoId), params.vehiclePlate || 'N/I', pesoOuVolume, params.destination || 'N/I', params.invoiceUrl || 'N/D'],
  });
}

export const notificationsRouter = router({
  // List notifications for current user
  list: protectedProcedure
    .input(z.object({
      onlyUnread: z.boolean().optional().default(false),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        const onlyUnread = input?.onlyUnread ?? false;
        const limit = input?.limit ?? 50;
        
        let query = `SELECT * FROM notifications WHERE recipient_user_id = ?`;
        const params: any[] = [ctx.user.id];
        
        if (onlyUnread) {
          query += ` AND is_read = 0`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);
        
        const [rows] = await conn.execute(query, params) as any;
        return rows;
      } finally {
        await conn.end();
      }
    }),

  // Get unread count
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const conn = await getConnection();
      try {
        const [rows] = await conn.execute(
          `SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = ? AND is_read = 0`,
          [ctx.user.id]
        ) as any;
        return { count: rows[0]?.count || 0 };
      } finally {
        await conn.end();
      }
    }),

  // Mark one as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?`,
          [input.id, ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND is_read = 0`,
          [ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Delete a notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `DELETE FROM notifications WHERE id = ? AND recipient_user_id = ?`,
          [input.id, ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),
});
