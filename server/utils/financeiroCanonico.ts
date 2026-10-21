// Definições canônicas do Dashboard Financeiro Real: uma fonte por conceito, para nunca contar
// o mesmo dinheiro duas vezes.
//   • CAIXA = só extrato bancário (ver server/routers/financialReal.ts).
//   • COMPETÊNCIA (custo da operação) = só tabelas do sistema, na data do fato.
//   • PAGAMENTOS DO SISTEMA = o que o sistema marca como pago, usado apenas para EXPLICAR débitos
//     do extrato (conciliação) — nunca somado ao caixa.

export type Sugestao = { grupo: string; centroCusto: string; natureza: string };

export type PagamentoSistema = {
  tipo: string;            // ex.: "folha_salario", "fechamento_madeira"
  tipoLabel: string;
  refId: number | null;
  descricao: string;
  valor: number;           // positivo
  data: string;            // YYYY-MM-DD (data em que o sistema marcou como pago)
  sugestao: Sugestao;
};

export type DebitoBanco = {
  id: number;
  data: string;
  valor: number;           // positivo
  descricao: string | null;
  complemento: string | null;
  classificado: boolean;
  grupo: string | null;
  centroCusto: string | null;
  natureza: string | null;
  tipoResultado: string;
};

export type Casamento = { pagamento: PagamentoSistema; debito: DebitoBanco; diasDiferenca: number };

function diasEntre(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const dbb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((dbb - da) / 86400000);
}

/**
 * Casa pagamentos do sistema com débitos do banco: mesmo valor (centavos) e data até `toleranciaDias`
 * de distância. 1 para 1, escolhendo o débito de data mais próxima. É uma SUGESTÃO para explicar o
 * lançamento — o total do caixa não depende dela.
 */
export function casarPagamentos(
  pagamentos: PagamentoSistema[],
  debitos: DebitoBanco[],
  toleranciaDias = 7
): { casados: Casamento[]; pagamentosSemBanco: PagamentoSistema[]; debitosSemSistema: DebitoBanco[] } {
  const livres = new Map<number, DebitoBanco>(debitos.map(d => [d.id, d]));
  const porCentavos = new Map<number, DebitoBanco[]>();
  for (const d of debitos) {
    const k = Math.round(d.valor * 100);
    const arr = porCentavos.get(k) ?? [];
    arr.push(d);
    porCentavos.set(k, arr);
  }

  const casados: Casamento[] = [];
  const semBanco: PagamentoSistema[] = [];
  const ordenados = [...pagamentos].sort((a, b) => a.data.localeCompare(b.data) || b.valor - a.valor);

  for (const p of ordenados) {
    const candidatos = (porCentavos.get(Math.round(p.valor * 100)) ?? []).filter(d => livres.has(d.id));
    let melhor: DebitoBanco | null = null;
    let melhorDif = Infinity;
    for (const d of candidatos) {
      const dif = Math.abs(diasEntre(p.data, d.data));
      if (dif <= toleranciaDias && dif < melhorDif) { melhor = d; melhorDif = dif; }
    }
    if (melhor) {
      livres.delete(melhor.id);
      casados.push({ pagamento: p, debito: melhor, diasDiferenca: diasEntre(p.data, melhor.data) });
    } else {
      semBanco.push(p);
    }
  }
  return { casados, pagamentosSemBanco: semBanco, debitosSemSistema: Array.from(livres.values()) };
}

// ───────────────────────── Acesso a dados ─────────────────────────

type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };

/** Converte varchar monetário (aceita "1234.56" e "1.234,56") em DECIMAL no SQL. */
export const sqlNum = (col: string) =>
  `CAST(IF(${col} IS NULL OR ${col} = '', 0, IF(${col} LIKE '%,%', REPLACE(REPLACE(${col}, '.', ''), ',', '.'), ${col})) AS DECIMAL(15,2))`;

const r2 = (n: number) => Math.round(n * 100) / 100;

async function rows(db: Db, sql: string, params: any[] = []): Promise<any[]> {
  const [r] = await db.$client.execute(sql, params);
  return r as any[];
}

export type BlocoCusto = {
  chave: string;
  label: string;
  grupo: "pessoal" | "madeira" | "combustivel" | "manutencao" | "outros";
  valor: number;
  qtd: number;
  /** false = informativo (não entra no total, para não duplicar com outro bloco) */
  somaNoTotal: boolean;
  nota?: string;
  erro?: string;
};

// Extra que NÃO é empréstimo (descrição sem "empréstimo")
/**
 * Valor ATUAL de um fechamento semanal (alias `f` = cargo_weekly_closings, `cc` = clients).
 * O `total_amount` gravado é uma foto do momento em que o fechamento foi criado; cargas entregues ou
 * pesadas depois mudam o total. A tela de Fechamentos recalcula ao vivo (cargas do cliente/área no
 * período × preço) — e o banco pagou o valor ao vivo — então o dashboard usa o mesmo cálculo.
 */
export const SQL_CARGAS_FECHAMENTO = (select: string, f = "f") =>
  `(SELECT ${select} FROM cargo_loads l WHERE l.client_id = ${f}.client_id AND l.area_id <=> ${f}.area_id AND l.status <> 'cancelado'
      AND DATE(COALESCE(l.delivery_date, l.date)) BETWEEN ${f}.week_start AND ${f}.week_end)`;
