import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, cargoLoads, cargoDestinations, replantingRecords, clientPayments } from "../../drizzle/schema";
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

      // Cargas vinculadas ao cliente - buscar com SQL direto para evitar problemas de schema
      let loads: any[] = [];
      try {
        const allLoads = await db
          .select()
          .from(cargoLoads)
          .orderBy(desc(cargoLoads.date))
          .limit(200);

        console.log(`[Portal] Total cargas no banco: ${allLoads.length}, clientId buscado: ${input.clientId}, clientName: ${client.name}`);
        
        const clientNameLower = client.name.toLowerCase();
        loads = allLoads.filter(l => {
          const matchClientId = l.clientId === input.clientId;
          const matchClientName = l.clientName && l.clientName.toLowerCase().includes(clientNameLower);
          const matchDestination = l.destination && l.destination.toLowerCase().includes(clientNameLower);
          const matchDestId = l.destinationId && destIds.includes(l.destinationId);
          return matchClientId || matchClientName || matchDestination || matchDestId;
        }).slice(0, 50);
        
        console.log(`[Portal] Cargas filtradas para cliente: ${loads.length}`);
        if (allLoads.length > 0) {
          console.log(`[Portal] Amostra carga[0]: clientId=${allLoads[0].clientId} (tipo: ${typeof allLoads[0].clientId}), clientName=${allLoads[0].clientName}, destination=${allLoads[0].destination}`);
        }
      } catch (e) {
        console.error('[Portal] Erro ao buscar cargas:', e);
        // Fallback: buscar cargas diretamente por client_id via SQL raw
        try {
          const [rawLoads] = await db.execute(`SELECT * FROM cargo_loads WHERE client_id = ${input.clientId} OR client_name LIKE '%${client.name}%' ORDER BY date DESC LIMIT 50`) as any;
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

      // Pagamentos vinculados ao cliente
      let payments: any[] = [];
      try {
        payments = await db
          .select()
          .from(clientPayments)
          .where(eq(clientPayments.clientId, input.clientId))
          .orderBy(desc(clientPayments.referenceDate))
          .limit(50);
      } catch (e) {
        console.error('[Portal] Erro ao buscar pagamentos:', e);
      }

      return { client, loads, replanting, payments };
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
        referenceDate: clientPayments.referenceDate,
        description: clientPayments.description,
        volumeM3: clientPayments.volumeM3,
        pricePerM3: clientPayments.pricePerM3,
        grossAmount: clientPayments.grossAmount,
        deductions: clientPayments.deductions,
        netAmount: clientPayments.netAmount,
        status: clientPayments.status,
        dueDate: clientPayments.dueDate,
        paidAt: clientPayments.paidAt,
        pixKey: clientPayments.pixKey,
        notes: clientPayments.notes,
        registeredBy: clientPayments.registeredBy,
        createdAt: clientPayments.createdAt,
        clientName: clients.name,
      })
      .from(clientPayments)
      .leftJoin(clients, eq(clientPayments.clientId, clients.id))
      .orderBy(desc(clientPayments.referenceDate));
    return records;
  }),

  // ── ATUALIZAR PAGAMENTO (admin) ──
  updatePayment: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
      paidAt: z.string().optional(),
      notes: z.string().optional(),
      description: z.string().optional(),
      grossAmount: z.string().optional(),
      netAmount: z.string().optional(),
      deductions: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, paidAt, dueDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (paidAt) updateData.paidAt = new Date(paidAt).toISOString().slice(0, 19).replace('T', ' ');
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
        referenceDate: new Date(input.referenceDate).toISOString().slice(0, 19).replace('T', ' '),
        description: input.description,
        volumeM3: input.volumeM3,
        pricePerM3: input.pricePerM3,
        grossAmount: input.grossAmount,
        deductions: input.deductions || "0",
        netAmount: input.netAmount,
        status: input.status,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        paidAt: input.paidAt ? new Date(input.paidAt).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        pixKey: input.pixKey,
        notes: input.notes,
        registeredBy: ctx.user.id,
      });

      return { success: true };
    }),
});
