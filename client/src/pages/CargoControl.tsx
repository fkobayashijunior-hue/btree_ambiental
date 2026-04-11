import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Truck, Plus, Search, Package, Calendar, User, MapPin, FileText,
  Camera, Loader2, X, Image as ImageIcon, Weight, Navigation,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Pencil, Trash2,
  BarChart3, Download, Eye, RefreshCw, Building2
} from "lucide-react";
import { useFilePicker } from "@/hooks/useFilePicker";
import WorkLocationSelect from "@/components/WorkLocationSelect";

// ===== TIPOS =====
type TrackingStatus = "aguardando" | "carregando" | "em_transito" | "pesagem_saida" | "descarregando" | "pesagem_chegada" | "finalizado";

const TRACKING_STEPS: { key: TrackingStatus; label: string; icon: string }[] = [
  { key: "aguardando", label: "Aguardando", icon: "⏳" },
  { key: "carregando", label: "Carregando", icon: "📦" },
  { key: "em_transito", label: "Em Trânsito", icon: "🚛" },
  { key: "pesagem_saida", label: "Pesagem Saída", icon: "⚖️" },
  { key: "descarregando", label: "Descarregando", icon: "🏭" },
  { key: "pesagem_chegada", label: "Pesagem Chegada", icon: "⚖️" },
  { key: "finalizado", label: "Finalizado", icon: "✅" },
];

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const TRACKING_COLORS: Record<TrackingStatus, string> = {
  aguardando: "bg-gray-100 text-gray-700",
  carregando: "bg-blue-100 text-blue-700",
  em_transito: "bg-orange-100 text-orange-700",
  pesagem_saida: "bg-purple-100 text-purple-700",
  descarregando: "bg-yellow-100 text-yellow-700",
  pesagem_chegada: "bg-indigo-100 text-indigo-700",
  finalizado: "bg-green-100 text-green-700",
};

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
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ===== GERAÇÃO DE PDF =====
function generateCargoPDF(cargo: Record<string, unknown>, _companyName = "BTREE Ambiental") {
  const date = cargo.date ? new Date(cargo.date as string).toLocaleDateString("pt-BR") : "-";
  const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
  const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
  const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";
  const statusBadge = cargo.status === "entregue" ? "Entregue" : cargo.status === "cancelado" ? "Cancelado" : "Pendente";
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Carga #${cargo.id} - BTREE Ambiental</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 16px 28px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; filter: brightness(0) invert(1); }
  .pdf-header-text h1 { font-size: 18px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-content { padding: 20px 28px; }
  .pdf-footer { margin-top: 24px; padding: 12px 28px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
  .pdf-footer-left img { height: 28px; }
  .pdf-footer-text { font-size: 10px; color: #555; }
  .pdf-footer-text strong { color: #0d4f2e; }
  .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
  .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-footer-right img { width: 60px; height: 60px; }
  .pdf-footer-right span { font-size: 9px; color: #555; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-pendente { background: #fef9c3; color: #854d0e; }
  .badge-entregue { background: #dcfce7; color: #166534; }
  .badge-cancelado { background: #fee2e2; color: #991b1b; }
  .section { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .section-title { background: #f0fdf4; padding: 10px 16px; font-weight: bold; font-size: 14px; color: #0d4f2e; border-bottom: 1px solid #e5e7eb; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .field { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; }
  .field:last-child { border-bottom: none; }
  .field-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .field-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
  .tracking { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .tracking-step { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .step-done { background: #dcfce7; color: #166534; }
  .step-current { background: #0d4f2e; color: white; }
  .step-pending { background: #f3f4f6; color: #9ca3af; }
  .photos { display: flex; gap: 10px; flex-wrap: wrap; padding: 12px 16px; }
  .photos img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="pdf-header">
  <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
  <div class="pdf-header-text">
    <h1>Relatório de Carga #${cargo.id}</h1>
    <p>BTREE Empreendimentos LTDA · btreeambiental.com · Emitido em ${new Date().toLocaleString("pt-BR")} · Status: ${statusBadge}</p>
  </div>
</div>
<div class="pdf-content">

<div class="section">
  <div class="section-title">🚛 Veículo e Motorista</div>
  <div class="grid">
    <div class="field"><div class="field-label">Data</div><div class="field-value">${date}</div></div>
    <div class="field"><div class="field-label">Placa / Veículo</div><div class="field-value">${cargo.vehiclePlate || cargo.vehicleName || "-"}</div></div>
    <div class="field"><div class="field-label">Motorista</div><div class="field-value">${cargo.driverName || "-"}</div></div>
    <div class="field"><div class="field-label">Nº Nota Fiscal</div><div class="field-value">${cargo.invoiceNumber || "-"}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">📦 Informações da Carga</div>
  <div class="grid">
    <div class="field"><div class="field-label">Tipo de Madeira</div><div class="field-value">${cargo.woodType || "-"}</div></div>
    <div class="field"><div class="field-label">Peso (kg)</div><div class="field-value">${cargo.weightKg ? cargo.weightKg + " kg" : "-"}</div></div>
    <div class="field"><div class="field-label">Altura (m)</div><div class="field-value">${cargo.heightM || "-"}</div></div>
    <div class="field"><div class="field-label">Largura (m)</div><div class="field-value">${cargo.widthM || "-"}</div></div>
    <div class="field"><div class="field-label">Comprimento (m)</div><div class="field-value">${cargo.lengthM || "-"}</div></div>
    <div class="field"><div class="field-label">Volume (m³)</div><div class="field-value"><strong>${cargo.volumeM3 || "-"} m³</strong></div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">👤 Cliente e Destino</div>
  <div class="grid">
    <div class="field"><div class="field-label">Cliente</div><div class="field-value">${cargo.clientName || "-"}</div></div>
    <div class="field"><div class="field-label">Destino</div><div class="field-value">${cargo.destination || "-"}</div></div>
  </div>
  ${cargo.notes ? `<div class="field"><div class="field-label">Observações</div><div class="field-value">${cargo.notes}</div></div>` : ""}
</div>

${cargo.trackingStatus ? `
<div class="section">
  <div class="section-title">📍 Acompanhamento</div>
  <div style="padding: 12px 16px;">
    <div class="tracking">
      ${TRACKING_STEPS.map(step => {
        const idx = TRACKING_STEPS.findIndex(s => s.key === cargo.trackingStatus);
        const stepIdx = TRACKING_STEPS.findIndex(s => s.key === step.key);
        const cls = stepIdx < idx ? "step-done" : stepIdx === idx ? "step-current" : "step-pending";
        return `<span class="tracking-step ${cls}">${step.icon} ${step.label}</span>`;
      }).join("")}
    </div>
    ${cargo.trackingNotes ? `<p style="margin-top:10px;font-size:13px;color:#374151;">${cargo.trackingNotes}</p>` : ""}
  </div>
</div>` : ""}

${(cargo.weightOutPhotoUrl || cargo.weightInPhotoUrl) ? `
<div class="section">
  <div class="section-title">⚖️ Fotos de Pesagem</div>
  <div class="photos">
    ${cargo.weightOutPhotoUrl ? `<div><div class="field-label" style="padding:0 0 4px">Pesagem Saída</div><img src="${cargo.weightOutPhotoUrl}" alt="Pesagem saída"/></div>` : ""}
    ${cargo.weightInPhotoUrl ? `<div><div class="field-label" style="padding:0 0 4px">Pesagem Chegada</div><img src="${cargo.weightInPhotoUrl}" alt="Pesagem chegada"/></div>` : ""}
  </div>
</div>` : ""}

</div>
<div class="pdf-footer">
  <div class="pdf-footer-left">
    <img src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
    <div class="pdf-footer-text">
      Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
      <a href="https://btreeambiental.com">btreeambiental.com</a>
    </div>
  </div>
  <div class="pdf-footer-right">
    <img src="${BTREE_QR}" alt="QR Code" />
    <span>Acesse nosso site</span>
  </div>
</div>
<script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ===== COMPONENTE PRINCIPAL =====
export default function CargoControl() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "pendente" | "entregue" | "cancelado">("");
  const [viewMode, setViewMode] = useState<"lista" | "tracking">("lista");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [trackingCargoId, setTrackingCargoId] = useState<number | null>(null);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [newDestCity, setNewDestCity] = useState("");
  const [newDestState, setNewDestState] = useState("");
  const [newDestClientId, setNewDestClientId] = useState(0);
  const { openFilePicker } = useFilePicker();

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    vehicleId: 0,
    vehiclePlate: "",
    driverCollaboratorId: 0,
    driverName: "",
    heightM: "", widthM: "", lengthM: "",
    weightKg: "",
    woodType: "",
    destinationId: 0,
    destination: "",
    invoiceNumber: "",
    clientId: 0,
    clientName: "",
    notes: "",
    status: "pendente" as "pendente" | "entregue" | "cancelado",
    workLocationId: "",
  });
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Tracking state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("aguardando");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [weightPhotoType, setWeightPhotoType] = useState<"weight_out" | "weight_in" | null>(null);

  // Queries
  const { data: loads = [], isLoading } = trpc.cargoLoads.list.useQuery({ search: search || undefined });
  const { data: trucks = [] } = trpc.cargoLoads.listTrucks.useQuery();
  const { data: drivers = [] } = trpc.cargoLoads.listDrivers.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  const { data: destinations = [] } = trpc.cargoLoads.listDestinations.useQuery();
  const { data: detailCargo } = trpc.cargoLoads.getById.useQuery(
    { id: detailId! }, { enabled: !!detailId }
  );
  const { data: detailTrackingPhotos = [] } = trpc.cargoLoads.listTrackingPhotos.useQuery(
    { cargoId: detailId! }, { enabled: !!detailId }
  );

  // Mutations
  const createMutation = trpc.cargoLoads.create.useMutation({
    onSuccess: () => { toast.success("Carga registrada!"); utils.cargoLoads.list.invalidate(); setIsFormOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.cargoLoads.update.useMutation({
    onSuccess: () => { toast.success("Carga atualizada!"); utils.cargoLoads.list.invalidate(); setIsFormOpen(false); setEditId(null); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.cargoLoads.delete.useMutation({
    onSuccess: () => { toast.success("Carga removida!"); utils.cargoLoads.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateTracking = trpc.cargoLoads.updateTracking.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.cargoLoads.list.invalidate(); utils.cargoLoads.getById.invalidate(); setTrackingCargoId(null); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhotoMutation = trpc.cargoLoads.uploadPhoto.useMutation({
    onSuccess: (data) => {
      if (weightPhotoType) {
        toast.success("Foto de pesagem salva!");
        utils.cargoLoads.getById.invalidate();
        utils.cargoLoads.list.invalidate();
      } else {
        setPendingPhotos(prev => [...prev, data.url]);
        toast.success("Foto adicionada!");
      }
      setUploadingPhoto(false);
      setWeightPhotoType(null);
    },
    onError: (e) => { toast.error(e.message); setUploadingPhoto(false); },
  });
  const createDestination = trpc.cargoLoads.createDestination.useMutation({
    onSuccess: () => { toast.success("Destino cadastrado!"); utils.cargoLoads.listDestinations.invalidate(); setIsDestinationOpen(false); setNewDestName(""); setNewDestCity(""); setNewDestState(""); },
    onError: (e) => toast.error(e.message),
  });

  const volume = useMemo(() => calcVolume(form.heightM, form.widthM, form.lengthM), [form.heightM, form.widthM, form.lengthM]);

  const resetForm = () => {
    setForm({ date: new Date().toISOString().slice(0, 10), vehicleId: 0, vehiclePlate: "", driverCollaboratorId: 0, driverName: "", heightM: "", widthM: "", lengthM: "", weightKg: "", woodType: "", destinationId: 0, destination: "", invoiceNumber: "", clientId: 0, clientName: "", notes: "", status: "pendente", workLocationId: "" });
    setPendingPhotos([]);
  };

  const openEdit = (cargo: typeof loads[number]) => {
    setEditId(cargo.id);
    setForm({
      date: cargo.date ? new Date(cargo.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      vehicleId: cargo.vehicleId || 0,
      vehiclePlate: cargo.vehiclePlate || "",
      driverCollaboratorId: cargo.driverCollaboratorId || 0,
      driverName: cargo.driverName || "",
      heightM: cargo.heightM || "",
      widthM: cargo.widthM || "",
      lengthM: cargo.lengthM || "",
      weightKg: cargo.weightKg || "",
      woodType: cargo.woodType || "",
      destinationId: cargo.destinationId || 0,
      destination: cargo.destination || "",
      invoiceNumber: cargo.invoiceNumber || "",
      clientId: cargo.clientId || 0,
      clientName: cargo.clientName || "",
      notes: cargo.notes || "",
      status: cargo.status as "pendente" | "entregue" | "cancelado",
      workLocationId: (cargo as any).workLocationId ? String((cargo as any).workLocationId) : "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      vehicleId: form.vehicleId || undefined,
      driverCollaboratorId: form.driverCollaboratorId || undefined,
      destinationId: form.destinationId || undefined,
      clientId: form.clientId || undefined,
      volumeM3: volume || "0",
      photosJson: pendingPhotos.length ? JSON.stringify(pendingPhotos) : undefined,
      workLocationId: form.workLocationId ? parseInt(form.workLocationId) : undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddPhoto = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      if (editId && weightPhotoType) {
        uploadPhotoMutation.mutate({ cargoId: editId, photoBase64: compressed, photoType: weightPhotoType });
      } else if (editId) {
        uploadPhotoMutation.mutate({ cargoId: editId, photoBase64: compressed, photoType: "cargo" });
      } else {
        setPendingPhotos(prev => [...prev, compressed]);
        setUploadingPhoto(false);
      }
    } catch {
      toast.error("Erro ao processar imagem");
      setUploadingPhoto(false);
    }
  };

  const handleWeightPhoto = (type: "weight_out" | "weight_in", cargoId: number) => {
    setWeightPhotoType(type);
    setEditId(cargoId);
    openFilePicker({ accept: "image/*" }, handleAddPhoto);
  };

  // Filtrar cargas
  const filtered = useMemo(() => {
    return loads.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      return true;
    });
  }, [loads, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: loads.length,
    pendente: loads.filter(c => c.status === "pendente").length,
    entregue: loads.filter(c => c.status === "entregue").length,
    volumeTotal: loads.reduce((acc, c) => acc + parseFloat(c.volumeM3 || "0"), 0).toFixed(2),
  }), [loads]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Truck className="h-7 w-7" /> Controle de Cargas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registre e acompanhe as saídas de carga</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className={`gap-2 ${viewMode === "tracking" ? "bg-emerald-50 border-emerald-300" : ""}`}
            onClick={() => setViewMode(v => v === "lista" ? "tracking" : "lista")}
          >
            <Navigation className="h-4 w-4" />
            {viewMode === "lista" ? "Ver Tracking" : "Ver Lista"}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => { resetForm(); setEditId(null); setIsFormOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nova Carga
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "Pendentes", value: stats.pendente, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Entregues", value: stats.entregue, color: "text-green-700", bg: "bg-green-50" },
          { label: "Volume Total", value: `${stats.volumeTotal} m³`, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar placa, cliente, destino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista de Cargas */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma carga encontrada</p>
          <p className="text-sm mt-1">Registre a primeira saída de carga</p>
        </div>
      ) : viewMode === "tracking" ? (
        /* ===== VIEW: TRACKING TIMELINE ===== */
        <div className="space-y-4">
          {filtered.map(cargo => {
            const currentIdx = TRACKING_STEPS.findIndex(s => s.key === cargo.trackingStatus);
            const photos: string[] = cargo.photosJson ? (() => { try { return JSON.parse(cargo.photosJson); } catch { return []; } })() : [];
            return (
              <Card key={cargo.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {photos[0] ? (
                        <img src={photos[0]} alt="Carga" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-emerald-500" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{cargo.vehiclePlate || cargo.vehicleName || "Veículo"}</span>
                          <Badge className={`text-xs ${STATUS_COLORS[cargo.status]}`}>{cargo.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                          <span>{cargo.date ? new Date(cargo.date).toLocaleDateString("pt-BR") : "-"}</span>
                          {cargo.clientName && <span>{cargo.clientName}</span>}
                          {cargo.destination && <span>→ {cargo.destination}</span>}
                          <span>{cargo.volumeM3} m³</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" title="Atualizar tracking" onClick={() => { setTrackingCargoId(cargo.id); setTrackingStatus((cargo.trackingStatus as TrackingStatus) || "aguardando"); setTrackingNotes(""); }}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600" title="Ver detalhes" onClick={() => setDetailId(cargo.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  {/* Timeline horizontal */}
                  <div className="flex items-center gap-0 overflow-x-auto pb-2">
                    {TRACKING_STEPS.map((step, idx) => {
                      const isDone = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <div key={step.key} className="flex items-center">
                          <div className="flex flex-col items-center min-w-[70px]">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                              isDone ? "bg-emerald-500 text-white shadow-sm" : isCurrent ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md" : "bg-gray-100 text-gray-400"
                            }`}>
                              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <span>{step.icon}</span>}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight font-medium ${
                              isDone ? "text-emerald-600" : isCurrent ? "text-emerald-700 font-bold" : "text-gray-400"
                            }`}>{step.label}</span>
                          </div>
                          {idx < TRACKING_STEPS.length - 1 && (
                            <div className={`h-0.5 w-6 mx-0.5 rounded-full ${
                              idx < currentIdx ? "bg-emerald-400" : "bg-gray-200"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {cargo.trackingNotes && (
                    <p className="text-xs text-gray-500 italic mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      "{cargo.trackingNotes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ===== VIEW: LISTA PADRÃO ===== */
        <div className="space-y-3">
          {filtered.map(cargo => {
            const trackStep = TRACKING_STEPS.find(s => s.key === cargo.trackingStatus);
            const photos: string[] = cargo.photosJson ? (() => { try { return JSON.parse(cargo.photosJson); } catch { return []; } })() : [];
            return (
              <Card key={cargo.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Foto principal */}
                    {photos[0] ? (
                      <img src={photos[0]} alt="Carga" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Package className="h-7 w-7 text-emerald-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">
                          {cargo.vehiclePlate || cargo.vehicleName || "Veículo não informado"}
                        </span>
                        <Badge className={`text-xs ${STATUS_COLORS[cargo.status]}`}>{cargo.status}</Badge>
                        {trackStep && (
                          <Badge className={`text-xs ${TRACKING_COLORS[cargo.trackingStatus as TrackingStatus]}`}>
                            {trackStep.icon} {trackStep.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{cargo.date ? new Date(cargo.date).toLocaleDateString("pt-BR") : "-"}</span>
                        {cargo.driverName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{cargo.driverName}</span>}
                        {cargo.clientName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{cargo.clientName}</span>}
                        {cargo.destination && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{cargo.destination}</span>}
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{cargo.volumeM3} m³{cargo.weightKg ? ` · ${cargo.weightKg} kg` : ""}</span>
                      </div>
                    </div>
                    {/* Ações */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Ver detalhes" onClick={() => setDetailId(cargo.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" title="Atualizar tracking" onClick={() => { setTrackingCargoId(cargo.id); setTrackingStatus((cargo.trackingStatus as TrackingStatus) || "aguardando"); setTrackingNotes(""); }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Editar" onClick={() => openEdit(cargo)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Gerar PDF" onClick={() => generateCargoPDF(cargo as unknown as Record<string, unknown>)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" title="Excluir" onClick={() => { if (confirm("Remover esta carga?")) deleteMutation.mutate({ id: cargo.id }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== DIALOG: FORMULÁRIO DE CARGA ===== */}
      <Sheet open={isFormOpen} onOpenChange={(v) => { setIsFormOpen(v); if (!v) { setEditId(null); resetForm(); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-emerald-800">{editId ? "Editar Carga" : "Nova Carga"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4 pb-8">
            {/* Data */}
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            {/* Veículo */}
            <div className="space-y-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2"><Truck className="h-4 w-4" /> Veículo e Motorista</p>
              <div>
                <Label>Caminhão</Label>
                <select
                  value={form.vehicleId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const truck = trucks.find(t => t.id === id);
                    setForm(f => ({
                      ...f,
                      vehicleId: id,
                      vehiclePlate: truck?.licensePlate || f.vehiclePlate,
                      heightM: (truck as any)?.defaultHeightM || f.heightM || "2.4",
                      widthM: (truck as any)?.defaultWidthM || f.widthM || "2.4",
                      lengthM: (truck as any)?.defaultLengthM || f.lengthM || "13.80",
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar caminhão cadastrado...</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.licensePlate ? ` — ${t.licensePlate}` : ""}</option>
                  ))}
                </select>
              </div>
              {!form.vehicleId && (
                <div>
                  <Label>Placa (manual)</Label>
                  <Input value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" className="uppercase" />
                </div>
              )}
              <div>
                <Label>Motorista</Label>
                <select
                  value={form.driverCollaboratorId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const driver = drivers.find(d => d.id === id);
                    setForm(f => ({ ...f, driverCollaboratorId: id, driverName: driver?.name || f.driverName }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar motorista cadastrado...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {!form.driverCollaboratorId && (
                <div>
                  <Label>Motorista (manual)</Label>
                  <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Nome do motorista" />
                </div>
              )}
            </div>

            {/* Carga */}
            <div className="space-y-3 p-3 bg-emerald-50 rounded-xl">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><Package className="h-4 w-4" /> Informações da Carga</p>
              <div>
                <Label>Tipo de Madeira</Label>
                <Input value={form.woodType} onChange={e => setForm(f => ({ ...f, woodType: e.target.value }))} placeholder="ex: Eucalipto, Pinus" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Altura (m) *</Label>
                  <Input value={form.heightM} onChange={e => setForm(f => ({ ...f, heightM: e.target.value }))} placeholder="0.00" required />
                </div>
                <div>
                  <Label>Largura (m) *</Label>
                  <Input value={form.widthM} onChange={e => setForm(f => ({ ...f, widthM: e.target.value }))} placeholder="0.00" required />
                </div>
                <div>
                  <Label>Comp. (m) *</Label>
                  <Input value={form.lengthM} onChange={e => setForm(f => ({ ...f, lengthM: e.target.value }))} placeholder="0.00" required />
                </div>
              </div>
              {volume && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <span className="text-xs text-gray-500">Volume calculado: </span>
                  <span className="font-bold text-emerald-700">{volume} m³</span>
                </div>
              )}
              <div>
                <Label className="flex items-center gap-1"><Weight className="h-3.5 w-3.5" /> Peso (kg)</Label>
                <Input value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="ex: 15000" type="number" />
              </div>
              <div>
                <Label>Nº Nota Fiscal</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="ex: NF-001234" />
              </div>
            </div>

            {/* Cliente e Destino */}
            <div className="space-y-3 p-3 bg-purple-50 rounded-xl">
              <p className="text-sm font-semibold text-purple-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> Cliente e Destino</p>
              <div>
                <Label>Cliente</Label>
                <select
                  value={form.clientId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const client = clientsList.find((c: { id: number; name: string }) => c.id === id);
                    setForm(f => ({ ...f, clientId: id, clientName: client?.name || f.clientName }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar cliente cadastrado...</option>
                  {clientsList.map((c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {!form.clientId && (
                <div>
                  <Label>Cliente (manual)</Label>
                  <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Destino</Label>
                  <button type="button" onClick={() => setIsDestinationOpen(true)} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Cadastrar novo
                  </button>
                </div>
                <select
                  value={form.destinationId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const dest = destinations.find(d => d.id === id) as (typeof destinations[number] & { clientId?: number | null }) | undefined;
                    // Auto-preencher clientId se o destino tiver cliente vinculado
                    const linkedClientId = dest?.clientId;
                    const linkedClient = linkedClientId ? (clientsList as { id: number; name: string }[]).find(c => c.id === linkedClientId) : null;
                    setForm(f => ({
                      ...f,
                      destinationId: id,
                      destination: dest?.name || f.destination,
                      ...(linkedClientId ? { clientId: linkedClientId, clientName: linkedClient?.name || f.clientName } : {}),
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar destino cadastrado...</option>
                  {destinations.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.city ? ` — ${d.city}/${d.state}` : ""}</option>
                  ))}
                </select>
              </div>
              {!form.destinationId && (
                <div>
                  <Label>Destino (manual)</Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Nome do destino" />
                </div>
              )}
            </div>

            {/* Local de Trabalho */}
            <WorkLocationSelect
              value={form.workLocationId}
              onChange={(id) => setForm(f => ({ ...f, workLocationId: id }))}
            />

            {/* Status e Observações */}
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="pendente">Pendente</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <Label>Observações</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações sobre a carga..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Fotos */}
            <div>
              <Label className="flex items-center gap-2 mb-2"><Camera className="h-4 w-4" /> Fotos da Carga</Label>
              <div className="flex flex-wrap gap-2">
                {pendingPhotos.map((p, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setPendingPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openFilePicker({ accept: "image/*" }, handleAddPhoto)}
                  disabled={uploadingPhoto}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-xs mt-1">Foto</span></>}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Salvar" : "Registrar Carga"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ===== DIALOG: DETALHE DA CARGA ===== */}
      <Dialog open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Detalhes da Carga #{detailId}</DialogTitle>
          </DialogHeader>
          {detailCargo && (
            <div className="space-y-4">
              {/* Tracking timeline */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Acompanhamento</p>
                <div className="flex flex-wrap gap-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const currentIdx = TRACKING_STEPS.findIndex(s => s.key === detailCargo.trackingStatus);
                    const cls = idx < currentIdx ? "bg-green-100 text-green-700" : idx === currentIdx ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400";
                    return (
                      <span key={step.key} className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 ${cls}`}>
                        {step.icon} {step.label}
                      </span>
                    );
                  })}
                </div>
                {detailCargo.trackingNotes && <p className="text-sm text-gray-600 mt-2 italic">"{detailCargo.trackingNotes}"</p>}
              </div>

              {/* Dados */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Data", detailCargo.date ? new Date(detailCargo.date).toLocaleDateString("pt-BR") : "-"],
                  ["Veículo", detailCargo.vehiclePlate || detailCargo.vehicleName || "-"],
                  ["Motorista", detailCargo.driverName || "-"],
                  ["Cliente", detailCargo.clientName || "-"],
                  ["Destino", detailCargo.destination || "-"],
                  ["Tipo de Madeira", detailCargo.woodType || "-"],
                  ["Volume Previsto", `${detailCargo.volumeM3} m³`],
                  ["Peso Previsto", detailCargo.weightKg ? `${detailCargo.weightKg} kg` : "-"],
                  ["Nota Fiscal", detailCargo.invoiceNumber || "-"],
                  ["Status", detailCargo.status],
                  ["Peso Saída (kg)", (detailCargo as any).weightOutKg ? `${(detailCargo as any).weightOutKg} kg` : "-"],
                  ["Peso Chegada (kg)", (detailCargo as any).weightInKg ? `${(detailCargo as any).weightInKg} kg` : "-"],
                  ["Metragem Final", (detailCargo as any).finalHeightM ? `${(detailCargo as any).finalHeightM} x ${(detailCargo as any).finalWidthM} x ${(detailCargo as any).finalLengthM} m = ${calcVolume((detailCargo as any).finalHeightM || "0", (detailCargo as any).finalWidthM || "0", (detailCargo as any).finalLengthM || "0")} m³` : "-"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Fotos de Tracking por Etapa */}
              {detailTrackingPhotos.length > 0 && (() => {
                const grouped = detailTrackingPhotos.reduce<Record<string, typeof detailTrackingPhotos>>((acc, p) => {
                  if (!acc[p.stage]) acc[p.stage] = [];
                  acc[p.stage]!.push(p);
                  return acc;
                }, {});
                return (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fotos por Etapa</p>
                    <div className="space-y-3">
                      {TRACKING_STEPS.filter(s => grouped[s.key]).map(step => (
                        <div key={step.key}>
                          <p className="text-xs font-medium text-gray-600 mb-1">{step.icon} {step.label}</p>
                          <div className="flex gap-2 flex-wrap">
                            {grouped[step.key]!.map((tp) => (
                              <div key={tp.id} className="relative group">
                                <img
                                  src={tp.photoUrl}
                                  alt={step.label}
                                  className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(tp.photoUrl, "_blank")}
                                />
                                {tp.notes && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">
                                    {tp.notes}
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {tp.registeredByName} · {new Date(tp.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Fotos de pesagem */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Fotos de Pesagem</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Pesagem Saída</p>
                    {detailCargo.weightOutPhotoUrl ? (
                      <img src={detailCargo.weightOutPhotoUrl} alt="Pesagem saída" className="w-full h-32 object-cover rounded-lg border" />
                    ) : (
                      <button onClick={() => handleWeightPhoto("weight_out", detailCargo.id)} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 text-xs gap-1">
                        <Camera className="h-5 w-5" /> Adicionar foto
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Pesagem Chegada</p>
                    {detailCargo.weightInPhotoUrl ? (
                      <img src={detailCargo.weightInPhotoUrl} alt="Pesagem chegada" className="w-full h-32 object-cover rounded-lg border" />
                    ) : (
                      <button onClick={() => handleWeightPhoto("weight_in", detailCargo.id)} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 text-xs gap-1">
                        <Camera className="h-5 w-5" /> Adicionar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fotos da carga */}
              {detailCargo.photosJson && (() => {
                try {
                  const photos: string[] = JSON.parse(detailCargo.photosJson);
                  if (!photos.length) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Fotos da Carga ({photos.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {photos.map((p, i) => (
                          <img key={i} src={p} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" onClick={() => window.open(p, "_blank")} />
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailId(null); openEdit(detailCargo as unknown as typeof loads[number]); }}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => generateCargoPDF(detailCargo as unknown as Record<string, unknown>)}>
                  <Download className="h-4 w-4" /> Gerar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: ATUALIZAR TRACKING ===== */}
      <Dialog open={!!trackingCargoId} onOpenChange={v => { if (!v) setTrackingCargoId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Atualizar Acompanhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {TRACKING_STEPS.map(step => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setTrackingStatus(step.key)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${trackingStatus === step.key ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 hover:border-emerald-300"}`}
                >
                  <span className="text-lg">{step.icon}</span>
                  <p className="mt-1">{step.label}</p>
                </button>
              ))}
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <textarea
                value={trackingNotes}
                onChange={e => setTrackingNotes(e.target.value)}
                placeholder="ex: Saiu da fazenda às 14h30..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setTrackingCargoId(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updateTracking.isPending}
                onClick={() => {
                  if (trackingCargoId) {
                    updateTracking.mutate({ id: trackingCargoId, trackingStatus, trackingNotes: trackingNotes || undefined });
                  }
                }}
              >
                {updateTracking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: CADASTRAR DESTINO ===== */}
      <Dialog open={isDestinationOpen} onOpenChange={v => { setIsDestinationOpen(v); if (!v) { setNewDestName(""); setNewDestCity(""); setNewDestState(""); setNewDestClientId(0); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar Destino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do Destino *</Label>
              <Input value={newDestName} onChange={e => setNewDestName(e.target.value)} placeholder="ex: Fazenda São João, Usina Boa Vista" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade</Label>
                <Input value={newDestCity} onChange={e => setNewDestCity(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={newDestState} onChange={e => setNewDestState(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} className="uppercase" />
              </div>
            </div>
            <div>
              <Label>Vincular ao Cliente (Portal)</Label>
              <select
                value={newDestClientId}
                onChange={e => setNewDestClientId(parseInt(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={0}>Nenhum (sem portal)</option>
                {(clientsList as { id: number; name: string }[]).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Se vinculado, o cliente verá as cargas deste destino no portal automaticamente.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDestinationOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!newDestName || createDestination.isPending}
                onClick={() => createDestination.mutate({ name: newDestName, city: newDestCity || undefined, state: newDestState || undefined, clientId: newDestClientId || undefined })}
              >
                {createDestination.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
