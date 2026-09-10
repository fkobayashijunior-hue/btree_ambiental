import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

const JOB_KEYS = ["pagamentosPendentes", "boletoCombustivel", "fechamentoSemanal"] as const;

const JOB_META: Record<string, { label: string; description: string; weekly: boolean }> = {
  pagamentosPendentes: {
    label: "Pagamentos Pendentes",
    description: "Notifica diariamente quando há presenças com pagamento em aberto.",
    weekly: false,
  },
  boletoCombustivel: {
    label: "Boletos de Combustível",
    description: "Notifica diariamente quando há boletos de combustível vencendo.",
    weekly: false,
  },
  fechamentoSemanal: {
    label: "Fechamento Semanal",
    description: "Notifica o fechamento automático semanal das cargas.",
    weekly: true,
  },
};

const CLIENT_NOTIF_KEYS = ["cargaRegistrada", "cargaEntregue", "pagamentoConfirmado"] as const;

const CLIENT_META = {
  cargaRegistrada: {
    label: "Carga registrada",
    description: "Notifica o cliente via WhatsApp quando uma nova carga é registrada.",
    template: "carga_registrada",
  },
  cargaEntregue: {
    label: "Carga entregue",
    description: "Notifica o cliente via WhatsApp quando a carga é marcada como entregue.",
    template: "carga_entregue",
  },
  pagamentoConfirmado: {
    label: "Pagamento confirmado",
    description: "Notifica o cliente via WhatsApp quando o fechamento semanal é marcado como pago.",
    template: "pagamento_confirmado",
  },
};

const DEFAULT_JOB_CONFIG = Object.fromEntries(
  JOB_KEYS.map((k) => [
    k,
    { enabled: true, hour: 8, minute: 0, weekday: k === "fechamentoSemanal" ? 5 : null, whatsappCollaboratorIds: [] },
  ])
);

const DEFAULT_CLIENT_CONFIG = Object.fromEntries(
  CLIENT_NOTIF_KEYS.map((k) => [k, { enabled: false, clientIds: [] }])
);

async function ensureTable(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getSetting(db: any, key: string): Promise<any> {
  const rows: any[] = await db.execute(sql`SELECT value FROM notification_settings WHERE \`key\` = ${key}`);
  const data = Array.isArray(rows[0]) ? rows[0] : rows;
  if (!data || data.length === 0) return null;
  const val = data[0]?.value;
  if (!val) return null;
  return typeof val === "string" ? JSON.parse(val) : val;
}

async function setSetting(db: any, key: string, value: any) {
  const json = JSON.stringify(value);
  await db.execute(sql`
    INSERT INTO notification_settings (\`key\`, value) VALUES (${key}, ${json})
    ON DUPLICATE KEY UPDATE value = ${json}
  `);
}

export const notificationSettingsRouter = router({
  get: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {
      config: DEFAULT_JOB_CONFIG, clientConfig: DEFAULT_CLIENT_CONFIG,
      jobKeys: JOB_KEYS, meta: JOB_META,
      collaborators: [], clientNotifKeys: CLIENT_NOTIF_KEYS, clientMeta: CLIENT_META, clients: [],
    };

    await ensureTable(db);

    const storedConfig = await getSetting(db, "jobConfig");
    const storedClientConfig = await getSetting(db, "clientConfig");
    const storedCargoNfResponsible = await getSetting(db, "cargoNfResponsible");

    const config = storedConfig ? { ...DEFAULT_JOB_CONFIG, ...storedConfig } : DEFAULT_JOB_CONFIG;
    const clientConfig = storedClientConfig ? { ...DEFAULT_CLIENT_CONFIG, ...storedClientConfig } : DEFAULT_CLIENT_CONFIG;
    // Responsáveis (global, pode ser mais de um) pela emissão de NF — recebem o aviso via
    // WhatsApp quando uma carga é criada, pedindo a emissão com placa/peso-m³/destino e o link
    // pra anexar o arquivo. Formato antigo (um único collaboratorId/manualPhone direto, sem
    // "recipients") é convertido aqui pra manter compatibilidade com o que já foi salvo.
    let cargoNfResponsible: { recipients: Array<{ collaboratorId: number | null; manualName: string | null; manualPhone: string | null }> };
    if (storedCargoNfResponsible?.recipients) {
      cargoNfResponsible = storedCargoNfResponsible;
    } else if (storedCargoNfResponsible?.collaboratorId || storedCargoNfResponsible?.manualPhone) {
      cargoNfResponsible = {
        recipients: [{
          collaboratorId: storedCargoNfResponsible.collaboratorId ?? null,
          manualName: storedCargoNfResponsible.manualName ?? null,
          manualPhone: storedCargoNfResponsible.manualPhone ?? null,
        }],
      };
    } else {
      cargoNfResponsible = { recipients: [] };
    }

    // Buscar colaboradores ativos com telefone
    let collaborators: { id: number; name: string; phone: string | null }[] = [];
    try {
      const rows: any[] = await db.execute(sql`SELECT id, name, phone FROM collaborators WHERE active = 1 ORDER BY name`);
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      collaborators = (data || []).map((r: any) => ({ id: r.id, name: r.name, phone: r.phone || null }));
    } catch { /* tabela pode nao existir */ }

    // Buscar clientes ativos com telefone
    let clients: { id: number; name: string; phone: string | null }[] = [];
    try {
      const rows: any[] = await db.execute(sql`SELECT id, name, phone FROM clients WHERE active = 1 ORDER BY name`);
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      clients = (data || []).map((r: any) => ({ id: r.id, name: r.name, phone: r.phone || null }));
    } catch { /* tabela pode nao existir */ }

    return {
      config,
      clientConfig,
      jobKeys: JOB_KEYS,
      meta: JOB_META,
      collaborators,
      clientNotifKeys: CLIENT_NOTIF_KEYS,
      clientMeta: CLIENT_META,
      clients,
      cargoNfResponsible,
    };
  }),

  // Define quem são os responsáveis (global, pode ser mais de um) pela emissão de NF do
  // Controle de Cargas. Cada item pode ser um colaborador cadastrado (collaboratorId) OU um
  // contato avulso (manualName/manualPhone), pra quando a pessoa não tem cadastro no sistema.
  updateCargoNfResponsible: protectedProcedure
    .input(z.object({
      recipients: z.array(z.object({
        collaboratorId: z.number().nullable(),
        manualName: z.string().nullable().optional(),
        manualPhone: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await ensureTable(db);
      await setSetting(db, "cargoNfResponsible", input);
      return { ok: true };
    }),

  update: protectedProcedure
    .input(z.record(z.string(), z.object({
      enabled: z.boolean(),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
      weekday: z.number().int().min(0).max(6).nullable(),
      whatsappCollaboratorIds: z.array(z.number()),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await ensureTable(db);
      await setSetting(db, "jobConfig", input);
      return { ok: true };
    }),

  updateClientConfig: protectedProcedure
    .input(z.record(z.string(), z.object({
      enabled: z.boolean(),
      clientIds: z.array(z.number()),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await ensureTable(db);
      await setSetting(db, "clientConfig", input);
      return { ok: true };
    }),
});
