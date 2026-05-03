import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userPermissions, users, collaborators, clients } from "../../drizzle/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

// Módulos disponíveis no sistema
export const SYSTEM_MODULES = [
  // Maquinário
  { slug: "equipamentos",    label: "Equipamentos",         group: "Maquinário" },
  { slug: "pecas",           label: "Peças / Estoque",       group: "Maquinário" },
  { slug: "manutencao",      label: "Manutenção",            group: "Maquinário" },
  { slug: "horas-maquina",   label: "Horas de Máquina",      group: "Maquinário" },
  { slug: "motosserras",     label: "Motosserras",           group: "Maquinário" },
  // Pessoas
  { slug: "colaboradores",   label: "Colaboradores",         group: "Pessoas" },
  { slug: "presencas",       label: "Presenças",             group: "Pessoas" },
  // Operações
  { slug: "cargas",          label: "Controle de Cargas",    group: "Operações" },
  { slug: "minha-carga",     label: "Minha Carga",           group: "Operações" },
  { slug: "abastecimento",   label: "Abastecimento",         group: "Operações" },
  { slug: "gastos-extras",   label: "Gastos Extras",         group: "Operações" },
  { slug: "reflorestamento", label: "Reflorestamento",       group: "Operações" },
  { slug: "replantios",      label: "Replantios",            group: "Operações" },
  { slug: "gps",             label: "Rastreamento GPS",      group: "Operações" },
  { slug: "locais-gps",      label: "Locais GPS",            group: "Operações" },
  // Comercial
  { slug: "clientes",        label: "Clientes",              group: "Comercial" },
  { slug: "portal-cliente",  label: "Portal do Cliente",     group: "Comercial" },
  { slug: "pagamentos-clientes", label: "Pagamentos Clientes", group: "Comercial" },
  // Administrativo (valores financeiros)
  { slug: "financeiro",      label: "Módulo Financeiro",     group: "Administrativo" },
  { slug: "relatorios",      label: "Relatórios",            group: "Administrativo" },
  { slug: "dashboard-exec",  label: "Dashboard Executivo",   group: "Administrativo" },
  { slug: "acesso",          label: "Controle de Acesso",    group: "Administrativo" },
] as const;

export type ModuleSlug = typeof SYSTEM_MODULES[number]["slug"];

