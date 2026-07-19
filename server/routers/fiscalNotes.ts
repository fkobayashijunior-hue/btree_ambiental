import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { fiscalNotes } from "../../drizzle/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { storagePut } from "../storage";

// Gera o próximo código de ação AC-XXXXX
async function getNextActionCode(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  if (!db) return "AC-00001";
  try {
    const [row] = await db.execute(sql`
      SELECT action_code FROM fiscal_notes ORDER BY id DESC LIMIT 1
    `) as any;
    const rows = row as any[];
    if (!rows || rows.length === 0) return "AC-00001";
    const last = rows[0]?.action_code as string;
    if (!last) return "AC-00001";
    const num = parseInt(last.replace("AC-", ""), 10);
    return `AC-${String(num + 1).padStart(5, "0")}`;
  } catch {
    return "AC-00001";
  }
}

export const fiscalNotesRouter = router({
  // Listar todas as notas com filtros
  list: protectedProcedure
    .input(z.object({
      quantityType: z.enum(["m3", "ton", "all"]).optional(),
      status: z.enum(["available", "used", "all"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.quantityType && input.quantityType !== "all") {
        conditions.push(eq(fiscalNotes.quantityType, input.quantityType));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(fiscalNotes.status, input.status));
      }
      const rows = await db.select()
        .from(fiscalNotes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(fiscalNotes.id));
      return rows;
    }),

  // Listar apenas notas disponíveis para o select no Controle de Cargas
  getAvailable: protectedProcedure
    .input(z.object({
      quantityType: z.enum(["m3", "ton", "all"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [eq(fiscalNotes.status, "available")];
      if (input?.quantityType && input.quantityType !== "all") {
        conditions.push(eq(fiscalNotes.quantityType, input.quantityType));
      }
      const rows = await db.select()
        .from(fiscalNotes)
        .where(and(...conditions))
        .orderBy(desc(fiscalNotes.id));
      return rows;
    }),

  // Criar nova nota/ação
  create: protectedProcedure
    .input(z.object({
      invoiceNumber: z.string().optional(),
      issueDate: z.string(),
      quantityType: z.enum(["m3", "ton"]),
      quantity: z.string(),
      fileBase64: z.string().optional(), // base64 do arquivo
      fileName: z.string().optional(),
      fileMimeType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");

      const actionCode = await getNextActionCode(db);

      let fileUrl: string | null = null;
      if (input.fileBase64 && input.fileName) {
        try {
          const buffer = Buffer.from(input.fileBase64, "base64");
          const ext = input.fileName.split(".").pop() || "pdf";
          const key = `fiscal-notes/${actionCode}-${Date.now()}.${ext}`;
          const result = await storagePut(key, buffer, input.fileMimeType || "application/pdf");
          fileUrl = result.url;
        } catch (e) {
          console.error("Erro upload fiscal note:", e);
        }
      }

      await db.insert(fiscalNotes).values({
        actionCode,
        invoiceNumber: input.invoiceNumber || null,
        issueDate: input.issueDate,
        quantityType: input.quantityType,
        quantity: input.quantity,
        fileUrl,
        status: "available",
        notes: input.notes || null,
        createdBy: ctx.user.id,
      });

      return { success: true, actionCode };
    }),

  // Marcar nota como utilizada (chamado ao salvar uma carga)
  markAsUsed: protectedProcedure
    .input(z.object({
      id: z.number(),
      cargoId: z.number().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      const today = new Date().toISOString().split("T")[0];
      await db.update(fiscalNotes)
        .set({
          status: "used",
          usedByCargoId: input.cargoId || null,
          usedByClientId: input.clientId || null,
          usedByClientName: input.clientName || null,
          usedAt: today,
        })
        .where(eq(fiscalNotes.id, input.id));
      return { success: true };
    }),

  // Liberar nota (desfazer uso — admin)
  release: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      await db.update(fiscalNotes)
        .set({
          status: "available",
          usedByCargoId: null,
          usedByClientId: null,
          usedByClientName: null,
          usedAt: null,
        })
        .where(eq(fiscalNotes.id, input.id));
      return { success: true };
    }),

  // Deletar nota (somente disponíveis)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      await db.delete(fiscalNotes).where(eq(fiscalNotes.id, input.id));
      return { success: true };
    }),

  // Estatísticas rápidas
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, available: 0, used: 0, m3Available: 0, tonAvailable: 0 };
    try {
      const [rows] = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          SUM(status = 'available') as available,
          SUM(status = 'used') as used,
          SUM(status = 'available' AND quantity_type = 'm3') as m3Available,
          SUM(status = 'available' AND quantity_type = 'ton') as tonAvailable
        FROM fiscal_notes
      `) as any;
      const r = (rows as any[])[0] || {};
      return {
        total: Number(r.total) || 0,
        available: Number(r.available) || 0,
        used: Number(r.used) || 0,
        m3Available: Number(r.m3Available) || 0,
        tonAvailable: Number(r.tonAvailable) || 0,
      };
    } catch {
      return { total: 0, available: 0, used: 0, m3Available: 0, tonAvailable: 0 };
    }
  }),
});
