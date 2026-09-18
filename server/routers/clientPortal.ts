// @ts-nocheck
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  clients,
  cargoLoads,
  replantingRecords,
  clientPayments,
  cargoWeeklyClosings,
  clientDocuments,
  clientAdvances,
  clientAdvanceDeductions,
  clientAreas,
} from "../../drizzle/schema";
import { eq, and, isNull, like, desc, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  normalizeAreaId as normalizeParentAreaId,
  areaScopeCondition as parentAreaScopeCondition,
  getClientArea as parentGetClientArea,
  getAreaPriceTerms as parentGetAreaPriceTerms,
  getCargoFinancialValue as parentGetCargoFinancialValue,
} from "../lib/clientAreaScope";

/**
 * Portal público/admin. A regra essencial desta camada é que o escopo da área
 * seja aplicado na consulta, antes de qualquer soma, abatimento ou documento.
 */

export function normalizePortalAreaId(value: unknown): number | null {
  return normalizeParentAreaId(value);
}

export function filterPortalRowsByArea<T extends { areaId?: number | null }>(rows: T[], areaId: number | null): T[] {
  const normalized = normalizePortalAreaId(areaId);
  return rows.filter(row => normalized === null
    ? row.areaId === null || row.areaId === undefined
    : Number(row.areaId) === normalized);
}

