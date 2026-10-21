// Abas do Dashboard Financeiro Real: Entradas (extras), Competência, Conciliação e Contas.
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Trash2, Upload } from "lucide-react";

type Periodo = { dataInicio: string; dataFim: string };

const fmtMoeda = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: string) => d.split("-").reverse().join("/");

function Card({ titulo, valor, sub, cor = "text-gray-800" }: { titulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className={`text-xl font-bold mt-1 ${cor}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Erros({ erros }: { erros?: string[] }) {
  if (!erros || erros.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
      <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Algumas fontes não puderam ser lidas (valores dessas fontes aparecem como zero):</p>
      {erros.map((e, i) => <p key={i}>• {e}</p>)}
    </div>
  );
}

// ───────────────────────── Entradas: faturado × recebido ─────────────────────────

export function EntradasExtras({ periodo }: { periodo: Periodo }) {
  const ent = trpc.financialReal.entradas.useQuery(periodo);
  const comp = trpc.financialReal.compradores.useQuery(periodo);
  const d = ent.data;
  const cc = comp.data;
  const tot = (cc?.compradores ?? []).reduce(
    (a, c) => ({ f: a.f + c.faturado, r: a.r + c.recebido }), { f: 0, r: 0 });

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card titulo="Faturado em NF" valor={fmtMoeda(d?.faturadoNF.valor)} sub={`${d?.faturadoNF.qtd ?? 0} NF(s) emitidas no período (competência)`} />
        <Card titulo="Boletos liquidados" valor={fmtMoeda(d?.boletosLiquidados.valor)} sub={`${d?.boletosLiquidados.qtd ?? 0} boleto(s) pagos no período`} cor="text-emerald-700" />
        <Card titulo="NFs emitidas sem boleto" valor={fmtMoeda(d?.nfsSemBoleto.valor)} sub={`${d?.nfsSemBoleto.qtd ?? 0} NF(s) — pagas por PIX/transferência`} />
        <Card titulo="Boletos sem NF vinculada" valor={fmtMoeda(d?.boletosSemNF.valor)} sub={`${d?.boletosSemNF.qtd ?? 0} boleto(s) sem número de NF na instrução`} cor={d && d.boletosSemNF.qtd > 0 ? "text-amber-700" : "text-gray-800"} />
      </div>
      <Erros erros={[...(d?.erros ?? []), ...(cc?.erros ?? [])]} />

      <div className="rounded-xl border bg-card">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold">Conta corrente dos compradores no período</p>
          <p className="text-xs text-gray-500">
            Faturado (NF e cargas sem NF) × recebido (PIX identificado pelo CNPJ no extrato + boletos liquidados). O comprador costuma pagar várias NFs de uma vez, então este saldo é mais confiável do que "NFs em aberto" quando a baixa não foi feita no sistema.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Comprador</th>
                <th className="px-3 py-2 text-right">NFs</th>
                <th className="px-3 py-2 text-right">Faturado</th>
                <th className="px-3 py-2 text-right">PIX recebido</th>
                <th className="px-3 py-2 text-right">Boletos pagos</th>
                <th className="px-3 py-2 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {(cc?.compradores ?? []).map(c => (
                <tr key={c.cnpj} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-gray-500">{c.cnpj}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{c.nfs}</td>
                  <td className="px-3 py-2 text-right">{fmtMoeda(c.faturado)}{c.faturadoCargas > 0 && <div className="text-xs text-gray-500">cargas s/ NF: {fmtMoeda(c.faturadoCargas)}</div>}</td>
                  <td className="px-3 py-2 text-right">{fmtMoeda(c.recebidoPix)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoeda(c.recebidoBoletos)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${Math.abs(c.diferenca) < 1 ? "text-gray-600" : c.diferenca > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {fmtMoeda(c.diferenca)}
                  </td>
                </tr>
              ))}
              {cc && cc.compradores.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhum faturamento ou recebimento de comprador no período.</td></tr>
              )}
            </tbody>
            {cc && cc.compradores.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold bg-gray-50">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right">{fmtMoeda(tot.f)}</td>
                  <td className="px-3 py-2 text-right" colSpan={2}>{fmtMoeda(tot.r)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoeda(tot.f - tot.r)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-gray-500 border-t">
          Diferença positiva = faturado a mais do que entrou (pode ser prazo de pagamento). Negativa = entrou mais do que foi faturado no período (pagamento de NF de meses anteriores). Use períodos de 2 a 3 meses para suavizar o prazo.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── Competência ─────────────────────────

const GRUPO_LABEL: Record<string, string> = {
  pessoal: "Pessoal", madeira: "Madeira e terceiros", combustivel: "Combustível", manutencao: "Manutenção", outros: "Outros",
};

export function CompetenciaAba({ periodo }: { periodo: Periodo }) {
  const q = trpc.financialReal.competencia.useQuery(periodo);
  const d = q.data;
  if (q.isLoading || !d) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;

  const grupos = Object.keys(GRUPO_LABEL).map(g => ({
    chave: g, label: GRUPO_LABEL[g], blocos: d.blocos.filter(b => b.grupo === g),
    total: d.blocos.filter(b => b.grupo === g && b.somaNoTotal).reduce((s, b) => s + b.valor, 0),
  })).filter(g => g.blocos.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Esta aba mostra o <b>custo da operação</b> a partir dos registros do sistema, na data em que o fato aconteceu. Ela <b>não soma o extrato bancário</b>: o que saiu do banco está nas abas Resumo e Saídas. A diferença entre as duas está em Conciliação.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card titulo="Receita faturada" valor={fmtMoeda(d.receitaTotal)} cor="text-emerald-700"
          sub={`${d.receita.nfsQtd} NF(s) emitidas${d.receita.cargasSemNfQtd ? ` + ${d.receita.cargasSemNfQtd} carga(s) sem NF` : ""}`} />
        <Card titulo="Custo da operação" valor={fmtMoeda(d.custoTotal)} cor="text-red-700" sub="Soma dos blocos marcados com +" />
        <Card titulo="Resultado de competência" valor={fmtMoeda(d.resultado)} cor={d.resultado >= 0 ? "text-emerald-700" : "text-red-700"} />
      </div>
      {d.receita.erro && <Erros erros={[`Receita: ${d.receita.erro}`]} />}
      <Erros erros={d.blocos.filter(b => b.erro).map(b => `${b.label}: ${b.erro}`)} />

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Bloco de custo</th>
              <th className="px-3 py-2 text-right">Registros</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(g => (
              <FragmentoGrupo key={g.chave} g={g} periodo={periodo} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold bg-gray-50">
              <td className="px-3 py-2" colSpan={2}>Custo total da operação</td>
              <td className="px-3 py-2 text-right">{fmtMoeda(d.custoTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Blocos marcados com <b>i</b> são informativos e não entram no total, para não repetir custo que já aparece em outro bloco.
      </p>

      <ResultadoPorCliente periodo={periodo} receitaNF={d.receita.nfs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-x-auto">
          <p className="px-4 py-2 text-sm font-semibold border-b">Por equipamento (combustível + manutenção + extras)</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="px-3 py-2 text-left">Equipamento</th><th className="px-3 py-2 text-right">Combustível</th><th className="px-3 py-2 text-right">Manutenção</th><th className="px-3 py-2 text-right">Extras</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {d.porEquipamento.map(e => (
                <tr key={e.equipamentoId} className="border-t">
                  <td className="px-3 py-1.5">{e.nome}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(e.combustivel)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(e.manutencao)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(e.extras)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtMoeda(e.total)}</td>
                </tr>
              ))}
              {d.porEquipamento.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Sem custos por equipamento no período.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <p className="px-4 py-2 text-sm font-semibold border-b">Por local de trabalho</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="px-3 py-2 text-left">Local</th><th className="px-3 py-2 text-right">Diárias</th><th className="px-3 py-2 text-right">Combustível</th><th className="px-3 py-2 text-right">Manutenção</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {d.porLocal.map(l => (
                <tr key={String(l.localId)} className="border-t">
                  <td className="px-3 py-1.5">{l.nome}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(l.diarias)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(l.combustivel)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtMoeda(l.manutencao + l.extras)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmtMoeda(l.total)}</td>
                </tr>
              ))}
              {d.porLocal.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Sem custos por local no período.</td></tr>}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-500 border-t">Só entram registros que informam o local (diárias, combustível, manutenção de veículos e extras). Folha mensal e madeira não são rateadas por local.</p>
        </div>
      </div>
    </div>
  );
}

function ResultadoPorCliente({ periodo, receitaNF }: { periodo: Periodo; receitaNF: number }) {
  const q = trpc.financialReal.resultadoPorCliente.useQuery(periodo);
  const d = q.data;
  if (q.isLoading || !d) return <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />;
  const t = d.total;
  const semPreco = d.clientes.reduce((s, c) => s + c.cargasSemPreco, 0);
  return (
    <div className="rounded-xl border bg-card">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold">Resultado por cliente (origem da madeira)</p>
        <p className="text-xs text-gray-500">
          O cliente fornece a madeira e o comprador paga. A receita de cada cliente é <b>estimada</b>: cargas entregues no período × preço do comprador de destino. A compra da madeira usa os fechamentos (valor atual). Frete, combustível e folha não são divididos por cliente.
        </p>
      </div>
      <Erros erros={d.erros} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-right">Cargas</th>
              <th className="px-3 py-2 text-right">Toneladas</th>
              <th className="px-3 py-2 text-right">Receita estimada</th>
              <th className="px-3 py-2 text-right">Compra de madeira</th>
              <th className="px-3 py-2 text-right">Corte terceirizado</th>
              <th className="px-3 py-2 text-right">Resultado bruto</th>
              <th className="px-3 py-2 text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {d.clientes.map(c => (
              <tr key={String(c.clienteId)} className="border-t">
                <td className="px-3 py-2 font-medium">{c.nome}{c.cargasSemPreco > 0 && <span className="ml-2 text-xs text-amber-700" title="Cargas cujo comprador não tem preço cadastrado">({c.cargasSemPreco} sem preço)</span>}</td>
                <td className="px-3 py-2 text-right">{c.cargas}</td>
                <td className="px-3 py-2 text-right">{c.toneladas.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{fmtMoeda(c.receitaEstimada)}</td>
                <td className="px-3 py-2 text-right text-red-700">{fmtMoeda(c.compraMadeira)}</td>
                <td className="px-3 py-2 text-right text-red-700">{fmtMoeda(c.corteTerceirizado)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${c.resultadoBruto >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtMoeda(c.resultadoBruto)}</td>
                <td className="px-3 py-2 text-right">{c.margemPct != null ? `${c.margemPct.toLocaleString("pt-BR")}%` : "—"}</td>
              </tr>
            ))}
            {d.clientes.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Nenhuma carga entregue no período.</td></tr>}
          </tbody>
          {d.clientes.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-bold bg-gray-50">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{t.cargas}</td>
                <td className="px-3 py-2 text-right">{t.toneladas.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-right">{fmtMoeda(t.receitaEstimada)}</td>
                <td className="px-3 py-2 text-right">{fmtMoeda(t.compraMadeira)}</td>
                <td className="px-3 py-2 text-right">{fmtMoeda(t.corteTerceirizado)}</td>
                <td className="px-3 py-2 text-right">{fmtMoeda(t.resultadoBruto)}</td>
                <td className="px-3 py-2 text-right">{t.receitaEstimada > 0 ? `${((t.resultadoBruto / t.receitaEstimada) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-gray-500 border-t">
        Para comparar: NFs emitidas no período somam {fmtMoeda(receitaNF)} (competência pela data de emissão); a receita estimada acima é pela data de entrega da carga, então os dois números diferem por prazo de emissão e por cargas sem NF (ex.: Enerbio).
        {semPreco > 0 ? ` ${semPreco} carga(s) estão sem preço do comprador e entram com receita zero.` : ""} O "resultado bruto" considera só madeira e corte terceirizado — não é o lucro final.
      </p>
    </div>
  );
}

function FragmentoGrupo({ g, periodo }: { g: { chave: string; label: string; total: number; blocos: any[] }; periodo: Periodo }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const alterna = (k: string) => setAbertos(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return (
    <>
      <tr className="border-t bg-gray-50/70 font-semibold">
        <td className="px-3 py-2" colSpan={2}>{g.label}</td>
        <td className="px-3 py-2 text-right">{fmtMoeda(g.total)}</td>
      </tr>
      {g.blocos.map(b => {
        const podeAbrir = b.qtd > 0;
        const aberto = abertos.has(b.chave);
        return (
          <FragmentoBloco key={b.chave}>
            <tr className={`border-t ${podeAbrir ? "cursor-pointer hover:bg-emerald-50" : ""}`} onClick={() => podeAbrir && alterna(b.chave)}>
              <td className="px-3 py-1.5 pl-8">
                {podeAbrir
                  ? (aberto ? <ChevronDown className="inline h-4 w-4 mr-1 text-gray-500" /> : <ChevronRight className="inline h-4 w-4 mr-1 text-gray-500" />)
                  : <span className="inline-block w-4 mr-1" />}
                <span className={`inline-block w-4 text-center font-mono ${b.somaNoTotal ? "text-gray-400" : "text-blue-600"}`}>{b.somaNoTotal ? "+" : "i"}</span>{" "}
                {b.label}
                {b.nota && <div className="text-xs text-gray-500 pl-10">{b.nota}</div>}
              </td>
              <td className="px-3 py-1.5 text-right">{b.qtd}</td>
              <td className={`px-3 py-1.5 text-right ${b.somaNoTotal ? "" : "text-gray-500 italic"}`}>{fmtMoeda(b.valor)}</td>
            </tr>
            {aberto && (
              <tr className="bg-gray-50/40">
                <td colSpan={3} className="px-3 pb-3 pt-1 pl-12"><DetalheBloco chave={b.chave} periodo={periodo} /></td>
              </tr>
            )}
          </FragmentoBloco>
        );
      })}
    </>
  );
}

function FragmentoBloco({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function DetalheBloco({ chave, periodo }: { chave: string; periodo: Periodo }) {
  const q = trpc.financialReal.competenciaDetalhe.useQuery({ ...periodo, chave });
  if (q.isLoading) return <div className="h-12 bg-gray-100 animate-pulse rounded" />;
  if (q.isError) return <p className="text-xs text-red-600">Erro ao carregar: {q.error.message}</p>;
  const d = q.data!;
  if (d.erro) return <p className="text-xs text-red-600">Erro: {d.erro}</p>;
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left">Data</th>
              <th className="px-2 py-1.5 text-left">Descrição</th>
              <th className="px-2 py-1.5 text-left">Detalhe</th>
              <th className="px-2 py-1.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {d.linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1 whitespace-nowrap">{/^\d{4}-\d{2}-\d{2}$/.test(l.data) ? fmtData(l.data) : l.data}</td>
                <td className="px-2 py-1">{l.descricao}</td>
                <td className="px-2 py-1 text-gray-500">{l.detalhe}</td>
                <td className="px-2 py-1 text-right whitespace-nowrap font-medium">{fmtMoeda(l.valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold bg-gray-50">
              <td className="px-2 py-1.5" colSpan={3}>{d.qtd} registro(s){d.truncado ? ` — mostrando os 500 primeiros` : ""}</td>
              <td className="px-2 py-1.5 text-right">{fmtMoeda(d.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────── Conciliação ─────────────────────────

export function ConciliacaoAba({ periodo, conta }: { periodo: Periodo; conta: "todas" | "sicoob" | number }) {
  const utils = trpc.useUtils();
  const q = trpc.financialReal.conciliacao.useQuery({ ...periodo, conta });
  const classificar = trpc.financialReal.classificar.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const d = q.data;
  const [aplicando, setAplicando] = useState(false);

  if (q.isLoading || !d) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  const r = d.resumo;
  const semClassif = d.casados.filter(c => !c.classificado);

  const aplicarSugestoes = async () => {
    setAplicando(true);
    try {
      // agrupa por sugestão para fazer 1 chamada por classificação
      const grupos = new Map<string, { sugestao: typeof semClassif[number]["sugestao"]; ids: number[] }>();
      for (const c of semClassif) {
        const k = `${c.sugestao.grupo}|${c.sugestao.centroCusto}|${c.sugestao.natureza}`;
        const g = grupos.get(k) ?? { sugestao: c.sugestao, ids: [] };
        g.ids.push(c.debitoId);
        grupos.set(k, g);
      }
      for (const g of Array.from(grupos.values())) {
        await classificar.mutateAsync({
          ids: g.ids, grupo: g.sugestao.grupo, centroCusto: g.sugestao.centroCusto, natureza: g.sugestao.natureza, tipoResultado: "resultado",
        });
      }
      toast.success(`${semClassif.length} lançamento(s) classificado(s) pelas sugestões.`);
      utils.financialReal.invalidate();
    } finally { setAplicando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Compara o que o <b>sistema marcou como pago</b> (folha, fechamentos, faturas de combustível, corte terceirizado, adiantamentos) com os <b>débitos do banco</b>. Casa por valor idêntico e data até 7 dias de diferença. É uma sugestão para explicar o extrato — o total do caixa não depende disso.
      </div>
      <Erros erros={d.erros} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card titulo="Saiu do banco" valor={fmtMoeda(r.debitosBanco)} sub="Todos os débitos do período" cor="text-red-700" />
        <Card titulo="Pago segundo o sistema" valor={fmtMoeda(r.pagamentosSistema)} sub="Pagamentos marcados como pagos" />
        <Card titulo="Explicado (casado)" valor={fmtMoeda(r.casadosValor)} sub={`${r.casadosQtd} pagamento(s) encontrados no banco`} cor="text-emerald-700" />
        <Card titulo="Débitos sem registro no sistema" valor={fmtMoeda(r.debitosSemSistemaValor)} sub={`${r.debitosSemSistemaQtd} lançamento(s) — impostos, empréstimos, aluguel, PIX avulsos...`} cor="text-amber-700" />
      </div>

      {semClassif.length > 0 && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-900">
          <span><CheckCircle2 className="inline h-4 w-4 mr-1" />{semClassif.length} débito(s) do banco foram identificados pelo sistema mas ainda estão sem classificação.</span>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={aplicando} onClick={aplicarSugestoes}>
            {aplicando ? "Aplicando..." : "Aplicar classificação sugerida"}
          </Button>
        </div>
      )}

      <Secao titulo={`Pagamentos do sistema encontrados no banco (${d.casados.length})`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="px-3 py-2 text-left">Sistema</th><th className="px-3 py-2 text-left">Banco</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-left">Classif.</th></tr>
          </thead>
          <tbody>
            {d.casados.map((c, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5">
                  <Badge className="mr-2 bg-gray-100 text-gray-700 border">{c.tipoLabel}</Badge>{c.descricao}
                  <div className="text-xs text-gray-500">pago em {fmtData(c.dataSistema)}</div>
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {fmtData(c.dataBanco)}{c.diasDiferenca !== 0 ? ` (${c.diasDiferenca > 0 ? "+" : ""}${c.diasDiferenca}d)` : ""}
                  <div className="text-gray-500 truncate max-w-[22rem]">{c.debitoDescricao} {c.debitoComplemento}</div>
                </td>
                <td className="px-3 py-1.5 text-right font-medium">{fmtMoeda(c.valor)}</td>
                <td className="px-3 py-1.5 text-xs">{c.classificado ? <span className="text-emerald-700">classificado</span> : <span className="text-amber-700">sem classificação</span>}</td>
              </tr>
            ))}
            {d.casados.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Nenhum pagamento do sistema casou com débitos do banco neste período.</td></tr>}
          </tbody>
        </table>
      </Secao>

      <Secao titulo={`Marcado como pago no sistema, mas não encontrado no banco (${d.pagamentosSemBanco.length})`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Pago em</th><th className="px-3 py-2 text-right">Valor</th></tr>
          </thead>
          <tbody>
            {d.pagamentosSemBanco.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5">{p.tipoLabel}</td><td className="px-3 py-1.5">{p.descricao}</td>
                <td className="px-3 py-1.5">{fmtData(p.data)}</td><td className="px-3 py-1.5 text-right font-medium">{fmtMoeda(p.valor)}</td>
              </tr>
            ))}
            {d.pagamentosSemBanco.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Tudo que o sistema marcou como pago foi encontrado no banco.</td></tr>}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-gray-500 border-t">Possíveis causas: pagamento feito em lote (vários itens num único PIX), em dinheiro, por outra conta, valor diferente do banco ou data de baixa muito distante.</p>
      </Secao>

      <Secao titulo={`Débitos do banco sem registro correspondente no sistema (maiores ${d.debitosSemSistema.length})`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Lançamento</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-left">Classificação</th></tr>
          </thead>
          <tbody>
            {d.debitosSemSistema.map(x => (
              <tr key={x.id} className="border-t">
                <td className="px-3 py-1.5 whitespace-nowrap">{fmtData(x.data)}</td>
                <td className="px-3 py-1.5 max-w-[30rem]">
                  <div className="truncate">{x.descricao}</div>
                  {x.complemento && <div className="text-xs text-gray-500 truncate">{x.complemento}</div>}
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-red-700">{fmtMoeda(x.valor)}</td>
                <td className="px-3 py-1.5 text-xs">
                  {x.classificado ? [x.grupo, x.centroCusto, x.natureza].filter(Boolean).join(" › ") : <span className="text-amber-700">Sem classificação</span>}
                  {x.tipoResultado !== "resultado" && <div className="text-gray-500">fora do resultado</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card">
      <p className="px-4 py-2 text-sm font-semibold border-b">{titulo}</p>
      <div className="overflow-x-auto max-h-[26rem]">{children}</div>
    </div>
  );
}

// ───────────────────────── Contas (importação OFX/CSV) ─────────────────────────

export function ContasAba() {
  const utils = trpc.useUtils();
  const contas = trpc.financialReal.listContas.useQuery();
  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("");
  const [tipo, setTipo] = useState<"conta" | "cartao">("conta");
  const [contaImp, setContaImp] = useState<number | null>(null);
  const [lendo, setLendo] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const criar = trpc.financialReal.criarConta.useMutation({
    onSuccess: () => { toast.success("Conta criada."); setNome(""); setBanco(""); utils.financialReal.listContas.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const excluir = trpc.financialReal.excluirConta.useMutation({
    onSuccess: () => { toast.success("Conta e lançamentos importados excluídos."); utils.financialReal.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const importar = trpc.financialReal.importarExtrato.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.novos} lançamento(s) novo(s) importado(s)${r.duplicados ? `, ${r.duplicados} já existiam` : ""} (${r.formato.toUpperCase()}).`);
      if (r.avisos.length) toast.warning(r.avisos[0]);
      utils.financialReal.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const aoEscolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || contaImp == null) return;
    setLendo(true);
    try {
      let texto = await f.text();
      // extratos de banco costumam vir em Latin-1; se aparecer "�", relê assim
      if (texto.includes("�")) texto = new TextDecoder("latin1").decode(await f.arrayBuffer());
      importar.mutate({ contaId: contaImp, nomeArquivo: f.name, conteudo: texto });
    } finally { setLendo(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        O Sicoob é sincronizado automaticamente. Para <b>outras contas e cartões</b>, cadastre a conta aqui e importe o extrato em <b>OFX</b> (recomendado) ou <b>CSV</b> (colunas Data, Descrição e Valor, ou Débito/Crédito). Reimportar o mesmo arquivo não duplica lançamentos. Os lançamentos entram no Resumo, nas Saídas/Entradas e na fila de classificação.
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Nova conta ou cartão</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Nome</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Cartão Itaú Empresas" className="h-9" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Banco</label>
            <Input value={banco} onChange={e => setBanco(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="conta">Conta corrente</option><option value="cartao">Cartão</option>
            </select>
          </div>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!nome.trim() || criar.isPending}
          onClick={() => criar.mutate({ nome, banco: banco || null, tipo })}>Criar conta</Button>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="px-3 py-2 text-left">Conta</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-right">Lançamentos</th><th className="px-3 py-2 text-left">Período</th><th className="px-3 py-2" /></tr>
          </thead>
          <tbody>
            <tr className="border-t bg-gray-50/50">
              <td className="px-3 py-2 font-medium">Sicoob</td><td className="px-3 py-2">Conta corrente</td>
              <td className="px-3 py-2 text-right" colSpan={2}>Sincronização automática pela API do banco</td><td />
            </tr>
            {(contas.data ?? []).map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-medium">{c.nome}{c.banco ? <span className="text-gray-500 font-normal"> — {c.banco}</span> : null}</td>
                <td className="px-3 py-2">{c.tipo === "cartao" ? "Cartão" : "Conta corrente"}</td>
                <td className="px-3 py-2 text-right">{c.qtd}</td>
                <td className="px-3 py-2 text-xs">{c.primeira && c.ultima ? `${fmtData(c.primeira)} a ${fmtData(c.ultima)}` : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <Button size="sm" variant="outline" className="gap-1.5 mr-1" disabled={lendo || importar.isPending}
                    onClick={() => { setContaImp(c.id); setTimeout(() => arquivoRef.current?.click(), 0); }}>
                    <Upload className="h-3.5 w-3.5" /> Importar extrato
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500" title="Excluir conta e lançamentos importados"
                    onClick={() => { if (confirm(`Excluir a conta "${c.nome}" e todos os ${c.qtd} lançamentos importados?`)) excluir.mutate({ id: c.id }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {contas.data?.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Nenhuma outra conta cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
      <input ref={arquivoRef} type="file" accept=".ofx,.csv,.txt" className="hidden" onChange={aoEscolherArquivo} />
    </div>
  );
}
