import { useState, useMemo } from "react";
import { generatePDFFromHtml } from "@/lib/pdfUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Fuel,
  Truck,
  DollarSign,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Download,
  TreePine,
  Droplets,
  Wrench,
  AlertCircle,
  TrendingDown,
  Package,
} from "lucide-react";

// ── Helpers de data ──────────────────────────────────────────────────────────
function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`,
  };
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

function getDayRange(date: Date) {
  const d = date.toISOString().slice(0, 10);
  return {
    from: d,
    to: d,
    label: date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  };
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const [periodType, setPeriodType] = useState<"dia" | "semana" | "mes">("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [includeMaoDeObra, setIncludeMaoDeObra] = useState(true);
  const [includeConsumo, setIncludeConsumo] = useState(true);
  const [includeCargas, setIncludeCargas] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdfMutation = trpc.reportPdf.generatePdfHtml.useMutation({
    onSuccess: async (data) => {
      await generatePDFFromHtml(data.html, `relatorio-executivo-${new Date().toISOString().slice(0,10)}.pdf`);
      setIsGeneratingPdf(false);
    },
    onError: () => setIsGeneratingPdf(false),
  });

  const range = useMemo(() => {
    if (periodType === "dia") return getDayRange(currentDate);
    if (periodType === "semana") return getWeekRange(currentDate);
    return getMonthRange(currentDate);
  }, [periodType, currentDate]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (periodType === "dia") d.setDate(d.getDate() + dir);
    else if (periodType === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  // ── Queries ──
  const dashboardQuery = trpc.reports.dashboardByLocation.useQuery({
    dateFrom: range.from,
    dateTo: range.to,
  });

  const locationsQuery = trpc.reports.locations.useQuery();

  const reportQuery = trpc.reports.fullReport.useQuery({
    dateFrom: range.from,
    dateTo: range.to,
    locationId: selectedLocationId !== "all" ? parseInt(selectedLocationId) : undefined,
    includeMaoDeObra: true,
    includeConsumo: true,
    includeCargas: true,
  });

  const data = dashboardQuery.data;
  const locations = data?.locations || [];
  const totals = data?.totals;

  // ── Dados para gráfico simples (barras CSS) ──
  const maxCusto = Math.max(...(locations.map(l => l.custoTotal) || [1]), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Dashboard Executivo</h1>
                <p className="text-xs text-gray-500">Visão geral por local de trabalho</p>
              </div>
            </div>

            {/* Controles de período */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(["dia", "semana", "mes"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodType(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      periodType === p
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p === "dia" ? "Dia" : p === "semana" ? "Semana" : "Mês"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center" translate="no" suppressHydrationWarning>
                  <span key={range.label}>{range.label.charAt(0).toUpperCase() + range.label.slice(1)}</span>
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" key={`${range.from}-${range.to}`}>
        {/* Loading */}
        {dashboardQuery.isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            <span className="ml-3 text-gray-500">Carregando dados...</span>
          </div>
        )}

        {dashboardQuery.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{dashboardQuery.error.message}</p>
          </div>
        )}

        {totals && (
          <>
            {/* Cards de resumo geral */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Receita Total"
                value={formatCurrency(totals.totalReceita ?? 0)}
                color="green"
              />
              <SummaryCard
                icon={(totals.lucroTotal ?? 0) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                label={(totals.lucroTotal ?? 0) >= 0 ? "Lucro" : "Prejuízo"}
                value={formatCurrency(Math.abs(totals.lucroTotal ?? 0))}
                color={(totals.lucroTotal ?? 0) >= 0 ? "green" : "red"}
              />
              <SummaryCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Custo Total"
                value={formatCurrency(totals.custoTotal)}
                color="red"
              />
              <SummaryCard
                icon={<Truck className="w-5 h-5" />}
                label="Cargas"
                value={`${totals.totalCargas} (${totals.totalVolumeM3.toFixed(1)} m³)`}
                color="amber"
              />
            </div>

            {/* Cards de custo detalhado */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <SummaryCard
                icon={<Users className="w-5 h-5" />}
                label="Mão de Obra"
                value={formatCurrency(totals.totalMaoDeObra)}
                color="blue"
              />
              <SummaryCard
                icon={<Fuel className="w-5 h-5" />}
                label="Combustível"
                value={formatCurrency(totals.totalCombustivel)}
                color="amber"
              />
              <SummaryCard
                icon={<Wrench className="w-5 h-5" />}
                label="Manutenção"
                value={formatCurrency(totals.totalManutencao ?? 0)}
                color="purple"
              />
              <SummaryCard
                icon={<TreePine className="w-5 h-5" />}
                label="Corte Terc."
                value={formatCurrency((totals as any).totalCorteTerceirizado ?? 0)}
                color="amber"
              />
              <SummaryCard
                icon={<Package className="w-5 h-5" />}
                label="Frete Terc."
                value={formatCurrency(totals.totalFreteTerceirizado ?? 0)}
                color="red"
              />
              <SummaryCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Despesas Extras"
                value={formatCurrency(totals.totalDespesas)}
                color="purple"
              />
            </div>

            {/* ── Gráficos Pizza ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pizza: Distribuição de Custos */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Distribuição de Custos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {totals && (
                    <PieChart
                      slices={[
                        { label: "Mão de Obra", value: totals.totalMaoDeObra, color: "#3b82f6" },
                        { label: "Combustível", value: totals.totalCombustivel, color: "#f59e0b" },
                        { label: "Manutenção", value: totals.totalManutencao ?? 0, color: "#a855f7" },
                        { label: "Corte Terc.", value: (totals as any).totalCorteTerceirizado ?? 0, color: "#92400e" },
                        { label: "Frete Terc.", value: totals.totalFreteTerceirizado ?? 0, color: "#ef4444" },
                        { label: "Despesas Extras", value: totals.totalDespesas, color: "#6366f1" },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Pizza: Custo por Local de Trabalho */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    Custo por Local
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    slices={locations
                      .filter(l => l.custoTotal > 0)
                      .map((loc, i) => ({
                        label: loc.locationName,
                        value: loc.custoTotal,
                        color: LOCATION_COLORS[i % LOCATION_COLORS.length],
                      }))}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de barras por local */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  Custo por Local de Trabalho
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nenhum local com dados no período selecionado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {locations
                      .sort((a, b) => b.custoTotal - a.custoTotal)
                      .map((loc) => (
                        <div key={loc.locationId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800 truncate max-w-[200px]">
                              {loc.locationName}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(loc.custoTotal)}
                            </span>
                          </div>
                          <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                            {/* Mão de obra */}
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${(loc.maoDeObra.total / maxCusto) * 100}%` }}
                              title={`Mão de obra: ${formatCurrency(loc.maoDeObra.total)}`}
                            />
                            {/* Combustível */}
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${(loc.combustivel.total / maxCusto) * 100}%` }}
                              title={`Combustível: ${formatCurrency(loc.combustivel.total)}`}
                            />
                            {/* Despesas */}
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{ width: `${(loc.despesasExtras.total / maxCusto) * 100}%` }}
                              title={`Despesas: ${formatCurrency(loc.despesasExtras.total)}`}
                            />
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              MO: {formatCurrency(loc.maoDeObra.total)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Comb: {formatCurrency(loc.combustivel.total)}
                            </span>
                            {(loc as any).manutencao?.total > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                Manut: {formatCurrency((loc as any).manutencao.total)}
                              </span>
                            )}
                            {(loc as any).freteTerceirizado?.total > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Frete: {formatCurrency((loc as any).freteTerceirizado.total)}
                              </span>
                            )}
                            {loc.cargas.total > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                {loc.cargas.total} cargas
                              </span>
                            )}
                            {(loc as any).receita > 0 && (
                              <span className="flex items-center gap-1 font-semibold text-green-600">
                                Rec: {formatCurrency((loc as any).receita)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                    {/* Sem local atribuído */}
                    {data?.unassigned && data.unassigned.maoDeObra.dias > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-500 italic">Sem local atribuído</span>
                          <span className="font-semibold text-gray-600">
                            {formatCurrency(data.unassigned.maoDeObra.total)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {data.unassigned.maoDeObra.dias} dia(s) de mão de obra sem local definido
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Legenda */}
                <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Mão de Obra</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Combustível</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Manutenção</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Frete Terc.</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500" /> Despesas Extras</span>
                </div>
              </CardContent>
            </Card>

            {/* Tabela detalhada por local */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-green-600" />
                    Detalhamento por Local
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Local</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">MO</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Comb.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Manut.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Frete T.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Extras</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Cargas</th>
                        <th className="text-right px-3 py-2 font-medium text-red-700">Custo</th>
                        <th className="text-right px-3 py-2 font-medium text-green-700">Receita</th>
                        <th className="text-right px-3 py-2 font-medium text-blue-700">Lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations
                        .sort((a, b) => b.custoTotal - a.custoTotal)
                        .map((loc) => {
                          const locAny = loc as any;
                          const lucro = (locAny.lucro ?? 0);
                          return (
                          <tr key={loc.locationId} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 font-medium text-gray-800">{loc.locationName}</td>
                            <td className="px-3 py-2 text-right text-blue-600 font-medium text-xs">
                              {formatCurrency(loc.maoDeObra.total)}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-600 font-medium text-xs">
                              {formatCurrency(loc.combustivel.total)}
                            </td>
                            <td className="px-3 py-2 text-right text-purple-600 font-medium text-xs">
                              {formatCurrency(locAny.manutencao?.total ?? 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-red-500 font-medium text-xs">
                              {formatCurrency(locAny.freteTerceirizado?.total ?? 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-indigo-600 font-medium text-xs">
                              {formatCurrency(loc.despesasExtras.total)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 text-xs">
                              {loc.cargas.total > 0 ? `${loc.cargas.total}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-red-700 text-xs">
                              {formatCurrency(loc.custoTotal)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-700 text-xs">
                              {formatCurrency(locAny.receita ?? 0)}
                            </td>
                            <td className={`px-3 py-2 text-right font-bold text-xs ${lucro >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {lucro >= 0 ? '+' : ''}{formatCurrency(lucro)}
                            </td>
                          </tr>
                        )})}
                      {/* Totais */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-3 py-2 text-gray-800">TOTAL</td>
                        <td className="px-3 py-2 text-right text-blue-700 text-xs">
                          {formatCurrency(totals.totalMaoDeObra)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700 text-xs">
                          {formatCurrency(totals.totalCombustivel)}
                        </td>
                        <td className="px-3 py-2 text-right text-purple-700 text-xs">
                          {formatCurrency(totals.totalManutencao ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 text-xs">
                          {formatCurrency(totals.totalFreteTerceirizado ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-indigo-700 text-xs">
                          {formatCurrency(totals.totalDespesas)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800 text-xs">
                          {totals.totalCargas > 0 ? `${totals.totalCargas}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-red-800 text-sm">
                          {formatCurrency(totals.custoTotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-green-800 text-sm">
                          {formatCurrency(totals.totalReceita ?? 0)}
                        </td>
                        <td className={`px-3 py-2 text-right text-sm ${(totals.lucroTotal ?? 0) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {(totals.lucroTotal ?? 0) >= 0 ? '+' : ''}{formatCurrency(totals.lucroTotal ?? 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detalhamento de Receita por Comprador */}
            {totals && (totals as any).receitaBreakdown && (
              <Card className="shadow-sm border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-800">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Detalhamento de Receita
                    <span className="ml-auto text-sm font-normal text-green-700">
                      Total: {formatCurrency(totals.totalReceita ?? 0)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Pagamentos de compradores (Líder, Sonoco, etc.) */}
                  {(totals as any).receitaBreakdown.byBuyer.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Pagamentos de Compradores
                        <span className="ml-auto text-green-700 font-bold">
                          {formatCurrency((totals as any).receitaBreakdown.totalBuyerPayments)}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {(totals as any).receitaBreakdown.byBuyer.map((buyer: any) => (
                          <div key={buyer.buyerId} className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-green-900 text-sm">{buyer.buyerName}</span>
                              <span className="font-bold text-green-700">{formatCurrency(buyer.total)}</span>
                            </div>
                            <div className="space-y-1">
                              {buyer.payments.map((p: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs text-gray-600 pl-2">
                                  <span>
                                    {new Date(p.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    {p.invoiceNumber && <span className="ml-2 text-gray-400">NF: {p.invoiceNumber}</span>}
                                    {p.notes && <span className="ml-2 text-gray-400 italic">{p.notes}</span>}
                                  </span>
                                  <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Receitas manuais do financeiro */}
                  {(totals as any).receitaBreakdown.manualEntries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Outras Receitas (Financeiro)
                        <span className="ml-auto text-blue-700 font-bold">
                          {formatCurrency((totals as any).receitaBreakdown.totalManual)}
                        </span>
                      </h4>
                      <div className="space-y-1">
                        {(totals as any).receitaBreakdown.manualEntries.map((e: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-blue-50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium text-gray-800">{e.description}</span>
                              {e.clientName && <span className="ml-2 text-xs text-gray-500">{e.clientName}</span>}
                              <span className="ml-2 text-xs text-gray-400">
                                {new Date(e.date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className="font-bold text-blue-700">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(totals as any).receitaBreakdown.byBuyer.length === 0 && (totals as any).receitaBreakdown.manualEntries.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma receita registrada no período.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Seção de Relatório Detalhado por Local */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Relatório Detalhado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Selecione o local</label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um local" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os locais</SelectItem>
                        {(locationsQuery.data || []).map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    disabled={isGeneratingPdf}
                    onClick={() => {
                      setIsGeneratingPdf(true);
                      generatePdfMutation.mutate({
                        locationId: selectedLocationId !== "all" ? parseInt(selectedLocationId) : undefined,
                        dateFrom: range.from,
                        dateTo: range.to,
                        includeMaoDeObra,
                        includeConsumo,
                        includeCargas,
                      });
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {isGeneratingPdf ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                {/* Checkboxes de seções */}
                <div className="flex flex-wrap gap-4 mt-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={includeMaoDeObra} onChange={(e) => setIncludeMaoDeObra(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <span className="text-gray-700">Mão de Obra</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={includeConsumo} onChange={(e) => setIncludeConsumo(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <span className="text-gray-700">Consumo (Combustível, Despesas)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={includeCargas} onChange={(e) => setIncludeCargas(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <span className="text-gray-700">Cargas</span>
                  </label>
                </div>

                {/* Relatório detalhado */}
                {reportQuery.data && (
                  <div className="mt-6 space-y-6" id="report-content">
                    {/* Resumo do local */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <h3 className="font-bold text-green-800 text-lg mb-2">
                        {selectedLocationId === "all" ? "Todos os Locais" : (locationsQuery.data?.find(l => String(l.id) === selectedLocationId)?.name || "Local")}
                      </h3>
                      <p className="text-sm text-green-700 mb-3">
                        Período: {new Date(range.from).toLocaleDateString("pt-BR")} a {new Date(range.to).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Custo Total</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(reportQuery.data.resumo.custoTotal)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Mão de Obra</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(reportQuery.data.resumo.totalMaoDeObra)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Consumo</p>
                          <p className="text-lg font-bold text-amber-600">
                            {formatCurrency(reportQuery.data.resumo.totalConsumo)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Cargas</p>
                          <p className="text-lg font-bold text-green-600">
                            {reportQuery.data.resumo.totalCargas} ({reportQuery.data.resumo.totalVolumeM3.toFixed(1)}m³)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mão de Obra */}
                    {reportQuery.data.maoDeObra.registros.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-blue-500" />
                          Mão de Obra ({reportQuery.data.maoDeObra.totalDias} registros)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-blue-50">
                                <th className="text-left px-3 py-2 text-blue-700">Data</th>
                                <th className="text-left px-3 py-2 text-blue-700">Colaborador</th>
                                <th className="text-left px-3 py-2 text-blue-700">Atividade</th>
                                <th className="text-left px-3 py-2 text-blue-700">Vínculo</th>
                                <th className="text-right px-3 py-2 text-blue-700">Valor</th>
                                <th className="text-center px-3 py-2 text-blue-700">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportQuery.data.maoDeObra.registros.map((r: any) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                                  <td className="px-3 py-2 font-medium">{r.collaboratorName}</td>
                                  <td className="px-3 py-2 text-gray-600">{r.activity || "—"}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      r.employmentType === "clt" ? "bg-blue-100 text-blue-700" :
                                      r.employmentType === "terceirizado" ? "bg-purple-100 text-purple-700" :
                                      "bg-amber-100 text-amber-700"
                                    }`}>
                                      {r.employmentType === "clt" ? "CLT" : r.employmentType === "terceirizado" ? "Terceirizado" : "Diarista"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseFloat(r.dailyValue || "0"))}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      r.paymentStatus === "pago" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                      {r.paymentStatus === "pago" ? "Pago" : "Pendente"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-blue-50 font-bold">
                                <td colSpan={4} className="px-3 py-2 text-blue-800">Total Mão de Obra</td>
                                <td className="px-3 py-2 text-right text-blue-800">
                                  {formatCurrency(reportQuery.data.maoDeObra.totalValor)}
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-blue-600">
                                  {reportQuery.data.maoDeObra.pendentes} pend. / {reportQuery.data.maoDeObra.pagos} pagos
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Consumo - Combustível Veículos */}
                    {reportQuery.data.consumo.veiculos.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                          <Fuel className="w-4 h-4 text-amber-500" />
                          Combustível — Veículos ({reportQuery.data.consumo.veiculos.length} registros)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-amber-50">
                                <th className="text-left px-3 py-2 text-amber-700">Data</th>
                                <th className="text-left px-3 py-2 text-amber-700">Veículo</th>
                                <th className="text-left px-3 py-2 text-amber-700">Tipo</th>
                                <th className="text-right px-3 py-2 text-amber-700">Litros</th>
                                <th className="text-right px-3 py-2 text-amber-700">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportQuery.data.consumo.veiculos.map((r: any) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                                  <td className="px-3 py-2 font-medium">{r.equipmentName} {r.equipmentPlate ? `(${r.equipmentPlate})` : ""}</td>
                                  <td className="px-3 py-2 capitalize">{r.fuelType}</td>
                                  <td className="px-3 py-2 text-right">{parseFloat(r.liters || "0").toFixed(1)}L</td>
                                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseFloat(r.totalValue || "0"))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Consumo - Combustível Máquinas */}
                    {reportQuery.data.consumo.maquinas.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                          <Droplets className="w-4 h-4 text-orange-500" />
                          Combustível — Máquinas ({reportQuery.data.consumo.maquinas.length} registros)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-orange-50">
                                <th className="text-left px-3 py-2 text-orange-700">Data</th>
                                <th className="text-left px-3 py-2 text-orange-700">Máquina</th>
                                <th className="text-left px-3 py-2 text-orange-700">Tipo</th>
                                <th className="text-right px-3 py-2 text-orange-700">Litros</th>
                                <th className="text-right px-3 py-2 text-orange-700">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportQuery.data.consumo.maquinas.map((r: any) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                                  <td className="px-3 py-2 font-medium">{r.equipmentName}</td>
                                  <td className="px-3 py-2 capitalize">{r.fuelType}</td>
                                  <td className="px-3 py-2 text-right">{parseFloat(r.liters || "0").toFixed(1)}L</td>
                                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseFloat(r.totalValue || "0"))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Análise Diária de Cargas */}
                    {(() => {
                      // Usar dailyBreakdown global do totals (já inclui receita por dia)
                      const days = (totals as any)?.dailyBreakdown ?? [];
                      if (days.length === 0) return null;
                      return (
                        <div>
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            Análise Diária de Cargas e Receita
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-indigo-50">
                                  <th className="text-left px-3 py-2 text-indigo-700">Data</th>
                                  <th className="text-right px-3 py-2 text-indigo-700">Cargas</th>
                                  <th className="text-right px-3 py-2 text-indigo-700">Volume (m³)</th>
                                  <th className="text-right px-3 py-2 text-indigo-700">Receita do Dia</th>
                                  <th className="text-center px-3 py-2 text-indigo-700">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {days.map((d: any) => (
                                  <tr key={d.date} className="border-b hover:bg-gray-50">
                                    <td className="px-3 py-2">{new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="px-3 py-2 text-right font-bold">{d.cargas}</td>
                                    <td className="px-3 py-2 text-right">{(d.volumeM3 ?? 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-green-700">
                                      {d.receita > 0 ? formatCurrency(d.receita) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        d.cargas >= 2 ? 'bg-green-100 text-green-700' :
                                        d.cargas === 1 ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {d.cargas >= 2 ? `${d.cargas} cargas` : d.cargas === 1 ? '1 carga' : 'sem carga'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-indigo-50 font-bold">
                                  <td className="px-3 py-2 text-indigo-800">Total</td>
                                  <td className="px-3 py-2 text-right text-indigo-800">{days.reduce((s: number, d: any) => s + d.cargas, 0)}</td>
                                  <td className="px-3 py-2 text-right text-indigo-800">{days.reduce((s: number, d: any) => s + (d.volumeM3 ?? 0), 0).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-green-800">{formatCurrency(days.reduce((s: number, d: any) => s + (d.receita ?? 0), 0))}</td>
                                  <td className="px-3 py-2 text-center text-xs text-indigo-600">
                                    {days.filter((d: any) => d.cargas >= 2).length} dias c/ 2+ cargas
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Cargas */}
                    {reportQuery.data.cargas.registros.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                          <Truck className="w-4 h-4 text-green-500" />
                          Cargas ({reportQuery.data.cargas.totalCargas} registros — {reportQuery.data.cargas.totalVolumeM3.toFixed(1)}m³)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-green-50">
                                <th className="text-left px-3 py-2 text-green-700">Data</th>
                                <th className="text-left px-3 py-2 text-green-700">Motorista</th>
                                <th className="text-left px-3 py-2 text-green-700">Placa</th>
                                <th className="text-left px-3 py-2 text-green-700">Madeira</th>
                                <th className="text-right px-3 py-2 text-green-700">Volume (m³)</th>
                                <th className="text-left px-3 py-2 text-green-700">Destino</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportQuery.data.cargas.registros.map((r: any) => (
                                <tr key={r.id} className="border-b hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                                  <td className="px-3 py-2 font-medium">{r.driverName || "—"}</td>
                                  <td className="px-3 py-2">{r.vehiclePlate || "—"}</td>
                                  <td className="px-3 py-2 capitalize">{r.woodType || "—"}</td>
                                  <td className="px-3 py-2 text-right font-medium">{parseFloat(r.volumeM3 || "0").toFixed(2)}</td>
                                  <td className="px-3 py-2">{r.destination || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .sticky { position: relative !important; }
          button, select { display: none !important; }
          .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Paleta de cores para locais ─────────────────────────────────────────────
const LOCATION_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#9333ea", "#dc2626",
  "#0891b2", "#65a30d", "#db2777", "#ea580c", "#7c3aed",
];

// ── Gráfico Pizza SVG ─────────────────────────────────────────────────────────
function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>;
  }

  const radius = 70;
  const cx = 90;
  const cy = 90;
  let startAngle = -Math.PI / 2;

  const paths = slices
    .filter(sl => sl.value > 0)
    .map((sl) => {
      const angle = (sl.value / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const d = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
      const midAngle = startAngle + angle / 2;
      startAngle = endAngle;
      return { ...sl, d, midAngle };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 180 180" className="w-36 h-36 flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="1.5">
            <title>{p.label}: {formatCurrency(p.value)} ({((p.value / total) * 100).toFixed(1)}%)</title>
          </path>
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.filter(sl => sl.value > 0).map((sl, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sl.color }} />
              <span className="text-gray-700 truncate">{sl.label}</span>
            </div>
            <span className="font-semibold text-gray-800 flex-shrink-0">
              {((sl.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        <div className="border-t pt-1 mt-1 flex justify-between text-xs font-bold">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Componente de card de resumo ─────────────────────────────────────────────
function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "red" | "blue" | "amber" | "purple" | "green";
}) {
  const colors = {
    red: "from-red-500 to-red-600 text-white",
    blue: "from-blue-500 to-blue-600 text-white",
    amber: "from-amber-500 to-amber-600 text-white",
    purple: "from-purple-500 to-purple-600 text-white",
    green: "from-green-500 to-green-600 text-white",
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 opacity-80 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}
