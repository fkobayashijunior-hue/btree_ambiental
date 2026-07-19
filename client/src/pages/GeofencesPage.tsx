// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { MapView } from "@/components/Map";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Radio,
  CircleDot,
} from "lucide-react";

type Geofence = {
  id: number;
  name: string;
  lat: string;
  lng: string;
  radiusMeters: number;
  isActive: number;
  traccarDeviceId: number | null;
  traccarGeofenceId: number | null;
  defaultOriginName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  name: string;
  lat: string;
  lng: string;
  radiusMeters: number;
  traccarDeviceId: string;
  defaultOriginName: string;
  notes: string;
};

const emptyForm: FormData = {
  name: "",
  lat: "",
  lng: "",
  radiusMeters: 300,
  traccarDeviceId: "",
  defaultOriginName: "SIMFLOR",
  notes: "",
};

export default function GeofencesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  const utils = trpc.useUtils();
  const { data: geofences = [], isLoading } = trpc.geofences.list.useQuery();

  const createMutation = trpc.geofences.create.useMutation({
    onSuccess: () => {
      utils.geofences.list.invalidate();
      toast.success("Porteira virtual criada com sucesso!");
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.geofences.update.useMutation({
    onSuccess: () => {
      utils.geofences.list.invalidate();
      toast.success("Porteira virtual atualizada!");
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.geofences.toggleActive.useMutation({
    onSuccess: () => utils.geofences.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.geofences.delete.useMutation({
    onSuccess: () => {
      utils.geofences.list.invalidate();
      toast.success("Porteira excluída.");
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(geo: Geofence) {
    setEditingId(geo.id);
    setForm({
      name: geo.name,
      lat: geo.lat,
      lng: geo.lng,
      radiusMeters: geo.radiusMeters,
      traccarDeviceId: geo.traccarDeviceId ? String(geo.traccarDeviceId) : "",
      defaultOriginName: geo.defaultOriginName || "SIMFLOR",
      notes: geo.notes || "",
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.lat || !form.lng) {
      toast.error("Preencha nome, latitude e longitude.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      lat: form.lat,
      lng: form.lng,
      radiusMeters: form.radiusMeters,
      traccarDeviceId: form.traccarDeviceId ? parseInt(form.traccarDeviceId) : undefined,
      defaultOriginName: form.defaultOriginName || "SIMFLOR",
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleMapReady(map: google.maps.Map) {
    setMapRef(map);

    // Permitir clicar no mapa para definir coordenadas
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat().toFixed(7);
      const lng = e.latLng.lng().toFixed(7);
      setForm((prev) => ({ ...prev, lat, lng }));
    });
  }

  // Atualizar círculo no mapa quando lat/lng/radius mudam
  function updateMapCircle(lat: string, lng: string, radius: number) {
    if (!mapRef) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    const center = { lat: latNum, lng: lngNum };

    if (marker) {
      marker.setPosition(center);
    } else {
      const m = new google.maps.Marker({ position: center, map: mapRef });
      setMarker(m);
    }

    if (circle) {
      circle.setCenter(center);
      circle.setRadius(radius);
    } else {
      const c = new google.maps.Circle({
        map: mapRef,
        center,
        radius,
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        strokeColor: "#16a34a",
        strokeWeight: 2,
      });
      setCircle(c);
    }

    mapRef.panTo(center);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 text-green-600" />
            Porteiras Virtuais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as cercas virtuais para abertura/fechamento automático de fretes via GPS
          </p>
        </div>
        <Button onClick={openCreate} className="bg-green-700 hover:bg-green-800">
          <Plus className="w-4 h-4 mr-2" />
          Nova Porteira
        </Button>
      </div>

      {/* Lista de porteiras */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando porteiras...</div>
      ) : geofences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CircleDot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma porteira virtual cadastrada.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Porteira" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {geofences.map((geo) => (
            <Card key={geo.id} className={geo.isActive ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{geo.name}</h3>
                      <Badge
                        variant={geo.isActive ? "default" : "secondary"}
                        className={geo.isActive ? "bg-green-600" : ""}
                      >
                        {geo.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                      {geo.traccarDeviceId && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          GPS #{geo.traccarDeviceId}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {parseFloat(geo.lat).toFixed(5)}°, {parseFloat(geo.lng).toFixed(5)}°
                      </span>
                      <span className="ml-2">• Raio: {geo.radiusMeters}m</span>
                      {geo.defaultOriginName && (
                        <span className="ml-2">• Origem: {geo.defaultOriginName}</span>
                      )}
                    </div>
                    {geo.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{geo.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={!!geo.isActive}
                      onCheckedChange={(v) =>
                        toggleMutation.mutate({ id: geo.id, isActive: v })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(geo)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Excluir porteira "${geo.name}"?`)) {
                          deleteMutation.mutate({ id: geo.id });
                        }
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Porteira Virtual" : "Nova Porteira Virtual"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Porteira *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: SIMFLOR - Entrada Principal"
                />
              </div>

              <div>
                <Label>Latitude *</Label>
                <Input
                  value={form.lat}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, lat: e.target.value }));
                    updateMapCircle(e.target.value, form.lng, form.radiusMeters);
                  }}
                  placeholder="-23.933803"
                />
              </div>
              <div>
                <Label>Longitude *</Label>
                <Input
                  value={form.lng}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, lng: e.target.value }));
                    updateMapCircle(form.lat, e.target.value, form.radiusMeters);
                  }}
                  placeholder="-51.080152"
                />
              </div>

              <div>
                <Label>Raio (metros)</Label>
                <Input
                  type="number"
                  min={50}
                  max={50000}
                  value={form.radiusMeters}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 300;
                    setForm((p) => ({ ...p, radiusMeters: v }));
                    updateMapCircle(form.lat, form.lng, v);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: 300m para porteiras de fazenda
                </p>
              </div>

              <div>
                <Label>ID Dispositivo Traccar</Label>
                <Input
                  type="number"
                  value={form.traccarDeviceId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, traccarDeviceId: e.target.value }))
                  }
                  placeholder="Ex: 1 (Scania Julieta)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ID do veículo no Traccar para monitoramento automático
                </p>
              </div>

              <div>
                <Label>Nome de Origem Padrão</Label>
                <Input
                  value={form.defaultOriginName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, defaultOriginName: e.target.value }))
                  }
                  placeholder="SIMFLOR"
                />
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas sobre esta porteira..."
                  rows={2}
                />
              </div>
            </div>

            {/* Mapa para selecionar localização */}
            <div>
              <Label className="mb-2 block">
                Localização no Mapa{" "}
                <span className="text-muted-foreground font-normal">
                  (clique para definir coordenadas)
                </span>
              </Label>
              <div className="h-64 rounded-lg overflow-hidden border">
                <MapView
                  onMapReady={(map) => {
                    handleMapReady(map);
                    // Centralizar no Brasil por padrão
                    map.setCenter({ lat: -23.9338, lng: -51.0802 });
                    map.setZoom(14);
                    // Se já temos coordenadas, mostrar o círculo
                    if (form.lat && form.lng) {
                      updateMapCircle(form.lat, form.lng, form.radiusMeters);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              {editingId ? "Salvar Alterações" : "Criar Porteira"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
