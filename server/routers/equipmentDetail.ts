import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { equipment, equipmentPhotos, equipmentMaintenance } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

export const equipmentDetailRouter = router({
  // Buscar equipamento por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(equipment).where(eq(equipment.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Listar fotos do equipamento
  listPhotos: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(equipmentPhotos)
        .where(eq(equipmentPhotos.equipmentId, input.equipmentId))
        .orderBy(desc(equipmentPhotos.createdAt));
    }),

  // Adicionar foto ao equipamento
  addPhoto: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      photoBase64: z.string(),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/${input.equipmentId}`);
      const [ins] = await db.insert(equipmentPhotos).values({
        equipmentId: input.equipmentId,
        photoUrl: result.url,
        caption: input.caption,
        uploadedBy: ctx.user.id,
      });
      return { id: (ins as any).insertId, url: result.url };
    }),

  // Remover foto
  removePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(equipmentPhotos).where(eq(equipmentPhotos.id, input.id));
      return { success: true };
    }),

  // Listar histórico de manutenções
  listMaintenance: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(equipmentMaintenance)
        .where(eq(equipmentMaintenance.equipmentId, input.equipmentId))
        .orderBy(desc(equipmentMaintenance.performedAt));
    }),

  // Registrar manutenção
  addMaintenance: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      type: z.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
      description: z.string().min(3),
      performedBy: z.string().optional(),
      cost: z.string().optional(),
      nextMaintenanceDate: z.string().optional(), // ISO date string
      performedAt: z.string(), // ISO date string
      photoBase64: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let photosJson: string | undefined;
      if (input.photoBase64) {
        const result = await cloudinaryUpload(input.photoBase64, `btree/maintenance/${input.equipmentId}`);
        photosJson = JSON.stringify([result.url]);
      }

      const [ins] = await db.insert(equipmentMaintenance).values({
        equipmentId: input.equipmentId,
        type: input.type,
        description: input.description,
        performedBy: input.performedBy,
        cost: input.cost,
        nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate) : undefined,
        performedAt: new Date(input.performedAt),
        photosJson,
        registeredBy: ctx.user.id,
      });
      return { id: (ins as any).insertId };
    }),

  // Remover manutenção
  removeMaintenance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(equipmentMaintenance).where(eq(equipmentMaintenance.id, input.id));
      return { success: true };
    }),

  // Atualizar foto principal do equipamento
  updateMainPhoto: protectedProcedure
    .input(z.object({
      id: z.number(),
      photoBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/main`);
      await db.update(equipment).set({ imageUrl: result.url }).where(eq(equipment.id, input.id));
      return { url: result.url };
    }),
});
