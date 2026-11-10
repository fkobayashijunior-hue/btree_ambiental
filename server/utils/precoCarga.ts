// Preço editável de cada carga entregue a comprador (usado só em Contas a Receber).
// A coluna é criada sob demanda e NÃO entra no schema Drizzle (consultas "select *" de cargo_loads seguem iguais).
type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };

let garantida: Promise<void> | null = null;
export function ensureBuyerPriceOverride(db: Db): Promise<void> {
  if (!garantida) {
    garantida = (async () => {
      const [r] = (await db.$client.execute(
        `SELECT COUNT(*) AS n FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'cargo_loads' AND column_name = 'buyer_price_override'`
      )) as any;
      if (Number((r as any[])[0]?.n ?? 0) === 0) {
        await db.$client.execute(`ALTER TABLE cargo_loads ADD COLUMN buyer_price_override VARCHAR(20) NULL`);
      }
    })().catch((e) => { garantida = null; throw e; });
  }
  return garantida;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Preço da carga: o preço editado, se existir; senão o preço do comprador. */
export function precoDaCarga(r: { buyer_price_override?: unknown; price_per_unit?: unknown }): number {
  return num(r.buyer_price_override) ?? num(r.price_per_unit) ?? 0;
}
export const temPrecoEditado = (r: { buyer_price_override?: unknown }): boolean => num(r.buyer_price_override) !== null;

/** Valida o preço digitado ("250", "250,50"). Retorna string para gravar, ou null para limpar. Lança erro se inválido. */
export function normalizarPreco(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const n = num(raw);
  if (n === null || n < 0 || n > 1_000_000) throw new Error("Preço inválido");
  return String(Math.round(n * 100) / 100);
}
