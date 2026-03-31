import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, cargoLoads, replantingRecords, clientPayments } from "../../drizzle/schema";
import { eq, and, or, isNull, like, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Portal do Cliente — acesso via e-mail + senha
 * Público: login com e-mail + senha
 * Protegido (admin): registrar replantio e pagamentos
 */
export const clientPortalRouter = router({

  // ── LOGIN DO CLIENTE (público) ──
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.email, input.email.trim().toLowerCase()),
            eq(clients.active, 1)
          )
        )
        .limit(1);

      if (!client) throw new Error("E-mail ou senha incorretos.");
      if (!client.password) throw new Error("Acesso não configurado. Entre em contato com a BTREE Ambiental.");

      const valid = await bcrypt.compare(input.password, client.password);
      if (!valid) throw new Error("E-mail ou senha incorretos.");

      return {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientCity: client.city,
      };
    }),

  // ── DADOS DO PORTAL (público — requer clientId validado no frontend) ──
  getPortalData: publicProcedure
    .input(z.object({ clientId: z.number(), email: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar que o cliente existe e o e-mail bate
      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.email, input.email.trim().toLowerCase()),
            eq(clients.active, 1)
          )
        )
        .limit(1);

      if (!client) throw new Error("Acesso não autorizado.");

      // Cargas vinculadas ao cliente (por clientId OU por clientName como fallback para cargas antigas)
      const loads = await db
        .select()
        .from(cargoLoads)
        .where(
          or(
            eq(cargoLoads.clientId, input.clientId),
            and(
              isNull(cargoLoads.clientId),
              like(cargoLoads.clientName, `%${client.name}%`)
            )
          )
        )
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

  // ── DEFINIR/ALTERAR SENHA DO CLIENTE (admin) ──
  setClientPassword: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      password: z.string().min(4),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const hash = await bcrypt.hash(input.password, 10);
      await db.update(clients).set({ password: hash }).where(eq(clients.id, input.clientId));

      return { success: true };
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
});
