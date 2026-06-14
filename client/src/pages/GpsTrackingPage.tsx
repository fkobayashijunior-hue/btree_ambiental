import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MapPin, Navigation, Clock, Gauge, Wifi, WifiOff,
  RefreshCw, Route, AlertTriangle, Car, Zap, ZapOff, History,
  Link2, Wrench, Bell, CheckCircle, XCircle, Plus, Trash2, Timer,
  Calendar, Search, Truck, DollarSign, ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
    hours?: number;
  };
}

interface TripSummary {
  deviceId: number;
  deviceName: string;
  distance: number; // meters or km (depends on Traccar config)
  averageSpeed: number;
  maxSpeed: number;
  spentFuel: number;
  startOdometer: number;
  endOdometer: number;
  duration: number; // ms
  startTime: string;
  endTime: string;
  startAddress?: string;
  endAddress?: string;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  realDistance?: number; // distância corrigida em km (calculada pelo backend)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function knotsToKmh(knots: number) {
  return Math.round(knots * 1.852);
}

function smartDistanceToKm(distance: number) {
  // Traccar returns distance in km after config change
  // Values > 1000 are likely in meters (legacy data)
  if (distance > 1000) {
    return (distance / 1000).toFixed(1);
  }
  return distance.toFixed(1);
}

// Simplificar endereço para exibição mobile
function shortAddress(addr: string | null | undefined): string {
  if (!addr) return '—';
  // Remove "BR" e estado, mantém rua/rodovia + cidade
  const parts = addr.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const road = parts[0];
    const city = parts[1];
    return `${road}, ${city}`;
  }
  return addr;
}

