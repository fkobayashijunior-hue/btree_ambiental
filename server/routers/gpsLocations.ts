import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gpsLocations, userPermissions } from "../../drizzle/schema";

export const gpsLocationsRouter = router({
  // ── Listar todos os locais ativos ────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select()
      .from(gpsLocations)
      .orderBy(desc(gpsLocations.createdAt));
    // Filtrar por cliente se encarregado
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        const allowedIds = JSON.parse(perm.allowedClientIds) as number[];
        if (allowedIds.length > 0) {
          return rows.filter(r => r.clientId && allowedIds.includes(r.clientId));
        }
      }
    }
    return rows;
  }),

  // ── Listar apenas ativos (para uso na detecção de presença) ──────────────
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select()
      .from(gpsLocations)
      .where(eq(gpsLocations.isActive, 1))
      .orderBy(gpsLocations.name);
    // Filtrar por cliente se encarregado
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        const allowedIds = JSON.parse(perm.allowedClientIds) as number[];
        if (allowedIds.length > 0) {
          return rows.filter(r => r.clientId && allowedIds.includes(r.clientId));
        }
      }
    }
    return rows;
  }),

  // ── Criar local ──────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      latitude: z.string().min(1, "Latitude é obrigatória"),
      longitude: z.string().min(1, "Longitude é obrigatória"),
      radiusMeters: z.number().min(100).max(50000).default(2000),
      clientId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(gpsLocations).values({
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        clientId: input.clientId || null,
        notes: input.notes || null,
        isActive: 1,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
      });
      return { success: true };
    }),

  // ── Atualizar local ──────────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      radiusMeters: z.number().min(100).max(50000).optional(),
      clientId: z.number().nullable().optional(),
      notes: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...rest } = input;
      const updateData: any = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.latitude !== undefined) updateData.latitude = rest.latitude;
      if (rest.longitude !== undefined) updateData.longitude = rest.longitude;
      if (rest.radiusMeters !== undefined) updateData.radiusMeters = rest.radiusMeters;
      if (rest.clientId !== undefined) updateData.clientId = rest.clientId;
      if (rest.notes !== undefined) updateData.notes = rest.notes;
      if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
      await db.update(gpsLocations).set(updateData).where(eq(gpsLocations.id, id));
      return { success: true };
    }),

  // ── Excluir local ────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(gpsLocations).where(eq(gpsLocations.id, input.id));
      return { success: true };
    }),
});
