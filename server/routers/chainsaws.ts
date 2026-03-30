import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  chainsaws, fuelContainers, fuelContainerEvents,
  chainsawChainStock, chainsawChainEvents,
  chainsawParts, chainsawPartMovements,
  chainsawServiceOrders, chainsawServiceParts,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ============================================================
// MOTOSSERRAS — CRUD
// ============================================================
const chainsawsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsaws).orderBy(chainsaws.name);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      brand: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      chainType: z.string().default("30"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(chainsaws).values({
        name: input.name,
        brand: input.brand,
        model: input.model,
        serialNumber: input.serialNumber,
        chainType: input.chainType,
        notes: input.notes,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      chainType: z.string().optional(),
      status: z.enum(["ativa", "oficina", "inativa"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await db.update(chainsaws).set(data).where(eq(chainsaws.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(chainsaws).where(eq(chainsaws.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// GALÕES DE COMBUSTÍVEL
// ============================================================
const fuelRouter = router({
  listContainers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(fuelContainers).where(eq(fuelContainers.isActive, 1)).orderBy(fuelContainers.name);
  }),

  createContainer: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().default("vermelho"),
      type: z.enum(["puro", "mistura"]),
      capacityLiters: z.string().default("20"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(fuelContainers).values({
        name: input.name,
        color: input.color,
        type: input.type,
        capacityLiters: input.capacityLiters,
        currentVolumeLiters: "0",
        notes: input.notes,
      });
      return { success: true };
    }),

  // Abastecer galão (compra de combustível)
  supplyContainer: protectedProcedure
    .input(z.object({
      containerId: z.number(),
      volumeLiters: z.string(),
      costPerLiter: z.string().optional(),
      totalCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [container] = await db.select().from(fuelContainers).where(eq(fuelContainers.id, input.containerId));
      if (!container) throw new Error("Galão não encontrado");

      const newVolume = (parseFloat(container.currentVolumeLiters || "0") + parseFloat(input.volumeLiters)).toFixed(2);
      await db.update(fuelContainers)
        .set({ currentVolumeLiters: newVolume })
        .where(eq(fuelContainers.id, input.containerId));

      // Se for galão de mistura, calcula óleo 2T (400ml para 20L = 20ml/L)
      let oil2tMl: string | undefined;
      if (container.type === "mistura") {
        const oil2t = (parseFloat(input.volumeLiters) * 20).toFixed(0);
        oil2tMl = oil2t;
        // Baixa óleo 2T do estoque de peças motosserra
        const oil2tParts = await db.select().from(chainsawParts)
          .where(and(
            eq(chainsawParts.isActive, 1),
            sql`(LOWER(${chainsawParts.name}) LIKE '%2t%' OR LOWER(${chainsawParts.name}) LIKE '%dois tempos%')`
          ))
          .limit(1);
        const oil2tPart = oil2tParts[0];
        if (oil2tPart) {
          const currentStock = parseFloat(oil2tPart.currentStock || "0");
          const usedMl = parseFloat(oil2t);
          const newStock = Math.max(0, currentStock - usedMl).toFixed(0);
          await db.update(chainsawParts).set({ currentStock: newStock }).where(eq(chainsawParts.id, oil2tPart.id));
          await db.insert(chainsawPartMovements).values({
            partId: oil2tPart.id,
            type: "saida",
            quantity: oil2t,
            reason: `Mistura galão ${container.name}`,
            registeredBy: ctx.user.id,
          });
        }
      }

      await db.insert(fuelContainerEvents).values({
        containerId: input.containerId,
        eventType: "abastecimento",
        volumeLiters: input.volumeLiters,
        costPerLiter: input.costPerLiter,
        totalCost: input.totalCost,
        oil2tMl,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      return { success: true, oil2tMl };
    }),

  // Registrar uso de combustível no campo (baixa no galão)
  useFuel: protectedProcedure
    .input(z.object({
      containerId: z.number(),
      volumeLiters: z.string(),
      chainsawId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [container] = await db.select().from(fuelContainers).where(eq(fuelContainers.id, input.containerId));
      if (!container) throw new Error("Galão não encontrado");

      const currentVol = parseFloat(container.currentVolumeLiters || "0");
      const usedVol = parseFloat(input.volumeLiters);
      if (usedVol > currentVol) throw new Error("Volume insuficiente no galão");

      const newVolume = (currentVol - usedVol).toFixed(2);
      await db.update(fuelContainers)
        .set({ currentVolumeLiters: newVolume })
        .where(eq(fuelContainers.id, input.containerId));

      await db.insert(fuelContainerEvents).values({
        containerId: input.containerId,
        eventType: "uso",
        volumeLiters: input.volumeLiters,
        chainsawId: input.chainsawId,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      return { success: true };
    }),

  // Transferir combustível entre galões (vermelho → verde)
  transferFuel: protectedProcedure
    .input(z.object({
      sourceContainerId: z.number(),
      targetContainerId: z.number(),
      volumeLiters: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [source] = await db.select().from(fuelContainers).where(eq(fuelContainers.id, input.sourceContainerId));
      const [target] = await db.select().from(fuelContainers).where(eq(fuelContainers.id, input.targetContainerId));
      if (!source || !target) throw new Error("Galão não encontrado");

      const sourceVol = parseFloat(source.currentVolumeLiters || "0");
      const transferVol = parseFloat(input.volumeLiters);
      if (transferVol > sourceVol) throw new Error("Volume insuficiente no galão de origem");

      const targetVol = parseFloat(target.currentVolumeLiters || "0");

      await db.update(fuelContainers).set({ currentVolumeLiters: (sourceVol - transferVol).toFixed(2) }).where(eq(fuelContainers.id, input.sourceContainerId));
      await db.update(fuelContainers).set({ currentVolumeLiters: (targetVol + transferVol).toFixed(2) }).where(eq(fuelContainers.id, input.targetContainerId));

      await db.insert(fuelContainerEvents).values({
        containerId: input.targetContainerId,
        eventType: "transferencia",
        volumeLiters: input.volumeLiters,
        sourceContainerId: input.sourceContainerId,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      return { success: true };
    }),

  listEvents: protectedProcedure
    .input(z.object({ containerId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.containerId) {
        return db.select().from(fuelContainerEvents)
          .where(eq(fuelContainerEvents.containerId, input.containerId))
          .orderBy(desc(fuelContainerEvents.eventDate))
          .limit(50);
      }
      return db.select().from(fuelContainerEvents)
        .orderBy(desc(fuelContainerEvents.eventDate))
        .limit(100);
    }),
});

// ============================================================
// CORRENTES
// ============================================================
const chainsChainRouter = router({
  listStock: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsawChainStock).orderBy(chainsawChainStock.chainType);
  }),

  upsertStock: protectedProcedure
    .input(z.object({
      chainType: z.string(),
      sharpenedInBox: z.number().optional(),
      inField: z.number().optional(),
      inWorkshop: z.number().optional(),
      totalStock: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const existing = await db.select().from(chainsawChainStock)
        .where(eq(chainsawChainStock.chainType, input.chainType));

      if (existing.length > 0) {
        const e = existing[0];
        await db.update(chainsawChainStock)
          .set({
            sharpenedInBox: input.sharpenedInBox ?? e.sharpenedInBox,
            inField: input.inField ?? e.inField,
            inWorkshop: input.inWorkshop ?? e.inWorkshop,
            totalStock: input.totalStock ?? e.totalStock,
          })
          .where(eq(chainsawChainStock.chainType, input.chainType));
      } else {
        await db.insert(chainsawChainStock).values({
          chainType: input.chainType,
          sharpenedInBox: input.sharpenedInBox ?? 0,
          inField: input.inField ?? 0,
          inWorkshop: input.inWorkshop ?? 0,
          totalStock: input.totalStock ?? 0,
        });
      }
      return { success: true };
    }),

  registerEvent: protectedProcedure
    .input(z.object({
      chainType: z.string(),
      eventType: z.enum(["envio_campo", "retorno_oficina", "afiacao_concluida", "baixa_estoque", "entrada_estoque"]),
      quantity: z.number().min(1),
      chainsawId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const stockRows = await db.select().from(chainsawChainStock)
        .where(eq(chainsawChainStock.chainType, input.chainType));

      if (stockRows.length === 0) throw new Error(`Tipo de corrente '${input.chainType}' não encontrado. Inicialize o estoque primeiro.`);
      const stock = stockRows[0];

      let updates: { sharpenedInBox?: number; inField?: number; inWorkshop?: number; totalStock?: number } = {};
      switch (input.eventType) {
        case "envio_campo":
          if (stock.sharpenedInBox < input.quantity) throw new Error("Correntes afiadas insuficientes na caixa");
          updates = { sharpenedInBox: stock.sharpenedInBox - input.quantity, inField: stock.inField + input.quantity };
          break;
        case "retorno_oficina":
          if (stock.inField < input.quantity) throw new Error("Quantidade em campo insuficiente");
          updates = { inField: stock.inField - input.quantity, inWorkshop: stock.inWorkshop + input.quantity };
          break;
        case "afiacao_concluida":
          if (stock.inWorkshop < input.quantity) throw new Error("Quantidade na oficina insuficiente");
          updates = { inWorkshop: stock.inWorkshop - input.quantity, sharpenedInBox: stock.sharpenedInBox + input.quantity };
          break;
        case "baixa_estoque":
          updates = { totalStock: Math.max(0, stock.totalStock - input.quantity) };
          break;
        case "entrada_estoque":
          updates = {
            totalStock: stock.totalStock + input.quantity,
            sharpenedInBox: stock.sharpenedInBox + input.quantity,
          };
          break;
      }

      await db.update(chainsawChainStock).set(updates).where(eq(chainsawChainStock.chainType, input.chainType));

      await db.insert(chainsawChainEvents).values({
        chainType: input.chainType,
        eventType: input.eventType,
        quantity: input.quantity,
        chainsawId: input.chainsawId,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      return { success: true };
    }),

  listEvents: protectedProcedure
    .input(z.object({ chainType: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.chainType) {
        return db.select().from(chainsawChainEvents)
          .where(eq(chainsawChainEvents.chainType, input.chainType))
          .orderBy(desc(chainsawChainEvents.eventDate))
          .limit(50);
      }
      return db.select().from(chainsawChainEvents)
        .orderBy(desc(chainsawChainEvents.eventDate))
        .limit(100);
    }),
});

// ============================================================
// PEÇAS E ESTOQUE
// ============================================================
const chainsawPartsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsawParts)
      .where(eq(chainsawParts.isActive, 1))
      .orderBy(chainsawParts.category, chainsawParts.name);
  }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().optional(),
      name: z.string().min(1),
      category: z.string().optional(),
      unit: z.string().default("un"),
      currentStock: z.string().default("0"),
      minStock: z.string().default("0"),
      unitCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(chainsawParts).values({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      currentStock: z.string().optional(),
      minStock: z.string().optional(),
      unitCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await db.update(chainsawParts).set(data).where(eq(chainsawParts.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(chainsawParts).set({ isActive: 0 }).where(eq(chainsawParts.id, input.id));
      return { success: true };
    }),

  stockEntry: protectedProcedure
    .input(z.object({
      partId: z.number(),
      quantity: z.string(),
      unitCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const parts = await db.select().from(chainsawParts).where(eq(chainsawParts.id, input.partId));
      if (parts.length === 0) throw new Error("Peça não encontrada");
      const part = parts[0];

      const newStock = (parseFloat(part.currentStock || "0") + parseFloat(input.quantity)).toFixed(2);
      await db.update(chainsawParts).set({ currentStock: newStock }).where(eq(chainsawParts.id, input.partId));

      await db.insert(chainsawPartMovements).values({
        partId: input.partId,
        type: "entrada",
        quantity: input.quantity,
        reason: "Compra/entrada manual",
        unitCost: input.unitCost,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      return { success: true };
    }),

  listMovements: protectedProcedure
    .input(z.object({ partId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.partId) {
        return db.select().from(chainsawPartMovements)
          .where(eq(chainsawPartMovements.partId, input.partId))
          .orderBy(desc(chainsawPartMovements.createdAt))
          .limit(50);
      }
      return db.select().from(chainsawPartMovements)
        .orderBy(desc(chainsawPartMovements.createdAt))
        .limit(100);
    }),
});

// ============================================================
// ORDENS DE SERVIÇO
// ============================================================
const chainsawOSRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["aberta", "em_andamento", "concluida", "cancelada", "todas"]).default("todas"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: chainsawServiceOrders.id,
        chainsawId: chainsawServiceOrders.chainsawId,
        problemType: chainsawServiceOrders.problemType,
        problemDescription: chainsawServiceOrders.problemDescription,
        priority: chainsawServiceOrders.priority,
        status: chainsawServiceOrders.status,
        mechanicId: chainsawServiceOrders.mechanicId,
        serviceDescription: chainsawServiceOrders.serviceDescription,
        completedAt: chainsawServiceOrders.completedAt,
        openedBy: chainsawServiceOrders.openedBy,
        openedAt: chainsawServiceOrders.openedAt,
        chainsawName: chainsaws.name,
      })
        .from(chainsawServiceOrders)
        .leftJoin(chainsaws, eq(chainsawServiceOrders.chainsawId, chainsaws.id))
        .where(
          input.status === "todas"
            ? undefined
            : eq(chainsawServiceOrders.status, input.status as "aberta" | "em_andamento" | "concluida" | "cancelada")
        )
        .orderBy(desc(chainsawServiceOrders.openedAt));
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const rows = await db.select().from(chainsawServiceOrders)
        .where(eq(chainsawServiceOrders.id, input.id));
      if (rows.length === 0) throw new Error("OS não encontrada");

      const parts = await db.select().from(chainsawServiceParts)
        .where(eq(chainsawServiceParts.serviceOrderId, input.id));

      return { ...rows[0], parts };
    }),

  open: protectedProcedure
    .input(z.object({
      chainsawId: z.number(),
      problemType: z.enum(["motor_falhando", "nao_liga", "superaquecimento", "vazamento", "corrente_problema", "sabre_problema", "manutencao_preventiva", "outro"]),
      problemDescription: z.string().optional(),
      priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db.update(chainsaws).set({ status: "oficina" }).where(eq(chainsaws.id, input.chainsawId));

      await db.insert(chainsawServiceOrders).values({
        chainsawId: input.chainsawId,
        problemType: input.problemType,
        problemDescription: input.problemDescription,
        priority: input.priority,
        status: "aberta",
        openedBy: ctx.user.id,
      });

      return { success: true };
    }),

  startService: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(chainsawServiceOrders)
        .set({ status: "em_andamento", mechanicId: ctx.user.id })
        .where(eq(chainsawServiceOrders.id, input.id));
      return { success: true };
    }),

  complete: protectedProcedure
    .input(z.object({
      id: z.number(),
      serviceDescription: z.string().min(1),
      parts: z.array(z.object({
        partId: z.number().optional(),
        partName: z.string(),
        quantity: z.string(),
        unit: z.string().default("un"),
        unitCost: z.string().optional(),
        fromStock: z.number().default(1),
      })).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const osRows = await db.select().from(chainsawServiceOrders).where(eq(chainsawServiceOrders.id, input.id));
      if (osRows.length === 0) throw new Error("OS não encontrada");
      const os = osRows[0];

      for (const part of input.parts) {
        await db.insert(chainsawServiceParts).values({
          serviceOrderId: input.id,
          partId: part.partId,
          partName: part.partName,
          quantity: part.quantity,
          unit: part.unit,
          unitCost: part.unitCost,
          fromStock: part.fromStock,
        });

        if (part.fromStock === 1 && part.partId) {
          const pRows = await db.select().from(chainsawParts).where(eq(chainsawParts.id, part.partId));
          if (pRows.length > 0) {
            const p = pRows[0];
            const newStock = Math.max(0, parseFloat(p.currentStock || "0") - parseFloat(part.quantity)).toFixed(2);
            await db.update(chainsawParts).set({ currentStock: newStock }).where(eq(chainsawParts.id, part.partId));
            await db.insert(chainsawPartMovements).values({
              partId: part.partId,
              type: "saida",
              quantity: part.quantity,
              reason: `OS #${input.id}`,
              serviceOrderId: input.id,
              unitCost: part.unitCost,
              registeredBy: ctx.user.id,
            });
          }
        }
      }

      await db.update(chainsawServiceOrders)
        .set({
          status: "concluida",
          serviceDescription: input.serviceDescription,
          completedAt: new Date(),
          mechanicId: ctx.user.id,
        })
        .where(eq(chainsawServiceOrders.id, input.id));

      await db.update(chainsaws).set({ status: "ativa" }).where(eq(chainsaws.id, os.chainsawId));

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const osRows = await db.select().from(chainsawServiceOrders).where(eq(chainsawServiceOrders.id, input.id));
      if (osRows.length === 0) throw new Error("OS não encontrada");
      const os = osRows[0];
      await db.update(chainsawServiceOrders).set({ status: "cancelada" }).where(eq(chainsawServiceOrders.id, input.id));
      await db.update(chainsaws).set({ status: "ativa" }).where(eq(chainsaws.id, os.chainsawId));
      return { success: true };
    }),
});

// ============================================================
// ROUTER PRINCIPAL DO MÓDULO
// ============================================================
export const chainsawModuleRouter = router({
  chainsaws: chainsawsRouter,
  fuel: fuelRouter,
  chains: chainsChainRouter,
  parts: chainsawPartsRouter,
  os: chainsawOSRouter,
});
