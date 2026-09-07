// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { payrollEntries, collaborators } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Folha de pagamento: tabela e lógica próprias, independentes do "Lançar Folha"
// existente em server/routers/financial.ts (que apenas soma diárias de presença
// num único lançamento de despesa e não deve ser alterado).

async function ensurePayrollTable(db: any) {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collaborator_id INT NOT NULL,
        reference_month VARCHAR(7) NOT NULL,
        collaborator_name VARCHAR(255) NOT NULL,
        cpf VARCHAR(14),
        employment_type ENUM('clt','terceirizado','diarista','pj','semanal') NOT NULL,
        base_value VARCHAR(20) NOT NULL,
        days_worked INT,
        commission VARCHAR(20) NOT NULL DEFAULT '0',
        discount VARCHAR(20) NOT NULL DEFAULT '0',
        total_amount VARCHAR(20) NOT NULL,
        status ENUM('fechado','pago') NOT NULL DEFAULT 'fechado',
        paid_at TIMESTAMP NULL,
        notes TEXT,
        closed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY payroll_entries_collab_month_unique (collaborator_id, reference_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[Payroll] ensurePayrollTable:', e?.message);
  }
  // Migração de instalações antigas: adiciona a coluna discount se ainda não existir.
  try {
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_entries' AND COLUMN_NAME = 'discount'`
    ) as any;
    if ((cols as any[]).length === 0) {
      await db.execute(`ALTER TABLE payroll_entries ADD COLUMN discount VARCHAR(20) NOT NULL DEFAULT '0' AFTER commission`);
    }
  } catch (e: any) {
    console.warn('[Payroll] migratePayrollEntriesDiscount:', e?.message);
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payroll_weekly_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collaborator_id INT NOT NULL,
        week_friday VARCHAR(10) NOT NULL,
        paid TINYINT(1) NOT NULL DEFAULT 0,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY payroll_weekly_payments_collab_friday_unique (collaborator_id, week_friday)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[Payroll] ensurePayrollWeeklyPaymentsTable:', e?.message);
  }
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payroll_commission_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collaborator_id INT NOT NULL DEFAULT 0,
        chave VARCHAR(50) NOT NULL,
        valor VARCHAR(20) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY payroll_commission_rates_collab_chave_unique (collaborator_id, chave)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Tarifas padrão globais (collaborator_id = 0), só insere se ainda não existirem
    await db.execute(`
      INSERT IGNORE INTO payroll_commission_rates (collaborator_id, chave, valor) VALUES
        (0, 'motorista_enerbio', '32.00'),
        (0, 'motorista_mabam', '32.00'),
        (0, 'motorista_lider', '58.00'),
        (0, 'motorista_sonoco', '89.00'),
        (0, 'operador_por_tonelada', '1.50')
    `);
  } catch (e: any) {
    console.warn('[Payroll] ensureCommissionRatesTable:', e?.message);
  }
  // Migração de instalações antigas: tabela já existia sem collaborator_id (unique key só em
  // chave, impedindo tarifas por motorista) — adiciona a coluna e troca a chave única.
  try {
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_commission_rates' AND COLUMN_NAME = 'collaborator_id'`
    ) as any;
    if ((cols as any[]).length === 0) {
      await db.execute(`ALTER TABLE payroll_commission_rates ADD COLUMN collaborator_id INT NOT NULL DEFAULT 0 AFTER id`);
      await db.execute(`ALTER TABLE payroll_commission_rates DROP INDEX payroll_commission_rates_chave_unique`);
      await db.execute(`ALTER TABLE payroll_commission_rates ADD UNIQUE KEY payroll_commission_rates_collab_chave_unique (collaborator_id, chave)`);
    }
  } catch (e: any) {
    console.warn('[Payroll] migrateCommissionRatesCollaboratorId:', e?.message);
  }
}

const COMMISSION_RATE_DEFAULTS: Record<string, string> = {
  motorista_enerbio: "32.00",
  motorista_mabam: "32.00",
  motorista_lider: "58.00",
  motorista_sonoco: "89.00",
  operador_por_tonelada: "1.50",
};

// Tarifas de comissão: collaborator_id = 0 é o padrão global (usado por operador e por
// motoristas sem tarifa própria configurada); um collaboratorId > 0 sobrepõe o padrão global
// só para aquele colaborador (ex: Samuel/Isaac com tarifas diferentes do padrão do Ruan).
async function getCommissionRatesMap(db: any, collaboratorId: number = 0): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  for (const key of Object.keys(COMMISSION_RATE_DEFAULTS)) map[key] = parseFloat(COMMISSION_RATE_DEFAULTS[key]);
  const [globalRows] = await db.execute(sql`SELECT chave, valor FROM payroll_commission_rates WHERE collaborator_id = 0`) as any;
  for (const r of globalRows as any[]) map[r.chave] = parseFloat(r.valor);
  if (collaboratorId) {
    const [ownRows] = await db.execute(sql`SELECT chave, valor FROM payroll_commission_rates WHERE collaborator_id = ${collaboratorId}`) as any;
    for (const r of ownRows as any[]) map[r.chave] = parseFloat(r.valor);
  }
  return map;
}

function requireAdmin(ctx: any) {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem acessar a folha de pagamento." });
  }
}

// CLT/PJ: valor fixo (+ comissão). Diarista/Terceirizado: diária x dias trabalhados (+ comissão).
// Semanal: valor semanal x nº de sextas-feiras no mês (+ comissão) — não conta dias trabalhados.
// Desconto (combustível de Terceirizado) é subtraído do total em todos os casos.
function computeTotal(employmentType: string, baseValue: number, unitCount: number, commission: number, discount: number = 0): number {
  if (employmentType === "clt" || employmentType === "pj") {
    return baseValue + commission - discount;
  }
  return baseValue * unitCount + commission - discount;
}