export function calculatePortalTotals({
  loads,
  advances,
  deductions,
  weeklyClosings,
  areaPending = false,
  areaId = null,
  manualPayments = [],
}: {
  loads: any[];
  advances: any[];
  deductions: any[];
  weeklyClosings: any[];
  areaPending?: boolean;
  areaId?: number | null;
  manualPayments?: any[];
}) {
  const totalAdvanceBalance = advances
    .filter(a => a.status === "ativo")
    .reduce((sum, a) => sum + parseFloat(String(a.balanceRemaining || "0")), 0);
  const valorAbatidoAdiantamento = deductions.reduce(
    (sum, d) => sum + parseFloat(String(d.amount || "0")), 0,
  );

  // Pending agreements do not expose a fake zero or inherit legacy pricing.
  if (areaPending) {
    return {
      totalAdvanceBalance: null,
      valorTotal: null,
      valorPago: null,
      valorAReceber: null,
      valorAbatidoAdiantamento: null,
    };
  }

  const entregues = loads.filter(l => l.status === "entregue");
  const valorTotal = entregues.reduce((sum, load) => {
    const value = Number(load.portalValue);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const valorFechamentosPagos = weeklyClosings
    .filter(c => c.status === "pago")
    .reduce((sum, c) => {
      const amount = normalizePortalAreaId(c.areaId) === null
        ? c.totalAmount
        : c.portalAmount;
      return sum + parseFloat(String(amount || "0"));
    }, 0);
  let valorPago = advances.length > 0 ? valorAbatidoAdiantamento : valorFechamentosPagos;
  if (normalizePortalAreaId(areaId) !== null) {
    // Fechamentos novos guardam o saldo líquido após os abatimentos por carga.
    // Deduções vinculadas ao próprio fechamento pago já estão incluídas nele.
    const paidClosingIds = new Set(weeklyClosings.filter(c => c.status === 'pago').map(c => c.id));
    const independentDeductions = deductions.filter(d => !paidClosingIds.has(d.weeklyClosingId))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const standalonePayments = manualPayments.filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + Number(p.netAmount ?? p.amount ?? p.grossAmount ?? 0), 0);
    valorPago = Math.round((valorFechamentosPagos + independentDeductions + standalonePayments) * 100) / 100;
  }

  return {
    totalAdvanceBalance,
    valorTotal,
    valorPago,
    valorAReceber: Math.max(0, valorTotal - valorPago),
    valorAbatidoAdiantamento,
  };
}

export function filterPortalLoadsForClosing(loads: any[], closing: any): any[] {
  const start = new Date(String(closing.weekStart));
  const end = new Date(String(closing.weekEnd));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  end.setHours(23, 59, 59, 999);
  return loads.filter(load => {
    const date = new Date(String(load.deliveryDate || load.date));
    return !Number.isNaN(date.getTime()) && date >= start && date <= end;
  });
}

function areaColumn(table: any) {
  return table?.areaId ?? table?.area_id;
}

function combineConditions(...conditions: any[]) {
  const present = conditions.filter(Boolean);
  return present.length ? and(...present) : undefined;
}

function areaCondition(table: any, areaId: number | null) {
  return parentAreaScopeCondition(areaColumn(table), normalizePortalAreaId(areaId));
}

async function findArea(db: any, clientId: number, areaId: number | null) {
  const normalized = normalizePortalAreaId(areaId);
  if (normalized === null) return null;
  return parentGetClientArea(db, clientId, normalized);
}

async function validateArea(db: any, clientId: number, areaId: unknown) {
  const normalized = normalizePortalAreaId(areaId);
  return { areaId: normalized, area: await findArea(db, clientId, normalized) };
}

function publicArea(area: any) {
  if (!area) return null;
  return {
    id: area.id,
    clientId: area.clientId,
    name: area.name,
    fieldName: area.fieldName ?? null,
    agreementStatus: area.agreementStatus ?? "pending",
    unit: area.unit ?? null,
    unitPrice: area.unitPrice ?? null,
    paymentMethod: area.paymentMethod ?? null,
    paymentTermDays: area.paymentTermDays ?? null,
    billingCycle: area.billingCycle ?? null,
    isActive: area.isActive ?? 1,
  };
}

async function listAreas(db: any, clientId?: number) {
  const condition = clientId === undefined ? undefined : eq(clientAreas.clientId, clientId);
  const rows = await db.select().from(clientAreas).where(condition).orderBy(clientAreas.name);
  return rows.map(publicArea);
}

async function getAreaTerms(client: any, area: any) {
  return parentGetAreaPriceTerms(client, area);
}

async function cargoValue(cargo: any, client: any, area: any, terms: any) {
  const result = parentGetCargoFinancialValue(cargo, client, area);
  return result === null || result === undefined ? null : Number(result);
}

async function decorateLoads(loads: any[], client: any, area: any, terms: any) {
  return Promise.all(loads.map(async load => {
    const {
      agreedUnit, agreedUnitPrice, agreedPaymentMethod, agreedPaymentTermDays,
      clientId, clientName, registeredBy, workLocationId,
      thirdPartyCost, thirdPartyPaid, thirdPartyPaidAt, thirdPartyPaymentNotes,
      invoiceChecked, invoiceCheckedAt, invoiceCheckedBy, invoiceCheckedByName,
      fiscalNoteId, buyerPaidAt, nfUploadToken, responsavelCargaId,
      ...publicLoad
    } = load;
    return {
      ...publicLoad,
      portalValue: await cargoValue(load, client, area, terms),
      areaId: normalizePortalAreaId(load.areaId),
    };
  }));
}

export async function decorateClosings(closings: any[], loads: any[], areaPending: boolean) {
  return closings.map(closing => {
    const closingLoads = filterPortalLoadsForClosing(loads, closing);
    const {
      closedBy, areaScopeKey, updatedAt, clientId, ...publicClosing
    } = closing;
    const amount = closingLoads.reduce((sum, load) => {
      const value = Number(load.portalValue);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    return {
      ...publicClosing,
      areaId: normalizePortalAreaId(closing.areaId),
      // O fechamento é um registro financeiro: alterações posteriores nas cargas
      // ou no acordo não podem reescrever seu valor na visualização.
      portalAmount: areaPending ? null : (closing.totalAmount != null ? Number(closing.totalAmount) : amount),
      portalLoadCount: closing.totalLoads ?? closingLoads.length,
      portalWeightKg: closing.totalWeightKg != null ? Number(closing.totalWeightKg) : closingLoads.reduce((sum, load) => sum + parseFloat(String(load.weightNetKg || load.weightOutKg || "0")), 0),
    };
  });
}

function toDateValue(value: string | undefined) {
  return value ? new Date(value).toISOString().slice(0, 19).replace("T", " ") : undefined;
}

async function areaLabelMap(db: any) {
  const areas = await listAreas(db);
  return new Map(areas.map(area => [area.id, area.name]));
}

async function assertExistingAreaScope(db: any, table: any, id: number, requestedArea: unknown, clientId?: number) {
  if (requestedArea === undefined) return null;
  const normalized = normalizePortalAreaId(requestedArea);
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado." });
  const stored = normalizePortalAreaId(row.areaId);
  if (stored !== normalized) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O registro pertence a outra área." });
  }
  if (clientId !== undefined && normalized !== null) await findArea(db, clientId, normalized);
  return row;
}

export const clientPortalRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [client] = await db.select().from(clients).where(
        and(eq(clients.email, input.email.trim().toLowerCase())),
      ).limit(1);
      if (!client) throw new Error("E-mail ou senha incorretos.");
      if (!client.password) throw new Error("Acesso não configurado. Entre em contato com a BTREE Ambiental.");
      if (!await bcrypt.compare(input.password, client.password)) throw new Error("E-mail ou senha incorretos.");
      return {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientCity: client.city,
      };
    }),

  getPortalData: publicProcedure
    .input(z.object({ clientId: z.number(), email: z.string(), areaId: z.number().nullable().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [client] = await db.select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        city: clients.city,
        pricePerTon: clients.pricePerTon,
        paymentTermDays: clients.paymentTermDays,
        billingCycle: clients.billingCycle,
      }).from(clients).where(
        and(eq(clients.id, input.clientId), eq(clients.email, input.email.trim().toLowerCase())),
      ).limit(1);
      if (!client) throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso não autorizado." });

      const areaId = normalizePortalAreaId(input.areaId);
      const selectedAreaRow = await findArea(db, input.clientId, areaId);
      const selectedArea = publicArea(selectedAreaRow);
      const areas = await listAreas(db, input.clientId);
      const terms = await getAreaTerms(client, selectedAreaRow);
      const areaPending = Boolean(areaId !== null && (!terms || selectedArea?.agreementStatus !== "confirmed"));
      const loadScope = await areaCondition(cargoLoads, areaId);
      const loadById = await db.select().from(cargoLoads).where(
        combineConditions(eq(cargoLoads.clientId, input.clientId), loadScope),
      ).orderBy(desc(cargoLoads.date)).limit(500);
      const loadByName = areaId === null
        ? await db.select().from(cargoLoads).where(combineConditions(
          isNull(cargoLoads.clientId),
          like(cargoLoads.clientName, `%${client.name}%`),
          loadScope,
        )).orderBy(desc(cargoLoads.date)).limit(100)
        : [];
      const seen = new Set<number>();
      const rawLoads = [...loadById, ...loadByName].filter(load => {
        if (seen.has(load.id)) return false;
        seen.add(load.id);
        return true;
      });
      const loads = await decorateLoads(rawLoads, client, selectedAreaRow, terms);

      const rawReplanting = await db.select().from(replantingRecords).where(
        combineConditions(eq(replantingRecords.clientId, input.clientId), await areaCondition(replantingRecords, areaId)),
      ).orderBy(desc(replantingRecords.date)).limit(50).catch(() => []);
      const replanting = rawReplanting.map(({ registeredBy, updatedAt, ...record }: any) => record);
      const rawDocuments = await db.select().from(clientDocuments).where(
        combineConditions(eq(clientDocuments.clientId, input.clientId), await areaCondition(clientDocuments, areaId)),
      ).orderBy(desc(clientDocuments.createdAt)).limit(50).catch(() => []);
      const documents = rawDocuments.map(({ uploadedBy, ...document }: any) => document);
      const advances = await db.select().from(clientAdvances).where(
        combineConditions(eq(clientAdvances.clientId, input.clientId), await areaCondition(clientAdvances, areaId)),
      ).orderBy(desc(clientAdvances.date)).limit(50).catch(() => []);

      let advanceDeductions: any[] = [];
      if (advances.length) {
        const advanceIds = advances.map(advance => advance.id);
        advanceDeductions = await db.select({
          id: clientAdvanceDeductions.id,
          advanceId: clientAdvanceDeductions.advanceId,
          clientId: clientAdvanceDeductions.clientId,
          cargoLoadId: clientAdvanceDeductions.cargoLoadId,
          weeklyClosingId: clientAdvanceDeductions.weeklyClosingId,
          amount: clientAdvanceDeductions.amount,
          balanceBefore: clientAdvanceDeductions.balanceBefore,
          balanceAfter: clientAdvanceDeductions.balanceAfter,
          description: clientAdvanceDeductions.description,
          date: clientAdvanceDeductions.date,
          createdAt: clientAdvanceDeductions.createdAt,
          cargoVehiclePlate: cargoLoads.vehiclePlate,
          cargoDestination: cargoLoads.destination,
          cargoWeightNetKg: cargoLoads.weightNetKg,
          cargoDate: cargoLoads.date,
        }).from(clientAdvanceDeductions)
          .leftJoin(cargoLoads, eq(clientAdvanceDeductions.cargoLoadId, cargoLoads.id))
          .where(and(
            eq(clientAdvanceDeductions.clientId, input.clientId),
            inArray(clientAdvanceDeductions.advanceId, advanceIds),
          ))
          .orderBy(desc(clientAdvanceDeductions.date)).limit(200);
        const scopedLoadIds = new Set(loads.map(load => load.id));
        advanceDeductions = advanceDeductions.filter(d =>
          advanceIds.includes(d.advanceId) &&
          (d.cargoLoadId == null || scopedLoadIds.has(d.cargoLoadId))
        );
      }

      const closingScope = await areaCondition(cargoWeeklyClosings, areaId);
      const rawClosings = await db.select().from(cargoWeeklyClosings).where(
        combineConditions(eq(cargoWeeklyClosings.clientId, input.clientId), closingScope),
      ).orderBy(desc(cargoWeeklyClosings.weekEnd)).limit(50).catch(() => []);
      const decoratedClosings = await decorateClosings(rawClosings, loads, areaPending);
      const weeklyClosings = decoratedClosings.map((closing: any) => areaId === null
        ? closing
        : { ...closing, totalAmount: closing.portalAmount, pricePerTon: null });
      const payments = weeklyClosings.filter(c => c.status === "pago").map(c => ({
        id: c.id,
        clientId: c.clientId,
        areaId: normalizePortalAreaId(c.areaId),
        referenceDate: c.weekEnd,
        description: `Semana ${c.weekStart ? new Date(c.weekStart).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""} a ${c.weekEnd ? new Date(c.weekEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}`,
        grossAmount: areaPending ? null : (c.portalAmount ?? c.totalAmount),
        netAmount: areaPending ? null : (c.portalAmount ?? c.totalAmount),
        status: "pago",
        paidAt: c.paidAt,
        dueDate: c.dueDate,
        paymentReceiptUrl: c.receiptUrl,
        loadCount: c.portalLoadCount ?? c.totalLoads,
        totalWeightKg: c.portalWeightKg ?? c.totalWeightKg,
        pricePerTon: areaId === null ? c.pricePerTon : null,
        createdAt: c.createdAt,
      }));

      const manualPaymentRows = await db.select().from(clientPayments).where(
        combineConditions(eq(clientPayments.clientId, input.clientId), await areaCondition(clientPayments, areaId)),
      ).orderBy(desc(clientPayments.dueDate)).limit(100).catch(() => []);
      const manualPayments = areaPending
        ? manualPaymentRows.map((payment: any) => ({ ...payment, amount: null, grossAmount: null, netAmount: null }))
        : manualPaymentRows;
      const portalAdvances = areaPending ? [] : advances;
      const portalAdvanceDeductions = areaPending ? [] : advanceDeductions;
      const totals = calculatePortalTotals({ loads, advances: portalAdvances, deductions: portalAdvanceDeductions, weeklyClosings, areaPending, areaId, manualPayments });
      const publicClient = {
        ...client,
        // A new area must never receive legacy price terms through the client object.
        pricePerTon: areaId === null ? client.pricePerTon : null,
        paymentTermDays: areaId === null ? client.paymentTermDays : null,
        billingCycle: areaId === null ? client.billingCycle : null,
      };
      return {
        client: publicClient,
        areas,
        selectedArea,
        areaId,
        areaPending,
        areaTerms: areaPending ? null : terms,
        loads,
        replanting,
        payments,
        manualPayments,
        weeklyClosings,
        documents,
        advances: portalAdvances,
        advanceDeductions: portalAdvanceDeductions,
        ...totals,
      };
    }),

  listAllReplantings: protectedProcedure
    .input(z.object({ areaId: z.number().nullable().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const areaId = input?.areaId === undefined ? undefined : normalizePortalAreaId(input.areaId);
      const scope = areaId === undefined ? undefined : await areaCondition(replantingRecords, areaId);
      const rows = await db.select({ record: replantingRecords, clientName: clients.name }).from(replantingRecords)
        .leftJoin(clients, eq(replantingRecords.clientId, clients.id))
        .where(scope).orderBy(desc(replantingRecords.date));
      const labels = await areaLabelMap(db);
      return rows.map(({ record, clientName }) => ({ ...record, clientName, areaId: normalizePortalAreaId(record.areaId), areaLabel: labels.get(normalizePortalAreaId(record.areaId) as number) ?? null }));
    }),

  listAllPayments: protectedProcedure
    .input(z.object({ areaId: z.number().nullable().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const areaId = input?.areaId === undefined ? undefined : normalizePortalAreaId(input.areaId);
      if (areaId !== undefined && areaId !== null) {
        const [area] = await db.select({ id: clientAreas.id }).from(clientAreas)
          .where(eq(clientAreas.id, areaId)).limit(1);
        if (!area) throw new TRPCError({ code: "NOT_FOUND", message: "Área não encontrada." });
      }
      const scope = areaId === undefined ? undefined : await areaCondition(clientPayments, areaId);
      const rows = await db.select({ payment: clientPayments, clientName: clients.name }).from(clientPayments)
        .leftJoin(clients, eq(clientPayments.clientId, clients.id))
        .where(scope).orderBy(desc(clientPayments.dueDate));
      const labels = await areaLabelMap(db);
      return rows.map(({ payment, clientName }) => {
        const row: any = payment;
        const normalized = normalizePortalAreaId(row.areaId);
        return {
          ...row,
          clientName,
          areaId: normalized,
          areaLabel: normalized === null ? "Área atual (Área 1)" : labels.get(normalized) ?? `Área #${normalized}`,
          referenceDate: row.referenceDate ?? row.referenceMonth ?? row.createdAt,
          grossAmount: row.grossAmount ?? row.amount,
          netAmount: row.netAmount ?? row.amount,
        };
      });
    }),

  updatePayment: protectedProcedure
    .input(z.object({
      id: z.number(),
      areaId: z.number().nullable().optional(),
      status: z.string().optional(),
      paidAt: z.string().optional(),
      notes: z.string().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      grossAmount: z.string().optional(),
      netAmount: z.string().optional(),
      dueDate: z.string().optional(),
      invoiceNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db.select().from(clientPayments).where(eq(clientPayments.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado." });
      await assertExistingAreaScope(db, clientPayments, input.id, input.areaId, existing.clientId);
      const { id, areaId, paidAt, dueDate, grossAmount, netAmount, ...rest } = input;
      const updateData: any = { ...rest };
      if (grossAmount !== undefined || netAmount !== undefined) updateData.amount = netAmount ?? grossAmount;
      if (paidAt !== undefined) updateData.paidDate = toDateValue(paidAt);
      if (dueDate !== undefined) updateData.dueDate = toDateValue(dueDate);
      const areaCol = areaColumn(clientPayments);
      // areaId is an immutable scope key here: it is validated above but never remapped by update.
      await db.update(clientPayments).set(updateData).where(eq(clientPayments.id, id));
      return { success: true, areaId: normalizePortalAreaId(existing.areaId) };
    }),

  deleteReplanting: protectedProcedure
    .input(z.object({ id: z.number(), areaId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing: any = await db.select().from(replantingRecords).where(eq(replantingRecords.id, input.id)).limit(1).then(rows => rows[0]);
      if (!existing) return { success: true };
      await assertExistingAreaScope(db, replantingRecords, input.id, input.areaId, existing.clientId);
      await db.delete(replantingRecords).where(eq(replantingRecords.id, input.id));
      return { success: true };
    }),

  deletePayment: protectedProcedure
    .input(z.object({ id: z.number(), areaId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db.select().from(clientPayments).where(eq(clientPayments.id, input.id)).limit(1);
      if (!existing) return { success: true };
      await assertExistingAreaScope(db, clientPayments, input.id, input.areaId, existing.clientId);
      await db.delete(clientPayments).where(eq(clientPayments.id, input.id));
      return { success: true };
    }),

  setClientPassword: protectedProcedure
    .input(z.object({ clientId: z.number(), password: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(clients).set({ password: await bcrypt.hash(input.password, 10) }).where(eq(clients.id, input.clientId));
      return { success: true };
    }),

  addReplanting: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      areaId: z.number().nullable().optional(),
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
      const { areaId } = await validateArea(db, input.clientId, input.areaId);
      const values: any = {
        clientId: input.clientId,
        date: new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
        area: input.area,
        species: input.species || "Eucalipto",
        quantity: input.quantity,
        areaHectares: input.areaHectares,
        notes: input.notes,
        registeredBy: ctx.user.id,
      };
      if (areaColumn(replantingRecords)) values.areaId = areaId;
      await db.insert(replantingRecords).values(values);
      return { success: true, areaId };
    }),

  addPayment: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      areaId: z.number().nullable().optional(),
      referenceDate: z.string().optional(),
      description: z.string().optional(),
      volumeM3: z.string().optional(),
      pricePerM3: z.string().optional(),
      grossAmount: z.string().optional(),
      deductions: z.string().optional(),
      netAmount: z.string().optional(),
      status: z.string().default("pending"),
      dueDate: z.string().optional(),
      paidAt: z.string().optional(),
      notes: z.string().optional(),
      invoiceNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
      pixKey: z.string().optional(),
      loadId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { areaId } = await validateArea(db, input.clientId, input.areaId);
      const amount = input.netAmount || input.grossAmount || "0";
      const values: any = {
        clientId: input.clientId,
        amount,
        description: input.description,
        status: input.status,
        referenceMonth: input.referenceDate?.slice(0, 7),
        loadId: input.loadId,
        dueDate: toDateValue(input.dueDate),
        paidDate: toDateValue(input.paidAt),
        notes: input.notes,
        invoiceNumber: input.invoiceNumber,
        paymentMethod: input.paymentMethod || input.pixKey,
        createdBy: ctx.user.id,
      };
      if (areaColumn(clientPayments)) values.areaId = areaId;
      await db.insert(clientPayments).values(values);
      return { success: true, areaId };
    }),
});
