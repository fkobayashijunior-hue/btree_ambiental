import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { extraExpenses, gpsLocations, userPermissions, collaborators, financialEntries, equipment } from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { sanitizeNumeric } from "../utils/sanitize";

export const extraExpensesRouter = router({
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.dateFrom) {
        conditions.push(gte(extraExpenses.date, input.dateFrom));
      }
      if (input.dateTo) {
        conditions.push(lte(extraExpenses.date, input.dateTo + " 23:59:59"));
      }
      if (input.category) {
        conditions.push(eq(extraExpenses.category, input.category as any));
      }

      // Verificar se o usuário tem restrição de clientes (server-side filtering)
      let allowedClientIds: number[] | null = null;
      if (ctx.user.role !== "admin") {
        // Tentar buscar da tabela user_permissions
        try {
          const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
          if (perm?.allowedClientIds) {
            allowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
          }
        } catch {
          // Fallback com SQL raw se colunas não existem
          try {
            const [rows] = await db.execute(sql`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`) as any;
            const row = (rows as any[])?.[0];
            if (row?.allowed_client_ids) {
              allowedClientIds = JSON.parse(row.allowed_client_ids) as number[];
            }
          } catch {
            // Ignorar
          }
        }

        // Fallback: verificar collaborator.client_id
        if (!allowedClientIds) {
          try {
            const [collab] = await db.select({ clientId: collaborators.clientId })
              .from(collaborators).where(eq(collaborators.userId, ctx.user.id));
            if (collab?.clientId) {
              allowedClientIds = [collab.clientId];
            }
          } catch {
            // Ignorar
          }
        }
      }

      const rows = await db
        .select({
          id: extraExpenses.id,
          date: extraExpenses.date,
          category: extraExpenses.category,
          description: extraExpenses.description,
          amount: extraExpenses.amount,
          paymentMethod: extraExpenses.paymentMethod,
          receiptImageUrl: extraExpenses.receiptImageUrl,
          notes: extraExpenses.notes,
          registeredBy: extraExpenses.registeredBy,
          registeredByName: extraExpenses.registeredByName,
          createdAt: extraExpenses.createdAt,
          workLocationId: extraExpenses.workLocationId,
          clientId: extraExpenses.clientId,
          equipmentId: extraExpenses.equipmentId,
          locationName: gpsLocations.name,
          locationClientId: gpsLocations.clientId,
        })
        .from(extraExpenses)
        .leftJoin(gpsLocations, eq(extraExpenses.workLocationId, gpsLocations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(extraExpenses.date));

      // Filtrar por cliente se encarregado
      if (allowedClientIds && allowedClientIds.length > 0) {
        return rows.filter(r => {
          const cId = r.clientId || r.locationClientId;
          return cId && allowedClientIds!.includes(cId);
        });
      }
      return rows;
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      category: z.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]),
      description: z.string().min(1),
      amount: z.string().min(1),
      paymentMethod: z.enum(["dinheiro", "pix", "cartao", "debito", "transferencia"]).default("dinheiro"),
      receiptImageUrl: z.string().optional(),
      notes: z.string().optional(),
      workLocationId: z.number().optional(),
      clientId: z.number().optional(),
      equipmentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(extraExpenses).values({
        date: input.date,
        category: input.category,
        description: input.description,
        amount: sanitizeNumeric(input.amount) ?? input.amount,
        paymentMethod: input.paymentMethod,
        receiptImageUrl: input.receiptImageUrl,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
        workLocationId: input.workLocationId || null,
        clientId: input.clientId || null,
        equipmentId: input.equipmentId || null,
      });
      // Auto-generate financial entry when equipment is linked
      if (input.equipmentId && parseFloat(input.amount.replace(',', '.')) > 0) {
        try {
          const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq(equipment.id, input.equipmentId));
          const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
          const dateObj = new Date(input.date);
          const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          const catLabels: Record<string, string> = { abastecimento: 'combustivel', refeicao: 'alimentacao', compra_material: 'material', servico_terceiro: 'servico_terceiro', pedagio: 'transporte', outro: 'outro_despesa' };
          await db.insert(financialEntries).values({
            type: 'despesa',
            category: catLabels[input.category] || 'outro_despesa',
            description: `${input.description} - ${eqName}`,
            amount: input.amount.replace(',', '.'),
            date: dateObj.toISOString().slice(0, 10),
            referenceMonth: refMonth,
            paymentMethod: input.paymentMethod as any,
            status: 'confirmado',
            autoGenerated: 1,
            equipmentId: input.equipmentId,
            equipmentName: eqName,
            registeredBy: ctx.user.id,
            registeredByName: ctx.user.name + ' (auto)',
          });
        } catch { /* não bloquear se financeiro falhar */ }
      }
      return { id: (result as any).insertId };
    }),

  updateLocation: protectedProcedure
    .input(z.object({
      id: z.number(),
      workLocationId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(extraExpenses).set({
        workLocationId: input.workLocationId,
      }).where(eq(extraExpenses.id, input.id));
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      category: z.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]).optional(),
      description: z.string().min(1).optional(),
      amount: z.string().optional(),
      paymentMethod: z.enum(["dinheiro", "pix", "cartao", "debito", "transferencia"]).optional(),
      receiptImageUrl: z.string().optional(),
      notes: z.string().optional(),
      workLocationId: z.number().optional(),
      equipmentId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...fields } = input;
      await db.update(extraExpenses).set({
        ...(fields.date !== undefined && { date: fields.date }),
        ...(fields.category !== undefined && { category: fields.category }),
        ...(fields.description !== undefined && { description: fields.description }),
        ...(fields.amount !== undefined && { amount: sanitizeNumeric(fields.amount) ?? fields.amount }),
        ...(fields.paymentMethod !== undefined && { paymentMethod: fields.paymentMethod as any }),
        ...(fields.receiptImageUrl !== undefined && { receiptImageUrl: fields.receiptImageUrl }),
        ...(fields.notes !== undefined && { notes: fields.notes }),
        ...(fields.workLocationId !== undefined && { workLocationId: fields.workLocationId || null }),
        ...(fields.equipmentId !== undefined && { equipmentId: fields.equipmentId || null }),
      }).where(eq(extraExpenses.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(extraExpenses).where(eq(extraExpenses.id, input.id));
      return { success: true };
    }),
});
