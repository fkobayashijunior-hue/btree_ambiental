// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, like, or, desc } from "drizzle-orm";
import { hashPassword } from "../auth";
import { mapaSuperiores, definirSuperior } from "../utils/hierarquia";

export const usersManagementRouter = router({
  // Listar todos os usuários (admin only)
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        loginMethod: users.loginMethod,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).$dynamic();

      const sup = await mapaSuperiores(db);
      const results = (await query.orderBy(desc(users.createdAt))).map((u) => ({ ...u, superiorId: sup.get(u.id) ?? null }));

      // Filter in memory if search provided
      if (input?.search) {
        const s = input.search.toLowerCase();
        return results.filter(u =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.role.toLowerCase().includes(s)
        );
      }

      return results;
    }),

  // Criar novo usuário (admin only)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(4),
      role: z.enum(["user", "admin"]).default("user"),
      superiorId: z.number().int().positive().nullable().optional(), // superior imediato (hierarquia das Tarefas)
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      // Check if email already exists
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
      }

      const passwordHash = await hashPassword(input.password);
      const [res] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "email",
        role: input.role,
        lastSignedIn: new Date().toISOString(),
      });
      if (input.superiorId && res?.insertId) await definirSuperior(db, Number(res.insertId), input.superiorId);

      return { success: true };
    }),

  // Atualizar usuário (admin only)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: z.enum(["user", "admin"]).optional(),
      password: z.string().min(4).optional(),
      superiorId: z.number().int().positive().nullable().optional(), // null remove o superior
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (input.name) updateData.name = input.name;
      if (input.email) updateData.email = input.email;
      if (input.role) updateData.role = input.role;
      if (input.password) {
        updateData.passwordHash = await hashPassword(input.password);
      }

      if (input.superiorId !== undefined) await definirSuperior(db, input.id, input.superiorId);
      await db.update(users).set(updateData).where(eq(users.id, input.id));
      return { success: true };
    }),

  // Remover usuário (admin only, não pode remover a si mesmo)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      if (ctx.user.id === input.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode remover sua própria conta" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      await db.delete(users).where(eq(users.id, input.id));
      // quem estava abaixo dele fica sem superior (o administrador define outro)
      await definirSuperior(db, input.id, null);
      await db.$client.execute(`DELETE FROM usuario_superior WHERE superior_user_id = ?`, [input.id]);
      return { success: true };
    }),
});
