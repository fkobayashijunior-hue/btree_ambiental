import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb, updateUserPasswordByEmail } from "../db";
import { collaborators, biometricAttendance, users, userPermissions } from "../../drizzle/schema";
import { eq, desc, and, like, or, inArray, sql } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";
import bcrypt from "bcryptjs";

// Helper: resolve allowedClientIds for the current user
async function resolveAllowedClientIds(db: any, ctx: any): Promise<number[] | null> {
  if (ctx.user.role === "admin") return null;
  let allowedClientIds: number[] | null = null;
  try {
    const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
    if (perm?.allowedClientIds) {
      allowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
    }
  } catch {
    try {
      const [rows] = await db.execute(sql`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`) as any;
      const row = (rows as any[])?.[0];
      if (row?.allowed_client_ids) {
        allowedClientIds = JSON.parse(row.allowed_client_ids) as number[];
      }
    } catch { /* ignore */ }
  }
  // Fallback: collaborator.clientId
  if (!allowedClientIds) {
    try {
      const [collab] = await db.select({ clientId: collaborators.clientId })
        .from(collaborators).where(eq(collaborators.userId, ctx.user.id));
      if (collab?.clientId) {
        allowedClientIds = [collab.clientId];
      }
    } catch { /* ignore */ }
  }
  return allowedClientIds;
}

const collaboratorRoles = [
  "administrativo", "encarregado", "mecanico", "motosserrista",
  "carregador", "operador", "motorista", "terceirizado"
] as const;

export const collaboratorsRouter = router({
  // Listar todos os colaboradores (filtrado por allowedClientIds para encarregados)
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.string().optional(),
      active: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Resolve allowed client IDs
      const allowedClientIds = await resolveAllowedClientIds(db, ctx);

      const conditions: any[] = [];

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

      // Filtro por clientId se não é admin
      if (allowedClientIds && allowedClientIds.length > 0) {
        conditions.push(inArray(collaborators.clientId, allowedClientIds));
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

  // Criar colaborador (encarregado só pode cadastrar para o cliente dele)
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
      clientId: z.number().nullable().optional(), // local de trabalho (cliente vinculado)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Se não é admin, forçar clientId do encarregado
      const allowedClientIds = await resolveAllowedClientIds(db, ctx);
      let finalClientId = input.clientId ?? null;
      if (allowedClientIds && allowedClientIds.length > 0) {
        // Forçar o clientId para o primeiro cliente permitido (se não informado ou se informou um não permitido)
        if (!finalClientId || !allowedClientIds.includes(finalClientId)) {
          finalClientId = allowedClientIds[0];
        }
      }

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
        clientId: finalClientId,
        createdBy: ctx.user.id,
      });

      const newId = (inserted as any).insertId;
      const created = await db.select().from(collaborators).where(eq(collaborators.id, newId)).limit(1);
      return created[0];
    }),

  // Vincular colaborador a usuário do sistema
  linkUser: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      userId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(collaborators).set({ userId: input.userId } as any).where(eq(collaborators.id, input.collaboratorId));
      return { success: true };
    }),

  // Listar usuários disponíveis para vincular (que ainda não estão vinculados a outro colaborador)
  listAvailableUsers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(users.name);
    const allCollabs = await db.select({ userId: collaborators.userId }).from(collaborators);
    const linkedUserIds = new Set(allCollabs.map(c => c.userId).filter(Boolean));
    return allUsers.map(u => ({ ...u, isLinked: linkedUserIds.has(u.id) }));
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
      clientId: z.number().nullable().optional(), // local de trabalho (cliente vinculado)
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

  // Registrar ponto (manual ou biométrico)
  registerAttendance: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      checkInOverride: z.string().optional(), // ISO string para registro manual
      checkOutOverride: z.string().optional(), // ISO string para saída manual
      location: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const checkInTime = input.checkInOverride ? new Date(input.checkInOverride) : new Date();
      const checkOutTime = input.checkOutOverride ? new Date(input.checkOutOverride) : undefined;

      const [inserted] = await db.insert(biometricAttendance).values({
        collaboratorId: input.collaboratorId,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        registeredBy: ctx.user.id,
        notes: input.notes,
      });

      const newId = (inserted as any).insertId;
      return { success: true, id: newId };
    }),

  // Listar registros de ponto (filtrado por allowedClientIds)
  listAttendance: protectedProcedure
    .input(z.object({
      date: z.string().optional(), // YYYY-MM-DD
      collaboratorId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Resolve allowed client IDs
      const allowedClientIds = await resolveAllowedClientIds(db, ctx);

      const baseQuery = db
        .select({
          id: biometricAttendance.id,
          collaboratorId: biometricAttendance.collaboratorId,
          collaboratorName: collaborators.name,
          collaboratorRole: collaborators.role,
          collaboratorPhoto: collaborators.photoUrl,
          collaboratorClientId: collaborators.clientId,
          checkInTime: biometricAttendance.checkIn,
          checkOutTime: biometricAttendance.checkOut,
          location: biometricAttendance.location,
          latitude: biometricAttendance.latitude,
          longitude: biometricAttendance.longitude,
          notes: biometricAttendance.notes,
          createdAt: biometricAttendance.createdAt,
        })
        .from(biometricAttendance)
        .innerJoin(collaborators, eq(biometricAttendance.collaboratorId, collaborators.id));

      let conditions: any[] = [];
      if (input?.collaboratorId) {
        conditions.push(eq(biometricAttendance.collaboratorId, input.collaboratorId));
      }
      // Filtrar por clientId do colaborador
      if (allowedClientIds && allowedClientIds.length > 0) {
        conditions.push(inArray(collaborators.clientId, allowedClientIds));
      }

      if (conditions.length > 0) {
        const records = await (baseQuery as any)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(biometricAttendance.checkIn));
        return records;
      }

      const records = await (baseQuery as any).orderBy(desc(biometricAttendance.checkIn));
      return records;
    }),

  // Buscar todos os descritores faciais (para reconhecimento)
  getMyPhoto: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select({ photoUrl: collaborators.photoUrl })
        .from(collaborators)
        .where(eq(collaborators.userId, ctx.user.id))
        .limit(1);
      return result[0]?.photoUrl ?? null;
    }),

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
