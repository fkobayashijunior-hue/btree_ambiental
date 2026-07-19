// @ts-nocheck
import { useState, useMemo } from "react";
import { generatePDFFromHtml } from "@/lib/pdfUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Fuel,
  Truck,
  DollarSign,
  Calendar as CalendarIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Download,
  TreePine,
  Wrench,
  AlertCircle,
  TrendingDown,
  Package,
  Scissors,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Helpers de data ──────────────────────────────────────────────────────────
function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d);
  start.setDate(diff);
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

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const [periodType, setPeriodType] = useState<"dia" | "semana" | "mes" | "custom">("dia");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [showEstimated, setShowEstimated] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null);

  const generatePdfMutation = trpc.reportPdf.generatePdfHtml.useMutation({
    onSuccess: async (data) => {
      await generatePDFFromHtml(data.html, `relatorio-executivo-${new Date().toISOString().slice(0, 10)}.pdf`);
      setIsGeneratingPdf(false);
    },
    onError: () => setIsGeneratingPdf(false),
  });

  const range = useMemo(() => {
    if (periodType === "custom") return { from: customFrom, to: customTo, label: `${formatDate(customFrom)} — ${formatDate(customTo)}` };
    if (periodType === "dia") return getDayRange(currentDate);
    if (periodType === "semana") return getWeekRange(currentDate);
    return getMonthRange(currentDate);
  }, [periodType, currentDate, customFrom, customTo]);

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
  const allLocations = data?.locations || [];

  // Filtrar por local selecionado
  const locations = selectedLocationId === "all"
    ? allLocations
    : allLocations.filter(l => String(l.locationId) === selectedLocationId);

  const totals = useMemo(() => {
    if (selectedLocationId === "all") return data?.totals;
    if (!data?.totals) return undefined;
    // Recalcular totais para o local selecionado
    const locs = allLocations.filter(l => String(l.locationId) === selectedLocationId);
    if (locs.length === 0) return data.totals;
    const loc = locs[0] as any;
    return {
      ...data.totals,
      custoTotal: loc.custoTotal,
      totalMaoDeObra: loc.maoDeObra.total,
      totalCombustivel: loc.combustivel.total,
      totalDespesas: loc.despesasExtras.total,
      totalManutencao: loc.manutencao?.total ?? 0,
      totalCorteTerceirizado: loc.corteTerceirizado?.total ?? 0,
      totalFreteTerceirizado: loc.freteTerceirizado?.total ?? 0,
      totalPagamentoClientes: loc.pagamentoClientes?.total ?? 0,
      totalCargas: loc.cargas.total,
      totalVolumeM3: loc.cargas.volumeM3,
      totalReceita: loc.receita ?? 0,
      totalReceitaEstimada: loc.receitaEstimada ?? 0,
      lucroTotal: (loc.receita ?? 0) - loc.custoTotal,
      lucroEstimado: (loc.receitaEstimada ?? 0) - loc.custoTotal,
      dailyBreakdown: loc.dailyBreakdown ?? [],
    };
  }, [data, selectedLocationId, allLocations]);

  const receitaExibida = showEstimated
    ? (totals?.totalReceitaEstimada ?? 0)
    : (totals?.totalReceita ?? 0);
  const lucroExibido = receitaExibida - (totals?.custoTotal ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Dashboard Executivo</h1>
                  <p className="text-xs text-gray-500">Análise financeira por local de trabalho</p>
                </div>
              </div>

              {/* Toggle receita estimada / real */}
              <button
                onClick={() => setShowEstimated(!showEstimated)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  showEstimated
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "bg-gray-50 border-gray-300 text-gray-600"
                }`}
              >
                {showEstimated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showEstimated ? "Receita Estimada" : "Receita Real"}
              </button>
            </div>

            {/* Controles de período */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tipo de período */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(["dia", "semana", "mes", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodType(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      periodType === p
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p === "dia" ? "Dia" : p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Período"}
                  </button>
                ))}
              </div>

              {/* Navegação ou inputs de data */}
              {periodType === "custom" ? (
                <div className="flex items-center gap-2">
                  {/* Data início */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                        <CalendarIcon className="w-3.5 h-3.5 text-green-600" />
                        {customFrom ? new Date(customFrom + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data início'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customFrom ? new Date(customFrom + 'T12:00:00') : undefined}
                        onSelect={(date) => date && setCustomFrom(date.toISOString().slice(0, 10))}
                        captionLayout="dropdown"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-gray-400">até</span>
                  {/* Data fim */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                        <CalendarIcon className="w-3.5 h-3.5 text-green-600" />
                        {customTo ? new Date(customTo + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data fim'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customTo ? new Date(customTo + 'T12:00:00') : undefined}
                        onSelect={(date) => date && setCustomTo(date.toISOString().slice(0, 10))}
                        captionLayout="dropdown"
                        disabled={(date) => customFrom ? date < new Date(customFrom + 'T12:00:00') : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {/* Label clicável abre calendário para ir direto a uma data */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-sm font-medium text-gray-700 min-w-[160px] text-center hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors" translate="no">
                        {range.label.charAt(0).toUpperCase() + range.label.slice(1)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={(date) => date && setCurrentDate(date)}
                        captionLayout="dropdown"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Filtro por local */}
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-green-600" />
                  <SelectValue placeholder="Todos os locais" />
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
            {/* ── Cards KPI principais ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<TrendingUp className="w-5 h-5" />}
                label={showEstimated ? "Receita Estimada" : "Receita Real"}
                value={formatCurrency(receitaExibida)}
                sub={showEstimated ? "baseada nas cargas" : "pagamentos recebidos"}
                color="green"
              />
              <KpiCard
                icon={lucroExibido >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                label={lucroExibido >= 0 ? "Lucro" : "Prejuízo"}
                value={formatCurrency(Math.abs(lucroExibido))}
                sub={showEstimated ? "estimado" : "realizado"}
                color={lucroExibido >= 0 ? "green" : "red"}
              />
              <KpiCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Custo Total"
                value={formatCurrency(totals.custoTotal)}
                sub="todos os custos"
                color="red"
              />
              <KpiCard
                icon={<Truck className="w-5 h-5" />}
                label="Cargas"
                value={`${totals.totalCargas}`}
                sub={`${totals.totalVolumeM3.toFixed(1)} m³`}
                color="amber"
              />
            </div>

            {/* ── Cards de custo detalhado ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniCostCard icon={<Users className="w-4 h-4" />} label="Mão de Obra" value={totals.totalMaoDeObra} color="blue" />
              <MiniCostCard icon={<Fuel className="w-4 h-4" />} label="Combustível" value={totals.totalCombustivel} color="amber" />
              <MiniCostCard icon={<Scissors className="w-4 h-4" />} label="Corte Terc." value={(totals as any).totalCorteTerceirizado ?? 0} color="orange" />
              <MiniCostCard icon={<Package className="w-4 h-4" />} label="Frete Terc." value={totals.totalFreteTerceirizado ?? 0} color="red" />
              <MiniCostCard icon={<CreditCard className="w-4 h-4" />} label="Pag. Clientes" value={(totals as any).totalPagamentoClientes ?? 0} color="purple" />
              <MiniCostCard icon={<Wrench className="w-4 h-4" />} label="Manutenção" value={totals.totalManutencao ?? 0} color="gray" />
            </div>

            {/* ── Gráficos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pizza: Distribuição de Custos */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Distribuição de Custos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    slices={[
                      { label: "Mão de Obra", value: totals.totalMaoDeObra, color: "#3b82f6" },
                      { label: "Combustível", value: totals.totalCombustivel, color: "#f59e0b" },
                      { label: "Corte Terc.", value: (totals as any).totalCorteTerceirizado ?? 0, color: "#ea580c" },
                      { label: "Frete Terc.", value: totals.totalFreteTerceirizado ?? 0, color: "#ef4444" },
                      { label: "Pag. Clientes", value: (totals as any).totalPagamentoClientes ?? 0, color: "#8b5cf6" },
                      { label: "Manutenção", value: totals.totalManutencao ?? 0, color: "#a855f7" },
                      { label: "Despesas Extras", value: totals.totalDespesas, color: "#6366f1" },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Pizza: Custo por Local */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    Custo por Local
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart
                    slices={allLocations
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

            {/* ── Gráfico de barras: Receita vs Custo por local ── */}
            {allLocations.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    Receita vs Custo por Local
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allLocations.filter(l => l.custoTotal > 0 || (l as any).receitaEstimada > 0).map((loc, i) => {
                      const locAny = loc as any;
                      const receita = showEstimated ? (locAny.receitaEstimada ?? 0) : (locAny.receita ?? 0);
                      const maxVal = Math.max(loc.custoTotal, receita, 1);
                      const lucro = receita - loc.custoTotal;
                      return (
                        <div key={loc.locationId}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-800">{loc.locationName}</span>
                            <span className={`text-xs font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {lucro >= 0 ? '+' : ''}{formatCurrency(lucro)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 w-20 text-right">{formatCurrency(receita)}</span>
                              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                                  style={{ width: `${(receita / maxVal) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-14">Receita</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 w-20 text-right">{formatCurrency(loc.custoTotal)}</span>
                              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                                  style={{ width: `${(loc.custoTotal / maxVal) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-14">Custo</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Análise Diária ── */}
            {(() => {
              const days = (totals as any)?.dailyBreakdown ?? [];
              if (days.length === 0) return null;
              return (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-600" />
                      Análise Diária de Cargas e Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-indigo-50">
                            <th className="text-left px-4 py-2 text-indigo-700 font-medium">Data</th>
                            <th className="text-right px-4 py-2 text-indigo-700 font-medium">Cargas</th>
                            <th className="text-right px-4 py-2 text-indigo-700 font-medium">Volume (m³)</th>
                            <th className="text-right px-4 py-2 text-indigo-700 font-medium">
                              {showEstimated ? "Receita Estimada" : "Receita Real"}
                            </th>
                            <th className="text-center px-4 py-2 text-indigo-700 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((d: any) => (
                            <tr key={d.date} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium">{formatDate(d.date)}</td>
                              <td className="px-4 py-2 text-right font-bold">{d.cargas}</td>
                              <td className="px-4 py-2 text-right">{(d.volumeM3 ?? 0).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-700">
                                {showEstimated
                                  ? (d.receitaEstimada > 0 ? formatCurrency(d.receitaEstimada) : <span className="text-gray-400">—</span>)
                                  : (d.receitaReal > 0 ? formatCurrency(d.receitaReal) : <span className="text-gray-400">—</span>)
                                }
                              </td>
                              <td className="px-4 py-2 text-center">
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
                            <td className="px-4 py-2 text-indigo-800">Total</td>
                            <td className="px-4 py-2 text-right text-indigo-800">{days.reduce((s: number, d: any) => s + d.cargas, 0)}</td>
                            <td className="px-4 py-2 text-right text-indigo-800">{days.reduce((s: number, d: any) => s + (d.volumeM3 ?? 0), 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-green-800">
                              {formatCurrency(days.reduce((s: number, d: any) => s + (showEstimated ? (d.receitaEstimada ?? 0) : (d.receitaReal ?? 0)), 0))}
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-indigo-600">
                              {days.filter((d: any) => d.cargas >= 2).length} dias c/ 2+ cargas
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Tabela detalhada por local ── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-green-600" />
                  Detalhamento por Local
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Local</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">MO</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Comb.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Corte T.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Frete T.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Pag. Cli.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Manut.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Extras</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Cargas</th>
                        <th className="text-right px-3 py-2 font-medium text-red-700">Custo</th>
                        <th className="text-right px-3 py-2 font-medium text-green-700">Receita</th>
                        <th className="text-right px-3 py-2 font-medium text-blue-700">Lucro</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.sort((a, b) => b.custoTotal - a.custoTotal).map((loc) => {
                        const locAny = loc as any;
                        const receita = showEstimated ? (locAny.receitaEstimada ?? 0) : (locAny.receita ?? 0);
                        const lucro = receita - loc.custoTotal;
                        const isExpanded = expandedLocation === loc.locationId;
                        return (
                          <>
                            <tr key={loc.locationId} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 font-semibold text-gray-800">{loc.locationName}</td>
                              <td className="px-3 py-2 text-right text-blue-600 text-xs">{formatCurrency(loc.maoDeObra.total)}</td>
                              <td className="px-3 py-2 text-right text-amber-600 text-xs">{formatCurrency(loc.combustivel.total)}</td>
                              <td className="px-3 py-2 text-right text-orange-600 text-xs">{formatCurrency(locAny.corteTerceirizado?.total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-red-500 text-xs">{formatCurrency(locAny.freteTerceirizado?.total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-purple-600 text-xs">{formatCurrency(locAny.pagamentoClientes?.total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-gray-500 text-xs">{formatCurrency(locAny.manutencao?.total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-indigo-600 text-xs">{formatCurrency(loc.despesasExtras.total)}</td>
                              <td className="px-3 py-2 text-right text-gray-600 text-xs">{loc.cargas.total > 0 ? loc.cargas.total : "—"}</td>
                              <td className="px-3 py-2 text-right font-bold text-red-700 text-xs">{formatCurrency(loc.custoTotal)}</td>
                              <td className="px-3 py-2 text-right font-bold text-green-700 text-xs">{formatCurrency(receita)}</td>
                              <td className={`px-3 py-2 text-right font-bold text-xs ${lucro >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {lucro >= 0 ? '+' : ''}{formatCurrency(lucro)}
                              </td>
                              <td className="px-3 py-2">
                                {locAny.cargasDetalhadas?.length > 0 && (
                                  <button
                                    onClick={() => setExpandedLocation(isExpanded ? null : loc.locationId)}
                                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                                  >
                                    {isExpanded ? "▲ Fechar" : "▼ Cargas"}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && locAny.cargasDetalhadas?.length > 0 && (
                              <tr key={`${loc.locationId}-detail`}>
                                <td colSpan={13} className="bg-green-50 px-4 py-3">
                                  <p className="text-xs font-semibold text-green-800 mb-2">Cargas — {loc.locationName}</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-green-200">
                                        <th className="text-left py-1 text-green-700">Data</th>
                                        <th className="text-left py-1 text-green-700">Entrega</th>
                                        <th className="text-left py-1 text-green-700">Placa</th>
                                        <th className="text-left py-1 text-green-700">Motorista</th>
                                        <th className="text-left py-1 text-green-700">Destino</th>
                                        <th className="text-right py-1 text-green-700">Vol (m³)</th>
                                        <th className="text-right py-1 text-green-700">Peso (kg)</th>
                                        <th className="text-right py-1 text-orange-700">Corte</th>
                                        <th className="text-right py-1 text-red-700">Frete</th>
                                        <th className="text-right py-1 text-green-700">Receita Est.</th>
                                        <th className="text-center py-1 text-green-700">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {locAny.cargasDetalhadas.map((c: any) => (
                                        <tr key={c.id} className="border-b border-green-100">
                                          <td className="py-1">{formatDate(c.date)}</td>
                                          <td className="py-1">{c.deliveryDate ? formatDate(c.deliveryDate) : "—"}</td>
                                          <td className="py-1 font-mono">{c.vehiclePlate || "—"}</td>
                                          <td className="py-1">{c.driverName || "—"}</td>
                                          <td className="py-1">{c.destination || "—"}</td>
                                          <td className="py-1 text-right">{c.volumeM3.toFixed(2)}</td>
                                          <td className="py-1 text-right">{c.weightNetKg > 0 ? c.weightNetKg.toLocaleString("pt-BR") : "—"}</td>
                                          <td className="py-1 text-right text-orange-600">{c.custoCorteTerceirizado > 0 ? formatCurrency(c.custoCorteTerceirizado) : "—"}</td>
                                          <td className="py-1 text-right text-red-600">{c.custoFreteTerceirizado > 0 ? formatCurrency(c.custoFreteTerceirizado) : "—"}</td>
                                          <td className="py-1 text-right text-green-700 font-semibold">{c.receitaEstimada > 0 ? formatCurrency(c.receitaEstimada) : "—"}</td>
                                          <td className="py-1 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                              c.paymentStatus === 'pago' ? 'bg-green-100 text-green-700' :
                                              c.paymentStatus === 'a_pagar' ? 'bg-amber-100 text-amber-700' :
                                              'bg-gray-100 text-gray-500'
                                            }`}>
                                              {c.paymentStatus === 'pago' ? 'Pago' : c.paymentStatus === 'a_pagar' ? 'A pagar' : 'Sem boleto'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="font-bold border-t border-green-200">
                                        <td colSpan={5} className="py-1 text-green-800">Total</td>
                                        <td className="py-1 text-right text-green-800">{locAny.cargasDetalhadas.reduce((s: number, c: any) => s + c.volumeM3, 0).toFixed(2)}</td>
                                        <td className="py-1 text-right text-green-800">{locAny.cargasDetalhadas.reduce((s: number, c: any) => s + c.weightNetKg, 0).toLocaleString("pt-BR")}</td>
                                        <td className="py-1 text-right text-orange-700">{formatCurrency(locAny.cargasDetalhadas.reduce((s: number, c: any) => s + c.custoCorteTerceirizado, 0))}</td>
                                        <td className="py-1 text-right text-red-700">{formatCurrency(locAny.cargasDetalhadas.reduce((s: number, c: any) => s + c.custoFreteTerceirizado, 0))}</td>
                                        <td className="py-1 text-right text-green-700">{formatCurrency(locAny.cargasDetalhadas.reduce((s: number, c: any) => s + c.receitaEstimada, 0))}</td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                      {/* Linha de totais */}
                      <tr className="bg-gray-100 font-bold border-t-2">
                        <td className="px-3 py-2 text-gray-800">TOTAL</td>
                        <td className="px-3 py-2 text-right text-blue-700 text-xs">{formatCurrency(totals.totalMaoDeObra)}</td>
                        <td className="px-3 py-2 text-right text-amber-700 text-xs">{formatCurrency(totals.totalCombustivel)}</td>
                        <td className="px-3 py-2 text-right text-orange-700 text-xs">{formatCurrency((totals as any).totalCorteTerceirizado ?? 0)}</td>
                        <td className="px-3 py-2 text-right text-red-600 text-xs">{formatCurrency(totals.totalFreteTerceirizado ?? 0)}</td>
                        <td className="px-3 py-2 text-right text-purple-700 text-xs">{formatCurrency((totals as any).totalPagamentoClientes ?? 0)}</td>
                        <td className="px-3 py-2 text-right text-gray-600 text-xs">{formatCurrency(totals.totalManutencao ?? 0)}</td>
                        <td className="px-3 py-2 text-right text-indigo-700 text-xs">{formatCurrency(totals.totalDespesas)}</td>
                        <td className="px-3 py-2 text-right text-gray-800 text-xs">{totals.totalCargas > 0 ? totals.totalCargas : "—"}</td>
                        <td className="px-3 py-2 text-right text-red-800 text-sm">{formatCurrency(totals.custoTotal)}</td>
                        <td className="px-3 py-2 text-right text-green-800 text-sm">{formatCurrency(receitaExibida)}</td>
                        <td className={`px-3 py-2 text-right text-sm ${lucroExibido >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {lucroExibido >= 0 ? '+' : ''}{formatCurrency(lucroExibido)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── Detalhamento de Receita ── */}
            {(totals as any).receitaBreakdown && (
              <Card className="shadow-sm border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-800">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Detalhamento de Receita
                    <span className="ml-auto text-sm font-normal text-green-700">
                      Total: {formatCurrency(totals.totalReceita ?? 0)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(totals as any).receitaBreakdown.byBuyer.length > 0 ? (
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
                                  {formatDate(p.paymentDate)}
                                  {p.invoiceNumber && <span className="ml-2 text-gray-400">NF: {p.invoiceNumber}</span>}
                                </span>
                                <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Nenhum pagamento recebido no período.{" "}
                      {showEstimated && <span className="text-green-600">Receita estimada: {formatCurrency(totals.totalReceitaEstimada ?? 0)}</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Relatório Detalhado (PDF) ── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Exportar Relatório PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Local para o relatório</label>
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
                        includeMaoDeObra: true,
                        includeConsumo: true,
                        includeCargas: true,
                      });
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {isGeneratingPdf ? "Gerando..." : "Gerar PDF"}
                  </Button>
                </div>

                {/* Relatório detalhado inline */}
                {reportQuery.data && (
                  <div className="mt-6 space-y-6">
                    {/* Resumo */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <h3 className="font-bold text-green-800 text-base mb-1">
                        {selectedLocationId === "all" ? "Todos os Locais" : (locationsQuery.data?.find(l => String(l.id) === selectedLocationId)?.name || "Local")}
                      </h3>
                      <p className="text-xs text-green-700 mb-3">
                        Período: {formatDate(range.from)} a {formatDate(range.to)}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Custo Total</p>
                          <p className="text-base font-bold text-red-600">{formatCurrency(reportQuery.data.resumo.custoTotal)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Mão de Obra</p>
                          <p className="text-base font-bold text-blue-600">{formatCurrency(reportQuery.data.resumo.totalMaoDeObra)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Consumo</p>
                          <p className="text-base font-bold text-amber-600">{formatCurrency(reportQuery.data.resumo.totalConsumo)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Cargas</p>
                          <p className="text-base font-bold text-green-600">{reportQuery.data.resumo.totalCargas} ({reportQuery.data.resumo.totalVolumeM3.toFixed(1)}m³)</p>
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
                                <td className="px-3 py-2 text-right text-blue-800">{formatCurrency(reportQuery.data.maoDeObra.totalValor)}</td>
                                <td className="px-3 py-2 text-center text-xs text-blue-600">
                                  {reportQuery.data.maoDeObra.pendentes} pend. / {reportQuery.data.maoDeObra.pagos} pagos
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Combustível */}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

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

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "red" | "blue" | "amber" | "purple" | "green";
}) {
  const colors = {
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} text-white p-4 shadow-sm`}>
      <div className="flex items-center gap-2 opacity-80 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Mini Cost Card ────────────────────────────────────────────────────────────
function MiniCostCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number;
  color: "red" | "blue" | "amber" | "purple" | "green" | "orange" | "gray";
}) {
  const colors: Record<string, string> = {
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold">{value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
    </div>
  );
}

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
      startAngle = endAngle;
      return { ...sl, d };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 180 180" className="w-36 h-36 flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="1.5">
            <title>{p.label}: {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({((p.value / total) * 100).toFixed(1)}%)</title>
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
          <span className="text-gray-900">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
      </div>
    </div>
  );
}
