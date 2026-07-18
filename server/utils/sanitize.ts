/**
 * Utilitários de sanitização para campos numéricos.
 * Garante que valores monetários e numéricos sejam sempre salvos com ponto decimal.
 */

/**
 * Converte um valor numérico (string ou number) para string com ponto decimal.
 * Aceita "6,40", "6.40", 6.40 → retorna "6.40"
 * Retorna null/undefined se o valor for vazio.
 */
export function sanitizeNumeric(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim().replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return String(num);
}

/**
 * Converte um valor numérico para número (float).
 * Aceita "6,40", "6.40", 6.40 → retorna 6.40
 * Retorna 0 se o valor for inválido.
 */
export function toFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const str = String(value).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata um valor numérico para exibição em BRL (ex: "6.40" → "R$ 6,40")
 */
export function formatBRL(value: string | number | null | undefined): string {
  const num = toFloat(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Sanitiza um objeto inteiro, convertendo campos numéricos identificados.
 * Recebe o objeto e a lista de campos que devem ser sanitizados.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  numericFields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of numericFields) {
    if (field in result) {
      result[field] = sanitizeNumeric(result[field] as string | number | null | undefined) as T[keyof T];
    }
  }
  return result;
}
