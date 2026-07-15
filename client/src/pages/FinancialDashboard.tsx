import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, DollarSign, BarChart2,
  Filter, ChevronDown, ChevronUp, MapPin,
  Layers, ArrowUpRight, ArrowDownRight, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const COLORS = [
  "#16a34a","#2563eb","#dc2626","#d97706","#7c3aed",
  "#0891b2","#db2777","#65a30d","#ea580c","#6366f1",
];

const CAT_COLORS: Record<string, string> = {
  "Receita de Cargas": "#16a34a",
  "Receita Confirmada": "#22c55e",
  "Receita Manual": "#4ade80",
  "Combustível": "#f59e0b",
  "Manutenção": "#ef4444",
  "Folha de Pagamento": "#6366f1",
  "Gastos Extras": "#f97316",
  "Terceirizados": "#8b5cf6",
  "Despesa Manual": "#64748b",
};

export default function FinancialDashboard() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(lastDay);
  const [filterType, setFilterType] = useState<"all" | "receita" | "custo">("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = trpc.financialDashboard.consolidated.useQuery(
    { dateFrom, dateTo },
    { staleTime: 60_000 }
  );

  const transactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions
      .filter(t => {
        if (filterType !== "all" && t.type !== filterType) return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterLocation && t.location !== filterLocation) return false;
        if (search) {
          const q = search.toLowerCase();
          return t.description.toLowerCase().includes(q) ||
            t.source.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const cmp = a.date.localeCompare(b.date);
          return sortDir === "asc" ? cmp : -cmp;
        }
        const cmp = a.amount - b.amount;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [data, filterType, filterCategory, filterLocation, search, sortField, sortDir]);

  const totalFiltered = useMemo(() => ({
    receitas: transactions.filter(t => t.type === "receita").reduce((s, t) => s + t.amount, 0),
    custos: transactions.filter(t => t.type === "custo").reduce((s, t) => s + t.amount, 0),
  }), [transactions]);

  const paginated = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);

  const locations = useMemo(() => {
    const locs = new Set(data?.transactions?.map(t => t.location).filter(Boolean) ?? []);
    return Array.from(locs).sort();
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.byCategory) return [];
    return data.byCategory
      .filter(c => c.type === "custo")
      .slice(0, 8)
      .map(c => ({ name: c.category, value: c.total }));
  }, [data]);

  const barData = useMemo(() => {
    if (!data?.byLocation) return [];
    return data.byLocation.slice(0, 10).map(l => ({
      name: l.location.length > 14 ? l.location.slice(0, 14) + "…" : l.location,
      fullName: l.location,
      Receitas: l.receitas,
      Custos: l.custos,
    }));
  }, [data]);

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="text-green-600" size={26} />
              Dashboard Financeiro Completo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Consolidação de todas as receitas e custos do sistema
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw size={14} />
            Atualizar
          </Button>
        </div>

        {/* Filtros de período */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-40" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim</label>
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "receita", "custo"] as const).map(t => (
                  <Button key={t} size="sm"
                    variant={filterType === t ? "default" : "outline"}
                    onClick={() => { setFilterType(t); setPage(1); }}
                    className={filterType === t && t === "receita" ? "bg-green-600 hover:bg-green-700" :
                      filterType === t && t === "custo" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    {t === "all" ? "Todos" : t === "receita" ? "Receitas" : "Custos"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="pt-6 pb-4 h-28 animate-pulse bg-muted/30 rounded-lg" /></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total Receitas</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                      {fmt(data?.kpis.totalReceitas ?? 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <ArrowUpRight className="text-green-600" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">Total Custos</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
                      {fmt(data?.kpis.totalCustos ?? 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <ArrowDownRight className="text-red-600" size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${(data?.kpis.saldo ?? 0) >= 0 ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-red-400 bg-red-50 dark:bg-red-950/20"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${(data?.kpis.saldo ?? 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      Saldo do Período
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${(data?.kpis.saldo ?? 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {fmt(data?.kpis.saldo ?? 0)}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${(data?.kpis.saldo ?? 0) >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                    <DollarSign className={(data?.kpis.saldo ?? 0) >= 0 ? "text-green-600" : "text-red-600"} size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos */}
        {!isLoading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" />
                  Receitas vs Custos por Local de Trabalho
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: number, name: string) => [fmt(v), name]}
                        labelFormatter={(label, payload) => (payload?.[0] as any)?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="#16a34a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Custos" fill="#dc2626" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers size={16} className="text-orange-600" />
                  Distribuição de Custos por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem custos no período</div>
                ) : (
                  <div className="flex gap-4 items-center">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" paddingAngle={2}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                          <span className="font-medium text-foreground">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumo por Categoria */}
        {!isLoading && data?.byCategory && data.byCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                Resumo por Categoria
                <span className="text-xs text-muted-foreground font-normal">(clique para filtrar)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.byCategory.map((c, i) => (
                  <div key={i}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${filterCategory === c.category ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => { setFilterCategory(filterCategory === c.category ? "" : c.category); setPage(1); }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground truncate">{c.category}</span>
                      <Badge variant={c.type === "receita" ? "default" : "destructive"} className="text-xs px-1 py-0">
                        {c.type === "receita" ? "+" : "-"}
                      </Badge>
                    </div>
                    <p className={`text-sm font-bold ${c.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                      {fmt(c.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.count} lançamento{c.count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela detalhada */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter size={16} />
                Lançamentos Detalhados
                <Badge variant="outline" className="ml-1">{transactions.length}</Badge>
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Buscar descrição, origem..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-52 h-8 text-sm"
                />
                <select
                  value={filterLocation}
                  onChange={e => { setFilterLocation(e.target.value); setPage(1); }}
                  className="h-8 text-sm border rounded-md px-2 bg-background text-foreground"
                >
                  <option value="">Todos os locais</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {(filterCategory || filterLocation || search || filterType !== "all") && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs"
                    onClick={() => { setFilterCategory(""); setFilterLocation(""); setSearch(""); setFilterType("all"); setPage(1); }}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
            {(filterType !== "all" || filterCategory || filterLocation) && (
              <div className="flex gap-2 flex-wrap mt-2 items-center">
                {filterType !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterType("all")}>
                    {filterType === "receita" ? "Receitas" : "Custos"} ×
                  </Badge>
                )}
                {filterCategory && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterCategory("")}>
                    {filterCategory} ×
                  </Badge>
                )}
                {filterLocation && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterLocation("")}>
                    {filterLocation} ×
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Receitas: <strong className="text-green-600">{fmt(totalFiltered.receitas)}</strong>
                  {" | "}
                  Custos: <strong className="text-red-600">{fmt(totalFiltered.custos)}</strong>
                  {" | "}
                  Saldo: <strong className={totalFiltered.receitas - totalFiltered.custos >= 0 ? "text-green-600" : "text-red-600"}>
                    {fmt(totalFiltered.receitas - totalFiltered.custos)}
                  </strong>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando lançamentos...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum lançamento encontrado no período.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => toggleSort("date")}>
                          Data {sortField === "date" && (sortDir === "asc" ? <ChevronUp className="inline" size={12} /> : <ChevronDown className="inline" size={12} />)}
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoria</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Descrição</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Local</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Origem</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => toggleSort("amount")}>
                          Valor {sortField === "amount" && (sortDir === "asc" ? <ChevronUp className="inline" size={12} /> : <ChevronDown className="inline" size={12} />)}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((t) => (
                        <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              className={`text-xs ${t.type === "receita" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"}`}
                            >
                              {t.type === "receita" ? "Receita" : "Custo"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: (CAT_COLORS[t.category] || "#6b7280") + "20",
                                color: CAT_COLORS[t.category] || "#6b7280",
                              }}>
                              {t.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <span className="truncate block" title={t.description}>{t.description}</span>
                            {t.subcategory && t.subcategory !== t.category && (
                              <span className="text-xs text-muted-foreground">{t.subcategory}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{t.location || "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs font-normal">{t.source}</Badge>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${t.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                            {t.type === "receita" ? "+" : "-"}{fmt(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, transactions.length)} de {transactions.length}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = page <= 3 ? i + 1 : page - 2 + i;
                        if (p < 1 || p > totalPages) return null;
                        return (
                          <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)}>
                            {p}
                          </Button>
                        );
                      })}
                      <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
