import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  cargoLoads, cargoDestinations, clients, equipment, collaborators, users, cargoTrackingPhotos, gpsLocations,
  cargoWeeklyClosings, clientDocuments
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar allowedClientIds do usuário para filtro server-side
      let userAllowedClientIds: number[] | null = null;
      if (ctx.user.role !== "admin") {
        const { userPermissions: upTable } = await import("../../drizzle/schema");
        const [perm] = await db.select().from(upTable).where(eq(upTable.userId, ctx.user.id));
        if (perm?.allowedClientIds) {
          userAllowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
        } else {
          // Fallback: verificar collaborator.client_id
          const [collab] = await db.select({ clientId: collaborators.clientId })
            .from(collaborators).where(eq(collaborators.userId, ctx.user.id));
          if (collab?.clientId) {
            userAllowedClientIds = [collab.clientId];
          } else {
            // Usuário não-admin sem permissões configuradas: mostrar tudo
            // (até que o admin configure as permissões dele)
            userAllowedClientIds = null;
          }
        }
      }

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
          weightOutKg: cargoLoads.weightOutKg,
          weightInKg: cargoLoads.weightInKg,
          weightNetKg: cargoLoads.weightNetKg,
          workLocationId: cargoLoads.workLocationId,
          finalHeightM: cargoLoads.finalHeightM,
          finalWidthM: cargoLoads.finalWidthM,
          finalLengthM: cargoLoads.finalLengthM,
          finalVolumeM3: cargoLoads.finalVolumeM3,
          invoiceUrl: cargoLoads.invoiceUrl,
          boletoUrl: cargoLoads.boletoUrl,
          boletoAmount: cargoLoads.boletoAmount,
          boletoDueDate: cargoLoads.boletoDueDate,
          paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
          paymentStatus: cargoLoads.paymentStatus,
          paidAt: cargoLoads.paidAt,
          // Joins
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
          locationName: gpsLocations.name,
          driverPhotoUrl: collaborators.photoUrl,
        })
        .from(cargoLoads)
        .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .leftJoin(equipment, eq(cargoLoads.vehicleId, equipment.id))
        .leftJoin(gpsLocations, eq(cargoLoads.workLocationId, gpsLocations.id))
        .leftJoin(collaborators, eq(cargoLoads.driverCollaboratorId, collaborators.id))
        .orderBy(desc(cargoLoads.date), desc(cargoLoads.createdAt));

      let filtered = results;
      // Filtro server-side por allowedClientIds (encarregado só vê cargas dos clientes permitidos)
      if (userAllowedClientIds && userAllowedClientIds.length > 0) {
        filtered = filtered.filter(r => r.clientId && userAllowedClientIds!.includes(r.clientId));
      }
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
      if (input?.dateFrom) filtered = filtered.filter(r => r.date && r.date >= input.dateFrom!);
      if (input?.dateTo) filtered = filtered.filter(r => r.date && r.date <= input.dateTo!);

      return filtered.map(r => ({
        ...r,
        clientName: r.clientNameJoined || r.clientName,
        destination: r.destinationNameJoined || r.destination,
        vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
        vehicleName: r.vehicleNameJoined,
        driverPhotoUrl: r.driverPhotoUrl || null,
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
          weightOutKg: cargoLoads.weightOutKg,
          weightInKg: cargoLoads.weightInKg,
          weightNetKg: cargoLoads.weightNetKg,
          finalHeightM: cargoLoads.finalHeightM,
          finalWidthM: cargoLoads.finalWidthM,
          finalLengthM: cargoLoads.finalLengthM,
          finalVolumeM3: cargoLoads.finalVolumeM3,
          workLocationId: cargoLoads.workLocationId,
          invoiceUrl: cargoLoads.invoiceUrl,
          boletoUrl: cargoLoads.boletoUrl,
          boletoAmount: cargoLoads.boletoAmount,
          boletoDueDate: cargoLoads.boletoDueDate,
          paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
          paymentStatus: cargoLoads.paymentStatus,
          paidAt: cargoLoads.paidAt,
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
          locationName: gpsLocations.name,
          driverPhotoUrl: collaborators.photoUrl,
        })
        .from(cargoLoads)
        .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .leftJoin(equipment, eq(cargoLoads.vehicleId, equipment.id))
        .leftJoin(gpsLocations, eq(cargoLoads.workLocationId, gpsLocations.id))
        .leftJoin(collaborators, eq(cargoLoads.driverCollaboratorId, collaborators.id))
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
        driverPhotoUrl: r.driverPhotoUrl || null,
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
        .orderBy(desc(cargoLoads.date), desc(cargoLoads.createdAt));
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
        await db.update(cargoLoads).set({ weightOutPhotoUrl: uploaded.url, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(eq(cargoLoads.id, input.cargoId));
        return { url: uploaded.url };
      } else if (input.photoType === "weight_in") {
        await db.update(cargoLoads).set({ weightInPhotoUrl: uploaded.url, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(eq(cargoLoads.id, input.cargoId));
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
        .set({ photosJson: JSON.stringify(photos), updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
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
      weightNetKg: z.string().optional(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      destinationId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
      workLocationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(cargoLoads).values({
        ...input,
        date: new Date(input.date).toISOString().slice(0, 19).replace('T', ' '),
        status: input.status || "pendente",
        trackingStatus: "aguardando",
        registeredBy: ctx.user.id,
        workLocationId: input.workLocationId || null,
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
      weightNetKg: z.string().optional(),
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
      weightOutKg: z.string().optional(),
      weightInKg: z.string().optional(),
      workLocationId: z.number().optional(),
      invoiceUrl: z.string().optional(),
      boletoUrl: z.string().optional(),
      boletoAmount: z.string().optional(),
      boletoDueDate: z.string().optional(),
      paymentReceiptUrl: z.string().optional(),
      paymentStatus: z.enum(['sem_boleto','a_pagar','pago']).optional(),
      paidAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, date, ...rest } = input;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateData: Record<string, unknown> = { ...rest, updatedAt: now };
      if (date) updateData.date = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
      if (rest.trackingStatus) updateData.trackingUpdatedAt = now;
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
        trackingUpdatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        // Finalizar carga quando tracking chega em "finalizado"
        status: input.trackingStatus === "finalizado" ? "entregue" : undefined,
      }).where(eq(cargoLoads.id, input.id));
      return { success: true };
    }),

  // Upload de documento (nota, boleto, comprovante) para uma carga
  uploadDocument: protectedProcedure
    .input(z.object({
      cargoId: z.number(),
      docBase64: z.string(),
      docType: z.enum(['invoice', 'boleto', 'payment_receipt']),
      boletoAmount: z.string().optional(),
      boletoDueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indispon\u00edvel' });
      const uploaded = await cloudinaryUpload(input.docBase64, `btree/docs/${input.cargoId}`);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (input.docType === 'invoice') {
        updateData.invoiceUrl = uploaded.url;
      } else if (input.docType === 'boleto') {
        updateData.boletoUrl = uploaded.url;
        updateData.paymentStatus = 'a_pagar';
        if (input.boletoAmount) updateData.boletoAmount = input.boletoAmount;
        if (input.boletoDueDate) updateData.boletoDueDate = input.boletoDueDate;
      } else if (input.docType === 'payment_receipt') {
        updateData.paymentReceiptUrl = uploaded.url;
        updateData.paymentStatus = 'pago';
        updateData.paidAt = now;
      }
      await db.update(cargoLoads).set(updateData as any).where(eq(cargoLoads.id, input.cargoId));
      return { url: uploaded.url, success: true };
    }),

  // Listar cargas com boleto (para integração financeira)
  listBoletos: protectedProcedure
    .input(z.object({
      status: z.enum(['a_pagar', 'pago']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indispon\u00edvel' });
      const results = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        clientId: cargoLoads.clientId,
        clientName: cargoLoads.clientName,
        destination: cargoLoads.destination,
        invoiceNumber: cargoLoads.invoiceNumber,
        boletoUrl: cargoLoads.boletoUrl,
        boletoAmount: cargoLoads.boletoAmount,
        boletoDueDate: cargoLoads.boletoDueDate,
        paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
        paymentStatus: cargoLoads.paymentStatus,
        paidAt: cargoLoads.paidAt,
        volumeM3: cargoLoads.volumeM3,
        weightNetKg: cargoLoads.weightNetKg,
        clientNameJoined: clients.name,
        destinationNameJoined: cargoDestinations.name,
      })
      .from(cargoLoads)
      .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
      .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
      .orderBy(desc(cargoLoads.boletoDueDate), desc(cargoLoads.date));
      let filtered = results.filter(r => r.boletoUrl);
      if (input?.status) filtered = filtered.filter(r => r.paymentStatus === input.status);
      return filtered.map(r => ({
        ...r,
        clientName: r.clientNameJoined || r.clientName,
        destination: r.destinationNameJoined || r.destination,
      }));
    }),

  // Marcar boleto como pago (sem comprovante)
  markAsPaid: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(cargoLoads).set({
        paymentStatus: 'pago',
        paidAt: now,
        updatedAt: now,
      } as any).where(eq(cargoLoads.id, input.id));
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

  // ===== TRACKING PHOTOS =====
  listTrackingPhotos: protectedProcedure
    .input(z.object({ cargoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(cargoTrackingPhotos)
        .where(eq(cargoTrackingPhotos.cargoId, input.cargoId))
        .orderBy(cargoTrackingPhotos.createdAt);
    }),

  addTrackingPhoto: protectedProcedure
    .input(z.object({
      cargoId: z.number(),
      stage: z.string().min(1),
      photoBase64: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const uploaded = await cloudinaryUpload(input.photoBase64, `btree/tracking/${input.cargoId}`);

      await db.insert(cargoTrackingPhotos).values({
        cargoId: input.cargoId,
        stage: input.stage,
        photoUrl: uploaded.url,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
      });

      return { url: uploaded.url, success: true };
    }),

  deleteTrackingPhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(cargoTrackingPhotos).where(eq(cargoTrackingPhotos.id, input.id));
      return { success: true };
    }),

  // Listar fotos de tracking para o portal do cliente (público)
  getTrackingPhotosPublic: publicProcedure
    .input(z.object({ cargoId: z.number(), clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [load] = await db.select({ clientId: cargoLoads.clientId, clientName: cargoLoads.clientName })
        .from(cargoLoads).where(eq(cargoLoads.id, input.cargoId)).limit(1);
      if (!load) throw new TRPCError({ code: "NOT_FOUND" });
      return db.select().from(cargoTrackingPhotos)
        .where(eq(cargoTrackingPhotos.cargoId, input.cargoId))
        .orderBy(cargoTrackingPhotos.createdAt);
    }),

  // ===== CAMINHÕES E MOTORISTAS =====
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
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM,
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

  // ===== EXPERIÊNCIA DO MOTORISTA =====
  // Buscar informações do motorista logado (colaborador vinculado + caminhão)
  getMyDriverInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    
    // Buscar colaborador vinculado ao user logado
    const [myCollaborator] = await db.select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role,
    }).from(collaborators).where(eq(collaborators.userId, ctx.user.id)).limit(1);
    
    // Buscar caminhões disponíveis (com medidas padrão)
    const allEquip = await db.select({
      id: equipment.id,
      name: equipment.name,
      licensePlate: equipment.licensePlate,
      brand: equipment.brand,
      model: equipment.model,
      status: equipment.status,
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM,
    }).from(equipment).orderBy(equipment.name);
    const trucksList = allEquip.filter(e => 
      e.licensePlate || e.name.toLowerCase().includes("caminh") || 
      e.name.toLowerCase().includes("veículo") || e.name.toLowerCase().includes("veiculo") || 
      e.name.toLowerCase().includes("carro") || e.name.toLowerCase().includes("van") ||
      e.name.toLowerCase().includes("bitrem") || e.name.toLowerCase().includes("carreta")
    );
    
    // Buscar a última carga do motorista para sugerir caminhão padrão
    let defaultTruckId: number | null = null;
    if (myCollaborator) {
      const [lastCargo] = await db.select({ vehicleId: cargoLoads.vehicleId })
        .from(cargoLoads)
        .where(eq(cargoLoads.driverCollaboratorId, myCollaborator.id))
        .orderBy(desc(cargoLoads.createdAt))
        .limit(1);
      if (lastCargo?.vehicleId) defaultTruckId = lastCargo.vehicleId;
    }
    
    // Determinar medidas padrão: do caminhão selecionado ou fallback eucalipto
    const defaultTruck = trucksList.find(t => t.id === defaultTruckId);
    const defaultMeasures = {
      heightM: defaultTruck?.defaultHeightM || '2.4',
      widthM: defaultTruck?.defaultWidthM || '2.4',
      lengthM: defaultTruck?.defaultLengthM || '13.80',
    };
    
    return {
      collaborator: myCollaborator || null,
      defaultTruckId,
      trucks: trucksList,
      isDriver: myCollaborator?.role === 'motorista',
      defaultMeasures,
    };
  }),

  // Buscar cargas pendentes do motorista logado
  getMyPendingLoads: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    
    // Buscar colaborador vinculado
    const [myCollaborator] = await db.select({ id: collaborators.id })
      .from(collaborators).where(eq(collaborators.userId, ctx.user.id)).limit(1);
    
    if (!myCollaborator) return [];
    
    const loads = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      heightM: cargoLoads.heightM,
      widthM: cargoLoads.widthM,
      lengthM: cargoLoads.lengthM,
      volumeM3: cargoLoads.volumeM3,
      clientName: cargoLoads.clientName,
      clientId: cargoLoads.clientId,
      destination: cargoLoads.destination,
      destinationId: cargoLoads.destinationId,
      status: cargoLoads.status,
      trackingStatus: cargoLoads.trackingStatus,
      trackingNotes: cargoLoads.trackingNotes,
      notes: cargoLoads.notes,
      createdAt: cargoLoads.createdAt,
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
    .where(and(
      eq(cargoLoads.driverCollaboratorId, myCollaborator.id),
      eq(cargoLoads.status, 'pendente')
    ))
    .orderBy(desc(cargoLoads.createdAt));
    
    return loads.map(r => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined,
    }));
  }),

  // Avançar tracking + enviar foto em um único passo
  // Atualizar medidas padrão de um caminhão (admin)
  updateTruckDefaults: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      defaultHeightM: z.string().optional(),
      defaultWidthM: z.string().optional(),
      defaultLengthM: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db.update(equipment).set({
        defaultHeightM: input.defaultHeightM || null,
        defaultWidthM: input.defaultWidthM || null,
        defaultLengthM: input.defaultLengthM || null,
      } as any).where(eq(equipment.id, input.equipmentId));
      return { success: true };
    }),

  advanceTrackingWithPhoto: protectedProcedure
    .input(z.object({
      cargoId: z.number(),
      stage: z.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
      photoBase64: z.string().optional(),
      notes: z.string().optional(),
      // Campos de peso (pesagem saída e chegada)
      weightKg: z.string().optional(),
      weightNetKg: z.string().optional(),
      // Campos de metragem final (ao finalizar)
      finalHeightM: z.string().optional(),
      finalWidthM: z.string().optional(),
      finalLengthM: z.string().optional(),
      finalVolumeM3: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Atualizar tracking status
      const updateData: Record<string, unknown> = {
        trackingStatus: input.stage,
        trackingNotes: input.notes || null,
        trackingUpdatedAt: now,
        updatedAt: now,
      };
      // Peso na pesagem de saída
      if (input.stage === 'pesagem_saida' && input.weightKg) {
        updateData.weightOutKg = input.weightKg;
      }
      // Peso na pesagem de chegada
      if (input.stage === 'pesagem_chegada' && input.weightKg) {
        updateData.weightInKg = input.weightKg;
      }
      // Peso líquido na pesagem de chegada
      if (input.stage === 'pesagem_chegada' && input.weightNetKg) {
        updateData.weightNetKg = input.weightNetKg;
      }
      // Metragem final ao finalizar
      if (input.stage === 'finalizado') {
        updateData.status = 'entregue';
        if (input.finalHeightM) updateData.finalHeightM = input.finalHeightM;
        if (input.finalWidthM) updateData.finalWidthM = input.finalWidthM;
        if (input.finalLengthM) updateData.finalLengthM = input.finalLengthM;
        if (input.finalVolumeM3) updateData.finalVolumeM3 = input.finalVolumeM3;
      }
      await db.update(cargoLoads).set(updateData as any).where(eq(cargoLoads.id, input.cargoId));
      
      // Se tem foto, fazer upload e salvar na tabela de tracking photos
      let photoUrl: string | null = null;
      if (input.photoBase64) {
        const uploaded = await cloudinaryUpload(input.photoBase64, `btree/tracking/${input.cargoId}`);
        photoUrl = uploaded.url;
        
        await db.insert(cargoTrackingPhotos).values({
          cargoId: input.cargoId,
          stage: input.stage,
          photoUrl: uploaded.url,
          notes: input.notes,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name,
        });
      }
      
      return { success: true, photoUrl };
    }),

  // ===== FECHAMENTOS SEMANAIS =====
  listWeeklyClosings: protectedProcedure
    .input(z.object({ clientId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let query = db.select({
        id: cargoWeeklyClosings.id,
        clientId: cargoWeeklyClosings.clientId,
        clientName: clients.name,
        weekStart: cargoWeeklyClosings.weekStart,
        weekEnd: cargoWeeklyClosings.weekEnd,
        totalLoads: cargoWeeklyClosings.totalLoads,
        totalWeightKg: cargoWeeklyClosings.totalWeightKg,
        totalAmount: cargoWeeklyClosings.totalAmount,
        pricePerTon: cargoWeeklyClosings.pricePerTon,
        dueDate: cargoWeeklyClosings.dueDate,
        status: cargoWeeklyClosings.status,
        paidAt: cargoWeeklyClosings.paidAt,
        notes: cargoWeeklyClosings.notes,
        createdAt: cargoWeeklyClosings.createdAt,
      }).from(cargoWeeklyClosings)
        .leftJoin(clients, eq(cargoWeeklyClosings.clientId, clients.id))
        .orderBy(desc(cargoWeeklyClosings.weekEnd));
      const results = await query;
      if (input?.clientId) return results.filter(r => r.clientId === input.clientId);
      return results;
    }),

  createWeeklyClosing: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      weekStart: z.string(),
      weekEnd: z.string(),
      pricePerTon: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Get client price if not provided
      let pricePerTon = input.pricePerTon;
      if (!pricePerTon) {
        const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
        pricePerTon = client?.pricePerTon || '130';
      }
      
      // Calculate totals from cargo loads in this period
      const allLoads = await db.select().from(cargoLoads)
        .where(eq(cargoLoads.clientId, input.clientId));
      
      const weekStartDate = new Date(input.weekStart);
      const weekEndDate = new Date(input.weekEnd);
      weekEndDate.setHours(23, 59, 59, 999);
      
      const loadsInPeriod = allLoads.filter(l => {
        const loadDate = new Date(l.date);
        return loadDate >= weekStartDate && loadDate <= weekEndDate;
      });
      
      const totalLoads = loadsInPeriod.length;
      const totalWeightKg = loadsInPeriod.reduce((sum, l) => {
        const weight = parseFloat(l.weightNetKg || l.weightOutKg || '0');
        return sum + weight;
      }, 0);
      
      const totalWeightTon = totalWeightKg / 1000;
      const totalAmount = (totalWeightTon * parseFloat(pricePerTon)).toFixed(2);
      
      // Due date = weekEnd + paymentTermDays
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
      const paymentTermDays = client?.paymentTermDays || 20;
      const dueDate = new Date(input.weekEnd);
      dueDate.setDate(dueDate.getDate() + paymentTermDays);
      
      const result = await db.insert(cargoWeeklyClosings).values({
        clientId: input.clientId,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        totalLoads,
        totalWeightKg: totalWeightKg.toFixed(2),
        totalAmount,
        pricePerTon,
        dueDate: dueDate.toISOString().slice(0, 19).replace('T', ' '),
        status: 'fechado',
        closedBy: ctx.user.id,
        notes: input.notes,
      });
      return { success: true, id: (result as any).insertId, totalLoads, totalWeightKg: totalWeightKg.toFixed(2), totalAmount };
    }),

  updateWeeklyClosingStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['aberto', 'fechado', 'pago', 'atrasado']),
      paidAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = { status: input.status };
      if (input.status === 'pago') updateData.paidAt = input.paidAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(cargoWeeklyClosings).set(updateData).where(eq(cargoWeeklyClosings.id, input.id));
      return { success: true };
    }),

  deleteWeeklyClosing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(cargoWeeklyClosings).where(eq(cargoWeeklyClosings.id, input.id));
      return { success: true };
    }),

  // ===== DOCUMENTOS DO CLIENTE =====
  listClientDocuments: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(clientDocuments)
        .where(eq(clientDocuments.clientId, input.clientId))
        .orderBy(desc(clientDocuments.createdAt));
    }),

  uploadClientDocument: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      type: z.enum(['proposta', 'contrato', 'nota_fiscal', 'boleto', 'recibo', 'outros']),
      title: z.string().min(1),
      fileBase64: z.string(),
      fileType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const uploaded = await cloudinaryUpload(input.fileBase64, `btree/client-docs/${input.clientId}`);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const result = await db.execute(sql`INSERT INTO client_documents (client_id, type, title, file_url, file_type, notes, uploaded_by, created_at) VALUES (${input.clientId}, ${input.type}, ${input.title}, ${uploaded.url}, ${input.fileType || null}, ${input.notes || null}, ${ctx.user.id}, ${now})`);
      return { success: true, id: (result as any).insertId, url: uploaded.url };
    }),

  deleteClientDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(clientDocuments).where(eq(clientDocuments.id, input.id));
      return { success: true };
    }),

  // ===== ATUALIZAR PREÇO DO CLIENTE =====
  updateClientPricing: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      pricePerTon: z.string().optional(),
      residuePerTon: z.string().optional(),
      billingCycle: z.enum(['semanal', 'quinzenal', 'mensal']).optional(),
      billingDayOfWeek: z.number().optional(),
      paymentTermDays: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clientId, ...rest } = input;
      await db.update(clients).set(rest as any).where(eq(clients.id, clientId));
      return { success: true };
    }),
});
