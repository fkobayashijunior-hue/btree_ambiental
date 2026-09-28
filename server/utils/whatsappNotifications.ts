/**
 * whatsappNotifications.ts
 * Avisos via WhatsApp pra eventos de Solicitação de Compra (financeiro quando uma nova
 * é criada, solicitante quando ela é comprada). Diferente do bot de conversa
 * (server/webhooks/whatsappPurchaseBot.ts), essas mensagens são iniciadas pela empresa
 * fora da janela de 24h de conversa — por isso dependem de Message Templates aprovados
 * no WhatsApp Manager (nomes configuráveis via env, sem precisar mexer em código).
 */
import { sql } from "drizzle-orm";
import { sendWhatsAppTemplate } from "./whatsapp";

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || "https://btreeambiental.com").replace(/\/$/, "");
}

function formatItemsList(items: Array<{ name: string; quantity?: string | null; unit?: string | null }>): string {
  if (!items || items.length === 0) return "—";
  return items.map(i => `${i.name} (${i.quantity || "1"} ${i.unit || "un"})`).join(", ");
}

// Destinatários configuráveis pela tela de Configuração de Notificações (mesmo padrão do
// "Responsável pela emissão de NF" — collaboratorId cadastrado OU nome/telefone avulso),
// em vez do antigo hardcoded "Julia + todos os admins", que mandava mensagem demais.
async function getPurchaseRequestNewResponsiblePhones(db: any): Promise<string[]> {
  const [rows] = await db.execute(sql`
    SELECT value FROM notification_settings WHERE \`key\` = 'purchaseRequestNewResponsible'
  `) as any;
  const row = (rows as any[])[0];
  if (!row?.value) return [];
  let parsed: any;
  try { parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value; } catch { return []; }
  const recipients: Array<{ collaboratorId: number | null; manualPhone: string | null }> = parsed?.recipients || [];
  if (recipients.length === 0) return [];

  const collaboratorIds = recipients.map(r => r.collaboratorId).filter((id): id is number => !!id);
  let collaboratorPhones: Record<number, string> = {};
  if (collaboratorIds.length > 0) {
    const [collabRows] = await db.execute(sql`SELECT id, phone FROM collaborators WHERE id IN (${sql.join(collaboratorIds, sql`, `)})`) as any;
    collaboratorPhones = Object.fromEntries((collabRows as any[]).map(r => [r.id, r.phone]));
  }

  const phones = recipients
    .map(r => r.collaboratorId ? collaboratorPhones[r.collaboratorId] : r.manualPhone)
    .filter((p): p is string => !!p && p.trim() !== '');
  return Array.from(new Set(phones));
}

export async function notifyFinanceiroNewPurchaseRequestWhatsApp(
  db: any,
  params: { requestId: number; title: string; requesterName: string; items: Array<{ name: string; quantity?: string; unit?: string }> }
) {
  try {
    const phones = await getPurchaseRequestNewResponsiblePhones(db);
    if (phones.length === 0) {
      console.log("[WhatsAppNotify] Nenhum responsável configurado em Configuração de Notificações — aviso pulado.");
      return;
    }
    const link = `${appBaseUrl()}/compras/${params.requestId}`;
    const itemsList = formatItemsList(params.items);
    for (const phone of phones) {
      await sendWhatsAppTemplate({
        toPhone: phone,
        templateName: process.env.WHATSAPP_TEMPLATE_NOVA_SOLICITACAO_COMPRA,
        bodyParams: [params.title, params.requesterName, itemsList, link],
      });
    }
  } catch (err) {
    console.error("[WhatsAppNotify] Falha ao notificar financeiro (nova solicitação):", err);
  }
}

// Solicitante original — busca o telefone pelo mesmo vínculo collaborators.user_id usado
// pelo bot de conversa. Se o solicitante não tiver telefone vinculado, só loga e segue.
export async function notifyRequesterPurchaseCompletedWhatsApp(db: any, requestId: number) {
  try {
    const [prRows] = await db.execute(sql`SELECT title, requested_by FROM purchase_requests WHERE id = ${requestId} LIMIT 1`) as any;
    const pr = (prRows as any[])[0];
    if (!pr || !pr.requested_by) return;

    const [phoneRows] = await db.execute(sql`
      SELECT phone FROM collaborators WHERE user_id = ${pr.requested_by} AND phone IS NOT NULL AND phone != '' LIMIT 1
    `) as any;
    const phone = (phoneRows as any[])[0]?.phone;
    if (!phone) {
      console.log(`[WhatsAppNotify] Solicitante da compra #${requestId} sem telefone vinculado — aviso pulado.`);
      return;
    }

    const [itemRows] = await db.execute(sql`SELECT name, quantity, unit FROM purchase_request_items WHERE request_id = ${requestId}`) as any;
    const itemsList = formatItemsList(itemRows as any[]);
    const link = `${appBaseUrl()}/compras/${requestId}`;

    await sendWhatsAppTemplate({
      toPhone: phone,
      templateName: process.env.WHATSAPP_TEMPLATE_COMPRA_REALIZADA,
      bodyParams: [pr.title, itemsList, link],
    });
  } catch (err) {
    console.error("[WhatsAppNotify] Falha ao notificar solicitante (compra realizada):", err);
  }
}
