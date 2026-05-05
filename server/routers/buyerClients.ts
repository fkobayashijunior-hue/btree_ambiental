import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { buyerClients, buyerPriceHistory, buyerPayments } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const buyerClientsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(buyerClients).orderBy(desc(buyerClients.id));
    return rows;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [buyer] = await db.select().from(buyerClients).where(eq(buyerClients.id, input.id));
      if (!buyer) throw new TRPCError({ code: "NOT_FOUND" });
      const prices = await db.select().from(buyerPriceHistory).where(eq(buyerPriceHistory.buyerId, input.id)).orderBy(desc(buyerPriceHistory.id));
      const payments = await db.select().from(buyerPayments).where(eq(buyerPayments.buyerId, input.id)).orderBy(desc(buyerPayments.id));
      return { ...buyer, prices, payments };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      cnpjCpf: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      cep: z.string().optional(),
      contactPerson: z.string().optional(),
      product: z.string().optional(),
      paymentMethod: z.string().optional(),
      pricePerUnit: z.string().optional(),
      unit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(sql`
        INSERT INTO buyer_clients (name, cnpj_cpf, inscricao_estadual, phone, email, address, city, state, cep, contact_person, product, payment_method, price_per_unit, unit, notes, created_at)
        VALUES (${input.name}, ${input.cnpjCpf || null}, ${input.inscricaoEstadual || null}, ${input.phone || null}, ${input.email || null}, ${input.address || null}, ${input.city || null}, ${input.state || null}, ${input.cep || null}, ${input.contactPerson || null}, ${input.product || null}, ${input.paymentMethod || null}, ${input.pricePerUnit || null}, ${input.unit || 'ton'}, ${input.notes || null}, ${now})
      `);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      cnpjCpf: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      cep: z.string().optional(),
      contactPerson: z.string().optional(),
      product: z.string().optional(),
      paymentMethod: z.string().optional(),
      pricePerUnit: z.string().optional(),
      unit: z.string().optional(),
      notes: z.string().optional(),
      active: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(buyerClients).set({
        name: data.name,
        cnpjCpf: data.cnpjCpf || null,
        inscricaoEstadual: data.inscricaoEstadual || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        cep: data.cep || null,
        contactPerson: data.contactPerson || null,
        product: data.product || null,
        paymentMethod: data.paymentMethod || null,
        pricePerUnit: data.pricePerUnit || null,
        unit: data.unit || 'ton',
        notes: data.notes || null,
        active: data.active ?? 1,
      }).where(eq(buyerClients.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(buyerClients).where(eq(buyerClients.id, input.id));
      return { success: true };
    }),

  // === PREÇOS ===
  addPrice: protectedProcedure
    .input(z.object({
      buyerId: z.number(),
      product: z.string().min(1),
      pricePerUnit: z.string().min(1),
      unit: z.string().optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(sql`
        INSERT INTO buyer_price_history (buyer_id, product, price_per_unit, unit, valid_from, valid_until, notes, created_at)
        VALUES (${input.buyerId}, ${input.product}, ${input.pricePerUnit}, ${input.unit || 'ton'}, ${input.validFrom || null}, ${input.validUntil || null}, ${input.notes || null}, ${now})
      `);
      return { success: true };
    }),

  deletePrice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(buyerPriceHistory).where(eq(buyerPriceHistory.id, input.id));
      return { success: true };
    }),

  // === PAGAMENTOS ===
  addPayment: protectedProcedure
    .input(z.object({
      buyerId: z.number(),
      amount: z.string().min(1),
      paymentDate: z.string().min(1),
      paymentMethod: z.string().optional(),
      invoiceNumber: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(['pendente', 'pago', 'atrasado']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(sql`
        INSERT INTO buyer_payments (buyer_id, amount, payment_date, payment_method, invoice_number, notes, status, created_at)
        VALUES (${input.buyerId}, ${input.amount}, ${input.paymentDate}, ${input.paymentMethod || null}, ${input.invoiceNumber || null}, ${input.notes || null}, ${input.status || 'pendente'}, ${now})
      `);
      return { success: true };
    }),

  updatePaymentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pendente', 'pago', 'atrasado']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(buyerPayments).set({ status: input.status }).where(eq(buyerPayments.id, input.id));
      return { success: true };
    }),

  deletePayment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(buyerPayments).where(eq(buyerPayments.id, input.id));
      return { success: true };
    }),
});
