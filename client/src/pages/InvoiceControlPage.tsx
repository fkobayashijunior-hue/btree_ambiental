import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, Clock, FileText, Search, Filter, ExternalLink,
  CheckCheck, X, Truck, Calendar, Package, RefreshCw
} from "lucide-react";

type Invoice = {
  id: number;
  date: string | null;
  deliveryDate: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  clientId: number | null;
  clientName: string | null;
  destinationId: number | null;
  destination: string | null;
  destinationName: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  weightNetKg: string | null;
  weightKg: string | null;
  volumeM3: string | null;
  status: string;
  receivedByBuyer: number;
  invoiceChecked: number;
  invoiceCheckedAt: number | null;
  invoiceCheckedBy: number | null;
  invoiceCheckedByName: string | null;
};

export default function InvoiceControlPage() {
  const [search, setSearch] = useState("");
  const [filterChecked, setFilterChecked] = useState<"all" | "checked" | "pending">("all");
  const [filterDestination, setFilterDestination] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: invoices = [], isLoading, refetch } = trpc.invoiceControl.list.useQuery({
    limit: 200,
  });

  const { data: stats } = trpc.invoiceControl.stats.useQuery();

  const destinations = trpc.cargoLoads.listDestinations.useQuery();

  const toggleMut = trpc.invoiceControl.toggleChecked.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.checked ? "Nota marcada como conferida" : "Marcação removida");
      refetch();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const filtered = useMemo(() => {
    let list = [...invoices] as Invoice[];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.invoiceNumber?.toLowerCase().includes(s) ||
        i.clientName?.toLowerCase().includes(s) ||
        i.destinationName?.toLowerCase().includes(s) ||
        i.vehiclePlate?.toLowerCase().includes(s) ||
        i.driverName?.toLowerCase().includes(s)
      );
    }
    if (filterChecked === "checked") list = list.filter(i => i.invoiceChecked === 1);
    if (filterChecked === "pending") list = list.filter(i => i.invoiceChecked === 0);
    if (filterDestination !== "all") list = list.filter(i => String(i.destinationId) === filterDestination);
    if (dateFrom) list = list.filter(i => {
      const d = i.deliveryDate || i.date;
      return d && d >= dateFrom;
    });
    if (dateTo) list = list.filter(i => {
      const d = i.deliveryDate || i.date;
      return d && d <= dateTo;
    });
    return list;
  }, [invoices, search, filterChecked, filterDestination, dateFrom, dateTo]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const formatCheckedAt = (ts: number | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("pt-BR");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            Controle de Notas Fiscais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Listagem de todas as notas de cargas entregues com status de conferência
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Total de Notas</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Conferidas</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats?.checked ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats?.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCheck className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Com NF</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats?.withInvoice ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NF, cliente, destino, placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterChecked} onValueChange={v => setFilterChecked(v as any)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status conferência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="checked">Conferidas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDestination} onValueChange={setFilterDestination}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os destinos</SelectItem>
                {(destinations.data || []).map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1" />
              <span className="text-muted-foreground text-sm">até</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1" />
            </div>
            {(search || filterChecked !== "all" || filterDestination !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearch(""); setFilterChecked("all"); setFilterDestination("all");
                setDateFrom(""); setDateTo("");
              }} className="gap-1 text-muted-foreground">
                <X className="w-3 h-3" /> Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Carregando notas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <FileText className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">Nenhuma nota encontrada</p>
          <p className="text-sm">Ajuste os filtros ou aguarde novas cargas entregues</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{filtered.length} nota(s) encontrada(s)</p>
          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">NF</th>
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Destino</th>
                  <th className="text-left p-3 font-medium">Placa</th>
                  <th className="text-right p-3 font-medium">Peso Líq.</th>
                  <th className="text-center p-3 font-medium">Recebido</th>
                  <th className="text-center p-3 font-medium">Conferida</th>
                  <th className="text-center p-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr key={inv.id} className={`border-t transition-colors ${inv.invoiceChecked === 1 ? 'bg-green-50/50 dark:bg-green-950/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(inv.deliveryDate || inv.date)}
                      {inv.deliveryDate && inv.deliveryDate !== inv.date && (
                        <div className="text-xs text-muted-foreground/60">reg: {formatDate(inv.date)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {inv.invoiceNumber ? (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{inv.invoiceNumber}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">S/N</span>
                        )}
                        {inv.invoiceUrl && (
                          <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{inv.clientName || "—"}</td>
                    <td className="p-3 text-muted-foreground">{inv.destinationName || "—"}</td>
                    <td className="p-3">
                      {inv.vehiclePlate ? (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-muted-foreground" />
                          {inv.vehiclePlate}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {inv.weightNetKg ? `${(parseFloat(inv.weightNetKg)/1000).toFixed(3)} ton` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      {inv.receivedByBuyer === 1 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Recebido</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Pendente</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {inv.invoiceChecked === 1 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Conferida
                          </Badge>
                          {inv.invoiceCheckedByName && (
                            <span className="text-xs text-muted-foreground">{inv.invoiceCheckedByName.replace(' (auto-recebimento)', '')}</span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 text-xs">Não conferida</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant={inv.invoiceChecked === 1 ? "outline" : "default"}
                        className={`text-xs h-7 gap-1 ${inv.invoiceChecked === 1 ? 'text-red-600 border-red-200 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        onClick={() => toggleMut.mutate({ id: inv.id, checked: inv.invoiceChecked === 0 })}
                        disabled={toggleMut.isPending}
                      >
                        {inv.invoiceChecked === 1 ? (
                          <><X className="w-3 h-3" /> Desmarcar</>
                        ) : (
                          <><CheckCheck className="w-3 h-3" /> Conferir</>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(inv => (
              <Card key={inv.id} className={`border shadow-sm ${inv.invoiceChecked === 1 ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {inv.invoiceNumber ? (
                          <span className="font-mono text-sm font-bold">NF {inv.invoiceNumber}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Sem número de NF</span>
                        )}
                        {inv.invoiceUrl && (
                          <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {inv.invoiceChecked === 1 ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Conferida
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 text-xs">Não conferida</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{inv.clientName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="font-medium">{inv.destinationName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Placa</p>
                      <p>{inv.vehiclePlate || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Peso Líq.</p>
                      <p>{inv.weightNetKg ? `${(parseFloat(inv.weightNetKg)/1000).toFixed(3)} ton` : "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex items-center gap-2">
                      {inv.receivedByBuyer === 1 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Recebido</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Pend. Recebimento</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={inv.invoiceChecked === 1 ? "outline" : "default"}
                      className={`text-xs h-8 gap-1 ${inv.invoiceChecked === 1 ? 'text-red-600 border-red-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      onClick={() => toggleMut.mutate({ id: inv.id, checked: inv.invoiceChecked === 0 })}
                      disabled={toggleMut.isPending}
                    >
                      {inv.invoiceChecked === 1 ? (
                        <><X className="w-3 h-3" /> Desmarcar</>
                      ) : (
                        <><CheckCheck className="w-3 h-3" /> Conferir</>
                      )}
                    </Button>
                  </div>

                  {inv.invoiceChecked === 1 && inv.invoiceCheckedByName && (
                    <p className="text-xs text-muted-foreground">
                      Conferida por {inv.invoiceCheckedByName} em {formatCheckedAt(inv.invoiceCheckedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
