import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userPermissions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Módulos disponíveis no sistema
export const SYSTEM_MODULES = [
  { slug: "equipamentos",    label: "Equipamentos",         group: "Maquinário" },
  { slug: "pecas",           label: "Peças / Estoque",       group: "Maquinário" },
  { slug: "manutencao",      label: "Manutenção",            group: "Maquinário" },
  { slug: "horas-maquina",   label: "Horas de Máquina",      group: "Maquinário" },
  { slug: "colaboradores",   label: "Colaboradores",         group: "Pessoas" },
  { slug: "presencas",       label: "Presenças",             group: "Pessoas" },
  { slug: "reflorestamento", label: "Reflorestamento",       group: "Operações" },
  { slug: "cargas",          label: "Controle de Cargas",    group: "Operações" },
  { slug: "clientes",        label: "Clientes",              group: "Comercial" },
  { slug: "portal-cliente",  label: "Portal do Cliente",     group: "Comercial" },
  { slug: "gps",             label: "Rastreamento GPS",      group: "Operações" },
  { slug: "motosserras",    label: "Motosserras",           group: "Maquinário" },
  { slug: "relatorios",      label: "Relatórios",            group: "Administrativo" },
  { slug: "acesso",          label: "Controle de Acesso",    group: "Administrativo" },
] as const;

export type ModuleSlug = typeof SYSTEM_MODULES[number]["slug"];

// Perfis pré-definidos
export const PROFILES: Record<string, { label: string; modules: ModuleSlug[] }> = {
  admin: {
    label: "Administrador",
    modules: SYSTEM_MODULES.map(m => m.slug),
  },
  mecanico: {
    label: "Mecânico",
    modules: ["equipamentos", "pecas", "manutencao", "horas-maquina", "motosserras"],
  },
  operador: {
    label: "Operador",
    modules: ["equipamentos", "horas-maquina"],
  },
  motorista: {
    label: "Motorista",
    modules: ["equipamentos", "cargas"],
  },
  motosserrista: {
    label: "Motosserrista",
    modules: ["equipamentos", "manutencao", "motosserras"],
  },
  custom: {
    label: "Personalizado",
    modules: [],
  },
};

export const permissionsRouter = router({
  // Listar módulos disponíveis
  listModules: protectedProcedure.query(() => {
    return SYSTEM_MODULES;
  }),

  // Listar perfis pré-definidos
  listProfiles: protectedProcedure.query(() => {
    return Object.entries(PROFILES).map(([key, val]) => ({
      key,
      label: val.label,
      modules: val.modules,
    }));
  }),

  // Listar todos os usuários com suas permissões
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.name);

    const allPerms = await db.select().from(userPermissions);
    const permMap = Object.fromEntries(allPerms.map(p => [p.userId, p]));

    return allUsers.map(u => ({
      ...u,
      permissions: permMap[u.id] || null,
      modules: u.role === "admin"
        ? null // null = acesso total
        : permMap[u.id]?.modules
          ? JSON.parse(permMap[u.id].modules!) as string[]
          : [],
      profile: permMap[u.id]?.profile || "custom",
    }));
  }),

  // Buscar permissões do usuário atual
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { modules: null, profile: "admin" }; // null = tudo

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [perm] = await db.select().from(userPermissions)
      .where(eq(userPermissions.userId, ctx.user.id));

    if (!perm) return { modules: [], profile: "custom" };
    return {
      modules: perm.modules ? JSON.parse(perm.modules) as string[] : [],
      profile: perm.profile || "custom",
    };
  }),

  // Definir permissões de um usuário (apenas admin)
  setPermissions: protectedProcedure
    .input(z.object({
      userId: z.number(),
      modules: z.array(z.string()).nullable(), // null = acesso total
      profile: z.string().default("custom"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const modulesJson = input.modules === null ? null : JSON.stringify(input.modules);

      // Upsert
      const [existing] = await db.select().from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));

      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profile,
          updatedBy: ctx.user.id,
        }).where(eq(userPermissions.userId, input.userId));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          modules: modulesJson,
          profile: input.profile,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  // Aplicar perfil pré-definido a um usuário
  applyProfile: protectedProcedure
    .input(z.object({
      userId: z.number(),
      profileKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const profile = PROFILES[input.profileKey];
      if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Perfil inválido" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const modulesJson = input.profileKey === "admin" ? null : JSON.stringify(profile.modules);

      const [existing] = await db.select().from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));

      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profileKey,
          updatedBy: ctx.user.id,
        }).where(eq(userPermissions.userId, input.userId));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          modules: modulesJson,
          profile: input.profileKey,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),
});
