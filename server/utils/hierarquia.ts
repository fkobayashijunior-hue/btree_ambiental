// Hierarquia entre usuários do sistema: cada usuário pode ter um superior imediato.
// Fica numa tabela própria (não altera a tabela users), criada sob demanda.
import { TRPCError } from "@trpc/server";

let pronto: Promise<void> | null = null;
export function ensureHierarquia(db: any): Promise<void> {
  if (!pronto) {
    pronto = db.$client.execute(`
      CREATE TABLE IF NOT EXISTS usuario_superior (
        user_id INT NOT NULL PRIMARY KEY,
        superior_user_id INT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY usuario_superior_sup (superior_user_id)
      )`).then(() => undefined).catch((e: any) => { pronto = null; throw e; });
  }
  return pronto!;
}

/** userId → superior imediato */
export async function mapaSuperiores(db: any): Promise<Map<number, number>> {
  await ensureHierarquia(db);
  const [rows] = (await db.$client.execute(`SELECT user_id, superior_user_id FROM usuario_superior`)) as any;
  return new Map((rows as any[]).map((r) => [Number(r.user_id), Number(r.superior_user_id)]));
}

/** Todos que estão abaixo do usuário (diretos e indiretos). */
export function subordinadosDe(mapa: Map<number, number>, userId: number): Set<number> {
  const filhos = new Map<number, number[]>();
  for (const [u, s] of Array.from(mapa.entries())) filhos.set(s, [...(filhos.get(s) ?? []), u]);
  const res = new Set<number>();
  const fila = [...(filhos.get(userId) ?? [])];
  while (fila.length) {
    const u = fila.shift()!;
    if (res.has(u) || u === userId) continue;
    res.add(u);
    fila.push(...(filhos.get(u) ?? []));
  }
  return res;
}

/** Define (ou remove, com null) o superior de um usuário, sem permitir ciclo (A chefe de B e B chefe de A). */
export async function definirSuperior(db: any, userId: number, superiorId: number | null): Promise<void> {
  await ensureHierarquia(db);
  if (!superiorId) {
    await db.$client.execute(`DELETE FROM usuario_superior WHERE user_id = ?`, [userId]);
    return;
  }
  if (superiorId === userId) throw new TRPCError({ code: "BAD_REQUEST", message: "O usuário não pode ser superior de si mesmo" });
  const mapa = await mapaSuperiores(db);
  if (subordinadosDe(mapa, userId).has(superiorId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Esse superior está abaixo deste usuário na hierarquia" });
  }
  await db.$client.execute(
    `INSERT INTO usuario_superior (user_id, superior_user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE superior_user_id = VALUES(superior_user_id)`,
    [userId, superiorId]
  );
}
