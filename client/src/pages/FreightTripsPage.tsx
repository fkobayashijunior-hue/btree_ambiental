// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Truck,
  MapPin,
  Clock,
  DollarSign,
  Route,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";

type FreightTrip = {
  id: number;
  geofenceId: number;
  vehicleId: number | null;
  vehicleName: string | null;
  driverId: number | null;
  driverName: string | null;
  status: "open" | "closed" | "cancelled";
  originName: string;
  destinationName: string | null;
  entryAt: string;
  exitAt: string | null;
  distanceKm: string | null;
  routeNotes: string | null;
  tollCost: string | null;
  maintenanceCost: string | null;
  fuelCost: string | null;
  totalCost: string | null;
  traccarPositionsJson: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(val: string | null): string {
  const n = parseFloat(val || "0") || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcDuration(entryAt: string, exitAt: string | null): string {
  const start = new Date(entryAt).getTime();
  const end = exitAt ? new Date(exitAt).getTime() : Date.now();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function groupByDate(trips: FreightTrip[]): Record<string, FreightTrip[]> {
  const groups: Record<string, FreightTrip[]> = {};
  for (const trip of trips) {
    const date = trip.entryAt.slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(trip);
  }
  return groups;
}

const statusConfig = {
  open: { label: "Em Andamento", color: "bg-blue-500", icon: AlertCircle },
  closed: { label: "Concluído", color: "bg-green-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-gray-400", icon: X },
};

export default function FreightTripsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed" | "cancelled">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingTrip, setEditingTrip] = useState<FreightTrip | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);

  // Form de edição
  const [editForm, setEditForm] = useState({
    destinationName: "",
    routeNotes: "",
    tollCost: "",
    maintenanceCost: "",
    fuelCost: "",
  });

  // Form de abertura manual
  const [openForm, setOpenForm] = useState({
    geofenceId: "",
    originName: "SIMFLOR",
    destinationName: "",
  });

  const utils = trpc.useUtils();

  const { data: trips = [], isLoading } = trpc.freightTrips.list.useQuery({
    dateFrom,
    dateTo,
    status: statusFilter,
  });

  const { data: geofences = [] } = trpc.geofences.list.useQuery();

  const { data: stats } = trpc.freightTrips.stats.useQuery({
    dateFrom,
    dateTo,
  });

  const updateMutation = trpc.freightTrips.update.useMutation({
    onSuccess: () => {
      utils.freightTrips.list.invalidate();
      utils.freightTrips.stats.invalidate();
      toast.success("Frete atualizado!");
      setEditingTrip(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const closeMutation = trpc.freightTrips.close.useMutation({
    onSuccess: () => {
      utils.freightTrips.list.invalidate();
      utils.freightTrips.stats.invalidate();
      toast.success("Frete fechado manualmente.");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.freightTrips.cancel.useMutation({
    onSuccess: () => {
      utils.freightTrips.list.invalidate();
      utils.freightTrips.stats.invalidate();
      toast.success("Frete cancelado.");
    },
    onError: (e) => toast.error(e.message),
  });

  const openMutation = trpc.freightTrips.open.useMutation({
    onSuccess: () => {
      utils.freightTrips.list.invalidate();
      utils.freightTrips.stats.invalidate();
      toast.success("Frete aberto manualmente.");
      setShowOpenModal(false);
      setOpenForm({ geofenceId: "", originName: "SIMFLOR", destinationName: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(trip: FreightTrip) {
    setEditingTrip(trip);
    setEditForm({
      destinationName: trip.destinationName || "",
      routeNotes: trip.routeNotes || "",
      tollCost: trip.tollCost || "0",
      maintenanceCost: trip.maintenanceCost || "0",
      fuelCost: trip.fuelCost || "0",
    });
  }

  function handleSaveEdit() {
    if (!editingTrip) return;
    updateMutation.mutate({
      id: editingTrip.id,
      destinationName: editForm.destinationName || null,
      routeNotes: editForm.routeNotes || null,
      tollCost: editForm.tollCost,
      maintenanceCost: editForm.maintenanceCost,
      fuelCost: editForm.fuelCost,
    });
  }

  // Calcular custo total em tempo real no form de edição
  const editTotalCost = useMemo(() => {
    const toll = parseFloat(editForm.tollCost) || 0;
    const maint = parseFloat(editForm.maintenanceCost) || 0;
    const fuel = parseFloat(editForm.fuelCost) || 0;
    return (toll + maint + fuel).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, [editForm.tollCost, editForm.maintenanceCost, editForm.fuelCost]);

  const grouped = useMemo(() => groupByDate(trips), [trips]);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-green-600" />
            Fretes GPS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fretes abertos/fechados automaticamente pelas porteiras virtuais
          </p>
        </div>
        <Button
          onClick={() => setShowOpenModal(true)}
          className="bg-green-700 hover:bg-green-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Abrir Frete Manual
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em Andamento</SelectItem>
                  <SelectItem value="closed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total de Fretes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
              <div className="text-xs text-muted-foreground">Em Andamento</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalKm} km</div>
              <div className="text-xs text-muted-foreground">Km Percorridos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalCost)}
              </div>
              <div className="text-xs text-muted-foreground">Custo Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de fretes agrupada por data */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando fretes...</div>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum frete encontrado no período.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {formatDate(date + "T12:00:00")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({grouped[date].length} frete{grouped[date].length > 1 ? "s" : ""})
                </span>
              </div>

              <div className="space-y-3">
                {grouped[date].map((trip) => {
                  const sc = statusConfig[trip.status];
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedId === trip.id;

                  return (
                    <Card key={trip.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Linha principal */}
                        <div
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : trip.id)
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${sc.color} text-white text-xs`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {sc.label}
                                </Badge>
                                <span className="font-medium text-sm">
                                  #{trip.id} — {trip.vehicleName || "Veículo desconhecido"}
                                </span>
                                {trip.driverName && (
                                  <span className="text-sm text-muted-foreground">
                                    • {trip.driverName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {trip.originName}
                                  {trip.destinationName && ` → ${trip.destinationName}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(trip.entryAt)}
                                  {trip.exitAt && ` → ${formatDateTime(trip.exitAt)}`}
                                </span>
                                {trip.distanceKm && parseFloat(trip.distanceKm) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Route className="w-3 h-3" />
                                    {trip.distanceKm} km
                                  </span>
                                )}
                                {parseFloat(trip.totalCost || "0") > 0 && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {formatCurrency(trip.totalCost)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7 text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(trip);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Detalhes expandidos */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 p-4 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Entrada</div>
                                <div>{formatDateTime(trip.entryAt)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Saída</div>
                                <div>{formatDateTime(trip.exitAt)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Duração</div>
                                <div>{calcDuration(trip.entryAt, trip.exitAt)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Distância</div>
                                <div>{trip.distanceKm ? `${trip.distanceKm} km` : "—"}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Pedágio</div>
                                <div>{formatCurrency(trip.tollCost)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Manutenção</div>
                                <div>{formatCurrency(trip.maintenanceCost)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Combustível</div>
                                <div>{formatCurrency(trip.fuelCost)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground font-semibold">
                                  Custo Total
                                </div>
                                <div className="font-semibold text-orange-600">
                                  {formatCurrency(trip.totalCost)}
                                </div>
                              </div>
                            </div>

                            {trip.routeNotes && (
                              <div className="text-sm">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Notas de Rota
                                </div>
                                <div className="bg-background rounded p-2 text-sm">
                                  {trip.routeNotes}
                                </div>
                              </div>
                            )}

                            {/* Ações */}
                            {trip.status === "open" && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300"
                                  onClick={() => {
                                    if (confirm("Fechar este frete manualmente?")) {
                                      closeMutation.mutate({ id: trip.id });
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Fechar Frete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => {
                                    if (confirm("Cancelar este frete?")) {
                                      cancelMutation.mutate({ id: trip.id });
                                    }
                                  }}
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição de frete */}
      <Dialog open={!!editingTrip} onOpenChange={(v) => !v && setEditingTrip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Frete #{editingTrip?.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Destino</Label>
              <Input
                value={editForm.destinationName}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, destinationName: e.target.value }))
                }
                placeholder="Ex: Líder - Lobato/PR"
              />
            </div>

            <div>
              <Label>Notas de Rota</Label>
              <Textarea
                value={editForm.routeNotes}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, routeNotes: e.target.value }))
                }
                placeholder="Ex: Passou na oficina, testou nova rota pela PR-323..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Pedágio (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.tollCost}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, tollCost: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Manutenção (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.maintenanceCost}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, maintenanceCost: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Combustível (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.fuelCost}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, fuelCost: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Custo total em tempo real */}
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium">Custo Total Calculado</span>
              <span className="text-lg font-bold text-orange-600">{editTotalCost}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrip(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de abertura manual de frete */}
      <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Frete Manualmente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Porteira Virtual *</Label>
              <Select
                value={openForm.geofenceId}
                onValueChange={(v) => setOpenForm((p) => ({ ...p, geofenceId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a porteira..." />
                </SelectTrigger>
                <SelectContent>
                  {geofences.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Origem</Label>
              <Input
                value={openForm.originName}
                onChange={(e) =>
                  setOpenForm((p) => ({ ...p, originName: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Destino (opcional)</Label>
              <Input
                value={openForm.destinationName}
                onChange={(e) =>
                  setOpenForm((p) => ({ ...p, destinationName: e.target.value }))
                }
                placeholder="Pode preencher depois..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!openForm.geofenceId) {
                  toast.error("Selecione a porteira virtual.");
                  return;
                }
                openMutation.mutate({
                  geofenceId: parseInt(openForm.geofenceId),
                  originName: openForm.originName,
                  destinationName: openForm.destinationName || undefined,
                });
              }}
              disabled={openMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              Abrir Frete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
