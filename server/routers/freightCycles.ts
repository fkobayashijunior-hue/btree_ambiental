// @ts-nocheck
/**
 * Router de Ciclos de Frete Automático por Geofence
 * - CRUD de geofences (áreas de fazenda monitoradas)
 * - CRUD e consulta de ciclos de frete
 * - Job de polling Traccar: detecta entrada/saída de geofence e abre/fecha ciclos
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  farmGeofences,
  freightCycles,
  equipment,
  collaborators,
  cargoLoads,
  fuelRecords,
  vehicleRecords,
  gpsDeviceLinks,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, isNull, sql } from "drizzle-orm";

const TRACCAR_URL = process.env.TRACCAR_URL || "";
const TRACCAR_TOKEN = process.env.TRACCAR_TOKEN || "";

function traccarHeaders() {
  if (TRACCAR_TOKEN) {
    return {
      Authorization: `Bearer ${TRACCAR_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function traccarGet(path: string) {
  if (!TRACCAR_URL) return null;
  try {
    const res = await fetch(`${TRACCAR_URL}/api${path}`, {
      headers: traccarHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Calcula distância em km entre dois pontos (Haversine) */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Verifica se uma posição está dentro de uma geofence circular */
function isInsideGeofence(
  lat: number,
  lng: number,
  geoLat: number,
  geoLng: number,
  radiusMeters: number
): boolean {
  const distKm = haversineKm(lat, lng, geoLat, geoLng);
  return distKm * 1000 <= radiusMeters;
}

/** Busca a posição atual de um dispositivo Traccar */
async function getDevicePosition(traccarDeviceId: number): Promise<{ lat: number; lng: number; speed: number } | null> {
  const positions = await traccarGet(`/positions?deviceId=${traccarDeviceId}`);
  if (!Array.isArray(positions) || positions.length === 0) return null;
  const pos = positions[0];
  return {
    lat: pos.latitude,
    lng: pos.longitude,
    speed: pos.speed || 0,
  };
}

/** Calcula custos de combustível e manutenção para um equipamento em um período */
async function calcCyclesCosts(
  db: Awaited<ReturnType<typeof getDb>>,
  equipmentId: number,
  fromStr: string,
  toStr: string
): Promise<{ fuelCost: number; maintenanceCost: number }> {
  if (!db) return { fuelCost: 0, maintenanceCost: 0 };

  // Combustível (fuelRecords)
  const fuelRows = await db
    .select({ totalValue: fuelRecords.totalValue })
    .from(fuelRecords)
    .where(
      and(
        eq(fuelRecords.equipmentId, equipmentId),
        gte(fuelRecords.date, fromStr),
        lte(fuelRecords.date, toStr)
      )
    );
  const fuelCost = fuelRows.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);

  // Manutenção (vehicleRecords tipo manutencao)
  const maintRows = await db
    .select({ maintenanceCost: vehicleRecords.maintenanceCost })
    .from(vehicleRecords)
    .where(
      and(
        eq(vehicleRecords.equipmentId, equipmentId),
        eq(vehicleRecords.recordType, "manutencao"),
        gte(vehicleRecords.date, fromStr),
        lte(vehicleRecords.date, toStr)
      )
    );
  const maintenanceCost = maintRows.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);

  return { fuelCost, maintenanceCost };
}