// Identificar se é rota SIMFLOR→Líder ou Líder→SIMFLOR
function identifyRoute(startAddr: string | null | undefined, endAddr: string | null | undefined, distKm: number): { label: string; type: 'ida' | 'volta' | 'local' | 'desconhecido' } {
  const s = (startAddr || '').toLowerCase();
  const e = (endAddr || '').toLowerCase();
  const isLobato = (a: string) => a.includes('lobato') || a.includes('líder') || a.includes('lider') || a.includes('pr-461') || a.includes('pr 461');
  const isMaua = (a: string) => a.includes('mauá da serra') || a.includes('maua da serra') || a.includes('simflor') || a.includes('maua');
  const isOrtigueira = (a: string) => a.includes('ortigueira');
  const isFaxinal = (a: string) => a.includes('faxinal');
  
  // Viagens longas (>50km) são provavelmente ida/volta SIMFLOR↔Líder
  if (distKm > 50) {
    // Ida: qualquer origem na região de Mauá/Faxinal/Ortigueira → Lobato
    if ((isMaua(s) || isFaxinal(s) || isOrtigueira(s)) && isLobato(e)) return { label: '🟢 IDA: SIMFLOR → Líder (Lobato)', type: 'ida' };
    if (isMaua(s) && !isLobato(e) && distKm > 100) return { label: '🟢 IDA: SIMFLOR → Destino', type: 'ida' };
    
    // Volta: Lobato → região de Mauá/Faxinal/Ortigueira
    if (isLobato(s) && (isMaua(e) || isFaxinal(e) || isOrtigueira(e))) return { label: '🔵 VOLTA: Líder → SIMFLOR', type: 'volta' };
    if (isLobato(s) && distKm > 100) return { label: '🔵 VOLTA: Líder → Origem', type: 'volta' };
    
    // Viagem longa genérica (>100km) sem endereço reconhecido
    if (distKm > 100) {
      if (isMaua(s)) return { label: '🟢 IDA: SIMFLOR → ?', type: 'ida' };
      if (isMaua(e)) return { label: '🔵 VOLTA: ? → SIMFLOR', type: 'volta' };
      return { label: '🚛 Viagem Longa', type: 'desconhecido' };
    }
    
    // Via Sabáudia
    if (s.includes('sabáudia') || s.includes('sabaudia')) return { label: '🟢 IDA via Sabáudia', type: 'ida' };
    if (e.includes('sabáudia') || e.includes('sabaudia')) return { label: '🔵 VOLTA via Sabáudia', type: 'volta' };
    
    return { label: '🚛 Viagem +50km', type: 'desconhecido' };
  }
  
  // Viagens médias (15-50km) podem ser Mauá↔Ortigueira
  if (distKm > 15 && distKm <= 50) {
    if (isMaua(s) && isOrtigueira(e)) return { label: 'Mauá → Ortigueira', type: 'local' };
    if (isOrtigueira(s) && isMaua(e)) return { label: 'Ortigueira → Mauá', type: 'local' };
    if (isMaua(s) && isFaxinal(e)) return { label: 'Mauá → Faxinal', type: 'local' };
    if (isFaxinal(s) && isMaua(e)) return { label: 'Faxinal → Mauá', type: 'local' };
    return { label: 'Regional', type: 'local' };
  }
  
  // Viagens curtas (<15km) são deslocamentos locais
  if (distKm < 5) return { label: 'Local', type: 'local' };
  if (distKm >= 5 && distKm <= 15) return { label: 'Deslocamento', type: 'local' };
  
  return { label: '', type: 'desconhecido' };
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

function toLocalDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToISO(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr + "T00:00:00");
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

// Criar ícone de seta para marcador Leaflet
function createArrowIcon(color: string, rotation: number) {
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <g transform="rotate(${rotation}, 14, 14)">
      <polygon points="14,2 22,24 14,18 6,24" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    </g>
  </svg>`;
  return L.divIcon({
    html: svgStr,
    className: "leaflet-arrow-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Criar ícone de círculo para dispositivo parado
function createCircleIcon(color: string) {
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: svgStr,
    className: "leaflet-circle-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

// ─── Componente de Mapa Leaflet ──────────────────────────────────────────────

function LeafletMap({
  devices,
  positions,
  selectedDeviceId,
  onSelectDevice,
  historyPositions,
  showHistory,
  className,
}: {
  devices: TraccarDevice[];
  positions: TraccarPosition[];
  selectedDeviceId: number | null;
  onSelectDevice: (id: number | null) => void;
  historyPositions?: TraccarPosition[];
  showHistory?: boolean;
  className?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-15.7801, -47.9292],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Atualizar marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map || positions.length === 0) return;

    const positionMap = new Map<number, TraccarPosition>();
    positions.forEach((p) => positionMap.set(p.deviceId, p));

    const activeDeviceIds = new Set<number>();

    devices.forEach((device) => {
      const pos = positionMap.get(device.id);
      if (!pos || !pos.valid) return;
      activeDeviceIds.add(device.id);

      const isOnline = device.status === "online";
      const speed = knotsToKmh(pos.speed);
      const color = isOnline ? "#16a34a" : "#dc2626";
      const isMoving = pos.speed > 1;

      const icon = isMoving
        ? createArrowIcon(color, pos.course)
        : createCircleIcon(color);

      const popupContent = `
        <div style="font-family:sans-serif;min-width:180px">
          <strong style="font-size:14px">${device.name}</strong><br/>
          <span style="color:${color};font-size:12px">&#9679; ${statusLabel(device.status)}</span><br/>
          <hr style="margin:6px 0"/>
          <span style="font-size:12px">&#128663; Velocidade: <strong>${speed} km/h</strong></span><br/>
          <span style="font-size:12px">&#128273; Ignição: <strong>${pos.attributes.ignition ? "Ligada" : "Desligada"}</strong></span><br/>
          <span style="font-size:12px">&#128267; Bateria: <strong>${pos.attributes.batteryLevel ?? "\u2014"}%</strong></span><br/>
          <span style="font-size:12px;color:#888">Atualizado: ${new Date(pos.deviceTime).toLocaleTimeString("pt-BR")}</span>
        </div>
      `;

      if (markersRef.current.has(device.id)) {
        const marker = markersRef.current.get(device.id)!;
        marker.setLatLng([pos.latitude, pos.longitude]);
        marker.setIcon(icon);
        marker.getPopup()?.setContent(popupContent);
      } else {
        const marker = L.marker([pos.latitude, pos.longitude], { icon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on("click", () => {
          onSelectDevice(device.id);
        });

        markersRef.current.set(device.id, marker);
      }
    });

    // Remover marcadores de dispositivos que não existem mais
    markersRef.current.forEach((marker, deviceId) => {
      if (!activeDeviceIds.has(deviceId)) {
        map.removeLayer(marker);
        markersRef.current.delete(deviceId);
      }
    });

    // Centralizar no dispositivo selecionado
    if (selectedDeviceId) {
      const pos = positionMap.get(selectedDeviceId);
      if (pos?.valid) {
        map.setView([pos.latitude, pos.longitude], Math.max(map.getZoom(), 12), { animate: true });
      }
    }
  }, [positions, devices, selectedDeviceId, onSelectDevice]);

  // Desenhar histórico de rota
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (!showHistory || !historyPositions || historyPositions.length === 0) return;

    const path = historyPositions
      .filter((p) => p.valid)
      .map((p) => [p.latitude, p.longitude] as [number, number]);

    if (path.length === 0) return;

    const polyline = L.polyline(path, {
      color: "#2563eb",
      weight: 3,
      opacity: 0.8,
    }).addTo(map);

    polylineRef.current = polyline;
    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
  }, [historyPositions, showHistory]);

  return (
    <div ref={mapContainerRef} className={className || "w-full h-full min-h-[400px]"} />
  );
}

// ─── Componente de Seletor de Período ────────────────────────────────────────

function DateRangeSelector({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
}: {
  fromDate: string;
  toDate: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label className="text-xs text-muted-foreground whitespace-nowrap">De:</Label>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-36 text-xs"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Até:</Label>
        <Input
          type="date"
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-36 text-xs"
        />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GpsTrackingPage() {
  const [, navigate] = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
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

  // Período para relatórios - com seletor de datas
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateInput(d);
  });
  const [toDate, setToDate] = useState(() => toLocalDateInput(new Date()));

  // Converter datas para ISO
  const from = useMemo(() => dateInputToISO(fromDate), [fromDate]);
  const to = useMemo(() => dateInputToISO(toDate, true), [toDate]);

  // Última atualização
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: statusData } = trpc.traccar.status.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: devices = [], refetch: refetchDevices } = trpc.traccar.devices.useQuery(undefined, {
    enabled: statusData?.configured === true,
    refetchInterval: 10000,
  }) as { data: TraccarDevice[]; refetch: () => void };

  const { data: positions = [], refetch: refetchPositions } = trpc.traccar.positions.useQuery(undefined, {
    enabled: statusData?.configured === true,
    refetchInterval: 10000,
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

  // Horas trabalhadas (summary do Traccar)
  const { data: summaryData = [] } = trpc.traccar.summary.useQuery(
    { deviceId: selectedDeviceId!, from, to },
    {
      enabled: !!selectedDeviceId && statusData?.configured === true && (tab === "relatorio" || tab === "historico"),
    }
  ) as { data: any[] };

  // Queries de vinculacao e manutencao
  const { data: deviceLinks = [], refetch: refetchLinks } = trpc.traccar.listDeviceLinks.useQuery() as { data: any[]; refetch: () => void };
  const { data: allAlerts = [], refetch: refetchAlerts } = trpc.traccar.listAlerts.useQuery({}) as { data: any[]; refetch: () => void };
  const { data: alertCount } = trpc.traccar.alertCount.useQuery(undefined, { refetchInterval: 60000 });
  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({}) as { data: any[] };
  const { data: hoursSummary = [] } = trpc.traccar.equipmentHoursSummary.useQuery({}) as { data: any[] };

  const linkDeviceMut = trpc.traccar.linkDevice.useMutation({
    onSuccess: () => { refetchLinks(); setLinkDialogOpen(false); toast.success("Dispositivo vinculado com sucesso"); },
    onError: (e: any) => toast.error(e.message),
  });
  const unlinkDeviceMut = trpc.traccar.unlinkDevice.useMutation({
    onSuccess: () => { refetchLinks(); toast.success("Vínculo removido"); },
  });
  const upsertPlanMut = trpc.traccar.upsertMaintenancePlan.useMutation({
    onSuccess: () => { setPlanDialogOpen(false); toast.success("Plano salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
  const resolveAlertMut = trpc.traccar.resolveAlert.useMutation({
    onSuccess: () => { refetchAlerts(); toast.success("Alerta atualizado"); },
  });
  const syncHoursMut = trpc.traccar.syncDailyHours.useMutation({
    onSuccess: (d: any) => toast.success(`Sincronizado: ${d.synced} equipamentos`),
    onError: (e: any) => toast.error(e.message),
  });
  const syncOdometerMut = trpc.traccar.syncDailyOdometer.useMutation({
    onSuccess: (d: any) => toast.success(`Hodômetro: ${d.synced} equipamentos atualizados`),
    onError: (e: any) => toast.error(e.message),
  });
  const detectFreightMut = trpc.traccar.detectFreightTrips.useMutation({
    onSuccess: (d: any) => {
      toast.success(`${d.detected} frete(s) detectado(s) automaticamente`);
      refetchAutoFreights();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateFreightStatusMut = trpc.traccar.updateAutoFreightStatus.useMutation({
    onSuccess: () => { toast.success('Status atualizado'); refetchAutoFreights(); },
  });
  const { data: autoFreights = [], refetch: refetchAutoFreights } = trpc.traccar.listAutoFreights.useQuery(
    { status: undefined },
    { enabled: tab === 'fretes' }
  );

  // Atualizar timestamp de última atualização
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Seleção de dispositivo ────────────────────────────────────────────────────

  const handleSelectDevice = useCallback((id: number | null) => {
    setSelectedDeviceId(id);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchDevices();
    refetchPositions();
    setLastRefresh(new Date());
    toast.success("Dados atualizados");
  }, [refetchDevices, refetchPositions]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const selectedPosition = positions.find((p) => p.deviceId === selectedDeviceId);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status !== "online").length;

  // "Em movimento" = ignição ligada + velocidade > 1 knot (~2 km/h) + dispositivo online
  const onlineDeviceIds = new Set(devices.filter(d => d.status === "online").map(d => d.id));
  const movingPositions = positions.filter((p) =>
    onlineDeviceIds.has(p.deviceId) &&
    p.attributes.ignition === true &&
    p.speed > 1
  );
  const movingCount = movingPositions.length;

  // Vel. máx. agora = maior velocidade apenas entre os que estão realmente em movimento
  const maxSpeedNow = movingPositions.length > 0
    ? knotsToKmh(Math.max(...movingPositions.map((p) => p.speed)))
    : 0;

  // Horas do summary do Traccar
  const engineHoursMs = summaryData.length > 0 ? (summaryData[0]?.engineHours || 0) : 0;
  const engineHoursFormatted = formatDuration(engineHoursMs);

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
              <div><span className="text-amber-900">TRACCAR_TOKEN</span> = seu_token_api</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4 p-2 sm:p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
            <span className="truncate">Rastreamento GPS</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {devices.length} dispositivos · {onlineCount} online · {offlineCount} offline
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Atualizado: {lastRefresh.toLocaleTimeString("pt-BR")}
          </span>
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
            {statusData.configured ? (
              <><Wifi className="h-3 w-3 text-green-500" /> <span className="hidden sm:inline">Conectado</span></>
            ) : (
              <><WifiOff className="h-3 w-3 text-red-500" /> <span className="hidden sm:inline">Desconectado</span></>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 px-2 sm:px-3">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Online</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">{onlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Offline</p>
              <p className="text-lg sm:text-xl font-bold text-red-500">{offlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Em movimento</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{movingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Vel. máx.</p>
              <p className="text-lg sm:text-xl font-bold text-orange-600">
                {maxSpeedNow > 0 ? `${maxSpeedNow} km/h` : "0 km/h"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal: lista + mapa */}
      <div className="flex gap-3 sm:gap-4 flex-1 min-h-0 flex-col lg:flex-row">
        {/* Lista de dispositivos */}
        <div className="w-full lg:w-72 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto max-h-[300px] sm:max-h-[500px] lg:max-h-none">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Dispositivos ({devices.length})
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
            const isIgnOn = pos?.attributes.ignition === true;
            const isReallyMoving = isIgnOn && speed > 2;

            return (
              <Card
                key={device.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-green-500" : ""}`}
                onClick={() => setSelectedDeviceId(isSelected ? null : device.id)}
              >
                <CardContent className="p-2.5 sm:p-3 space-y-0.5 sm:space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-xs sm:text-sm truncate">{device.name}</span>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColor(device.status)}`} />
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <Gauge className="h-3 w-3" /> {speed} km/h
                    </span>
                    {pos?.attributes.ignition !== undefined && (
                      <span className="flex items-center gap-0.5">
                        {isIgnOn
                          ? <><Zap className="h-3 w-3 text-green-500" /> Ligado</>
                          : <><ZapOff className="h-3 w-3 text-gray-400" /> Desl.</>
                        }
                      </span>
                    )}
                    {isReallyMoving && (
                      <Badge className="h-4 text-[9px] bg-blue-100 text-blue-700 border-0">Movendo</Badge>
                    )}
                  </div>
                  {pos && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-0.5" />
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
            {/* Abas reorganizadas com scroll horizontal para mobile */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="inline-flex w-auto gap-0.5 sm:gap-1 h-auto p-1">
                <TabsTrigger value="mapa" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Mapa
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2" disabled={!selectedDeviceId}>
                  <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Rota
                </TabsTrigger>
                <TabsTrigger value="relatorio" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2" disabled={!selectedDeviceId}>
                  <Route className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Viagens
                </TabsTrigger>
                <TabsTrigger value="vincular" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2">
                  <Link2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> GPS
                </TabsTrigger>
                <TabsTrigger value="manutencao" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2">
                  <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Manut.</span>
                </TabsTrigger>
                <TabsTrigger value="fretes" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2">
                  <Truck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Fretes
                </TabsTrigger>
                <TabsTrigger value="alertas" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 sm:py-2">
                  <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {alertCount && alertCount.count > 0 && (
                    <Badge className="ml-0.5 h-3.5 min-w-3.5 px-0.5 text-[8px] bg-red-500 text-white">{alertCount.count}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Mapa ao vivo */}
            <TabsContent value="mapa" className="flex-1 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Atualização automática a cada 10s
                </p>
              </div>
              <div className="rounded-lg overflow-hidden border h-full min-h-[400px]">
                <LeafletMap
                  devices={devices}
                  positions={positions}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                  className="w-full h-full min-h-[400px]"
                />
              </div>
            </TabsContent>

            {/* Histórico de rota */}
            <TabsContent value="historico" className="flex-1 mt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {selectedDevice && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>Rota de <strong>{selectedDevice.name}</strong></span>
                    <Badge variant="secondary">{historyPositions.length} pontos</Badge>
                  </div>
                )}
                <DateRangeSelector
                  fromDate={fromDate}
                  toDate={toDate}
                  onFromChange={setFromDate}
                  onToChange={setToDate}
                />
              </div>
              {/* Resumo de horas trabalhadas */}
              {summaryData.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Horas Trabalhadas</p>
                      <p className="text-lg font-bold text-blue-600">{engineHoursFormatted}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Distância</p>
                      <p className="text-lg font-bold text-green-600">{smartDistanceToKm(summaryData[0]?.distance || 0)} km</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Vel. Média</p>
                      <p className="text-lg font-bold">{knotsToKmh(summaryData[0]?.averageSpeed || 0)} km/h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Vel. Máxima</p>
                      <p className="text-lg font-bold text-orange-600">{knotsToKmh(summaryData[0]?.maxSpeed || 0)} km/h</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="rounded-lg overflow-hidden border flex-1 min-h-[400px]">
                <LeafletMap
                  key={`history-${selectedDeviceId}-${from}-${to}`}
                  devices={devices}
                  positions={positions}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                  historyPositions={historyPositions}
                  showHistory={true}
                  className="w-full h-full min-h-[400px]"
                />
              </div>
            </TabsContent>

            {/* Relatório de viagens */}
            <TabsContent value="relatorio" className="mt-2">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                {selectedDevice && (
                  <p className="text-sm font-medium">Viagens de <strong>{selectedDevice.name}</strong></p>
                )}
                <DateRangeSelector
                  fromDate={fromDate}
                  toDate={toDate}
                  onFromChange={setFromDate}
                  onToChange={setToDate}
                />
              </div>
              {/* Resumo de horas trabalhadas no relatório */}
              {summaryData.length > 0 && (
                <Card className="mb-3 border-blue-200 bg-blue-50/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">Horas Trabalhadas (Ignição)</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{engineHoursFormatted}</p>
                    <p className="text-xs text-muted-foreground">Período: {new Date(from).toLocaleDateString("pt-BR")} a {new Date(to).toLocaleDateString("pt-BR")}</p>
                  </CardContent>
                </Card>
              )}
              {trips.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Route className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Nenhuma viagem registrada no período selecionado.</p>
                    <p className="text-xs mt-1">Selecione um período diferente ou verifique se o dispositivo estava ativo.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {/* Resumo cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <Card>
                      <CardContent className="p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total de viagens</p>
                        <p className="text-xl sm:text-2xl font-bold">{trips.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Km rodados</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">
                           {trips.reduce((s, t) => {
                             const d = t.realDistance || t.distance || 0;
                             return s + (d > 1000 ? d / 1000 : d);
                           }, 0).toFixed(1)} km
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Duração total</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">
                          {formatDuration(trips.reduce((s, t) => s + (t.duration || 0), 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Vel. máxima</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">
                          {(() => {
                            const speeds = trips.map((t) => t.maxSpeed || 0);
                            const maxKnots = Math.max(...speeds);
                            const maxKmh = knotsToKmh(maxKnots);
                            // Se todos maxSpeed=0, calcular via distância/duração
                            if (maxKmh === 0) {
                              const avgSpeeds = trips.map(t => {
                                const d = t.realDistance || t.distance || 0;
                                const km = d > 1000 ? d / 1000 : d;
                                const hours = (t.duration || 1) / 3600000;
                                return hours > 0 ? km / hours : 0;
                              });
                              const best = Math.max(...avgSpeeds);
                              return best > 0 ? `~${Math.round(best)} km/h` : '—';
                            }
                            return `${maxKmh} km/h`;
                          })()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lista de viagens - cards para mobile */}
                  <div className="space-y-2">
                    {trips.map((trip, i) => {
                      const distKm = parseFloat(smartDistanceToKm(trip.realDistance || trip.distance));
                      const route = identifyRoute(trip.startAddress, trip.endAddress, distKm);
                      const routeColor = route.type === 'ida' ? 'text-green-700 bg-green-50 border-green-200' 
                        : route.type === 'volta' ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : route.type === 'local' ? 'text-gray-600 bg-gray-50 border-gray-200'
                        : 'text-gray-500 bg-gray-50 border-gray-200';
                      const avgSpeed = (() => {
                        const km = distKm;
                        const hours = (trip.duration || 1) / 3600000;
                        return hours > 0 ? Math.round(km / hours) : 0;
                      })();
                      
                      return (
                        <Card key={i} className={`overflow-hidden ${distKm > 50 ? 'border-l-4 border-l-green-500' : ''}`}>
                          <CardContent className="p-3">
                            {/* Linha 1: Data/hora + Distância */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(trip.startTime).toLocaleString("pt-BR", {
                                    day: "2-digit", month: "2-digit",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                  {" → "}
                                  {new Date(trip.endTime).toLocaleString("pt-BR", {
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-xs text-muted-foreground">({formatDuration(trip.duration)})</span>
                              </div>
                              <span className="text-base font-bold text-blue-600">
                                {smartDistanceToKm(trip.realDistance || trip.distance)} km
                              </span>
                            </div>
                            
                            {/* Linha 2: Rota identificada */}
                            {route.label && (
                              <div className="mb-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${routeColor}`}>
                                  <Navigation className="h-3 w-3" />
                                  {route.label}
                                </span>
                              </div>
                            )}
                            
                            {/* Linha 3: Origem → Destino */}
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-start gap-1.5">
                                <span className="text-green-600 font-medium shrink-0">De:</span>
                                <span className="text-foreground">{shortAddress(trip.startAddress)}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <span className="text-red-600 font-medium shrink-0">Até:</span>
                                <span className="text-foreground">{shortAddress(trip.endAddress)}</span>
                              </div>
                            </div>
                            
                            {/* Linha 4: Velocidade + Botão Frete */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>Vel. média: {avgSpeed > 0 ? `${avgSpeed} km/h` : '—'}</span>
                                {knotsToKmh(trip.maxSpeed) > 0 && (
                                  <span className="text-orange-600">Vel. máx: {knotsToKmh(trip.maxSpeed)} km/h</span>
                                )}
                              </div>
                              {distKm > 15 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    const tripDate = new Date(trip.startTime).toISOString().slice(0, 10);
                                    const origin = shortAddress(trip.startAddress) || 'SIMFLOR';
                                    const destination = shortAddress(trip.endAddress) || 'Líder';
                                    const params = new URLSearchParams({
                                      date: tripDate,
                                      origin,
                                      destination,
                                      distanceKm: distKm.toFixed(1),
                                      vehiclePlate: selectedDevice?.name || '',
                                      routeType: route.type,
                                      duration: formatDuration(trip.duration),
                                    });
                                    navigate(`/fretes?${params.toString()}`);
                                    toast.success('Dados da viagem copiados para Cálculo de Frete!');
                                  }}
                                >
                                  <Truck className="h-3 w-3" /> Frete
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aba Vincular GPS */}
            <TabsContent value="vincular" className="mt-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold">Vincular Dispositivos GPS a Equipamentos</h3>
                  <p className="text-sm text-muted-foreground">Associe cada rastreador a um equipamento para contagem automática de horas.</p>
                </div>
                <Button onClick={() => setLinkDialogOpen(true)} className="gap-2" size="sm">
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
                        <th className="text-left p-2 sm:p-3 font-medium">Equipamento</th>
                        <th className="text-left p-2 sm:p-3 font-medium">Dispositivo GPS</th>
                        <th className="text-left p-2 sm:p-3 font-medium hidden sm:table-cell">IMEI</th>
                        <th className="text-left p-2 sm:p-3 font-medium hidden sm:table-cell">Vinculado em</th>
                        <th className="p-2 sm:p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceLinks.map((link: any) => (
                        <tr key={link.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 sm:p-3 font-medium">{link.equipmentName}</td>
                          <td className="p-2 sm:p-3">{link.traccarDeviceName || `#${link.traccarDeviceId}`}</td>
                          <td className="p-2 sm:p-3 font-mono text-xs hidden sm:table-cell">{link.traccarUniqueId || "\u2014"}</td>
                          <td className="p-2 sm:p-3 text-muted-foreground hidden sm:table-cell">{new Date(link.createdAt).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2 sm:p-3">
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

              {/* Horas trabalhadas por equipamento */}
              {hoursSummary.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Timer className="h-4 w-4 text-blue-600" />
                    Horas Acumuladas por Equipamento
                  </h4>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 sm:p-3 font-medium">Equipamento</th>
                          <th className="text-right p-2 sm:p-3 font-medium">Total Horas</th>
                          <th className="text-right p-2 sm:p-3 font-medium hidden sm:table-cell">Registros</th>
                          <th className="text-right p-2 sm:p-3 font-medium">Último Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hoursSummary.map((h: any) => (
                          <tr key={h.equipmentId} className="border-t hover:bg-muted/30">
                            <td className="p-2 sm:p-3 font-medium">{h.equipmentName}</td>
                            <td className="p-2 sm:p-3 text-right font-bold text-blue-600">{parseFloat(h.totalHours || "0").toFixed(1)}h</td>
                            <td className="p-2 sm:p-3 text-right text-muted-foreground hidden sm:table-cell">{h.recordCount}</td>
                            <td className="p-2 sm:p-3 text-right text-muted-foreground text-xs">
                              {h.lastDate ? new Date(h.lastDate).toLocaleDateString("pt-BR") : "\u2014"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="gap-2" size="sm" onClick={() => syncHoursMut.mutate({})} disabled={syncHoursMut.isPending}>
                  <Timer className="h-4 w-4" />
                  {syncHoursMut.isPending ? "Sincronizando..." : "Sincronizar Horas de Hoje"}
                </Button>
                <Button variant="outline" className="gap-2" size="sm" onClick={() => syncOdometerMut.mutate({})} disabled={syncOdometerMut.isPending}>
                  <Gauge className="h-4 w-4" />
                  {syncOdometerMut.isPending ? "Atualizando..." : "Atualizar Hodômetro"}
                </Button>
                <p className="text-xs text-muted-foreground">Busca as horas de ignição e km percorrido do dia anterior no Traccar e registra automaticamente.</p>
              </div>
            </TabsContent>

            {/* Aba Fretes Automáticos */}
            <TabsContent value="fretes" className="mt-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /> Fretes Automáticos GPS</h3>
                  <p className="text-sm text-muted-foreground">Viagens longas (&gt;50km) detectadas automaticamente pelo GPS. Custo calculado com combustível e manutenções do dia.</p>
                </div>
                <Button onClick={() => detectFreightMut.mutate({})} disabled={detectFreightMut.isPending} className="gap-2" size="sm">
                  <Route className="h-4 w-4" />
                  {detectFreightMut.isPending ? "Detectando..." : "Detectar Fretes de Hoje"}
                </Button>
              </div>

              {autoFreights.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">Nenhum frete detectado ainda</p>
                    <p className="text-sm text-muted-foreground mt-1">Clique em "Detectar Fretes de Hoje" para analisar viagens longas do dia anterior.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {autoFreights.map((f: any) => (
                    <Card key={f.id} className={`border-l-4 ${
                      f.status === 'confirmado' ? 'border-l-green-500' :
                      f.status === 'ignorado' ? 'border-l-gray-300' : 'border-l-blue-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-semibold text-sm">{f.equipmentName}</span>
                              <Badge className={`text-xs ${
                                f.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                                f.status === 'ignorado' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                              }`}>{f.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Data</p>
                                <p className="font-medium">{new Date(f.tripDate).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Distância</p>
                                <p className="font-medium text-blue-600">{parseFloat(f.distanceKm || '0').toFixed(1)} km</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Duração</p>
                                <p className="font-medium">{f.durationMinutes ? `${Math.floor(f.durationMinutes/60)}h ${f.durationMinutes%60}min` : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Custo Total</p>
                                <p className="font-medium text-red-600">R$ {parseFloat(f.totalCost || '0').toFixed(2)}</p>
                              </div>
                            </div>
                            {(f.startAddress || f.endAddress) && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{f.startAddress || '—'}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span>{f.endAddress || '—'}</span>
                              </div>
                            )}
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              {parseFloat(f.fuelCost || '0') > 0 && <span>Combustível: R$ {parseFloat(f.fuelCost).toFixed(2)}</span>}
                              {parseFloat(f.maintenanceCost || '0') > 0 && <span>Manutenção: R$ {parseFloat(f.maintenanceCost).toFixed(2)}</span>}
                            </div>
                          </div>
                          {f.status === 'detectado' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => updateFreightStatusMut.mutate({ id: f.id, status: 'confirmado' })}>
                                <CheckCircle className="h-3.5 w-3.5" /> Confirmar
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-gray-500"
                                onClick={() => updateFreightStatusMut.mutate({ id: f.id, status: 'ignorado' })}>
                                <XCircle className="h-3.5 w-3.5" /> Ignorar
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

            {/* Aba Manutenção Preventiva */}
            <TabsContent value="manutencao" className="mt-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold">Planos de Manutenção Preventiva</h3>
                  <p className="text-sm text-muted-foreground">Configure intervalos de manutenção por horas de uso.</p>
                </div>
                <Button onClick={() => setPlanDialogOpen(true)} className="gap-2" size="sm">
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
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${alert.status === "pendente" ? "text-orange-500" : "text-green-500"}`} />
                              <span className="font-semibold text-sm">{alert.planName}</span>
                              <Badge variant="outline" className="text-xs">{alert.planType?.replace("_", " ")}</Badge>
                              <Badge className={`text-xs ${alert.status === "pendente" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                {alert.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <strong>{alert.equipmentName}</strong> — Horímetro: <strong>{alert.currentHours}h</strong> / Vencimento: <strong>{alert.dueHours}h</strong>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Gerado em {new Date(alert.generatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          {alert.status === "pendente" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300" onClick={() => resolveAlertMut.mutate({ alertId: alert.id, status: "concluido" })}>
                                <CheckCircle className="h-3 w-3" /> <span className="hidden sm:inline">Concluído</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="gap-1 text-gray-500" onClick={() => resolveAlertMut.mutate({ alertId: alert.id, status: "ignorado" })}>
                                <XCircle className="h-3 w-3" /> <span className="hidden sm:inline">Ignorar</span>
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
                <Label>Alerta antes (h)</Label>
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
                    : "\u2014"}
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
                    ? `${smartDistanceToKm(selectedPosition.attributes.totalDistance)} km`
                    : "\u2014"}
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