// CLT usa o Salário Mensal (monthlySalary) como base da Folha — dailyRate nesse vínculo só
// alimenta o custo/dia em Presenças (salário ÷ 22), não o pagamento. Os demais vínculos
// continuam usando dailyRate (diária/valor semanal/PJ). Cai de volta pra dailyRate se
// monthlySalary não estiver preenchido, pra não zerar quem ainda não migrou o cadastro.
function baseRateOf(c: { employmentType?: string | null; dailyRate?: string | null; monthlySalary?: string | null }): string {
  if (c.employmentType === "clt" && c.monthlySalary) return c.monthlySalary;
  return c.dailyRate || "0";
}

// Quantas sextas-feiras (dia de pagamento do "Semanalmente") caem no mês/ano informado
function countFridaysInMonth(year: number, month: number): number {
  return getFridaysInMonth(year, month).length;
}

// Lista as datas ("YYYY-MM-DD") de cada sexta-feira do mês/ano informado
function getFridaysInMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const fridays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 5) {
      fridays.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return fridays;
}

// O que já foi marcado como pago em payroll_weekly_payments, por colaborador/sexta, no mês
async function getWeeklyPaymentsMap(db: any, referenceMonth: string): Promise<Map<number, Map<string, boolean>>> {
  const [rows] = await db.execute(
    sql`SELECT collaborator_id, week_friday, paid FROM payroll_weekly_payments WHERE week_friday LIKE ${referenceMonth + '%'}`
  ) as any;
  const map = new Map<number, Map<string, boolean>>();
  for (const r of rows as any[]) {
    const cid = Number(r.collaborator_id);
    if (!map.has(cid)) map.set(cid, new Map());
    map.get(cid)!.set(String(r.week_friday), !!Number(r.paid));
  }
  return map;
}

async function getDaysWorkedMap(db: any, year: number, month: number): Promise<Map<number, number>> {
  const [rows] = await db.execute(
    sql`SELECT collaborator_id, COUNT(*) AS days FROM collaborator_attendance WHERE YEAR(date) = ${year} AND MONTH(date) = ${month} GROUP BY collaborator_id`
  ) as any;
  const map = new Map<number, number>();
  for (const r of rows as any[]) map.set(Number(r.collaborator_id), Number(r.days));
  return map;
}