export const SQL_KG = `CAST(IF(NULLIF(l.weight_net_kg, '') IS NOT NULL, l.weight_net_kg, IF(NULLIF(l.weight_out_kg, '') IS NOT NULL, l.weight_out_kg, '0')) AS DECIMAL(15,3))`;
export const SQL_FECHAMENTO_VIVO = (f = "f", cc = "cc") =>
  `ROUND(IF(${f}.price_unit = 'm3',
      COALESCE(${SQL_CARGAS_FECHAMENTO(`SUM(${sqlNum("l.volume_m3")})`, f)}, 0),
      COALESCE(${SQL_CARGAS_FECHAMENTO(`SUM(${SQL_KG})`, f)}, 0) / 1000)
    * COALESCE(NULLIF(${f}.price_per_ton, 0), ${cc}.price_per_ton + 0, 0), 2)`;

export const EXTRA_SEM_EMPRESTIMO ="(description IS NULL OR description NOT LIKE '%EMPR_STIMO%')";

function ymDe(data: string) { return data.slice(0, 7); }

// ── COMPETÊNCIA: custo da operação na data do fato (nunca soma extrato) ──
export async function competenciaCustos(db: Db, inicio: string, fim: string) {
  const blocos: BlocoCusto[] = [];
  const msInicio = Date.UTC(+inicio.slice(0, 4), +inicio.slice(5, 7) - 1, +inicio.slice(8, 10)) + 3 * 3600_000;
  const msFim = Date.UTC(+fim.slice(0, 4), +fim.slice(5, 7) - 1, +fim.slice(8, 10)) + 27 * 3600_000 - 1;

  async function bloco(
    def: Omit<BlocoCusto, "valor" | "qtd">,
    sql: string, params: any[]
  ) {
    try {
      const r = await rows(db, sql, params);
      blocos.push({ ...def, valor: r2(Number(r[0]?.total ?? 0)), qtd: Number(r[0]?.qtd ?? 0) });
    } catch (e: any) {
      // falha visível na tela — nunca engolida em silêncio
      blocos.push({ ...def, valor: 0, qtd: 0, erro: String(e?.message ?? e).slice(0, 160) });
    }
  }

  const ymIni = ymDe(inicio), ymFim = ymDe(fim);
  const dRange = (col: string) => `DATE(${col}) BETWEEN ? AND ?`;

  await bloco(
    { chave: "folha_clt_pj", label: "Salários CLT/PJ", grupo: "pessoal", somaNoTotal: true,
      nota: "Folha salva/fechada do mês (reference_month). Meses sem folha fechada não aparecem." },
    `SELECT COALESCE(SUM(${sqlNum("base_value")}),0) AS total, COUNT(*) AS qtd FROM payroll_entries
     WHERE employment_type IN ('clt','pj') AND reference_month BETWEEN ? AND ?`, [ymIni, ymFim]);
  await bloco(
    { chave: "comissoes", label: "Comissões (líquidas do desconto)", grupo: "pessoal", somaNoTotal: true,
      nota: "O desconto de combustível de terceirizado é recuperação, não despesa." },
    `SELECT COALESCE(SUM(${sqlNum("commission")} - ${sqlNum("discount")}),0) AS total, COUNT(*) AS qtd FROM payroll_entries
     WHERE reference_month BETWEEN ? AND ?`, [ymIni, ymFim]);
  await bloco(
    { chave: "diaristas", label: "Diárias (presenças)", grupo: "pessoal", somaNoTotal: true,
      nota: "Só diarista/semanal/terceirizado — presença de CLT é rateio, não custo extra." },
    `SELECT COALESCE(SUM(${sqlNum("daily_value")}),0) AS total, COUNT(*) AS qtd FROM collaborator_attendance
     WHERE employment_type_ca IN ('diarista','terceirizado','semanal') AND ${dRange("date")}`, [inicio, fim]);

  await bloco(
    { chave: "madeira", label: "Compra de madeira (fechamentos semanais)", grupo: "madeira", somaNoTotal: true,
      nota: "Fechamento pela data final da semana, com o valor ATUAL das cargas (igual à tela de Fechamentos). Adiantamentos não entram." },
    `SELECT COALESCE(SUM(t.v),0) AS total, COUNT(*) AS qtd FROM (
       SELECT ${SQL_FECHAMENTO_VIVO("f", "cc")} AS v FROM cargo_weekly_closings f LEFT JOIN clients cc ON cc.id = f.client_id
       WHERE f.week_end BETWEEN ? AND ?) t`, [inicio, fim]);
  await bloco(
    { chave: "corte_terceirizado", label: "Corte terceirizado", grupo: "madeira", somaNoTotal: true },
    `SELECT COALESCE(SUM(third_party_cost),0) AS total, COUNT(*) AS qtd FROM cargo_loads
     WHERE third_party_contractor IS NOT NULL AND third_party_contractor <> '' AND status <> 'cancelado'
       AND ${dRange("COALESCE(delivery_date, date)")}`, [inicio, fim]);
  await bloco(
    { chave: "frete_terceirizado", label: "Frete de caminhão terceirizado", grupo: "madeira", somaNoTotal: true,
      nota: "Registrado no momento do pagamento (financial_entries 'frete')." },
    `SELECT COALESCE(SUM(${sqlNum("amount")}),0) AS total, COUNT(*) AS qtd FROM financial_entries
     WHERE type = 'despesa' AND BINARY category = 'frete' AND status = 'confirmado' AND auto_generated = 0
       AND ${dRange("date")}`, [inicio, fim]);

  await bloco(
    { chave: "comb_veiculos", label: "Combustível — veículos (consumo)", grupo: "combustivel", somaNoTotal: true,
      nota: "Consumo valorizado (litros × preço), inclusive do tanque. Não soma com as faturas de combustível." },
    `SELECT COALESCE(SUM(${sqlNum("fuel_cost")}),0) AS total, COUNT(*) AS qtd FROM vehicle_records
     WHERE record_type = 'abastecimento' AND ${dRange("date")}`, [inicio, fim]);
  await bloco(
    { chave: "comb_maquinas", label: "Combustível — máquinas", grupo: "combustivel", somaNoTotal: true },
    `SELECT COALESCE(SUM(${sqlNum("total_value")}),0) AS total, COUNT(*) AS qtd FROM machine_fuel WHERE ${dRange("date")}`, [inicio, fim]);
  await bloco(
    { chave: "comb_terceiros", label: "Combustível — terceiros", grupo: "combustivel", somaNoTotal: true },
    `SELECT COALESCE(SUM(${sqlNum("total")}),0) AS total, COUNT(*) AS qtd FROM third_party_fuel WHERE ${dRange("date")}`, [inicio, fim]);

  await bloco(
    { chave: "manut_veiculos", label: "Manutenção — veículos", grupo: "manutencao", somaNoTotal: true },
    `SELECT COALESCE(SUM(${sqlNum("maintenance_cost")}),0) AS total, COUNT(*) AS qtd FROM vehicle_records
     WHERE record_type = 'manutencao' AND ${dRange("date")}`, [inicio, fim]);
  await bloco(
    { chave: "manut_maquinas", label: "Manutenção — máquinas", grupo: "manutencao", somaNoTotal: true },
    `SELECT COALESCE(SUM(${sqlNum("total_cost")}),0) AS total, COUNT(*) AS qtd FROM machine_maintenance WHERE ${dRange("date")}`, [inicio, fim]);
  await bloco(
    { chave: "manut_equipamentos", label: "Manutenção — equipamentos/peças", grupo: "manutencao", somaNoTotal: true,
      nota: "O custo já inclui peças e mão de obra (não soma peças de novo)." },
    `SELECT COALESCE(SUM(${sqlNum("cost")}),0) AS total, COUNT(*) AS qtd FROM equipment_maintenance WHERE ${dRange("performed_at")}`, [inicio, fim]);
  await bloco(
    { chave: "oleos", label: "Óleos e lubrificantes", grupo: "manutencao", somaNoTotal: true },
    `SELECT COALESCE(SUM(${sqlNum("total_value")}),0) AS total, COUNT(*) AS qtd FROM equipment_oil_records WHERE ${dRange("date")}`, [inicio, fim]);

  // Despesas extras por categoria. Categorias que se repetem em outros blocos (abastecimento → combustível,
  // serviço terceirizado → madeira/corte) e empréstimos lançados como extra são informativos (não somam).
  const extra = (chave: string, label: string, cond: string, somaNoTotal: boolean, nota?: string) =>
    bloco({ chave, label, grupo: "outros", somaNoTotal, nota },
      `SELECT COALESCE(SUM(${sqlNum("amount")}),0) AS total, COUNT(*) AS qtd FROM extra_expenses WHERE ${dRange("date")} AND ${cond}`, [inicio, fim]);
  await extra("extras_material", "Extras — compra de material", `category = 'compra_material' AND ${EXTRA_SEM_EMPRESTIMO}`, true);
  await extra("extras_refeicao", "Extras — refeição", `category = 'refeicao' AND ${EXTRA_SEM_EMPRESTIMO}`, true);
  await extra("extras_pedagio", "Extras — pedágio", `category = 'pedagio' AND ${EXTRA_SEM_EMPRESTIMO}`, true);
  await extra("extras_outros", "Extras — outros", `category = 'outro' AND ${EXTRA_SEM_EMPRESTIMO}`, true,
    "Sem empréstimos. Se houver extrato bancário importado aqui, classifique pelo Caixa para não duplicar.");
  await extra("extras_abastecimento", "Extras — abastecimento", `category = 'abastecimento' AND ${EXTRA_SEM_EMPRESTIMO}`, false,
    "Informativo: combustível já entra no bloco de combustível.");
  await extra("extras_servico_terceiro", "Extras — serviço terceirizado", `category = 'servico_terceiro' AND ${EXTRA_SEM_EMPRESTIMO}`, false,
    "Informativo: costuma repetir compra de madeira, corte ou frete terceirizado.");
  await extra("extras_emprestimo", "Extras — empréstimos lançados como despesa", `NOT (${EXTRA_SEM_EMPRESTIMO})`, false,
    "Informativo: empréstimo é movimento financeiro, não custo da operação.");
  await bloco(
    { chave: "compras", label: "Compras aprovadas (compromisso)", grupo: "outros", somaNoTotal: false,
      nota: "Informativo: o item comprado reaparece como manutenção/estoque, então não entra no total." },
    `SELECT COALESCE(SUM(${sqlNum("final_price")}),0) AS total, COUNT(*) AS qtd FROM purchase_requests
     WHERE status IN ('comprada','recebida') AND purchased_at BETWEEN ? AND ?`, [msInicio, msFim]);

  // por equipamento (combustível + manutenção + extras com equipamento)
  let porEquipamento: { equipamentoId: number; nome: string; combustivel: number; manutencao: number; extras: number; total: number }[] = [];
  try {
    const q = await rows(db,
      `SELECT t.equipment_id AS equipamentoId, COALESCE(e.name, CONCAT('#', t.equipment_id)) AS nome,
              SUM(t.comb) AS combustivel, SUM(t.manut) AS manutencao, SUM(t.extra) AS extras
       FROM (
         SELECT equipment_id, ${sqlNum("fuel_cost")} AS comb, 0 AS manut, 0 AS extra FROM vehicle_records WHERE record_type='abastecimento' AND ${dRange("date")}
         UNION ALL SELECT equipment_id, 0, ${sqlNum("maintenance_cost")}, 0 FROM vehicle_records WHERE record_type='manutencao' AND ${dRange("date")}
         UNION ALL SELECT equipment_id, ${sqlNum("total_value")}, 0, 0 FROM machine_fuel WHERE ${dRange("date")}
         UNION ALL SELECT equipment_id, 0, ${sqlNum("total_cost")}, 0 FROM machine_maintenance WHERE ${dRange("date")}
         UNION ALL SELECT equipment_id, 0, ${sqlNum("cost")}, 0 FROM equipment_maintenance WHERE ${dRange("performed_at")}
         UNION ALL SELECT equipment_id, 0, ${sqlNum("total_value")}, 0 FROM equipment_oil_records WHERE ${dRange("date")}
         UNION ALL SELECT equipment_id, 0, 0, ${sqlNum("amount")} FROM extra_expenses WHERE equipment_id IS NOT NULL AND category IN ('compra_material','refeicao','pedagio','outro') AND ${EXTRA_SEM_EMPRESTIMO} AND ${dRange("date")}
       ) t
       LEFT JOIN equipment e ON e.id = t.equipment_id
       WHERE t.equipment_id IS NOT NULL
       GROUP BY t.equipment_id, e.name
       ORDER BY SUM(t.comb) + SUM(t.manut) + SUM(t.extra) DESC LIMIT 40`,
      Array(7).fill([inicio, fim]).flat());
    porEquipamento = q.map(r => ({
      equipamentoId: r.equipamentoId, nome: r.nome,
      combustivel: r2(Number(r.combustivel)), manutencao: r2(Number(r.manutencao)), extras: r2(Number(r.extras)),
      total: r2(Number(r.combustivel) + Number(r.manutencao) + Number(r.extras)),
    }));
  } catch { /* o bloco principal já mostra erros por fonte */ }

  // por local de trabalho (só fontes que têm work_location_id)
  let porLocal: { localId: number | null; nome: string; combustivel: number; manutencao: number; extras: number; diarias: number; total: number }[] = [];
  try {
    const q = await rows(db,
      `SELECT t.loc AS localId, COALESCE(g.name, 'Sem local') AS nome,
              SUM(t.comb) AS combustivel, SUM(t.manut) AS manutencao, SUM(t.extra) AS extras, SUM(t.dia) AS diarias
       FROM (
         SELECT work_location_id AS loc, ${sqlNum("fuel_cost")} AS comb, 0 AS manut, 0 AS extra, 0 AS dia FROM vehicle_records WHERE record_type='abastecimento' AND ${dRange("date")}
         UNION ALL SELECT work_location_id, 0, ${sqlNum("maintenance_cost")}, 0, 0 FROM vehicle_records WHERE record_type='manutencao' AND ${dRange("date")}
         UNION ALL SELECT work_location_id, ${sqlNum("total_value")}, 0, 0, 0 FROM machine_fuel WHERE ${dRange("date")}
         UNION ALL SELECT work_location_id, 0, 0, ${sqlNum("amount")}, 0 FROM extra_expenses WHERE category IN ('compra_material','refeicao','pedagio','outro') AND ${EXTRA_SEM_EMPRESTIMO} AND ${dRange("date")}
         UNION ALL SELECT work_location_id, 0, 0, 0, ${sqlNum("daily_value")} FROM collaborator_attendance
           WHERE employment_type_ca IN ('diarista','terceirizado','semanal') AND ${dRange("date")}
       ) t
       LEFT JOIN gps_locations g ON g.id = t.loc
       GROUP BY t.loc, g.name
       ORDER BY SUM(t.comb) + SUM(t.manut) + SUM(t.extra) + SUM(t.dia) DESC`,
      Array(5).fill([inicio, fim]).flat());
    porLocal = q.map(r => ({
      localId: r.localId ?? null, nome: r.nome,
      combustivel: r2(Number(r.combustivel)), manutencao: r2(Number(r.manutencao)),
      extras: r2(Number(r.extras)), diarias: r2(Number(r.diarias)),
      total: r2(Number(r.combustivel) + Number(r.manutencao) + Number(r.extras) + Number(r.diarias)),
    }));
  } catch { /* idem */ }

  // receita de competência: faturado em NF + cargas entregues a compradores sem NF correspondente
  const receita: { nfs: number; nfsQtd: number; cargasSemNf: number; cargasSemNfQtd: number; erro?: string } =
    { nfs: 0, nfsQtd: 0, cargasSemNf: 0, cargasSemNfQtd: 0 };
  try {
    const nf = await rows(db,
      `SELECT COALESCE(SUM(${sqlNum("valor_total")}),0) AS total, COUNT(*) AS qtd FROM notas_fiscais
       WHERE cfop = '5102' AND status_nf_interno <> 'cancelado' AND data_emissao BETWEEN ? AND ?`, [inicio, fim]);
    receita.nfs = r2(Number(nf[0]?.total ?? 0)); receita.nfsQtd = Number(nf[0]?.qtd ?? 0);

    const cg = await rows(db,
      `SELECT cl.weight_net_kg, cl.weight_out_kg, cl.volume_m3, cd.price_per_unit, cd.unit
       FROM cargo_loads cl
       JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
       WHERE cl.status = 'entregue' AND cd.payment_term_days_after_delivery IS NOT NULL
         AND ${dRange("COALESCE(cl.delivery_date, cl.date)")}
         AND NOT EXISTS (
           SELECT 1 FROM notas_fiscais nf
           WHERE nf.cfop = '5102' AND nf.numero_nota = TRIM(SUBSTRING_INDEX(cl.invoice_number, 'NF ', -1))
             AND cl.invoice_number IS NOT NULL AND cl.invoice_number <> ''
         )`, [inicio, fim]);
    for (const r of cg) {
      const peso = parseFloat(r.weight_net_kg || r.weight_out_kg || "0");
      const vol = parseFloat(r.volume_m3 || "0");
      const preco = parseFloat(r.price_per_unit || "0");
      receita.cargasSemNf += (r.unit === "m3" ? vol : peso / 1000) * preco;
      receita.cargasSemNfQtd++;
    }
    receita.cargasSemNf = r2(receita.cargasSemNf);
  } catch (e: any) {
    receita.erro = String(e?.message ?? e).slice(0, 160);
  }

  const custoTotal = r2(blocos.filter(b => b.somaNoTotal).reduce((s, b) => s + b.valor, 0));
  const receitaTotal = r2(receita.nfs + receita.cargasSemNf);
  return { blocos, custoTotal, receita, receitaTotal, resultado: r2(receitaTotal - custoTotal), porEquipamento, porLocal };
}

