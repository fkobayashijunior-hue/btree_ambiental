import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { exportStyledExcel } from "@/lib/exportExcel";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type SortCol = "data_lancamento" | "tipo_lancamento" | "descricao" | "numero_documento" | "valor";
type SortDir = "asc" | "desc";

function fmtMoeda(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return (isNaN(n) ? 0 : n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return d; }
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="inline ml-1 h-3 w-3" />
    : <ArrowDown className="inline ml-1 h-3 w-3" />;
}

export default function ExtratoMovimentacoesPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [sortCol, setSortCol] = useState<SortCol>("data_lancamento");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "DEBITO" | "CREDITO">("todos");

  const navMes = (delta: number) => {
    let m = mes + delta, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const { data, isLoading, refetch } = trpc.sicoob.listExtrato.useQuery(
    { mes, ano },
    { refetchOnWindowFocus: false }
  );

  const syncMutation = trpc.sicoob.syncExtrato.useMutation({
    onSuccess: (res) => {
      if (res.error) toast.error(`Erro: ${res.error}`);
      else toast.success(`${res.synced} lançamento(s) sincronizado(s)`);
      refetch();
    },
    onError: () => toast.error("Falha ao sincronizar"),
  });

  const lancamentos: any[] = useMemo(() => {
    let rows = data?.lancamentos ?? [];

    // Filtro por período de datas
    if (dataInicio) rows = rows.filter((l: any) => (l.data_lancamento ?? "") >= dataInicio);
    if (dataFim)    rows = rows.filter((l: any) => (l.data_lancamento ?? "") <= dataFim);

    // Filtro por tipo (Débito/Crédito)
    if (tipoFiltro !== "todos") rows = rows.filter((l: any) => l.tipo_lancamento === tipoFiltro);

    // Ordenação
    rows = [...rows].sort((a, b) => {
      let va: any = a[sortCol] ?? "";
      let vb: any = b[sortCol] ?? "";
      if (sortCol === "valor") { va = parseFloat(va); vb = parseFloat(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, sortCol, sortDir, dataInicio, dataFim, tipoFiltro]);

  const saldoInicial = data?.saldoInicial ?? 0;
  const receitasRealizadas = lancamentos.filter(l => parseFloat(l.valor) > 0).reduce((s, l) => s + parseFloat(l.valor), 0);
  const despesasRealizadas = lancamentos.filter(l => parseFloat(l.valor) < 0).reduce((s, l) => s + parseFloat(l.valor), 0);
  const saldoFinal = saldoInicial + receitasRealizadas + despesasRealizadas;

  const cards = [
    { label: "Saldo inicial do mês", value: saldoInicial, color: saldoInicial >= 0 ? "text-blue-600" : "text-red-600" },
    { label: "Receitas realizadas (R$)", value: receitasRealizadas, color: "text-emerald-600" },
    { label: "Despesas realizadas (R$)", value: despesasRealizadas, color: "text-red-600" },
    { label: "Saldo final (R$)", value: saldoFinal, color: saldoFinal >= 0 ? "text-blue-600" : "text-red-600", highlight: true },
  ];

  const thCls = "px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground";

  const handleExportExcel = async () => {
    if (lancamentos.length === 0) { toast.error("Nenhum lançamento para exportar"); return; }
    await exportStyledExcel({
      title: "BTREE AMBIENTAL — EXTRATO DE MOVIMENTAÇÕES",
      subtitle: `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Período: ${MESES[mes - 1]}/${ano}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
      sheetName: "Extrato",
      columns: [
        { header: "Data", width: 14 },
        { header: "Tipo", width: 12 },
        { header: "Descrição", width: 32 },
        { header: "Nº Documento", width: 16 },
        { header: "Complemento", width: 30 },
        { header: "Valor (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
      ],
      rows: lancamentos.map((l: any) => [
        fmtData(l.data_lancamento),
        l.tipo_lancamento ?? "-",
        l.descricao ?? "-",
        l.numero_documento ?? "-",
        l.complemento ?? "-",
        parseFloat(l.valor ?? "0"),
      ]),
      totalsRow: ["TOTAL", "", `${lancamentos.length} lançamento(s)`, "", "", receitasRealizadas + despesasRealizadas],
      filename: `extrato-movimentacoes-${ano}-${String(mes).padStart(2, "0")}.xlsx`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Extrato Movimentações</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate({ mes, ano })} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Sicoob"}
          </Button>
          {data?.sincronizadoEm && (
            <span className="text-xs text-muted-foreground">
              Última sync: {fmtData(String(data.sincronizadoEm).slice(0, 10))}
            </span>
          )}
        </div>
      </div>

      {/* Navegação de mês + filtro de período */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[130px] text-center">{MESES[mes - 1]} de {ano}</span>
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Input
            type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="h-8 w-36 text-sm"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="h-8 w-36 text-sm"
          />
          {(dataInicio || dataFim) && (
            <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { setDataInicio(""); setDataFim(""); }}>
              Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo:</span>
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            {([
              { key: "todos",   label: "Todos" },
              { key: "CREDITO", label: "Crédito" },
              { key: "DEBITO",  label: "Débito" },
            ] as { key: typeof tipoFiltro; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTipoFiltro(t.key)}
                className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                  tipoFiltro === t.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg border bg-card p-4 ${c.highlight ? "border-primary/40 bg-primary/5" : ""}`}>
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{fmtMoeda(c.value)}</p>
          </div>
        ))}
      </div>

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
          Erro: {data.error}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className={`${thCls} text-left w-32`} onClick={() => toggleSort("data_lancamento")}>
                  Data <SortIcon col="data_lancamento" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`${thCls} text-left w-28`} onClick={() => toggleSort("tipo_lancamento")}>
                  Tipo <SortIcon col="tipo_lancamento" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`${thCls} text-left`} onClick={() => toggleSort("descricao")}>
                  Descrição <SortIcon col="descricao" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`${thCls} text-left w-32`} onClick={() => toggleSort("numero_documento")}>
                  Nº Documento <SortIcon col="numero_documento" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-left">Complemento</th>
                <th className={`${thCls} text-right w-36`} onClick={() => toggleSort("valor")}>
                  Valor (R$) <SortIcon col="valor" sortCol={sortCol} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && lancamentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {(data?.lancamentos ?? []).length === 0
                      ? `Nenhum lançamento em ${MESES[mes - 1]}/${ano} — clique em "Sincronizar Sicoob"`
                      : "Nenhum lançamento no período filtrado"}
                  </td>
                </tr>
              )}
              {lancamentos.map((l: any) => {
                const valor = parseFloat(l.valor ?? "0");
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{fmtData(l.data_lancamento)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.tipo_lancamento === "DEBITO" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
                        {l.tipo_lancamento ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{l.descricao ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{l.numero_documento ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{l.complemento ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${valor >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {valor >= 0 ? "+" : ""}{fmtMoeda(valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lancamentos.length > 0 && (
        <p className="text-xs text-muted-foreground">{lancamentos.length} lançamento(s) • Dados armazenados localmente do Sicoob</p>
      )}
    </div>
  );
}