export const freightCyclesRouter = router({
  // ─── GEOFENCES ──────────────────────────────────────────────────────────────

  /** Lista todas as geofences */
  listGeofences: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(farmGeofences)
      .orderBy(desc(farmGeofences.createdAt));
  }),

  /** Cria nova geofence */
  createGeofence: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        latitude: z.string(),
        longitude: z.string(),
        radiusMeters: z.number().default(500),
        equipmentId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(farmGeofences).values({
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        equipmentId: input.equipmentId ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Atualiza geofence */
  updateGeofence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        radiusMeters: z.number().optional(),
        equipmentId: z.number().nullable().optional(),
        active: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...rest } = input;
      await db.update(farmGeofences).set(rest).where(eq(farmGeofences.id, id));
      return { ok: true };
    }),

  /** Remove geofence */
  deleteGeofence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(farmGeofences).where(eq(farmGeofences.id, input.id));
      return { ok: true };
    }),

  // ─── CICLOS DE FRETE ────────────────────────────────────────────────────────

  /** Lista ciclos de frete com filtros */
  listCycles: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number().optional(),
        status: z.enum(["em_fazenda", "em_transito", "concluido", "cancelado"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input.equipmentId) conditions.push(eq(freightCycles.equipmentId, input.equipmentId));
      if (input.status) conditions.push(eq(freightCycles.status, input.status));
      if (input.dateFrom) conditions.push(gte(freightCycles.arrivedFarmAt, input.dateFrom));
      if (input.dateTo) conditions.push(lte(freightCycles.arrivedFarmAt, input.dateTo));
      return db
        .select()
        .from(freightCycles)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(freightCycles.createdAt))
        .limit(input.limit);
    }),

  /** Detalhe de um ciclo */
  getCycle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [cycle] = await db
        .select()
        .from(freightCycles)
        .where(eq(freightCycles.id, input.id));
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });
      return cycle;
    }),

  /** Ciclos ativos (em_fazenda ou em_transito) */
  activeCycles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(freightCycles)
      .where(
        sql`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
      )
      .orderBy(desc(freightCycles.createdAt));
  }),

  /** Vincula uma carga ao ciclo */
  linkCargoLoad: protectedProcedure
    .input(z.object({ cycleId: z.number(), cargoLoadId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Buscar destino da carga
      const [cargo] = await db
        .select({ destination: cargoLoads.destination })
        .from(cargoLoads)
        .where(eq(cargoLoads.id, input.cargoLoadId));
      await db
        .update(freightCycles)
        .set({
          cargoLoadId: input.cargoLoadId,
          destination: cargo?.destination ?? null,
        })
        .where(eq(freightCycles.id, input.cycleId));
      return { ok: true };
    }),

  /** Atualiza motorista do ciclo */
  updateDriver: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        driverCollaboratorId: z.number().optional(),
        driverName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(freightCycles)
        .set({
          driverCollaboratorId: input.driverCollaboratorId ?? null,
          driverName: input.driverName ?? null,
        })
        .where(eq(freightCycles.id, input.cycleId));
      return { ok: true };
    }),

  /** Fecha manualmente um ciclo em andamento */
  closeCycleManually: protectedProcedure
    .input(
      z.object({
        cycleId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [cycle] = await db
        .select()
        .from(freightCycles)
        .where(eq(freightCycles.id, input.cycleId));
      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const fromStr = cycle.leftFarmAt || cycle.arrivedFarmAt || now;

      // Calcular custos
      let fuelCost = 0;
      let maintenanceCost = 0;
      if (cycle.equipmentId) {
        const costs = await calcCyclesCosts(db, cycle.equipmentId, fromStr, now);
        fuelCost = costs.fuelCost;
        maintenanceCost = costs.maintenanceCost;
      }
      const totalCost = fuelCost + maintenanceCost;

      await db
        .update(freightCycles)
        .set({
          status: "concluido",
          returnedFarmAt: now,
          totalFuelCost: String(fuelCost.toFixed(2)),
          totalMaintenanceCost: String(maintenanceCost.toFixed(2)),
          totalCost: String(totalCost.toFixed(2)),
          notes: input.notes ?? cycle.notes,
        })
        .where(eq(freightCycles.id, input.cycleId));
      return { ok: true };
    }),

  /** Cancela um ciclo */
  cancelCycle: protectedProcedure
    .input(z.object({ cycleId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(freightCycles)
        .set({ status: "cancelado", notes: input.notes ?? null })
        .where(eq(freightCycles.id, input.cycleId));
      return { ok: true };
    }),

  // ─── POLLING TRACCAR ────────────────────────────────────────────────────────

  /**
   * Job de polling: verifica posição atual de todos os veículos com geofence ativa
   * e abre/fecha ciclos automaticamente.
   * Deve ser chamado a cada 2 minutos pelo heartbeat ou manualmente.
   */
  pollGeofences: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!TRACCAR_URL) return { processed: 0, message: "Traccar não configurado" };

    // Buscar geofences ativas com equipamento vinculado
    const geofences = await db
      .select()
      .from(farmGeofences)
      .where(eq(farmGeofences.active, 1));

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    let processed = 0;
    const log: string[] = [];

    for (const geo of geofences) {
      if (!geo.equipmentId) continue;

      // Buscar link Traccar do equipamento
      const [link] = await db
        .select()
        .from(gpsDeviceLinks)
        .where(
          and(
            eq(gpsDeviceLinks.equipmentId, geo.equipmentId),
            eq(gpsDeviceLinks.active, 1)
          )
        );
      if (!link) continue;

      // Buscar posição atual no Traccar
      const pos = await getDevicePosition(link.traccarDeviceId);
      if (!pos) continue;

      const inside = isInsideGeofence(
        pos.lat,
        pos.lng,
        parseFloat(geo.latitude),
        parseFloat(geo.longitude),
        geo.radiusMeters
      );

      // Buscar ciclo ativo para este equipamento
      const [activeCycle] = await db
        .select()
        .from(freightCycles)
        .where(
          and(
            eq(freightCycles.equipmentId, geo.equipmentId),
            sql`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
          )
        );

      if (inside) {
        // Veículo está na fazenda
        if (!activeCycle) {
          // Nenhum ciclo ativo → abre novo ciclo
          await db.insert(freightCycles).values({
            equipmentId: geo.equipmentId,
            geofenceId: geo.id,
            status: "em_fazenda",
            arrivedFarmAt: now,
            startLat: String(pos.lat),
            startLng: String(pos.lng),
          });
          log.push(`[Geofence] Novo ciclo aberto para equipamento ${geo.equipmentId} (chegou na fazenda)`);
        } else if (activeCycle.status === "em_transito") {
          // Estava em trânsito e voltou → fecha ciclo
          const fromStr = activeCycle.leftFarmAt || activeCycle.arrivedFarmAt || now;
          const costs = await calcCyclesCosts(db, geo.equipmentId, fromStr, now);
          const totalCost = costs.fuelCost + costs.maintenanceCost;

          // Calcular distância total do trajeto (se houver trajectory)
          let distanceKm = "0";
          if (activeCycle.trajectoryJson) {
            try {
              const traj: Array<{ lat: number; lng: number }> = JSON.parse(activeCycle.trajectoryJson);
              let dist = 0;
              for (let i = 1; i < traj.length; i++) {
                dist += haversineKm(traj[i - 1].lat, traj[i - 1].lng, traj[i].lat, traj[i].lng);
              }
              distanceKm = String(Math.round(dist * 10) / 10);
            } catch {
              distanceKm = "0";
            }
          }

          await db
            .update(freightCycles)
            .set({
              status: "concluido",
              returnedFarmAt: now,
              endLat: String(pos.lat),
              endLng: String(pos.lng),
              distanceKm,
              totalFuelCost: String(costs.fuelCost.toFixed(2)),
              totalMaintenanceCost: String(costs.maintenanceCost.toFixed(2)),
              totalCost: String(totalCost.toFixed(2)),
            })
            .where(eq(freightCycles.id, activeCycle.id));

          // Abrir novo ciclo imediatamente
          await db.insert(freightCycles).values({
            equipmentId: geo.equipmentId,
            geofenceId: geo.id,
            status: "em_fazenda",
            arrivedFarmAt: now,
            startLat: String(pos.lat),
            startLng: String(pos.lng),
          });
          log.push(`[Geofence] Ciclo ${activeCycle.id} concluído (${distanceKm}km, R$${totalCost.toFixed(2)}). Novo ciclo aberto.`);
        }
      } else {
        // Veículo está fora da fazenda
        if (activeCycle?.status === "em_fazenda") {
          // Estava na fazenda e saiu → inicia trânsito
          await db
            .update(freightCycles)
            .set({
              status: "em_transito",
              leftFarmAt: now,
            })
            .where(eq(freightCycles.id, activeCycle.id));
          log.push(`[Geofence] Ciclo ${activeCycle.id} → em_transito (saiu da fazenda)`);
        } else if (activeCycle?.status === "em_transito") {
          // Em trânsito → acumula posição no trajeto
          const newPoint = { lat: pos.lat, lng: pos.lng, ts: now };
          let traj: any[] = [];
          if (activeCycle.trajectoryJson) {
            try { traj = JSON.parse(activeCycle.trajectoryJson); } catch { traj = []; }
          }
          // Limitar a 500 pontos para não explodir o banco
          traj.push(newPoint);
          if (traj.length > 500) traj = traj.slice(-500);
          await db
            .update(freightCycles)
            .set({ trajectoryJson: JSON.stringify(traj) })
            .where(eq(freightCycles.id, activeCycle.id));
        }
      }
      processed++;
    }

    if (log.length > 0) {
      console.log("[FreightCycles]", log.join(" | "));
    }
    return { processed, log };
  }),

  /** Status em tempo real de todos os veículos monitorados */
  realtimeStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const geofences = await db
      .select()
      .from(farmGeofences)
      .where(eq(farmGeofences.active, 1));

    const result = [];
    for (const geo of geofences) {
      if (!geo.equipmentId) continue;

      const [eq_row] = await db
        .select({ name: equipment.name, licensePlate: equipment.licensePlate })
        .from(equipment)
        .where(eq(equipment.id, geo.equipmentId));

      const [link] = await db
        .select()
        .from(gpsDeviceLinks)
        .where(
          and(
            eq(gpsDeviceLinks.equipmentId, geo.equipmentId),
            eq(gpsDeviceLinks.active, 1)
          )
        );

      const [activeCycle] = await db
        .select()
        .from(freightCycles)
        .where(
          and(
            eq(freightCycles.equipmentId, geo.equipmentId),
            sql`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
          )
        );

      let currentPos = null;
      if (link) {
        currentPos = await getDevicePosition(link.traccarDeviceId);
      }

      let insideGeofence = false;
      if (currentPos) {
        insideGeofence = isInsideGeofence(
          currentPos.lat,
          currentPos.lng,
          parseFloat(geo.latitude),
          parseFloat(geo.longitude),
          geo.radiusMeters
        );
      }

      result.push({
        geofence: geo,
        equipment: eq_row ?? null,
        activeCycle: activeCycle ?? null,
        currentPosition: currentPos,
        insideGeofence,
        traccarLinked: !!link,
      });
    }
    return result;
  }),
});
