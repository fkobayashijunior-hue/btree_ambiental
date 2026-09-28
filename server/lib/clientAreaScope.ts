import { and, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { clientAreas } from '../../drizzle/schema';

export function normalizeAreaId(value: unknown): number | null {
  if (value === undefined || value === null || value === 0 || value === '') return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Área inválida.' });
  return n;
}
export function areaScopeCondition(column: any, areaId: unknown) {
  const id = normalizeAreaId(areaId);
  return id === null ? isNull(column) : eq(column, id);
}
export function sameArea(a: unknown, b: unknown): boolean { return normalizeAreaId(a) === normalizeAreaId(b); }
export async function getClientArea(db: any, clientId: number, areaId: unknown) {
  const id = normalizeAreaId(areaId);
  if (id === null) return null;
  const [area] = await db.select().from(clientAreas).where(and(eq(clientAreas.id, id), eq(clientAreas.clientId, clientId))).limit(1);
  if (!area) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A área não pertence ao cliente selecionado.' });
  return area;
}
export function financialNumber(value: unknown): number {
  const n = Number(String(value ?? '0').trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
export function areaAgreementIsComplete(area: any): boolean {
  return !!area && area.agreementStatus === 'confirmed' && ['ton', 'm3'].includes(area.unit)
    && financialNumber(area.unitPrice) > 0 && !!area.paymentMethod?.trim()
    && Number.isInteger(area.paymentTermDays) && area.paymentTermDays >= 0
    && ['manual', 'semanal', 'quinzenal', 'mensal'].includes(area.billingCycle);
}
export function requireConfirmedArea(area: any) {
  if (area && !areaAgreementIsComplete(area)) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Acordo desta área a configurar. Confirme preço, unidade, forma, prazo e ciclo de pagamento antes de calcular ou abater valores.' });
}
export function getAreaPriceTerms(client: any, area: any) {
  if (!area) return { unit: 'ton' as const, unitPrice: financialNumber(client?.pricePerTon), paymentMethod: null, paymentTermDays: client?.paymentTermDays ?? 21, billingCycle: client?.billingCycle ?? 'mensal' };
  if (!areaAgreementIsComplete(area)) return null;
  return { unit: area.unit as 'ton' | 'm3', unitPrice: financialNumber(area.unitPrice), paymentMethod: area.paymentMethod, paymentTermDays: area.paymentTermDays, billingCycle: area.billingCycle };
}
export function getCargoFinancialValue(cargo: any, client: any, area?: any): number | null {
  const areaId = normalizeAreaId(cargo.areaId ?? cargo.area_id);
  if (areaId === null) return financialNumber(cargo.weightNetKg || cargo.weightOutKg || cargo.weight_net_kg || cargo.weight_out_kg) / 1000 * financialNumber(client?.pricePerTon ?? client?.price_per_ton);
  const agreedUnit = cargo.agreedUnit ?? cargo.agreed_unit;
  const agreedPrice = cargo.agreedUnitPrice ?? cargo.agreed_unit_price;
  let unit: string;
  let unitPrice: number;
  if (['ton', 'm3'].includes(agreedUnit) && agreedPrice != null && financialNumber(agreedPrice) > 0) {
    unit = agreedUnit; unitPrice = financialNumber(agreedPrice);
  } else {
    if (!area || area.id !== areaId || !areaAgreementIsComplete(area)) return null;
    unit = area.unit; unitPrice = financialNumber(area.unitPrice);
  }
  const quantity = unit === 'm3'
    ? financialNumber(cargo.finalVolumeM3 || cargo.final_volume_m3 || cargo.volumeM3 || cargo.volume_m3)
    : financialNumber(cargo.weightNetKg || cargo.weightOutKg || cargo.weight_net_kg || cargo.weight_out_kg) / 1000;
  return Math.round(quantity * unitPrice * 100) / 100;
}
