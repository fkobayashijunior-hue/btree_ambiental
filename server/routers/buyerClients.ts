import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cargoDestinations, buyerPriceHistory, buyerPayments, financialEntries, buyerProductPrices } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// ─── Helper: map cargo_destinations row to buyer-like shape ──────────────────
function destToBuyer(d: typeof cargoDestinations.$inferSelect) {
  return {
    id: d.id,
    name: d.name, // Nome/Razão Social
    nickname: d.nickname ?? null, // Apelido (nome curto)
    cnpjCpf: d.cnpjCpf,
    inscricaoEstadual: d.inscricaoEstadual,
    phone: d.phone,
    email: d.email,
    address: d.address,
    city: d.city,
    state: d.state,
    cep: d.cep,
    contactPerson: d.contactPerson,
    product: d.product,
    paymentMethod: d.paymentMethod,
    // pricePerUnit: use price_per_unit if set, otherwise derive from price_per_ton/m3
    pricePerUnit: d.pricePerUnit ?? (d.priceType === 'm3' ? d.pricePerM3 : d.pricePerTon),
    unit: d.unit ?? (d.priceType === 'm3' ? 'm3' : 'ton'),
    notes: d.notes,
    active: d.active,
    isBuyer: d.isBuyer, // 0 = destino normal, 1 = comprador
    // Extra destination fields
    pricePerTon: d.pricePerTon,
    pricePerM3: d.pricePerM3,
    priceType: d.priceType,
  };
}

