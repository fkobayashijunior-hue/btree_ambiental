// Resultado por CLIENTE (origem da madeira: Fazenda GW, Simflor, Luciano Ribeiro...).
//
// Receita: o cliente da carga é quem fornece a madeira; quem paga é o comprador. Então a receita de
// cada cliente é ESTIMADA: cargas entregues no período × preço do comprador de destino (a mesma
// regra do Dashboard Executivo). Custos diretos: compra da madeira (fechamentos, valor atual) e corte
// terceirizado das cargas. Frete, combustível e folha não são rateados por cliente.
import { sqlNum, SQL_FECHAMENTO_VIVO, SQL_KG } from "./financeiroCanonico";

type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };

const r2 = (n: number) => Math.round(n * 100) / 100;

export type ResultadoCliente = {
  clienteId: number | null;
  nome: string;
  cargas: number;
  toneladas: number;
  volumeM3: number;
  receitaEstimada: number;
  cargasSemPreco: number;
  compraMadeira: number;
  corteTerceirizado: number;
  resultadoBruto: number;
  margemPct: number | null;
};

export async function resultadoPorCliente(db: Db, inicio: string, fim: string) {
  const erros: string[] = [];
  const mapa = new Map<string, ResultadoCliente>();
  const item = (id: number | null, nome: string): ResultadoCliente => {
    const k = String(id ?? "null");
    let x = mapa.get(k);
    if (!x) {
      x = { clienteId: id, nome, cargas: 0, toneladas: 0, volumeM3: 0, receitaEstimada: 0, cargasSemPreco: 0, compraMadeira: 0, corteTerceirizado: 0, resultadoBruto: 0, margemPct: null };
      mapa.set(k, x);
    }
    return x;
  };

  const kg = SQL_KG.replace(/\bl\./g, "cl.");
  const vol = sqlNum("cl.volume_m3");
  const precoUnit = sqlNum("cd.price_per_unit");
  const precoTon = sqlNum("cd.price_per_ton");
  const precoM3 = sqlNum("cd.price_per_m3");
  // preço do comprador de destino: price_per_unit (+ unit) se houver; senão por tipo (m3 ou tonelada)
  const receita = `CASE
      WHEN cd.id IS NULL THEN 0
      WHEN ${precoUnit} > 0 THEN IF(cd.unit = 'm3', ${vol}, ${kg} / 1000) * ${precoUnit}
      WHEN cd.price_type = 'm3' THEN ${vol} * ${precoM3}
      ELSE ${kg} / 1000 * ${precoTon}
    END`;

  try {
    const [rows] = await db.$client.execute(
      `SELECT cl.client_id AS cid, COALESCE(c.name, 'Sem cliente') AS nome, COUNT(*) AS cargas,
              SUM(${kg}) / 1000 AS ton, SUM(${vol}) AS m3, SUM(${receita}) AS receita,
              SUM(IF(${receita} > 0, 0, 1)) AS sem_preco,
              SUM(IF(cl.third_party_contractor IS NOT NULL AND cl.third_party_contractor <> '', COALESCE(cl.third_party_cost, 0), 0)) AS corte
       FROM cargo_loads cl
       LEFT JOIN clients c ON c.id = cl.client_id
       LEFT JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
       WHERE cl.status = 'entregue' AND DATE(COALESCE(cl.delivery_date, cl.date)) BETWEEN ? AND ?
       GROUP BY cl.client_id, c.name`,
      [inicio, fim]
    );
    for (const r of rows as any[]) {
      const x = item(r.cid ?? null, String(r.nome));
      x.cargas = Number(r.cargas); x.toneladas = Number(r.ton ?? 0); x.volumeM3 = Number(r.m3 ?? 0);
      x.receitaEstimada = Number(r.receita ?? 0); x.cargasSemPreco = Number(r.sem_preco ?? 0); x.corteTerceirizado = Number(r.corte ?? 0);
    }
  } catch (e: any) {
    erros.push(`Cargas: ${String(e?.message ?? e).slice(0, 160)}`);
  }

  try {
    const [rows] = await db.$client.execute(
      `SELECT f.client_id AS cid, COALESCE(c.name, CONCAT('#', f.client_id)) AS nome, SUM(${SQL_FECHAMENTO_VIVO("f", "c")}) AS v
       FROM cargo_weekly_closings f LEFT JOIN clients c ON c.id = f.client_id
       WHERE f.week_end BETWEEN ? AND ? GROUP BY f.client_id, c.name`,
      [inicio, fim]
    );
    for (const r of rows as any[]) item(r.cid ?? null, String(r.nome)).compraMadeira = Number(r.v ?? 0);
  } catch (e: any) {
    erros.push(`Fechamentos: ${String(e?.message ?? e).slice(0, 160)}`);
  }

  const lista = Array.from(mapa.values()).map(x => {
    const bruto = x.receitaEstimada - x.compraMadeira - x.corteTerceirizado;
    return {
      ...x,
      toneladas: r2(x.toneladas), volumeM3: r2(x.volumeM3), receitaEstimada: r2(x.receitaEstimada),
      compraMadeira: r2(x.compraMadeira), corteTerceirizado: r2(x.corteTerceirizado), resultadoBruto: r2(bruto),
      margemPct: x.receitaEstimada > 0 ? r2((bruto / x.receitaEstimada) * 100) : null,
    };
  }).filter(x => x.cargas > 0 || x.compraMadeira > 0 || x.corteTerceirizado > 0)
    .sort((a, b) => b.receitaEstimada - a.receitaEstimada);

  const total = lista.reduce((t, x) => ({
    cargas: t.cargas + x.cargas, toneladas: t.toneladas + x.toneladas, receitaEstimada: t.receitaEstimada + x.receitaEstimada,
    compraMadeira: t.compraMadeira + x.compraMadeira, corteTerceirizado: t.corteTerceirizado + x.corteTerceirizado,
  }), { cargas: 0, toneladas: 0, receitaEstimada: 0, compraMadeira: 0, corteTerceirizado: 0 });

  return {
    clientes: lista,
    total: {
      ...total, toneladas: r2(total.toneladas), receitaEstimada: r2(total.receitaEstimada),
      compraMadeira: r2(total.compraMadeira), corteTerceirizado: r2(total.corteTerceirizado),
      resultadoBruto: r2(total.receitaEstimada - total.compraMadeira - total.corteTerceirizado),
    },
    erros,
  };
}
