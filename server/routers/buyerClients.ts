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

  listActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(buyerClients).where(eq(buyerClients.active, 1)).orderBy(buyerClients.name);
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

  // === DASHBOARD FINANCEIRO ===
  // Returns financial summary per buyer: total receivables (from cargo loads), total paid, balance
  financialDashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get all active buyers
      const buyers = await db.select().from(buyerClients).where(eq(buyerClients.active, 1)).orderBy(buyerClients.name);

      // For each buyer, calculate receivables from cargo loads and payments received
      const results = await Promise.all(buyers.map(async (buyer) => {
        // Build date conditions for cargo loads
        let dateConditions = '';
        const params: any[] = [buyer.id, buyer.name];
        if (input.startDate) {
          dateConditions += ` AND (cl.date >= ? OR cl.delivery_date >= ?)`;
          params.push(input.startDate, input.startDate);
        }
        if (input.endDate) {
          dateConditions += ` AND (cl.date <= ? OR cl.delivery_date <= ?)`;
          params.push(input.endDate + ' 23:59:59', input.endDate + ' 23:59:59');
        }

        // Get cargo loads for this buyer
        const [loadsResult] = await db.execute(sql`
          SELECT 
            COUNT(*) as total_loads,
            SUM(CAST(REPLACE(COALESCE(cl.weight_net_kg, cl.weight_kg, '0'), ',', '.') AS DECIMAL(15,3))) as total_weight_kg,
            SUM(CAST(REPLACE(COALESCE(cl.volume_m3, '0'), ',', '.') AS DECIMAL(15,3))) as total_volume_m3
          FROM cargo_loads cl
          WHERE (cl.destination_id = ${buyer.id + 10000} OR cl.destination = ${buyer.name})
          ${input.startDate ? sql`AND cl.date >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND cl.date <= ${input.endDate + ' 23:59:59'}` : sql``}
        `);

        const loads = Array.isArray(loadsResult) ? loadsResult[0] as any : loadsResult as any;
        const totalWeightKg = parseFloat(String(loads?.total_weight_kg || 0)) || 0;
        const totalVolumeM3 = parseFloat(String(loads?.total_volume_m3 || 0)) || 0;
        const totalLoads = parseInt(String(loads?.total_loads || 0)) || 0;

        // Calculate receivable based on buyer's price and unit
        const pricePerUnit = parseFloat(String(buyer.pricePerUnit || 0).replace(',', '.')) || 0;
        const unit = buyer.unit || 'ton';
        const totalQuantity = unit === 'ton' ? totalWeightKg / 1000 : totalVolumeM3;
        const totalReceivable = pricePerUnit * totalQuantity;

        // Get payments received for this buyer
        const paymentsResult = await db.execute(sql`
          SELECT 
            SUM(CAST(REPLACE(amount, ',', '.') AS DECIMAL(15,2))) as total_paid,
            COUNT(*) as payment_count
          FROM buyer_payments
          WHERE buyer_id = ${buyer.id} AND status = 'pago'
          ${input.startDate ? sql`AND payment_date >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND payment_date <= ${input.endDate}` : sql``}
        `);

        const paymentsData = Array.isArray(paymentsResult) ? paymentsResult[0] as any : paymentsResult as any;
        const totalPaid = parseFloat(String(paymentsData?.total_paid || 0)) || 0;
        const paymentCount = parseInt(String(paymentsData?.payment_count || 0)) || 0;

        return {
          id: buyer.id,
          name: buyer.name,
          city: buyer.city,
          state: buyer.state,
          phone: buyer.phone,
          email: buyer.email,
          pricePerUnit: buyer.pricePerUnit,
          unit: buyer.unit || 'ton',
          totalLoads,
          totalWeightKg,
          totalVolumeM3,
          totalQuantity,
          totalReceivable,
          totalPaid,
          balance: totalReceivable - totalPaid,
          paymentCount,
        };
      }));

      // Calculate totals
      const grandTotalReceivable = results.reduce((s, r) => s + r.totalReceivable, 0);
      const grandTotalPaid = results.reduce((s, r) => s + r.totalPaid, 0);
      const grandBalance = grandTotalReceivable - grandTotalPaid;

      return {
        buyers: results,
        totals: { grandTotalReceivable, grandTotalPaid, grandBalance },
      };
    }),

  // Get payment history for a specific buyer
  getPayments: protectedProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const payments = await db.select().from(buyerPayments)
        .where(eq(buyerPayments.buyerId, input.buyerId))
        .orderBy(desc(buyerPayments.id));
      return payments;
    }),
});
