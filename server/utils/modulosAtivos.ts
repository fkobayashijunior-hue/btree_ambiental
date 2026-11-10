// Módulos ativos/inativos do sistema inteiro (administração). Tabela criada sob demanda.
// Um módulo inativo some do menu, do Painel e do Controle de Acesso, e o servidor recusa as chamadas dele.
let ensurePromise: Promise<void> | null = null;
export function ensureModuloConfig(db: any): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS modulo_config (
          slug VARCHAR(60) PRIMARY KEY,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          atualizado_por INT NULL,
          atualizado_por_nome VARCHAR(120) NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    })().catch((e) => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

// Cache curto: o servidor consulta a cada chamada de módulo, então evitamos ir ao banco toda vez.
let cache: { em: number; inativos: Set<string> } | null = null;
const TTL_MS = 15_000;

export function limparCacheModulos() { cache = null; }

export async function modulosInativos(): Promise<Set<string>> {
  if (cache && Date.now() - cache.em < TTL_MS) return cache.inativos;
  try {
    const { getDb } = await import("../db");
    const db: any = await getDb();
    if (!db) return new Set();
    await ensureModuloConfig(db);
    const [rows] = (await db.$client.execute(`SELECT slug FROM modulo_config WHERE ativo = 0`)) as any;
    const inativos = new Set<string>((rows as any[]).map((r) => String(r.slug)));
    cache = { em: Date.now(), inativos };
    return inativos;
  } catch {
    // se a consulta falhar, não derruba o sistema: considera tudo ativo
    return new Set();
  }
}
