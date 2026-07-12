/**
 * Handler do Heartbeat para verificação de Porteiras Virtuais (Geofences)
 * Chamado a cada 2 minutos pelo Manus Heartbeat via POST /api/scheduled/geofence-check
 *
 * Lógica:
 * - Para cada porteira ativa com traccarDeviceId configurado:
 *   1. Busca posição atual do dispositivo no Traccar
 *   2. Verifica se está dentro ou fora da geofence circular
 *   3. Se entrou: abre novo freight_trip (status=open, entryAt=now)
 *   4. Se saiu: fecha o trip atual (exitAt=now, status=closed) e calcula km
 *   5. Se voltou após saída: fecha o trip anterior e abre novo
 */

import { Request, Response } from "express";
import { getDb } from "../db";
import { geofences, freightTrips, gpsDeviceLinks, equipment, collaborators } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

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

function calcDistanceFromPositions(positionsJson: string | null): string {
  if (!positionsJson) return "0";
  try {
    const traj: Array<{ lat: number; lng: number }> = JSON.parse(positionsJson);
    let dist = 0;
    for (let i = 1; i < traj.length; i++) {
      dist += haversineKm(traj[i - 1].lat, traj[i - 1].lng, traj[i].lat, traj[i].lng);
    }
    return String(Math.round(dist * 10) / 10);
  } catch {
    return "0";
  }
}

export async function geofenceCheckHandler(req: Request, res: Response) {
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Banco de dados indisponível" });
  }

  if (!TRACCAR_URL) {
    return res.status(200).json({ processed: 0, message: "Traccar não configurado" });
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const log: string[] = [];
  let processed = 0;

  try {
    // Buscar todas as porteiras ativas com traccarDeviceId configurado
    const activeGeofences = await db
      .select()
      .from(geofences)
      .where(and(eq(geofences.isActive, 1), sql`${geofences.traccarDeviceId} IS NOT NULL`));

    for (const geo of activeGeofences) {
      if (!geo.traccarDeviceId) continue;

      // Buscar posição atual no Traccar
      const pos = await getDevicePosition(geo.traccarDeviceId);
      if (!pos) {
        log.push(`[Geofence ${geo.name}] Sem posição GPS disponível`);
        continue;
      }

      const inside = isInsideGeofence(
        pos.lat,
        pos.lng,
        parseFloat(geo.lat),
        parseFloat(geo.lng),
        geo.radiusMeters
      );

      // Buscar frete aberto para esta porteira
      const [openTrip] = await db
        .select()
        .from(freightTrips)
        .where(and(eq(freightTrips.geofenceId, geo.id), eq(freightTrips.status, "open")))
        .orderBy(freightTrips.entryAt)
        .limit(1);

      if (inside) {
        // Veículo está DENTRO da porteira
        if (!openTrip) {
          // Não há frete aberto → abre novo frete
          // Tentar detectar motorista pelo equipamento vinculado
          let vehicleId: number | null = null;
          let vehicleName: string | null = null;
          let driverId: number | null = null;
          let driverName: string | null = null;

          // Buscar equipamento vinculado ao dispositivo Traccar
          const [deviceLink] = await db
            .select({ equipmentId: gpsDeviceLinks.equipmentId })
            .from(gpsDeviceLinks)
            .where(
              and(
                eq(gpsDeviceLinks.traccarDeviceId, geo.traccarDeviceId),
                eq(gpsDeviceLinks.active, 1)
              )
            )
            .limit(1);

          if (deviceLink?.equipmentId) {
            vehicleId = deviceLink.equipmentId;
            const [equip] = await db
              .select({ name: equipment.name, responsibleDriverId: equipment.responsibleDriverId })
              .from(equipment)
              .where(eq(equipment.id, deviceLink.equipmentId))
              .limit(1);
            if (equip) {
              vehicleName = equip.name;
              if (equip.responsibleDriverId) {
                const [collab] = await db
                  .select({ id: collaborators.id, name: collaborators.name })
                  .from(collaborators)
                  .where(eq(collaborators.id, equip.responsibleDriverId))
                  .limit(1);
                if (collab) {
                  driverId = collab.id;
                  driverName = collab.name;
                }
              }
            }
          }

          await db.insert(freightTrips).values({
            geofenceId: geo.id,
            vehicleId,
            vehicleName,
            driverId,
            driverName,
            status: "open",
            originName: geo.defaultOriginName || "SIMFLOR",
            destinationName: null,
            entryAt: now,
            tollCost: "0",
            maintenanceCost: "0",
            fuelCost: "0",
            totalCost: "0",
            traccarPositionsJson: JSON.stringify([{ lat: pos.lat, lng: pos.lng, ts: now }]),
          });
          log.push(`[Porteira ${geo.name}] Novo frete aberto — ${vehicleName || "veículo desconhecido"} entrou`);
        } else {
          // Frete já aberto e veículo ainda dentro → acumular posição
          let traj: any[] = [];
          if (openTrip.traccarPositionsJson) {
            try { traj = JSON.parse(openTrip.traccarPositionsJson); } catch { traj = []; }
          }
          traj.push({ lat: pos.lat, lng: pos.lng, ts: now });
          if (traj.length > 500) traj = traj.slice(-500);
          await db
            .update(freightTrips)
            .set({ traccarPositionsJson: JSON.stringify(traj) })
            .where(eq(freightTrips.id, openTrip.id));
        }
      } else {
        // Veículo está FORA da porteira
        if (openTrip) {
          // Havia frete aberto → fecha o frete
          let traj: any[] = [];
          if (openTrip.traccarPositionsJson) {
            try { traj = JSON.parse(openTrip.traccarPositionsJson); } catch { traj = []; }
          }
          traj.push({ lat: pos.lat, lng: pos.lng, ts: now });
          const distanceKm = calcDistanceFromPositions(JSON.stringify(traj));

          await db
            .update(freightTrips)
            .set({
              status: "closed",
              exitAt: now,
              distanceKm,
              traccarPositionsJson: JSON.stringify(traj),
            })
            .where(eq(freightTrips.id, openTrip.id));

          log.push(`[Porteira ${geo.name}] Frete #${openTrip.id} fechado — ${distanceKm}km percorridos`);
        }
        // Se não há frete aberto e veículo está fora → nada a fazer
      }
      processed++;
    }

    console.log(`[GeofenceCheck] Processadas ${processed} porteiras. ${log.join(" | ")}`);
    return res.status(200).json({ processed, log, timestamp: now });
  } catch (err: any) {
    console.error("[GeofenceCheck] Erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
