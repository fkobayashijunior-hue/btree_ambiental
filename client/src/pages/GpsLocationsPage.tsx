import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Plus,
  Navigation,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Map,
} from "lucide-react";
import { toast } from "sonner";

type GpsLocation = {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  isActive: number;
  notes: string | null;
  createdByName: string | null;
  createdAt: Date;
};

type FormState = {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  clientId: number | null;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  latitude: "",
  longitude: "",
  radiusMeters: 2000,
  clientId: null,
  notes: "",
};

export default function GpsLocationsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsError, setGpsError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: locations = [], isLoading } = trpc.gpsLocations.list.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();

  const createMutation = trpc.gpsLocations.create.useMutation({
    onSuccess: () => {
      utils.gpsLocations.list.invalidate();
      utils.gpsLocations.listActive.invalidate();
      toast.success("Local cadastrado com sucesso!");
      setIsOpen(false);
      setForm(emptyForm);
      setGpsStatus("idle");
      setSubmitting(false);
    },
    onError: (e) => {
      toast.error("Erro ao cadastrar: " + e.message);
      setSubmitting(false);
    },
  });

  const updateMutation = trpc.gpsLocations.update.useMutation({
    onSuccess: () => {
      utils.gpsLocations.list.invalidate();
      utils.gpsLocations.listActive.invalidate();
      toast.success("Local atualizado com sucesso!");
      setIsOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setGpsStatus("idle");
      setSubmitting(false);
    },
    onError: (e) => {
      toast.error("Erro ao atualizar: " + e.message);
      setSubmitting(false);
    },
  });

  const deleteMutation = trpc.gpsLocations.delete.useMutation({
    onSuccess: () => {
      utils.gpsLocations.list.invalidate();
      utils.gpsLocations.listActive.invalidate();
      toast.success("Local removido.");
    },
    onError: (e) => toast.error("Erro ao remover: " + e.message),
  });

  const toggleMutation = trpc.gpsLocations.update.useMutation({
    onSuccess: () => {
      utils.gpsLocations.list.invalidate();
      utils.gpsLocations.listActive.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // ── Capturar GPS ──────────────────────────────────────────────────────────
  const captureGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS não disponível neste dispositivo");
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGpsStatus("success");
        toast.success(`Localização capturada! Precisão: ~${Math.round(pos.coords.accuracy)}m`);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Permissão de localização negada. Habilite nas configurações do navegador."
            : err.code === 2
            ? "Localização indisponível. Verifique o GPS do dispositivo."
            : "Tempo esgotado ao obter localização."
        );
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setGpsStatus("idle");
    setGpsError("");
    setIsOpen(true);
  };

  const openEdit = (loc: any) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: loc.radiusMeters,
      clientId: loc.clientId || null,
      notes: loc.notes || "",
    });
    setGpsStatus("idle");
    setGpsError("");
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Informe o nome do local"); return; }
    if (!form.latitude || !form.longitude) { toast.error("Capture ou informe as coordenadas GPS"); return; }
    setSubmitting(true);
    const payload = { ...form, clientId: form.clientId || undefined };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggle = (loc: GpsLocation) => {
    toggleMutation.mutate({ id: loc.id, isActive: loc.isActive === 1 ? 0 : 1 });
  };

  const activeCount = locations.filter((l) => l.isActive === 1).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-6 w-6 text-green-600" />
            Locais GPS
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastre os locais de trabalho para detecção automática de presença
          </p>
        </div>
        <Button onClick={openCreate} className="bg-green-700 hover:bg-green-800 text-white gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Local
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Locais Ativos</p>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Cadastrado</p>
            <p className="text-2xl font-bold">{locations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Info box ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
        <Navigation className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>Como funciona:</strong> Ao registrar uma presença, o sistema captura automaticamente
          a localização do dispositivo e compara com os locais cadastrados aqui. Se estiver dentro do
          raio configurado, o nome do local é preenchido automaticamente.
        </div>
      </div>

      {/* ── Lista de locais ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum local cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Local" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <Card key={loc.id} className={`transition-opacity ${loc.isActive === 0 ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{loc.name}</h3>
                      <Badge
                        variant={loc.isActive === 1 ? "default" : "secondary"}
                        className={loc.isActive === 1 ? "bg-green-600 text-white text-xs" : "text-xs"}
                      >
                        {loc.isActive === 1 ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-muted-foreground font-mono">
                        📍 {loc.latitude}, {loc.longitude}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Raio de detecção: <strong>{loc.radiusMeters >= 1000 ? `${(loc.radiusMeters / 1000).toFixed(1)} km` : `${loc.radiusMeters} m`}</strong>
                      </p>
                      {(loc as any).clientId && (
                        <p className="text-xs text-muted-foreground">
                          Cliente: <strong>{clientsList.find((c: any) => c.id === (loc as any).clientId)?.name || `ID ${(loc as any).clientId}`}</strong>
                        </p>
                      )}
                      {loc.notes && (
                        <p className="text-xs text-muted-foreground italic">{loc.notes}</p>
                      )}
                      {loc.createdByName && (
                        <p className="text-xs text-muted-foreground">
                          Cadastrado por: {loc.createdByName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle ativo/inativo */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={loc.isActive === 1 ? "Desativar" : "Ativar"}
                      onClick={() => handleToggle(loc)}
                    >
                      {loc.isActive === 1
                        ? <ToggleRight className="h-5 w-5 text-green-600" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      }
                    </Button>
                    {/* Editar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    {/* Excluir */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover local?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O local "<strong>{loc.name}</strong>" será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate({ id: loc.id })}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Sheet de cadastro/edição ── */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setGpsStatus("idle"); setGpsError(""); } }}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              {editingId ? "Editar Local" : "Novo Local GPS"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Nome do Local *</Label>
              <Input
                id="loc-name"
                placeholder="Ex: Fazenda GW, Sede BTREE, Escritório..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Captura GPS */}
            <div className="space-y-2">
              <Label>Coordenadas GPS *</Label>

              {/* Botão principal de captura */}
              <Button
                type="button"
                onClick={captureGPS}
                disabled={gpsStatus === "loading"}
                className="w-full gap-2 bg-green-700 hover:bg-green-800 text-white"
              >
                {gpsStatus === "loading" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Capturando localização...</>
                ) : gpsStatus === "success" ? (
                  <><CheckCircle2 className="h-4 w-4" /> Localização capturada — clique para atualizar</>
                ) : (
                  <><Navigation className="h-4 w-4" /> Usar minha localização atual</>
                )}
              </Button>

              {/* Feedback de status */}
              {gpsStatus === "success" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Localização capturada com sucesso!<br />
                    <span className="font-mono text-xs">{form.latitude}, {form.longitude}</span>
                  </span>
                </div>
              )}
              {gpsStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* Campos manuais */}
              <p className="text-xs text-muted-foreground text-center">— ou informe manualmente —</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="loc-lat" className="text-xs">Latitude</Label>
                  <Input
                    id="loc-lat"
                    placeholder="-21.5000000"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="loc-lng" className="text-xs">Longitude</Label>
                  <Input
                    id="loc-lng"
                    placeholder="-48.5000000"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Raio de detecção */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-radius">
                Raio de Detecção: <strong>{form.radiusMeters >= 1000 ? `${(form.radiusMeters / 1000).toFixed(1)} km` : `${form.radiusMeters} m`}</strong>
              </Label>
              <input
                id="loc-radius"
                type="range"
                min={100}
                max={10000}
                step={100}
                value={form.radiusMeters}
                onChange={(e) => setForm((f) => ({ ...f, radiusMeters: Number(e.target.value) }))}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100 m</span>
                <span>5 km</span>
                <span>10 km</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Colaboradores dentro deste raio serão identificados como estando neste local.
              </p>
            </div>

            {/* Cliente vinculado */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-client">Cliente Vinculado</Label>
              <select
                id="loc-client"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.clientId || ""}
                onChange={(e) => setForm(f => ({ ...f, clientId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Nenhum (geral)</option>
                {clientsList.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Vincule este local a um cliente para filtrar gastos por encarregado.
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-notes">Observações</Label>
              <Textarea
                id="loc-notes"
                placeholder="Informações adicionais sobre o local..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setIsOpen(false); setGpsStatus("idle"); }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                ) : editingId ? "Salvar Alterações" : "Cadastrar Local"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
