// Detalhe de cada bloco de custo da aba "Custo da operação": os MESMOS registros e filtros que formam
// o valor do bloco em financeiroCanonico.competenciaCustos (a soma do detalhe deve bater com o bloco).
import { sqlNum, EXTRA_SEM_EMPRESTIMO, SQL_CARGAS_FECHAMENTO, SQL_FECHAMENTO_VIVO, SQL_KG } from "./financeiroCanonico";

type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };

export type LinhaDetalhe = { data: string; descricao: string; detalhe: string; valor: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function detalheBloco(db: Db, chave: string, inicio: string, fim: string, limite = 500) {
  const ms = (d: string, add: number) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + add;
  const msInicio = ms(inicio, 3 * 3600_000);
  const msFim = ms(fim, 27 * 3600_000) - 1;
  const ymIni = inicio.slice(0, 7), ymFim = fim.slice(0, 7);
  const dR = (col: string) => `DATE(${col}) BETWEEN ? AND ?`;
  const P = [inicio, fim];

  const extraCond: Record<string, string> = {
    extras_material: `x.category = 'compra_material' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_refeicao: `x.category = 'refeicao' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_pedagio: `x.category = 'pedagio' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_outros: `x.category = 'outro' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_abastecimento: `x.category = 'abastecimento' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_servico_terceiro: `x.category = 'servico_terceiro' AND ${EXTRA_SEM_EMPRESTIMO}`,
    extras_emprestimo: `NOT (${EXTRA_SEM_EMPRESTIMO})`,
  };

  let sql = "";
  let params: any[] = P;
  switch (chave) {
    case "folha_clt_pj":
      sql = `SELECT reference_month AS data, collaborator_name AS descricao,
                    CONCAT(UPPER(employment_type), ' · folha ', status) AS detalhe, ${sqlNum("base_value")} AS valor
             FROM payroll_entries WHERE employment_type IN ('clt','pj') AND reference_month BETWEEN ? AND ? ORDER BY collaborator_name`;
      params = [ymIni, ymFim];
      break;
    case "comissoes":
      sql = `SELECT reference_month AS data, collaborator_name AS descricao,
                    CONCAT('comissão ', ${sqlNum("commission")}, ' − desconto ', ${sqlNum("discount")}, ' · ', commission_status) AS detalhe,
                    (${sqlNum("commission")} - ${sqlNum("discount")}) AS valor
             FROM payroll_entries WHERE reference_month BETWEEN ? AND ? ORDER BY collaborator_name`;
      params = [ymIni, ymFim];
      break;
    case "diaristas":
      sql = `SELECT DATE(a.date) AS data, COALESCE(c.name, CONCAT('#', a.collaborator_id)) AS descricao,
                    CONCAT_WS(' · ', a.employment_type_ca, a.activity, a.work_location, a.payment_status_ca) AS detalhe, ${sqlNum("a.daily_value")} AS valor
             FROM collaborator_attendance a LEFT JOIN collaborators c ON c.id = a.collaborator_id
             WHERE a.employment_type_ca IN ('diarista','terceirizado','semanal') AND ${dR("a.date")} ORDER BY a.date, c.name`;
      break;
    case "madeira":
      sql = `SELECT f.week_end AS data, COALESCE(c.name, CONCAT('#', f.client_id)) AS descricao,
                    CONCAT('semana ', f.week_start, ' a ', f.week_end, ' · ',
                           COALESCE(${SQL_CARGAS_FECHAMENTO("COUNT(*)")}, 0), ' carga(s) · ',
                           ROUND(COALESCE(${SQL_CARGAS_FECHAMENTO(`SUM(${SQL_KG})`)}, 0) / 1000, 2), ' t · ', f.status,
                           IF(ABS(${SQL_FECHAMENTO_VIVO("f", "c")} - f.total_amount) > 0.01, CONCAT(' · valor gravado antigo R$ ', f.total_amount), '')) AS detalhe,
                    ${SQL_FECHAMENTO_VIVO("f", "c")} AS valor
             FROM cargo_weekly_closings f LEFT JOIN clients c ON c.id = f.client_id WHERE f.week_end BETWEEN ? AND ? ORDER BY f.week_end, c.name`;
      break;
    case "corte_terceirizado":
      sql = `SELECT DATE(COALESCE(delivery_date, date)) AS data, third_party_contractor AS descricao,
                    CONCAT_WS(' · ', vehicle_plate, client_name, CONCAT(volume_m3, ' m³'), IF(third_party_paid = 1, 'pago', 'a pagar')) AS detalhe,
                    third_party_cost AS valor
             FROM cargo_loads WHERE third_party_contractor IS NOT NULL AND third_party_contractor <> '' AND status <> 'cancelado'
               AND ${dR("COALESCE(delivery_date, date)")} ORDER BY 1`;
      break;
    case "frete_terceirizado":
      sql = `SELECT DATE(date) AS data, COALESCE(description, 'Frete') AS descricao,
                    CONCAT_WS(' · ', client_name, equipment_name, payment_method) AS detalhe, ${sqlNum("amount")} AS valor
             FROM financial_entries WHERE type = 'despesa' AND BINARY category = 'frete' AND status = 'confirmado' AND auto_generated = 0
               AND ${dR("date")} ORDER BY date`;
      break;
    case "comb_veiculos":
      sql = `SELECT DATE(v.date) AS data, COALESCE(e.name, CONCAT('#', v.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', CONCAT(v.liters, ' L'), CONCAT('R$ ', v.price_per_liter, '/L'), v.supplier, v.fuel_location) AS detalhe,
                    ${sqlNum("v.fuel_cost")} AS valor
             FROM vehicle_records v LEFT JOIN equipment e ON e.id = v.equipment_id
             WHERE v.record_type = 'abastecimento' AND ${dR("v.date")} ORDER BY v.date`;
      break;
    case "comb_maquinas":
      sql = `SELECT DATE(m.date) AS data, COALESCE(e.name, CONCAT('#', m.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', CONCAT(m.liters, ' L'), m.fuel_type, m.supplier) AS detalhe, ${sqlNum("m.total_value")} AS valor
             FROM machine_fuel m LEFT JOIN equipment e ON e.id = m.equipment_id WHERE ${dR("m.date")} ORDER BY m.date`;
      break;
    case "comb_terceiros":
      sql = `SELECT DATE(t.date) AS data, COALESCE(e.name, CONCAT('#', t.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', CONCAT(t.liters, ' L'), t.location) AS detalhe, ${sqlNum("t.total")} AS valor
             FROM third_party_fuel t LEFT JOIN equipment e ON e.id = t.equipment_id WHERE ${dR("t.date")} ORDER BY t.date`;
      break;
    case "manut_veiculos":
      sql = `SELECT DATE(v.date) AS data, COALESCE(e.name, CONCAT('#', v.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', v.maintenance_type, v.mechanic_name, v.maintenance_location) AS detalhe, ${sqlNum("v.maintenance_cost")} AS valor
             FROM vehicle_records v LEFT JOIN equipment e ON e.id = v.equipment_id
             WHERE v.record_type = 'manutencao' AND ${dR("v.date")} ORDER BY v.date`;
      break;
    case "manut_maquinas":
      sql = `SELECT DATE(m.date) AS data, COALESCE(e.name, CONCAT('#', m.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', m.type, m.mechanic_name, LEFT(m.description, 80)) AS detalhe, ${sqlNum("m.total_cost")} AS valor
             FROM machine_maintenance m LEFT JOIN equipment e ON e.id = m.equipment_id WHERE ${dR("m.date")} ORDER BY m.date`;
      break;
    case "manut_equipamentos":
      sql = `SELECT DATE(m.performed_at) AS data, COALESCE(e.name, CONCAT('#', m.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', m.type, m.performed_by, LEFT(m.description, 80)) AS detalhe, ${sqlNum("m.cost")} AS valor
             FROM equipment_maintenance m LEFT JOIN equipment e ON e.id = m.equipment_id WHERE ${dR("m.performed_at")} ORDER BY m.performed_at`;
      break;
    case "oleos":
      sql = `SELECT DATE(o.date) AS data, COALESCE(e.name, CONCAT('#', o.equipment_id)) AS descricao,
                    CONCAT_WS(' · ', o.oil_type, CONCAT(o.quantity_liters, ' L'), o.brand, o.supplier) AS detalhe, ${sqlNum("o.total_value")} AS valor
             FROM equipment_oil_records o LEFT JOIN equipment e ON e.id = o.equipment_id WHERE ${dR("o.date")} ORDER BY o.date`;
      break;
    case "compras":
      sql = `SELECT DATE(FROM_UNIXTIME(purchased_at / 1000)) AS data, title AS descricao,
                    CONCAT_WS(' · ', status, payment_method, IF(is_direct_purchase = 1, 'compra direta', NULL)) AS detalhe, ${sqlNum("final_price")} AS valor
             FROM purchase_requests WHERE status IN ('comprada','recebida') AND purchased_at BETWEEN ? AND ? ORDER BY purchased_at`;
      params = [msInicio, msFim];
      break;
    default:
      if (extraCond[chave]) {
        sql = `SELECT DATE(x.date) AS data, COALESCE(x.description, '—') AS descricao,
                      CONCAT_WS(' · ', x.category, x.registered_by_name, x.payment_method, e.name) AS detalhe, ${sqlNum("x.amount")} AS valor
               FROM extra_expenses x LEFT JOIN equipment e ON e.id = x.equipment_id
               WHERE ${dR("x.date")} AND ${extraCond[chave]} ORDER BY x.date`;
      } else {
        return { linhas: [] as LinhaDetalhe[], total: 0, qtd: 0, truncado: false, erro: "Bloco desconhecido" as string | null };
      }
  }

  try {
    const [r] = await db.$client.execute(sql, params);
    const dia = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
    const todas: LinhaDetalhe[] = (r as any[]).map(x => ({
      data: dia(x.data), descricao: String(x.descricao ?? "—"), detalhe: String(x.detalhe ?? ""), valor: r2(Number(x.valor ?? 0)),
    }));
    const total = r2(todas.reduce((s, l) => s + l.valor, 0));
    return { linhas: todas.slice(0, limite), total, qtd: todas.length, truncado: todas.length > limite, erro: null as string | null };
  } catch (e: any) {
    return { linhas: [] as LinhaDetalhe[], total: 0, qtd: 0, truncado: false, erro: String(e?.message ?? e).slice(0, 200) as string | null };
  }
}
