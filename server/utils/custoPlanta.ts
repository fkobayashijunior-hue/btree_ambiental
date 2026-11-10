// Custo e receita por planta. PLANTA = LOCAL DE TRABALHO (gps_locations.id), o mesmo campo usado em cargas, abastecimento e presenças. Cada FONTE é calculada separadamente e devolvida em linhas planas
// (mês × planta × fonte × categoria); a tela escolhe quais fontes somar. Uma fonte por conceito:
//   · lançamentos manuais/importados e pedágios (extrato)  → tabela custo_lancamentos
//   · combustível                                          → CONSUMO (vehicle_records + machine_fuel), nunca as faturas
//   · diárias e folha CLT/PJ                               → MESMO valor da tela Folha de Pagamento (só administradores), rateado pelos dias de presença em cada planta
//   · compra de madeira                                    → CONTROLE DE CARGAS (carga × preço do fornecedor), na planta da carga
// Fontes extras (desligadas por padrão na tela) existem para não esconder custo real: manutenção dos registros,
// compra de madeira, corte terceirizado, frete e combustível de terceiros.
import { sqlNum, SQL_KG } from "./financeiroCanonico";

type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };

export type Fonte =
  | "lancamentos" | "pedagio" | "combustivel_veiculos" | "combustivel_maquinas" | "diarias" | "folha"
  | "manutencao_veiculos" | "manutencao_outros" | "madeira" | "corte" | "frete" | "combustivel_terceiros";

export type LinhaCusto = {
  mes: string; plantaId: number | null; fonte: Fonte; categoria: string | null; tipo: "fixo" | "variavel" | null;
  valor: number; qtd: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
async function q(db: Db, sql: string, params: any[] = []): Promise<any[]> {
  const [r] = await db.$client.execute(sql, params);
  return r as any[];
}
const ultimoDiaDoMes = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).toISOString().slice(0, 10);
const proximoMes = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 1)).toISOString().slice(0, 7);
const mesDe = (col: string) => `DATE_FORMAT(${col}, '%Y-%m')`;
const entre = (col: string) => `DATE(${col}) BETWEEN ? AND ?`;

export type LinhaFolha = { collaboratorId: number; employmentType: string; totalAmount: string | number };

