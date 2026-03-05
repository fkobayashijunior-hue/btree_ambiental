import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { collaborators, biometricAttendance } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import { storagePut } from "../storage";

const collaboratorRoles = [
  "administrativo", "encarregado", "mecanico", "motosserrista",
  "carregador", "operador", "motorista", "terceirizado"
] as const;

export const collaboratorsRouter = router({
  // Listar todos os colaboradores
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.string().optional(),
      active: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(collaborators);
      const conditions = [];

      if (input?.active !== undefined) {
        conditions.push(eq(collaborators.active, input.active ? 1 : 0));
      }
      if (input?.role) {
        conditions.push(eq(collaborators.role, input.role as any));
      }
      if (input?.search) {
        conditions.push(
          or(
            like(collaborators.name, `%${input.search}%`),
            like(collaborators.cpf, `%${input.search}%`),
            like(collaborators.phone, `%${input.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        return await db.select().from(collaborators)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(collaborators.createdAt));
      }

      return await db.select().from(collaborators)
        .orderBy(desc(collaborators.createdAt));
    }),

  // Buscar colaborador por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select().from(collaborators)
        .where(eq(collaborators.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  // Criar colaborador
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zipCode: z.string().optional(),
      role: z.enum(collaboratorRoles),
      pixKey: z.string().optional(),
      dailyRate: z.string().optional(),
      employmentType: z.enum(["clt", "terceirizado", "diarista"]).optional(),
      shirtSize: z.enum(["PP", "P", "M", "G", "GG", "XGG"]).optional(),
      pantsSize: z.string().optional(),
      shoeSize: z.string().optional(),
      bootSize: z.string().optional(),
      photoBase64: z.string().optional(), // base64 da foto
      faceDescriptor: z.string().optional(), // JSON do vetor facial
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let photoUrl: string | undefined;

      // Upload da foto para S3 se fornecida
      if (input.photoBase64) {
        const base64Data = input.photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `collaborators/${Date.now()}-${input.name.replace(/\s+/g, "-").toLowerCase()}.jpg`;
        const result = await storagePut(fileName, buffer, "image/jpeg");
        photoUrl = result.url;
      }

      const [inserted] = await db.insert(collaborators).values({
        name: input.name,
        email: input.email || undefined,
        phone: input.phone,
        cpf: input.cpf,
        rg: input.rg,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        role: input.role,
        pixKey: input.pixKey,
        dailyRate: input.dailyRate,
        employmentType: input.employmentType,
        shirtSize: input.shirtSize,
        pantsSize: input.pantsSize,
        shoeSize: input.shoeSize,
        bootSize: input.bootSize,
        photoUrl,
        faceDescriptor: input.faceDescriptor,
        createdBy: ctx.user.id,
      });

      const newId = (inserted as any).insertId;
      const created = await db.select().from(collaborators).where(eq(collaborators.id, newId)).limit(1);
      return created[0];
    }),

  // Atualizar colaborador
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zipCode: z.string().optional(),
      role: z.enum(collaboratorRoles).optional(),
      pixKey: z.string().optional(),
      dailyRate: z.string().optional(),
      employmentType: z.enum(["clt", "terceirizado", "diarista"]).optional(),
      shirtSize: z.enum(["PP", "P", "M", "G", "GG", "XGG"]).optional().nullable(),
      pantsSize: z.string().optional(),
      shoeSize: z.string().optional(),
      bootSize: z.string().optional(),
      photoBase64: z.string().optional(),
      faceDescriptor: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, photoBase64, ...rest } = input;
      const updateData: any = { ...rest };

      if (photoBase64) {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `collaborators/${Date.now()}-${id}.jpg`;
        const result = await storagePut(fileName, buffer, "image/jpeg");
        updateData.photoUrl = result.url;
      }

      if (updateData.active !== undefined) {
        updateData.active = updateData.active ? 1 : 0;
      }

      await db.update(collaborators).set(updateData).where(eq(collaborators.id, id));
      const updated = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
      return updated[0];
    }),

  // Salvar descritor facial (para biometria)
  saveFaceDescriptor: protectedProcedure
    .input(z.object({
      id: z.number(),
      faceDescriptor: z.string(), // JSON array de 128 floats
      photoBase64: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = { faceDescriptor: input.faceDescriptor };

      if (input.photoBase64) {
        const base64Data = input.photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `collaborators/face-${Date.now()}-${input.id}.jpg`;
        const result = await storagePut(fileName, buffer, "image/jpeg");
        updateData.photoUrl = result.url;
      }

      await db.update(collaborators).set(updateData).where(eq(collaborators.id, input.id));
      return { success: true };
    }),

  // Registrar presença biométrica
  registerAttendance: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      location: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      photoBase64: z.string().optional(),
      confidence: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let photoUrl: string | undefined;
      if (input.photoBase64) {
        const base64Data = input.photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `attendance/${Date.now()}-${input.collaboratorId}.jpg`;
        const result = await storagePut(fileName, buffer, "image/jpeg");
        photoUrl = result.url;
      }

      const now = new Date();
      const [inserted] = await db.insert(biometricAttendance).values({
        collaboratorId: input.collaboratorId,
        date: now,
        checkInTime: now,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        photoUrl,
        confidence: input.confidence,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      const newId = (inserted as any).insertId;
      return { success: true, id: newId };
    }),

  // Listar presenças (para o admin/Mary)
  listAttendance: protectedProcedure
    .input(z.object({
      date: z.string().optional(), // YYYY-MM-DD
      collaboratorId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const records = await db
        .select({
          id: biometricAttendance.id,
          collaboratorId: biometricAttendance.collaboratorId,
          collaboratorName: collaborators.name,
          collaboratorRole: collaborators.role,
          collaboratorPhoto: collaborators.photoUrl,
          date: biometricAttendance.date,
          checkInTime: biometricAttendance.checkInTime,
          checkOutTime: biometricAttendance.checkOutTime,
          location: biometricAttendance.location,
          latitude: biometricAttendance.latitude,
          longitude: biometricAttendance.longitude,
          photoUrl: biometricAttendance.photoUrl,
          confidence: biometricAttendance.confidence,
          notes: biometricAttendance.notes,
          createdAt: biometricAttendance.createdAt,
        })
        .from(biometricAttendance)
        .innerJoin(collaborators, eq(biometricAttendance.collaboratorId, collaborators.id))
        .orderBy(desc(biometricAttendance.checkInTime));

      return records;
    }),

  // Buscar todos os descritores faciais (para reconhecimento)
  getFaceDescriptors: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.select({
        id: collaborators.id,
        name: collaborators.name,
        role: collaborators.role,
        photoUrl: collaborators.photoUrl,
        faceDescriptor: collaborators.faceDescriptor,
      })
        .from(collaborators)
        .where(and(eq(collaborators.active, 1)));

      return result.filter(c => c.faceDescriptor !== null);
    }),
});
