import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { fiscalNotes, cargoLoads, gpsLocations, cargoDestinations } from "../../drizzle/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

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
  // Prévia do próximo código de ação (para o formulário de Nova Carga)
  nextActionCode: protectedProcedure.query(async () => {
    const db = await getDb();
    return { actionCode: await getNextActionCode(db) };
  }),

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
          const result = await cloudinaryUpload(buffer, "btree", `${actionCode}-${Date.now()}.${ext}`);
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
      destination: z.string().optional(),
      workLocation: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      // Verificar se a nota já está em uso por outra carga
      const [existing] = await db.select({ id: fiscalNotes.id, status: fiscalNotes.status, usedByCargoId: fiscalNotes.usedByCargoId })
        .from(fiscalNotes)
        .where(eq(fiscalNotes.id, input.id))
        .limit(1);
      if (existing?.status === 'used' && existing?.usedByCargoId && existing.usedByCargoId !== input.cargoId) {
        throw new Error(`Esta nota/ação já foi utilizada em outra carga (ID ${existing.usedByCargoId}). Não é possível usar a mesma nota em mais de uma carga.`);
      }
      const today = new Date().toISOString().split("T")[0];
      // Montar nota de uso com local e destino
      const usageNote = [input.workLocation, input.destination].filter(Boolean).join(' → ');
      await db.update(fiscalNotes)
        .set({
          status: "used",
          usedByCargoId: input.cargoId || null,
          usedByClientId: input.clientId || null,
          usedByClientName: input.clientName || null,
          usedAt: today,
          notes: usageNote || null,
        })
        .where(eq(fiscalNotes.id, input.id));
      return { success: true };
    }),

  // Editar nota/ação (data, quantidade, NF, observações, arquivo)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      invoiceNumber: z.string().optional(),
      issueDate: z.string().optional(),
      quantityType: z.enum(["m3", "ton"]).optional(),
      quantity: z.string().optional(),
      fileBase64: z.string().optional(),
      fileName: z.string().optional(),
      fileMimeType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      const { id, fileBase64, fileName, fileMimeType, ...fields } = input;
      let fileUrl: string | undefined;
      if (fileBase64 && fileName) {
        try {
          const buffer = Buffer.from(fileBase64, "base64");
          const ext = fileName.split(".").pop() || "pdf";
          const result = await cloudinaryUpload(buffer, "btree", `fiscal-note-edit-${id}-${Date.now()}.${ext}`);
          fileUrl = result.url;
        } catch (e) {
          console.error("Erro upload fiscal note update:", e);
        }
      }
      const updateData: any = {};
      if (fields.invoiceNumber !== undefined) updateData.invoiceNumber = fields.invoiceNumber || null;
      if (fields.issueDate) updateData.issueDate = fields.issueDate;
      if (fields.quantityType) updateData.quantityType = fields.quantityType;
      if (fields.quantity) updateData.quantity = fields.quantity;
      if (fields.notes !== undefined) updateData.notes = fields.notes || null;
      if (fileUrl) updateData.fileUrl = fileUrl;
      await db.update(fiscalNotes).set(updateData).where(eq(fiscalNotes.id, id));
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

  // Relatório-planilha: notas com dados da carga, local e destino
  report: protectedProcedure
    .input(z.object({
      workLocationId: z.number().optional(),
      destinationId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(500),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          noteId: fiscalNotes.id,
          actionCode: fiscalNotes.actionCode,
          noteInvoiceNumber: fiscalNotes.invoiceNumber,
          issueDate: fiscalNotes.issueDate,
          quantityType: fiscalNotes.quantityType,
          noteQuantity: fiscalNotes.quantity,
          noteFileUrl: fiscalNotes.fileUrl,
          noteStatus: fiscalNotes.status,
          noteNotes: fiscalNotes.notes,
          usedAt: fiscalNotes.usedAt,
          // Carga vinculada
          cargoId: cargoLoads.id,
          cargoDate: cargoLoads.date,
          cargoDeliveryDate: cargoLoads.deliveryDate,
          cargoInvoiceNumber: cargoLoads.invoiceNumber,
          cargoInvoiceUrl: cargoLoads.invoiceUrl,
          cargoVolumeM3: cargoLoads.volumeM3,
          cargoWeightNetKg: cargoLoads.weightNetKg,
          cargoDestination: cargoLoads.destination,
          cargoDestinationId: cargoLoads.destinationId,
          cargoVehiclePlate: cargoLoads.vehiclePlate,
          cargoDriverName: cargoLoads.driverName,
          cargoStatus: cargoLoads.status,
          cargoWorkLocationId: cargoLoads.workLocationId,
          // Local (GPS)
          workLocationName: gpsLocations.name,
          // Destino cadastrado
          destinationName: cargoDestinations.name,
          destinationNickname: cargoDestinations.nickname,
          destinationPriceType: cargoDestinations.priceType,
        })
        .from(fiscalNotes)
        .leftJoin(cargoLoads, eq(fiscalNotes.usedByCargoId, cargoLoads.id))
        .leftJoin(gpsLocations, eq(cargoLoads.workLocationId, gpsLocations.id))
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .orderBy(desc(fiscalNotes.id))
        .limit(input?.limit ?? 500);
      let filtered: any[] = rows;
      if (input?.workLocationId) filtered = filtered.filter((r: any) => r.cargoWorkLocationId === input.workLocationId);
      if (input?.destinationId) {
        // Destinos/compradores estão unificados em cargo_destinations; cargas novas gravam
        // destination_id com offset 10000+, antigas gravam id puro ou apenas o nome no texto.
        const rawId = input.destinationId;
        const realId = rawId >= 10000 ? rawId - 10000 : rawId;
        let destName = '', destNick = '';
        try {
          const [d] = await db.select({ name: cargoDestinations.name, nickname: cargoDestinations.nickname })
            .from(cargoDestinations).where(eq(cargoDestinations.id, realId)).limit(1);
          destName = (d?.name || '').toUpperCase();
          destNick = (d?.nickname || '').toUpperCase();
        } catch { /* silent */ }
        const keys = [destName, destNick].filter(k => k && k.trim());
        filtered = filtered.filter((r: any) => {
          if (r.cargoDestinationId === rawId || r.cargoDestinationId === realId) return true;
          const txt = (r.cargoDestination || r.destinationName || r.destinationNickname || '').toUpperCase();
          if (!txt) return false;
          return keys.some(k => txt === k || txt.startsWith(k + ' —') || txt.startsWith(k + ' -') || txt.includes(k));
        });
      }
      if (input?.dateFrom) filtered = filtered.filter((r: any) => (r.cargoDate || r.issueDate || '') >= input.dateFrom!);
      if (input?.dateTo) filtered = filtered.filter((r: any) => (r.cargoDate || r.issueDate || '') <= input.dateTo! + 'T23:59:59');
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter((r: any) =>
          r.actionCode?.toLowerCase().includes(s) ||
          (r.noteInvoiceNumber || '').toLowerCase().includes(s) ||
          (r.cargoDestination || '').toLowerCase().includes(s) ||
          (r.destinationName || '').toLowerCase().includes(s) ||
          (r.destinationNickname || '').toLowerCase().includes(s) ||
          (r.workLocationName || '').toLowerCase().includes(s) ||
          (r.cargoVehiclePlate || '').toLowerCase().includes(s)
        );
      }
      return filtered;
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
