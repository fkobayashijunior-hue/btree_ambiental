// Administração: liga/desliga módulos do sistema inteiro.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { SYSTEM_MODULES } from "./permissions";
import { ensureModuloConfig, modulosInativos, limparCacheModulos } from "../utils/modulosAtivos";

async function getDbOrThrow() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

export const modulosConfigRouter = router({
  // Qualquer usuário logado: quais módulos estão desativados (a tela usa para esconder menu e atalhos).
  inativos: protectedProcedure.query(async () => Array.from(await modulosInativos())),

  // Administrador: todos os módulos com o estado de cada um.
  listar: adminProcedure.query(async () => {
    const db = await getDbOrThrow();
    await ensureModuloConfig(db);
    const [rows] = (await db.$client.execute(`SELECT slug, ativo, atualizado_por_nome, updated_at FROM modulo_config`)) as any;
    const mapa = new Map<string, { ativo: boolean; por: string | null; em: string | null }>();
    for (const r of rows as any[]) {
      mapa.set(String(r.slug), {
        ativo: !!r.ativo,
        por: (r.atualizado_por_nome as string | null) ?? null,
        em: r.updated_at ? (r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)) : null,
      });
    }
    return SYSTEM_MODULES.map((m) => ({
      slug: m.slug as string, label: m.label as string, grupo: m.group as string,
      ativo: mapa.get(m.slug)?.ativo ?? true, atualizadoPor: mapa.get(m.slug)?.por ?? null, atualizadoEm: mapa.get(m.slug)?.em ?? null,
    }));
  }),

  definir: adminProcedure
    .input(z.object({ slug: z.string().max(60), ativo: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!SYSTEM_MODULES.some((m) => m.slug === input.slug)) throw new TRPCError({ code: "BAD_REQUEST", message: "Módulo desconhecido" });
      const db = await getDbOrThrow();
      await ensureModuloConfig(db);
      await db.$client.execute(
        `INSERT INTO modulo_config (slug, ativo, atualizado_por, atualizado_por_nome) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ativo = VALUES(ativo), atualizado_por = VALUES(atualizado_por), atualizado_por_nome = VALUES(atualizado_por_nome)`,
        [input.slug, input.ativo ? 1 : 0, ctx.user.id ?? null, (ctx.user as any).name ?? null]
      );
      limparCacheModulos();
      return { ok: true };
    }),
});
