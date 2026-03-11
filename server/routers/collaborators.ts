import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb, updateUserPasswordByEmail } from "../db";
import { collaborators, biometricAttendance, users } from "../../drizzle/schema";
import { eq, desc, and, like, or } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";
import bcrypt from "bcryptjs";

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
      photoBase64: z.string().optional(),
      faceDescriptor: z.string().optional(),
      password: z.string().min(4).optional(), // senha de acesso ao sistema
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let photoUrl: string | undefined;

      // Upload da foto para Cloudinary se fornecida
      if (input.photoBase64) {
        const result = await cloudinaryUpload(input.photoBase64, "btree/collaborators");
        photoUrl = result.url;
      }

      // Se tem email + senha, criar/atualizar usuário de sistema
      let userId: number | undefined;
      if (input.email && input.password) {
        const passwordHash = await bcrypt.hash(input.password, 10);
        await updateUserPasswordByEmail(input.email, passwordHash, 'user');
        // Buscar o id do usuário criado/atualizado
        const userRecord = await db.select({ id: users.id }).from(users)
          .where(eq(users.email, input.email)).limit(1);
        if (userRecord.length > 0) userId = userRecord[0].id;
      }

      const [inserted] = await db.insert(collaborators).values({
        name: input.name,
        email: input.email || undefined,
        phone: input.phone,
        cpf: input.cpf,
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
        userId: userId || null,
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
      password: z.string().min(4).optional(), // nova senha (opcional na edição)
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, photoBase64, password, ...rest } = input;
      const updateData: any = { ...rest };

      // Upload de nova foto se fornecida
      if (photoBase64) {
        const result = await cloudinaryUpload(photoBase64, "btree/collaborators");
        updateData.photoUrl = result.url;
      }

      if (updateData.active !== undefined) {
        updateData.active = updateData.active ? 1 : 0;
      }

      // Se tem email + nova senha, atualizar usuário de sistema
      if (input.email && password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await updateUserPasswordByEmail(input.email, passwordHash, 'user');
        // Vincular userId ao colaborador
        const userRecord = await db.select({ id: users.id }).from(users)
          .where(eq(users.email, input.email)).limit(1);
        if (userRecord.length > 0) {
          updateData.userId = userRecord[0].id;
        }
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
        const result = await cloudinaryUpload(input.photoBase64, "btree/faces");
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

      // Upload da foto (opcional, apenas para log)
      if (input.photoBase64) {
        try { await cloudinaryUpload(input.photoBase64); } catch {}
      }

      const now = new Date();
      const [inserted] = await db.insert(biometricAttendance).values({
        collaboratorId: input.collaboratorId,
        checkIn: now,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
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
          checkInTime: biometricAttendance.checkIn,
          checkOutTime: biometricAttendance.checkOut,
          location: biometricAttendance.location,
          latitude: biometricAttendance.latitude,
          longitude: biometricAttendance.longitude,
          confidence: biometricAttendance.confidence,
          notes: biometricAttendance.notes,
          createdAt: biometricAttendance.createdAt,
        })
        .from(biometricAttendance)
        .innerJoin(collaborators, eq(biometricAttendance.collaboratorId, collaborators.id))
        .orderBy(desc(biometricAttendance.checkIn));

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
