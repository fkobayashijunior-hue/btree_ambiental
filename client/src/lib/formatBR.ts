/**
 * Formata número no padrão brasileiro: 4.000,00
 * @param val - valor numérico ou string
 * @param decimals - casas decimais (padrão 2)
 */
export function formatBR(val: string | number | null | undefined, decimals = 2): string {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0').replace(',', '.'));
  if (isNaN(n)) return '0,' + '0'.repeat(decimals);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Formata valor monetário no padrão brasileiro: R$ 4.000,00
 * @param val - valor numérico ou string
 */
export function formatBRL(val: string | number | null | undefined): string {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0').replace(',', '.'));
  if (isNaN(n) || n === 0) return '—';
  return `R$ ${formatBR(n, 2)}`;
}