export const buyerClientsRouter = router({
  // list: retorna TODOS os destinos (is_buyer ou não) — tela unificada
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(cargoDestinations)
      .orderBy(desc(cargoDestinations.id));
    return rows.map(destToBuyer);
  }),

  // listActive: retorna todos os destinos ativos (para seleção em cargas, relatórios, etc.)
  listActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(cargoDestinations)
      .where(eq(cargoDestinations.active, 1))
      .orderBy(cargoDestinations.name);
    return rows.map(destToBuyer);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [dest] = await db.select().from(cargoDestinations)
        .where(eq(cargoDestinations.id, input.id));
      if (!dest) throw new TRPCError({ code: "NOT_FOUND" });
      const prices = await db.select().from(buyerPriceHistory)
        .where(eq(buyerPriceHistory.buyerId, input.id))
        .orderBy(desc(buyerPriceHistory.id));
      const payments = await db.select().from(buyerPayments)
        .where(eq(buyerPayments.buyerId, input.id))
        .orderBy(desc(buyerPayments.id));
      return { ...destToBuyer(dest), prices, payments };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      nickname: z.string().optional(), // Apelido
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
      isBuyer: z.number().optional(), // 0 = destino normal, 1 = comprador
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      // Determine price fields from unit
      const unit = input.unit || 'ton';
      const pricePerTon = unit === 'ton' ? (input.pricePerUnit || null) : null;
      const pricePerM3 = unit === 'm3' ? (input.pricePerUnit || null) : null;
      const priceType = unit === 'm3' ? 'm3' : 'ton';
      const isBuyer = input.isBuyer ?? 0; // default: destino normal
      await db.execute(sql`
        INSERT INTO cargo_destinations 
          (name, nickname, address, city, state, notes, is_buyer, cnpj_cpf, inscricao_estadual, phone, email, cep, contact_person, product, payment_method, price_per_unit, unit, price_per_ton, price_per_m3, price_type, created_by, created_at)
        VALUES 
          (${input.name}, ${input.nickname || null}, ${input.address || null}, ${input.city || null}, ${input.state || null}, ${input.notes || null},
           ${isBuyer}, ${input.cnpjCpf || null}, ${input.inscricaoEstadual || null}, ${input.phone || null}, ${input.email || null},
           ${input.cep || null}, ${input.contactPerson || null}, ${input.product || null}, ${input.paymentMethod || null},
           ${input.pricePerUnit || null}, ${unit}, ${pricePerTon}, ${pricePerM3}, ${priceType}, ${ctx.user.id}, ${now})
      `);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      nickname: z.string().optional(), // Apelido
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
      isBuyer: z.number().optional(), // 0 = destino normal, 1 = comprador
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const unit = input.unit || 'ton';
      const pricePerTon = unit === 'ton' ? (input.pricePerUnit || null) : null;
      const pricePerM3 = unit === 'm3' ? (input.pricePerUnit || null) : null;
      const priceType = unit === 'm3' ? 'm3' : 'ton';
      await db.update(cargoDestinations).set({
        name: input.name,
        nickname: input.nickname || null,
        cnpjCpf: input.cnpjCpf || null,
        inscricaoEstadual: input.inscricaoEstadual || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        cep: input.cep || null,
        contactPerson: input.contactPerson || null,
        product: input.product || null,
        paymentMethod: input.paymentMethod || null,
        pricePerUnit: input.pricePerUnit || null,
        unit,
        pricePerTon,
        pricePerM3,
        priceType,
        notes: input.notes || null,
        active: input.active ?? 1,
        ...(input.isBuyer !== undefined ? { isBuyer: input.isBuyer } : {}),
      }).where(eq(cargoDestinations.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if there are cargo loads linked to this destination
      const loads = await db.execute(sql`SELECT COUNT(*) as cnt FROM cargo_loads WHERE destination_id = ${input.id}`);
      const loadCount = ((loads as any)[0]?.[0] as any)?.cnt ?? 0;
      if (loadCount > 0 && !input.force) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Este destino possui ${loadCount} carga(s) vinculada(s). Use force=true para excluir mesmo assim (as cargas n\u00e3o ser\u00e3o apagadas).`,
        });
      }
      // Check payments
      const payments = await db.execute(sql`SELECT COUNT(*) as cnt FROM buyer_payments WHERE buyer_id = ${input.id}`);
      const payCount = ((payments as any)[0]?.[0] as any)?.cnt ?? 0;
      if (payCount > 0 && !input.force) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Este comprador possui ${payCount} pagamento(s) vinculado(s). Use force=true para excluir mesmo assim.`,
        });
      }
      // Hard delete the destination record
      await db.execute(sql`DELETE FROM cargo_destinations WHERE id = ${input.id}`);
      return { success: true, loadCount, payCount };
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
      // Campos extras para integração com financeiro
      destinationName: z.string().optional(),
      createFinancialEntry: z.boolean().optional(), // se true, cria receita no financeiro
      periodDescription: z.string().optional(), // ex: "Mai/2026"
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 1. Inserir em buyer_payments
      await db.execute(sql`
        INSERT INTO buyer_payments (buyer_id, amount, payment_date, payment_method, invoice_number, notes, status, created_at)
        VALUES (${input.buyerId}, ${input.amount}, ${input.paymentDate}, ${input.paymentMethod || null}, ${input.invoiceNumber || null}, ${input.notes || null}, ${input.status || 'pendente'}, ${now})
      `);

      // 2. Se for recebimento confirmado, criar receita no módulo financeiro automaticamente
      if (input.createFinancialEntry && input.status === 'pago') {
        const dateObj = new Date(input.paymentDate);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const destName = input.destinationName || 'Destino';
        const period = input.periodDescription || '';
        const description = `Recebimento — ${destName}${period ? ` (${period})` : ''}`;
        const pmMap: Record<string, string> = {
          pix: 'pix', transferencia: 'transferencia', boleto: 'boleto',
          dinheiro: 'dinheiro', cartao: 'cartao', cheque: 'cheque',
        };
        const pm = pmMap[input.paymentMethod || ''] || 'pix';
        await db.insert(financialEntries).values({
          type: 'receita',
          category: 'venda_madeira',
          description,
          amount: input.amount,
          date: dateObj.toISOString().slice(0, 10).replace('T', ' '),
          referenceMonth: refMonth,
          paymentMethod: pm as any,
          status: 'confirmado',
          clientName: destName,
          notes: input.notes || null,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name,
          autoGenerated: 1,
        });
      }

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
  financialDashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get all active buyers (destinations with is_buyer=1)
      const buyers = await db.select().from(cargoDestinations)
        .where(and(eq(cargoDestinations.isBuyer, 1), eq(cargoDestinations.active, 1)))
        .orderBy(cargoDestinations.name);

      const results = await Promise.all(buyers.map(async (buyer) => {
        const buyerMapped = destToBuyer(buyer);

        // Get cargo loads for this buyer (match by destination_id OR by name)
        const [loadsResult] = await db.execute(sql`
          SELECT 
            COUNT(*) as total_loads,
            SUM(CAST(REPLACE(COALESCE(cl.weight_net_kg, cl.weight_kg, '0'), ',', '.') AS DECIMAL(15,3))) as total_weight_kg,
            SUM(CAST(REPLACE(COALESCE(cl.volume_m3, '0'), ',', '.') AS DECIMAL(15,3))) as total_volume_m3
          FROM cargo_loads cl
          WHERE (cl.destination_id = ${buyer.id} OR cl.destination = ${buyer.name})
          ${input.startDate ? sql`AND cl.date >= ${input.startDate}` : sql``}
          ${input.endDate ? sql`AND cl.date <= ${input.endDate + ' 23:59:59'}` : sql``}
        `);

        const loads = Array.isArray(loadsResult) ? loadsResult[0] as any : loadsResult as any;
        const totalWeightKg = parseFloat(String(loads?.total_weight_kg || 0)) || 0;
        const totalVolumeM3 = parseFloat(String(loads?.total_volume_m3 || 0)) || 0;
        const totalLoads = parseInt(String(loads?.total_loads || 0)) || 0;

        const pricePerUnit = parseFloat(String(buyerMapped.pricePerUnit || 0).replace(',', '.')) || 0;
        const unit = buyerMapped.unit || 'ton';
        const totalQuantity = unit === 'ton' ? totalWeightKg / 1000 : totalVolumeM3;
        const totalReceivable = pricePerUnit * totalQuantity;

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
          phone: buyerMapped.phone,
          email: buyerMapped.email,
          pricePerUnit: buyerMapped.pricePerUnit,
          unit,
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

      const grandTotalReceivable = results.reduce((s, r) => s + r.totalReceivable, 0);
      const grandTotalPaid = results.reduce((s, r) => s + r.totalPaid, 0);
      const grandBalance = grandTotalReceivable - grandTotalPaid;

      return {
        buyers: results,
        totals: { grandTotalReceivable, grandTotalPaid, grandBalance },
      };
    }),

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

  // ─── Produtos/Preços por Comprador ──────────────────────────────────────────
  listProductPrices: protectedProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(buyerProductPrices)
        .where(and(eq(buyerProductPrices.buyerId, input.buyerId), eq(buyerProductPrices.isActive, 1)))
        .orderBy(buyerProductPrices.productName);
    }),

  listActiveProductPricesByBuyer: protectedProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(buyerProductPrices)
        .where(and(eq(buyerProductPrices.buyerId, input.buyerId), eq(buyerProductPrices.isActive, 1)))
        .orderBy(buyerProductPrices.productName);
    }),

  addProductPrice: protectedProcedure
    .input(z.object({
      buyerId: z.number(),
      productName: z.string().min(1),
      unit: z.enum(['ton', 'm3', 'unidade']),
      pricePerUnit: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(buyerProductPrices).values({
        buyerId: input.buyerId,
        productName: input.productName,
        unit: input.unit,
        pricePerUnit: input.pricePerUnit,
        isActive: 1,
      });
      return { success: true };
    }),

  updateProductPrice: protectedProcedure
    .input(z.object({
      id: z.number(),
      productName: z.string().min(1),
      unit: z.enum(['ton', 'm3', 'unidade']),
      pricePerUnit: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(buyerProductPrices)
        .set({ productName: input.productName, unit: input.unit, pricePerUnit: input.pricePerUnit })
        .where(eq(buyerProductPrices.id, input.id));
      return { success: true };
    }),

  deleteProductPrice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(buyerProductPrices)
        .set({ isActive: 0 })
        .where(eq(buyerProductPrices.id, input.id));
      return { success: true };
    }),
});
