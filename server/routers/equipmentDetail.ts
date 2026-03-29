import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  equipment, equipmentPhotos, equipmentMaintenance,
  maintenanceParts, maintenanceTemplates, maintenanceTemplateParts,
  partsStockMovements, parts
} from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

export const equipmentDetailRouter = router({
  // ─── Equipamento ────────────────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(equipment).where(eq(equipment.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // ─── Fotos ──────────────────────────────────────────────────────────────────
  listPhotos: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(equipmentPhotos)
        .where(eq(equipmentPhotos.equipmentId, input.equipmentId))
        .orderBy(desc(equipmentPhotos.createdAt));
    }),

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

  removePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(equipmentPhotos).where(eq(equipmentPhotos.id, input.id));
      return { success: true };
    }),

  updateMainPhoto: protectedProcedure
    .input(z.object({ id: z.number(), photoBase64: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/main`);
      await db.update(equipment).set({ imageUrl: result.url }).where(eq(equipment.id, input.id));
      return { url: result.url };
    }),

  // ─── Templates de Manutenção ────────────────────────────────────────────────
  listTemplates: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const templates = await db.select().from(maintenanceTemplates)
        .where(eq(maintenanceTemplates.active, 1))
        .orderBy(maintenanceTemplates.name);
      return templates;
    }),

  getTemplateWithParts: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db.select().from(maintenanceTemplates)
        .where(eq(maintenanceTemplates.id, input.templateId)).limit(1);
      if (!template) return null;

      const templateParts = await db.select().from(maintenanceTemplateParts)
        .where(eq(maintenanceTemplateParts.templateId, input.templateId));

      // Para cada peça do template, consultar estoque atual
      const partsWithStock = await Promise.all(templateParts.map(async (tp) => {
        if (!tp.partId) return { ...tp, stockQuantity: 0, unitCost: null, photoUrl: null };
        const [part] = await db.select().from(parts).where(eq(parts.id, tp.partId)).limit(1);
        return {
          ...tp,
          stockQuantity: part?.stockQuantity ?? 0,
          unitCost: part?.unitCost ?? null,
          photoUrl: part?.photoUrl ?? null,
          minStock: part?.minStock ?? 0,
        };
      }));

      return { ...template, parts: partsWithStock };
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      type: z.enum(["preventiva", "corretiva", "revisao"]),
      description: z.string().optional(),
      estimatedCost: z.string().optional(),
      parts: z.array(z.object({
        partId: z.number().optional(),
        partCode: z.string().optional(),
        partName: z.string(),
        quantity: z.number().min(1),
        unit: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [ins] = await db.insert(maintenanceTemplates).values({
        name: input.name,
        type: input.type,
        description: input.description,
        estimatedCost: input.estimatedCost,
        createdBy: ctx.user.id,
      });
      const templateId = (ins as any).insertId;

      if (input.parts.length > 0) {
        await db.insert(maintenanceTemplateParts).values(
          input.parts.map(p => ({ templateId, ...p }))
        );
      }

      return { id: templateId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(maintenanceTemplates).where(eq(maintenanceTemplates.id, input.id));
      return { success: true };
    }),

  // ─── Busca de Peça por Código ────────────────────────────────────────────────
  searchPartByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db.select().from(parts)
        .where(and(eq(parts.active, 1)));
      const code = input.code.toLowerCase();
      return results.filter(p =>
        p.code?.toLowerCase().includes(code) ||
        p.name.toLowerCase().includes(code)
      ).slice(0, 10);
    }),

  // ─── Manutenções ────────────────────────────────────────────────────────────
  listMaintenance: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const maintenances = await db.select().from(equipmentMaintenance)
        .where(eq(equipmentMaintenance.equipmentId, input.equipmentId))
        .orderBy(desc(equipmentMaintenance.performedAt));

      // Para cada manutenção, buscar as peças utilizadas
      const result = await Promise.all(maintenances.map(async (m) => {
        const usedParts = await db.select().from(maintenanceParts)
          .where(eq(maintenanceParts.maintenanceId, m.id));
        return { ...m, parts: usedParts };
      }));

      return result;
    }),

  addMaintenance: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      type: z.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
      description: z.string().min(3),
      performedBy: z.string().optional(),
      cost: z.string().optional(),
      nextMaintenanceDate: z.string().optional(),
      performedAt: z.string(),
      photoBase64: z.string().optional(),
      templateId: z.number().optional(),
      // Peças utilizadas
      parts: z.array(z.object({
        partId: z.number().optional(),
        partCode: z.string().optional(),
        partName: z.string(),
        partPhotoUrl: z.string().optional(),
        quantity: z.number().min(1),
        unit: z.string().optional(),
        unitCost: z.string().optional(),
        fromStock: z.number().optional(), // 1 = baixou estoque, 0 = avulso
      })).optional(),
      // Serviços externos
      laborCost: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let photosJson: string | undefined;
      if (input.photoBase64) {
        const result = await cloudinaryUpload(input.photoBase64, `btree/maintenance/${input.equipmentId}`);
        photosJson = JSON.stringify([result.url]);
      }

      // Calcular custo total (peças + mão de obra)
      let totalParts = 0;
      const usedParts = input.parts || [];
      for (const p of usedParts) {
        if (p.unitCost) {
          totalParts += parseFloat(p.unitCost.replace(",", ".")) * p.quantity;
        }
      }
      const laborCostNum = input.laborCost ? parseFloat(input.laborCost.replace(",", ".")) : 0;
      const totalCost = (totalParts + laborCostNum).toFixed(2);

      const [ins] = await db.insert(equipmentMaintenance).values({
        equipmentId: input.equipmentId,
        type: input.type,
        description: input.description,
        performedBy: input.performedBy,
        cost: totalCost,
        nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate) : undefined,
        performedAt: new Date(input.performedAt),
        photosJson,
        registeredBy: ctx.user.id,
      });
      const maintenanceId = (ins as any).insertId;

      // Inserir peças utilizadas e baixar estoque
      if (usedParts.length > 0) {
        for (const p of usedParts) {
          const totalCostPart = p.unitCost
            ? (parseFloat(p.unitCost.replace(",", ".")) * p.quantity).toFixed(2)
            : undefined;

          await db.insert(maintenanceParts).values({
            maintenanceId,
            partId: p.partId,
            partCode: p.partCode,
            partName: p.partName,
            partPhotoUrl: p.partPhotoUrl,
            quantity: p.quantity,
            unit: p.unit || "un",
            unitCost: p.unitCost,
            totalCost: totalCostPart,
            fromStock: p.fromStock ?? 1,
          });

          // Baixar estoque se a peça existir no cadastro e fromStock = 1
          if (p.partId && (p.fromStock ?? 1) === 1) {
            const [part] = await db.select().from(parts).where(eq(parts.id, p.partId)).limit(1);
            if (part) {
              const newQty = Math.max(0, (part.stockQuantity ?? 0) - p.quantity);
              await db.update(parts).set({ stockQuantity: newQty }).where(eq(parts.id, p.partId));

              // Registrar movimentação de estoque
              await db.insert(partsStockMovements).values({
                partId: p.partId,
                type: "saida",
                quantity: p.quantity,
                reason: `Uso em manutenção #${maintenanceId} - ${input.equipmentId}`,
                referenceId: maintenanceId,
                referenceType: "maintenance",
                unitCost: p.unitCost,
                registeredBy: ctx.user.id,
              });
            }
          }
        }
      }

      return { id: maintenanceId };
    }),

  removeMaintenance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(equipmentMaintenance).where(eq(equipmentMaintenance.id, input.id));
      return { success: true };
    }),

  // ─── Estoque de Peças ────────────────────────────────────────────────────────
  addStockEntry: protectedProcedure
    .input(z.object({
      partId: z.number(),
      quantity: z.number().min(1),
      unitCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [part] = await db.select().from(parts).where(eq(parts.id, input.partId)).limit(1);
      if (!part) throw new Error("Peça não encontrada");

      const newQty = (part.stockQuantity ?? 0) + input.quantity;
      await db.update(parts).set({ stockQuantity: newQty }).where(eq(parts.id, input.partId));

      await db.insert(partsStockMovements).values({
        partId: input.partId,
        type: "entrada",
        quantity: input.quantity,
        reason: "Entrada de estoque (compra)",
        unitCost: input.unitCost,
        notes: input.notes,
        registeredBy: ctx.user.id,
      });

      return { success: true, newStock: newQty };
    }),

  listStockMovements: protectedProcedure
    .input(z.object({ partId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(partsStockMovements)
        .where(eq(partsStockMovements.partId, input.partId))
        .orderBy(desc(partsStockMovements.createdAt))
        .limit(50);
    }),
});
