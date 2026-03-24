import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/Map";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MapPin, Navigation, Clock, Gauge, Wifi, WifiOff,
  RefreshCw, Route, AlertTriangle, Car, Zap, ZapOff, History,
  Link2, Wrench, Bell, CheckCircle, XCircle, Plus, Trash2, Timer
} from "lucide-react";

// ─── Tipos da API Traccar ────────────────────────────────────────────────────

interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: "online" | "offline" | "unknown";
  lastUpdate: string;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
}

interface TraccarPosition {
  id: number;
  deviceId: number;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // knots
  course: number;
  accuracy: number;
  attributes: {
    ignition?: boolean;
    motion?: boolean;
    batteryLevel?: number;
    power?: number;
    odometer?: number;
    totalDistance?: number;
  };
}

interface TripSummary {
  deviceId: number;
  deviceName: string;
  distance: number; // meters
  averageSpeed: number;
  maxSpeed: number;
  spentFuel: number;
  duration: number; // ms
  startTime: string;
  endTime: string;
  startAddress?: string;
  endAddress?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function knotsToKmh(knots: number) {
  return Math.round(knots * 1.852);
}

function metersToKm(meters: number) {
  return (meters / 1000).toFixed(1);
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function statusColor(status: string) {
  if (status === "online") return "bg-green-500";
  if (status === "offline") return "bg-red-500";
  return "bg-yellow-500";
}

function statusLabel(status: string) {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Desconhecido";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GpsTrackingPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const historyPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [tab, setTab] = useState("mapa");

  // Estados para vinculacao
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkEquipmentId, setLinkEquipmentId] = useState("");
  const [linkTraccarDeviceId, setLinkTraccarDeviceId] = useState("");

  // Estados para planos de manutencao
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planEquipmentId, setPlanEquipmentId] = useState("");
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<string>("outros");
  const [planIntervalHours, setPlanIntervalHours] = useState("");
  const [planLastDoneHours, setPlanLastDoneHours] = useState("0");
  const [planAlertThreshold, setPlanAlertThreshold] = useState("10");

