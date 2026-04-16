import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Truck, Plus, Camera, Loader2, CheckCircle2, Package, MapPin,
  ChevronRight, ArrowLeft, User, Ruler, Image as ImageIcon
} from "lucide-react";
import { useFilePicker } from "@/hooks/useFilePicker";

// ===== TIPOS =====
type TrackingStatus = "aguardando" | "carregando" | "pesagem_saida" | "em_transito" | "descarregando" | "pesagem_chegada" | "finalizado";

const TRACKING_STEPS: { key: TrackingStatus; label: string; icon: string; description: string }[] = [
  { key: "aguardando", label: "Aguardando", icon: "⏳", description: "Carga registrada, aguardando início" },
  { key: "carregando", label: "Carregando", icon: "📦", description: "Carregamento em andamento" },
  { key: "pesagem_saida", label: "Pesagem Saída", icon: "⚖️", description: "Pesagem na balança de saída" },
  { key: "em_transito", label: "Em Trânsito", icon: "🚛", description: "Veículo em deslocamento" },
  { key: "descarregando", label: "Descarregando", icon: "🏭", description: "Descarga no destino" },
  { key: "pesagem_chegada", label: "Pesagem Chegada", icon: "⚖️", description: "Pesagem na balança de chegada" },
  { key: "finalizado", label: "Finalizado", icon: "✅", description: "Entrega concluída" },
];

