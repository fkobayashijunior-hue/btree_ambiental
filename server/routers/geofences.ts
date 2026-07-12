import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { geofences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

export const geofencesRouter = router({
  // Listar todas as porteiras virtuais
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(geofences).orderBy(geofences.name);
    return rows;
  }),

  // Buscar uma porteira por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(geofences).where(eq(geofences.id, input.id));
      return rows[0] ?? null;
    }),

  // Criar nova porteira virtual
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        lat: z.string(),
        lng: z.string(),
        radiusMeters: z.number().min(50).max(50000).default(300),
        traccarDeviceId: z.number().optional(),
        traccarGeofenceId: z.number().optional(),
        defaultOriginName: z.string().default("SIMFLOR"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [result] = await db.insert(geofences).values({
        name: input.name,
        lat: input.lat,
        lng: input.lng,
        radiusMeters: input.radiusMeters,
        isActive: 1,
        traccarDeviceId: input.traccarDeviceId ?? null,
        traccarGeofenceId: input.traccarGeofenceId ?? null,
        defaultOriginName: input.defaultOriginName,
        notes: input.notes ?? null,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  // Atualizar porteira virtual
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        radiusMeters: z.number().min(50).max(50000).optional(),
        traccarDeviceId: z.number().nullable().optional(),
        traccarGeofenceId: z.number().nullable().optional(),
        defaultOriginName: z.string().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.lat !== undefined) updateData.lat = fields.lat;
      if (fields.lng !== undefined) updateData.lng = fields.lng;
      if (fields.radiusMeters !== undefined) updateData.radiusMeters = fields.radiusMeters;
      if (fields.traccarDeviceId !== undefined) updateData.traccarDeviceId = fields.traccarDeviceId;
      if (fields.traccarGeofenceId !== undefined) updateData.traccarGeofenceId = fields.traccarGeofenceId;
      if (fields.defaultOriginName !== undefined) updateData.defaultOriginName = fields.defaultOriginName;
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      await db.update(geofences).set(updateData as any).where(eq(geofences.id, id));
      return { success: true };
    }),

  // Ativar/desativar porteira
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(geofences)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(geofences.id, input.id));
      return { success: true };
    }),

  // Excluir porteira
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(geofences).where(eq(geofences.id, input.id));
      return { success: true };
    }),
});
