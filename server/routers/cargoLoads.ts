import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  cargoLoads, cargoDestinations, clients, equipment, collaborators, users
} from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

export const cargoLoadsRouter = router({
  // ===== DESTINOS =====
  listDestinations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select().from(cargoDestinations).where(eq(cargoDestinations.active, 1)).orderBy(cargoDestinations.name);
  }),

  createDestination: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      notes: z.string().optional(),
      clientId: z.number().optional(), // cliente vinculado ao destino
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const result = await db.insert(cargoDestinations).values({ ...input, createdBy: ctx.user.id });
      return { success: true, id: (result as { insertId?: number }).insertId };
    }),

  updateDestination: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      notes: z.string().optional(),
      clientId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...rest } = input;
      await db.update(cargoDestinations).set(rest as Record<string, unknown>).where(eq(cargoDestinations.id, id));
      return { success: true };
    }),

  deleteDestination: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(cargoDestinations).set({ active: 0 }).where(eq(cargoDestinations.id, input.id));
      return { success: true };
    }),

  // ===== CARGAS =====
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      clientId: z.number().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const results = await db
        .select({
          id: cargoLoads.id,
          date: cargoLoads.date,
          vehicleId: cargoLoads.vehicleId,
          vehiclePlate: cargoLoads.vehiclePlate,
          driverCollaboratorId: cargoLoads.driverCollaboratorId,
          driverName: cargoLoads.driverName,
          heightM: cargoLoads.heightM,
          widthM: cargoLoads.widthM,
          lengthM: cargoLoads.lengthM,
          volumeM3: cargoLoads.volumeM3,
          woodType: cargoLoads.woodType,
          destination: cargoLoads.destination,
          destinationId: cargoLoads.destinationId,
          weightKg: cargoLoads.weightKg,
          invoiceNumber: cargoLoads.invoiceNumber,
          clientId: cargoLoads.clientId,
          clientName: cargoLoads.clientName,
          photosJson: cargoLoads.photosJson,
          notes: cargoLoads.notes,
          status: cargoLoads.status,
          trackingStatus: cargoLoads.trackingStatus,
          trackingUpdatedAt: cargoLoads.trackingUpdatedAt,
          trackingNotes: cargoLoads.trackingNotes,
          weightOutPhotoUrl: cargoLoads.weightOutPhotoUrl,
          weightInPhotoUrl: cargoLoads.weightInPhotoUrl,
          registeredBy: cargoLoads.registeredBy,
          createdAt: cargoLoads.createdAt,
          updatedAt: cargoLoads.updatedAt,
          // Joins
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
        })
        .from(cargoLoads)
        .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .leftJoin(equipment, eq(cargoLoads.vehicleId, equipment.id))
        .orderBy(desc(cargoLoads.createdAt));

      let filtered = results;
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.driverName?.toLowerCase().includes(s) ||
          r.clientName?.toLowerCase().includes(s) ||
          r.clientNameJoined?.toLowerCase().includes(s) ||
          r.destination?.toLowerCase().includes(s) ||
          r.destinationNameJoined?.toLowerCase().includes(s) ||
          r.invoiceNumber?.toLowerCase().includes(s) ||
          r.vehiclePlate?.toLowerCase().includes(s) ||
          r.vehiclePlateJoined?.toLowerCase().includes(s)
        );
      }
      if (input?.clientId) filtered = filtered.filter(r => r.clientId === input.clientId);
      if (input?.status) filtered = filtered.filter(r => r.status === input.status);

      return filtered.map(r => ({
        ...r,
        clientName: r.clientNameJoined || r.clientName,
        destination: r.destinationNameJoined || r.destination,
        vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
        vehicleName: r.vehicleNameJoined,
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const result = await db
        .select({
          id: cargoLoads.id,
          date: cargoLoads.date,
          vehicleId: cargoLoads.vehicleId,
          vehiclePlate: cargoLoads.vehiclePlate,
          driverCollaboratorId: cargoLoads.driverCollaboratorId,
          driverName: cargoLoads.driverName,
          heightM: cargoLoads.heightM,
          widthM: cargoLoads.widthM,
          lengthM: cargoLoads.lengthM,
          volumeM3: cargoLoads.volumeM3,
          woodType: cargoLoads.woodType,
          destination: cargoLoads.destination,
          destinationId: cargoLoads.destinationId,
          weightKg: cargoLoads.weightKg,
          invoiceNumber: cargoLoads.invoiceNumber,
          clientId: cargoLoads.clientId,
          clientName: cargoLoads.clientName,
          photosJson: cargoLoads.photosJson,
          notes: cargoLoads.notes,
          status: cargoLoads.status,
          trackingStatus: cargoLoads.trackingStatus,
          trackingUpdatedAt: cargoLoads.trackingUpdatedAt,
          trackingNotes: cargoLoads.trackingNotes,
          weightOutPhotoUrl: cargoLoads.weightOutPhotoUrl,
          weightInPhotoUrl: cargoLoads.weightInPhotoUrl,
          registeredBy: cargoLoads.registeredBy,
          createdAt: cargoLoads.createdAt,
          updatedAt: cargoLoads.updatedAt,
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
        })
        .from(cargoLoads)
        .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .leftJoin(equipment, eq(cargoLoads.vehicleId, equipment.id))
        .where(eq(cargoLoads.id, input.id))
        .limit(1);
      if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });
      const r = result[0];
      return {
        ...r,
        clientName: r.clientNameJoined || r.clientName,
        destination: r.destinationNameJoined || r.destination,
        vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
        vehicleName: r.vehicleNameJoined,
      };
    }),

  // Listagem pública para portal do cliente (por token)
  getByClientToken: publicProcedure
    .input(z.object({ clientId: z.number(), token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verificar token do cliente
      const client = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!client.length) throw new TRPCError({ code: "NOT_FOUND" });
      // Retornar cargas do cliente
      const loads = await db.select().from(cargoLoads)
        .where(eq(cargoLoads.clientId, input.clientId))
        .orderBy(desc(cargoLoads.createdAt));
      return loads;
    }),

  uploadPhoto: protectedProcedure
    .input(z.object({
      cargoId: z.number(),
      photoBase64: z.string(),
      photoType: z.enum(["cargo", "weight_out", "weight_in"]).default("cargo"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const uploaded = await cloudinaryUpload(input.photoBase64, `btree/cargo/${input.cargoId}`);

      if (input.photoType === "weight_out") {
        await db.update(cargoLoads).set({ weightOutPhotoUrl: uploaded.url, updatedAt: new Date() }).where(eq(cargoLoads.id, input.cargoId));
        return { url: uploaded.url };
      } else if (input.photoType === "weight_in") {
        await db.update(cargoLoads).set({ weightInPhotoUrl: uploaded.url, updatedAt: new Date() }).where(eq(cargoLoads.id, input.cargoId));
        return { url: uploaded.url };
      }

      // Foto de carga geral
      const existing = await db.select({ photosJson: cargoLoads.photosJson })
        .from(cargoLoads).where(eq(cargoLoads.id, input.cargoId)).limit(1);
      let photos: string[] = [];
      if (existing[0]?.photosJson) {
        try { photos = JSON.parse(existing[0].photosJson); } catch { photos = []; }
      }
      photos.push(uploaded.url);
      await db.update(cargoLoads)
        .set({ photosJson: JSON.stringify(photos), updatedAt: new Date() })
        .where(eq(cargoLoads.id, input.cargoId));
      return { url: uploaded.url, photos };
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string(),
      widthM: z.string(),
      lengthM: z.string(),
      volumeM3: z.string(),
      weightKg: z.string().optional(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      destinationId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(cargoLoads).values({
        ...input,
        date: new Date(input.date),
        status: input.status || "pendente",
        trackingStatus: "aguardando",
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string().optional(),
      widthM: z.string().optional(),
      lengthM: z.string().optional(),
      volumeM3: z.string().optional(),
      weightKg: z.string().optional(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      destinationId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
      trackingStatus: z.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).optional(),
      trackingNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, date, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (date) updateData.date = new Date(date);
      if (rest.trackingStatus) updateData.trackingUpdatedAt = new Date();
      await db.update(cargoLoads).set(updateData).where(eq(cargoLoads.id, id));
      return { success: true };
    }),

  updateTracking: protectedProcedure
    .input(z.object({
      id: z.number(),
      trackingStatus: z.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
      trackingNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(cargoLoads).set({
        trackingStatus: input.trackingStatus,
        trackingNotes: input.trackingNotes,
        trackingUpdatedAt: new Date(),
        updatedAt: new Date(),
        // Finalizar carga quando tracking chega em "finalizado"
        status: input.trackingStatus === "finalizado" ? "entregue" : undefined,
      }).where(eq(cargoLoads.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(cargoLoads).where(eq(cargoLoads.id, input.id));
      return { success: true };
    }),

  // Listar caminhões disponíveis (tipo veículo)
  listTrucks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const all = await db.select({
      id: equipment.id,
      name: equipment.name,
      licensePlate: equipment.licensePlate,
      brand: equipment.brand,
      model: equipment.model,
      status: equipment.status,
    }).from(equipment).orderBy(equipment.name);
    // Filtrar apenas veículos com placa ou que sejam do tipo veículo
    return all.filter(e => e.licensePlate || e.name.toLowerCase().includes("caminh") || e.name.toLowerCase().includes("veículo") || e.name.toLowerCase().includes("veiculo") || e.name.toLowerCase().includes("carro") || e.name.toLowerCase().includes("van"));
  }),

  // Listar motoristas (colaboradores)
  listDrivers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role,
    }).from(collaborators).orderBy(collaborators.name);
  }),
});
