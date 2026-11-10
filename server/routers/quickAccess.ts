// Atalhos do Painel: cada administrador escolhe quais ícones aparecem e em que ordem (salvo por usuário, vale em qualquer aparelho).
// Quem não é administrador sempre vê o padrão filtrado pelos módulos a que tem acesso.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";

async function getDbOrThrow() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

let ensurePromise: Promise<void> | null = null;
function ensureTable(db: any): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS user_quick_access (
          user_id INT PRIMARY KEY,
          itens_json TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    })().catch((e) => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

export const quickAccessRouter = router({
  // null = sem personalização (usa o padrão)
  get: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") return { itens: null as string[] | null };
    const db = await getDbOrThrow();
    await ensureTable(db);
    const [rows] = (await db.$client.execute(`SELECT itens_json FROM user_quick_access WHERE user_id = ?`, [ctx.user.id])) as any;
    const r = (rows as any[])[0];
    if (!r) return { itens: null };
    try {
      const itens = JSON.parse(r.itens_json);
      return { itens: Array.isArray(itens) ? (itens.filter((x) => typeof x === "string") as string[]) : null };
    } catch {
      return { itens: null };
    }
  }),

  save: protectedProcedure
    .input(z.object({ itens: z.array(z.string().max(80)).max(60) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Só administradores podem personalizar o Painel" });
      const db = await getDbOrThrow();
      await ensureTable(db);
      await db.$client.execute(
        `INSERT INTO user_quick_access (user_id, itens_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE itens_json = VALUES(itens_json)`,
        [ctx.user.id, JSON.stringify(Array.from(new Set(input.itens)))]
      );
      return { ok: true };
    }),

  // Volta ao padrão
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDbOrThrow();
    await ensureTable(db);
    await db.$client.execute(`DELETE FROM user_quick_access WHERE user_id = ?`, [ctx.user.id]);
    return { ok: true };
  }),
});
