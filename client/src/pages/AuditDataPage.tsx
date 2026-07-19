// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, RefreshCw, Database, TrendingUp, TrendingDown, DollarSign, Info, Search, Filter } from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
const todayStr = today.toISOString().slice(0, 10);

export default function AuditDataPage() {
  const { isAdmin } = usePermissions();
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [tipo, setTipo] = useState<"todos" | "custo" | "receita">("todos");
  const [localId, setLocalId] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  const locationsQuery = trpc.reports.locations.useQuery();
  const auditQuery = trpc.auditData.list.useQuery(
    {
      dateFrom,
      dateTo,
      tipo,
      localId: localId !== "todos" ? parseInt(localId) : undefined,
    },
    { enabled: isAdmin }
  );

  const data = auditQuery.data;

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = search.toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) =>
        r.descricao.toLowerCase().includes(q) ||
        r.categoria.toLowerCase().includes(q) ||
        r.subcategoria.toLowerCase().includes(q) ||
        r.origem_tabela.toLowerCase().includes(q) ||
        (r.localNome ?? "").toLowerCase().includes(q) ||
        (r.registradoPor ?? "").toLowerCase().includes(q)
    );
  }, [data?.rows, search]);

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const headers = [
      "Data", "Tipo", "Categoria", "Subcategoria", "Descrição", "Valor (R$)",
      "Local", "Tabela Origem", "Campo Origem", "ID Origem", "Registrado Por", "Observações"
    ];
    const rows = filteredRows.map((r) => [
      r.date,
      r.tipo,
      r.categoria,
      r.subcategoria,
      `"${r.descricao.replace(/"/g, '""')}"`,
      r.valor.toFixed(2).replace(".", ","),
      r.localNome ?? "",
      r.origem_tabela,
      r.origem_campo,
      r.origem_id,
      r.registradoPor ?? "",
      `"${(r.observacoes ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-dados-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Auditoria de Dados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão unificada de todos os registros financeiros com discriminação técnica (tabela, campo, categoria).
              Use para conferência e para comunicar melhorias ao desenvolvedor.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => auditQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredRows.length}>
              <Download className="w-4 h-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">De</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Até</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="custo">Custos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Local de Trabalho</label>
                <Select value={localId} onValueChange={setLocalId}>
                  <SelectTrigger><SelectValue placeholder="Todos os locais" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os locais</SelectItem>
                    {locationsQuery.data?.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, categoria, local, tabela..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant={showTechnical ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTechnical(!showTechnical)}
              >
                <Filter className="w-4 h-4 mr-1" />
                {showTechnical ? "Ocultar técnico" : "Mostrar técnico"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Receita Total</span>
                </div>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
                  {fmt(data.summary.totalReceita)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-medium">Custo Total</span>
                </div>
                <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-1">
                  {fmt(data.summary.totalCusto)}
                </p>
              </CardContent>
            </Card>
            <Card className={`border-${data.summary.lucro >= 0 ? "blue" : "orange"}-200 bg-${data.summary.lucro >= 0 ? "blue" : "orange"}-50 dark:bg-${data.summary.lucro >= 0 ? "blue" : "orange"}-950/20`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Resultado</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${data.summary.lucro >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                  {fmt(data.summary.lucro)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-medium">Registros</span>
                </div>
                <p className="text-xl font-bold mt-1">{filteredRows.length}</p>
                {search && <p className="text-xs text-muted-foreground">de {data.summary.totalRegistros} total</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumo por categoria */}
        {data && data.summary.byCat.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Resumo por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.summary.byCat.map((c) => (
                  <div key={c.categoria} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.tipo === "receita" ? "default" : "destructive"} className="text-xs px-1.5 py-0">
                        {c.tipo === "receita" ? "R" : "C"}
                      </Badge>
                      <span className="text-sm">{c.categoria}</span>
                      <span className="text-xs text-muted-foreground">({c.qtd})</span>
                    </div>
                    <span className={`text-sm font-semibold ${c.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
                      {fmt(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela principal */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4" />
              Registros Detalhados
              {showTechnical && (
                <Badge variant="outline" className="text-xs ml-2">Modo Técnico Ativo</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {auditQuery.isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Carregando dados...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum registro encontrado</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-24">Data</TableHead>
                      <TableHead className="w-20">Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Subcategoria</TableHead>
                      <TableHead className="min-w-[200px]">Descrição</TableHead>
                      <TableHead className="text-right w-32">Valor</TableHead>
                      <TableHead>Local</TableHead>
                      {showTechnical && (
                        <>
                          <TableHead className="text-xs text-muted-foreground">Tabela DB</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Campo DB</TableHead>
                          <TableHead className="text-xs text-muted-foreground w-16">ID</TableHead>
                        </>
                      )}
                      <TableHead>Registrado Por</TableHead>
                      <TableHead>Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm font-mono">
                          {new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={r.tipo === "receita" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {r.tipo === "receita" ? "Receita" : "Custo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.categoria}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.subcategoria}</TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <span className="line-clamp-2">{r.descricao}</span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${r.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
                          {fmt(r.valor)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.localNome ? (
                            <Badge variant="outline" className="text-xs">{r.localNome}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        {showTechnical && (
                          <>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">
                                {r.origem_tabela}
                              </code>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400 max-w-[180px] block truncate">
                                {r.origem_campo}
                              </code>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              #{r.origem_id}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {r.registradoPor ?? "—"}
                        </TableCell>
                        <TableCell>
                          {r.observacoes ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{r.observacoes}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda técnica */}
        {showTechnical && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Legenda das Tabelas do Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {[
                  { tabela: "collaborator_attendance", descricao: "Presenças/diárias de colaboradores", campo: "daily_value" },
                  { tabela: "vehicle_records", descricao: "Registros de veículos (abastecimento e manutenção)", campo: "fuel_cost / maintenance_cost" },
                  { tabela: "fuel_records", descricao: "Abastecimentos de máquinas e motosserras", campo: "total_value" },
                  { tabela: "machine_maintenance", descricao: "Manutenções de máquinas", campo: "total_cost" },
                  { tabela: "extra_expenses", descricao: "Despesas extras avulsas", campo: "amount" },
                  { tabela: "third_party_fuel", descricao: "Combustível de caminhões terceirizados (módulo antigo)", campo: "total" },
                  { tabela: "cargo_loads", descricao: "Cargas com corte terceirizado", campo: "third_party_cost" },
                  { tabela: "financial_entries", descricao: "Lançamentos manuais e automáticos do financeiro", campo: "amount" },
                  { tabela: "buyer_payments", descricao: "Pagamentos de compradores de madeira (Líder, Sonoco...)", campo: "amount [status=pago]" },
                ].map((item) => (
                  <div key={item.tabela} className="flex gap-2 items-start py-1">
                    <code className="text-xs bg-white dark:bg-gray-900 border px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400 shrink-0">
                      {item.tabela}
                    </code>
                    <div>
                      <span className="text-xs text-foreground">{item.descricao}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">Campo: <code className="text-purple-600 dark:text-purple-400">{item.campo}</code></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
