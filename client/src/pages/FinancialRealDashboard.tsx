import { useMemo, useState, Fragment } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, RefreshCw, AlertTriangle, Landmark, Scale, Trash2, Pencil, Plus,
} from "lucide-react";
import { EntradasExtras, CompetenciaAba, ConciliacaoAba, ContasAba } from "./FinancialRealTabs";

type Conta = "todas" | "sicoob" | number;
type TipoResultado = "resultado" | "financeiro_nao_resultado" | "transferencia_propria";
const TIPO_RESULTADO_LABEL: Record<TipoResultado, string> = {
  resultado: "Resultado (entra no lucro)",
  financeiro_nao_resultado: "Financeiro (empréstimo/aplicação)",
  transferencia_propria: "Transferência própria",
};
const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual", regra: "Regra", favorecido: "Favorecido", nenhuma: "Sem classificação",
};

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmtMoeda = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: string) => d.split("-").reverse().join("/");
const mesLabel = (ym: string) => {
  const [a, m] = ym.split("-");
  return `${MESES_ABREV[Number(m) - 1]}/${a.slice(2)}`;
};

function primeiroDia(ym: string) { return `${ym}-01`; }
function ultimoDia(ym: string) {
  const [a, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}
function ymAtual(deslocamento = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + deslocamento, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const SEM = "Sem classificação";

export default function FinancialRealDashboard() {
  const [mesIni, setMesIni] = useState(ymAtual(0));
  const [mesFim, setMesFim] = useState(ymAtual(0));
  const [aba, setAba] = useState("resumo");
  const [conta, setConta] = useState<Conta>("todas");
  const contas = trpc.financialReal.listContas.useQuery();

  const periodo = useMemo(() => {
    const ini = mesIni <= mesFim ? mesIni : mesFim;
    const fim = mesIni <= mesFim ? mesFim : mesIni;
    return { dataInicio: primeiroDia(ini), dataFim: ultimoDia(fim) };
  }, [mesIni, mesFim]);

  const resumo = trpc.financialReal.resumo.useQuery({ ...periodo, conta });
  const pend = trpc.financialReal.pendencias.useQuery();
  const utils = trpc.useUtils();

  const sincronizar = trpc.financialReal.sincronizarPeriodo.useMutation({
    onSuccess: (r) => {
      const erros = r.resultado.filter(x => x.error);
      const total = r.resultado.reduce((s, x) => s + x.synced, 0);
      if (erros.length) toast.error(`Sincronizado com erro em ${erros.length} mês(es): ${String(erros[0].error).slice(0, 120)}`);
      else toast.success(`Extrato sincronizado: ${total} lançamento(s) em ${r.resultado.length} mês(es).`);
      utils.financialReal.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const atalho = (ini: string, fim: string) => { setMesIni(ini); setMesFim(fim); };
  const d = resumo.data;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Landmark className="h-7 w-7" /> Dashboard Financeiro Real
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Caixa real: tudo o que entrou e saiu da conta, vindo do extrato bancário e classificado. Nada do sistema é somado aqui, para não contar duas vezes.
          </p>
        </div>
        <Button
          variant="outline" size="sm" className="gap-1.5"
          disabled={sincronizar.isPending}
          onClick={() => {
            const [ai, mi] = (mesIni <= mesFim ? mesIni : mesFim).split("-").map(Number);
            const [af, mf] = (mesIni <= mesFim ? mesFim : mesIni).split("-").map(Number);
            sincronizar.mutate({ anoInicio: ai, mesInicio: mi, anoFim: af, mesFim: mf });
          }}
          title="Busca no Sicoob os lançamentos dos meses selecionados (administrador)"
        >
          <RefreshCw className={`h-4 w-4 ${sincronizar.isPending ? "animate-spin" : ""}`} />
          {sincronizar.isPending ? "Sincronizando..." : "Sincronizar extrato do período"}
        </Button>
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">De</label>
          <Input type="month" value={mesIni} onChange={e => e.target.value && setMesIni(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Até</label>
          <Input type="month" value={mesFim} onChange={e => e.target.value && setMesFim(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => atalho(ymAtual(0), ymAtual(0))}>Mês atual</Button>
          <Button size="sm" variant="outline" onClick={() => atalho(ymAtual(-1), ymAtual(-1))}>Mês anterior</Button>
          <Button size="sm" variant="outline" onClick={() => atalho(ymAtual(-2), ymAtual(0))}>Últimos 3 meses</Button>
          <Button size="sm" variant="outline" onClick={() => atalho(`${new Date().getFullYear()}-01`, ymAtual(0))}>Ano até hoje</Button>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Conta</label>
          <select
            value={String(conta)}
            onChange={e => { const v = e.target.value; setConta(v === "todas" || v === "sicoob" ? v : Number(v)); }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="todas">Todas as contas</option>
            <option value="sicoob">Sicoob</option>
            {(contas.data ?? []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      {resumo.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          Não foi possível carregar o extrato: {resumo.error.message}
        </div>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="competencia">Custo da operação</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="classificar">
            Classificar
            {d && (d.semClassificacao.debitoQtd + d.semClassificacao.creditoQtd) > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-800 border border-amber-300">
                {d.semClassificacao.debitoQtd + d.semClassificacao.creditoQtd}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="regras">Regras</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-5 mt-4">
          <ResumoAba d={d} pend={pend.data} loading={resumo.isLoading} irParaClassificar={() => setAba("classificar")} />
        </TabsContent>
        <TabsContent value="saidas" className="mt-4">
          <ArvoreAba tipo="saida" d={d} periodo={periodo} conta={conta} />
        </TabsContent>
        <TabsContent value="entradas" className="mt-4">
          <EntradasExtras periodo={periodo} />
          <ArvoreAba tipo="entrada" d={d} periodo={periodo} conta={conta} />
        </TabsContent>
        <TabsContent value="competencia" className="mt-4">
          <CompetenciaAba periodo={periodo} />
        </TabsContent>
        <TabsContent value="conciliacao" className="mt-4">
          <ConciliacaoAba periodo={periodo} conta={conta} />
        </TabsContent>
        <TabsContent value="classificar" className="mt-4">
          <ClassificarAba periodo={periodo} conta={conta} />
        </TabsContent>
        <TabsContent value="regras" className="mt-4">
          <RegrasAba />
        </TabsContent>
        <TabsContent value="contas" className="mt-4">
          <ContasAba />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────── Resumo ─────────────────────────

function Kpi({ titulo, valor, cor, sub, icone }: { titulo: string; valor: string; cor: string; sub?: string; icone?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</p>
        {icone}
      </div>
      <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function ResumoAba({ d, pend, loading, irParaClassificar }: { d: any; pend: any; loading: boolean; irParaClassificar: () => void }) {
  if (loading || !d) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  const t = d.totais;
  const sem = d.semClassificacao;
  const semQtd = sem.debitoQtd + sem.creditoQtd;

  if (t.lancamentos === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        <p className="font-medium">Nenhum lançamento do extrato neste período.</p>
        <p className="text-sm mt-1">Use "Sincronizar extrato do período" para buscar os meses no Sicoob.</p>
      </div>
    );
  }

  const cs = d.conciliacaoSaldo as { variacaoSaldo: number; variacaoLancamentos: number; diferenca: number } | null;

  return (
    <>
      {semQtd > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {semQtd} lançamento(s) sem classificação — {fmtMoeda(sem.debitoValor)} em saídas e {fmtMoeda(sem.creditoValor)} em entradas aparecem como "{SEM}".
          </span>
          <Button size="sm" variant="outline" onClick={irParaClassificar}>Classificar agora</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi titulo="Entradas (resultado)" valor={fmtMoeda(t.entradasResultado)} cor="text-emerald-700"
          icone={<ArrowUpCircle className="h-5 w-5 text-emerald-600" />} sub="Vendas e outras receitas que entraram na conta" />
        <Kpi titulo="Saídas (resultado)" valor={fmtMoeda(t.saidasResultado)} cor="text-red-700"
          icone={<ArrowDownCircle className="h-5 w-5 text-red-600" />} sub="Custos e despesas pagos pela conta" />
        <Kpi titulo="Resultado de caixa" valor={fmtMoeda(t.resultadoCaixa)} cor={t.resultadoCaixa >= 0 ? "text-emerald-700" : "text-red-700"}
          icone={<Scale className="h-5 w-5 text-gray-500" />} sub="Entradas − saídas, sem empréstimos e transferências próprias" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi titulo="Movimento financeiro" valor={fmtMoeda(t.entradasFinanceiro - t.saidasFinanceiro)} cor="text-gray-700"
          sub={`Entrou ${fmtMoeda(t.entradasFinanceiro)} · saiu ${fmtMoeda(t.saidasFinanceiro)} (empréstimos, aplicações)`} />
        <Kpi titulo="Transferências próprias" valor={fmtMoeda(t.transferenciasLiquidas)} cor="text-gray-700" sub="Saldo líquido (fora do resultado)" />
        <Kpi titulo="Saldo bancário"
          valor={d.saldo.final != null ? fmtMoeda(d.saldo.final) : "—"} cor="text-gray-800"
          sub={d.saldo.inicial != null ? `Início do período: ${fmtMoeda(d.saldo.inicial)}` : "Saldo do mês ainda não sincronizado"} />
      </div>

      {cs && Math.abs(cs.diferenca) > 1 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          O saldo do Sicoob variou {fmtMoeda(cs.variacaoSaldo)}, mas os lançamentos do extrato somam {fmtMoeda(cs.variacaoLancamentos)}: diferença de {fmtMoeda(cs.diferenca)}.
          Pode haver lançamento faltando ou barrado pela proteção contra duplicata, ou mês sem sincronizar.
        </div>
      )}

      {pend && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Kpi titulo="A receber (segundo o sistema)" valor={fmtMoeda(pend.aReceber.total)} cor="text-emerald-700"
            sub={`Boletos abertos ${fmtMoeda(pend.aReceber.boletosVencidos + pend.aReceber.boletosAVencer)} · NFs sem boleto ${fmtMoeda(pend.aReceber.nfsSemBoletoVencidas + pend.aReceber.nfsSemBoletoAVencer + pend.aReceber.nfsSemBoletoSemPrevisao)} · cargas sem baixa ${fmtMoeda(pend.aReceber.cargasVencidas + pend.aReceber.cargasAVencer)}. Pode estar superestimado se pagamentos por PIX não foram baixados — veja a conta corrente dos compradores em Entradas.`} />
          <Kpi titulo="A pagar (segundo o sistema)" valor={fmtMoeda(pend.aPagar.total)} cor="text-red-700"
            sub={`Fechamentos de madeira ${fmtMoeda(pend.aPagar.fechamentosVencidos + pend.aPagar.fechamentosAVencer)} · faturas de combustível ${fmtMoeda(pend.aPagar.faturasCombustivelVencidas + pend.aPagar.faturasCombustivelAVencer)} · corte terceirizado ${fmtMoeda(pend.aPagar.corteTerceirizado)}. Folha não incluída.`} />
        </div>
      )}
      {pend?.erros?.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">Pendências: {pend.erros.join(" · ")}</div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold mb-3">Entradas × saídas por mês (resultado)</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.porMes.map((m: any) => ({ ...m, mesLabel: mesLabel(m.mes) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mesLabel" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => fmtMoeda(Number(v))} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#059669" />
              <Bar dataKey="saidas" name="Saídas" fill="#dc2626" />
              <Line dataKey="resultado" name="Resultado" stroke="#1d4ed8" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Saídas / Entradas (árvore) ─────────────────────────

type Linha = {
  tipo: "saida" | "entrada"; grupo: string; centroCusto: string; natureza: string; valor: number; qtd: number;
};

function ArvoreAba({ tipo, d, periodo, conta }: { tipo: "saida" | "entrada"; d: any; periodo: { dataInicio: string; dataFim: string }; conta: Conta }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [drill, setDrill] = useState<{ grupo: string; centroCusto?: string; natureza?: string } | null>(null);

  const linhas: Linha[] = useMemo(() => (d?.arvore ?? []).filter((l: Linha) => l.tipo === tipo), [d, tipo]);
  const total = linhas.reduce((s, l) => s + l.valor, 0);

  const grupos = useMemo(() => {
    const g = new Map<string, { valor: number; qtd: number; centros: Map<string, { valor: number; qtd: number; naturezas: Linha[] }> }>();
    for (const l of linhas) {
      const gr = g.get(l.grupo) ?? { valor: 0, qtd: 0, centros: new Map() };
      gr.valor += l.valor; gr.qtd += l.qtd;
      const c = gr.centros.get(l.centroCusto) ?? { valor: 0, qtd: 0, naturezas: [] };
      c.valor += l.valor; c.qtd += l.qtd; c.naturezas.push(l);
      gr.centros.set(l.centroCusto, c);
      g.set(l.grupo, gr);
    }
    return Array.from(g.entries()).sort((a, b) => b[1].valor - a[1].valor);
  }, [linhas]);

  const alterna = (k: string) => setAbertos(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  if (!d) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  if (linhas.length === 0) return <p className="text-sm text-gray-500">Nada neste período.</p>;

  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Grupo / Centro de custo / Natureza</th>
              <th className="px-3 py-2 text-right">Lanç.</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(([grupo, g]) => {
              const kg = `g|${grupo}`;
              return (
                <Fragment key={kg}>
                  <tr className="border-t bg-gray-50/60 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => alterna(kg)}>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        {abertos.has(kg) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {grupo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{g.qtd}</td>
                    <td className="px-3 py-2 text-right">{fmtMoeda(g.valor)}</td>
                    <td className="px-3 py-2 text-right">{pct(g.valor)}</td>
                  </tr>
                  {abertos.has(kg) && Array.from(g.centros.entries()).sort((a, b) => b[1].valor - a[1].valor).map(([cc, c]) => {
                    const kc = `${kg}|${cc}`;
                    return (
                      <Fragment key={kc}>
                        <tr className="border-t cursor-pointer hover:bg-gray-50" onClick={() => alterna(kc)}>
                          <td className="px-3 py-2 pl-8">
                            <span className="inline-flex items-center gap-1">
                              {abertos.has(kc) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {cc}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{c.qtd}</td>
                          <td className="px-3 py-2 text-right">{fmtMoeda(c.valor)}</td>
                          <td className="px-3 py-2 text-right">{pct(c.valor)}</td>
                        </tr>
                        {abertos.has(kc) && c.naturezas.sort((a, b) => b.valor - a.valor).map(n => (
                          <tr
                            key={`${kc}|${n.natureza}`}
                            className="border-t text-gray-700 cursor-pointer hover:bg-emerald-50"
                            onClick={() => setDrill({ grupo, centroCusto: cc, natureza: n.natureza })}
                            title="Ver os lançamentos"
                          >
                            <td className="px-3 py-1.5 pl-14">{n.natureza}</td>
                            <td className="px-3 py-1.5 text-right">{n.qtd}</td>
                            <td className="px-3 py-1.5 text-right">{fmtMoeda(n.valor)}</td>
                            <td className="px-3 py-1.5 text-right">{pct(n.valor)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold bg-gray-50">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{linhas.reduce((s, l) => s + l.qtd, 0)}</td>
              <td className="px-3 py-2 text-right">{fmtMoeda(total)}</td>
              <td className="px-3 py-2 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-500">Clique em uma natureza para ver os lançamentos do extrato. Empréstimos e transferências próprias ficam fora desta lista (aparecem no Resumo).</p>

      {drill && <DrillLancamentos tipo={tipo} periodo={periodo} conta={conta} drill={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function DrillLancamentos({ tipo, periodo, conta, drill, onClose }: {
  tipo: "saida" | "entrada"; periodo: { dataInicio: string; dataFim: string }; conta: Conta;
  drill: { grupo: string; centroCusto?: string; natureza?: string }; onClose: () => void;
}) {
  const q = trpc.financialReal.lancamentos.useQuery({
    ...periodo, conta, tipo: tipo === "saida" ? "DEBITO" : "CREDITO", tipoResultado: "resultado",
    grupo: drill.grupo, centroCusto: drill.centroCusto, natureza: drill.natureza, limit: 500,
  });
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <p className="text-sm font-semibold">
          {drill.grupo} › {drill.centroCusto} › {drill.natureza}
          {q.data && <span className="font-normal text-gray-500"> — {q.data.total} lançamento(s), {fmtMoeda(q.data.soma)}</span>}
        </p>
        <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
      <TabelaLancamentos itens={q.data?.itens ?? []} loading={q.isLoading} />
    </div>
  );
}

function TabelaLancamentos({ itens, loading, selecionados, onToggle }: {
  itens: any[]; loading: boolean; selecionados?: Set<number>; onToggle?: (id: number) => void;
}) {
  if (loading) return <div className="h-24 bg-gray-100 animate-pulse" />;
  if (itens.length === 0) return <p className="p-4 text-sm text-gray-500">Nenhum lançamento.</p>;
  return (
    <div className="overflow-x-auto max-h-[28rem]">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
          <tr>
            {onToggle && <th className="px-2 py-2 w-8" />}
            <th className="px-2 py-2 text-left">Data</th>
            <th className="px-2 py-2 text-left">Descrição</th>
            <th className="px-2 py-2 text-right">Valor</th>
            <th className="px-2 py-2 text-left">Classificação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(l => (
            <tr key={l.id} className="border-t hover:bg-gray-50">
              {onToggle && (
                <td className="px-2 py-1.5">
                  <input type="checkbox" checked={selecionados?.has(l.id) ?? false} onChange={() => onToggle(l.id)} />
                </td>
              )}
              <td className="px-2 py-1.5 whitespace-nowrap">{fmtData(l.data)}</td>
              <td className="px-2 py-1.5 max-w-[34rem]">
                <div className="truncate" title={`${l.descricao ?? ""} ${l.complemento ?? ""}`}>{l.descricao}{l.conta && l.conta !== "Sicoob" ? <span className="ml-2 text-xs text-blue-600">[{l.conta}]</span> : null}</div>
                {l.complemento && <div className="text-xs text-gray-500 truncate" title={l.complemento}>{l.complemento}{l.numeroDocumento ? ` · ${l.numeroDocumento}` : ""}</div>}
              </td>
              <td className={`px-2 py-1.5 text-right whitespace-nowrap font-medium ${l.tipo === "CREDITO" ? "text-emerald-700" : "text-red-700"}`}>
                {l.tipo === "CREDITO" ? "+" : "−"} {fmtMoeda(l.valor)}
              </td>
              <td className="px-2 py-1.5 text-xs">
                {l.origem === "nenhuma" ? (
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-300">{SEM}</Badge>
                ) : (
                  <>
                    <div>{[l.grupo, l.centroCusto, l.natureza].filter(Boolean).join(" › ") || "—"}</div>
                    <div className="text-gray-500">
                      {ORIGEM_LABEL[l.origem]}{l.regraNome ? `: ${l.regraNome}` : ""}
                      {l.tipoResultado !== "resultado" ? ` · ${TIPO_RESULTADO_LABEL[l.tipoResultado as TipoResultado]}` : ""}
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── Classificar ─────────────────────────

const PAGINA = 200;

function ClassificarAba({ periodo, conta }: { periodo: { dataInicio: string; dataFim: string }; conta: Conta }) {
  const utils = trpc.useUtils();
  const [tipo, setTipo] = useState<"todos" | "DEBITO" | "CREDITO">("DEBITO");
  const [situacao, setSituacao] = useState<"todas" | "sem" | "classificadas">("sem");
  const [busca, setBusca] = useState("");
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [grupo, setGrupo] = useState("");
  const [centro, setCentro] = useState("");
  const [natureza, setNatureza] = useState("");
  const [tipoRes, setTipoRes] = useState<TipoResultado>("resultado");

  const lista = trpc.financialReal.lancamentos.useQuery({
    ...periodo, conta, tipo, situacao, busca: busca.trim() || undefined, limit: PAGINA, offset,
  });
  const opcoes = trpc.financialReal.opcoes.useQuery();

  const grupos = useMemo(() => Array.from(new Set((opcoes.data?.combinacoes ?? []).map(c => c.grupo))).sort(), [opcoes.data]);
  const centros = useMemo(() => Array.from(new Set((opcoes.data?.combinacoes ?? []).filter(c => !grupo || c.grupo === grupo).map(c => c.centroCusto).filter(Boolean) as string[])).sort(), [opcoes.data, grupo]);
  const naturezas = useMemo(() => Array.from(new Set((opcoes.data?.combinacoes ?? []).filter(c => (!grupo || c.grupo === grupo) && (!centro || c.centroCusto === centro)).map(c => c.natureza).filter(Boolean) as string[])).sort(), [opcoes.data, grupo, centro]);

  const depois = () => { setSel(new Set()); utils.financialReal.invalidate(); };
  const classificar = trpc.financialReal.classificar.useMutation({
    onSuccess: (r) => { toast.success(`${r.atualizados} lançamento(s) classificado(s).`); depois(); },
    onError: (e) => toast.error(e.message),
  });
  const remover = trpc.financialReal.removerClassificacaoManual.useMutation({
    onSuccess: () => { toast.success("Ajuste manual removido."); depois(); },
    onError: (e) => toast.error(e.message),
  });

  const itens = lista.data?.itens ?? [];
  const toggle = (id: number) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todosMarcados = itens.length > 0 && itens.every(i => sel.has(i.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Tipo</label>
          <select value={tipo} onChange={e => { setTipo(e.target.value as any); setOffset(0); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="DEBITO">Saídas</option>
            <option value="CREDITO">Entradas</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Situação</label>
          <select value={situacao} onChange={e => { setSituacao(e.target.value as any); setOffset(0); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="sem">Sem classificação</option>
            <option value="classificadas">Já classificadas</option>
            <option value="todas">Todas</option>
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-xs text-gray-500 block mb-1">Buscar no texto</label>
          <Input value={busca} onChange={e => { setBusca(e.target.value); setOffset(0); }} placeholder="Ex.: PIX, nome, CNPJ, documento..." className="h-9" />
        </div>
      </div>

      {/* Classificação em lote */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        <p className="text-sm font-semibold">Classificar os {sel.size} selecionado(s)</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grupo</label>
            <Input list="dl-grupos" value={grupo} onChange={e => setGrupo(e.target.value)} className="h-9" placeholder="Ex.: Produção" />
            <datalist id="dl-grupos">{grupos.map(g => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Centro de custo</label>
            <Input list="dl-centros" value={centro} onChange={e => setCentro(e.target.value)} className="h-9" />
            <datalist id="dl-centros">{centros.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Natureza</label>
            <Input list="dl-naturezas" value={natureza} onChange={e => setNatureza(e.target.value)} className="h-9" />
            <datalist id="dl-naturezas">{naturezas.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Entra no resultado?</label>
            <select value={tipoRes} onChange={e => setTipoRes(e.target.value as TipoResultado)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {(Object.keys(TIPO_RESULTADO_LABEL) as TipoResultado[]).map(k => <option key={k} value={k}>{TIPO_RESULTADO_LABEL[k]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={sel.size === 0 || !grupo.trim() || classificar.isPending}
            onClick={() => classificar.mutate({
              ids: Array.from(sel), grupo: grupo.trim(), centroCusto: centro.trim() || null, natureza: natureza.trim() || null, tipoResultado: tipoRes,
            })}
          >
            Aplicar aos selecionados
          </Button>
          <Button size="sm" variant="outline" disabled={sel.size === 0 || remover.isPending} onClick={() => remover.mutate({ ids: Array.from(sel) })}>
            Remover ajuste manual
          </Button>
          <span className="text-xs text-gray-500 self-center">Dica: busque pelo nome do favorecido, marque todos e classifique de uma vez. Para regras automáticas, use a aba Regras.</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox" checked={todosMarcados}
              onChange={() => setSel(todosMarcados ? new Set() : new Set(itens.map(i => i.id)))}
            />
            Marcar todos desta página
          </label>
          <span className="text-gray-500">
            {lista.data ? `${lista.data.total} lançamento(s) · ${fmtMoeda(lista.data.soma)}` : ""}
          </span>
        </div>
        <TabelaLancamentos itens={itens} loading={lista.isLoading} selecionados={sel} onToggle={toggle} />
        {lista.data && lista.data.total > PAGINA && (
          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGINA))}>Anterior</Button>
            <span>{offset + 1}–{Math.min(offset + PAGINA, lista.data.total)} de {lista.data.total}</span>
            <Button size="sm" variant="outline" disabled={offset + PAGINA >= lista.data.total} onClick={() => setOffset(offset + PAGINA)}>Próxima</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Regras ─────────────────────────

type RegraForm = {
  id?: number; nome: string; campo: "descricao" | "complemento" | "documento" | "texto";
  tipoLancamento: "DEBITO" | "CREDITO" | "AMBOS"; padrao: string;
  grupo: string; centroCusto: string; natureza: string; tipoResultado: TipoResultado; prioridade: number; ativa: boolean;
};
const REGRA_VAZIA: RegraForm = {
  nome: "", campo: "texto", tipoLancamento: "DEBITO", padrao: "", grupo: "", centroCusto: "", natureza: "",
  tipoResultado: "resultado", prioridade: 100, ativa: true,
};

function RegrasAba() {
  const utils = trpc.useUtils();
  const regras = trpc.financialReal.listRegras.useQuery();
  const [form, setForm] = useState<RegraForm | null>(null);

  const salvar = trpc.financialReal.salvarRegra.useMutation({
    onSuccess: () => { toast.success("Regra salva."); setForm(null); utils.financialReal.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const excluir = trpc.financialReal.excluirRegra.useMutation({
    onSuccess: () => { toast.success("Regra excluída."); utils.financialReal.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 max-w-3xl">
          Regras classificam automaticamente os lançamentos pelo texto. A ordem de prioridade vale (menor número primeiro). Um ajuste manual sempre vence a regra, e a regra vence a classificação do favorecido.
          Use <code>re:</code> no início do padrão para expressão regular (ex.: <code>re:^TAG\.</code>).
        </p>
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setForm({ ...REGRA_VAZIA })}>
          <Plus className="h-4 w-4" /> Nova regra
        </Button>
      </div>

      {form && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">{form.id ? "Editar regra" : "Nova regra"}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Nome</label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prioridade</label>
              <Input type="number" value={form.prioridade} onChange={e => setForm({ ...form, prioridade: Number(e.target.value) || 100 })} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Aplica a</label>
              <select value={form.tipoLancamento} onChange={e => setForm({ ...form, tipoLancamento: e.target.value as any })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="DEBITO">Saídas</option><option value="CREDITO">Entradas</option><option value="AMBOS">Ambos</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Procurar em</label>
              <select value={form.campo} onChange={e => setForm({ ...form, campo: e.target.value as any })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="texto">Todo o texto</option><option value="descricao">Descrição</option>
                <option value="complemento">Complemento</option><option value="documento">Nº do documento</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Padrão (texto ou re:regex)</label>
              <Input value={form.padrao} onChange={e => setForm({ ...form, padrao: e.target.value })} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Grupo</label>
              <Input value={form.grupo} onChange={e => setForm({ ...form, grupo: e.target.value })} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Centro de custo</label>
              <Input value={form.centroCusto} onChange={e => setForm({ ...form, centroCusto: e.target.value })} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Natureza</label>
              <Input value={form.natureza} onChange={e => setForm({ ...form, natureza: e.target.value })} className="h-9" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Entra no resultado?</label>
              <select value={form.tipoResultado} onChange={e => setForm({ ...form, tipoResultado: e.target.value as TipoResultado })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {(Object.keys(TIPO_RESULTADO_LABEL) as TipoResultado[]).map(k => <option key={k} value={k}>{TIPO_RESULTADO_LABEL[k]}</option>)}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm self-end pb-2">
              <input type="checkbox" checked={form.ativa} onChange={e => setForm({ ...form, ativa: e.target.checked })} /> Ativa
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!form.nome.trim() || !form.padrao.trim() || !form.grupo.trim() || salvar.isPending}
              onClick={() => salvar.mutate({
                id: form.id, nome: form.nome.trim(), campo: form.campo, tipoLancamento: form.tipoLancamento, padrao: form.padrao.trim(),
                grupo: form.grupo.trim() || null, centroCusto: form.centroCusto.trim() || null, natureza: form.natureza.trim() || null,
                tipoResultado: form.tipoResultado, prioridade: form.prioridade, ativa: form.ativa,
              })}
            >
              Salvar regra
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Prior.</th>
              <th className="px-3 py-2 text-left">Regra</th>
              <th className="px-3 py-2 text-left">Quando</th>
              <th className="px-3 py-2 text-left">Classifica como</th>
              <th className="px-3 py-2 text-left">Resultado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(regras.data ?? []).map(r => (
              <tr key={r.id} className={`border-t ${r.ativa ? "" : "opacity-50"}`}>
                <td className="px-3 py-2">{r.prioridade}</td>
                <td className="px-3 py-2 font-medium">{r.nome}{!r.ativa && <span className="ml-2 text-xs text-gray-500">(inativa)</span>}</td>
                <td className="px-3 py-2 text-xs">
                  {r.tipoLancamento === "DEBITO" ? "Saída" : r.tipoLancamento === "CREDITO" ? "Entrada" : "Ambos"} · {r.campo} contém <code>{r.padrao}</code>
                </td>
                <td className="px-3 py-2 text-xs">{[r.grupo, r.centroCusto, r.natureza].filter(Boolean).join(" › ")}</td>
                <td className="px-3 py-2 text-xs">{TIPO_RESULTADO_LABEL[r.tipoResultado]}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => setForm({
                    id: r.id, nome: r.nome, campo: r.campo, tipoLancamento: r.tipoLancamento, padrao: r.padrao,
                    grupo: r.grupo ?? "", centroCusto: r.centroCusto ?? "", natureza: r.natureza ?? "",
                    tipoResultado: r.tipoResultado, prioridade: r.prioridade, ativa: r.ativa,
                  })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" title="Excluir"
                    onClick={() => { if (confirm(`Excluir a regra "${r.nome}"?`)) excluir.mutate({ id: r.id }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {regras.data?.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhuma regra cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
