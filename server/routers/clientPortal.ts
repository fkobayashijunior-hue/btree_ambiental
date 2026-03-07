import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, clientPortalAccess, cargoLoads, replantingRecords, clientPayments } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * Portal do Cliente — acesso via código de 6 dígitos
 * Público: login com código
 * Protegido (admin): criar/gerenciar acessos, registrar replantio e pagamentos
 */
export const clientPortalRouter = router({

  // ── LOGIN DO CLIENTE (público) ──
  login: publicProcedure
    .input(z.object({ accessCode: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [access] = await db
        .select({
          id: clientPortalAccess.id,
          clientId: clientPortalAccess.clientId,
          active: clientPortalAccess.active,
          clientName: clients.name,
          clientPhone: clients.phone,
          clientEmail: clients.email,
          clientCity: clients.city,
        })
        .from(clientPortalAccess)
        .innerJoin(clients, eq(clientPortalAccess.clientId, clients.id))
        .where(
          and(
            eq(clientPortalAccess.accessCode, input.accessCode.trim().toUpperCase()),
            eq(clientPortalAccess.active, 1),
            eq(clients.active, 1)
          )
        )
        .limit(1);

      if (!access) throw new Error("Código de acesso inválido ou inativo.");

      // Atualizar último acesso
      await db
        .update(clientPortalAccess)
        .set({ lastAccessAt: new Date() })
        .where(eq(clientPortalAccess.id, access.id));

      return {
        clientId: access.clientId,
        clientName: access.clientName,
        clientPhone: access.clientPhone,
        clientEmail: access.clientEmail,
        clientCity: access.clientCity,
      };
    }),

  // ── DADOS DO PORTAL (público — requer clientId validado no frontend) ──
  getPortalData: publicProcedure
    .input(z.object({ clientId: z.number(), accessCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar que o código ainda é válido
      const [access] = await db
        .select({ id: clientPortalAccess.id })
        .from(clientPortalAccess)
        .where(
          and(
            eq(clientPortalAccess.clientId, input.clientId),
            eq(clientPortalAccess.accessCode, input.accessCode.trim().toUpperCase()),
            eq(clientPortalAccess.active, 1)
          )
        )
        .limit(1);

      if (!access) throw new Error("Acesso não autorizado.");

      // Buscar dados do cliente
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      // Cargas vinculadas ao cliente
      const loads = await db
        .select()
        .from(cargoLoads)
        .where(eq(cargoLoads.clientId, input.clientId))
        .orderBy(desc(cargoLoads.date))
        .limit(50);

      // Replantios vinculados ao cliente
      const replanting = await db
        .select()
        .from(replantingRecords)
        .where(eq(replantingRecords.clientId, input.clientId))
        .orderBy(desc(replantingRecords.date))
        .limit(50);

      // Pagamentos vinculados ao cliente
      const payments = await db
        .select()
        .from(clientPayments)
        .where(eq(clientPayments.clientId, input.clientId))
        .orderBy(desc(clientPayments.referenceDate))
        .limit(50);

      return { client, loads, replanting, payments };
    }),

  // ── GERAR CÓDIGO DE ACESSO (admin) ──
  generateAccessCode: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Desativar código anterior
      await db
        .update(clientPortalAccess)
        .set({ active: 0 })
        .where(eq(clientPortalAccess.clientId, input.clientId));

      // Gerar novo código de 6 dígitos
      const code = crypto.randomInt(100000, 999999).toString();

      await db.insert(clientPortalAccess).values({
        clientId: input.clientId,
        accessCode: code,
        active: 1,
        createdBy: ctx.user.id,
      });

      return { accessCode: code };
    }),

  // ── REGISTRAR REPLANTIO (admin) ──
  addReplanting: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      date: z.string(),
      area: z.string().optional(),
      species: z.string().optional(),
      quantity: z.number().optional(),
      areaHectares: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(replantingRecords).values({
        clientId: input.clientId,
        date: new Date(input.date),
        area: input.area,
        species: input.species || "Eucalipto",
        quantity: input.quantity,
        areaHectares: input.areaHectares,
        notes: input.notes,
        registeredBy: ctx.user.id,
      });

      return { success: true };
    }),

  // ── REGISTRAR PAGAMENTO (admin) ──
  addPayment: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      referenceDate: z.string(),
      description: z.string().optional(),
      volumeM3: z.string().optional(),
      pricePerM3: z.string().optional(),
      grossAmount: z.string(),
      deductions: z.string().optional(),
      netAmount: z.string(),
      status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).default("pendente"),
      dueDate: z.string().optional(),
      paidAt: z.string().optional(),
      pixKey: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(clientPayments).values({
        clientId: input.clientId,
        referenceDate: new Date(input.referenceDate),
        description: input.description,
        volumeM3: input.volumeM3,
        pricePerM3: input.pricePerM3,
        grossAmount: input.grossAmount,
        deductions: input.deductions || "0",
        netAmount: input.netAmount,
        status: input.status,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
        pixKey: input.pixKey,
        notes: input.notes,
        registeredBy: ctx.user.id,
      });

      return { success: true };
    }),

  // ── LISTAR ACESSOS ATIVOS (admin) ──
  listAccesses: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db
      .select({
        id: clientPortalAccess.id,
        clientId: clientPortalAccess.clientId,
        clientName: clients.name,
        accessCode: clientPortalAccess.accessCode,
        active: clientPortalAccess.active,
        lastAccessAt: clientPortalAccess.lastAccessAt,
        createdAt: clientPortalAccess.createdAt,
      })
      .from(clientPortalAccess)
      .innerJoin(clients, eq(clientPortalAccess.clientId, clients.id))
      .orderBy(desc(clientPortalAccess.createdAt));
  }),
});