// ── PAGAMENTOS DO SISTEMA (data em que foi marcado como pago) — só para conciliar com o banco ──
const SUG = {
  salario: { grupo: "Pessoal", centroCusto: "Folha de pagamento", natureza: "Salário" },
  comissao: { grupo: "Pessoal", centroCusto: "Folha de pagamento", natureza: "Comissão" },
  diarias: { grupo: "Pessoal", centroCusto: "Folha de pagamento", natureza: "Diárias" },
  madeira: { grupo: "Produção", centroCusto: "Compra de Madeira", natureza: "Madeira (fornecedor)" },
  combustivel: { grupo: "Produção", centroCusto: "Operação de Produção", natureza: "Combustível" },
  corte: { grupo: "Produção", centroCusto: "Operação de Produção", natureza: "Corte terceirizado" },
  adiantamento: { grupo: "Produção", centroCusto: "Compra de Madeira", natureza: "Adiantamento a fornecedor" },
  frete: { grupo: "Logística", centroCusto: "Fretes de Produção", natureza: "Frete" },
} satisfies Record<string, Sugestao>;

export async function pagamentosDoSistema(db: Db, inicio: string, fim: string) {
  const out: PagamentoSistema[] = [];
  const erros: string[] = [];
  const dia = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

  async function fonte(nome: string, fn: () => Promise<void>) {
    try { await fn(); } catch (e: any) { erros.push(`${nome}: ${String(e?.message ?? e).slice(0, 120)}`); }
  }
  const dRange = (col: string) => `DATE(${col}) BETWEEN ? AND ?`;

  await fonte("Salários", async () => {
    for (const r of await rows(db,
      `SELECT id, collaborator_name, reference_month, DATE(paid_at) AS d, ${sqlNum("base_value")} AS v FROM payroll_entries
       WHERE status = 'pago' AND employment_type IN ('clt','pj') AND paid_at IS NOT NULL AND ${dRange("paid_at")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "folha_salario", tipoLabel: "Salário", refId: r.id, descricao: `${r.collaborator_name} — ${r.reference_month}`, valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.salario });
    }
  });
  await fonte("Comissões", async () => {
    for (const r of await rows(db,
      `SELECT id, collaborator_name, reference_month, DATE(commission_paid_at) AS d, (${sqlNum("commission")} - ${sqlNum("discount")}) AS v
       FROM payroll_entries WHERE commission_status = 'pago' AND commission_paid_at IS NOT NULL AND ${dRange("commission_paid_at")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "folha_comissao", tipoLabel: "Comissão", refId: r.id, descricao: `${r.collaborator_name} — ${r.reference_month}`, valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.comissao });
    }
  });
  await fonte("Diárias", async () => {
    for (const r of await rows(db,
      `SELECT a.collaborator_id AS cid, COALESCE(c.name, CONCAT('#', a.collaborator_id)) AS nome, DATE(a.paid_at) AS d, SUM(${sqlNum("a.daily_value")}) AS v
       FROM collaborator_attendance a LEFT JOIN collaborators c ON c.id = a.collaborator_id
       WHERE a.payment_status_ca = 'pago' AND a.paid_at IS NOT NULL AND a.employment_type_ca IN ('diarista','terceirizado','semanal')
         AND ${dRange("a.paid_at")} GROUP BY a.collaborator_id, c.name, DATE(a.paid_at)`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "diarias", tipoLabel: "Diárias", refId: r.cid, descricao: String(r.nome), valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.diarias });
    }
  });
  await fonte("Fechamentos de madeira", async () => {
    for (const r of await rows(db,
      `SELECT f.id, COALESCE(c.name, CONCAT('#', f.client_id)) AS nome, f.week_end, DATE(f.paid_at) AS d, ${SQL_FECHAMENTO_VIVO("f", "c")} AS v
       FROM cargo_weekly_closings f LEFT JOIN clients c ON c.id = f.client_id
       WHERE f.status = 'pago' AND f.paid_at IS NOT NULL AND ${dRange("f.paid_at")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "fechamento_madeira", tipoLabel: "Fechamento de madeira", refId: r.id, descricao: `${r.nome} — semana até ${dia(r.week_end)}`, valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.madeira });
    }
  });
  await fonte("Faturas de combustível", async () => {
    for (const r of await rows(db,
      `SELECT i.id, i.invoice_number, COALESCE(s.name, '') AS fornecedor, i.paid_at AS d,
              IF(i.paid_amount IS NULL OR i.paid_amount = '', ${sqlNum("i.total_amount")}, ${sqlNum("i.paid_amount")}) AS v
       FROM fuel_invoices i LEFT JOIN fuel_suppliers s ON s.id = i.supplier_id
       WHERE i.status = 'pago' AND i.paid_at IS NOT NULL AND i.paid_at BETWEEN ? AND ?`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "fatura_combustivel", tipoLabel: "Fatura de combustível", refId: r.id, descricao: `NF ${r.invoice_number} — ${r.fornecedor}`, valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.combustivel });
    }
  });
  await fonte("Corte terceirizado", async () => {
    for (const r of await rows(db,
      `SELECT third_party_contractor AS nome, DATE(third_party_paid_at) AS d, SUM(third_party_cost) AS v
       FROM cargo_loads WHERE third_party_paid = 1 AND third_party_paid_at IS NOT NULL AND third_party_contractor <> ''
         AND ${dRange("third_party_paid_at")} GROUP BY third_party_contractor, DATE(third_party_paid_at)`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "corte_terceirizado", tipoLabel: "Corte terceirizado", refId: null, descricao: String(r.nome), valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.corte });
    }
  });
  await fonte("Adiantamentos a clientes", async () => {
    for (const r of await rows(db,
      `SELECT a.id, COALESCE(c.name, CONCAT('#', a.client_id)) AS nome, DATE(a.date) AS d, ${sqlNum("a.amount")} AS v
       FROM client_advances a LEFT JOIN clients c ON c.id = a.client_id WHERE ${dRange("a.date")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "adiantamento", tipoLabel: "Adiantamento", refId: r.id, descricao: String(r.nome), valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.adiantamento });
    }
  });
  await fonte("Pagamentos a clientes", async () => {
    for (const r of await rows(db,
      `SELECT p.id, COALESCE(c.name, CONCAT('#', p.clientId)) AS nome, DATE(p.paidDate) AS d, p.amount AS v
       FROM client_payments p LEFT JOIN clients c ON c.id = p.clientId
       WHERE p.status IN ('pago','paid') AND p.paidDate IS NOT NULL AND ${dRange("p.paidDate")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "pagamento_cliente", tipoLabel: "Pagamento a cliente", refId: r.id, descricao: String(r.nome), valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.madeira });
    }
  });
  await fonte("Frete terceirizado", async () => {
    for (const r of await rows(db,
      `SELECT id, description, DATE(date) AS d, ${sqlNum("amount")} AS v FROM financial_entries
       WHERE type = 'despesa' AND BINARY category = 'frete' AND status = 'confirmado' AND auto_generated = 0 AND ${dRange("date")}`, [inicio, fim])) {
      if (Number(r.v) > 0) out.push({ tipo: "frete_terceirizado", tipoLabel: "Frete terceirizado", refId: r.id, descricao: String(r.description ?? "Frete"), valor: r2(Number(r.v)), data: dia(r.d), sugestao: SUG.frete });
    }
  });

  return { pagamentos: out, erros };
}

// ── PENDÊNCIAS (posição de hoje): o que falta receber e o que falta pagar ──
export async function pendencias(db: Db, hoje: string) {
  const res = {
    aReceber: { boletosVencidos: 0, boletosAVencer: 0, nfsSemBoletoVencidas: 0, nfsSemBoletoAVencer: 0, nfsSemBoletoSemPrevisao: 0, cargasVencidas: 0, cargasAVencer: 0, total: 0 },
    aPagar: { faturasCombustivelVencidas: 0, faturasCombustivelAVencer: 0, fechamentosVencidos: 0, fechamentosAVencer: 0, corteTerceirizado: 0, total: 0 },
    erros: [] as string[],
  };
  async function fonte(nome: string, fn: () => Promise<void>) {
    try { await fn(); } catch (e: any) { res.erros.push(`${nome}: ${String(e?.message ?? e).slice(0, 120)}`); }
  }

  await fonte("Boletos", async () => {
    for (const r of await rows(db, `SELECT data_vencimento AS v, ${sqlNum("valor")} AS valor FROM sicoob_boletos WHERE situacao = 1`)) {
      if (String(r.v) < hoje) res.aReceber.boletosVencidos += Number(r.valor); else res.aReceber.boletosAVencer += Number(r.valor);
    }
  });
  await fonte("NFs sem boleto", async () => {
    for (const r of await rows(db,
      `SELECT nf.data_previsao_pagamento AS prev, ${sqlNum("nf.valor_total")} AS valor FROM notas_fiscais nf
       LEFT JOIN sicoob_boletos sb ON sb.nf_referente = nf.numero_nota AND sb.cnpj_pagador = nf.cnpj_destinatario
       WHERE sb.id IS NULL AND nf.cfop = '5102' AND nf.status_nf_interno = 'em_aberto'`)) {
      if (!r.prev) res.aReceber.nfsSemBoletoSemPrevisao += Number(r.valor);
      else if (String(r.prev) < hoje) res.aReceber.nfsSemBoletoVencidas += Number(r.valor);
      else res.aReceber.nfsSemBoletoAVencer += Number(r.valor);
    }
  });
  await fonte("Cargas a receber", async () => {
    for (const r of await rows(db,
      `SELECT cl.delivery_date, cl.date, cl.weight_net_kg, cl.weight_out_kg, cl.volume_m3, cd.price_per_unit, cd.unit, cd.payment_term_days_after_delivery AS prazo
       FROM cargo_loads cl
       JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
       WHERE cl.status = 'entregue' AND cd.payment_term_days_after_delivery IS NOT NULL AND cl.buyer_paid_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM notas_fiscais nf WHERE nf.cfop = '5102' AND cl.invoice_number IS NOT NULL AND cl.invoice_number <> ''
                         AND nf.numero_nota = TRIM(SUBSTRING_INDEX(cl.invoice_number, 'NF ', -1)))`)) {
      const entrega = r.delivery_date || r.date;
      const base = entrega instanceof Date ? entrega : new Date(entrega);
      const venc = new Date(base.getTime()); venc.setDate(venc.getDate() + Number(r.prazo));
      const peso = parseFloat(r.weight_net_kg || r.weight_out_kg || "0");
      const valor = (r.unit === "m3" ? parseFloat(r.volume_m3 || "0") : peso / 1000) * parseFloat(r.price_per_unit || "0");
      if (venc.toISOString().slice(0, 10) < hoje) res.aReceber.cargasVencidas += valor; else res.aReceber.cargasAVencer += valor;
    }
  });
  await fonte("Faturas de combustível", async () => {
    for (const r of await rows(db, `SELECT due_date AS v, ${sqlNum("total_amount")} AS valor FROM fuel_invoices WHERE status IN ('pendente','vencido')`)) {
      if (String(r.v) < hoje) res.aPagar.faturasCombustivelVencidas += Number(r.valor); else res.aPagar.faturasCombustivelAVencer += Number(r.valor);
    }
  });
  await fonte("Fechamentos", async () => {
    for (const r of await rows(db, `SELECT due_date AS v, total_amount AS valor FROM cargo_weekly_closings WHERE status IN ('fechado','atrasado')`)) {
      const v = r.v instanceof Date ? r.v.toISOString().slice(0, 10) : String(r.v).slice(0, 10);
      if (v < hoje) res.aPagar.fechamentosVencidos += Number(r.valor); else res.aPagar.fechamentosAVencer += Number(r.valor);
    }
  });
  await fonte("Corte terceirizado", async () => {
    const r = await rows(db,
      `SELECT COALESCE(SUM(third_party_cost),0) AS valor FROM cargo_loads
       WHERE third_party_contractor IS NOT NULL AND third_party_contractor <> '' AND status = 'entregue' AND (third_party_paid IS NULL OR third_party_paid = 0)`);
    res.aPagar.corteTerceirizado = Number(r[0]?.valor ?? 0);
  });

  const a = res.aReceber, p = res.aPagar;
  for (const k of Object.keys(a) as (keyof typeof a)[]) if (k !== "total") a[k] = r2(a[k]);
  for (const k of Object.keys(p) as (keyof typeof p)[]) if (k !== "total") p[k] = r2(p[k]);
  a.total = r2(a.boletosVencidos + a.boletosAVencer + a.nfsSemBoletoVencidas + a.nfsSemBoletoAVencer + a.nfsSemBoletoSemPrevisao + a.cargasVencidas + a.cargasAVencer);
  p.total = r2(p.faturasCombustivelVencidas + p.faturasCombustivelAVencer + p.fechamentosVencidos + p.fechamentosAVencer + p.corteTerceirizado);
  return res;
}

// ── ENTRADAS: faturado × recebido, boletos e NFs ──
export async function entradasDoPeriodo(db: Db, inicio: string, fim: string) {
  const erros: string[] = [];
  const out = {
    faturadoNF: { valor: 0, qtd: 0 },
    porCliente: [] as { cliente: string; valor: number; qtd: number }[],
    boletosLiquidados: { valor: 0, qtd: 0 },
    boletosSemNF: { valor: 0, qtd: 0 },
    nfsSemBoleto: { valor: 0, qtd: 0 },
    erros,
  };
  const fonte = async (nome: string, fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { erros.push(`${nome}: ${String(e?.message ?? e).slice(0, 120)}`); }
  };

  await fonte("NFs emitidas", async () => {
    const t = await rows(db,
      `SELECT COALESCE(SUM(${sqlNum("valor_total")}),0) AS v, COUNT(*) AS q FROM notas_fiscais
       WHERE cfop = '5102' AND status_nf_interno <> 'cancelado' AND data_emissao BETWEEN ? AND ?`, [inicio, fim]);
    out.faturadoNF = { valor: r2(Number(t[0]?.v ?? 0)), qtd: Number(t[0]?.q ?? 0) };
    const c = await rows(db,
      `SELECT nome_destinatario AS cliente, SUM(${sqlNum("valor_total")}) AS v, COUNT(*) AS q FROM notas_fiscais
       WHERE cfop = '5102' AND status_nf_interno <> 'cancelado' AND data_emissao BETWEEN ? AND ?
       GROUP BY nome_destinatario ORDER BY v DESC LIMIT 15`, [inicio, fim]);
    out.porCliente = c.map(r => ({ cliente: String(r.cliente ?? "—"), valor: r2(Number(r.v)), qtd: Number(r.q) }));
  });
  await fonte("Boletos liquidados", async () => {
    const t = await rows(db,
      `SELECT COALESCE(SUM(${sqlNum("valor")}),0) AS v, COUNT(*) AS q FROM sicoob_boletos
       WHERE situacao = 3 AND data_pagamento BETWEEN ? AND ?`, [inicio, fim]);
    out.boletosLiquidados = { valor: r2(Number(t[0]?.v ?? 0)), qtd: Number(t[0]?.q ?? 0) };
    const s = await rows(db,
      `SELECT COALESCE(SUM(${sqlNum("valor")}),0) AS v, COUNT(*) AS q FROM sicoob_boletos
       WHERE situacao IN (1,3) AND (nf_referente IS NULL OR nf_referente = '') AND data_vencimento BETWEEN ? AND ?`, [inicio, fim]);
    out.boletosSemNF = { valor: r2(Number(s[0]?.v ?? 0)), qtd: Number(s[0]?.q ?? 0) };
  });
  await fonte("NFs sem boleto", async () => {
    const t = await rows(db,
      `SELECT COALESCE(SUM(${sqlNum("nf.valor_total")}),0) AS v, COUNT(*) AS q FROM notas_fiscais nf
       LEFT JOIN sicoob_boletos sb ON sb.nf_referente = nf.numero_nota AND sb.cnpj_pagador = nf.cnpj_destinatario
       WHERE sb.id IS NULL AND nf.cfop = '5102' AND nf.status_nf_interno <> 'cancelado' AND nf.data_emissao BETWEEN ? AND ?`, [inicio, fim]);
    out.nfsSemBoleto = { valor: r2(Number(t[0]?.v ?? 0)), qtd: Number(t[0]?.q ?? 0) };
  });
  return out;
}

// ── CONTA CORRENTE DOS COMPRADORES: faturado × recebido no período ──
// O comprador costuma pagar por PIX várias NFs de uma vez, e a baixa nem sempre é feita no
// sistema — então "NF em aberto" superestima o que falta receber. Esta visão compara o que foi
// faturado (NF + cargas sem NF) com o que realmente entrou (PIX identificado pelo CNPJ no extrato
// + boletos liquidados), por comprador.
export async function contaCorrenteCompradores(db: Db, inicio: string, fim: string) {
  const { cnpjsDoTexto } = await import("./extratoClassificacao");
  const mapa = new Map<string, { cnpj: string; nome: string; faturadoNF: number; faturadoCargas: number; pix: number; boletos: number; nfs: number }>();
  const digitos = (s: any) => String(s ?? "").replace(/\D/g, "");
  const item = (cnpj: string, nome?: string | null) => {
    let x = mapa.get(cnpj);
    if (!x) { x = { cnpj, nome: nome || cnpj, faturadoNF: 0, faturadoCargas: 0, pix: 0, boletos: 0, nfs: 0 }; mapa.set(cnpj, x); }
    else if (nome && x.nome === x.cnpj) x.nome = nome;
    return x;
  };
  const erros: string[] = [];
  const fonte = async (nome: string, fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { erros.push(`${nome}: ${String(e?.message ?? e).slice(0, 120)}`); }
  };

  await fonte("NFs", async () => {
    for (const r of await rows(db,
      `SELECT cnpj_destinatario AS cnpj, MAX(nome_destinatario) AS nome, SUM(${sqlNum("valor_total")}) AS v, COUNT(*) AS q
       FROM notas_fiscais WHERE cfop = '5102' AND status_nf_interno <> 'cancelado' AND data_emissao BETWEEN ? AND ?
       GROUP BY cnpj_destinatario`, [inicio, fim])) {
      const c = digitos(r.cnpj); if (c.length !== 14) continue;
      const x = item(c, r.nome); x.faturadoNF += Number(r.v); x.nfs += Number(r.q);
    }
  });
  await fonte("Cargas sem NF", async () => {
    for (const r of await rows(db,
      `SELECT cd.cnpj_cpf AS cnpj, cd.name AS nome, cl.weight_net_kg, cl.weight_out_kg, cl.volume_m3, cd.price_per_unit, cd.unit
       FROM cargo_loads cl
       JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
       WHERE cl.status = 'entregue' AND cd.payment_term_days_after_delivery IS NOT NULL
         AND DATE(COALESCE(cl.delivery_date, cl.date)) BETWEEN ? AND ?
         AND NOT EXISTS (SELECT 1 FROM notas_fiscais nf WHERE nf.cfop = '5102' AND cl.invoice_number IS NOT NULL AND cl.invoice_number <> ''
                         AND nf.numero_nota = TRIM(SUBSTRING_INDEX(cl.invoice_number, 'NF ', -1)))`, [inicio, fim])) {
      const c = digitos(r.cnpj); if (c.length !== 14) continue;
      const peso = parseFloat(r.weight_net_kg || r.weight_out_kg || "0");
      const qtd = r.unit === "m3" ? parseFloat(r.volume_m3 || "0") : peso / 1000;
      item(c, r.nome).faturadoCargas += qtd * parseFloat(r.price_per_unit || "0");
    }
  });
  await fonte("PIX no extrato", async () => {
    const conhecidos = new Set(mapa.keys());
    for (const r of await rows(db,
      `SELECT descricao, complemento, valor FROM sicoob_extrato WHERE tipo_lancamento = 'CREDITO' AND data_lancamento BETWEEN ? AND ?`, [inicio, fim])) {
      const linha = { id: 0, dataLancamento: "", descricao: r.descricao, complemento: r.complemento, numeroDocumento: null, tipo: "CREDITO" as const, valor: 0 };
      for (const c of cnpjsDoTexto(linha)) {
        if (conhecidos.has(c) || mapa.has(c)) { item(c).pix += Math.abs(parseFloat(r.valor ?? "0")); break; }
      }
    }
  });
  await fonte("Boletos liquidados", async () => {
    for (const r of await rows(db,
      `SELECT cnpj_pagador AS cnpj, MAX(nome_pagador) AS nome, SUM(${sqlNum("valor")}) AS v FROM sicoob_boletos
       WHERE situacao = 3 AND data_pagamento BETWEEN ? AND ? GROUP BY cnpj_pagador`, [inicio, fim])) {
      const c = digitos(r.cnpj); if (c.length !== 14) continue;
      item(c, r.nome).boletos += Number(r.v);
    }
  });

  const lista = Array.from(mapa.values()).map(x => {
    const faturado = x.faturadoNF + x.faturadoCargas;
    const recebido = x.pix + x.boletos;
    return {
      cnpj: x.cnpj, nome: x.nome, nfs: x.nfs,
      faturadoNF: r2(x.faturadoNF), faturadoCargas: r2(x.faturadoCargas), faturado: r2(faturado),
      recebidoPix: r2(x.pix), recebidoBoletos: r2(x.boletos), recebido: r2(recebido),
      diferenca: r2(faturado - recebido),
    };
  }).filter(x => x.faturado > 0 || x.recebido > 0).sort((a, b) => b.faturado - a.faturado);
  return { compradores: lista, erros };
}
