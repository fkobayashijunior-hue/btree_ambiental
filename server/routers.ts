import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { collaboratorsRouter } from "./routers/collaborators";
import { sectorsRouter } from "./routers/sectors";
import { usersManagementRouter } from "./routers/usersManagement";
import { cargoLoadsRouter } from "./routers/cargoLoads";
import { machineHoursRouter } from "./routers/machineHours";
import { vehicleRecordsRouter } from "./routers/vehicleRecords";
import { partsRouter } from "./routers/parts";
import { clientsRouter } from "./routers/clientsRouter";
import { clientPortalRouter } from "./routers/clientPortal";
import { collaboratorDocumentsRouter } from "./routers/collaboratorDocuments";
import { equipmentDetailRouter } from "./routers/equipmentDetail";
import { purchaseOrdersRouter } from "./routers/purchaseOrders";
import { attendanceRouter } from "./routers/attendance";
import { z } from "zod";
import { registerUser, loginUser, hashPassword } from "./auth";
import { SignJWT } from "jose";
import { getUserByEmail, upsertUser, updateUserPasswordByEmail, createPasswordResetToken, getValidResetToken, markTokenAsUsed } from "./db";
import { sendPasswordResetEmail } from "./email";
import crypto from "crypto";

async function createSessionToken(userId: number, email: string, name: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "btree-secret-key");
  const expiresAt = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
  return new SignJWT({ userId: String(userId), email, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await registerUser(input);
          
          // Criar sessão automática após registro
          const sessionToken = await createSessionToken(user.id, user.email, user.name);

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Erro ao registrar usuário');
        }
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await loginUser(input.email, input.password);
          
          // Criar sessão
          const sessionToken = await createSessionToken(user.id, user.email, user.name);

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Erro ao fazer login');
        }
      }),

    // Rota de seed para criar/atualizar admin (apenas para uso interno)
    seedAdmin: publicProcedure
      .input(z.object({
        seedKey: z.string(),
        email: z.string().email(),
        name: z.string(),
        password: z.string().min(4),
      }))
      .mutation(async ({ input }) => {
        // Chave secreta para proteger esta rota
        if (input.seedKey !== 'BTREE_SEED_2026') {
          throw new Error('Chave inválida');
        }
        const passwordHash = await hashPassword(input.password);
        const result = await updateUserPasswordByEmail(input.email, passwordHash, 'admin');
        return { success: true, message: `Admin ${input.email} ${result.action === 'updated' ? 'atualizado' : 'criado'} com sucesso` };
      }),

    // Solicitar recuperação de senha
    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().email('Email inválido'),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Sempre retornar sucesso para não revelar se email existe
        if (!user) {
          return { success: true };
        }

        const token = crypto.randomBytes(48).toString('hex');
        await createPasswordResetToken(user.id, token);

        const baseUrl = input.origin || 'https://btreeambiental.com';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await sendPasswordResetEmail(user.email, user.name, resetUrl);

        return { success: true };
      }),

    // Redefinir senha com token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      }))
      .mutation(async ({ input }) => {
        const resetToken = await getValidResetToken(input.token);
        if (!resetToken) {
          throw new Error('Token inválido ou expirado. Solicite uma nova recuperação de senha.');
        }

        const passwordHash = await hashPassword(input.password);
        const { getDb } = await import('./db');
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error('Database not available');

        await dbInstance.update(users)
          .set({ passwordHash, loginMethod: 'email', updatedAt: new Date() })
          .where(eq(users.id, resetToken.userId));

        await markTokenAsUsed(resetToken.id);

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  collaborators: collaboratorsRouter,
  sectors: sectorsRouter,
  usersManagement: usersManagementRouter,
  cargoLoads: cargoLoadsRouter,
  machineHours: machineHoursRouter,
  vehicleRecords: vehicleRecordsRouter,
  parts: partsRouter,
  clients: clientsRouter,
  clientPortal: clientPortalRouter,
  collaboratorDocuments: collaboratorDocumentsRouter,
  equipmentDetail: equipmentDetailRouter,
  purchaseOrders: purchaseOrdersRouter,
  attendance: attendanceRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