// Semana = domingo a sábado (mesmo critério usado em Presenças), por padrão. anchorDay permite
// outro início de semana por colaborador (ex: Ruan usa sábado(6)-sexta, uma exceção pontual).
function weekStartOf(dateStr: string, anchorDay: number = 0): string {
  const d = new Date(dateStr + "T12:00:00");
  const offset = (d.getDay() - anchorDay + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}
function anchorDayOf(collab: { weeklyPeriodAnchor?: string }): number {
  return collab.weeklyPeriodAnchor === "sabado" ? 6 : 0;
}
function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type WeekBreakdown = { weekStart: string; weekEnd: string; friday?: string; days?: number; cargas?: number; quantidade?: number; unit?: string; desconto?: number; valor?: number; allPaid: boolean };

// Para diarista/terceirizado/semanal: o pagamento de fato acontece em Presenças (por semana),
// não na Folha. Aqui só lemos o que já foi marcado lá para montar o retrato por semana.
async function getWeeklyBreakdownMap(db: any, year: number, month: number): Promise<Map<number, WeekBreakdown[]>> {
  const [rows] = await db.execute(
    sql`SELECT collaborator_id, DATE(date) AS day, payment_status_ca AS status
        FROM collaborator_attendance WHERE YEAR(date) = ${year} AND MONTH(date) = ${month}
        ORDER BY collaborator_id, day`
  ) as any;

  const byCollaborator = new Map<number, Map<string, { days: number; paidCount: number }>>();
  for (const r of rows as any[]) {
    const collabId = Number(r.collaborator_id);
    const dayStr = String(r.day);
    const wStart = weekStartOf(dayStr);
    if (!byCollaborator.has(collabId)) byCollaborator.set(collabId, new Map());
    const weeks = byCollaborator.get(collabId)!;
    if (!weeks.has(wStart)) weeks.set(wStart, { days: 0, paidCount: 0 });
    const w = weeks.get(wStart)!;
    w.days++;
    if (r.status === "pago") w.paidCount++;
  }

  const result = new Map<number, WeekBreakdown[]>();
  for (const [collabId, weeks] of byCollaborator.entries()) {
    const list: WeekBreakdown[] = Array.from(weeks.entries())
      .map(([weekStart, w]) => ({
        weekStart,
        weekEnd: addDaysStr(weekStart, 6),
        days: w.days,
        allPaid: w.paidCount === w.days,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    result.set(collabId, list);
  }
  return result;
}

// Motorista/Terceirizado com comissão automática (por carga ou por tonelada líquida, conforme
// commissionUnit do colaborador — ex: Ruan é por tonelada, Samuel/Isaac por carga): a comissão
// de cada sexta de pagamento é calculada com base nas cargas realmente entregues naquela semana
// (domingo a sábado, mesma janela usada em Presenças), não numa divisão igual do total do mês.
// Retorna, por colaborador, um mapa "semana (domingo)" -> { cargas, quantidade, valor }, onde
// quantidade é toneladas quando commissionUnit='tonelada', senão igual a cargas.
async function getWeeklyVehicleCommissionMap(
  db: any,
  year: number,
  month: number
): Promise<Map<number, Map<string, { cargas: number; quantidade: number; valor: number }>>> {
  const [rows] = await db.execute(
    sql`SELECT eq.responsible_driver_id AS collaboratorId, cl.delivery_date AS deliveryDate, cd.commission_category AS categoria,
               COALESCE(cl.weight_net_kg, cl.weight_out_kg, 0) AS weightKg
        FROM cargo_loads cl
        JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
        JOIN equipment eq ON (cl.vehicle_id IS NOT NULL AND eq.id = cl.vehicle_id)
          OR (cl.vehicle_id IS NULL AND cl.vehicle_plate IS NOT NULL AND eq.license_plate = cl.vehicle_plate)
        WHERE cl.status = 'entregue' AND cl.delivery_date IS NOT NULL
          AND YEAR(cl.delivery_date) = ${year} AND MONTH(cl.delivery_date) = ${month}
          AND cd.commission_category != 'nenhuma'
          AND eq.responsible_driver_id IS NOT NULL`
  ) as any;

  const map = new Map<number, Map<string, { cargas: number; quantidade: number; valor: number }>>();
  // Tarifa, unidade (carga/tonelada) e âncora da semana podem ser próprias de cada
  // motorista/terceirizado — busca (e cacheia) por colaborador.
  const ratesCache = new Map<number, Record<string, number>>();
  const configCache = new Map<number, { unit: string; anchor: number }>();
  for (const r of rows as any[]) {
    const cid = Number(r.collaboratorId);
    if (!ratesCache.has(cid)) ratesCache.set(cid, await getCommissionRatesMap(db, cid));
    if (!configCache.has(cid)) {
      const [crows] = await db.execute(sql`SELECT commission_unit AS unit, weekly_period_anchor AS anchor FROM collaborators WHERE id = ${cid}`) as any;
      const row = (crows as any[])?.[0];
      configCache.set(cid, { unit: row?.unit ?? "carga", anchor: anchorDayOf({ weeklyPeriodAnchor: row?.anchor }) });
    }
    const rates = ratesCache.get(cid)!;
    const config = configCache.get(cid)!;
    const porTonelada = config.unit === "tonelada";
    const dateStr = r.deliveryDate instanceof Date ? r.deliveryDate.toISOString().slice(0, 10) : String(r.deliveryDate).slice(0, 10);
    const weekKey = weekStartOf(dateStr, config.anchor);
    const rate = rates[`motorista_${r.categoria}`] ?? 0;
    const quantidadeIncremento = porTonelada ? parseFloat(r.weightKg ?? "0") / 1000 : 1;
    if (!map.has(cid)) map.set(cid, new Map());
    const weeks = map.get(cid)!;
    if (!weeks.has(weekKey)) weeks.set(weekKey, { cargas: 0, quantidade: 0, valor: 0 });
    const w = weeks.get(weekKey)!;
    w.cargas += 1;
    w.quantidade += quantidadeIncremento;
    w.valor += quantidadeIncremento * rate;
  }
  return map;
}

// Comissão de Operador (toneladas líquidas do cliente ÷ nº de operadores automáticos daquele
// cliente x tarifa), pré-calculada para todos os operadores ativos de uma vez — mesma fórmula
// usada em getCommissionBreakdown, mas em lote para preencher a coluna Comissão sem precisar
// abrir a janela de cada colaborador.
async function getLiveOperadorCommissionMap(
  db: any,
  year: number,
  month: number,
  activeCollaborators: any[]
): Promise<Map<number, number>> {
  const operadores = activeCollaborators.filter((c: any) => c.role === "operador" && c.commissionAuto !== 0 && c.clientId);
  const map = new Map<number, number>();
  if (operadores.length === 0) return map;

  const [tonRows] = await db.execute(
    sql`SELECT client_id AS clientId, SUM(COALESCE(weight_net_kg, weight_out_kg, 0)) AS totalKg
        FROM cargo_loads
        WHERE status = 'entregue' AND delivery_date IS NOT NULL
          AND YEAR(delivery_date) = ${year} AND MONTH(delivery_date) = ${month}
        GROUP BY client_id`
  ) as any;
  const tonByClient = new Map<number, number>();
  for (const r of tonRows as any[]) tonByClient.set(Number(r.clientId), parseFloat(r.totalKg ?? "0") / 1000);

  const [opCountRows] = await db.execute(
    sql`SELECT client_id AS clientId, COUNT(*) AS qtd FROM collaborators WHERE role = 'operador' AND active = 1 AND commission_auto = 1 GROUP BY client_id`
  ) as any;
  const countByClient = new Map<number, number>();
  for (const r of opCountRows as any[]) countByClient.set(Number(r.clientId), Number(r.qtd));

  const rates = await getCommissionRatesMap(db);
  const tarifa = rates.operador_por_tonelada ?? 0;
  for (const c of operadores) {
    const tonelada = tonByClient.get(c.clientId) ?? 0;
    const numOperadores = countByClient.get(c.clientId) || 1;
    map.set(c.id, (tonelada / numOperadores) * tarifa);
  }
  return map;
}

export type DiscountRecord = { date: string; equipmentName: string; liters: number; precoCobrado: number; subtotal: number };
export type DiscountInfo = {
  total: number; totalLiters: number; records: DiscountRecord[];
  byWeek: Map<string, { liters: number; valor: number }>;
};

// Desconto de combustível para colaboradores com cargo Terceirizado: soma litros × "Valor a
// Cobrar do Terceirizado" (vehicle_records.charged_value) de todos os abastecimentos do(s)
// veículo(s) em que ele é o Motorista Responsável (Setores e Máquinas), no mês da Folha.
// Também devolve o detalhamento por abastecimento (data, litros, preço cobrado) para exibição.
async function getLiveTerceirizadoDiscountMap(db: any, year: number, month: number): Promise<Map<number, DiscountInfo>> {
  const [rows] = await db.execute(
    sql`SELECT eq.responsible_driver_id AS collaboratorId, eq.name AS equipmentName, vr.date AS date,
               vr.liters AS liters, vr.charged_value AS chargedValue
        FROM vehicle_records vr
        JOIN equipment eq ON eq.id = vr.equipment_id
        WHERE vr.record_type = 'abastecimento' AND vr.charged_value IS NOT NULL AND vr.charged_value != ''
          AND eq.responsible_driver_id IS NOT NULL
          AND YEAR(vr.date) = ${year} AND MONTH(vr.date) = ${month}
        ORDER BY vr.date`
  ) as any;
  const map = new Map<number, DiscountInfo>();
  // A âncora da semana (domingo ou sábado) pode ser própria de cada colaborador — busca e cacheia.
  const anchorCache = new Map<number, number>();
  for (const r of rows as any[]) {
    const cid = Number(r.collaboratorId);
    if (!anchorCache.has(cid)) {
      const [crows] = await db.execute(sql`SELECT weekly_period_anchor AS anchor FROM collaborators WHERE id = ${cid}`) as any;
      anchorCache.set(cid, anchorDayOf({ weeklyPeriodAnchor: (crows as any[])?.[0]?.anchor }));
    }
    const litros = parseFloat(r.liters ?? "0");
    const cobrado = parseFloat(r.chargedValue ?? "0");
    const subtotal = litros * cobrado;
    const dateStr = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
    if (!map.has(cid)) map.set(cid, { total: 0, totalLiters: 0, records: [], byWeek: new Map() });
    const info = map.get(cid)!;
    info.total += subtotal;
    info.totalLiters += litros;
    info.records.push({ date: dateStr, equipmentName: r.equipmentName, liters: litros, precoCobrado: cobrado, subtotal });
    // Cada abastecimento desconta da mesma semana de apuração em que ocorreu (normalmente
    // domingo–sábado, mas pode ser sábado–sexta pra colaboradores com âncora própria), pra que
    // o valor de cada sexta de pagamento (Semanalmente) já saia líquido do combustível daquela semana.
    const weekKey = weekStartOf(dateStr, anchorCache.get(cid)!);
    if (!info.byWeek.has(weekKey)) info.byWeek.set(weekKey, { liters: 0, valor: 0 });
    const w = info.byWeek.get(weekKey)!;
    w.liters += litros;
    w.valor += subtotal;
  }
  return map;
}

// Colaboradores com regra de pagamento periódica PRÓPRIA (weekly_period_anchor='sabado' e/ou
// payment_lag_days diferente de 7 — hoje só o Ruan): em vez do lançamento único de comissão no
// dia 20 do mês seguinte (usado por todo mundo), cada período de trabalho vira um lançamento
// separado no Fluxo de Caixa, na data real de pagamento (sexta do fim do período + lagDays),
// já líquido do desconto de combustível daquele mesmo período. Usado só por sicoob.ts.
// Se o líquido do período for negativo (desconto > comissão), não lança nada (fica 0) — a
// diferença não vira um recebimento nem reduz outro lançamento.
export async function getSpecialWeeklyCommissionCashFlow(
  db: any,
  cashFlowYear: number,
  cashFlowMonth: number
): Promise<{ collaboratorName: string; date: string; valor: number }[]> {
  const [specialRows] = await db.execute(
    sql`SELECT id, name, weekly_period_anchor AS anchor, payment_lag_days AS lagDays
        FROM collaborators
        WHERE active = 1 AND role IN ('motorista','terceirizado')
          AND commission_auto = 1
          AND (weekly_period_anchor = 'sabado' OR payment_lag_days <> 7)`
  ) as any;
  const specials = specialRows as any[];
  if (specials.length === 0) return [];

  // Cobre o mês do fluxo de caixa e o anterior — a defasagem (payment_lag_days) pode empurrar o
  // pagamento de um período trabalhado no mês anterior para dentro do mês sendo exibido.
  const prevYear = cashFlowMonth === 1 ? cashFlowYear - 1 : cashFlowYear;
  const prevMonthNum = cashFlowMonth === 1 ? 12 : cashFlowMonth - 1;
  const refMonths = [{ year: prevYear, month: prevMonthNum }, { year: cashFlowYear, month: cashFlowMonth }];
  const cashFlowPrefix = `${cashFlowYear}-${String(cashFlowMonth).padStart(2, "0")}`;

  const results: { collaboratorName: string; date: string; valor: number }[] = [];
  for (const { year, month } of refMonths) {
    const fridays = getFridaysInMonth(year, month);
    if (fridays.length === 0) continue;
    const weeklyCommissionMap = await getWeeklyVehicleCommissionMap(db, year, month);
    const discountMap = await getLiveTerceirizadoDiscountMap(db, year, month);
    for (const c of specials) {
      const anchorDay = anchorDayOf({ weeklyPeriodAnchor: c.anchor });
      const lag = Number(c.lagDays ?? 7);
      const weekMap = weeklyCommissionMap.get(c.id);
      const discountByWeek = discountMap.get(c.id)?.byWeek;
      for (const f of fridays) {
        const weekStart = weekStartOf(f, anchorDay);
        const commissionValor = weekMap?.get(weekStart)?.valor ?? 0;
        const discountValor = discountByWeek?.get(weekStart)?.valor ?? 0;
        const net = Math.max(0, commissionValor - discountValor);
        if (net === 0) continue;
        const payDate = addDaysStr(f, lag);
        if (!payDate.startsWith(cashFlowPrefix)) continue;
        results.push({ collaboratorName: c.name, date: payDate, valor: net });
      }
    }
  }
  return results;
}

export const payrollRouter = router({
  // Retorna a folha do mês: junta colaboradores ativos com entradas já fechadas
  // (payroll_entries) e calcula um rascunho ao vivo (não salvo) para quem ainda não foi fechado.
  getMonth: protectedProcedure
    .input(z.object({ referenceMonth: z.string() })) // "YYYY-MM"
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);

      const [year, month] = input.referenceMonth.split("-").map(Number);

      const activeCollaborators = await db.select().from(collaborators).where(eq(collaborators.active, 1));
      const daysMap = await getDaysWorkedMap(db, year, month);
      const weeklyMap = await getWeeklyBreakdownMap(db, year, month);
      const fridays = getFridaysInMonth(year, month);
      const numFridays = fridays.length;
      const weeklyPaymentsMap = await getWeeklyPaymentsMap(db, input.referenceMonth);
      const weeklyCommissionMap = await getWeeklyVehicleCommissionMap(db, year, month);
      const liveOperadorCommissionMap = await getLiveOperadorCommissionMap(db, year, month, activeCollaborators);
      const liveDiscountMap = await getLiveTerceirizadoDiscountMap(db, year, month);

      const savedEntries = await db.select().from(payrollEntries).where(eq(payrollEntries.referenceMonth, input.referenceMonth));
      const savedMap = new Map<number, any>();
      for (const e of savedEntries) savedMap.set(e.collaboratorId, e);

      // Diarista/Terceirizado: rastreados dia a dia em Presenças (têm "Dias" e status por semana).
      // Semanal (ex: Fernando Kobayashi Junior): valor fixo pago toda sexta, sem contar dias — o
      // controle de pago/pendente é por semana também, mas via payroll_weekly_payments (não tem
      // registro de presença), com botão de pagar em cada sexta na própria Folha.
      const isDailyType = (t: string) => t === "diarista" || t === "terceirizado";
      const isWeeklyFixed = (t: string) => t === "semanal";
      // Motorista/Terceirizado com comissão automática e período próprio (ex: Ruan — sábado a
      // sexta, pagamento com prazo diferente de 7 dias) usa o mesmo detalhamento "por sexta com
      // Pagar" do Semanalmente, em vez do detalhamento por dias trabalhados (Presenças).
      const hasWeeklyCommission = (c: any) =>
        (c.role === "motorista" || c.role === "terceirizado") &&
        c.commissionAuto !== 0 &&
        (c.weeklyPeriodAnchor === "sabado" || (c.paymentLagDays !== undefined && c.paymentLagDays !== 7));

      // Pré-calcula a comissão de quem tem regra automática (Motorista/Terceirizado por
      // carga/veículo, Operador por tonelada), pra já mostrar o valor na coluna Comissão
      // antes de fechar a linha — sem precisar abrir a janela de cálculo manualmente.
      const liveCommissionFor = (c: any): number => {
        if (c.commissionAuto === 0) return 0;
        if (c.role === "motorista" || c.role === "terceirizado") {
          const weekMap = weeklyCommissionMap.get(c.id);
          if (!weekMap) return 0;
          let total = 0;
          for (const w of weekMap.values()) total += w.valor;
          return total;
        }
        if (c.role === "operador") return liveOperadorCommissionMap.get(c.id) ?? 0;
        return 0;
      };
      // Desconto de combustível: só se aplica a colaboradores com cargo Terceirizado.
      const liveDiscountFor = (c: any): number => c.role === "terceirizado" ? (liveDiscountMap.get(c.id)?.total ?? 0) : 0;

      const rows = activeCollaborators.map((c: any) => {
        const employmentType = c.employmentType || "diarista";
        const weeklyCommission = hasWeeklyCommission(c);
        const weeklyFixed = isWeeklyFixed(employmentType) || weeklyCommission;
        const daily = isDailyType(employmentType) && !weeklyFixed;
        const saved = savedMap.get(c.id);
        const baseValue = saved ? parseFloat(saved.baseValue || "0") : parseFloat(baseRateOf(c));
        const daysWorked = daily ? (saved ? saved.daysWorked : (daysMap.get(c.id) || 0)) : null;
        // Comissão automática (Motorista/Terceirizado/Operador) continua sendo recalculada ao
        // vivo mesmo depois de "Salvar/Fechar" — cargas/abastecimentos do mês podem mudar
        // depois do fechamento, e a Folha não deve travar num valor desatualizado. Só trava de
        // fato quando a linha é marcada como "Pago" (pagamento já efetivado). "Semanalmente"
        // nunca chega a "pago" no nível da linha (o pagamento é controlado por sexta, à parte),
        // então continua sempre ao vivo, como já era.
        const hasAutoCommission = (c.role === "motorista" || c.role === "terceirizado" || c.role === "operador") && c.commissionAuto !== 0;
        const isPaid = saved?.status === "pago";
        const useSaved = !!saved && (!hasAutoCommission || isPaid) && !weeklyFixed;
        const commission = useSaved ? parseFloat(saved.commission || "0") : liveCommissionFor(c);
        const discount = useSaved ? parseFloat(saved.discount || "0") : liveDiscountFor(c);
        const discountInfo = c.role === "terceirizado" ? liveDiscountMap.get(c.id) : undefined;
        const unitCount = daily ? (daysWorked || 0) : weeklyFixed ? numFridays : 0;
        const totalAmount = useSaved ? parseFloat(saved.totalAmount || "0") : computeTotal(employmentType, baseValue, unitCount, commission, discount);

        let weeks: WeekBreakdown[] | null = null;
        let status: string | null = saved ? saved.status : null;

        if (daily) {
          // Diarista/Terceirizado: status vem de Presenças (só lê, não tem ação na Folha).
          weeks = weeklyMap.get(c.id) || [];
          status = weeks.length > 0 && weeks.every(w => w.allPaid) ? "pago" : "pendente";
        } else if (weeklyFixed) {
          // Semanal: pago/pendente controlado por payroll_weekly_payments — a ação de pagar
          // fica em cada semana, não no mês inteiro. Motorista/Terceirizado com comissão
          // automática: cada sexta reflete as cargas realmente entregues naquela semana
          // (domingo a sábado). Demais casos: total do mês dividido igualmente pelas sextas.
          const paidMap = weeklyPaymentsMap.get(c.id);
          const autoCommission = (c.role === "motorista" || c.role === "terceirizado") && c.commissionAuto !== 0;
          if (autoCommission) {
            const weekMap = weeklyCommissionMap.get(c.id);
            // Desconto de combustível (só Terceirizado) desconta da mesma semana do
            // abastecimento, pra que a sexta de pagamento já saia líquida.
            const discountByWeek = c.role === "terceirizado" ? discountInfo?.byWeek : undefined;
            const anchorDay = anchorDayOf(c);
            weeks = fridays.map(f => {
              const weekStart = weekStartOf(f, anchorDay);
              const w = weekMap?.get(weekStart);
              const weekDiscount = discountByWeek?.get(weekStart);
              return {
                weekStart,
                weekEnd: addDaysStr(weekStart, 6),
                friday: f,
                cargas: w?.cargas ?? 0,
                quantidade: w?.quantidade ?? 0,
                unit: c.commissionUnit,
                desconto: weekDiscount?.valor ?? 0,
                valor: (w?.valor ?? 0) - (weekDiscount?.valor ?? 0),
                allPaid: paidMap?.get(f) === true,
              };
            });
          } else {
            const valorPorSexta = numFridays > 0 ? totalAmount / numFridays : 0;
            weeks = fridays.map(f => ({
              weekStart: f,
              weekEnd: f,
              friday: f,
              valor: valorPorSexta,
              allPaid: paidMap?.get(f) === true,
            }));
          }
          status = weeks.length > 0 && weeks.every(w => w.allPaid) ? "pago" : "pendente";
        }

        return {
          id: saved?.id ?? null,
          collaboratorId: c.id,
          name: saved ? saved.collaboratorName : c.name,
          cpf: saved ? saved.cpf : c.cpf,
          role: c.role,
          commissionAuto: c.commissionAuto !== 0,
          employmentType: saved ? saved.employmentType : employmentType,
          weeklyCommission,
          baseValue: baseValue.toFixed(2),
          daysWorked,
          commission: commission.toFixed(2),
          discount: discount.toFixed(2),
          discountLiters: discountInfo?.totalLiters ?? 0,
          discountRecords: discountInfo?.records ?? [],
          totalAmount: totalAmount.toFixed(2),
          status,
          paidAt: (daily || weeklyFixed) ? null : (saved?.paidAt ?? null),
          isDraft: !saved,
          weeks,
        };
      }).sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"));

      const summary = rows.reduce((acc: any, r: any) => {
        const total = parseFloat(r.totalAmount || "0");
        acc.totalGeral += total;
        acc.totalComissao += parseFloat(r.commission || "0");
        acc.totalDesconto += parseFloat(r.discount || "0");
        if (r.employmentType === "clt" || r.employmentType === "pj") acc.totalSalarios += total;
        else acc.totalDiarias += total;
        if (r.status === "fechado" || r.status === "pago") acc.fechados++;
        if (r.status === "pago") acc.pagos++;
        return acc;
      }, { totalGeral: 0, totalComissao: 0, totalDesconto: 0, totalSalarios: 0, totalDiarias: 0, fechados: 0, pagos: 0 });

      return { rows, summary, totalCollaborators: rows.length };
    }),

  // Salva/fecha a linha de um colaborador (grava snapshot dos valores no momento).
  // markPaid: já grava com status 'pago' (usado pelo botão "Pagar" na linha em rascunho).
  saveEntry: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      referenceMonth: z.string(),
      commission: z.string().optional(),
      daysWorkedOverride: z.number().optional(),
      baseValueOverride: z.string().optional(),
      notes: z.string().optional(),
      markPaid: z.boolean().optional(),
      paidAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);

      const [collab] = await db.select().from(collaborators).where(eq(collaborators.id, input.collaboratorId));
      if (!collab) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado." });

      const employmentType = collab.employmentType || "diarista";
      const baseValue = input.baseValueOverride !== undefined ? parseFloat(input.baseValueOverride) : parseFloat(baseRateOf(collab));
      const isDaily = employmentType === "diarista" || employmentType === "terceirizado";
      const isWeeklyFixed = employmentType === "semanal";

      const [year, month] = input.referenceMonth.split("-").map(Number);

      let daysWorked: number | null = null;
      if (isDaily) {
        if (input.daysWorkedOverride !== undefined) {
          daysWorked = input.daysWorkedOverride;
        } else {
          const map = await getDaysWorkedMap(db, year, month);
          daysWorked = map.get(input.collaboratorId) || 0;
        }
      }

      const unitCount = isDaily ? (daysWorked || 0) : isWeeklyFixed ? countFridaysInMonth(year, month) : 0;
      const commission = parseFloat(input.commission || "0");
      // Desconto de combustível: só para cargo Terceirizado, calculado ao vivo no fechamento.
      let discount = 0;
      if (collab.role === "terceirizado") {
        const discountMap = await getLiveTerceirizadoDiscountMap(db, year, month);
        discount = discountMap.get(input.collaboratorId)?.total ?? 0;
      }
      const totalAmount = computeTotal(employmentType, baseValue, unitCount, commission, discount);
      const status = input.markPaid ? "pago" : "fechado";
      const paidAt = input.markPaid ? (input.paidAt || new Date().toISOString().slice(0, 10)) : null;

      await db.execute(
        sql`INSERT INTO payroll_entries
          (collaborator_id, reference_month, collaborator_name, cpf, employment_type, base_value, days_worked, commission, discount, total_amount, status, paid_at, notes, closed_by)
          VALUES (${input.collaboratorId}, ${input.referenceMonth}, ${collab.name}, ${collab.cpf || null}, ${employmentType}, ${baseValue.toFixed(2)}, ${daysWorked}, ${commission.toFixed(2)}, ${discount.toFixed(2)}, ${totalAmount.toFixed(2)}, ${status}, ${paidAt}, ${input.notes || null}, ${ctx.user.id})
          ON DUPLICATE KEY UPDATE
            collaborator_name = VALUES(collaborator_name),
            cpf = VALUES(cpf),
            employment_type = VALUES(employment_type),
            base_value = VALUES(base_value),
            days_worked = VALUES(days_worked),
            commission = VALUES(commission),
            discount = VALUES(discount),
            total_amount = VALUES(total_amount),
            status = VALUES(status),
            paid_at = VALUES(paid_at),
            notes = VALUES(notes),
            closed_by = ${ctx.user.id}`
      );

      return { success: true, totalAmount: totalAmount.toFixed(2) };
    }),

  // Fecha a folha inteira do mês: cria snapshot (comissão 0) para todo colaborador ativo
  // que ainda não tenha entrada salva nesse mês. Não sobrescreve linhas já fechadas/editadas.
  closeMonth: protectedProcedure
    .input(z.object({ referenceMonth: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);

      const [year, month] = input.referenceMonth.split("-").map(Number);
      const activeCollaborators = await db.select().from(collaborators).where(eq(collaborators.active, 1));
      const daysMap = await getDaysWorkedMap(db, year, month);
      const numFridays = countFridaysInMonth(year, month);
      const weeklyCommissionMap = await getWeeklyVehicleCommissionMap(db, year, month);
      const liveOperadorCommissionMap = await getLiveOperadorCommissionMap(db, year, month, activeCollaborators);
      const liveDiscountMap = await getLiveTerceirizadoDiscountMap(db, year, month);

      const existing = await db.select({ collaboratorId: payrollEntries.collaboratorId })
        .from(payrollEntries).where(eq(payrollEntries.referenceMonth, input.referenceMonth));
      const existingIds = new Set(existing.map((e: any) => e.collaboratorId));

      let created = 0;
      for (const c of activeCollaborators as any[]) {
        if (existingIds.has(c.id)) continue;
        const employmentType = c.employmentType || "diarista";
        const baseValue = parseFloat(baseRateOf(c));
        const isDaily = employmentType === "diarista" || employmentType === "terceirizado";
        const isWeeklyFixed = employmentType === "semanal";
        const daysWorked = isDaily ? (daysMap.get(c.id) || 0) : null;
        const unitCount = isDaily ? (daysWorked || 0) : isWeeklyFixed ? numFridays : 0;

        let commission = 0;
        if (c.commissionAuto !== 0) {
          if (c.role === "motorista" || c.role === "terceirizado") {
            const weekMap = weeklyCommissionMap.get(c.id);
            if (weekMap) for (const w of weekMap.values()) commission += w.valor;
          } else if (c.role === "operador") {
            commission = liveOperadorCommissionMap.get(c.id) ?? 0;
          }
        }
        const discount = c.role === "terceirizado" ? (liveDiscountMap.get(c.id)?.total ?? 0) : 0;
        const totalAmount = computeTotal(employmentType, baseValue, unitCount, commission, discount);
        await db.execute(
          sql`INSERT INTO payroll_entries
            (collaborator_id, reference_month, collaborator_name, cpf, employment_type, base_value, days_worked, commission, discount, total_amount, status, closed_by)
            VALUES (${c.id}, ${input.referenceMonth}, ${c.name}, ${c.cpf || null}, ${employmentType}, ${baseValue.toFixed(2)}, ${daysWorked}, ${commission.toFixed(2)}, ${discount.toFixed(2)}, ${totalAmount.toFixed(2)}, 'fechado', ${ctx.user.id})`
        );
        created++;
      }

      return { success: true, created };
    }),

  markPaid: protectedProcedure
    .input(z.object({ id: z.number(), paidAt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(payrollEntries).set({ status: "pago", paidAt: input.paidAt }).where(eq(payrollEntries.id, input.id));
      return { success: true };
    }),

  unmarkPaid: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(payrollEntries).set({ status: "fechado", paidAt: null }).where(eq(payrollEntries.id, input.id));
      return { success: true };
    }),

  // Marca/desmarca o pagamento de UMA sexta-feira específica de um colaborador "Semanal"
  // (diferente de markPaid/unmarkPaid, que travam o mês inteiro — usado só por CLT/PJ).
  markWeeklyPaid: protectedProcedure
    .input(z.object({ collaboratorId: z.number(), weekFriday: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);
      await db.execute(
        sql`INSERT INTO payroll_weekly_payments (collaborator_id, week_friday, paid, paid_at)
            VALUES (${input.collaboratorId}, ${input.weekFriday}, 1, ${new Date().toISOString().slice(0, 10)})
            ON DUPLICATE KEY UPDATE paid = 1, paid_at = VALUES(paid_at)`
      );
      return { success: true };
    }),

  unmarkWeeklyPaid: protectedProcedure
    .input(z.object({ collaboratorId: z.number(), weekFriday: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);
      await db.execute(
        sql`INSERT INTO payroll_weekly_payments (collaborator_id, week_friday, paid, paid_at)
            VALUES (${input.collaboratorId}, ${input.weekFriday}, 0, NULL)
            ON DUPLICATE KEY UPDATE paid = 0, paid_at = NULL`
      );
      return { success: true };
    }),

  // Remove a entrada salva (volta a ser calculada ao vivo a partir de colaboradores/presenças)
  reopenEntry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(payrollEntries).where(eq(payrollEntries.id, input.id));
      return { success: true };
    }),

  // Tarifas de comissão atuais (motorista por destino, operador por tonelada). Passando
  // collaboratorId, retorna a tarifa efetiva daquele colaborador (própria, se configurada,
  // senão o padrão global).
  getCommissionRates: protectedProcedure
    .input(z.object({ collaboratorId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);
      return getCommissionRatesMap(db, input?.collaboratorId ?? 0);
    }),

  updateCommissionRates: protectedProcedure
    .input(z.object({ rates: z.record(z.string(), z.string()), collaboratorId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);
      const collaboratorId = input.collaboratorId ?? 0;
      for (const [chave, valor] of Object.entries(input.rates)) {
        await db.execute(
          sql`INSERT INTO payroll_commission_rates (collaborator_id, chave, valor) VALUES (${collaboratorId}, ${chave}, ${valor})
              ON DUPLICATE KEY UPDATE valor = VALUES(valor)`
        );
      }
      return { success: true };
    }),

  // Detalhamento da comissão de Motorista (por carga entregue no destino, no próprio mês da
  // Folha) ou Operador (toneladas líquidas do cliente no mês ÷ nº de operadores daquele cliente).
  getCommissionBreakdown: protectedProcedure
    .input(z.object({ collaboratorId: z.number(), referenceMonth: z.string(), numOperadoresOverride: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await ensurePayrollTable(db);

      const [collab] = await db.select().from(collaborators).where(eq(collaborators.id, input.collaboratorId));
      if (!collab) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado." });

      // Tarifas de motorista/terceirizado podem ser configuradas por colaborador (ex: Samuel e
      // Isaac têm tarifas diferentes do padrão); operador sempre usa a tarifa global.
      const rates = await getCommissionRatesMap(
        db,
        (collab.role === "motorista" || collab.role === "terceirizado") ? input.collaboratorId : 0
      );
      // Comissão de motorista e operador considera as entregas do PRÓPRIO mês selecionado
      // na Folha (não mais do mês anterior).
      const [yearStr, monthStr] = input.referenceMonth.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const periodoBase = `${String(month).padStart(2, "0")}/${year}`;

      if (collab.role === "motorista" || collab.role === "terceirizado") {
        // Terceirizado segue a mesma regra de comissão do motorista (por carga ou por tonelada
        // líquida entregue, conforme a categoria do destino do veículo responsável — configurável
        // por colaborador via commissionUnit, ex: Ruan é por tonelada, Samuel/Isaac por carga).
        // As cargas são atribuídas ao motorista pelo VEÍCULO (Motorista Responsável em
        // Setores e Máquinas), não pelo driver_collaborator_id da carga — isso porque
        // o mesmo caminhão pode ser dirigido por terceiros/motoristas não cadastrados,
        // e nesse caso a comissão é do responsável cadastrado pelo veículo. O match é
        // feito preferencialmente por vehicle_id (FK) e, se ausente, por vehicle_plate
        // (texto, sujeito a inconsistências de digitação).
        const porTonelada = collab.commissionUnit === "tonelada";
        const [rows] = await db.execute(
          porTonelada
            ? sql`SELECT cd.commission_category AS categoria, COUNT(*) AS qtd,
                     SUM(COALESCE(cl.weight_net_kg, cl.weight_out_kg, 0)) AS totalKg
                  FROM cargo_loads cl
                  JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
                  JOIN equipment eq ON (cl.vehicle_id IS NOT NULL AND eq.id = cl.vehicle_id)
                    OR (cl.vehicle_id IS NULL AND cl.vehicle_plate IS NOT NULL AND eq.license_plate = cl.vehicle_plate)
                  WHERE eq.responsible_driver_id = ${input.collaboratorId} AND cl.status = 'entregue'
                    AND cl.delivery_date IS NOT NULL
                    AND YEAR(cl.delivery_date) = ${year} AND MONTH(cl.delivery_date) = ${month}
                    AND cd.commission_category != 'nenhuma'
                  GROUP BY cd.commission_category`
            : sql`SELECT cd.commission_category AS categoria, COUNT(*) AS qtd
                  FROM cargo_loads cl
                  JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
                  JOIN equipment eq ON (cl.vehicle_id IS NOT NULL AND eq.id = cl.vehicle_id)
                    OR (cl.vehicle_id IS NULL AND cl.vehicle_plate IS NOT NULL AND eq.license_plate = cl.vehicle_plate)
                  WHERE eq.responsible_driver_id = ${input.collaboratorId} AND cl.status = 'entregue'
                    AND cl.delivery_date IS NOT NULL
                    AND YEAR(cl.delivery_date) = ${year} AND MONTH(cl.delivery_date) = ${month}
                    AND cd.commission_category != 'nenhuma'
                  GROUP BY cd.commission_category`
        ) as any;
        const labels: Record<string, string> = { enerbio: "Enerbio", mabam: "Mabam (Rebnic)", lider: "Líder", sonoco: "Sonoco" };
        const items = (rows as any[]).map((r: any) => {
          const rate = rates[`motorista_${r.categoria}`] ?? 0;
          const quantidade = porTonelada ? parseFloat(r.totalKg ?? "0") / 1000 : Number(r.qtd);
          return {
            categoria: r.categoria, label: labels[r.categoria] || r.categoria,
            quantidade, cargas: Number(r.qtd), tarifa: rate, subtotal: quantidade * rate,
          };
        });
        const total = items.reduce((s: number, i: any) => s + i.subtotal, 0);
        return { tipo: "motorista" as const, unidade: porTonelada ? "tonelada" as const : "carga" as const, periodoBase, items, total, rates };
      }

      if (collab.role === "operador") {
        if (!collab.clientId) {
          return { tipo: "operador" as const, periodoBase, clienteNome: null, totalTonelada: 0, numOperadores: 0, tarifa: rates.operador_por_tonelada, total: 0, rates };
        }
        const [clientRows] = await db.execute(sql`SELECT name FROM clients WHERE id = ${collab.clientId}`) as any;
        const clienteNome = (clientRows as any[])?.[0]?.name ?? null;
        const [tonRows] = await db.execute(
          sql`SELECT SUM(COALESCE(weight_net_kg, weight_out_kg, 0)) AS total_kg
              FROM cargo_loads
              WHERE client_id = ${collab.clientId} AND status = 'entregue'
                AND delivery_date IS NOT NULL
                AND YEAR(delivery_date) = ${year} AND MONTH(delivery_date) = ${month}`
        ) as any;
        const totalTonelada = parseFloat((tonRows as any[])?.[0]?.total_kg ?? "0") / 1000;
        const [opRows] = await db.execute(
          sql`SELECT COUNT(*) AS qtd FROM collaborators WHERE role = 'operador' AND active = 1 AND client_id = ${collab.clientId} AND commission_auto = 1`
        ) as any;
        const numOperadoresAuto = Number((opRows as any[])?.[0]?.qtd ?? 0) || 1;
        const numOperadores = input.numOperadoresOverride ?? numOperadoresAuto;
        const tarifa = rates.operador_por_tonelada ?? 0;
        const total = (totalTonelada / numOperadores) * tarifa;
        return { tipo: "operador" as const, periodoBase, clienteNome, totalTonelada, numOperadores, numOperadoresAuto, tarifa, total, rates };
      }

      return { tipo: "outro" as const, periodoBase, rates };
    }),
});