// Módulos que contêm informações financeiras sensíveis
export const FINANCIAL_MODULES: ModuleSlug[] = [
  "financeiro", "relatorios", "dashboard-exec", "pagamentos-clientes",
];

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
    modules: ["equipamentos", "horas-maquina", "presencas"],
  },
  motorista: {
    label: "Motorista",
    modules: ["equipamentos", "minha-carga", "abastecimento"],
  },
  motosserrista: {
    label: "Motosserrista",
    modules: ["equipamentos", "manutencao", "motosserras"],
  },
  encarregado: {
    label: "Encarregado de Roça",
    modules: ["cargas", "minha-carga", "gastos-extras", "abastecimento", "equipamentos", "colaboradores", "presencas", "manutencao"],
  },
  lider: {
    label: "Líder de Equipe",
    modules: ["presencas", "colaboradores", "equipamentos", "cargas", "minha-carga", "gastos-extras", "horas-maquina", "motosserras", "abastecimento", "locais-gps"],
  },
  equipe: {
    label: "Equipe de Campo",
    modules: ["presencas", "equipamentos", "minha-carga", "gastos-extras", "horas-maquina", "motosserras", "abastecimento", "locais-gps"],
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

  // Listar clientes (para seletor de clientes permitidos)
  listClients: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allClients = await db.select({ id: clients.id, name: clients.name }).from(clients);
    return allClients;
  }),

  // Listar todos os usuários E colaboradores com suas permissões
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Buscar usuários da tabela users
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.name);

    // Buscar TODOS os colaboradores ativos (não só os com userId)
    const allCollabs = await db.select({
      id: collaborators.id,
      name: collaborators.name,
      email: collaborators.email,
      phone: collaborators.phone,
      userId: collaborators.userId,
      role: collaborators.role,
      clientId: collaborators.clientId,
      active: collaborators.active,
    }).from(collaborators)
      .where(eq(collaborators.active, 1))
      .orderBy(collaborators.name);

    const allPerms = await db.select().from(userPermissions);
    const permMap = Object.fromEntries(allPerms.map(p => [p.userId, p]));

    // Mapear usuários existentes (que fizeram login OAuth)
    const result: Array<{
      id: number;
      name: string | null;
      email: string | null;
      role: string | null;
      createdAt: string | null;
      isCollaborator: boolean;
      collaboratorId: number | null;
      collaboratorRole: string | null;
      collaboratorClientId: number | null;
      hasLoggedIn: boolean;
      phone: string | null;
      modules: string[] | null;
      profile: string;
      allowedClientIds: number[] | null;
      allowedWorkLocationIds: number[] | null;
    }> = [];

    // 1. Adicionar usuários que fizeram login
    const userIdsFromUsers = new Set(allUsers.map(u => u.id));
    for (const u of allUsers) {
      const collab = allCollabs.find(c => c.userId === u.id);
      result.push({
        id: u.id,
        name: collab?.name || u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        isCollaborator: !!collab,
        collaboratorId: collab?.id || null,
        collaboratorRole: collab?.role || null,
        collaboratorClientId: collab?.clientId || null,
        hasLoggedIn: true,
        phone: collab?.phone || null,
        modules: u.role === "admin"
          ? null
          : permMap[u.id]?.modules
            ? JSON.parse(permMap[u.id].modules!) as string[]
            : [],
        profile: permMap[u.id]?.profile || "custom",
        allowedClientIds: permMap[u.id]?.allowedClientIds
          ? JSON.parse(permMap[u.id].allowedClientIds!) as number[]
          : null,
        allowedWorkLocationIds: permMap[u.id]?.allowedWorkLocationIds
          ? JSON.parse(permMap[u.id].allowedWorkLocationIds!) as number[]
          : null,
      });
    }

    // 2. Adicionar colaboradores que NÃO fizeram login (sem userId ou userId não está em users)
    for (const c of allCollabs) {
      if (c.userId && userIdsFromUsers.has(c.userId)) continue; // já incluído acima
      result.push({
        id: -(c.id), // ID negativo para diferenciar de users (colaborador sem login)
        name: c.name,
        email: c.email,
        role: null,
        createdAt: null,
        isCollaborator: true,
        collaboratorId: c.id,
        collaboratorRole: c.role,
        collaboratorClientId: c.clientId,
        hasLoggedIn: false,
        phone: c.phone,
        modules: [],
        profile: "custom",
        allowedClientIds: c.clientId ? [c.clientId] : null,
        allowedWorkLocationIds: null,
      });
    }

    return result;
  }),

  // Buscar permissões do usuário atual
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { modules: null, profile: "admin", allowedClientIds: null, allowedWorkLocationIds: null };

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [perm] = await db.select().from(userPermissions)
      .where(eq(userPermissions.userId, ctx.user.id));

    if (!perm) {
      // Fallback: verificar se o usuário é um colaborador vinculado a um cliente
      const [collab] = await db.select({
        clientId: collaborators.clientId,
        role: collaborators.role,
      }).from(collaborators).where(eq(collaborators.userId, ctx.user.id));

      if (collab?.clientId) {
        // Colaborador vinculado a um cliente: dar acesso baseado no role do colaborador
        const collabRole = collab.role || "custom";
        const profileModules = PROFILES[collabRole]?.modules || [];
        return {
          modules: profileModules.length > 0 ? profileModules : [],
          profile: collabRole,
          allowedClientIds: [collab.clientId],
          allowedWorkLocationIds: null,
        };
      }

      return { modules: [], profile: "custom", allowedClientIds: null, allowedWorkLocationIds: null };
    }

    return {
      modules: perm.modules ? JSON.parse(perm.modules) as string[] : [],
      profile: perm.profile || "custom",
      allowedClientIds: perm.allowedClientIds ? JSON.parse(perm.allowedClientIds) as number[] : null,
      allowedWorkLocationIds: perm.allowedWorkLocationIds ? JSON.parse(perm.allowedWorkLocationIds) as number[] : null,
    };
  }),

  // Definir permissões de um usuário (apenas admin)
  setPermissions: protectedProcedure
    .input(z.object({
      userId: z.number(),
      modules: z.array(z.string()).nullable(),
      profile: z.string().default("custom"),
      allowedClientIds: z.array(z.number()).nullable().optional(),
      allowedWorkLocationIds: z.array(z.number()).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const modulesJson = input.modules === null ? null : JSON.stringify(input.modules);
      const allowedClientIdsJson = input.allowedClientIds === null || input.allowedClientIds === undefined
        ? null : JSON.stringify(input.allowedClientIds);
      const allowedWorkLocationIdsJson = input.allowedWorkLocationIds === null || input.allowedWorkLocationIds === undefined
        ? null : JSON.stringify(input.allowedWorkLocationIds);

      // Se userId é negativo, é um colaborador sem login - não podemos salvar em user_permissions
      // Mas podemos atualizar o client_id do colaborador
      if (input.userId < 0) {
        const collabId = Math.abs(input.userId);
        // Atualizar o client_id do colaborador baseado nos allowedClientIds
        const clientId = input.allowedClientIds && input.allowedClientIds.length > 0
          ? input.allowedClientIds[0] : null;
        await db.update(collaborators).set({ clientId }).where(eq(collaborators.id, collabId));
        return { success: true };
      }

      // Upsert para usuários com login
      const [existing] = await db.select().from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));

      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profile,
          allowedClientIds: allowedClientIdsJson,
          allowedWorkLocationIds: allowedWorkLocationIdsJson,
          updatedBy: ctx.user.id,
        }).where(eq(userPermissions.userId, input.userId));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          modules: modulesJson,
          profile: input.profile,
          allowedClientIds: allowedClientIdsJson,
          allowedWorkLocationIds: allowedWorkLocationIdsJson,
          updatedBy: ctx.user.id,
        });
      }

      // Se tem allowedClientIds, atualizar o client_id do colaborador vinculado
      const [collab] = await db.select({ id: collaborators.id }).from(collaborators)
        .where(eq(collaborators.userId, input.userId));
      if (collab && input.allowedClientIds && input.allowedClientIds.length > 0) {
        await db.update(collaborators).set({ clientId: input.allowedClientIds[0] })
          .where(eq(collaborators.id, collab.id));
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

      // Não pode aplicar perfil a colaborador sem login
      if (input.userId < 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Colaborador precisa fazer login para receber perfil completo" });
      }

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

  // Atualizar client_id de um colaborador
  setCollaboratorClient: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      clientId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(collaborators).set({ clientId: input.clientId })
        .where(eq(collaborators.id, input.collaboratorId));
      return { success: true };
    }),
});
