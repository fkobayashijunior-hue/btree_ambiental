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
  machineHours,
  autoFreightTrips,
  financialEntries,
  machineFuel,
  machineMaintenance,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

function getTraccarUrl() { return process.env.TRACCAR_URL || ""; }
function getTraccarToken() { return process.env.TRACCAR_TOKEN || ""; }

function traccarAuth() {
  const token = getTraccarToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  // Fallback para Basic Auth (legado)
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function traccarFetch(path: string, options?: RequestInit) {
  const TRACCAR_URL = getTraccarUrl();
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
    if (!getTraccarUrl()) {
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

  /** Resumo de viagens de um dispositivo - enriquecido com endereços e distância real */
  trips: protectedProcedure
    .input(z.object({ deviceId: z.number(), from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
      const trips = await traccarFetch(`/reports/trips?${params}`);
      
      // Enriquecer cada viagem com endereço de destino e distância corrigida
      const enriched = await Promise.all(
        (trips as any[]).map(async (trip: any) => {
          // Calcular distância real: usar odometro se distance for 0
          let realDistance = trip.distance || 0;
          if (realDistance === 0 && trip.endOdometer && trip.startOdometer) {
            realDistance = trip.endOdometer - trip.startOdometer;
          }
          
          // Resolver endAddress via geocoding reverso do Traccar
          let endAddress = trip.endAddress;
          if (!endAddress && trip.endLat && trip.endLon) {
            try {
              const geoRes = await fetch(
                `${getTraccarUrl()}/api/server/geocode?latitude=${trip.endLat}&longitude=${trip.endLon}`,
                { headers: traccarAuth() }
              );
              if (geoRes.ok) {
                endAddress = await geoRes.text();
              }
            } catch { /* ignorar erro de geocoding */ }
          }
          
          // Resolver startAddress via geocoding se tambem estiver null
          let startAddress = trip.startAddress;
          if (!startAddress && trip.startLat && trip.startLon) {
            try {
              const geoRes = await fetch(
                `${getTraccarUrl()}/api/server/geocode?latitude=${trip.startLat}&longitude=${trip.startLon}`,
                { headers: traccarAuth() }
              );
              if (geoRes.ok) {
                startAddress = await geoRes.text();
              }
            } catch { /* ignorar */ }
          }
          
          return {
            ...trip,
            startAddress,
            endAddress,
            realDistance, // distância corrigida em km
          };
        })
      );
      
      return enriched;
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
                gte(gpsHoursLog.date, from.toISOString()),
                lte(gpsHoursLog.date, to.toISOString())
              ))
              .limit(1);

            if (existing.length === 0) {
              // Calcular horímetro acumulado total
              const prevTotalResult = await db
                .select({ total: sql<string>`SUM(CAST(hours_worked AS DECIMAL(10,2)))` })
                .from(gpsHoursLog)
                .where(eq(gpsHoursLog.equipmentId, link.equipmentId));
              const prevTotal = parseFloat(prevTotalResult[0]?.total || "0");
              const newTotal = prevTotal + hours;
              const startMeter = String(Math.round(prevTotal * 10) / 10);
              const endMeter = String(Math.round(newTotal * 10) / 10);

              await db.insert(gpsHoursLog).values({
                equipmentId: link.equipmentId,
                gpsDeviceLinkId: link.id,
                date: from.toISOString(),
                hoursWorked: String(hours),
                hourMeterStart: startMeter,
                hourMeterEnd: endMeter,
                source: "gps_auto",
              });
              // Mirror GPS hours into machine_hours with real horímetro
              const dateStr = from.toISOString().slice(0, 10);
              await db.insert(machineHours).values({
                equipmentId: link.equipmentId,
                date: from.toISOString().slice(0, 19).replace('T', ' '),
                startHourMeter: startMeter,
                endHourMeter: endMeter,
                hoursWorked: String(hours),
                activity: 'GPS Automático',
                notes: `Sincronizado automaticamente via GPS em ${dateStr}`,
                source: 'gps',
              });
              // Update accumulated_hours on equipment
              await db
                .update(equipment)
                .set({ accumulatedHours: endMeter })
                .where(eq(equipment.id, link.equipmentId));
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
      const now = new Date().toISOString();

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

  /**
   * Sincroniza km percorrido do dia para veiculos/caminhoes com GPS.
   * Atualiza accumulated_km no equipment e registra em gps_hours_log.
   */
  syncDailyOdometer: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 86400000);
      const from = new Date(targetDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(targetDate);
      to.setHours(23, 59, 59, 999);

      const links = await db.select().from(gpsDeviceLinks).where(eq(gpsDeviceLinks.active, 1));
      const results: { equipmentId: number; distanceKm: number }[] = [];

      for (const link of links) {
        try {
          const params = new URLSearchParams({
            deviceId: String(link.traccarDeviceId),
            from: from.toISOString(),
            to: to.toISOString(),
          });
          const summary = await traccarFetch(`/reports/summary?${params}`);
          if (!Array.isArray(summary) || summary.length === 0) continue;

          const rawDist = summary[0]?.distance || 0;
          const distKm = rawDist > 1000 ? Math.round((rawDist / 1000) * 10) / 10 : Math.round(rawDist * 10) / 10;
          if (distKm <= 0) continue;

          // Calcular km acumulado anterior
          const prevKmResult = await db
            .select({ total: sql<string>`COALESCE(SUM(CAST(distance_km AS DECIMAL(10,1))), 0)` })
            .from(gpsHoursLog)
            .where(eq(gpsHoursLog.equipmentId, link.equipmentId));
          const prevKm = parseFloat(prevKmResult[0]?.total || "0");
          const newKm = Math.round((prevKm + distKm) * 10) / 10;

          // Update accumulated_km on equipment
          await db
            .update(equipment)
            .set({ accumulatedKm: String(newKm) })
            .where(eq(equipment.id, link.equipmentId));

          results.push({ equipmentId: link.equipmentId, distanceKm: distKm });
        } catch {
          // continua para o proximo
        }
      }
      return { synced: results.length, results };
    }),

  /**
   * Detecta viagens longas (>50km) do dia e cria auto_freight_trips automaticamente.
   * Vincula combustivel e manutencoes do mesmo dia ao frete.
   */
  detectFreightTrips: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });

      const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 86400000);
      const from = new Date(targetDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(targetDate);
      to.setHours(23, 59, 59, 999);
      const dateStr = from.toISOString().slice(0, 10);

      const links = await db.select().from(gpsDeviceLinks).where(eq(gpsDeviceLinks.active, 1));
      const detected: number[] = [];

      for (const link of links) {
        try {
          // Buscar viagens do dia
          const params = new URLSearchParams({
            deviceId: String(link.traccarDeviceId),
            from: from.toISOString(),
            to: to.toISOString(),
          });
          const trips = await traccarFetch(`/reports/trips?${params}`);
          if (!Array.isArray(trips)) continue;

          // Filtrar viagens longas (>50km)
          const longTrips = trips.filter((t: any) => {
            const raw = t.distance || 0;
            const km = raw > 1000 ? raw / 1000 : raw;
            return km >= 50;
          });
          if (longTrips.length === 0) continue;

          // Buscar nome do equipamento
          const eqRow = await db.select().from(equipment).where(eq(equipment.id, link.equipmentId)).limit(1);
          const eqName = eqRow[0]?.name || `Equipamento #${link.equipmentId}`;

          // Verificar se ja existe frete detectado para este equipamento neste dia
          const existingFreight = await db
            .select()
            .from(autoFreightTrips)
            .where(and(
              eq(autoFreightTrips.equipmentId, link.equipmentId),
              eq(autoFreightTrips.tripDate, dateStr)
            ))
            .limit(1);
          if (existingFreight.length > 0) continue;

          // Calcular totais do dia
          const totalDistKm = longTrips.reduce((s: number, t: any) => {
            const raw = t.distance || 0;
            return s + (raw > 1000 ? raw / 1000 : raw);
          }, 0);
          const totalDurationMs = longTrips.reduce((s: number, t: any) => s + (t.duration || 0), 0);
          const totalDurationMin = Math.round(totalDurationMs / 60000);

          // Buscar combustivel do mesmo dia para este equipamento
          const fuelRows = await db
            .select()
            .from(machineFuel)
            .where(and(
              eq(machineFuel.equipmentId, link.equipmentId),
              gte(machineFuel.date, from.toISOString().slice(0, 19).replace('T', ' ')),
              lte(machineFuel.date, to.toISOString().slice(0, 19).replace('T', ' '))
            ));
          const fuelCost = fuelRows.reduce((s, r) => s + parseFloat(r.totalValue || '0'), 0);

          // Buscar manutencoes do mesmo dia
          const maintRows = await db
            .select()
            .from(machineMaintenance)
            .where(and(
              eq(machineMaintenance.equipmentId, link.equipmentId),
              gte(machineMaintenance.date, from.toISOString().slice(0, 19).replace('T', ' ')),
              lte(machineMaintenance.date, to.toISOString().slice(0, 19).replace('T', ' '))
            ));
          const maintCost = maintRows.reduce((s, r) => s + parseFloat(r.totalCost || '0'), 0);

          const totalCost = fuelCost + maintCost;

          // Criar auto_freight_trip
          await db.insert(autoFreightTrips).values({
            equipmentId: link.equipmentId,
            equipmentName: eqName,
            traccarDeviceId: link.traccarDeviceId,
            tripDate: dateStr,
            startTime: longTrips[0]?.startTime || null,
            endTime: longTrips[longTrips.length - 1]?.endTime || null,
            distanceKm: String(Math.round(totalDistKm * 10) / 10),
            durationMinutes: totalDurationMin,
            startAddress: longTrips[0]?.startAddress || null,
            endAddress: longTrips[longTrips.length - 1]?.endAddress || null,
            fuelCost: String(fuelCost.toFixed(2)),
            maintenanceCost: String(maintCost.toFixed(2)),
            totalCost: String(totalCost.toFixed(2)),
            status: 'detectado',
          });

          // Criar lancamento financeiro automatico se tiver custo
          if (totalCost > 0) {
            await db.insert(financialEntries).values({
              date: new Date(dateStr).toISOString().slice(0, 19).replace('T', ' '),
              type: 'despesa',
              category: 'transporte',
              description: `Frete GPS automático — ${eqName} — ${Math.round(totalDistKm)}km em ${dateStr}`,
              amount: String(totalCost.toFixed(2)),
              equipmentId: link.equipmentId,
              equipmentName: eqName,
              autoGenerated: 1,
              registeredBy: 1,
            });
          }

          detected.push(link.equipmentId);
        } catch {
          // continua
        }
      }
      return { detected: detected.length, equipmentIds: detected };
    }),

  /** Lista fretes automaticos detectados pelo GPS */
  listAutoFreights: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.enum(['detectado','confirmado','ignorado']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.equipmentId) conditions.push(eq(autoFreightTrips.equipmentId, input.equipmentId));
      if (input.dateFrom) conditions.push(gte(autoFreightTrips.tripDate, input.dateFrom));
      if (input.dateTo) conditions.push(lte(autoFreightTrips.tripDate, input.dateTo));
      if (input.status) conditions.push(eq(autoFreightTrips.status, input.status));
      return db
        .select()
        .from(autoFreightTrips)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(autoFreightTrips.tripDate));
    }),

  /** Confirma ou ignora um frete automatico */
  updateAutoFreightStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['confirmado','ignorado']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
      await db
        .update(autoFreightTrips)
        .set({ status: input.status, notes: input.notes })
        .where(eq(autoFreightTrips.id, input.id));
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
