import { useState, useRef, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Search, Upload, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import { exportStyledExcel } from "@/lib/exportExcel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type SortCol = "dataVencimento" | "dataPagamento" | "descricao" | "numeroDocumento" | "valor" | "situacao";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="inline ml-1 h-3 w-3" />
    : <ArrowDown className="inline ml-1 h-3 w-3" />;
}

const SITUACAO_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pago:        { label: "Pago",        variant: "default" },
  vencido:     { label: "Vencido",     variant: "destructive" },
  vence_hoje:  { label: "Vence hoje",  variant: "secondary" },
  a_vencer:    { label: "A vencer",    variant: "outline" },
};

function fmtMoeda(valor: string | number) {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(data?: string | null) {
  if (!data) return "—";
  try { return format(parseISO(data), "dd/MM/yyyy"); } catch { return data; }
}

// Converte data serial do Excel ou string para "YYYY-MM-DD"
function parseExcelDate(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(raw).trim();
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseExcelValor(raw: any): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (isNaN(n)) return null;
  return String(n);
}

export default function ContasAPagarPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [pesquisa, setPesquisa] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroCentroCusto, setFiltroCentroCusto] = useState("todos");
  const [filtroNatureza, setFiltroNatureza] = useState("todos");
  const [sortCol, setSortCol] = useState<SortCol>("dataVencimento");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const navMes = (delta: number) => {
    let m = mes + delta, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
    // Mês diferente = outro conjunto de lançamentos — os filtros de classificação (que "prendem"
    // a lista pro filtro atual) não fariam sentido carregados de um mês pro outro.
    setFiltroGrupo("todos"); setFiltroCentroCusto("todos"); setFiltroNatureza("todos");
  };

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const { data, isLoading, refetch } = trpc.sicoob.contasAPagar.useQuery(
    { mes, ano, pesquisa: pesquisa || undefined },
    { refetchOnWindowFocus: false }
  );

  const { data: opcoesData, refetch: refetchOpcoes } = trpc.sicoob.listClassificacaoOpcoes.useQuery(
    undefined, { refetchOnWindowFocus: false }
  );
  const combos: any[] = opcoesData?.combos ?? [];

  const upsertClassificacaoMutation = trpc.sicoob.upsertFavorecidoClassificacaoPorChave.useMutation({
    onSuccess: () => { refetch(); refetchOpcoes(); },
    onError: (e) => toast.error(`Falha ao classificar: ${e.message}`),
  });

  const importMutation = trpc.sicoob.importLancamentosFuturos.useMutation({
    onSuccess: (res) => {
      if (res.error) toast.error(`Erro: ${res.error}`);
      else toast.success(`${res.inserted} lançamento(s) importado(s)`);
      refetch();
      utils.sicoob.fluxoCaixaDiario.invalidate();
      utils.sicoob.listLancamentosFuturos.invalidate();
    },
    onError: (e) => toast.error(`Falha: ${e.message}`),
  });

  const deleteMutation = trpc.sicoob.deleteLancamentosFuturos.useMutation({
    onSuccess: () => {
      toast.success("Lançamentos futuros removidos");
      refetch();
      utils.sicoob.fluxoCaixaDiario.invalidate();
      utils.sicoob.listLancamentosFuturos.invalidate();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buf = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(buf, { type: "array", cellDates: false });
        const sheetName =
          wb.SheetNames.find(n => n.toUpperCase().includes("FUTURO")) ??
          wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        let headerIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i].map((c: any) => String(c).toUpperCase().trim());
          if (row.some(c => c === "DATA" || c.includes("DATA") || c.includes("DT "))) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx < 0) headerIdx = 0;

        const headers = rows[headerIdx].map((h: any) => String(h).toUpperCase().trim());
        const colIdx = (names: string[]) => {
          for (const n of names) {
            const i = headers.findIndex(h => h.includes(n));
            if (i >= 0) return i;
          }
          return -1;
        };

        const iData = colIdx(["DATA", "DT ", "DATE"]);
        const iDoc  = colIdx(["DOCUMENTO", "DOC", "NR DOC"]);
        const iHist = colIdx(["HISTÓRICO", "HISTORICO", "DESCRI"]);
        const iInfo = colIdx(["INFORMAÇÃO", "INFORMACAO", "INFO", "COMPLEMENTAR"]);
        const iVal  = colIdx(["VALOR", "VALUE", "VLR"]);

        if (iData < 0 || iVal < 0) {
          toast.error("Colunas DATA e VALOR não encontradas na planilha");
          return;
        }

        const lancamentos: any[] = [];
        const mesStr = String(mes).padStart(2, "0");
        const prefixo = `${ano}-${mesStr}`;

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const dataStr = parseExcelDate(row[iData]);
          if (!dataStr) continue;
          if (!dataStr.startsWith(prefixo)) continue;
          const valor = parseExcelValor(row[iVal]);
          if (valor === null) continue;

          lancamentos.push({
            data: dataStr,
            documento: iDoc >= 0 && row[iDoc] ? String(row[iDoc]).trim() : null,
            historico: iHist >= 0 && row[iHist] ? String(row[iHist]).trim().slice(0, 255) : null,
            infoComplementar: iInfo >= 0 && row[iInfo] ? String(row[iInfo]).trim().slice(0, 500) : null,
            valor,
          });
        }

        if (lancamentos.length === 0) {
          toast.error(`Nenhum lançamento encontrado para ${MESES[mes - 1]}/${ano}`);
          return;
        }

        importMutation.mutate({ lancamentos, substituirMes: prefixo });
      } catch (err: any) {
        toast.error(`Erro ao ler planilha: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const todosLancamentos: any[] = data?.lancamentos ?? [];

  // Se um lançamento é classificado enquanto o filtro "Sem grupo/centro de custo/natureza" está
  // ativo, ele deixaria de bater no filtro e sumiria da lista no meio da classificação. Pra evitar
  // isso, "fixa" o conjunto de ids que batem no filtro no momento em que o filtro é definido — só
  // recalcula quando o próprio filtro muda, não a cada edição.
  const [idsFixados, setIdsFixados] = useState<Set<string> | null>(null);
  useEffect(() => {
    const semFiltroClassificacao = filtroGrupo === "todos" && filtroCentroCusto === "todos" && filtroNatureza === "todos";
    if (semFiltroClassificacao) { setIdsFixados(null); return; }
    const bate = (l: any) => {
      if (filtroGrupo === "sem_grupo" ? !!l.grupo : filtroGrupo !== "todos" && l.grupo !== filtroGrupo) return false;
      if (filtroCentroCusto === "sem_centro_custo" ? !!l.centroCusto : filtroCentroCusto !== "todos" && l.centroCusto !== filtroCentroCusto) return false;
      if (filtroNatureza === "sem_natureza" ? !!l.natureza : filtroNatureza !== "todos" && l.natureza !== filtroNatureza) return false;
      return true;
    };
    setIdsFixados(new Set(todosLancamentos.filter(bate).map(l => `${l.origem}-${l.id}`)));
    // Deliberadamente sem todosLancamentos nas deps — só recalcula quando o filtro muda, não
    // quando os dados mudam (é exatamente isso que mantém os itens já classificados visíveis).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroGrupo, filtroCentroCusto, filtroNatureza]);

  const lancamentos = useMemo(() => {
    let rows = idsFixados ? todosLancamentos.filter(l => idsFixados.has(`${l.origem}-${l.id}`)) : todosLancamentos;

    rows = [...rows].sort((a, b) => {
      let va: any = a[sortCol] ?? "";
      let vb: any = b[sortCol] ?? "";
      if (sortCol === "valor") { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [todosLancamentos, idsFixados, sortCol, sortDir]);

  const resumo = data?.resumo ?? { vencidos: 0, vencemHoje: 0, aVencer: 0, pagos: 0, total: 0 };
  const hasFuturos = todosLancamentos.some(l => l.origem === "futuro");

  const cards = [
    { label: "Vencidos (R$)",        value: resumo.vencidos,   color: "text-red-600" },
    { label: "Vencem hoje (R$)",      value: resumo.vencemHoje, color: "text-orange-500" },
    { label: "A vencer (R$)",         value: resumo.aVencer,    color: "text-blue-600" },
    { label: "Pagos (R$)",            value: resumo.pagos,      color: "text-emerald-600" },
    { label: "Total do período (R$)", value: resumo.total,      color: "text-foreground", highlight: true },
  ];

  const handleExportExcel = async () => {
    if (lancamentos.length === 0) { toast.error("Nenhum lançamento para exportar"); return; }
    await exportStyledExcel({
      title: "BTREE AMBIENTAL — CONTAS A PAGAR",
      subtitle: `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Período: ${MESES[mes - 1]}/${ano}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
      sheetName: "Contas a Pagar",
      columns: [
        { header: "Vencimento", width: 14 },
        { header: "Pagamento", width: 14 },
        { header: "Descrição", width: 32 },
        { header: "Nº Documento", width: 16 },
        { header: "Valor (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
        { header: "Situação", width: 14 },
      ],
      rows: lancamentos.map((l: any) => [
        fmtData(l.dataVencimento),
        fmtData(l.dataPagamento),
        l.descricao ?? "-",
        l.numeroDocumento ?? "-",
        parseFloat(l.valor ?? "0"),
        (SITUACAO_LABEL[l.situacao] ?? SITUACAO_LABEL.a_vencer).label,
      ]),
      totalsRow: ["TOTAL", "", `${lancamentos.length} lançamento(s)`, "", resumo.total, ""],
      filename: `contas-a-pagar-${ano}-${String(mes).padStart(2, "0")}.xlsx`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Contas a pagar</h1>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="favorecidos">Favorecidos (memória)</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-5">
      <div className="flex items-center justify-end flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar planilha futura"}
          </Button>
          {hasFuturos && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => deleteMutation.mutate({ mes, ano })}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remover projeção
            </Button>
          )}
      </div>

      {/* Navegação de mês + pesquisa */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[130px] text-center">{MESES[mes - 1]} de {ano}</span>
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar descrição..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Grupo:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[160px]"
            value={filtroGrupo}
            onChange={e => { setFiltroGrupo(e.target.value); setFiltroCentroCusto("todos"); setFiltroNatureza("todos"); }}
          >
            <option value="todos">Todos</option>
            <option value="sem_grupo">Sem grupo</option>
            {opcoesFiltro(combos, "grupo", {}).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Centro de Custo:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
            value={filtroCentroCusto}
            onChange={e => { setFiltroCentroCusto(e.target.value); setFiltroNatureza("todos"); }}
          >
            <option value="todos">Todos</option>
            <option value="sem_centro_custo">Sem centro de custo</option>
            {opcoesFiltro(combos, "centro_custo", { grupo: filtroGrupo }).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Natureza:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
            value={filtroNatureza}
            onChange={e => setFiltroNatureza(e.target.value)}
          >
            <option value="todos">Todas</option>
            <option value="sem_natureza">Sem natureza</option>
            {opcoesFiltro(combos, "natureza", { grupo: filtroGrupo, centro_custo: filtroCentroCusto }).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg border bg-card p-4 ${(c as any).highlight ? "border-primary/40 bg-primary/5" : ""}`}>
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
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("dataVencimento")}>
                Vencimento <SortIcon col="dataVencimento" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-24 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("dataPagamento")}>
                Pagamento <SortIcon col="dataPagamento" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-56 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("descricao")}>
                Descrição <SortIcon col="descricao" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-24 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("numeroDocumento")}>
                Nº Documento <SortIcon col="numeroDocumento" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-28">Grupo</TableHead>
              <TableHead className="w-32">Centro de Custo</TableHead>
              <TableHead className="w-32">Natureza</TableHead>
              <TableHead className="text-right w-28 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("valor")}>
                Valor (R$) <SortIcon col="valor" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-24 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("situacao")}>
                Situação <SortIcon col="situacao" sortCol={sortCol} sortDir={sortDir} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && lancamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {todosLancamentos.length === 0
                    ? `Nenhum débito para ${MESES[mes - 1]}/${ano} — sincronize o Extrato ou importe uma planilha`
                    : "Nenhum lançamento no filtro selecionado"}
                </TableCell>
              </TableRow>
            )}
            {lancamentos.map((l: any) => {
              const sit = SITUACAO_LABEL[l.situacao] ?? SITUACAO_LABEL.a_vencer;
              return (
                <TableRow key={`${l.origem}-${l.id}`} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{fmtData(l.dataVencimento)}</TableCell>
                  <TableCell className="text-sm">{fmtData(l.dataPagamento)}</TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="font-medium text-sm truncate" title={l.descricao ?? ""}>{l.descricao ?? "—"}</div>
                    {l.complemento && <div className="text-xs text-muted-foreground truncate" title={l.complemento}>{l.complemento}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs truncate">{l.numeroDocumento ?? "—"}</TableCell>
                  <TableCell>
                    {l.favorecidoChave ? (
                      <EditableSelectCell
                        value={l.grupo}
                        options={opcoesCascata(combos, "grupo", {})}
                        onSave={v => upsertClassificacaoMutation.mutate({ chave: l.favorecidoChave, tipoChave: l.favorecidoTipo, campo: "grupo", valor: v })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground truncate">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.favorecidoChave ? (
                      <EditableSelectCell
                        value={l.centroCusto}
                        options={opcoesCascata(combos, "centro_custo", { grupo: l.grupo })}
                        onSave={v => upsertClassificacaoMutation.mutate({ chave: l.favorecidoChave, tipoChave: l.favorecidoTipo, campo: "centro_custo", valor: v })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground truncate">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.favorecidoChave ? (
                      <EditableSelectCell
                        value={l.natureza}
                        options={opcoesCascata(combos, "natureza", { grupo: l.grupo, centro_custo: l.centroCusto })}
                        onSave={v => upsertClassificacaoMutation.mutate({ chave: l.favorecidoChave, tipoChave: l.favorecidoTipo, campo: "natureza", valor: v })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground truncate">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">{fmtMoeda(l.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={sit.variant} className="text-xs">{sit.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {lancamentos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {lancamentos.length} registro(s) • Débitos do extrato Sicoob + lançamentos futuros importados
        </p>
      )}
        </TabsContent>

        <TabsContent value="favorecidos">
          <FavorecidosCategoriaTab />
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardContasAPagarTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TIPO_CHAVE_LABEL: Record<string, string> = {
  cnpj: "CNPJ",
  nome: "Nome",
  cpf_fragmento: "CPF (parcial)",
};

// Célula de seleção editável: mostra um dropdown com as opções já usadas nesse campo (em
// qualquer favorecido), mais "+ Adicionar novo..." para cadastrar uma opção na hora — que passa
// a aparecer na lista pra todo mundo assim que salva o primeiro favorecido com ela.
const NOVA_OPCAO = "__nova_opcao__";

function EditableSelectCell({ value, options, onSave }: { value: string | null; options: string[]; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [novoValor, setNovoValor] = useState("");

  if (editing && addingNew) {
    return (
      <Input
        autoFocus
        className="h-7 text-xs"
        placeholder="Nova opção..."
        value={novoValor}
        onChange={e => setNovoValor(e.target.value)}
        onBlur={() => {
          if (novoValor.trim()) onSave(novoValor.trim());
          setAddingNew(false); setEditing(false); setNovoValor("");
        }}
        onKeyDown={e => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setAddingNew(false); setEditing(false); }
        }}
      />
    );
  }
  if (editing) {
    return (
      <select
        autoFocus
        className="h-7 text-xs w-full bg-background border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
        value={value ?? ""}
        onChange={e => {
          if (e.target.value === NOVA_OPCAO) { setAddingNew(true); return; }
          onSave(e.target.value || null);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      >
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value={NOVA_OPCAO}>+ Adicionar novo...</option>
      </select>
    );
  }
  return (
    <button
      type="button"
      className="text-left w-full text-xs truncate hover:underline"
      title="Clique para editar"
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-muted-foreground">—</span>}
    </button>
  );
}

// Ordem da hierarquia de classificação: cada campo só oferece as opções que já apareceram,
// nos favorecidos já classificados, combinadas com o que está selecionado nos campos anteriores.
const ORDEM_CLASSIFICACAO = ["grupo", "centro_custo", "natureza", "classificacao", "fixo_variavel", "direto_indireto"] as const;

function opcoesCascata(combos: any[], campo: typeof ORDEM_CLASSIFICACAO[number], favorecido: any): string[] {
  const idx = ORDEM_CLASSIFICACAO.indexOf(campo);
  const anteriores = ORDEM_CLASSIFICACAO.slice(0, idx);
  const filtrados = combos.filter(c => anteriores.every(a => (c[a] ?? null) === (favorecido[a] ?? null)));
  const valores = new Set<string>();
  for (const c of filtrados) if (c[campo]) valores.add(c[campo]);
  return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Mesma cascata, mas pra filtro: "todos" (ainda não escolhido) não restringe nada, em vez de
// exigir que bata com null — diferente da edição, onde campo vazio significa "ainda não classificado".
function opcoesFiltro(combos: any[], campo: string, filtrosAnteriores: Record<string, string>): string[] {
  const filtrados = combos.filter(c =>
    Object.entries(filtrosAnteriores).every(([k, v]) => v === "todos" || c[k] === v)
  );
  const valores = new Set<string>();
  for (const c of filtrados) if (c[campo]) valores.add(c[campo]);
  return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function chaveExibicao(chave: string): string {
  const semPrefixo = chave.replace(/^(cnpj|nome|cpf):/, "");
  if (chave.startsWith("cnpj:")) {
    return semPrefixo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return semPrefixo;
}

function FavorecidosCategoriaTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, refetch } = trpc.sicoob.listFavorecidosCategoria.useQuery(
    undefined, { refetchOnWindowFocus: false }
  );

  const { data: opcoesData, refetch: refetchOpcoes } = trpc.sicoob.listClassificacaoOpcoes.useQuery(
    undefined, { refetchOnWindowFocus: false }
  );
  const combos: any[] = opcoesData?.combos ?? [];

  const updateNomeMutation = trpc.sicoob.updateFavorecidoNome.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(`Falha ao atualizar: ${e.message}`),
  });
  const [editandoNomeId, setEditandoNomeId] = useState<number | null>(null);
  const [editandoNomeValor, setEditandoNomeValor] = useState("");

  const updateClassificacaoMutation = trpc.sicoob.updateFavorecidoClassificacao.useMutation({
    onSuccess: () => { refetch(); refetchOpcoes(); },
    onError: (e) => toast.error(`Falha ao atualizar: ${e.message}`),
  });

  const deleteMutation = trpc.sicoob.deleteFavorecidoCategoria.useMutation({
    onSuccess: () => { toast.success("Favorecido removido da memória"); refetch(); },
    onError: (e) => toast.error(`Falha ao remover: ${e.message}`),
  });

  const importMutation = trpc.sicoob.importFavorecidosCategoriaPlanilha.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.importados} favorecido(s) importado(s)${res.ignorados ? ` (${res.ignorados} linha(s) sem CNPJ válido ignorada(s))` : ""}`);
      refetch();
      refetchOpcoes();
    },
    onError: (e) => toast.error(`Falha ao importar: ${e.message}`),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buf = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(buf, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows.length < 2) { toast.error("Planilha vazia"); return; }

        const headers = rows[0].map((h: any) => String(h).toUpperCase().trim());
        const colIdx = (names: string[]) => {
          for (const n of names) {
            const i = headers.findIndex(h => h.includes(n));
            if (i >= 0) return i;
          }
          return -1;
        };
        const iCnpj = colIdx(["CNPJ"]);
        const iRazao = colIdx(["RAZAO_SOCIAL", "RAZÃO_SOCIAL", "RAZAO SOCIAL", "RAZÃO SOCIAL"]);
        const iFantasia = colIdx(["NOME_FANTASIA", "NOME FANTASIA", "FANTASIA"]);
        const iCnaeCod = colIdx(["CNAE_F", "CNAE FISCAL", "CNAE_FISCAL"]);
        const iCnaeDesc = colIdx(["CNAE_FISCAL_DESCRICAO", "CNAE_FISCAL_DESCRIÇÃO", "DESCRICAO", "DESCRIÇÃO"]);
        const iGrupo = colIdx(["GRUPO"]);
        const iCentroCusto = colIdx(["CENTRO_DE_CUSTO", "CENTRO DE CUSTO", "CENTRO_CUSTO"]);
        const iNatureza = colIdx(["NATUREZA"]);
        const iClassificacao = colIdx(["CLASSIFICACAO", "CLASSIFICAÇÃO"]);
        const iFixoVariavel = colIdx(["FIXO/VARIAVEL", "FIXO/VARIÁVEL", "FIXO_VARIAVEL"]);
        const iDiretoIndireto = colIdx(["DIRETO/INDIRETO", "DIRETO_INDIRETO"]);

        if (iCnpj < 0) { toast.error("Coluna CNPJ não encontrada na planilha"); return; }

        // Coluna ausente -> undefined (não mexe no que já existe ao importar);
        // coluna presente mas célula vazia -> null (limpa o campo).
        const cellOrUndefined = (row: any[], idx: number) => idx >= 0 ? (String(row[idx] ?? "").trim() || null) : undefined;

        const linhas: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cnpj = String(row[iCnpj] ?? "").trim();
          if (!cnpj) continue;
          linhas.push({
            cnpj,
            razaoSocial: iRazao >= 0 ? String(row[iRazao] ?? "").trim() || null : null,
            nomeFantasia: iFantasia >= 0 ? String(row[iFantasia] ?? "").trim() || null : null,
            cnaeCodigo: iCnaeCod >= 0 ? String(row[iCnaeCod] ?? "").trim() || null : null,
            cnaeDescricao: iCnaeDesc >= 0 ? String(row[iCnaeDesc] ?? "").trim() || null : null,
            grupo: cellOrUndefined(row, iGrupo),
            centroCusto: cellOrUndefined(row, iCentroCusto),
            natureza: cellOrUndefined(row, iNatureza),
            classificacao: cellOrUndefined(row, iClassificacao),
            fixoVariavel: cellOrUndefined(row, iFixoVariavel),
            diretoIndireto: cellOrUndefined(row, iDiretoIndireto),
          });
        }

        if (linhas.length === 0) { toast.error("Nenhuma linha com CNPJ encontrada"); return; }
        importMutation.mutate({ linhas });
      } catch (err: any) {
        toast.error(`Erro ao ler planilha: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const todosFavorecidos: any[] = data?.favorecidos ?? [];
  const [pesquisaFavorecido, setPesquisaFavorecido] = useState("");
  const [filtroTipoFavorecido, setFiltroTipoFavorecido] = useState("todos");
  const [filtroGrupoFavorecido, setFiltroGrupoFavorecido] = useState("todos");
  const [filtroCentroCustoFavorecido, setFiltroCentroCustoFavorecido] = useState("todos");
  const [filtroNaturezaFavorecido, setFiltroNaturezaFavorecido] = useState("todos");

  // Mesmo motivo do que na aba Lançamentos: classificar um favorecido que está no filtro
  // "Sem grupo/centro de custo/natureza" faria ele sumir da lista no meio da classificação —
  // "fixa" o conjunto de ids que batem no filtro no momento em que o filtro é definido.
  const [idsFixadosFavorecido, setIdsFixadosFavorecido] = useState<Set<number> | null>(null);
  useEffect(() => {
    const semFiltroClassificacao = filtroGrupoFavorecido === "todos" && filtroCentroCustoFavorecido === "todos" && filtroNaturezaFavorecido === "todos";
    if (semFiltroClassificacao) { setIdsFixadosFavorecido(null); return; }
    const bate = (f: any) => {
      if (filtroGrupoFavorecido === "sem_grupo" ? !!f.grupo : filtroGrupoFavorecido !== "todos" && f.grupo !== filtroGrupoFavorecido) return false;
      if (filtroCentroCustoFavorecido === "sem_centro_custo" ? !!f.centro_custo : filtroCentroCustoFavorecido !== "todos" && f.centro_custo !== filtroCentroCustoFavorecido) return false;
      if (filtroNaturezaFavorecido === "sem_natureza" ? !!f.natureza : filtroNaturezaFavorecido !== "todos" && f.natureza !== filtroNaturezaFavorecido) return false;
      return true;
    };
    setIdsFixadosFavorecido(new Set(todosFavorecidos.filter(bate).map(f => f.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroGrupoFavorecido, filtroCentroCustoFavorecido, filtroNaturezaFavorecido]);

  const favorecidos = useMemo(() => {
    let rows = idsFixadosFavorecido ? todosFavorecidos.filter(f => idsFixadosFavorecido.has(f.id)) : todosFavorecidos;
    if (filtroTipoFavorecido !== "todos") rows = rows.filter(f => f.tipo_chave === filtroTipoFavorecido);
    if (pesquisaFavorecido.trim()) {
      const termo = pesquisaFavorecido.trim().toLowerCase();
      // Dígitos do termo pesquisado, para comparar CNPJ/CPF ignorando pontuação (o usuário pode
      // digitar com ponto, barra, traço ou espaço — igual aparece no extrato bancário).
      const termoDigitos = termo.replace(/\D/g, "");
      rows = rows.filter(f => {
        const chaveDigitos = f.chave.replace(/\D/g, "");
        return (
          (f.razao_social ?? "").toLowerCase().includes(termo) ||
          chaveExibicao(f.chave).toLowerCase().includes(termo) ||
          (f.cnae_descricao ?? "").toLowerCase().includes(termo) ||
          (termoDigitos.length > 0 && chaveDigitos.includes(termoDigitos))
        );
      });
    }
    return rows;
  }, [todosFavorecidos, idsFixadosFavorecido, filtroTipoFavorecido, pesquisaFavorecido]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Cada favorecido identificado (por CNPJ, nome ou CPF parcial) fica gravado aqui, com a classificação
          contábil/gerencial (Grupo, Centro de Custo, Natureza, etc) aplicada automaticamente a todos os lançamentos
          futuros do mesmo favorecido.
        </p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
          <Upload className="h-4 w-4 mr-2" />
          {importMutation.isPending ? "Importando..." : "Importar planilha"}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nome, CNPJ/CPF, CNAE..."
            value={pesquisaFavorecido}
            onChange={e => setPesquisaFavorecido(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            value={filtroTipoFavorecido}
            onChange={e => setFiltroTipoFavorecido(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="cnpj">CNPJ</option>
            <option value="nome">Nome</option>
            <option value="cpf_fragmento">CPF (parcial)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Grupo:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[160px]"
            value={filtroGrupoFavorecido}
            onChange={e => { setFiltroGrupoFavorecido(e.target.value); setFiltroCentroCustoFavorecido("todos"); setFiltroNaturezaFavorecido("todos"); }}
          >
            <option value="todos">Todos</option>
            <option value="sem_grupo">Sem grupo</option>
            {opcoesFiltro(combos, "grupo", {}).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Centro de Custo:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
            value={filtroCentroCustoFavorecido}
            onChange={e => { setFiltroCentroCustoFavorecido(e.target.value); setFiltroNaturezaFavorecido("todos"); }}
          >
            <option value="todos">Todos</option>
            <option value="sem_centro_custo">Sem centro de custo</option>
            {opcoesFiltro(combos, "centro_custo", { grupo: filtroGrupoFavorecido }).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Natureza:</span>
          <select
            className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
            value={filtroNaturezaFavorecido}
            onChange={e => setFiltroNaturezaFavorecido(e.target.value)}
          >
            <option value="todos">Todas</option>
            <option value="sem_natureza">Sem natureza</option>
            {opcoesFiltro(combos, "natureza", { grupo: filtroGrupoFavorecido, centro_custo: filtroCentroCustoFavorecido }).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-48">Favorecido</TableHead>
              <TableHead className="w-40">PIX (CPF/CNPJ)</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead className="w-48">CNAE</TableHead>
              <TableHead className="w-28">Grupo</TableHead>
              <TableHead className="w-36">Centro de Custo</TableHead>
              <TableHead className="w-36">Natureza</TableHead>
              <TableHead className="w-36">Classificação</TableHead>
              <TableHead className="w-28">Fixo/Variável</TableHead>
              <TableHead className="w-28">Direto/Indireto</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && favorecidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {todosFavorecidos.length === 0
                    ? "Nenhum favorecido identificado ainda — vai sendo preenchido conforme o extrato é sincronizado."
                    : "Nenhum favorecido no filtro selecionado"}
                </TableCell>
              </TableRow>
            )}
            {favorecidos.map((f: any) => (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="overflow-hidden">
                  {editandoNomeId === f.id ? (
                    <Input
                      autoFocus
                      className="h-7 text-sm"
                      value={editandoNomeValor}
                      onChange={e => setEditandoNomeValor(e.target.value)}
                      onBlur={() => {
                        if (editandoNomeValor.trim()) {
                          updateNomeMutation.mutate({ id: f.id, razaoSocial: editandoNomeValor.trim() });
                        }
                        setEditandoNomeId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditandoNomeId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left w-full hover:underline"
                      title="Clique para editar"
                      onClick={() => {
                        setEditandoNomeId(f.id);
                        setEditandoNomeValor(f.razao_social || chaveExibicao(f.chave));
                      }}
                    >
                      <div className="font-medium text-sm truncate">{f.razao_social || chaveExibicao(f.chave)}</div>
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate" title={f.tipo_chave === "nome" ? "" : chaveExibicao(f.chave)}>
                  {f.tipo_chave === "nome" ? "—" : chaveExibicao(f.chave)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{TIPO_CHAVE_LABEL[f.tipo_chave] ?? f.tipo_chave}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate" title={f.cnae_descricao ?? ""}>
                  {f.cnae_descricao ?? "—"}
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.grupo} options={opcoesCascata(combos, "grupo", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "grupo", valor: v })} />
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.centro_custo} options={opcoesCascata(combos, "centro_custo", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "centro_custo", valor: v })} />
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.natureza} options={opcoesCascata(combos, "natureza", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "natureza", valor: v })} />
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.classificacao} options={opcoesCascata(combos, "classificacao", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "classificacao", valor: v })} />
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.fixo_variavel} options={opcoesCascata(combos, "fixo_variavel", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "fixo_variavel", valor: v })} />
                </TableCell>
                <TableCell>
                  <EditableSelectCell value={f.direto_indireto} options={opcoesCascata(combos, "direto_indireto", f)} onSave={v => updateClassificacaoMutation.mutate({ id: f.id, campo: "direto_indireto", valor: v })} />
                </TableCell>
                <TableCell>
                  <button
                    className="text-muted-foreground hover:text-red-600"
                    title="Remover da memória"
                    onClick={() => {
                      if (window.confirm(`Remover "${f.razao_social || chaveExibicao(f.chave)}" da memória? A classificação não será mais aplicada automaticamente para esse favorecido.`)) {
                        deleteMutation.mutate({ id: f.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {favorecidos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {favorecidos.length} favorecido(s){favorecidos.length !== todosFavorecidos.length ? ` de ${todosFavorecidos.length} no total` : " na memória"}
        </p>
      )}
    </div>
  );
}

// ===== DASHBOARD =====

const CORES_BARRAS = ["#059669", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#db2777"];

function ordenarPorTotalDesc(mapa: Map<string, number>): { chave: string; total: number }[] {
  return Array.from(mapa.entries())
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => b.total - a.total);
}

function DashboardTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border bg-card shadow-md p-2.5 text-xs">
      <p className="font-medium mb-0.5">{p.payload.chave}</p>
      <p className="text-muted-foreground">{fmtMoeda(p.value)}</p>
    </div>
  );
}

// Gráfico de barras horizontais, ranqueado do maior pro menor — clicável pra filtrar.
function GraficoRanking({ dados, selecionado, onSelecionar, altura }: {
  dados: { chave: string; total: number }[];
  selecionado: string | null;
  onSelecionar: (chave: string) => void;
  altura?: number;
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Sem lançamentos classificados nesse recorte</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={altura ?? Math.max(120, dados.length * 32)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => fmtMoeda(v)} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="chave" width={150} tick={{ fontSize: 11 }} />
        <Tooltip content={<DashboardTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => onSelecionar(d.chave)}>
          {dados.map((d, i) => (
            <Cell
              key={d.chave}
              fill={CORES_BARRAS[i % CORES_BARRAS.length]}
              opacity={!selecionado || selecionado === d.chave ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardContasAPagarTab() {
  const hoje = new Date();
  // Padrão: últimos 6 meses até o mês atual.
  const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const [mesInicio, setMesInicio] = useState(inicioPadrao.getMonth() + 1);
  const [anoInicio, setAnoInicio] = useState(inicioPadrao.getFullYear());
  const [mesFim, setMesFim] = useState(hoje.getMonth() + 1);
  const [anoFim, setAnoFim] = useState(hoje.getFullYear());

  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<string | null>(null);

  const { data, isLoading } = trpc.sicoob.dashboardContasAPagar.useQuery(
    { anoInicio, mesInicio, anoFim, mesFim },
    { refetchOnWindowFocus: false }
  );
  const lancamentos: any[] = data?.lancamentos ?? [];

  const SEM_GRUPO = "Sem grupo";
  const SEM_CC = "Sem centro de custo";
  const SEM_NATUREZA = "Sem natureza";

  const totalGeral = useMemo(() => lancamentos.reduce((s, l) => s + l.valor, 0), [lancamentos]);
  const semClassificacao = useMemo(() => lancamentos.filter(l => !l.grupo).reduce((s, l) => s + l.valor, 0), [lancamentos]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of lancamentos) {
      const chave = l.grupo || SEM_GRUPO;
      mapa.set(chave, (mapa.get(chave) ?? 0) + l.valor);
    }
    return ordenarPorTotalDesc(mapa);
  }, [lancamentos]);

  const porCentroCusto = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of lancamentos) {
      if (grupoSelecionado && (l.grupo || SEM_GRUPO) !== grupoSelecionado) continue;
      const chave = l.centroCusto || SEM_CC;
      mapa.set(chave, (mapa.get(chave) ?? 0) + l.valor);
    }
    return ordenarPorTotalDesc(mapa);
  }, [lancamentos, grupoSelecionado]);

  const porNatureza = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of lancamentos) {
      if (grupoSelecionado && (l.grupo || SEM_GRUPO) !== grupoSelecionado) continue;
      if (centroCustoSelecionado && (l.centroCusto || SEM_CC) !== centroCustoSelecionado) continue;
      const chave = l.natureza || SEM_NATUREZA;
      mapa.set(chave, (mapa.get(chave) ?? 0) + l.valor);
    }
    return ordenarPorTotalDesc(mapa);
  }, [lancamentos, grupoSelecionado, centroCustoSelecionado]);

  const evolucaoMensal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of lancamentos) {
      if (grupoSelecionado && (l.grupo || SEM_GRUPO) !== grupoSelecionado) continue;
      if (centroCustoSelecionado && (l.centroCusto || SEM_CC) !== centroCustoSelecionado) continue;
      const mesAno = String(l.data).slice(0, 7);
      mapa.set(mesAno, (mapa.get(mesAno) ?? 0) + l.valor);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mesAno, total]) => {
        const [a, m] = mesAno.split("-");
        return { mesAno, label: `${MESES[parseInt(m) - 1].slice(0, 3)}/${a.slice(2)}`, total };
      });
  }, [lancamentos, grupoSelecionado, centroCustoSelecionado]);

  const totalFiltrado = grupoSelecionado || centroCustoSelecionado
    ? porNatureza.reduce((s, n) => s + n.total, 0)
    : totalGeral;

  const anoOptions = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 4 + i);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Débitos já realizados no período (extrato Sicoob), por classificação — clique numa barra pra
          filtrar as demais e enxergar onde está concentrado o custo.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">De</span>
          <select className="h-8 text-xs bg-background border rounded px-1.5" value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-8 text-xs bg-background border rounded px-1.5" value={anoInicio} onChange={e => setAnoInicio(Number(e.target.value))}>
            {anoOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">até</span>
          <select className="h-8 text-xs bg-background border rounded px-1.5" value={mesFim} onChange={e => setMesFim(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-8 text-xs bg-background border rounded px-1.5" value={anoFim} onChange={e => setAnoFim(Number(e.target.value))}>
            {anoOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {(grupoSelecionado || centroCustoSelecionado) && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Filtro:</span>
          {grupoSelecionado && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setGrupoSelecionado(null); setCentroCustoSelecionado(null); }}>
              {grupoSelecionado} ✕
            </Badge>
          )}
          {centroCustoSelecionado && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCentroCustoSelecionado(null)}>
              {centroCustoSelecionado} ✕
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total do período</p>
          <p className="text-lg font-bold">{fmtMoeda(totalGeral)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total no filtro atual</p>
          <p className="text-lg font-bold text-emerald-600">{fmtMoeda(totalFiltrado)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Lançamentos</p>
          <p className="text-lg font-bold">{lancamentos.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Sem classificação</p>
          <p className="text-lg font-bold text-amber-600">{fmtMoeda(semClassificacao)}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">Total por Grupo</p>
            <GraficoRanking dados={porGrupo} selecionado={grupoSelecionado} onSelecionar={v => { setGrupoSelecionado(v === grupoSelecionado ? null : v); setCentroCustoSelecionado(null); }} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">
              Total por Centro de Custo {grupoSelecionado && <span className="text-muted-foreground font-normal">— {grupoSelecionado}</span>}
            </p>
            <GraficoRanking dados={porCentroCusto} selecionado={centroCustoSelecionado} onSelecionar={v => setCentroCustoSelecionado(v === centroCustoSelecionado ? null : v)} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">
              Total por Natureza {(grupoSelecionado || centroCustoSelecionado) && <span className="text-muted-foreground font-normal">(no filtro atual)</span>}
            </p>
            <GraficoRanking dados={porNatureza} selecionado={null} onSelecionar={() => {}} altura={Math.max(180, Math.min(porNatureza.length, 10) * 32)} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">
              Evolução mensal {(grupoSelecionado || centroCustoSelecionado) && <span className="text-muted-foreground font-normal">(no filtro atual)</span>}
            </p>
            {evolucaoMensal.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados nesse recorte</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolucaoMensal} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmtMoeda(v)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => fmtMoeda(v)} labelFormatter={(l) => l} />
                  <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
