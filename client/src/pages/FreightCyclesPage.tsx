// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Truck, MapPin, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, RefreshCw, Navigation, DollarSign, Fuel, Wrench,
  ArrowRight, Timer, Route, Settings, Eye, X
} from "lucide-react";
import { MapView } from "@/components/Map";

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  em_fazenda: "Na Fazenda",
  em_transito: "Em Trânsito",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  em_fazenda: "bg-green-100 text-green-700 border-green-200",
  em_transito: "bg-blue-100 text-blue-700 border-blue-200",
  concluido: "bg-gray-100 text-gray-700 border-gray-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  em_fazenda: <MapPin className="w-3 h-3" />,
  em_transito: <Truck className="w-3 h-3" />,
  concluido: <CheckCircle2 className="w-3 h-3" />,
  cancelado: <XCircle className="w-3 h-3" />,
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(val?: string | null) {
  if (!val || val === "0") return "R$ 0,00";
  return `R$ ${parseFloat(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// ─── Painel de status em tempo real ─────────────────────────────────────────

function RealtimePanel({ onRefresh }: { onRefresh: () => void }) {
  const { data: status, isLoading, refetch } = trpc.freightCycles.realtimeStatus.useQuery(undefined, {
    refetchInterval: 30_000, // atualiza a cada 30s
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Status em Tempo Real</h3>
        <Button variant="ghost" size="sm" onClick={() => { refetch(); onRefresh(); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}

      {status?.map((item, i) => (
        <Card key={i} className={`border-l-4 ${item.insideGeofence ? "border-l-green-500" : "border-l-blue-500"}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {item.equipment?.name ?? `Equipamento #${item.geofence.equipmentId}`}
                  </span>
                  {item.equipment?.licensePlate && (
                    <Badge variant="outline" className="text-xs shrink-0">{item.equipment.licensePlate}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{item.geofence.name}</span>
                </div>
              </div>
              <div className="shrink-0">
                {item.insideGeofence ? (
                  <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                    <MapPin className="w-3 h-3 mr-1" /> Na Fazenda
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                    <Navigation className="w-3 h-3 mr-1" /> Em Trânsito
                  </Badge>
                )}
              </div>
            </div>

            {item.activeCycle && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                <div>Ciclo #{item.activeCycle.id} — {STATUS_LABEL[item.activeCycle.status]}</div>
                {item.activeCycle.arrivedFarmAt && (
                  <div>Chegou: {fmt(item.activeCycle.arrivedFarmAt)}</div>
                )}
                {item.activeCycle.leftFarmAt && (
                  <div>Saiu: {fmt(item.activeCycle.leftFarmAt)}</div>
                )}
                {item.activeCycle.destination && (
                  <div>Destino: {item.activeCycle.destination}</div>
                )}
              </div>
            )}

            {!item.traccarLinked && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                Dispositivo Traccar não vinculado
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {status?.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhuma geofence configurada. Crie uma geofence para monitorar um veículo.
        </p>
      )}
    </div>
  );
}

// ─── Modal de nova geofence ──────────────────────────────────────────────────

function NewGeofenceModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("500");
  const [equipmentId, setEquipmentId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const prevOpen = useRef(false);

  // Reinicializa o mapa quando o modal abre (delay para o DOM estar visível)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setTimeout(() => setMapKey(k => k + 1), 250);
    }
    prevOpen.current = open;
  }, [open]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: equipmentList } = trpc.traccar.devices.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();

  const createMutation = trpc.freightCycles.createGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence criada com sucesso!");
      utils.freightCycles.listGeofences.invalidate();
      utils.freightCycles.realtimeStatus.invalidate();
      onCreated();
      setOpen(false);
      setName(""); setLat(""); setLng(""); setRadius("500"); setEquipmentId(""); setNotes("");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  // Buscar equipamentos do sistema
  const { data: sysEquipment } = trpc.sectors.listEquipment.useQuery({}, { enabled: open });

  function handleMapClick(e: { latLng: { lat: () => number; lng: () => number } | null }) {
    if (!pickingOnMap || !e.latLng) return;
    setLat(String(e.latLng.lat().toFixed(7)));
    setLng(String(e.latLng.lng().toFixed(7)));
    setPickingOnMap(false);
    toast.success("Localização selecionada!");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Geofence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Geofence da Fazenda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da área *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Fazenda São João — Pátio de Carregamento" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude *</Label>
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="-23.5505" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="-46.6333" />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`w-full gap-2 ${pickingOnMap ? "bg-blue-50 border-blue-400" : ""}`}
            onClick={() => setPickingOnMap(!pickingOnMap)}
          >
            <MapPin className="w-4 h-4" />
            {pickingOnMap ? "Clique no mapa para selecionar..." : "Selecionar no mapa"}
          </Button>

          {/* Mini mapa para seleção */}
          <div className="rounded-lg overflow-hidden border" style={{ height: '220px' }}>
            <MapView
              key={mapKey}
              className="w-full h-full"
              initialCenter={lat && lng
                ? { lat: parseFloat(lat), lng: parseFloat(lng) }
                : { lat: -23.5505, lng: -46.6333 }
              }
              initialZoom={lat && lng ? 15 : 10}
              onMapReady={(map) => {
                map.addListener("click", handleMapClick);
              }}
            />
          </div>

          <div>
            <Label>Raio de detecção (metros)</Label>
            <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} min={100} max={5000} />
            <p className="text-xs text-gray-500 mt-1">Padrão: 500m. Ajuste conforme o tamanho da área.</p>
          </div>

          <div>
            <Label>Veículo monitorado</Label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o caminhão..." />
              </SelectTrigger>
              <SelectContent>
                {sysEquipment?.filter((e: any) => e.category === "caminhao" || e.category === "veiculo" || true).map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} {e.licensePlate ? `(${e.licensePlate})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <Button
            className="w-full"
            disabled={!name || !lat || !lng || createMutation.isPending}
            onClick={() => createMutation.mutate({
              name,
              latitude: lat,
              longitude: lng,
              radiusMeters: parseInt(radius) || 500,
              equipmentId: equipmentId ? parseInt(equipmentId) : undefined,
              notes: notes || undefined,
            })}
          >
            {createMutation.isPending ? "Salvando..." : "Criar Geofence"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de ciclo ────────────────────────────────────────────────────────────

function CycleCard({ cycle, onClose, onCancel }: {
  cycle: any;
  onClose: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const [showTrajectory, setShowTrajectory] = useState(false);

  const trajectory: Array<{ lat: number; lng: number }> = (() => {
    try { return cycle.trajectoryJson ? JSON.parse(cycle.trajectoryJson) : []; } catch { return []; }
  })();

  return (
    <Card className={`border-l-4 ${
      cycle.status === "em_fazenda" ? "border-l-green-500" :
      cycle.status === "em_transito" ? "border-l-blue-500" :
      cycle.status === "concluido" ? "border-l-gray-400" :
      "border-l-red-400"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Ciclo #{cycle.id}</span>
              <Badge className={`text-xs border ${STATUS_COLOR[cycle.status]}`}>
                {STATUS_ICON[cycle.status]}
                <span className="ml-1">{STATUS_LABEL[cycle.status]}</span>
              </Badge>
            </div>
            {cycle.driverName && (
              <p className="text-xs text-gray-500 mt-0.5">Motorista: {cycle.driverName}</p>
            )}
            {cycle.destination && (
              <p className="text-xs text-gray-500">Destino: {cycle.destination}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {trajectory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowTrajectory(!showTrajectory)}>
                <Route className="w-4 h-4" />
              </Button>
            )}
            {(cycle.status === "em_fazenda" || cycle.status === "em_transito") && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onClose(cycle.id)} title="Fechar manualmente">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onCancel(cycle.id)} title="Cancelar">
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-1.5 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${cycle.arrivedFarmAt ? "bg-green-500" : "bg-gray-300"}`} />
            <span>Chegou na fazenda: <strong>{fmt(cycle.arrivedFarmAt)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${cycle.leftFarmAt ? "bg-blue-500" : "bg-gray-300"}`} />
            <span>Saiu carregado: <strong>{fmt(cycle.leftFarmAt)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${cycle.returnedFarmAt ? "bg-gray-500" : "bg-gray-300"}`} />
            <span>Retornou: <strong>{fmt(cycle.returnedFarmAt)}</strong></span>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-50 rounded p-2 text-center">
            <Route className="w-3 h-3 mx-auto mb-0.5 text-gray-500" />
            <div className="font-semibold">{cycle.distanceKm ? `${cycle.distanceKm} km` : "—"}</div>
            <div className="text-gray-400">Distância</div>
          </div>
          <div className="bg-amber-50 rounded p-2 text-center">
            <Fuel className="w-3 h-3 mx-auto mb-0.5 text-amber-500" />
            <div className="font-semibold text-amber-700">{fmtCurrency(cycle.totalFuelCost)}</div>
            <div className="text-gray-400">Combustível</div>
          </div>
          <div className="bg-blue-50 rounded p-2 text-center">
            <Wrench className="w-3 h-3 mx-auto mb-0.5 text-blue-500" />
            <div className="font-semibold text-blue-700">{fmtCurrency(cycle.totalMaintenanceCost)}</div>
            <div className="text-gray-400">Manutenção</div>
          </div>
        </div>

        {parseFloat(cycle.totalCost || "0") > 0 && (
          <div className="mt-2 flex items-center justify-between bg-red-50 rounded p-2 text-xs">
            <span className="text-gray-600 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-red-500" /> Custo total do ciclo
            </span>
            <span className="font-bold text-red-700">{fmtCurrency(cycle.totalCost)}</span>
          </div>
        )}

        {/* Mapa do trajeto */}
        {showTrajectory && trajectory.length > 1 && (
          <div className="mt-3 h-48 rounded-lg overflow-hidden border">
            <MapView
              onMapReady={(map) => {
                const bounds = new google.maps.LatLngBounds();
                const path = trajectory.map(p => {
                  const point = new google.maps.LatLng(p.lat, p.lng);
                  bounds.extend(point);
                  return point;
                });
                new google.maps.Polyline({
                  path,
                  geodesic: true,
                  strokeColor: "#2563eb",
                  strokeOpacity: 0.9,
                  strokeWeight: 3,
                  map,
                });
                // Marcador de início
                new google.maps.Marker({
                  position: path[0],
                  map,
                  title: "Saída",
                  label: { text: "S", color: "white", fontWeight: "bold" },
                  icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 },
                });
                // Marcador de fim
                new google.maps.Marker({
                  position: path[path.length - 1],
                  map,
                  title: "Chegada",
                  label: { text: "C", color: "white", fontWeight: "bold" },
                  icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 },
                });
                map.fitBounds(bounds);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function FreightCyclesPage() {
  const utils = trpc.useUtils();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showGeofences, setShowGeofences] = useState(false);

  const { data: cycles, isLoading, refetch } = trpc.freightCycles.listCycles.useQuery({
    status: filterStatus !== "all" ? (filterStatus as any) : undefined,
    limit: 100,
  });

  const { data: geofences, refetch: refetchGeo } = trpc.freightCycles.listGeofences.useQuery();

  const pollMutation = trpc.freightCycles.pollGeofences.useMutation({
    onSuccess: (data) => {
      toast.success(`Polling concluído: ${data.processed} geofence(s) verificada(s)`);
      if (data.log?.length) {
        data.log.forEach((l: string) => toast.info(l, { duration: 5000 }));
      }
      utils.freightCycles.listCycles.invalidate();
      utils.freightCycles.realtimeStatus.invalidate();
    },
    onError: (err) => toast.error("Erro no polling: " + err.message),
  });

  const closeMutation = trpc.freightCycles.closeCycleManually.useMutation({
    onSuccess: () => {
      toast.success("Ciclo encerrado manualmente.");
      utils.freightCycles.listCycles.invalidate();
      utils.freightCycles.realtimeStatus.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const cancelMutation = trpc.freightCycles.cancelCycle.useMutation({
    onSuccess: () => {
      toast.success("Ciclo cancelado.");
      utils.freightCycles.listCycles.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteGeoMutation = trpc.freightCycles.deleteGeofence.useMutation({
    onSuccess: () => {
      toast.success("Geofence removida.");
      utils.freightCycles.listGeofences.invalidate();
      utils.freightCycles.realtimeStatus.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const activeCycles = cycles?.filter(c => c.status === "em_fazenda" || c.status === "em_transito") ?? [];
  const doneCycles = cycles?.filter(c => c.status === "concluido" || c.status === "cancelado") ?? [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Ciclos de Frete
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitoramento automático por geofence GPS — abertura e encerramento automáticos ao entrar/sair da fazenda
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowGeofences(!showGeofences)}
          >
            <Settings className="w-4 h-4" />
            Geofences
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={pollMutation.isPending}
            onClick={() => pollMutation.mutate()}
          >
            <RefreshCw className={`w-4 h-4 ${pollMutation.isPending ? "animate-spin" : ""}`} />
            Verificar Agora
          </Button>
          <NewGeofenceModal onCreated={() => { refetchGeo(); }} />
        </div>
      </div>

      {/* Painel de geofences */}
      {showGeofences && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geofences Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            {geofences?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma geofence configurada ainda.</p>
            )}
            <div className="space-y-2">
              {geofences?.map(geo => (
                <div key={geo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{geo.name}</div>
                    <div className="text-xs text-gray-500">
                      {geo.latitude}, {geo.longitude} · Raio: {geo.radiusMeters}m
                      {geo.equipmentId && ` · Equip. #${geo.equipmentId}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={geo.active ? "default" : "secondary"} className="text-xs">
                      {geo.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGeoMutation.mutate({ id: geo.id })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: status em tempo real */}
        <div className="lg:col-span-1">
          <RealtimePanel onRefresh={() => refetch()} />
        </div>

        {/* Coluna direita: lista de ciclos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {["all", "em_fazenda", "em_transito", "concluido", "cancelado"].map(s => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className="text-xs"
              >
                {s === "all" ? "Todos" : STATUS_LABEL[s]}
              </Button>
            ))}
          </div>

          {/* Ciclos ativos */}
          {activeCycles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-500" /> Ciclos Ativos ({activeCycles.length})
              </h3>
              <div className="space-y-3">
                {activeCycles.map(c => (
                  <CycleCard
                    key={c.id}
                    cycle={c}
                    onClose={(id) => closeMutation.mutate({ cycleId: id })}
                    onCancel={(id) => cancelMutation.mutate({ cycleId: id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {(filterStatus === "all" || filterStatus === "concluido" || filterStatus === "cancelado") && doneCycles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400" /> Histórico ({doneCycles.length})
              </h3>
              <div className="space-y-3">
                {doneCycles.map(c => (
                  <CycleCard
                    key={c.id}
                    cycle={c}
                    onClose={(id) => closeMutation.mutate({ cycleId: id })}
                    onCancel={(id) => cancelMutation.mutate({ cycleId: id })}
                  />
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8 text-gray-400">Carregando ciclos...</div>
          )}

          {!isLoading && cycles?.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum ciclo de frete encontrado.</p>
              <p className="text-xs mt-1">Configure uma geofence e o sistema detectará automaticamente os ciclos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
