import { z } from "zod";import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sectors, equipment, equipmentTypes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

export const sectorsRouter = router({
  // --- SETORES ---
  listSectors: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error("Database not available");
    return db.select().from(sectors).orderBy(sectors.name);
  }),

  createSector: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(sectors).values({
        name: input.name,
        description: input.description,
        color: input.color || "#16a34a",
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  updateSector: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      active: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(sectors).set(data).where(eq(sectors.id, id));
      return { success: true };
    }),

  deleteSector: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(sectors).where(eq(sectors.id, input.id));
      return { success: true };
    }),

  // --- TIPOS DE EQUIPAMENTO ---
  listEquipmentTypes: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error("Database not available");
    return db.select().from(equipmentTypes).orderBy(equipmentTypes.name);
  }),

  createEquipmentType: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(equipmentTypes).values({ name: input.name });
      return { id: (result as any).insertId };
    }),

  // --- EQUIPAMENTOS ---
  listEquipment: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      typeId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select({
          id: equipment.id,
          name: equipment.name,
          brand: equipment.brand,
          model: equipment.model,
          year: equipment.year,
          serialNumber: equipment.serialNumber,
          imageUrl: equipment.imageUrl,
          status: equipment.status,
          typeId: equipment.typeId,
          sectorId: equipment.sectorId,
          typeName: equipmentTypes.name,
          createdAt: equipment.createdAt,
        })
        .from(equipment)
        .leftJoin(equipmentTypes, eq(equipment.typeId, equipmentTypes.id))
        .orderBy(equipment.name);

      return rows.filter((r: typeof rows[number]) => {
        if (input.typeId && r.typeId !== input.typeId) return false;
        if (input.status && r.status !== input.status) return false;
        if (input.search) {
          const s = input.search.toLowerCase();
          return r.name.toLowerCase().includes(s) ||
            (r.brand || "").toLowerCase().includes(s) ||
            (r.model || "").toLowerCase().includes(s) ||
            (r.serialNumber || "").toLowerCase().includes(s);
        }
        return true;
      });
    }),

  createEquipment: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      typeId: z.number(),
      sectorId: z.number().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      serialNumber: z.string().optional(),
      imageUrl: z.string().optional(),
      status: z.enum(["ativo", "manutencao", "inativo"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let imageUrl = input.imageUrl;
      // Se for base64, fazer upload para S3
      if (imageUrl && imageUrl.startsWith("data:")) {
        const result = await cloudinaryUpload(imageUrl, "btree/equipment");
        imageUrl = result.url;
      }
      const [result] = await db.insert(equipment).values({
        ...input,
        imageUrl,
        status: input.status || "ativo",
      });
      return { id: (result as any).insertId };
    }),

  updateEquipment: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      typeId: z.number().optional(),
      sectorId: z.number().optional().nullable(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      serialNumber: z.string().optional(),
      imageUrl: z.string().optional(),
      status: z.enum(["ativo", "manutencao", "inativo"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      // Se for base64, fazer upload para S3
      if (data.imageUrl && data.imageUrl.startsWith("data:")) {
        const uploaded = await cloudinaryUpload(data.imageUrl, "btree/equipment");
        data.imageUrl = uploaded.url;
      }
      await db.update(equipment).set(data).where(eq(equipment.id, id));
      return { success: true };
    }),

  deleteEquipment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(equipment).where(eq(equipment.id, input.id));
      return { success: true };
    }),
});
