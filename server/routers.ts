import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { registerUser, loginUser, hashPassword } from "./auth";
import { sdk } from "./_core/sdk";
import { getUserByEmail, upsertUser } from "./db";

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
          const sessionToken = await sdk.createSessionToken(user.email, {
            name: user.name,
            expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 ano
          });

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
          const sessionToken = await sdk.createSessionToken(user.email, {
            name: user.name,
            expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 ano
          });

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
        await upsertUser({
          email: input.email,
          name: input.name,
          passwordHash,
          loginMethod: 'email',
          role: 'admin',
          lastSignedIn: new Date(),
        });
        return { success: true, message: `Admin ${input.email} criado/atualizado com sucesso` };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
