import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  cargoLoads, cargoDestinations, clients, equipment, collaborators, users, cargoTrackingPhotos, gpsLocations,
  cargoWeeklyClosings, clientDocuments, buyerClients
} from "../../drizzle/schema";
import { eq, desc, asc, and, sql, ne, or } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";
import mysql from "mysql2/promise";

// Direct mysql2 connection for client_documents (bypasses Drizzle pool issues)
async function getDirectConnection() {
  // Use individual DB env vars (Hostinger) or DATABASE_URL (Manus/dev)
  const connConfig = process.env.DB_HOST
    ? {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '',
      }
    : process.env.DATABASE_URL!;
  const conn = await mysql.createConnection(connConfig as any);
  return conn;
}

export const cargoLoadsRouter = router({
  // ===== DESTINOS =====
  // Verificar se nota fiscal já existe (para validação em tempo real no frontend)
  checkInvoice: protectedProcedure
    .input(z.object({ invoiceNumber: z.string(), excludeId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { exists: false, cargo: null };
      const trimmed = input.invoiceNumber.trim();
      if (!trimmed) return { exists: false, cargo: null };
      const conditions = input.excludeId
        ? and(eq(cargoLoads.invoiceNumber, trimmed), ne(cargoLoads.id, input.excludeId))
        : eq(cargoLoads.invoiceNumber, trimmed);
      const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date, clientName: cargoLoads.clientName })
        .from(cargoLoads)
        .where(conditions)
        .limit(1);
      if (existing.length > 0) {
        return { exists: true, cargo: existing[0] };
      }
      return { exists: false, cargo: null };
    }),

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
      clientId: z.number().optional(),
      pricePerTon: z.string().optional(),
      pricePerM3: z.string().optional(),
      priceType: z.enum(['ton', 'm3']).optional().default('ton'),
      // Campos de comprador (unificação)
      isBuyer: z.number().optional().default(0),
      cnpjCpf: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      cep: z.string().optional(),
      contactPerson: z.string().optional(),
      product: z.string().optional(),
      paymentMethod: z.string().optional(),
      pricePerUnit: z.string().optional(),
      unit: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { name, address, city, state, notes, clientId, pricePerTon, pricePerM3, priceType,
        isBuyer, cnpjCpf, inscricaoEstadual, phone, email, cep, contactPerson, product, paymentMethod, pricePerUnit, unit } = input;
      let conn: any = null;
      try {
        conn = await getDirectConnection();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [result] = await conn.execute(
          'INSERT INTO cargo_destinations (name, address, city, state, notes, client_id, price_per_ton, price_per_m3, price_type, is_buyer, cnpj_cpf, inscricao_estadual, phone, email, cep, contact_person, product, payment_method, price_per_unit, unit, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, address || null, city || null, state || null, notes || null, clientId || null,
           pricePerTon || null, pricePerM3 || null, priceType || 'ton',
           isBuyer || 0, cnpjCpf || null, inscricaoEstadual || null, phone || null, email || null,
           cep || null, contactPerson || null, product || null, paymentMethod || null,
           pricePerUnit || null, unit || 'ton', ctx.user.id, now]
        );
        return { success: true, id: (result as any)?.insertId };
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
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
      pricePerTon: z.string().nullable().optional(),
      pricePerM3: z.string().nullable().optional(),
      priceType: z.enum(['ton', 'm3']).nullable().optional(),
      // Campos de comprador
      isBuyer: z.number().nullable().optional(),
      cnpjCpf: z.string().nullable().optional(),
      inscricaoEstadual: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      cep: z.string().nullable().optional(),
      contactPerson: z.string().nullable().optional(),
      product: z.string().nullable().optional(),
      paymentMethod: z.string().nullable().optional(),
      pricePerUnit: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, name, address, city, state, notes, clientId, pricePerTon, pricePerM3, priceType,
        isBuyer, cnpjCpf, inscricaoEstadual, phone, email, cep, contactPerson, product, paymentMethod, pricePerUnit, unit } = input;
      let conn: any = null;
      try {
        conn = await getDirectConnection();
        const setClauses: string[] = [];
        const params: unknown[] = [];
        if (name !== undefined) { setClauses.push('name = ?'); params.push(name); }
        if (address !== undefined) { setClauses.push('address = ?'); params.push(address || null); }
        if (city !== undefined) { setClauses.push('city = ?'); params.push(city || null); }
        if (state !== undefined) { setClauses.push('state = ?'); params.push(state || null); }
        if (notes !== undefined) { setClauses.push('notes = ?'); params.push(notes || null); }
        if (clientId !== undefined) { setClauses.push('client_id = ?'); params.push(clientId || null); }
        if (pricePerTon !== undefined) { setClauses.push('price_per_ton = ?'); params.push(pricePerTon || null); }
        if (pricePerM3 !== undefined) { setClauses.push('price_per_m3 = ?'); params.push(pricePerM3 || null); }
        if (priceType !== undefined) { setClauses.push('price_type = ?'); params.push(priceType || 'ton'); }
        if (isBuyer !== undefined) { setClauses.push('is_buyer = ?'); params.push(isBuyer ?? 0); }
        if (cnpjCpf !== undefined) { setClauses.push('cnpj_cpf = ?'); params.push(cnpjCpf || null); }
        if (inscricaoEstadual !== undefined) { setClauses.push('inscricao_estadual = ?'); params.push(inscricaoEstadual || null); }
        if (phone !== undefined) { setClauses.push('phone = ?'); params.push(phone || null); }
        if (email !== undefined) { setClauses.push('email = ?'); params.push(email || null); }
        if (cep !== undefined) { setClauses.push('cep = ?'); params.push(cep || null); }
        if (contactPerson !== undefined) { setClauses.push('contact_person = ?'); params.push(contactPerson || null); }
        if (product !== undefined) { setClauses.push('product = ?'); params.push(product || null); }
        if (paymentMethod !== undefined) { setClauses.push('payment_method = ?'); params.push(paymentMethod || null); }
        if (pricePerUnit !== undefined) { setClauses.push('price_per_unit = ?'); params.push(pricePerUnit || null); }
        if (unit !== undefined) { setClauses.push('unit = ?'); params.push(unit || 'ton'); }
        if (setClauses.length === 0) return { success: true };
        params.push(id);
        await conn.execute(`UPDATE cargo_destinations SET ${setClauses.join(', ')} WHERE id = ?`, params);
        return { success: true };
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
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
          humidity: cargoLoads.humidity,
          deliveryDate: cargoLoads.deliveryDate,
          // Joins
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
          locationName: gpsLocations.name,
          driverPhotoUrl: collaborators.photoUrl,
          receiverName: cargoLoads.receiverName,
          thirdPartyContractor: cargoLoads.thirdPartyContractor,
          thirdPartyCost: cargoLoads.thirdPartyCost,
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
          humidity: cargoLoads.humidity,
          deliveryDate: cargoLoads.deliveryDate,
          clientNameJoined: clients.name,
          destinationNameJoined: cargoDestinations.name,
          vehicleNameJoined: equipment.name,
          vehiclePlateJoined: equipment.licensePlate,
          locationName: gpsLocations.name,
          driverPhotoUrl: collaborators.photoUrl,
          receiverName: cargoLoads.receiverName,
          thirdPartyContractor: cargoLoads.thirdPartyContractor,
          thirdPartyCost: cargoLoads.thirdPartyCost,
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
      weightOutKg: z.string().optional(),
      weightInKg: z.string().optional(),
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
      humidity: z.string().optional(),
      deliveryDate: z.string().optional(),
      receiverName: z.string().optional(),
      thirdPartyContractor: z.string().optional(),
      thirdPartyCost: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      // Validação: nota fiscal duplicada
      if (input.invoiceNumber && input.invoiceNumber.trim() !== '') {
        const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date })
          .from(cargoLoads)
          .where(eq(cargoLoads.invoiceNumber, input.invoiceNumber.trim()))
          .limit(1);
        if (existing.length > 0) {
          const dateFmt = existing[0].date ? new Date(existing[0].date).toLocaleDateString('pt-BR') : 'N/I';
          throw new TRPCError({
            code: "CONFLICT",
            message: `Nota fiscal ${input.invoiceNumber} já está sendo usada em outra carga (Placa: ${existing[0].vehiclePlate || 'N/I'}, Data: ${dateFmt}). Verifique o número da nota.`,
          });
        }
      }

      // Upload photos to Cloudinary if they are base64 (not URLs)
      let finalPhotosJson = input.photosJson;
      if (input.photosJson) {
        try {
          const photos: string[] = JSON.parse(input.photosJson);
          const uploadedUrls: string[] = [];
          for (const photo of photos) {
            if (photo.startsWith('data:')) {
              const uploaded = await cloudinaryUpload(photo, `btree/cargo/new`);
              uploadedUrls.push(uploaded.url);
            } else {
              uploadedUrls.push(photo);
            }
          }
          finalPhotosJson = JSON.stringify(uploadedUrls);
        } catch { /* keep original */ }
      }

      // Sanitize all numeric string fields: replace comma with dot for MySQL
      const sanitizeNum = (v: string | undefined) => v ? v.replace(',', '.') : v;
      try {
        await db.insert(cargoLoads).values({
          ...input,
          photosJson: finalPhotosJson || null,
          heightM: sanitizeNum(input.heightM),
          widthM: sanitizeNum(input.widthM),
          lengthM: sanitizeNum(input.lengthM),
          volumeM3: sanitizeNum(input.volumeM3),
          weightKg: sanitizeNum(input.weightKg),
          weightNetKg: sanitizeNum(input.weightNetKg),
          weightOutKg: sanitizeNum(input.weightOutKg),
          weightInKg: sanitizeNum(input.weightInKg),
          humidity: sanitizeNum(input.humidity),
          date: new Date(input.date).toISOString().slice(0, 19).replace('T', ' '),
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate).toISOString().slice(0, 19).replace('T', ' ') : null,
          status: input.status || "pendente",
          trackingStatus: "aguardando",
          registeredBy: ctx.user.id,
          workLocationId: input.workLocationId || null,
        });
      } catch (dbErr: any) {
        const realErr = dbErr.cause || dbErr;
        console.error('[cargoLoads.create] DB ERROR:', realErr.code, realErr.errno, realErr.sqlState, realErr.sqlMessage || realErr.message);
        console.error('[cargoLoads.create] Full error:', dbErr.message);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro DB [${realErr.code || 'UNKNOWN'}]: ${realErr.sqlMessage || realErr.message || dbErr.message}`,
        });
      }

      // Notificação interna para Fábio (ADM/Comercial) - nova carga
      try {
        const { notifyAdmComercial } = await import('./notifications');
        const dateFmt = new Date(input.date).toLocaleDateString('pt-BR');
        const clientInfo = input.clientName || (input.destination ? `Destino: ${input.destination}` : '');
        const weightInfo = input.weightNetKg ? `${(parseFloat(input.weightNetKg)/1000).toFixed(2)} ton` : `${input.volumeM3} m³`;
        await notifyAdmComercial({
          type: 'fechamento_carga',
          title: `Nova carga registrada${clientInfo ? ': ' + clientInfo : ''}`,
          message: `Data: ${dateFmt} | ${weightInfo} | Placa: ${input.vehiclePlate || 'N/I'} | Por: ${ctx.user.name}`,
          relatedType: 'cargo_load',
        });
       } catch (e) { /* silent */ }

      // Auto-generate financial entries if cargo is created with status 'entregue'
      if (input.status === 'entregue' && input.weightNetKg && parseFloat(input.weightNetKg) > 0) {
        try {
          const { generateFinancialEntriesForCargo } = await import('../autoFinancial');
          // Get the just-inserted cargo to have the ID
          const [newCargo] = await db.select().from(cargoLoads).orderBy(desc(cargoLoads.id)).limit(1);
          if (newCargo) {
            await generateFinancialEntriesForCargo(newCargo as any, ctx.user.id, ctx.user.name);
          }
        } catch(e) { /* silent */ }
      }

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
      humidity: z.string().optional(),
      deliveryDate: z.string().optional(),
      invoiceUrl: z.string().optional(),
      boletoUrl: z.string().optional(),
      boletoAmount: z.string().optional(),
      boletoDueDate: z.string().optional(),
      paymentReceiptUrl: z.string().optional(),
      paymentStatus: z.enum(['sem_boleto','a_pagar','pago']).optional(),
      paidAt: z.string().optional(),
      receiverName: z.string().optional(),
      thirdPartyContractor: z.string().optional(),
      thirdPartyCost: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Validação: nota fiscal duplicada (excluindo a própria carga)
      if (input.invoiceNumber && input.invoiceNumber.trim() !== '') {
        const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date })
          .from(cargoLoads)
          .where(and(
            eq(cargoLoads.invoiceNumber, input.invoiceNumber.trim()),
            ne(cargoLoads.id, input.id)
          ))
          .limit(1);
        if (existing.length > 0) {
          const dateFmt = existing[0].date ? new Date(existing[0].date).toLocaleDateString('pt-BR') : 'N/I';
          throw new TRPCError({
            code: "CONFLICT",
            message: `Nota fiscal ${input.invoiceNumber} já está sendo usada em outra carga (Placa: ${existing[0].vehiclePlate || 'N/I'}, Data: ${dateFmt}). Verifique o número da nota.`,
          });
        }
      }

      const { id, date, deliveryDate, receiverName, thirdPartyContractor, thirdPartyCost, notes, ...rest } = input;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateData: Record<string, unknown> = { ...rest, updatedAt: now };
      // These fields use snake_case column names - must be set explicitly via Drizzle schema fields
      // They are handled separately at the db.update() call below
      if (date) updateData.date = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
      if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate).toISOString().slice(0, 19).replace('T', ' ') : null;
      if (rest.trackingStatus) updateData.trackingUpdatedAt = now;
      // Sanitize all numeric string fields: replace comma with dot for MySQL compatibility
      const numericFields = ['heightM', 'widthM', 'lengthM', 'volumeM3', 'weightKg', 'weightNetKg', 'weightOutKg', 'weightInKg', 'humidity', 'finalHeightM', 'finalWidthM', 'finalLengthM', 'finalVolumeM3', 'boletoAmount'];
      for (const field of numericFields) {
        if (updateData[field] && typeof updateData[field] === 'string') {
          updateData[field] = (updateData[field] as string).replace(',', '.');
        }
      }

      // Upload base64 photos to Cloudinary before storing
      if (rest.photosJson) {
        try {
          const photos: string[] = JSON.parse(rest.photosJson as string);
          const uploadedUrls: string[] = [];
          for (const photo of photos) {
            if (photo.startsWith('data:')) {
              const uploaded = await cloudinaryUpload(photo, `btree/cargo/${id}`);
              uploadedUrls.push(uploaded.url);
            } else {
              uploadedUrls.push(photo);
            }
          }
          updateData.photosJson = JSON.stringify(uploadedUrls);
        } catch { /* keep original */ }
      }

      // Remove undefined values from updateData to prevent Drizzle errors
      for (const key of Object.keys(updateData)) {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      }
      // Debug: log the updateData keys and values for troubleshooting
      console.log('[cargoLoads.update] id:', id, 'keys:', Object.keys(updateData), 'receiverName:', receiverName);
      try {
        await db.update(cargoLoads).set(updateData as any).where(eq(cargoLoads.id, id));
        // Separately update snake_case fields that Drizzle may not map from Record<string,unknown>
        const extraUpdates: string[] = [];
        const extraParams: unknown[] = [];
        if (receiverName !== undefined) { extraUpdates.push('receiver_name = ?'); extraParams.push(receiverName || null); }
        if (thirdPartyContractor !== undefined) { extraUpdates.push('third_party_contractor = ?'); extraParams.push(thirdPartyContractor || null); }
        if (thirdPartyCost !== undefined) { extraUpdates.push('third_party_cost = ?'); extraParams.push(thirdPartyCost || null); }
        if (notes !== undefined) { extraUpdates.push('notes = ?'); extraParams.push(notes || null); }
        if (extraUpdates.length > 0) {
          extraParams.push(id);
          const conn = await getDirectConnection();
          try {
            await conn.execute(`UPDATE cargo_loads SET ${extraUpdates.join(', ')} WHERE id = ?`, extraParams);
          } finally { await conn.end(); }
        }
      } catch (dbErr: any) {
        // DrizzleQueryError wraps the real MySQL error in .cause
        const realErr = dbErr.cause || dbErr;
        console.error('[cargoLoads.update] DB ERROR:', realErr.code, realErr.errno, realErr.sqlState, realErr.sqlMessage || realErr.message);
        console.error('[cargoLoads.update] Full error:', dbErr.message);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro DB [${realErr.code || 'UNKNOWN'}]: ${realErr.sqlMessage || realErr.message || dbErr.message}`,
        });
      }
      // Auto-generate financial entries when status changes to 'entregue'
      if (input.status === 'entregue') {
        try {
          const { generateFinancialEntriesForCargo } = await import('../autoFinancial');
          const [cargo] = await db.select().from(cargoLoads).where(eq(cargoLoads.id, id)).limit(1);
          if (cargo) {
            await generateFinancialEntriesForCargo(cargo as any, ctx.user.id, ctx.user.name);
          }
        } catch(e) { /* silent - don't block update */ }
      }

      return { success: true };
    }),

  updateTracking: protectedProcedure
    .input(z.object({
      id: z.number(),
      trackingStatus: z.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
      trackingNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
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

      // Auto-generate financial entries when tracking reaches 'finalizado'
      if (input.trackingStatus === 'finalizado') {
        try {
          const { generateFinancialEntriesForCargo } = await import('../autoFinancial');
          const [cargo] = await db.select().from(cargoLoads).where(eq(cargoLoads.id, input.id)).limit(1);
          if (cargo) {
            await generateFinancialEntriesForCargo(cargo as any, ctx.user.id, ctx.user.name);
          }
        } catch(e) { /* silent */ }
      }

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

      // Notificação interna para Julia (financeiro) quando boleto é cadastrado
      if (input.docType === 'boleto') {
        try {
          const { notifyFinanceiro } = await import('./notifications');
          const amountInfo = input.boletoAmount ? `R$ ${input.boletoAmount}` : 'Valor não informado';
          const dueInfo = input.boletoDueDate ? new Date(input.boletoDueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem vencimento';
          await notifyFinanceiro({
            type: 'pagamento_boleto',
            title: `Novo boleto cadastrado - Carga #${input.cargoId}`,
            message: `Valor: ${amountInfo} | Vencimento: ${dueInfo}`,
            relatedId: input.cargoId,
            relatedType: 'cargo_load',
          });
        } catch (e) { /* silent */ }
      }

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

  // Marcar boleto como pago (com data e observação opcionais)
  markAsPaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string().optional(), // formato YYYY-MM-DD
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Se paidAt for fornecido, usar essa data; caso contrário, usar agora
        const paidAtDatetime = input.paidAt
          ? input.paidAt + ' 12:00:00'
          : now;
        await conn.execute(
          'UPDATE cargo_loads SET payment_status = ?, paid_at = ?, updated_at = ? WHERE id = ?',
          ['pago', paidAtDatetime, now, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Atualizar data de pagamento de um boleto já pago
  updatePaymentDate: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string(), // formato YYYY-MM-DD
    }))
    .mutation(async ({ input }) => {
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Converte YYYY-MM-DD para datetime (meio-dia para evitar problemas de fuso)
        const paidAtDatetime = input.paidAt + ' 12:00:00';
        await conn.execute(
          'UPDATE cargo_loads SET paid_at = ?, updated_at = ? WHERE id = ?',
          [paidAtDatetime, now, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
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
        receiptUrl: cargoWeeklyClosings.receiptUrl,
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
      
      // Normalize date strings to avoid timezone issues (add T12:00:00 to date-only strings)
      const normalizeDate = (d: string) => d.length === 10 ? d + 'T12:00:00' : d;
      const weekStartStr = input.weekStart.slice(0, 10); // Keep as YYYY-MM-DD for storage
      const weekEndStr = input.weekEnd.slice(0, 10);
      
      // Get client data (needed for price and payment terms)
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
      
      // Get price per ton: prefer input > client config > default 130
      let pricePerTon = input.pricePerTon;
      if (!pricePerTon || parseFloat(pricePerTon) === 0) {
        const clientPrice = client?.pricePerTon;
        pricePerTon = (clientPrice && parseFloat(String(clientPrice)) > 0) ? String(clientPrice) : '130';
      }
      
      // Calculate totals from cargo loads in this period
      // Use SQL-based date comparison to avoid JavaScript timezone issues
      // DATE(date) extracts just the date part, ignoring time/timezone
      const conn = await getDirectConnection();
      let loadsInPeriod: Array<{ id: number; weight_net_kg: string | null; weight_out_kg: string | null }> = [];
      try {
        const [rows] = await conn.execute(
          `SELECT id, weight_net_kg, weight_out_kg FROM cargo_loads WHERE client_id = ? AND DATE(date) >= ? AND DATE(date) <= ?`,
          [input.clientId, weekStartStr, weekEndStr]
        ) as any;
        loadsInPeriod = rows;
      } finally {
        await conn.end();
      }
      
      const totalLoads = loadsInPeriod.length;
      const totalWeightKg = loadsInPeriod.reduce((sum, l) => {
        // MySQL returns column names in snake_case (weight_net_kg, not weightNetKg)
        const weight = parseFloat((l as any).weight_net_kg || (l as any).weight_out_kg || '0');
        return sum + weight;
      }, 0);
      
      const totalWeightTon = totalWeightKg / 1000;
      const totalAmount = (totalWeightTon * parseFloat(pricePerTon)).toFixed(2);
      
      // Due date = weekEnd + paymentTermDays
      const paymentTermDays = client?.paymentTermDays || 21;
      const dueDate = new Date(normalizeDate(input.weekEnd));
      dueDate.setDate(dueDate.getDate() + paymentTermDays);
      const dueDateStr = dueDate.toISOString().slice(0, 10) + ' 12:00:00';
      
      const result = await db.insert(cargoWeeklyClosings).values({
        clientId: input.clientId,
        weekStart: weekStartStr + ' 12:00:00',
        weekEnd: weekEndStr + ' 12:00:00',
        totalLoads,
        totalWeightKg: totalWeightKg.toFixed(2),
        totalAmount,
        pricePerTon,
        dueDate: dueDateStr,
        status: 'fechado',
        closedBy: ctx.user.id,
        notes: input.notes,
      });

      // Notificação interna para Fábio (ADM/Comercial) e admins
      try {
        const { notifyAdmComercial } = await import('./notifications');
        const clientName = client?.name || `Cliente #${input.clientId}`;
        const weekStartFmt = new Date(input.weekStart + 'T12:00:00').toLocaleDateString('pt-BR');
        const weekEndFmt = new Date(input.weekEnd + 'T12:00:00').toLocaleDateString('pt-BR');
        await notifyAdmComercial({
          type: 'fechamento_semanal',
          title: `Fechamento semanal: ${clientName}`,
          message: `Período ${weekStartFmt} a ${weekEndFmt} | ${totalLoads} cargas | ${totalWeightTon.toFixed(2)} ton | R$ ${totalAmount}`,
          relatedId: (result as any).insertId,
          relatedType: 'weekly_closing',
        });
      } catch (e) { /* silent */ }

      return { success: true, id: (result as any).insertId, totalLoads, totalWeightKg: totalWeightKg.toFixed(2), totalAmount };
    }),

  updateWeeklyClosingStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['aberto', 'fechado', 'pago', 'atrasado']),
      paidAt: z.string().optional(),
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = { status: input.status };
      if (input.status === 'pago') updateData.paidAt = input.paidAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (input.receiptUrl) updateData.receiptUrl = input.receiptUrl;
      await db.update(cargoWeeklyClosings).set(updateData).where(eq(cargoWeeklyClosings.id, input.id));

      // Marcar cargas do período como pagas automaticamente quando fechamento é marcado como pago
      if (input.status === 'pago') {
        try {
          const [closing] = await db.select().from(cargoWeeklyClosings).where(eq(cargoWeeklyClosings.id, input.id)).limit(1);
          if (closing) {
            const conn2 = await getDirectConnection();
            try {
              const weekStartStr = closing.weekStart ? new Date(closing.weekStart).toISOString().slice(0, 10) : null;
              const weekEndStr = closing.weekEnd ? new Date(closing.weekEnd).toISOString().slice(0, 10) : null;
              if (weekStartStr && weekEndStr) {
                await conn2.execute(
                  `UPDATE cargo_loads SET payment_status = 'pago', updated_at = NOW() WHERE client_id = ? AND DATE(date) >= ? AND DATE(date) <= ? AND payment_status != 'pago'`,
                  [closing.clientId, weekStartStr, weekEndStr]
                );
              }
            } finally {
              await conn2.end();
            }
          }
        } catch (e) {
          console.warn('[WeeklyClosing] Error marking loads as paid:', e);
        }
      }

      // Notificar quando comprovante é anexado ou status muda para pago
      if (input.status === 'pago' || input.receiptUrl) {
        try {
          // Buscar dados do fechamento para notificação
          const [closing] = await db.select().from(cargoWeeklyClosings).where(eq(cargoWeeklyClosings.id, input.id)).limit(1);
          if (closing) {
            const [client] = await db.select().from(clients).where(eq(clients.id, closing.clientId)).limit(1);
            const clientName = client?.name || 'Cliente';
            const weekStartFmt = closing.weekStart ? new Date(closing.weekStart).toLocaleDateString('pt-BR') : '-';
            const weekEndFmt = closing.weekEnd ? new Date(closing.weekEnd).toLocaleDateString('pt-BR') : '-';
            const totalAmount = closing.totalAmount ? parseFloat(closing.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';

            // Notificar owner
            const { notifyOwner } = await import('../_core/notification');
            await notifyOwner({
              title: `Fechamento ${input.status === 'pago' ? 'marcado como PAGO' : 'atualizado'}: ${clientName}`,
              content: `Semana ${weekStartFmt} a ${weekEndFmt}\nValor: R$ ${totalAmount}${input.receiptUrl ? '\nComprovante anexado.' : ''}`,
            }).catch(() => {});

            // Notificar ADM
            const { notifyAdmComercial } = await import('./notifications');
            await notifyAdmComercial({
              type: 'fechamento_semanal',
              title: `Fechamento ${input.status === 'pago' ? 'PAGO' : 'atualizado'}: ${clientName}`,
              message: `Semana ${weekStartFmt} a ${weekEndFmt} — R$ ${totalAmount}${input.receiptUrl ? ' (comprovante anexado)' : ''}`,
              relatedId: closing.id,
              relatedType: 'weekly_closing',
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('[WeeklyClosing] Error sending notification:', e);
        }
      }

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

  // Atualizar data de pagamento de um fechamento semanal já pago
  updateWeeklyClosingPaymentDate: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string(), // formato YYYY-MM-DD
    }))
    .mutation(async ({ input }) => {
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const paidAtDatetime = input.paidAt + ' 12:00:00';
        await conn.execute(
          'UPDATE cargo_weekly_closings SET paid_at = ?, updated_at = ? WHERE id = ?',
          [paidAtDatetime, now, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // ===== DOCUMENTOS DO CLIENTE =====
  listClientDocuments: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      let conn: any = null;
      try {
        conn = await getDirectConnection();
        // Ensure table exists
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS client_documents (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            \`type\` enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
            title varchar(255) NOT NULL,
            file_url varchar(1000) NOT NULL,
            file_type varchar(50),
            notes text,
            uploaded_by int,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(id)
          )
        `);
        const [rows] = await conn.execute(
          'SELECT id, client_id as clientId, `type`, title, file_url as fileUrl, file_type as fileType, notes, uploaded_by as uploadedBy, created_at as createdAt FROM client_documents WHERE client_id = ? ORDER BY created_at DESC',
          [input.clientId]
        );
        return rows || [];
      } catch (err: any) {
        console.error('[listClientDocuments] Error:', err?.message, err?.code, err?.errno);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao listar documentos: ${err?.message || 'Desconhecido'}` });
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
    }),

  uploadClientDocument: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      type: z.enum(['proposta', 'contrato', 'nota_fiscal', 'boleto', 'recibo', 'outros']),
      title: z.string().min(1),
      fileBase64: z.string(),
      fileType: z.string().optional(),
      fileName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Upload file to Cloudinary with original filename for proper download
      const uploaded = await cloudinaryUpload(
        input.fileBase64,
        `btree/client-docs/${input.clientId}`,
        input.fileName
      );
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      let conn: any = null;
      try {
        conn = await getDirectConnection();
        // Ensure table exists
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS client_documents (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            \`type\` enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
            title varchar(255) NOT NULL,
            file_url varchar(1000) NOT NULL,
            file_type varchar(50),
            notes text,
            uploaded_by int,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(id)
          )
        `);
        const [result] = await conn.execute(
          'INSERT INTO client_documents (client_id, `type`, title, file_url, file_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [input.clientId, input.type, input.title, uploaded.url, input.fileType || null, input.notes || null, now]
        );
        return { success: true, id: (result as any)?.insertId, url: uploaded.url };
      } catch (err: any) {
        console.error('[uploadClientDocument] Error:', err?.message, err?.code, err?.errno, err?.sqlState);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao salvar documento: ${err?.message || 'Desconhecido'}` });
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
    }),

  deleteClientDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      let conn: any = null;
      try {
        conn = await getDirectConnection();
        await conn.execute('DELETE FROM client_documents WHERE id = ?', [input.id]);
        return { success: true };
      } catch (err: any) {
        console.error('[deleteClientDocument] Error:', err?.message);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao excluir documento: ${err?.message || 'Desconhecido'}` });
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
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

  // ===== RELATÓRIO POR DESTINO/COMPRADOR =====
  markReceivedByBuyer: protectedProcedure
    .input(z.object({ id: z.number(), received: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Atualiza status de recebimento da carga
      await db.update(cargoLoads).set({
        receivedByBuyer: input.received ? 1 : 0,
        receivedAt: input.received ? now : null,
      }).where(eq(cargoLoads.id, input.id));

      const { financialEntries } = await import('../../drizzle/schema');

      if (input.received) {
        // ANTI-DUPLICATA: verifica se já existe entrada financeira auto-gerada para esta carga
        const existing = await db.select({ id: financialEntries.id })
          .from(financialEntries)
          .where(and(eq(financialEntries.cargoLoadId, input.id), eq(financialEntries.autoGenerated, 1)))
          .limit(1);

        if (existing.length === 0) {
          // Busca dados da carga para calcular o valor
          const [cargo] = await db.select({
              id: cargoLoads.id,
              date: cargoLoads.date,
              destinationId: cargoLoads.destinationId,
              weightNetKg: cargoLoads.weightNetKg,
              weightKg: cargoLoads.weightKg,
              volumeM3: cargoLoads.volumeM3,
              invoiceNumber: cargoLoads.invoiceNumber,
            }).from(cargoLoads).where(eq(cargoLoads.id, input.id)).limit(1);
          if (cargo && cargo.destinationId) {
            const [dest] = await db.select({
              id: cargoDestinations.id,
              name: cargoDestinations.name,
              pricePerTon: cargoDestinations.pricePerTon,
              pricePerM3: cargoDestinations.pricePerM3,
              priceType: cargoDestinations.priceType,
              pricePerUnit: cargoDestinations.pricePerUnit,
              unit: cargoDestinations.unit,
            }).from(cargoDestinations)
              .where(eq(cargoDestinations.id, cargo.destinationId)).limit(1);
            if (dest) {
              const weightNetKg = parseFloat(cargo.weightNetKg || cargo.weightKg || '0');
              const weightTon = weightNetKg / 1000;
              const volumeM3 = parseFloat(String((cargo as any).volumeM3 || 0));
              const priceRaw = (dest as any).pricePerUnit ?? (dest.priceType === 'm3' ? dest.pricePerM3 : dest.pricePerTon);
              const priceVal = priceRaw ? parseFloat(priceRaw) : 0;
              if (priceVal > 0 && (weightTon > 0 || volumeM3 > 0)) {
                const qty = dest.priceType === 'm3' ? volumeM3 : weightTon;
                const revenueAmount = (qty * priceVal).toFixed(2);
                const dateObj = new Date(cargo.date || now);
                const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                await db.insert(financialEntries).values({
                  type: 'receita',
                  category: 'venda_madeira',
                  description: `Carga #${cargo.id} recebida - ${dest.name} - ${qty.toFixed(3)} ${dest.priceType === 'm3' ? 'm³' : 'ton'} × R$ ${priceVal.toFixed(2)} - NF: ${cargo.invoiceNumber || 'S/N'}`,
                  amount: revenueAmount,
                  date: dateObj.toISOString().slice(0, 19).replace('T', ' '),
                  referenceMonth: refMonth,
                  paymentMethod: 'transferencia',
                  status: 'confirmado',
                  clientName: dest.name,
                  cargoLoadId: cargo.id,
                  autoGenerated: 1,
                  registeredBy: ctx.user.id,
                  registeredByName: ctx.user.name + ' (auto-recebimento)',
                });
              }
            }
          }
        }
      } else {
        // REVERSAO: remove a entrada financeira auto-gerada vinculada a esta carga
        await db.delete(financialEntries)
          .where(and(
            eq(financialEntries.cargoLoadId, input.id),
            eq(financialEntries.autoGenerated, 1)
          ));
      }

      return { success: true, financialUpdated: true };
    }),

  listByDestination: protectedProcedure
    .input(z.object({
      destinationId: z.number().optional(),
      buyerId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      receivedFilter: z.enum(['all', 'received', 'pending']).optional(),
      statusFilter: z.enum(['all', 'entregue', 'pendente']).optional(),
      paymentStatusFilter: z.enum(['all', 'sem_boleto', 'a_pagar', 'pago']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const conditions: any[] = [];
      // Status filter - default to 'all' (show all statuses)
      if (input.statusFilter && input.statusFilter !== 'all') {
        conditions.push(eq(cargoLoads.status, input.statusFilter));
      }
      // Destination filter - all destinations (including buyers) are now in cargo_destinations
      // Match by destination_id OR by destination text name for legacy cargas
      if (input.destinationId) {
        // Support legacy offset (10000+) for backwards compatibility with old bookmarks/links
        const realDestId = input.destinationId >= 10000 ? input.destinationId - 10000 : input.destinationId;
        const destResult = await db.select({ name: cargoDestinations.name, isBuyer: cargoDestinations.isBuyer })
          .from(cargoDestinations)
          .where(eq(cargoDestinations.id, realDestId))
          .limit(1);
        const destName = destResult.length > 0 ? destResult[0].name : null;
        // Build OR conditions: match by real destination_id, legacy offset id, and by name
        const orClauses: any[] = [
          eq(cargoLoads.destinationId, realDestId),
        ];
        if (input.destinationId >= 10000) {
          // Also match the old offset id for legacy data
          orClauses.push(eq(cargoLoads.destinationId, input.destinationId));
        }
        if (destName) orClauses.push(eq(cargoLoads.destination, destName));
        conditions.push(or(...orClauses)!);
      }
      if (input.startDate) {
        conditions.push(sql`${cargoLoads.date} >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`${cargoLoads.date} <= ${input.endDate + ' 23:59:59'}`);
      }
      if (input.receivedFilter === 'received') {
        conditions.push(eq(cargoLoads.receivedByBuyer, 1));
      } else if (input.receivedFilter === 'pending') {
        conditions.push(eq(cargoLoads.receivedByBuyer, 0));
      }
      if (input.paymentStatusFilter && input.paymentStatusFilter !== 'all') {
        conditions.push(eq(cargoLoads.paymentStatus, input.paymentStatusFilter));
      }
      const results = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        deliveryDate: cargoLoads.deliveryDate,
        vehiclePlate: cargoLoads.vehiclePlate,
        driverName: cargoLoads.driverName,
        destination: cargoLoads.destination,
        destinationId: cargoLoads.destinationId,
        clientName: cargoLoads.clientName,
        invoiceNumber: cargoLoads.invoiceNumber,
        volumeM3: cargoLoads.volumeM3,
        weightKg: cargoLoads.weightKg,
        weightNetKg: cargoLoads.weightNetKg,
        weightInKg: cargoLoads.weightInKg,
        weightOutKg: cargoLoads.weightOutKg,
        woodType: cargoLoads.woodType,
        receivedByBuyer: cargoLoads.receivedByBuyer,
        receivedAt: cargoLoads.receivedAt,
        status: cargoLoads.status,
        paymentStatus: cargoLoads.paymentStatus,
        trackingStatus: cargoLoads.trackingStatus,
        heightM: cargoLoads.heightM,
        widthM: cargoLoads.widthM,
        lengthM: cargoLoads.lengthM,
        notes: cargoLoads.notes,
        receiverName: cargoLoads.receiverName,
        thirdPartyContractor: cargoLoads.thirdPartyContractor,
        thirdPartyCost: cargoLoads.thirdPartyCost,
      }).from(cargoLoads)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(cargoLoads.date), asc(cargoLoads.id));

      // Fetch destination/buyer info for financial calculations
      let buyerInfo: { pricePerUnit: string | null; unit: string | null; name: string } | null = null;
      let destInfo: { pricePerTon: string | null; pricePerM3: string | null; priceType: string | null; name: string } | null = null;

      if (input.destinationId && input.destinationId > 0) {
        const realDestId = input.destinationId >= 10000 ? input.destinationId - 10000 : input.destinationId;
        const destRows = await db.select({
          name: cargoDestinations.name,
          isBuyer: cargoDestinations.isBuyer,
          pricePerUnit: cargoDestinations.pricePerUnit,
          unit: cargoDestinations.unit,
          pricePerTon: cargoDestinations.pricePerTon,
          pricePerM3: cargoDestinations.pricePerM3,
          priceType: cargoDestinations.priceType,
        }).from(cargoDestinations).where(eq(cargoDestinations.id, realDestId)).limit(1);
        if (destRows.length > 0) {
          const d = destRows[0];
          if (d.isBuyer) {
            // It's a buyer: return buyerInfo with pricePerUnit
            const effectivePrice = d.pricePerUnit ?? (d.priceType === 'm3' ? d.pricePerM3 : d.pricePerTon);
            const effectiveUnit = d.unit ?? (d.priceType === 'm3' ? 'm3' : 'ton');
            buyerInfo = { name: d.name, pricePerUnit: effectivePrice, unit: effectiveUnit };
          } else {
            // Regular destination: return destInfo with price_per_ton/m3
            destInfo = { name: d.name, pricePerTon: d.pricePerTon, pricePerM3: d.pricePerM3, priceType: d.priceType };
          }
        }
      }

      return { loads: results, buyerInfo, destInfo };
    }),

  listThirdParty: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      contractor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const conditions: any[] = [
        sql`${cargoLoads.thirdPartyContractor} IS NOT NULL AND ${cargoLoads.thirdPartyContractor} != ''`,
      ];
      if (input.startDate) {
        conditions.push(sql`${cargoLoads.date} >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`${cargoLoads.date} <= ${input.endDate + ' 23:59:59'}`);
      }
      if (input.contractor) {
        conditions.push(sql`${cargoLoads.thirdPartyContractor} = ${input.contractor}`);
      }
      const results = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        deliveryDate: cargoLoads.deliveryDate,
        vehiclePlate: cargoLoads.vehiclePlate,
        driverName: cargoLoads.driverName,
        destination: cargoLoads.destination,
        clientName: cargoLoads.clientName,
        invoiceNumber: cargoLoads.invoiceNumber,
        volumeM3: cargoLoads.volumeM3,
        weightNetKg: cargoLoads.weightNetKg,
        woodType: cargoLoads.woodType,
        status: cargoLoads.status,
        thirdPartyContractor: cargoLoads.thirdPartyContractor,
        thirdPartyCost: cargoLoads.thirdPartyCost,
        thirdPartyPaid: cargoLoads.thirdPartyPaid,
        thirdPartyPaidAt: cargoLoads.thirdPartyPaidAt,
        thirdPartyPaymentNotes: cargoLoads.thirdPartyPaymentNotes,
        notes: cargoLoads.notes,
      }).from(cargoLoads)
        .where(and(...conditions))
        .orderBy(asc(cargoLoads.date), asc(cargoLoads.id));
      return results;
    }),

  // Marcar carga de corte terceirizado como paga
  markThirdPartyPaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string(), // YYYY-MM-DD
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const paidAtDatetime = input.paidAt + ' 12:00:00';
        await conn.execute(
          'UPDATE cargo_loads SET third_party_paid = 1, third_party_paid_at = ?, third_party_payment_notes = ?, updated_at = ? WHERE id = ?',
          [paidAtDatetime, input.notes || null, now, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Desfazer pagamento de corte terceirizado
  markThirdPartyUnpaid: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await conn.execute(
          'UPDATE cargo_loads SET third_party_paid = 0, third_party_paid_at = NULL, third_party_payment_notes = NULL, updated_at = ? WHERE id = ?',
          [now, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Marcar múltiplas cargas de um terceirizado como pagas de uma vez
  markThirdPartyPaidBulk: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      paidAt: z.string(), // YYYY-MM-DD
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!input.ids.length) return { success: true, count: 0 };
      const conn = await getDirectConnection();
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const paidAtDatetime = input.paidAt + ' 12:00:00';
        const placeholders = input.ids.map(() => '?').join(',');
        await conn.execute(
          `UPDATE cargo_loads SET third_party_paid = 1, third_party_paid_at = ?, third_party_payment_notes = ?, updated_at = ? WHERE id IN (${placeholders})`,
          [paidAtDatetime, input.notes || null, now, ...input.ids]
        );
        return { success: true, count: input.ids.length };
      } finally {
        await conn.end();
      }
    }),
});
