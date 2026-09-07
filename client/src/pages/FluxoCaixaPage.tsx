import { useState, useRef, Fragment } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Upload, Trash2, ChevronDown, ChevronUp, FileText, Receipt, Users, Truck, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { exportStyledExcel } from "@/lib/exportExcel";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtMoeda(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM"); } catch { return d; }
}

function fmtDataFull(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return d; }
}

function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card shadow-md p-3 text-sm space-y-1 min-w-[180px]">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmtMoeda(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Converte data serial do Excel ou string para "YYYY-MM-DD"
function parseExcelDate(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // data serial do Excel
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(raw).trim();
  // "22/09/2026" → "2026-09-22"
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  // já no formato ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseExcelValor(raw: any): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (isNaN(n)) return null;
  return String(n);
}

export default function FluxoCaixaPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<"mensal" | "anual">("mensal");
  // Projeção = só pendências (boletos, NFs, cargas sem boleto/NF, Folha em aberto) e
  // lançamentos futuros importados. Real = só o que já aconteceu de fato (extrato Sicoob).
  const [modo, setModo] = useState<"projecao" | "real">("projecao");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const navMes = (delta: number) => {
    let m = mes + delta, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  const { data, isLoading } = trpc.sicoob.fluxoCaixaDiario.useQuery(
    { mes, ano, modo },
    { refetchOnWindowFocus: false, enabled: viewMode === "mensal" }
  );

  const { data: dataAnual, isLoading: isLoadingAnual } = trpc.sicoob.fluxoCaixaAnual.useQuery(
    { ano, modo },
    { refetchOnWindowFocus: false, enabled: viewMode === "anual" }
  );

  const importMutation = trpc.sicoob.importLancamentosFuturos.useMutation({
    onSuccess: (res) => {
      if (res.error) toast.error(`Erro: ${res.error}`);
      else toast.success(`${res.inserted} lançamento(s) importado(s)`);
      utils.sicoob.fluxoCaixaDiario.invalidate();
      utils.sicoob.listLancamentosFuturos.invalidate();
    },
    onError: (e) => toast.error(`Falha: ${e.message}`),
  });

  const deleteMutation = trpc.sicoob.deleteLancamentosFuturos.useMutation({
    onSuccess: () => {
      toast.success("Lançamentos futuros removidos");
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
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        // Prefere a aba "LANÇAMENTOS FUTUROS"; cai na primeira se não achar
        const sheetName =
          wb.SheetNames.find(n => n.toUpperCase().includes("FUTURO")) ??
          wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        // Detectar linha de cabeçalho (procura por "DATA" ou "Dt Transação")
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
          // Só importa do mês selecionado
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

        importMutation.mutate({
          lancamentos,
          substituirMes: prefixo,
        });
      } catch (err: any) {
        toast.error(`Erro ao ler planilha: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const isAnual = viewMode === "anual";

  const dias: any[] = data?.dias ?? [];
  const saldoInicial = data?.saldoInicial ?? 0;
  const pendenciasPorDia: Record<string, { tipo: "boleto" | "nf" | "carga" | "folha"; cliente: string; referencia: string; valor: number }[]> =
    data?.pendenciasPorDia ?? {};

  const totalRec = dias.reduce((s, d) => s + d.recebimentos, 0);
  const totalPag = dias.reduce((s, d) => s + d.pagamentos, 0);
  const saldoFinal = dias.length > 0 ? dias[dias.length - 1].saldoAcumulado : saldoInicial;

  const chartDataMensal = dias.map(d => ({
    data: fmtData(d.data),
    Recebimentos: d.recebimentos,
    Pagamentos: d.pagamentos,
    Saldo: d.saldoAcumulado,
  }));

  // Visão anual: 12 meses, reaproveitando o mesmo formato de cards/gráfico/exportação
  const meses: { mes: number; recebimentos: number; pagamentos: number; saldoAcumulado: number }[] = dataAnual?.meses ?? [];
  const saldoInicialAno = dataAnual?.saldoInicialAno ?? 0;
  const totalRecAno = meses.reduce((s, m) => s + m.recebimentos, 0);
  const totalPagAno = meses.reduce((s, m) => s + m.pagamentos, 0);
  const saldoFinalAno = meses.length > 0 ? meses[meses.length - 1].saldoAcumulado : saldoInicialAno;
  const chartDataAnual = meses.map(m => ({
    data: MESES[m.mes - 1].slice(0, 3),
    Recebimentos: m.recebimentos,
    Pagamentos: m.pagamentos,
    Saldo: m.saldoAcumulado,
  }));

  const chartData = isAnual ? chartDataAnual : chartDataMensal;

  const cards = isAnual
    ? [
        { label: "Saldo inicial do ano", value: saldoInicialAno, color: saldoInicialAno >= 0 ? "text-blue-600" : "text-red-600" },
        { label: "Total Recebimentos",   value: totalRecAno, color: "text-emerald-600" },
        { label: "Total Pagamentos",     value: totalPagAno, color: "text-red-600" },
        { label: "Saldo final",          value: saldoFinalAno, color: saldoFinalAno >= 0 ? "text-blue-600" : "text-red-600", highlight: true },
      ]
    : [
        { label: "Saldo inicial do mês", value: saldoInicial, color: saldoInicial >= 0 ? "text-blue-600" : "text-red-600" },
        { label: "Total Recebimentos",   value: totalRec, color: "text-emerald-600" },
        { label: "Total Pagamentos",     value: totalPag, color: "text-red-600" },
        { label: "Saldo final",          value: saldoFinal, color: saldoFinal >= 0 ? "text-blue-600" : "text-red-600", highlight: true },
      ];

  const handleExportExcel = async () => {
    if (isAnual) {
      if (meses.length === 0) { toast.error("Nenhum dado para exportar"); return; }
      await exportStyledExcel({
        title: `BTREE AMBIENTAL — FLUXO DE CAIXA (ANUAL, ${modo === "real" ? "REAL" : "PROJEÇÃO"})`,
        subtitle: `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Período: ${ano}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
        sheetName: "Fluxo de Caixa Anual",
        columns: [
          { header: "Mês", width: 14 },
          { header: "Recebimentos (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
          { header: "Pagamentos (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
          { header: "Saldo do Mês (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
          { header: "Saldo Acumulado (R$)", width: 20, align: "right", numFmt: "#,##0.00" },
        ],
        rows: meses.map(m => [
          `${MESES[m.mes - 1]}/${ano}`,
          m.recebimentos,
          m.pagamentos,
          m.recebimentos - m.pagamentos,
          m.saldoAcumulado,
        ]),
        totalsRow: ["TOTAL", totalRecAno, totalPagAno, totalRecAno - totalPagAno, saldoFinalAno],
        filename: `fluxo-de-caixa-anual-${ano}.xlsx`,
      });
      return;
    }
    if (dias.length === 0) { toast.error("Nenhum dado para exportar"); return; }
    await exportStyledExcel({
      title: `BTREE AMBIENTAL — FLUXO DE CAIXA (${modo === "real" ? "REAL" : "PROJEÇÃO"})`,
      subtitle: `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Período: ${MESES[mes - 1]}/${ano}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
      sheetName: "Fluxo de Caixa",
      columns: [
        { header: "Data", width: 14 },
        { header: "Recebimentos (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "Pagamentos (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "Saldo do Dia (R$)", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "Saldo Acumulado (R$)", width: 20, align: "right", numFmt: "#,##0.00" },
      ],
      rows: dias.map(d => [
        fmtDataFull(d.data),
        d.recebimentos,
        d.pagamentos,
        d.recebimentos - d.pagamentos,
        d.saldoAcumulado,
      ]),
      totalsRow: ["TOTAL", totalRec, totalPag, totalRec - totalPag, saldoFinal],
      filename: `fluxo-de-caixa-${ano}-${String(mes).padStart(2, "0")}.xlsx`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          {!isAnual && modo === "projecao" && (
          <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar planilha futura"}
          </Button>
          {dias.length > 0 && (
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
          </>
          )}
        </div>
      </div>

      {/* Alternância Mensal/Anual + navegação */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-md p-1 w-fit">
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${!isAnual ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setViewMode("mensal")}
          >
            Ver por mês
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${isAnual ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setViewMode("anual")}
          >
            Ver por ano
          </button>
        </div>

        {isAnual ? (
          <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 w-fit">
            <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setAno(a => a - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[70px] text-center">{ano}</span>
            <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => setAno(a => a + 1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 w-fit">
            <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[130px] text-center">{MESES[mes - 1]} de {ano}</span>
            <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 bg-muted rounded-md p-1 w-fit">
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${modo === "projecao" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setModo("projecao")}
          >
            Projeção
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${modo === "real" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setModo("real")}
          >
            Real
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg border bg-card p-4 ${c.highlight ? "border-primary/40 bg-primary/5" : ""}`}>
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{fmtMoeda(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Explicação do modo ativo */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-block w-3 h-3 rounded-full ${modo === "real" ? "bg-blue-500" : "bg-amber-500"}`} />
        {modo === "real"
          ? "Real: só o que já aconteceu de fato, direto do extrato Sicoob."
          : "Projeção: o que já aconteceu no extrato Sicoob + o que ainda está em aberto — boletos, NFs (Conta Azul) e cargas entregues sem boleto/NF em aberto de Contas a Receber, Folha de Pagamento pendente, e lançamentos futuros importados da planilha do banco."}
      </div>

      {/* Aviso sem dados */}
      {!isAnual && !isLoading && dias.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
          Nenhum dado para {MESES[mes - 1]}/{ano}. {modo === "real"
            ? "Sincronize o Extrato do Sicoob."
            : "Importe uma planilha de lançamentos futuros, ou verifique se há boletos/NFs/Folha em aberto."}
        </div>
      )}
      {isAnual && !isLoadingAnual && meses.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
          Nenhum dado para {ano}.
        </div>
      )}

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<TooltipCustom />} />
              <Legend />
              <Bar dataKey="Recebimentos" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={32} />
              <Bar dataKey="Pagamentos" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={32} />
              <Line
                type="monotone" dataKey="Saldo" stroke="#3b82f6"
                strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela anual (resumo por mês) */}
      {isAnual && meses.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Recebimentos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pagamentos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo do mês</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(m => {
                  const saldoMes = m.recebimentos - m.pagamentos;
                  return (
                    <tr key={m.mes} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{MESES[m.mes - 1]}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">{fmtMoeda(m.recebimentos)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{fmtMoeda(m.pagamentos)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${saldoMes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {saldoMes >= 0 ? "+" : ""}{fmtMoeda(saldoMes)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${m.saldoAcumulado >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {fmtMoeda(m.saldoAcumulado)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtMoeda(totalRecAno)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmtMoeda(totalPagAno)}</td>
                  <td className={`px-4 py-3 text-right ${(totalRecAno - totalPagAno) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoeda(totalRecAno - totalPagAno)}</td>
                  <td className={`px-4 py-3 text-right ${saldoFinalAno >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtMoeda(saldoFinalAno)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tabela mensal (dia a dia) */}
      {!isAnual && dias.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Recebimentos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pagamentos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo do dia</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dias.map((d: any) => {
                  const saldoDia = d.recebimentos - d.pagamentos;
                  const pendencias = pendenciasPorDia[d.data] ?? [];
                  const pendenciasReceber = pendencias.filter(p => p.tipo === "boleto" || p.tipo === "nf" || p.tipo === "carga");
                  const pendenciasPagar = pendencias.filter(p => p.tipo === "folha");
                  const totalReceber = pendenciasReceber.reduce((s, p) => s + p.valor, 0);
                  const totalPagar = pendenciasPagar.reduce((s, p) => s + p.valor, 0);
                  const isExpanded = expandedDate === d.data;
                  return (
                    <Fragment key={d.data}>
                      <tr
                        className={`border-b last:border-0 ${pendencias.length > 0 ? "cursor-pointer" : ""} hover:bg-muted/30`}
                        onClick={() => pendencias.length > 0 && setExpandedDate(isExpanded ? null : d.data)}
                      >
                        <td className="px-4 py-3 flex items-center gap-1">
                          {pendencias.length > 0 && (
                            isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {fmtDataFull(d.data)}
                          {pendencias.length > 0 && (
                            <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-muted text-muted-foreground">
                              {pendencias.length} pendente{pendencias.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          {fmtMoeda(d.recebimentos)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          {fmtMoeda(d.pagamentos)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${saldoDia >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {saldoDia >= 0 ? "+" : ""}{fmtMoeda(saldoDia)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${d.saldoAcumulado >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          {fmtMoeda(d.saldoAcumulado)}
                        </td>
                      </tr>
                      {isExpanded && pendencias.length > 0 && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={5} className="px-4 py-3 space-y-4">
                            {pendenciasReceber.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                                  Ainda falta receber neste dia (total: {fmtMoeda(totalReceber)}):
                                </p>
                                <div className="space-y-1.5">
                                  {pendenciasReceber.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-card border rounded px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        {p.tipo === "boleto"
                                          ? <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          : p.tipo === "nf"
                                            ? <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            : <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                        <span className="font-medium">{p.cliente}</span>
                                        <span className="text-muted-foreground">
                                          {p.tipo === "boleto" ? "Boleto Sicoob" : p.tipo === "nf" ? "NF Conta Azul" : "Carga Entregue"} • {p.referencia}
                                        </span>
                                      </div>
                                      <span className="font-medium">{fmtMoeda(p.valor)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {pendenciasPagar.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                                  Ainda falta pagar neste dia (total: {fmtMoeda(totalPagar)}):
                                </p>
                                <div className="space-y-1.5">
                                  {pendenciasPagar.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-card border rounded px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="font-medium">{p.cliente}</span>
                                        <span className="text-muted-foreground">Folha de Pagamento • {p.referencia}</span>
                                      </div>
                                      <span className="font-medium">{fmtMoeda(p.valor)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtMoeda(totalRec)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmtMoeda(totalPag)}</td>
                  <td className={`px-4 py-3 text-right ${(totalRec - totalPag) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoeda(totalRec - totalPag)}</td>
                  <td className={`px-4 py-3 text-right ${saldoFinal >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtMoeda(saldoFinal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {((isAnual && isLoadingAnual) || (!isAnual && isLoading)) && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      )}
    </div>
  );
}
