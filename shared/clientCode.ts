/**
 * Helper compartilhado para geração de código sequencial de carga por cliente.
 * Usado tanto no Controle de Cargas quanto no Portal do Cliente.
 *
 * Lógica:
 *  - Cada cliente tem sua própria sequência começando em 001
 *  - A sequência é determinada pela ordem cronológica das cargas (data crescente)
 *  - Ex: 1ª carga da SIMFLOR = SF 001, 2ª = SF 002, etc.
 */

export function getClientPrefix(clientName: string | null | undefined): string {
  const name = (clientName || '').toLowerCase();
  if (name.includes('simflor') || name.includes('sima')) return 'SF';
  if (name.includes('fazenda gw') || name.includes('gw')) return 'GW';
  const words = (clientName || '').trim().split(/\s+/);
  return words.map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 3) || 'CL';
}

/**
 * Constrói um mapa id → número sequencial para um array de cargas de UM cliente.
 * As cargas são ordenadas por data crescente (mais antiga = 001).
 */
export function buildClientCodeMap(loads: Array<{ id: number; date?: string | null; deliveryDate?: string | null }>): Map<number, string> {
  const map = new Map<number, string>();
  const sorted = [...loads].sort((a, b) => {
    const da = new Date(a.deliveryDate || a.date || 0).getTime();
    const db = new Date(b.deliveryDate || b.date || 0).getTime();
    return da !== db ? da - db : a.id - b.id;
  });
  sorted.forEach((l, idx) => map.set(l.id, String(idx + 1).padStart(3, '0')));
  return map;
}

/**
 * Retorna o código formatado de uma carga (ex: "SF 001").
 * Se codeMap não for fornecido, usa o id como fallback.
 */
export function getClientCode(
  clientName: string | null | undefined,
  loadId: number,
  codeMap?: Map<number, string>
): string {
  const prefix = getClientPrefix(clientName);
  const seq = codeMap?.get(loadId) ?? String(loadId).padStart(3, '0');
  return `${prefix} ${seq}`;
}