  // Período para relatórios (últimas 24h por padrão)
  const [from] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  });
  const [to] = useState(() => new Date().toISOString());

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: statusData } = trpc.traccar.status.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: devices = [], refetch: refetchDevices } = trpc.traccar.devices.useQuery(undefined, {
    enabled: statusData?.configured === true,
    refetchInterval: 30000,
  }) as { data: TraccarDevice[]; refetch: () => void };

  const { data: positions = [], refetch: refetchPositions } = trpc.traccar.positions.useQuery(undefined, {
    enabled: statusData?.configured === true,
    refetchInterval: 15000,
  }) as { data: TraccarPosition[]; refetch: () => void };

  const { data: trips = [] } = trpc.traccar.trips.useQuery(
    { deviceId: selectedDeviceId!, from, to },
    {
      enabled: !!selectedDeviceId && statusData?.configured === true && tab === "relatorio",
    }
  ) as { data: TripSummary[] };

  const { data: historyPositions = [] } = trpc.traccar.history.useQuery(
    { deviceId: selectedDeviceId!, from, to },
    {
      enabled: !!selectedDeviceId && statusData?.configured === true && tab === "historico",
    }
  ) as { data: TraccarPosition[] };

  // Queries de vinculacao e manutencao
  const { data: deviceLinks = [], refetch: refetchLinks } = trpc.traccar.listDeviceLinks.useQuery() as { data: any[]; refetch: () => void };
  const { data: allAlerts = [], refetch: refetchAlerts } = trpc.traccar.listAlerts.useQuery({}) as { data: any[]; refetch: () => void };
  const { data: alertCount } = trpc.traccar.alertCount.useQuery(undefined, { refetchInterval: 60000 });
  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({}) as { data: any[] };

  const linkDeviceMut = trpc.traccar.linkDevice.useMutation({
    onSuccess: () => { refetchLinks(); setLinkDialogOpen(false); toast.success("Dispositivo vinculado com sucesso"); },
    onError: (e) => toast.error(e.message),
  });
  const unlinkDeviceMut = trpc.traccar.unlinkDevice.useMutation({
    onSuccess: () => { refetchLinks(); toast.success("Vinculo removido"); },
  });
  const upsertPlanMut = trpc.traccar.upsertMaintenancePlan.useMutation({
    onSuccess: () => { setPlanDialogOpen(false); toast.success("Plano salvo"); },
    onError: (e) => toast.error(e.message),
  });
  const resolveAlertMut = trpc.traccar.resolveAlert.useMutation({
    onSuccess: () => { refetchAlerts(); toast.success("Alerta atualizado"); },
  });
  const syncHoursMut = trpc.traccar.syncDailyHours.useMutation({
    onSuccess: (d) => toast.success(`Sincronizado: ${d.synced} equipamentos`),
    onError: (e) => toast.error(e.message),
  });

  // ── Mapa: renderizar marcadores ───────────────────────────────────────────────

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  useEffect(() => {
    if (!mapInstance || positions.length === 0) return;

    const positionMap = new Map<number, TraccarPosition>();
    positions.forEach((p) => positionMap.set(p.deviceId, p));

    devices.forEach((device) => {
      const pos = positionMap.get(device.id);
      if (!pos || !pos.valid) return;

      const latLng = new google.maps.LatLng(pos.latitude, pos.longitude);
      const isOnline = device.status === "online";
      const speed = knotsToKmh(pos.speed);

      if (markersRef.current.has(device.id)) {
        // Atualizar marcador existente
        const marker = markersRef.current.get(device.id)!;
        marker.setPosition(latLng);
        marker.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: isOnline ? "#16a34a" : "#dc2626",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 1,
          rotation: pos.course,
        });
      } else {
        // Criar novo marcador
        const marker = new google.maps.Marker({
          position: latLng,
          map: mapInstance,
          title: device.name,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: isOnline ? "#16a34a" : "#dc2626",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1,
            rotation: pos.course,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family:sans-serif;min-width:180px">
              <strong style="font-size:14px">${device.name}</strong><br/>
              <span style="color:${isOnline ? "#16a34a" : "#dc2626"};font-size:12px">● ${statusLabel(device.status)}</span><br/>
              <hr style="margin:6px 0"/>
              <span style="font-size:12px">🚗 Velocidade: <strong>${speed} km/h</strong></span><br/>
              <span style="font-size:12px">🔑 Ignição: <strong>${pos.attributes.ignition ? "Ligada" : "Desligada"}</strong></span><br/>
              <span style="font-size:12px">🔋 Bateria: <strong>${pos.attributes.batteryLevel ?? "—"}%</strong></span><br/>
              <span style="font-size:12px;color:#888">Atualizado: ${new Date(pos.deviceTime).toLocaleTimeString("pt-BR")}</span>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstance, marker);
          setSelectedDeviceId(device.id);
        });

        markersRef.current.set(device.id, marker);
      }
    });

    // Centralizar no dispositivo selecionado
    if (selectedDeviceId) {
      const pos = positionMap.get(selectedDeviceId);
      if (pos?.valid) {
        mapInstance.panTo({ lat: pos.latitude, lng: pos.longitude });
      }
    }
  }, [mapInstance, positions, devices, selectedDeviceId]);

  // ── Mapa: histórico de rota ───────────────────────────────────────────────────

  useEffect(() => {
    if (!mapInstance) return;

    // Remover polyline anterior
    if (historyPolylineRef.current) {
      historyPolylineRef.current.setMap(null);
      historyPolylineRef.current = null;
    }

    if (tab !== "historico" || historyPositions.length === 0) return;

    const path = historyPositions
      .filter((p) => p.valid)
      .map((p) => ({ lat: p.latitude, lng: p.longitude }));

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563eb",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapInstance,
    });

    historyPolylineRef.current = polyline;

    // Ajustar bounds para mostrar toda a rota
    if (path.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapInstance.fitBounds(bounds);
    }
  }, [mapInstance, historyPositions, tab]);

  // ── Seleção de dispositivo ────────────────────────────────────────────────────

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const selectedPosition = positions.find((p) => p.deviceId === selectedDeviceId);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status !== "online").length;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!statusData?.configured) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Rastreamento GPS não configurado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700 space-y-3">
            <p>
              Para ativar o rastreamento GPS, é necessário instalar o servidor Traccar no VPS da Hostinger
              e configurar as variáveis de ambiente no sistema BTREE.
            </p>
            <p className="font-medium">Variáveis necessárias:</p>
            <div className="bg-amber-100 rounded p-3 font-mono text-sm space-y-1">
              <div><span className="text-amber-900">TRACCAR_URL</span> = http://SEU_IP:8082</div>
              <div><span className="text-amber-900">TRACCAR_EMAIL</span> = admin@btreeambiental.com</div>
              <div><span className="text-amber-900">TRACCAR_PASSWORD</span> = sua_senha</div>
            </div>
            <p className="text-sm">
              Consulte o <strong>Guia de Instalação do Traccar</strong> enviado pelo sistema para o passo a passo completo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Navigation className="h-6 w-6 text-green-600" />
            Rastreamento GPS
          </h1>
          <p className="text-sm text-muted-foreground">
            {devices.length} dispositivos cadastrados · {onlineCount} online · {offlineCount} offline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {statusData.configured ? (
              <><Wifi className="h-3 w-3 text-green-500" /> Traccar conectado</>
            ) : (
              <><WifiOff className="h-3 w-3 text-red-500" /> Desconectado</>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => { refetchDevices(); refetchPositions(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
              <Car className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-xl font-bold text-green-600">{onlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <Car className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Offline</p>
              <p className="text-xl font-bold text-red-500">{offlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em movimento</p>
              <p className="text-xl font-bold text-blue-600">
                {positions.filter((p) => p.attributes.motion && p.speed > 0).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
              <Gauge className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vel. máx. agora</p>
              <p className="text-xl font-bold text-orange-600">
                {positions.length > 0
                  ? `${knotsToKmh(Math.max(...positions.map((p) => p.speed)))} km/h`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal: lista + mapa */}
      <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row">
        {/* Lista de dispositivos */}
        <div className="w-full lg:w-72 flex flex-col gap-2 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Dispositivos
          </p>
          {devices.length === 0 && (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Nenhum dispositivo cadastrado no Traccar ainda.
              </CardContent>
            </Card>
          )}
          {devices.map((device) => {
            const pos = positions.find((p) => p.deviceId === device.id);
            const speed = pos ? knotsToKmh(pos.speed) : 0;
            const isSelected = selectedDeviceId === device.id;

            return (
              <Card
                key={device.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-green-500" : ""}`}
                onClick={() => setSelectedDeviceId(isSelected ? null : device.id)}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{device.name}</span>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColor(device.status)}`} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> {speed} km/h
                    </span>
                    {pos?.attributes.ignition !== undefined && (
                      <span className="flex items-center gap-1">
                        {pos.attributes.ignition
                          ? <><Zap className="h-3 w-3 text-green-500" /> Ligado</>
                          : <><ZapOff className="h-3 w-3 text-gray-400" /> Desligado</>
                        }
                      </span>
                    )}
                  </div>
                  {pos && (
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(pos.deviceTime).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Painel direito: mapa + abas */}
        <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
            <TabsList className="self-start">
              <TabsTrigger value="mapa" className="gap-1">
                <MapPin className="h-4 w-4" /> Mapa ao vivo
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1" disabled={!selectedDeviceId}>
                <History className="h-4 w-4" /> Histórico de rota
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="gap-1" disabled={!selectedDeviceId}>
                <Route className="h-4 w-4" /> Relatório de viagens
              </TabsTrigger>
              <TabsTrigger value="vincular" className="gap-1">
                <Link2 className="h-4 w-4" /> Vincular GPS
              </TabsTrigger>
              <TabsTrigger value="manutencao" className="gap-1">
                <Wrench className="h-4 w-4" /> Manutenção
              </TabsTrigger>
              <TabsTrigger value="alertas" className="gap-1">
                <Bell className="h-4 w-4" />
                Alertas
                {alertCount && alertCount.count > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 px-1 text-xs bg-red-500 text-white">{alertCount.count}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Mapa ao vivo */}
            <TabsContent value="mapa" className="flex-1 mt-2">
              <div className="rounded-lg overflow-hidden border h-full min-h-[400px]">
                <MapView
                  onMapReady={handleMapReady}
                  initialCenter={{ lat: -15.7801, lng: -47.9292 }}
                  initialZoom={5}
                />
              </div>
            </TabsContent>

            {/* Histórico de rota */}
            <TabsContent value="historico" className="flex-1 mt-2 flex flex-col gap-3">
              {selectedDevice && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>Rota de <strong>{selectedDevice.name}</strong> nas últimas 24 horas</span>
                  <Badge variant="secondary">{historyPositions.length} pontos</Badge>
                </div>
              )}
              <div className="rounded-lg overflow-hidden border flex-1 min-h-[400px]">
                <MapView
                  onMapReady={handleMapReady}
                  initialCenter={{ lat: -15.7801, lng: -47.9292 }}
                  initialZoom={5}
                />
              </div>
            </TabsContent>

            {/* Relatório de viagens */}
            <TabsContent value="relatorio" className="mt-2">
              {trips.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nenhuma viagem registrada nas últimas 24 horas para este dispositivo.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total de viagens</p>
                        <p className="text-2xl font-bold">{trips.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Km rodados</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {metersToKm(trips.reduce((s, t) => s + (t.distance || 0), 0))} km
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Vel. máxima</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {knotsToKmh(Math.max(...trips.map((t) => t.maxSpeed || 0)))} km/h
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Início</th>
                          <th className="text-left p-3 font-medium">Fim</th>
                          <th className="text-right p-3 font-medium">Distância</th>
                          <th className="text-right p-3 font-medium">Duração</th>
                          <th className="text-right p-3 font-medium">Vel. média</th>
                          <th className="text-right p-3 font-medium">Vel. máx.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trips.map((trip, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                              {new Date(trip.startTime).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="p-3">
                              {new Date(trip.endTime).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {metersToKm(trip.distance)} km
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {formatDuration(trip.duration)}
                            </td>
                            <td className="p-3 text-right">
                              {knotsToKmh(trip.averageSpeed)} km/h
                            </td>
                            <td className="p-3 text-right text-orange-600 font-medium">
                              {knotsToKmh(trip.maxSpeed)} km/h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
            {/* Aba Vincular GPS */}
            <TabsContent value="vincular" className="mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Vincular Dispositivos GPS a Equipamentos</h3>
                  <p className="text-sm text-muted-foreground">Associe cada rastreador EC33 a um equipamento para contagem automática de horas.</p>
                </div>
                <Button onClick={() => setLinkDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Vincular
                </Button>
              </div>
              {deviceLinks.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum vínculo cadastrado ainda.</CardContent></Card>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Equipamento</th>
                        <th className="text-left p-3 font-medium">Dispositivo GPS</th>
                        <th className="text-left p-3 font-medium">IMEI</th>
                        <th className="text-left p-3 font-medium">Vinculado em</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceLinks.map((link: any) => (
                        <tr key={link.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{link.equipmentName}</td>
                          <td className="p-3">{link.traccarDeviceName || `#${link.traccarDeviceId}`}</td>
                          <td className="p-3 font-mono text-xs">{link.traccarUniqueId || "—"}</td>
                          <td className="p-3 text-muted-foreground">{new Date(link.createdAt).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3">
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => unlinkDeviceMut.mutate({ linkId: link.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" className="gap-2" onClick={() => syncHoursMut.mutate({})} disabled={syncHoursMut.isPending}>
                  <Timer className="h-4 w-4" />
                  {syncHoursMut.isPending ? "Sincronizando..." : "Sincronizar Horas de Hoje"}
                </Button>
                <p className="text-xs text-muted-foreground">Busca as horas de ignição do dia anterior no Traccar e registra automaticamente.</p>
              </div>
            </TabsContent>

            {/* Aba Manutenção Preventiva */}
            <TabsContent value="manutencao" className="mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Planos de Manutenção Preventiva</h3>
                  <p className="text-sm text-muted-foreground">Configure intervalos de manutenção por horas de uso (engraxamento, troca de óleo, filtros, etc.).</p>
                </div>
                <Button onClick={() => setPlanDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Plano
                </Button>
              </div>
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground text-center">
                  Selecione um equipamento vinculado ao GPS para ver seus planos de manutenção.
                  Os alertas são gerados automaticamente quando o horímetro atingir o intervalo configurado.
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Alertas */}
            <TabsContent value="alertas" className="mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Alertas de Manutenção Preventiva</h3>
                <Badge variant="secondary">{allAlerts.filter((a: any) => a.status === "pendente").length} pendentes</Badge>
              </div>
              {allAlerts.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum alerta gerado ainda.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {allAlerts.map((alert: any) => (
                    <Card key={alert.id} className={`border-l-4 ${alert.status === "pendente" ? "border-l-orange-400" : "border-l-green-400"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className={`h-4 w-4 ${alert.status === "pendente" ? "text-orange-500" : "text-green-500"}`} />
                              <span className="font-semibold text-sm">{alert.planName}</span>
                              <Badge variant="outline" className="text-xs">{alert.planType?.replace("_", " ")}</Badge>
                              <Badge className={`text-xs ${alert.status === "pendente" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                {alert.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <strong>{alert.equipmentName}</strong> — Horímetro atual: <strong>{alert.currentHours}h</strong> / Vencimento: <strong>{alert.dueHours}h</strong>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Gerado em {new Date(alert.generatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          {alert.status === "pendente" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300" onClick={() => resolveAlertMut.mutate({ alertId: alert.id, status: "concluido" })}>
                                <CheckCircle className="h-3 w-3" /> Concluído
                              </Button>
                              <Button size="sm" variant="ghost" className="gap-1 text-gray-500" onClick={() => resolveAlertMut.mutate({ alertId: alert.id, status: "ignorado" })}>
                                <XCircle className="h-3 w-3" /> Ignorar
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Dialog: Vincular dispositivo */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular Dispositivo GPS a Equipamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select value={linkEquipmentId} onValueChange={setLinkEquipmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {(equipmentList as any[]).map((eq: any) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dispositivo Traccar</Label>
              <Select value={linkTraccarDeviceId} onValueChange={setLinkTraccarDeviceId}>
                <SelectTrigger><SelectValue placeholder="Selecione o dispositivo GPS" /></SelectTrigger>
                <SelectContent>
                  {(devices as TraccarDevice[]).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.uniqueId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!linkEquipmentId || !linkTraccarDeviceId || linkDeviceMut.isPending}
              onClick={() => {
                const dev = (devices as TraccarDevice[]).find(d => d.id === Number(linkTraccarDeviceId));
                linkDeviceMut.mutate({
                  equipmentId: Number(linkEquipmentId),
                  traccarDeviceId: Number(linkTraccarDeviceId),
                  traccarDeviceName: dev?.name,
                  traccarUniqueId: dev?.uniqueId,
                });
              }}
            >
              {linkDeviceMut.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo plano de manutenção */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Plano de Manutenção Preventiva</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select value={planEquipmentId} onValueChange={setPlanEquipmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {(equipmentList as any[]).map((eq: any) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input placeholder="Ex: Troca de óleo" value={planName} onChange={e => setPlanName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="troca_oleo">Troca de óleo</SelectItem>
                  <SelectItem value="engraxamento">Engraxamento</SelectItem>
                  <SelectItem value="filtro_ar">Filtro de ar</SelectItem>
                  <SelectItem value="filtro_combustivel">Filtro de combustível</SelectItem>
                  <SelectItem value="correia">Correia</SelectItem>
                  <SelectItem value="revisao_geral">Revisão geral</SelectItem>
                  <SelectItem value="abastecimento">Abastecimento</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Intervalo (horas)</Label>
                <Input type="number" placeholder="Ex: 250" value={planIntervalHours} onChange={e => setPlanIntervalHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Última vez (h)</Label>
                <Input type="number" placeholder="0" value={planLastDoneHours} onChange={e => setPlanLastDoneHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Alerta antecipado (h)</Label>
                <Input type="number" placeholder="10" value={planAlertThreshold} onChange={e => setPlanAlertThreshold(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!planEquipmentId || !planName || !planIntervalHours || upsertPlanMut.isPending}
              onClick={() => upsertPlanMut.mutate({
                equipmentId: Number(planEquipmentId),
                name: planName,
                type: planType as any,
                intervalHours: Number(planIntervalHours),
                lastDoneHours: planLastDoneHours,
                alertThresholdHours: Number(planAlertThreshold),
              })}
            >
              {upsertPlanMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Painel de detalhes do dispositivo selecionado */}
      {selectedDevice && selectedPosition && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-green-600" />
              {selectedDevice.name}
              <Badge className={`text-xs ${selectedDevice.status === "online" ? "bg-green-500" : "bg-red-500"}`}>
                {statusLabel(selectedDevice.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Velocidade</p>
                <p className="font-semibold text-lg">{knotsToKmh(selectedPosition.speed)} km/h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ignição</p>
                <p className={`font-semibold ${selectedPosition.attributes.ignition ? "text-green-600" : "text-gray-500"}`}>
                  {selectedPosition.attributes.ignition ? "Ligada" : "Desligada"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bateria</p>
                <p className="font-semibold">
                  {selectedPosition.attributes.batteryLevel !== undefined
                    ? `${selectedPosition.attributes.batteryLevel}%`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última atualização</p>
                <p className="font-semibold">
                  {new Date(selectedPosition.deviceTime).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit",
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coordenadas</p>
                <p className="font-mono text-xs">
                  {selectedPosition.latitude.toFixed(5)}, {selectedPosition.longitude.toFixed(5)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Altitude</p>
                <p className="font-semibold">{Math.round(selectedPosition.altitude)} m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Odômetro</p>
                <p className="font-semibold">
                  {selectedPosition.attributes.totalDistance !== undefined
                    ? `${metersToKm(selectedPosition.attributes.totalDistance)} km`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IMEI</p>
                <p className="font-mono text-xs">{selectedDevice.uniqueId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
