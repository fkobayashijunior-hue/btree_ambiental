/**
 * Router do Traccar GPS
 * - Proxy da API REST do Traccar (rastreamento em tempo real, historico, relatorios)
 * - Vinculacao de dispositivos GPS a equipamentos do sistema
 * - Contagem automatica de horas de uso via ignicao GPS
 * - Geracao automatica de alertas de manutencao preventiva
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  gpsDeviceLinks,
  gpsHoursLog,
  preventiveMaintenancePlans,
  preventiveMaintenanceAlerts,
  equipment,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

const TRACCAR_URL = process.env.TRACCAR_URL || "";
const TRACCAR_TOKEN = process.env.TRACCAR_TOKEN || "";

function traccarAuth() {
  if (TRACCAR_TOKEN) {
    return {
      Authorization: `Bearer ${TRACCAR_TOKEN}`,
      "Content-Type": "application/json",
    };
  }
  // Fallback para Basic Auth (legado)
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

async function traccarFetch(path: string, options?: RequestInit) {
  if (!TRACCAR_URL) {
    throw new Error("Traccar nao configurado. Configure TRACCAR_URL e TRACCAR_TOKEN.");
  }
  const url = `${TRACCAR_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...traccarAuth(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Traccar API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function calcIgnitionHours(deviceId: number, from: string, to: string): Promise<number> {
  try {
    const params = new URLSearchParams({ deviceId: String(deviceId), from, to });
    const summary = await traccarFetch(`/reports/summary?${params}`);
    if (Array.isArray(summary) && summary.length > 0) {
      const engineMs = summary[0].engineHours || 0;
      return Math.round((engineMs / 3600000) * 10) / 10;
    }
  } catch {
    // sem dados
  }
  return 0;
}

async function checkAndGenerateAlerts(equipmentId: number, currentHourMeter: number) {
  const db = await getDb();
  if (!db) return;

  const plans = await db
    .select()
    .from(preventiveMaintenancePlans)
    .where(and(
      eq(preventiveMaintenancePlans.equipmentId, equipmentId),
      eq(preventiveMaintenancePlans.active, 1)
    ));

  for (const plan of plans) {
    const lastDone = parseFloat(plan.lastDoneHours || "0");
    const dueAt = lastDone + plan.intervalHours;
    const alertAt = dueAt - (plan.alertThresholdHours || 10);

    const existingAlert = await db
      .select()
      .from(preventiveMaintenanceAlerts)
      .where(and(
        eq(preventiveMaintenanceAlerts.planId, plan.id),
        eq(preventiveMaintenanceAlerts.status, "pendente")
      ))
      .limit(1);

    if (existingAlert.length > 0) continue;

    if (currentHourMeter >= alertAt) {
      await db.insert(preventiveMaintenanceAlerts).values({
        equipmentId,
        planId: plan.id,
        status: "pendente",
        currentHours: String(currentHourMeter),
        dueHours: String(dueAt),
      });
    }
  }
}

export const traccarRouter = router({
  /** Verifica se o Traccar esta configurado e acessivel */
  status: protectedProcedure.query(async () => {
    if (!TRACCAR_URL) {
      return { configured: false, message: "Traccar nao configurado" };
    }
    try {
      await traccarFetch("/server");
      return { configured: true, message: "Conectado" };
    } catch (e) {
      return { configured: true, message: `Erro de conexao: ${e instanceof Error ? e.message : "desconhecido"}` };
    }
  }),

  /** Lista todos os dispositivos cadastrados no Traccar */
  devices: protectedProcedure.query(async () => {
    return traccarFetch("/devices");
  }),

  /** Posicao mais recente de todos os dispositivos */
  positions: protectedProcedure
    .input(z.object({ deviceId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const params = input?.deviceId ? `?deviceId=${input.deviceId}` : "";
      return traccarFetch(`/positions${params}`);
    }),

  /** Historico de posicoes de um dispositivo em um periodo */
  history: protectedProcedure
    .input(z.object({ deviceId: z.number(), from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
      return traccarFetch(`/reports/route?${params}`);
    }),

  /** Resumo de viagens de um dispositivo */
  trips: protectedProcedure
    .input(z.object({ deviceId: z.number(), from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
      return traccarFetch(`/reports/trips?${params}`);
    }),

  /** Resumo de paradas de um dispositivo */
  stops: protectedProcedure
    .input(z.object({ deviceId: z.number(), from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
      return traccarFetch(`/reports/stops?${params}`);
    }),

  /** Resumo de km e horas por dispositivo no periodo */
  summary: protectedProcedure
    .input(z.object({ deviceId: z.number().optional(), from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ from: input.from, to: input.to });
      if (input.deviceId) params.set("deviceId", String(input.deviceId));
      return traccarFetch(`/reports/summary?${params}`);
    }),

  /** Geofences (cercas virtuais) */
  geofences: protectedProcedure.query(async () => {
    return traccarFetch("/geofences");
  }),

  /** Eventos recentes (alertas de velocidade, ignicao, geofence) */
  events: protectedProcedure
    .input(z.object({ deviceId: z.number(), from: z.string(), to: z.string(), type: z.string().optional() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
      if (input.type) params.set("type", input.type);
      return traccarFetch(`/reports/events?${params}`);
    }),

  // ─── VINCULACAO GPS <-> EQUIPAMENTO ─────────────────────────────────────────

  /** Lista todos os vinculos GPS-equipamento */
  listDeviceLinks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db
      .select({
        id: gpsDeviceLinks.id,
        equipmentId: gpsDeviceLinks.equipmentId,
        equipmentName: equipment.name,
        traccarDeviceId: gpsDeviceLinks.traccarDeviceId,
        traccarDeviceName: gpsDeviceLinks.traccarDeviceName,
        traccarUniqueId: gpsDeviceLinks.traccarUniqueId,
        active: gpsDeviceLinks.active,
        createdAt: gpsDeviceLinks.createdAt,
      })
      .from(gpsDeviceLinks)
      .innerJoin(equipment, eq(gpsDeviceLinks.equipmentId, equipment.id))
      .where(eq(gpsDeviceLinks.active, 1))
      .orderBy(equipment.name);
  }),

  /** Vincula um dispositivo GPS a um equipamento */
  linkDevice: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      traccarDeviceId: z.number(),
      traccarDeviceName: z.string().optional(),
      traccarUniqueId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      await db
        .update(gpsDeviceLinks)
        .set({ active: 0 })
        .where(eq(gpsDeviceLinks.equipmentId, input.equipmentId));
      const [result] = await db.insert(gpsDeviceLinks).values({
        equipmentId: input.equipmentId,
        traccarDeviceId: input.traccarDeviceId,
        traccarDeviceName: input.traccarDeviceName,
        traccarUniqueId: input.traccarUniqueId,
        active: 1,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  /** Remove vinculo GPS de um equipamento */
  unlinkDevice: protectedProcedure
    .input(z.object({ linkId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      await db.update(gpsDeviceLinks).set({ active: 0 }).where(eq(gpsDeviceLinks.id, input.linkId));
      return { ok: true };
    }),

  // ─── HORAS AUTOMATICAS VIA GPS ───────────────────────────────────────────────

  /**
   * Sincroniza as horas de ignicao do dia anterior para todos os equipamentos vinculados.
   * Deve ser chamado diariamente (cron) ou manualmente pelo admin.
   */
  syncDailyHours: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      const targetDate = input.date
        ? new Date(input.date)
        : new Date(Date.now() - 86400000);

      const from = new Date(targetDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(targetDate);
      to.setHours(23, 59, 59, 999);

      const links = await db
        .select()
        .from(gpsDeviceLinks)
        .where(eq(gpsDeviceLinks.active, 1));

      const results: { equipmentId: number; hours: number }[] = [];

      for (const link of links) {
        try {
          const hours = await calcIgnitionHours(
            link.traccarDeviceId,
            from.toISOString(),
            to.toISOString()
          );

          if (hours > 0) {
            const existing = await db
              .select()
              .from(gpsHoursLog)
              .where(and(
                eq(gpsHoursLog.equipmentId, link.equipmentId),
                gte(gpsHoursLog.date, from),
                lte(gpsHoursLog.date, to)
              ))
              .limit(1);

            if (existing.length === 0) {
              await db.insert(gpsHoursLog).values({
                equipmentId: link.equipmentId,
                gpsDeviceLinkId: link.id,
                date: from,
                hoursWorked: String(hours),
                source: "gps_auto",
              });
            }

            const totalResult = await db
              .select({ total: sql<string>`SUM(CAST(hours_worked AS DECIMAL(10,2)))` })
              .from(gpsHoursLog)
              .where(eq(gpsHoursLog.equipmentId, link.equipmentId));

            const totalHours = parseFloat(totalResult[0]?.total || "0");
            await checkAndGenerateAlerts(link.equipmentId, totalHours);
            results.push({ equipmentId: link.equipmentId, hours });
          }
        } catch {
          // continua para o proximo equipamento
        }
      }

      return { synced: results.length, results };
    }),

  /** Horas acumuladas por equipamento (GPS + manual) */
  equipmentHoursSummary: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      const baseQuery = db
        .select({
          equipmentId: gpsHoursLog.equipmentId,
          equipmentName: equipment.name,
          totalHours: sql<string>`SUM(CAST(hours_worked AS DECIMAL(10,2)))`,
          lastDate: sql<Date>`MAX(date)`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(gpsHoursLog)
        .innerJoin(equipment, eq(gpsHoursLog.equipmentId, equipment.id))
        .groupBy(gpsHoursLog.equipmentId, equipment.name)
        .orderBy(equipment.name);

      if (input?.equipmentId) {
        return baseQuery.where(eq(gpsHoursLog.equipmentId, input.equipmentId));
      }
      return baseQuery;
    }),

  /** Log de horas de um equipamento especifico */
  hoursLog: protectedProcedure
    .input(z.object({ equipmentId: z.number(), limit: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      return db
        .select()
        .from(gpsHoursLog)
        .where(eq(gpsHoursLog.equipmentId, input.equipmentId))
        .orderBy(desc(gpsHoursLog.date))
        .limit(input.limit);
    }),

  // ─── PLANOS DE MANUTENCAO PREVENTIVA ────────────────────────────────────────

  /** Lista planos de manutencao de um equipamento */
  listMaintenancePlans: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      return db
        .select()
        .from(preventiveMaintenancePlans)
        .where(and(
          eq(preventiveMaintenancePlans.equipmentId, input.equipmentId),
          eq(preventiveMaintenancePlans.active, 1)
        ))
        .orderBy(preventiveMaintenancePlans.name);
    }),

  /** Cria ou atualiza um plano de manutencao preventiva */
  upsertMaintenancePlan: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      equipmentId: z.number(),
      name: z.string(),
      type: z.enum(["troca_oleo", "engraxamento", "filtro_ar", "filtro_combustivel", "correia", "revisao_geral", "abastecimento", "outros"]),
      intervalHours: z.number().min(1),
      lastDoneHours: z.string().optional(),
      alertThresholdHours: z.number().default(10),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      if (input.id) {
        await db
          .update(preventiveMaintenancePlans)
          .set({
            name: input.name,
            type: input.type,
            intervalHours: input.intervalHours,
            lastDoneHours: input.lastDoneHours,
            alertThresholdHours: input.alertThresholdHours,
            notes: input.notes,
          })
          .where(eq(preventiveMaintenancePlans.id, input.id));
        return { id: input.id };
      }
      const [result] = await db.insert(preventiveMaintenancePlans).values({
        equipmentId: input.equipmentId,
        name: input.name,
        type: input.type,
        intervalHours: input.intervalHours,
        lastDoneHours: input.lastDoneHours || "0",
        alertThresholdHours: input.alertThresholdHours,
        notes: input.notes,
        active: 1,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  /** Remove um plano de manutencao */
  deleteMaintenancePlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      await db.update(preventiveMaintenancePlans).set({ active: 0 }).where(eq(preventiveMaintenancePlans.id, input.id));
      return { ok: true };
    }),

  // ─── ALERTAS DE MANUTENCAO PREVENTIVA ───────────────────────────────────────

  /** Lista alertas pendentes (todos ou por equipamento) */
  listAlerts: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      const conditions = [];
      if (input.equipmentId) conditions.push(eq(preventiveMaintenanceAlerts.equipmentId, input.equipmentId));
      if (input.status) conditions.push(eq(preventiveMaintenanceAlerts.status, input.status as any));

      return db
        .select({
          id: preventiveMaintenanceAlerts.id,
          equipmentId: preventiveMaintenanceAlerts.equipmentId,
          equipmentName: equipment.name,
          planId: preventiveMaintenanceAlerts.planId,
          planName: preventiveMaintenancePlans.name,
          planType: preventiveMaintenancePlans.type,
          status: preventiveMaintenanceAlerts.status,
          currentHours: preventiveMaintenanceAlerts.currentHours,
          dueHours: preventiveMaintenanceAlerts.dueHours,
          generatedAt: preventiveMaintenanceAlerts.generatedAt,
          resolvedAt: preventiveMaintenanceAlerts.resolvedAt,
          notes: preventiveMaintenanceAlerts.notes,
        })
        .from(preventiveMaintenanceAlerts)
        .innerJoin(equipment, eq(preventiveMaintenanceAlerts.equipmentId, equipment.id))
        .innerJoin(preventiveMaintenancePlans, eq(preventiveMaintenanceAlerts.planId, preventiveMaintenancePlans.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(preventiveMaintenanceAlerts.generatedAt));
    }),

  /** Resolve (conclui) um alerta e atualiza o horimetro do plano */
  resolveAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      status: z.enum(["concluido", "ignorado"]),
      notes: z.string().optional(),
      resolvedHourMeter: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      const now = new Date();

      await db
        .update(preventiveMaintenanceAlerts)
        .set({
          status: input.status,
          resolvedAt: now,
          resolvedBy: ctx.user.id,
          notes: input.notes,
        })
        .where(eq(preventiveMaintenanceAlerts.id, input.alertId));

      if (input.status === "concluido") {
        const alert = await db
          .select()
          .from(preventiveMaintenanceAlerts)
          .where(eq(preventiveMaintenanceAlerts.id, input.alertId))
          .limit(1);

        if (alert.length > 0) {
          await db
            .update(preventiveMaintenancePlans)
            .set({
              lastDoneHours: input.resolvedHourMeter || alert[0].currentHours,
              lastDoneAt: now,
            })
            .where(eq(preventiveMaintenancePlans.id, alert[0].planId));
        }
      }

      return { ok: true };
    }),

  /** Contagem de alertas pendentes (para badge na sidebar) */
  alertCount: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(preventiveMaintenanceAlerts)
      .where(eq(preventiveMaintenanceAlerts.status, "pendente"));
    return { count: Number(result[0]?.count || 0) };
  }),
});