/** getFolhaMes devolve as linhas da Folha de Pagamento de um mês (mesma conta da tela de Folha). Sem ele, folha e diárias ficam de fora. */
export async function custoPorPlanta(db: Db, inicio: string, fim: string, opts: { getFolhaMes?: (ym: string) => Promise<LinhaFolha[]> } = {}) {
  const linhas: LinhaCusto[] = [];
  const erros: string[] = [];
  const ymIni = inicio.slice(0, 7), ymFim = fim.slice(0, 7);
  const periodo = [inicio, fim];

  const rodar = async (nome: string, fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { erros.push(`${nome}: ${String(e?.message ?? e).slice(0, 140)}`); }
  };
  const simples = (fonte: Fonte, sql: string, params: any[] = periodo, categoria: string | null = null) =>
    rodar(fonte, async () => {
      for (const r of await q(db, sql, params)) {
        const valor = r2(Number(r.v ?? 0));
        if (valor !== 0) linhas.push({ mes: String(r.mes), plantaId: r.p === null || r.p === undefined ? null : Number(r.p), fonte, categoria, tipo: null, valor, qtd: Number(r.n ?? 0) });
      }
    });

  // 1) Lançamentos manuais, importados e pedágios do extrato (competência; cancelados fora)
  await rodar("lancamentos", async () => {
    const rs = await q(db,
      `SELECT ${mesDe("l.data_competencia")} AS mes, l.planta_id AS p, l.origem, l.tipo, COALESCE(c.nome, 'Sem tipo') AS cat,
              SUM(l.valor) AS v, COUNT(*) AS n
       FROM custo_lancamentos l LEFT JOIN custo_categorias c ON c.id = l.categoria_id
       WHERE l.status <> 'cancelado' AND l.data_competencia BETWEEN ? AND ?
       GROUP BY mes, l.planta_id, l.origem, l.tipo, cat`, periodo);
    for (const r of rs) {
      linhas.push({
        mes: String(r.mes), plantaId: r.p === null ? null : Number(r.p),
        fonte: r.origem === "extrato_pedagio" ? "pedagio" : "lancamentos",
        categoria: String(r.cat), tipo: r.tipo === "fixo" ? "fixo" : "variavel", valor: r2(Number(r.v)), qtd: Number(r.n),
      });
    }
  });

  // 2) Combustível por consumo
  await simples("combustivel_veiculos",
    `SELECT ${mesDe("date")} AS mes, work_location_id AS p, SUM(${sqlNum("fuel_cost")}) AS v, COUNT(*) AS n
     FROM vehicle_records WHERE record_type = 'abastecimento' AND ${entre("date")} GROUP BY mes, p`);
  await simples("combustivel_maquinas",
    `SELECT ${mesDe("date")} AS mes, work_location_id AS p, SUM(${sqlNum("total_value")}) AS v, COUNT(*) AS n
     FROM machine_fuel WHERE ${entre("date")} GROUP BY mes, p`);

  // 3) Folha e diárias: MESMO valor da tela de Folha de Pagamento (salário + comissão − desconto, inclusive meses ainda não fechados).
  //    Cada linha é rateada pelos dias de presença do colaborador em cada planta no mês; sem presença com local → sem planta.
  //    CLT/PJ = "folha"; diarista, semanal e terceirizado = "diarias".
  if (!opts.getFolhaMes) {
    erros.push("Folha e diárias só aparecem para administradores (dados de pagamento).");
  } else {
    await rodar("folha", async () => {
      const pres = await q(db,
        `SELECT collaborator_id AS cid, ${mesDe("date")} AS mes, work_location_id AS p, COUNT(*) AS n
         FROM collaborator_attendance WHERE work_location_id IS NOT NULL AND ${entre("date")} GROUP BY cid, mes, p`,
        [`${ymIni}-01`, ultimoDiaDoMes(ymFim)]);
      const dias = new Map<string, { p: number; n: number }[]>();
      for (const r of pres) {
        const k = `${r.cid}|${r.mes}`;
        (dias.get(k) ?? dias.set(k, []).get(k)!).push({ p: Number(r.p), n: Number(r.n) });
      }
      const acc = new Map<string, LinhaCusto>();
      const somar = (mes: string, p: number | null, fonte: Fonte, v: number) => {
        const k = `${mes}|${p}|${fonte}`;
        const x = acc.get(k) ?? { mes, plantaId: p, fonte, categoria: null, tipo: null, valor: 0, qtd: 0 };
        x.valor += v; x.qtd += 1; acc.set(k, x);
      };
      // um mês por vez, do primeiro ao último do período
      for (let ym = ymIni; ym <= ymFim; ym = proximoMes(ym)) {
        let rows: LinhaFolha[] = [];
        try { rows = await opts.getFolhaMes!(ym); }
        catch (e: any) { erros.push(`folha ${ym}: ${String(e?.message ?? e).slice(0, 120)}`); continue; }
        for (const r of rows) {
          const v = Number(r.totalAmount ?? 0);
          if (!(v > 0)) continue;
          const fonte: Fonte = r.employmentType === "clt" || r.employmentType === "pj" ? "folha" : "diarias";
          const d = dias.get(`${r.collaboratorId}|${ym}`);
          const total = d?.reduce((t, x) => t + x.n, 0) ?? 0;
          if (!d || total === 0) somar(ym, null, fonte, v);
          else for (const x of d) somar(ym, x.p, fonte, (v * x.n) / total);
        }
      }
      for (const x of Array.from(acc.values())) linhas.push({ ...x, valor: r2(x.valor) });
    });
  }

  // 5) Compra de madeira pelo controle de cargas: quantidade da carga × preço do fornecedor (cliente da carga).
  //    O preço e a unidade (ton/m³) seguem o fechamento semanal que cobre a carga (igual à tela de Fechamentos);
  //    sem fechamento, vale o preço por tonelada do cadastro do cliente. A planta é o Local de Trabalho da carga.
  let madeiraSemPreco = 0;
  await rodar("madeira", async () => {
    const kg = SQL_KG.replace(/\bl\./g, "l.");
    const vol = sqlNum("l.volume_m3");
    const fech = (col: string) => `(SELECT f.${col} FROM cargo_weekly_closings f WHERE f.client_id = l.client_id AND f.area_id <=> l.area_id
        AND DATE(COALESCE(l.delivery_date, l.date)) BETWEEN f.week_start AND f.week_end ORDER BY f.id DESC LIMIT 1)`;
    const preco = `COALESCE(NULLIF(${sqlNum(fech("price_per_ton"))}, 0), ${sqlNum("cc.price_per_ton")}, 0)`;
    const valor = `ROUND(IF(COALESCE(${fech("price_unit")}, 'ton') = 'm3', ${vol}, ${kg} / 1000) * ${preco}, 2)`;
    const rs = await q(db,
      `SELECT ${mesDe("COALESCE(l.delivery_date, l.date)")} AS mes, l.work_location_id AS p, SUM(${valor}) AS v, COUNT(*) AS n,
              SUM(IF(${preco} > 0, 0, 1)) AS sem_preco
       FROM cargo_loads l LEFT JOIN clients cc ON cc.id = l.client_id
       WHERE l.status <> 'cancelado' AND l.client_id IS NOT NULL AND ${entre("COALESCE(l.delivery_date, l.date)")} GROUP BY mes, p`, periodo);
    for (const r of rs) {
      madeiraSemPreco += Number(r.sem_preco ?? 0);
      const v = r2(Number(r.v ?? 0));
      if (v !== 0) linhas.push({ mes: String(r.mes), plantaId: r.p === null ? null : Number(r.p), fonte: "madeira", categoria: null, tipo: null, valor: v, qtd: Number(r.n) });
    }
  });

  // ── Fontes extras (desligadas por padrão) ──
  await simples("manutencao_veiculos",
    `SELECT ${mesDe("date")} AS mes, work_location_id AS p, SUM(${sqlNum("maintenance_cost")}) AS v, COUNT(*) AS n
     FROM vehicle_records WHERE record_type = 'manutencao' AND ${entre("date")} GROUP BY mes, p`);
  await simples("manutencao_outros",
    `SELECT mes, NULL AS p, SUM(v) AS v, SUM(n) AS n FROM (
       SELECT ${mesDe("date")} AS mes, ${sqlNum("total_cost")} AS v, 1 AS n FROM machine_maintenance WHERE ${entre("date")}
       UNION ALL SELECT ${mesDe("performed_at")}, ${sqlNum("cost")}, 1 FROM equipment_maintenance WHERE ${entre("performed_at")}
       UNION ALL SELECT ${mesDe("date")}, ${sqlNum("total_value")}, 1 FROM equipment_oil_records WHERE ${entre("date")}
     ) t GROUP BY mes`, [...periodo, ...periodo, ...periodo]);
  await simples("corte",
    `SELECT ${mesDe("COALESCE(delivery_date, date)")} AS mes, work_location_id AS p, SUM(COALESCE(third_party_cost, 0)) AS v, COUNT(*) AS n
     FROM cargo_loads WHERE third_party_contractor IS NOT NULL AND third_party_contractor <> '' AND status <> 'cancelado'
       AND ${entre("COALESCE(delivery_date, date)")} GROUP BY mes, p`);
  await simples("frete",
    `SELECT ${mesDe("date")} AS mes, NULL AS p, SUM(${sqlNum("amount")}) AS v, COUNT(*) AS n FROM financial_entries
     WHERE type = 'despesa' AND BINARY category = 'frete' AND status = 'confirmado' AND auto_generated = 0 AND ${entre("date")} GROUP BY mes`);
  await simples("combustivel_terceiros",
    `SELECT ${mesDe("date")} AS mes, NULL AS p, SUM(${sqlNum("total")}) AS v, COUNT(*) AS n FROM third_party_fuel WHERE ${entre("date")} GROUP BY mes`);

  // ── Receita por planta: cargas entregues × preço do comprador (mesma regra de Resultado por Cliente) ──
  const receita: { mes: string; plantaId: number | null; valor: number; cargas: number; semPreco: number }[] = [];
  await rodar("receita", async () => {
    const kg = SQL_KG.replace(/\bl\./g, "cl.");
    const vol = sqlNum("cl.volume_m3");
    const pu = sqlNum("cd.price_per_unit"), pt = sqlNum("cd.price_per_ton"), pm = sqlNum("cd.price_per_m3");
    const rec = `CASE WHEN cd.id IS NULL THEN 0
      WHEN ${pu} > 0 THEN IF(cd.unit = 'm3', ${vol}, ${kg} / 1000) * ${pu}
      WHEN cd.price_type = 'm3' THEN ${vol} * ${pm}
      ELSE ${kg} / 1000 * ${pt} END`;
    const rs = await q(db,
      `SELECT ${mesDe("COALESCE(cl.delivery_date, cl.date)")} AS mes, cl.work_location_id AS p, SUM(${rec}) AS v, COUNT(*) AS n,
              SUM(IF(${rec} > 0, 0, 1)) AS sem_preco
       FROM cargo_loads cl
       LEFT JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
       WHERE cl.status = 'entregue' AND ${entre("COALESCE(cl.delivery_date, cl.date)")} GROUP BY mes, p`, periodo);
    for (const r of rs) receita.push({ mes: String(r.mes), plantaId: r.p === null ? null : Number(r.p), valor: r2(Number(r.v ?? 0)), cargas: Number(r.n), semPreco: Number(r.sem_preco ?? 0) });
  });

  // ── Alertas de possível duplicidade ──
  const alertas: { tipo: string; texto: string }[] = [];
  await rodar("alertas", async () => {
    const dup = await q(db,
      `SELECT data_competencia AS d, planta_id AS p, valor AS v, MIN(descricao) AS descr, COUNT(*) AS n FROM custo_lancamentos
       WHERE status <> 'cancelado' AND origem IN ('manual','importacao') AND data_competencia BETWEEN ? AND ?
       GROUP BY data_competencia, planta_id, valor, LOWER(TRIM(descricao)) HAVING COUNT(*) > 1 ORDER BY d DESC LIMIT 15`, periodo);
    for (const r of dup) {
      const d = r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      alertas.push({ tipo: "duplicado", texto: `“${r.descr}” lançado ${r.n}x no mesmo dia (${d.split("-").reverse().join("/")}) com o mesmo valor.` });
    }
    const manut = await q(db,
      `SELECT l.descricao AS descr, l.valor AS v, l.data_competencia AS d FROM custo_lancamentos l
       WHERE l.status <> 'cancelado' AND l.origem <> 'extrato_pedagio' AND l.data_competencia BETWEEN ? AND ? AND (
         EXISTS (SELECT 1 FROM vehicle_records v WHERE v.record_type = 'manutencao' AND DATE(v.date) = l.data_competencia AND ${sqlNum("v.maintenance_cost")} = l.valor)
         OR EXISTS (SELECT 1 FROM machine_maintenance m WHERE DATE(m.date) = l.data_competencia AND ${sqlNum("m.total_cost")} = l.valor))
       LIMIT 15`, periodo);
    for (const r of manut) {
      const d = r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      alertas.push({ tipo: "manutencao", texto: `“${r.descr}” (R$ ${Number(r.v).toFixed(2)}, ${d.split("-").reverse().join("/")}) tem o mesmo valor e data de uma manutenção já registrada. Se for o mesmo gasto, não ligue a fonte “Manutenção dos registros”.` });
    }
  });

  if (madeiraSemPreco > 0) {
    alertas.push({ tipo: "madeira", texto: `${madeiraSemPreco} carga(s) sem preço do fornecedor na compra de madeira (custo R$ 0,00). Confira o preço do cliente ou do fechamento.` });
  }
  return { linhas, receita, alertas, erros };
}
