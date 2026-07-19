// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Fuel, Wrench, Droplet, Package, MapPin, UtensilsCrossed,
  Users, ShoppingCart, Truck, DollarSign, ChevronDown, ChevronRight,
  BarChart2, List, Filter, RefreshCw, TrendingDown, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtShort = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};

const CATEGORY_ICONS: Record<string, any> = {
  combustivel: Fuel,
  manutencao: Wrench,
  oleos: Droplet,
  pecas: Package,
  pedagio: MapPin,
  refeicao: UtensilsCrossed,
  servico_terceiro: Users,
  compra_material: ShoppingCart,
  folha: Users,
  frete: Truck,
  financeiro: DollarSign,
  outros: AlertCircle,
};

const LOCATION_COLORS = ["#16a34a", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export default function FinancialConsolidatedPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workLocationId, setWorkLocationId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"categorias" | "locais">("categorias");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "chart">("cards");

  // Filtros aplicados (só muda ao clicar em Filtrar)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: "", dateTo: "", workLocationId: undefined as number | undefined,
  });

  const summaryQuery = trpc.financialConsolidated.getSummary.useQuery({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
    workLocationId: appliedFilters.workLocationId,
  });

  const locationQuery = trpc.financialConsolidated.getByLocation.useQuery({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
  });

  const detailQuery = trpc.financialConsolidated.getDetailByCategory.useQuery(
    {
      category: expandedCategory || "",
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
      workLocationId: appliedFilters.workLocationId,
      page: detailPage,
      pageSize: 50,
    },
    { enabled: !!expandedCategory }
  );

  const applyFilters = () => {
    setAppliedFilters({ dateFrom, dateTo, workLocationId });
    setDetailPage(1);
  };

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setWorkLocationId(undefined);
    setAppliedFilters({ dateFrom: "", dateTo: "", workLocationId: undefined });
    setDetailPage(1);
  };

  const categories = summaryQuery.data?.categories || [];
  const totalGeral = summaryQuery.data?.totalGeral || 0;
  const locations = locationQuery.data?.locations || [];

  // Dados para gráfico de pizza
  const pieData = categories.slice(0, 8).map(c => ({
    name: c.label,
    value: c.total,
    color: c.color,
  }));

  // Dados para gráfico de barras por local
  const barData = locations.slice(0, 6).map(l => ({
    name: l.locationName,
    total: l.total,
  }));

  const isLoading = summaryQuery.isLoading;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-green-600" />
            Relatório Financeiro Consolidado
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todas as fontes de custo do sistema — combustível, manutenção, peças, óleos, pedágio e mais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { summaryQuery.refetch(); locationQuery.refetch(); }}
            className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data Início</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data Fim</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Local de Trabalho</label>
            <select
              value={workLocationId ?? ""}
              onChange={e => setWorkLocationId(e.target.value ? Number(e.target.value) : undefined)}
              className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos os Locais</option>
              <option value="1">Astorga / Sede</option>
              <option value="2">Fazenda GW</option>
              <option value="3">SIMFLOR</option>
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Filtrar
          </button>
          {(appliedFilters.dateFrom || appliedFilters.dateTo || appliedFilters.workLocationId) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        {(appliedFilters.dateFrom || appliedFilters.dateTo || appliedFilters.workLocationId) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {appliedFilters.dateFrom && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                De: {appliedFilters.dateFrom}
              </span>
            )}
            {appliedFilters.dateTo && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                Até: {appliedFilters.dateTo}
              </span>
            )}
            {appliedFilters.workLocationId && (
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                Local: {appliedFilters.workLocationId === 1 ? "Astorga/Sede" : appliedFilters.workLocationId === 2 ? "Fazenda GW" : "SIMFLOR"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Total Geral */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm font-medium">Total Geral de Custos</p>
            <p className="text-4xl font-bold mt-1">
              {isLoading ? "..." : fmt(totalGeral)}
            </p>
            <p className="text-red-100 text-sm mt-1">
              {categories.length} categorias · {categories.reduce((s, c) => s + c.count, 0)} registros
            </p>
          </div>
          <TrendingDown className="w-16 h-16 text-red-200 opacity-50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("categorias")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "categorias"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Categoria
        </button>
        <button
          onClick={() => setActiveTab("locais")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "locais"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Local / Operação
        </button>
      </div>

      {/* ── ABA CATEGORIAS ── */}
      {activeTab === "categorias" && (
        <div className="space-y-4">
          {/* Toggle cards/chart */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${viewMode === "cards" ? "bg-green-600 text-white border-green-600" : "hover:bg-muted"}`}
            >
              <List className="w-3 h-3" /> Tabela
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${viewMode === "chart" ? "bg-green-600 text-white border-green-600" : "hover:bg-muted"}`}
            >
              <BarChart2 className="w-3 h-3" /> Gráfico
            </button>
          </div>

          {/* Gráfico de pizza */}
          {viewMode === "chart" && (
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-semibold mb-4 text-sm">Distribuição por Categoria</h3>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Cards de categorias */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-8 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat.category] || DollarSign;
                const isExpanded = expandedCategory === cat.category;

                return (
                  <div key={cat.category} className="bg-card border rounded-xl overflow-hidden">
                    {/* Header da categoria */}
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedCategory(null);
                        } else {
                          setExpandedCategory(cat.category);
                          setDetailPage(1);
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      {/* Ícone colorido */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cat.color + "22" }}
                      >
                        <Icon className="w-5 h-5" style={{ color: cat.color }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{cat.label}</span>
                          <span className="font-bold text-lg text-foreground flex-shrink-0">{fmt(cat.total)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{cat.count} registros</span>
                          <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}% do total</span>
                        </div>
                        {/* Barra de progresso */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Subcategorias resumo */}
                    {!isExpanded && cat.subcategories.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {cat.subcategories.slice(0, 5).map(sub => (
                          <span
                            key={sub.label}
                            className="text-xs px-2 py-1 rounded-full border"
                            style={{ borderColor: cat.color + "44", color: cat.color }}
                          >
                            {sub.label}: {fmtShort(sub.total)}
                          </span>
                        ))}
                        {cat.subcategories.length > 5 && (
                          <span className="text-xs text-muted-foreground px-2 py-1">
                            +{cat.subcategories.length - 5} mais
                          </span>
                        )}
                      </div>
                    )}

                    {/* Detalhe expandido */}
                    {isExpanded && (
                      <div className="border-t">
                        {/* Subcategorias */}
                        {cat.subcategories.length > 0 && (
                          <div className="px-4 py-3 bg-muted/30 flex flex-wrap gap-2">
                            {cat.subcategories.map(sub => (
                              <div
                                key={sub.label}
                                className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5"
                              >
                                <span className="text-xs text-muted-foreground">{sub.label}</span>
                                <span className="text-xs font-semibold">{fmt(sub.total)}</span>
                                <span className="text-xs text-muted-foreground">({sub.count}x)</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tabela de detalhes */}
                        <div className="p-4">
                          {detailQuery.isLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                              Carregando detalhes...
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">
                                  {detailQuery.data?.total || 0} registros — Total: <strong>{fmt(detailQuery.data?.totalAmount || 0)}</strong>
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                                      <th className="text-left px-3 py-2 font-medium">Data</th>
                                      <th className="text-left px-3 py-2 font-medium">Descrição</th>
                                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Subcategoria</th>
                                      <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Local</th>
                                      <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Fonte</th>
                                      <th className="text-right px-3 py-2 font-medium">Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {(detailQuery.data?.rows || []).map((row, i) => (
                                      <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                          {row.date}
                                        </td>
                                        <td className="px-3 py-2 max-w-xs">
                                          <div className="truncate" title={row.description}>
                                            {row.description}
                                          </div>
                                          {row.notes && (
                                            <div className="text-xs text-muted-foreground truncate" title={row.notes}>
                                              {row.notes}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 hidden md:table-cell">
                                          <span
                                            className="text-xs px-2 py-0.5 rounded-full border"
                                            style={{ borderColor: cat.color + "44", color: cat.color }}
                                          >
                                            {row.subcategory}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground text-xs hidden lg:table-cell">
                                          {row.location}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground text-xs hidden lg:table-cell">
                                          {row.source}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                                          {fmt(row.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Paginação */}
                              {(detailQuery.data?.totalPages || 0) > 1 && (
                                <div className="flex items-center justify-between mt-3 text-sm">
                                  <span className="text-muted-foreground">
                                    Página {detailPage} de {detailQuery.data?.totalPages}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                                      disabled={detailPage === 1}
                                      className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                      Anterior
                                    </button>
                                    <button
                                      onClick={() => setDetailPage(p => p + 1)}
                                      disabled={detailPage >= (detailQuery.data?.totalPages || 1)}
                                      className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                      Próxima
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA LOCAIS ── */}
      {activeTab === "locais" && (
        <div className="space-y-4">
          {/* Gráfico de barras */}
          {barData.length > 0 && (
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-semibold mb-4 text-sm">Custos por Local de Trabalho</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={LOCATION_COLORS[i % LOCATION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cards por local */}
          {locationQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border rounded-xl p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum dado encontrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((loc, idx) => (
                <div key={`${loc.locationId}_${idx}`} className="bg-card border rounded-xl overflow-hidden">
                  {/* Header do local */}
                  <div
                    className="flex items-center justify-between p-4"
                    style={{ borderLeft: `4px solid ${LOCATION_COLORS[idx % LOCATION_COLORS.length]}` }}
                  >
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{loc.locationName}</h3>
                      <p className="text-muted-foreground text-sm">{loc.categories.length} categorias de custo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{fmt(loc.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {locationQuery.data?.totalGeral
                          ? `${((loc.total / locationQuery.data.totalGeral) * 100).toFixed(1)}% do total`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Tabela de categorias por local */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                          <th className="text-left px-4 py-2 font-medium">Categoria</th>
                          <th className="text-right px-4 py-2 font-medium">Valor</th>
                          <th className="text-right px-4 py-2 font-medium hidden md:table-cell">% do Local</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loc.categories.map((cat, i) => (
                          <tr key={cat.category} className={`hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: LOCATION_COLORS[idx % LOCATION_COLORS.length] }}
                                />
                                {cat.category}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">{fmt(cat.total)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                              {loc.total > 0 ? `${((cat.total / loc.total) * 100).toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-bold">
                          <td className="px-4 py-2.5">Total {loc.locationName}</td>
                          <td className="px-4 py-2.5 text-right">{fmt(loc.total)}</td>
                          <td className="px-4 py-2.5 text-right hidden md:table-cell">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}

              {/* Total Geral */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                <span className="font-semibold text-slate-200">Total Geral (todos os locais)</span>
                <span className="text-2xl font-bold">{fmt(locationQuery.data?.totalGeral || 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