function calcVolume(h: string, w: string, l: string): string {
  const hN = parseFloat(h.replace(",", "."));
  const wN = parseFloat(w.replace(",", "."));
  const lN = parseFloat(l.replace(",", "."));
  if (isNaN(hN) || isNaN(wN) || isNaN(lN)) return "";
  return (hN * wN * lN).toFixed(3);
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ===== COMPONENTE PRINCIPAL =====
export default function DriverCargoView() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { openFilePicker } = useFilePicker();

  // Estado da tela
  const [activeView, setActiveView] = useState<"list" | "new" | "tracking">("list");
  const [selectedCargoId, setSelectedCargoId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [trackingPhotoStage, setTrackingPhotoStage] = useState<TrackingStatus | null>(null);
  const [trackingNotes, setTrackingNotes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightNetKg, setWeightNetKg] = useState("");
  const [finalHeight, setFinalHeight] = useState("");
  const [finalWidth, setFinalWidth] = useState("");
  const [finalLength, setFinalLength] = useState("");

  // Form para nova carga
  const [form, setForm] = useState({
    vehicleId: 0,
    heightM: "2.4",
    widthM: "2.4",
    lengthM: "13.80",
    clientId: 0,
    destinationId: 0,
    woodType: "Eucalipto",
    notes: "",
  });

  // Queries
  const { data: driverInfo, isLoading: loadingDriver } = trpc.cargoLoads.getMyDriverInfo.useQuery();
  const { data: myLoads = [], isLoading: loadingLoads } = trpc.cargoLoads.getMyPendingLoads.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  const { data: destinations = [] } = trpc.cargoLoads.listDestinations.useQuery();
  const { data: trackingPhotos = [] } = trpc.cargoLoads.listTrackingPhotos.useQuery(
    { cargoId: selectedCargoId! },
    { enabled: !!selectedCargoId }
  );

  // Preencher form com dados do motorista
  useEffect(() => {
    if (driverInfo) {
      setForm(f => ({
        ...f,
        vehicleId: driverInfo.defaultTruckId || (driverInfo.trucks[0]?.id || 0),
        heightM: driverInfo.defaultMeasures.heightM,
        widthM: driverInfo.defaultMeasures.widthM,
        lengthM: driverInfo.defaultMeasures.lengthM,
      }));
    }
  }, [driverInfo]);

  // Mutations
  const createMutation = trpc.cargoLoads.create.useMutation({
    onSuccess: () => {
      toast.success("Carga registrada com sucesso!");
      utils.cargoLoads.getMyPendingLoads.invalidate();
      utils.cargoLoads.list.invalidate();
      setActiveView("list");
    },
    onError: (e) => toast.error(e.message),
  });

  const advanceTracking = trpc.cargoLoads.advanceTrackingWithPhoto.useMutation({
    onSuccess: () => {
      toast.success("Etapa atualizada!");
      utils.cargoLoads.getMyPendingLoads.invalidate();
      utils.cargoLoads.list.invalidate();
      utils.cargoLoads.listTrackingPhotos.invalidate();
      setTrackingPhotoStage(null);
      setPhotoPreview(null);
      setTrackingNotes("");
      setWeightKg("");
      setWeightNetKg("");
      setFinalHeight("");
      setFinalWidth("");
      setFinalLength("");
      setUploading(false);
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const volume = useMemo(() => calcVolume(form.heightM, form.widthM, form.lengthM), [form.heightM, form.widthM, form.lengthM]);

  const selectedCargo = myLoads.find(c => c.id === selectedCargoId);
  const currentStepIdx = selectedCargo
    ? TRACKING_STEPS.findIndex(s => s.key === selectedCargo.trackingStatus)
    : -1;
  const nextStep = currentStepIdx >= 0 && currentStepIdx < TRACKING_STEPS.length - 1
    ? TRACKING_STEPS[currentStepIdx + 1]
    : null;

  // Handlers
  const handleCreateCargo = () => {
    if (!driverInfo?.collaborator) {
      toast.error("Seu perfil de colaborador não está vinculado. Peça ao admin para vincular.");
      return;
    }
    const truck = driverInfo.trucks.find(t => t.id === form.vehicleId);
    createMutation.mutate({
      date: new Date().toISOString(),
      vehicleId: form.vehicleId || undefined,
      vehiclePlate: truck?.licensePlate || "",
      driverCollaboratorId: driverInfo.collaborator.id,
      driverName: driverInfo.collaborator.name,
      heightM: form.heightM,
      widthM: form.widthM,
      lengthM: form.lengthM,
      volumeM3: volume || "0",
      woodType: form.woodType,
      clientId: form.clientId || undefined,
      clientName: (clientsList as { id: number; name: string }[]).find(c => c.id === form.clientId)?.name || "",
      destinationId: form.destinationId || undefined,
      destination: (destinations as { id: number; name: string }[]).find(d => d.id === form.destinationId)?.name || "",
      notes: form.notes || undefined,
    });
  };

  const handleTakePhoto = useCallback((stage: TrackingStatus) => {
    setTrackingPhotoStage(stage);
    openFilePicker(
      { accept: "image/*", capture: "environment" },
      async (files) => {
        const file = files[0];
        if (!file) return;
        try {
          const compressed = await compressImage(file);
          setPhotoPreview(compressed);
        } catch {
          toast.error("Erro ao processar imagem");
        }
      }
    );
  }, [openFilePicker]);

  const handleConfirmAdvance = () => {
    if (!selectedCargoId || !trackingPhotoStage) return;
    setUploading(true);
    const mutateData: Record<string, unknown> = {
      cargoId: selectedCargoId,
      stage: trackingPhotoStage,
      photoBase64: photoPreview || undefined,
      notes: trackingNotes || undefined,
    };
    // Peso nas etapas de pesagem
    if ((trackingPhotoStage === 'pesagem_saida' || trackingPhotoStage === 'pesagem_chegada') && weightKg) {
      mutateData.weightKg = weightKg;
    }
    // Peso líquido na pesagem de chegada
    if (trackingPhotoStage === 'pesagem_chegada' && weightNetKg) {
      mutateData.weightNetKg = weightNetKg;
    }
    // Metragem final ao finalizar
    if (trackingPhotoStage === 'finalizado') {
      if (finalHeight) mutateData.finalHeightM = finalHeight;
      if (finalWidth) mutateData.finalWidthM = finalWidth;
      if (finalLength) mutateData.finalLengthM = finalLength;
      const fv = calcVolume(finalHeight || selectedCargo?.heightM || '0', finalWidth || selectedCargo?.widthM || '0', finalLength || selectedCargo?.lengthM || '0');
      if (fv) mutateData.finalVolumeM3 = fv;
    }
    advanceTracking.mutate(mutateData as any);
  };

  const handleAdvanceWithoutPhoto = (stage: TrackingStatus) => {
    if (!selectedCargoId) return;
    setUploading(true);
    advanceTracking.mutate({
      cargoId: selectedCargoId,
      stage,
      notes: trackingNotes || undefined,
    });
  };

  // ===== LOADING =====
  if (loadingDriver) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-500">Carregando informações...</p>
        </div>
      </div>
    );
  }

  // ===== VIEW: NOVA CARGA =====
  if (activeView === "new") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <button onClick={() => setActiveView("list")} className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Plus className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Nova Carga</h1>
          <p className="text-sm text-gray-500">Registre uma nova saída de carga</p>
        </div>

        {/* Info do motorista */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">{driverInfo?.collaborator?.name || user?.name || "Motorista"}</p>
                <p className="text-xs text-emerald-600">Motorista</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caminhão */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-1.5">
            <Truck className="h-4 w-4 text-emerald-600" /> Caminhão
          </Label>
          <select
            value={form.vehicleId}
            onChange={e => {
              const newId = parseInt(e.target.value);
              setForm(f => ({ ...f, vehicleId: newId }));
              // Atualizar medidas padrão do caminhão selecionado
              const truck = driverInfo?.trucks.find(t => t.id === newId);
              if (truck) {
                setForm(f => ({
                  ...f,
                  vehicleId: newId,
                  heightM: truck.defaultHeightM || '2.4',
                  widthM: truck.defaultWidthM || '2.4',
                  lengthM: truck.defaultLengthM || '13.80',
                }));
              }
            }}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value={0}>Selecionar caminhão...</option>
            {(driverInfo?.trucks || []).map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.licensePlate ? ` — ${t.licensePlate}` : ""}</option>
            ))}
          </select>
        </div>

        {/* Medidas */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-1.5">
            <Ruler className="h-4 w-4 text-emerald-600" /> Medidas da Carga
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-xs text-gray-500 block mb-1">Altura (m)</span>
              <Input
                value={form.heightM}
                onChange={e => setForm(f => ({ ...f, heightM: e.target.value }))}
                className="h-12 text-center text-lg font-bold rounded-xl"
                inputMode="decimal"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Largura (m)</span>
              <Input
                value={form.widthM}
                onChange={e => setForm(f => ({ ...f, widthM: e.target.value }))}
                className="h-12 text-center text-lg font-bold rounded-xl"
                inputMode="decimal"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Comp. (m)</span>
              <Input
                value={form.lengthM}
                onChange={e => setForm(f => ({ ...f, lengthM: e.target.value }))}
                className="h-12 text-center text-lg font-bold rounded-xl"
                inputMode="decimal"
              />
            </div>
          </div>
          {volume && (
            <div className="mt-2 bg-emerald-100 rounded-xl p-3 text-center">
              <span className="text-sm text-emerald-700">Volume: </span>
              <span className="text-xl font-bold text-emerald-800">{volume} m³</span>
            </div>
          )}
        </div>

        {/* Cliente (local de extração) */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-1.5">
            <Package className="h-4 w-4 text-emerald-600" /> Cliente (Local de Extração)
          </Label>
          <select
            value={form.clientId}
            onChange={e => setForm(f => ({ ...f, clientId: parseInt(e.target.value) }))}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value={0}>Selecionar cliente...</option>
            {(clientsList as { id: number; name: string }[]).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Destino */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-1.5">
            <MapPin className="h-4 w-4 text-emerald-600" /> Destino
          </Label>
          <select
            value={form.destinationId}
            onChange={e => setForm(f => ({ ...f, destinationId: parseInt(e.target.value) }))}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value={0}>Selecionar destino...</option>
            {(destinations as { id: number; name: string }[]).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Tipo de madeira */}
        <div>
          <Label className="text-sm font-medium mb-1.5">Tipo de Madeira</Label>
          <Input
            value={form.woodType}
            onChange={e => setForm(f => ({ ...f, woodType: e.target.value }))}
            className="h-12 rounded-xl"
            placeholder="Eucalipto"
          />
        </div>

        {/* Observações */}
        <div>
          <Label className="text-sm font-medium mb-1.5">Observações</Label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Informações adicionais..."
          />
        </div>

        {/* Botão registrar */}
        <Button
          onClick={handleCreateCargo}
          disabled={createMutation.isPending || !form.vehicleId}
          className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <span className="flex items-center gap-2"><Truck className="h-5 w-5" /> Registrar Carga</span>
          )}
        </Button>
      </div>
    );
  }

  // ===== VIEW: TRACKING DE CARGA =====
  if (activeView === "tracking" && selectedCargo) {
    const currentIdx = TRACKING_STEPS.findIndex(s => s.key === selectedCargo.trackingStatus);
    const photosForStage = (stage: string) => trackingPhotos.filter(p => p.stage === stage);

    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <button onClick={() => { setActiveView("list"); setSelectedCargoId(null); }} className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        {/* Header da carga */}
        <Card className="border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{selectedCargo.vehiclePlate || selectedCargo.vehicleName || "Veículo"}</h2>
                <p className="text-emerald-100 text-sm">{selectedCargo.volumeM3} m³ · {selectedCargo.clientName || "Sem cliente"}</p>
              </div>
            </div>
            {selectedCargo.destination && (
              <div className="mt-2 flex items-center gap-1 text-emerald-100 text-sm">
                <MapPin className="h-3.5 w-3.5" /> Destino: {selectedCargo.destination}
              </div>
            )}
          </div>
        </Card>

        {/* Timeline vertical */}
        <div className="space-y-0">
          {TRACKING_STEPS.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isNext = idx === currentIdx + 1;
            const isPending = idx > currentIdx + 1;
            const stagePhotos = photosForStage(step.key);

            return (
              <div key={step.key} className="flex gap-3">
                {/* Linha vertical + círculo */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all ${
                    isDone ? "bg-emerald-500 text-white shadow-md" :
                    isCurrent ? "bg-emerald-600 text-white ring-4 ring-emerald-200 shadow-lg" :
                    isNext ? "bg-amber-100 text-amber-700 border-2 border-amber-300" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                  </div>
                  {idx < TRACKING_STEPS.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[20px] ${
                      isDone ? "bg-emerald-400" : "bg-gray-200"
                    }`} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className={`flex-1 pb-4 ${isPending ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${
                      isDone ? "text-emerald-700" : isCurrent ? "text-emerald-800" : isNext ? "text-amber-700" : "text-gray-400"
                    }`}>{step.label}</span>
                    {isDone && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Concluído</Badge>}
                    {isCurrent && <Badge className="bg-emerald-600 text-white text-[10px]">Atual</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>

                  {/* Fotos desta etapa */}
                  {stagePhotos.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {stagePhotos.map(p => (
                        <img
                          key={p.id}
                          src={p.photoUrl}
                          alt={step.label}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0 cursor-pointer"
                          onClick={() => window.open(p.photoUrl, "_blank")}
                        />
                      ))}
                    </div>
                  )}

                  {/* Botão para a PRÓXIMA etapa */}
                  {isNext && (
                    <div className="mt-3 space-y-2">
                      <Button
                        onClick={() => handleTakePhoto(step.key)}
                        disabled={uploading}
                        className="w-full h-14 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-200 gap-2"
                      >
                        <Camera className="h-5 w-5" />
                        {step.label} — Tirar Foto
                      </Button>
                      <button
                        onClick={() => handleAdvanceWithoutPhoto(step.key)}
                        disabled={uploading}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                      >
                        Avançar sem foto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Carga finalizada */}
        {currentIdx >= TRACKING_STEPS.length - 1 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-emerald-800 text-lg">Entrega Concluída!</h3>
            <p className="text-sm text-emerald-600 mt-1">Todas as etapas foram finalizadas</p>
          </div>
        )}

        {/* Dialog: Preview da foto antes de confirmar */}
        <Dialog open={!!photoPreview} onOpenChange={v => { if (!v) { setPhotoPreview(null); setTrackingPhotoStage(null); setTrackingNotes(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-emerald-800 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {trackingPhotoStage ? TRACKING_STEPS.find(s => s.key === trackingPhotoStage)?.label : "Foto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="w-full rounded-xl border border-gray-200" />
              )}

              {/* Campo de peso para pesagem de saída - apenas Peso Bruto */}
              {trackingPhotoStage === 'pesagem_saida' && (
                <div>
                  <Label className="text-sm font-medium">Peso Bruto (kg)</Label>
                  <Input
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    className="h-12 text-center text-lg font-bold rounded-xl mt-1"
                    inputMode="decimal"
                    placeholder="Ex: 32000"
                  />
                </div>
              )}

              {/* Campos de peso para pesagem de chegada - Peso Bruto + Peso Líquido */}
              {trackingPhotoStage === 'pesagem_chegada' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Peso Bruto (kg)</Label>
                    <Input
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      className="h-12 text-center text-lg font-bold rounded-xl mt-1"
                      inputMode="decimal"
                      placeholder="Ex: 32000"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Peso Líquido (kg)</Label>
                    <Input
                      value={weightNetKg}
                      onChange={e => setWeightNetKg(e.target.value)}
                      className="h-12 text-center text-lg font-bold rounded-xl mt-1"
                      inputMode="decimal"
                      placeholder="Ex: 28000"
                    />
                    <p className="text-xs text-gray-400 mt-1">Peso líquido = Peso Bruto - Tara</p>
                  </div>
                </div>
              )}

              {/* Campos de metragem final ao finalizar */}
              {trackingPhotoStage === 'finalizado' && (
                <div>
                  <Label className="text-sm font-medium">Metragem Final (medida real)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Altura (m)</span>
                      <Input
                        value={finalHeight}
                        onChange={e => setFinalHeight(e.target.value)}
                        className="h-10 text-center font-bold rounded-xl"
                        inputMode="decimal"
                        placeholder={selectedCargo?.heightM || '2.4'}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Largura (m)</span>
                      <Input
                        value={finalWidth}
                        onChange={e => setFinalWidth(e.target.value)}
                        className="h-10 text-center font-bold rounded-xl"
                        inputMode="decimal"
                        placeholder={selectedCargo?.widthM || '2.4'}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Comp. (m)</span>
                      <Input
                        value={finalLength}
                        onChange={e => setFinalLength(e.target.value)}
                        className="h-10 text-center font-bold rounded-xl"
                        inputMode="decimal"
                        placeholder={selectedCargo?.lengthM || '13.80'}
                      />
                    </div>
                  </div>
                  {(finalHeight || finalWidth || finalLength) && (
                    <div className="mt-2 bg-blue-50 rounded-xl p-2 text-center">
                      <span className="text-sm text-blue-700">Volume Final: </span>
                      <span className="text-lg font-bold text-blue-800">
                        {calcVolume(
                          finalHeight || selectedCargo?.heightM || '0',
                          finalWidth || selectedCargo?.widthM || '0',
                          finalLength || selectedCargo?.lengthM || '0'
                        )} m³
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-sm">Observação (opcional)</Label>
                <textarea
                  value={trackingNotes}
                  onChange={e => setTrackingNotes(e.target.value)}
                  className="w-full min-h-[60px] px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none mt-1"
                  placeholder="Ex: Pesagem OK, 32 toneladas..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => { setPhotoPreview(null); setTrackingPhotoStage(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmAdvance}
                  disabled={uploading}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== VIEW: LISTA DE CARGAS =====
  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
          <Truck className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Controle de Cargas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Olá, <strong>{driverInfo?.collaborator?.name || user?.name}</strong>
        </p>
      </div>

      {/* Botão Nova Carga */}
      <Button
        onClick={() => setActiveView("new")}
        className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200 gap-2"
      >
        <Plus className="h-6 w-6" /> Nova Carga
      </Button>

      {/* Cargas pendentes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Minhas Cargas Pendentes ({myLoads.length})
        </h2>

        {loadingLoads ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : myLoads.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma carga pendente</p>
            <p className="text-sm mt-1">Registre uma nova carga para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myLoads.map(cargo => {
              const stepIdx = TRACKING_STEPS.findIndex(s => s.key === cargo.trackingStatus);
              const currentStep = TRACKING_STEPS[stepIdx] || TRACKING_STEPS[0];
              const progress = Math.round(((stepIdx + 1) / TRACKING_STEPS.length) * 100);

              return (
                <Card
                  key={cargo.id}
                  className="cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] border-gray-200"
                  onClick={() => { setSelectedCargoId(cargo.id); setActiveView("tracking"); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        {currentStep.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 truncate">
                            {cargo.vehiclePlate || cargo.vehicleName || "Veículo"}
                          </span>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                            {currentStep.label}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-500 mt-1">
                          <span>{cargo.volumeM3} m³</span>
                          {cargo.clientName && <span>· {cargo.clientName}</span>}
                        </div>
                        {/* Barra de progresso */}
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
