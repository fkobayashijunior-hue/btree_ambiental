import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  collaborators,
  cargoLoads,
  vehicleRecords,
  collaboratorAttendance,
  equipment,
  clients,
  parts,
  purchaseOrders,
} from "../../drizzle/schema";
import { sql, gte, and } from "drizzle-orm";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const db = await getDb();
    if (!db) throw new Error("Banco indisponível");

    // Contagem de colaboradores ativos
    const [{ count: totalCollaborators }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collaborators);

    // Contagem de clientes
    const [{ count: totalClients }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients);

    // Total de cargas no mês atual
    const [{ count: cargoThisMonth }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cargoLoads)
      .where(gte(cargoLoads.createdAt, startOfMonth));

    // Volume total de cargas no mês (m³)
    const [{ total: cargoVolumeThisMonth }] = await db
      .select({ total: sql<number>`coalesce(sum(volume_m3), 0)` })
      .from(cargoLoads)
      .where(gte(cargoLoads.createdAt, startOfMonth));

    // Abastecimentos no mês
    const [{ count: fuelThisMonth }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehicleRecords)
      .where(
        and(
          gte(vehicleRecords.createdAt, startOfMonth),
          sql`record_type = 'abastecimento'`
        )
      );

    // Custo total de abastecimento no mês
    const [{ total: fuelCostThisMonth }] = await db
      .select({ total: sql<number>`coalesce(sum(fuel_cost), 0)` })
      .from(vehicleRecords)
      .where(
        and(
          gte(vehicleRecords.createdAt, startOfMonth),
          sql`record_type = 'abastecimento'`
        )
      );

    // Presenças registradas hoje
    const [{ count: attendanceToday }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collaboratorAttendance)
      .where(gte(collaboratorAttendance.date, startOfDay));

    // Presenças no mês
    const [{ count: attendanceThisMonth }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collaboratorAttendance)
      .where(gte(collaboratorAttendance.date, startOfMonth));

    // Total a pagar em presenças pendentes no mês
    const [{ total: pendingPaymentThisMonth }] = await db
      .select({ total: sql<number>`coalesce(sum(cast(daily_value as decimal(10,2))), 0)` })
      .from(collaboratorAttendance)
      .where(
        and(
          gte(collaboratorAttendance.date, startOfMonth),
          sql`payment_status_ca = 'pendente'`
        )
      );

    // Total de equipamentos
    const [{ count: totalEquipment }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(equipment);

    // Peças com estoque baixo (< 5)
    const [{ count: lowStockParts }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(parts)
      .where(sql`stock_quantity < 5`);

    // Últimas 5 cargas
    const recentCargos = await db
      .select({
        id: cargoLoads.id,
        vehiclePlate: cargoLoads.vehiclePlate,
        destination: cargoLoads.destination,
        volumeM3: cargoLoads.volumeM3,
        createdAt: cargoLoads.createdAt,
        status: cargoLoads.status,
      })
      .from(cargoLoads)
      .orderBy(sql`created_at desc`)
      .limit(5);

    // Últimas 5 presenças
    const recentAttendance = await db
      .select({
        id: collaboratorAttendance.id,
        collaboratorId: collaboratorAttendance.collaboratorId,
        date: collaboratorAttendance.date,
        dailyValue: collaboratorAttendance.dailyValue,
        paymentStatus: collaboratorAttendance.paymentStatus,
        activity: collaboratorAttendance.activity,
      })
      .from(collaboratorAttendance)
      .orderBy(sql`created_at desc`)
      .limit(5);

    // Pedidos de compra pendentes
    const [{ count: pendingOrders }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(sql`status = 'pending'`);

    return {
      totalCollaborators: Number(totalCollaborators),
      totalClients: Number(totalClients),
      cargoThisMonth: Number(cargoThisMonth),
      cargoVolumeThisMonth: Number(cargoVolumeThisMonth),
      fuelThisMonth: Number(fuelThisMonth),
      fuelCostThisMonth: Number(fuelCostThisMonth),
      attendanceToday: Number(attendanceToday),
      attendanceThisMonth: Number(attendanceThisMonth),
      pendingPaymentThisMonth: Number(pendingPaymentThisMonth),
      totalEquipment: Number(totalEquipment),
      lowStockParts: Number(lowStockParts),
      pendingOrders: Number(pendingOrders),
      recentCargos,
      recentAttendance,
      month: now.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
    };
  }),
});
