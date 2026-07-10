/**
 * offlineSync.ts — Registro central de handlers de sincronização offline
 *
 * Este arquivo registra os handlers que processam a fila offline quando
 * a conexão é restaurada. Cada handler recebe o payload salvo e chama
 * a API correspondente via fetch direto (sem tRPC hooks, pois roda fora
 * de componentes React).
 *
 * Os tipos de operação suportados:
 *   - cargo.create
 *   - attendance.create
 *   - machineHours.createHours
 *   - machineHours.createMaintenance
 *   - machineHours.createFuel
 *   - machineHours.createOil
 */

import { registerOfflineSyncHandler, type QueuedOperation } from "@/hooks/useOfflineQueue";

// ── Helper: chama uma procedure tRPC via fetch direto ──────────────────────
async function callTRPC(procedure: string, input: unknown): Promise<void> {
  const url = `${window.location.origin}/api/trpc/${procedure}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${procedure}] HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json?.error) {
    throw new Error(`[${procedure}] ${json.error.message || JSON.stringify(json.error)}`);
  }
}

// ── Registro de handlers ───────────────────────────────────────────────────

/** Registra todos os handlers de sincronização offline. Chamar uma vez no App. */
export function registerAllOfflineHandlers() {
  // Criação de carga
  registerOfflineSyncHandler("cargo.create", async (op: QueuedOperation) => {
    await callTRPC("cargoLoads.create", op.payload);
  });

  // Criação de presença (AttendanceList)
  registerOfflineSyncHandler("attendance.create", async (op: QueuedOperation) => {
    await callTRPC("attendance.create", op.payload);
  });

  // Registro de horas máquina
  registerOfflineSyncHandler("machineHours.createHours", async (op: QueuedOperation) => {
    await callTRPC("machineHours.createHours", op.payload);
  });

  // Registro de manutenção
  registerOfflineSyncHandler("machineHours.createMaintenance", async (op: QueuedOperation) => {
    await callTRPC("machineHours.createMaintenance", op.payload);
  });

  // Registro de abastecimento
  registerOfflineSyncHandler("machineHours.createFuel", async (op: QueuedOperation) => {
    await callTRPC("machineHours.createFuel", op.payload);
  });

  // Registro de óleo
  registerOfflineSyncHandler("machineHours.createOil", async (op: QueuedOperation) => {
    await callTRPC("machineHours.createOil", op.payload);
  });

  // Registro de óleo com estoque
  registerOfflineSyncHandler("machineHours.createOilWithStock", async (op: QueuedOperation) => {
    await callTRPC("machineHours.createOilWithStock", op.payload);
  });
}
