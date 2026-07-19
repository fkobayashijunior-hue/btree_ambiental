// @ts-nocheck
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, cargoLoads, cargoDestinations, replantingRecords, clientPayments, cargoWeeklyClosings, clientDocuments, clientAdvances, clientAdvanceDeductions } from "../../drizzle/schema";
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
            // active pode ser NULL em registros antigos
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
            // active pode ser NULL em registros antigos
          )
        )
        .limit(1);

      if (!client) throw new Error("Acesso não autorizado.");

      // Destinos (sem filtro por clientId pois a tabela não tem esse campo)
      let destIds: number[] = [];

      // Cargas vinculadas ao cliente — buscar DIRETAMENTE por client_id para garantir
      // que todas as cargas do cliente sejam retornadas, independente do volume total.
      // Ordenar por COALESCE(delivery_date, date) para que a data efetiva seja usada.
      let loads: any[] = [];
      try {
        const clientNameLower = client.name.toLowerCase();

        // Busca primária: cargas com client_id exato
        const byClientId = await db
          .select()
          .from(cargoLoads)
          .where(eq(cargoLoads.clientId, input.clientId))
          .orderBy(desc(cargoLoads.date))
          .limit(500);

        // Busca secundária: cargas com clientName contendo o nome do cliente
        // (compatibilidade com registros antigos sem client_id)
        const byClientName = await db
          .select()
          .from(cargoLoads)
          .where(like(cargoLoads.clientName, `%${client.name}%`))
          .orderBy(desc(cargoLoads.date))
          .limit(100);

        // Unir e deduplicar por ID
        const seen = new Set<number>();
        loads = [...byClientId, ...byClientName].filter(l => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });

        console.log(`[Portal] Cargas para cliente ${input.clientId} (${client.name}): ${loads.length} (byId=${byClientId.length}, byName=${byClientName.length})`);
      } catch (e) {
        console.error('[Portal] Erro ao buscar cargas:', e);
        // Fallback: buscar cargas diretamente por client_id via SQL raw
        try {
          const [rawLoads] = await db.execute(`SELECT * FROM cargo_loads WHERE client_id = ${input.clientId} ORDER BY COALESCE(delivery_date, date) DESC LIMIT 500`) as any;
          loads = Array.isArray(rawLoads) ? rawLoads : [];
          console.log(`[Portal] Fallback SQL raw: ${loads.length} cargas encontradas`);
        } catch (e2) {
          console.error('[Portal] Erro no fallback SQL:', e2);
        }
      }

      // Replantios vinculados ao cliente
      let replanting: any[] = [];
      try {
        replanting = await db
          .select()
          .from(replantingRecords)
          .where(eq(replantingRecords.clientId, input.clientId))
          .orderBy(desc(replantingRecords.date))
          .limit(50);
      } catch (e) {
        console.error('[Portal] Erro ao buscar replantios:', e);
      }

      // Pagamentos: fechamentos semanais marcados como pagos
      let payments: any[] = [];
      try {
        const paidClosings = await db
          .select()
          .from(cargoWeeklyClosings)
          .where(
            and(
              eq(cargoWeeklyClosings.clientId, input.clientId),
              eq(cargoWeeklyClosings.status, 'pago')
            )
          )
          .orderBy(desc(cargoWeeklyClosings.paidAt))
          .limit(50);
        // Mapear fechamentos pagos para o formato de pagamento esperado pelo frontend
        payments = paidClosings.map(c => ({
          id: c.id,
          clientId: c.clientId,
          referenceDate: c.weekEnd,
          description: `Semana ${c.weekStart ? new Date(c.weekStart).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''} a ${c.weekEnd ? new Date(c.weekEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}`,
          grossAmount: c.totalAmount,
          netAmount: c.totalAmount,
          status: 'pago',
          paidAt: c.paidAt,
          dueDate: c.dueDate,
          paymentReceiptUrl: c.receiptUrl,
          loadCount: c.totalLoads,
          totalWeightKg: c.totalWeightKg,
          pricePerTon: c.pricePerTon,
          createdAt: c.createdAt,
        }));
      } catch (e) {
        console.error('[Portal] Erro ao buscar pagamentos:', e);
      }

      // Fechamentos semanais do cliente
      let weeklyClosings: any[] = [];
      try {
        weeklyClosings = await db
          .select()
          .from(cargoWeeklyClosings)
          .where(eq(cargoWeeklyClosings.clientId, input.clientId))
          .orderBy(desc(cargoWeeklyClosings.weekEnd))
          .limit(20);
      } catch (e) {
        console.error('[Portal] Erro ao buscar fechamentos:', e);
      }

      // Documentos do cliente
      let documents: any[] = [];
      try {
        documents = await db
          .select()
          .from(clientDocuments)
          .where(eq(clientDocuments.clientId, input.clientId))
          .orderBy(desc(clientDocuments.createdAt))
          .limit(50);
      } catch (e) {
        console.error('[Portal] Erro ao buscar documentos:', e);
      }

      // Adiantamentos do cliente
      let advances: any[] = [];
      let totalAdvanceBalance = 0;
      let advanceDeductions: any[] = [];
      try {
        advances = await db
          .select()
          .from(clientAdvances)
          .where(eq(clientAdvances.clientId, input.clientId))
          .orderBy(desc(clientAdvances.date))
          .limit(50);
        totalAdvanceBalance = advances
          .filter((a: any) => a.status === 'ativo')
          .reduce((sum: number, a: any) => sum + parseFloat(a.balanceRemaining || '0'), 0);
        // Buscar deduções (abatimentos) do cliente
        advanceDeductions = await db
          .select()
          .from(clientAdvanceDeductions)
          .where(eq(clientAdvanceDeductions.clientId, input.clientId))
          .orderBy(desc(clientAdvanceDeductions.date))
          .limit(200);
      } catch (e) {
        console.error('[Portal] Erro ao buscar adiantamentos:', e);
      }

      return { client, loads, replanting, payments, weeklyClosings, documents, advances, totalAdvanceBalance, advanceDeductions };
    }),

  // ── LISTAR TODOS OS REPLANTIOS (admin) ──
  listAllReplantings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db
      .select({
        id: replantingRecords.id,
        clientId: replantingRecords.clientId,
        date: replantingRecords.date,
        area: replantingRecords.area,
        species: replantingRecords.species,
        quantity: replantingRecords.quantity,
        areaHectares: replantingRecords.areaHectares,
        notes: replantingRecords.notes,
        photosJson: replantingRecords.photosJson,
        registeredBy: replantingRecords.registeredBy,
        createdAt: replantingRecords.createdAt,
        clientName: clients.name,
      })
      .from(replantingRecords)
      .leftJoin(clients, eq(replantingRecords.clientId, clients.id))
      .orderBy(desc(replantingRecords.date));
    return records;
  }),

  // ── LISTAR TODOS OS PAGAMENTOS (admin) ──
  listAllPayments: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db
      .select({
        id: clientPayments.id,
        clientId: clientPayments.clientId,
        dueDate: clientPayments.dueDate,
        paidDate: clientPayments.paidDate,
        description: clientPayments.description,
        amount: clientPayments.amount,
        status: clientPayments.status,
        referenceMonth: clientPayments.referenceMonth,
        loadId: clientPayments.loadId,
        notes: clientPayments.notes,
        invoiceNumber: clientPayments.invoiceNumber,
        paymentMethod: clientPayments.paymentMethod,
        createdAt: clientPayments.createdAt,
        clientName: clients.name,
      })
      .from(clientPayments)
      .leftJoin(clients, eq(clientPayments.clientId, clients.id))
      .orderBy(desc(clientPayments.dueDate));
    return records;
  }),

  // ── ATUALIZAR PAGAMENTO (admin) ──
  updatePayment: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      paidAt: z.string().optional(),
      notes: z.string().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      dueDate: z.string().optional(),
      invoiceNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, paidAt, dueDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (paidAt) updateData.paidDate = new Date(paidAt).toISOString().slice(0, 19).replace('T', ' ');
      if (dueDate) updateData.dueDate = new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ');
      await db.update(clientPayments).set(updateData).where(eq(clientPayments.id, id));
      return { success: true };
    }),

  // ── EXCLUIR REPLANTIO (admin) ──
  deleteReplanting: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(replantingRecords).where(eq(replantingRecords.id, input.id));
      return { success: true };
    }),

  // ── EXCLUIR PAGAMENTO (admin) ──
  deletePayment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(clientPayments).where(eq(clientPayments.id, input.id));
      return { success: true };
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
        date: new Date(input.date).toISOString().slice(0, 19).replace('T', ' '),
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
      referenceDate: z.string().optional(),
      description: z.string().optional(),
      grossAmount: z.string().optional(),
      netAmount: z.string().optional(),
      status: z.string().default("pending"),
      dueDate: z.string().optional(),
      paidAt: z.string().optional(),
      notes: z.string().optional(),
      invoiceNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // O banco usa 'amount' (único campo de valor) e 'dueDate'/'paidDate'
      const amount = input.netAmount || input.grossAmount || "0";
      await db.insert(clientPayments).values({
        clientId: input.clientId,
        amount,
        description: input.description,
        status: input.status,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        paidDate: input.paidAt ? new Date(input.paidAt).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        notes: input.notes,
        invoiceNumber: input.invoiceNumber,
        paymentMethod: input.paymentMethod,
        createdBy: ctx.user.id,
      });

      return { success: true };
    }),
});
