import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Truck, Plus, Search, Package, Calendar, User, MapPin, FileText,
  ChevronDown, ChevronUp, Camera, Loader2, Download, X, Image as ImageIcon,
  BarChart3, Filter
} from "lucide-react";

type FormData = {
  date: string;
  vehiclePlate: string;
  driverName: string;
  heightM: string;
  widthM: string;
  lengthM: string;
  woodType: string;
  destination: string;
  invoiceNumber: string;
  clientName: string;
  notes: string;
  status: "pendente" | "entregue" | "cancelado";
  photosJson?: string;
};

const emptyForm: FormData = {
  date: new Date().toISOString().slice(0, 10),
  vehiclePlate: "",
  driverName: "",
  heightM: "",
  widthM: "",
  lengthM: "",
  woodType: "",
  destination: "",
  invoiceNumber: "",
  clientName: "",
  notes: "",
  status: "pendente",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function calcVolume(h: string, w: string, l: string): string {
  const hN = parseFloat(h.replace(",", "."));
  const wN = parseFloat(w.replace(",", "."));
  const lN = parseFloat(l.replace(",", "."));
  if (isNaN(hN) || isNaN(wN) || isNaN(lN)) return "";
  return (hN * wN * lN).toFixed(3);
}

function SectionTitle({ icon, title, open, onToggle }: { icon: React.ReactNode; title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-800 font-semibold text-sm"
    >
      <span className="flex items-center gap-2">{icon}{title}</span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
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

export default function CargoControl() {
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "pendente" | "entregue" | "cancelado">("");
  const [viewMode, setViewMode] = useState<"lista" | "relatorio">("lista");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [openSections, setOpenSections] = useState({ veiculo: true, carga: true, cliente: false });
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: loads = [], isLoading } = trpc.cargoLoads.list.useQuery({
    search: search || undefined,
  });

  const analyzePhotoMutation = trpc.cargoLoads.analyzePhoto.useMutation({
    onSuccess: (result) => {
      const d = result.extracted;
      setForm(f => ({
        ...f,
        date: d.date || f.date,
        vehiclePlate: d.vehiclePlate || f.vehiclePlate,
        driverName: d.driverName || f.driverName,
        heightM: d.heightM || f.heightM,
        widthM: d.widthM || f.widthM,
        lengthM: d.lengthM || f.lengthM,
        woodType: d.woodType || f.woodType,
        destination: d.destination || f.destination,
        invoiceNumber: d.invoiceNumber || f.invoiceNumber,
        clientName: d.clientName || f.clientName,
        notes: d.notes || f.notes,
      }));
      // Adicionar foto ao array de fotos pendentes
      setPendingPhotos(prev => [...prev, result.photoUrl]);
      toast.success("Dados extraídos com sucesso! Verifique e ajuste se necessário.");
    },
    onError: (e) => toast.error(e.message || "Erro ao analisar foto"),
    onSettled: () => setAnalyzingPhoto(false),
  });

  const createMutation = trpc.cargoLoads.create.useMutation({
    onSuccess: () => {
      toast.success("Carga registrada com sucesso!");
      utils.cargoLoads.list.invalidate();
      setIsOpen(false);
      setForm(emptyForm);
      setPendingPhotos([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.cargoLoads.update.useMutation({
    onSuccess: () => {
      toast.success("Carga atualizada!");
      utils.cargoLoads.list.invalidate();
      setIsOpen(false);
      setEditId(null);
      setForm(emptyForm);
      setPendingPhotos([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.cargoLoads.delete.useMutation({
    onSuccess: () => {
      toast.success("Carga removida!");
      utils.cargoLoads.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const volume = useMemo(() => calcVolume(form.heightM, form.widthM, form.lengthM), [form.heightM, form.widthM, form.lengthM]);

  const handlePhotoForAnalysis = async (file: File) => {
    setAnalyzingPhoto(true);
    try {
      const compressed = await compressImage(file);
      analyzePhotoMutation.mutate({ photoBase64: compressed });
    } catch {
      toast.error("Erro ao processar imagem");
      setAnalyzingPhoto(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allPhotos = [
      ...(form.photosJson ? JSON.parse(form.photosJson) : []),
      ...pendingPhotos,
    ];
    const data = {
      date: form.date,
      vehiclePlate: form.vehiclePlate || undefined,
      driverName: form.driverName || undefined,
      heightM: form.heightM,
      widthM: form.widthM,
      lengthM: form.lengthM,
      volumeM3: volume || "0",
      woodType: form.woodType || undefined,
      destination: form.destination || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      clientName: form.clientName || undefined,
      notes: form.notes || undefined,
      status: form.status,
      photosJson: allPhotos.length > 0 ? JSON.stringify(allPhotos) : undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (load: any) => {
    setEditId(load.id);
    setForm({
      date: load.date ? new Date(load.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      vehiclePlate: load.vehiclePlate || "",
      driverName: load.driverName || "",
      heightM: load.heightM || "",
      widthM: load.widthM || "",
      lengthM: load.lengthM || "",
      woodType: load.woodType || "",
      destination: load.destination || "",
      invoiceNumber: load.invoiceNumber || "",
      clientName: load.clientName || "",
      notes: load.notes || "",
      status: load.status || "pendente",
      photosJson: load.photosJson,
    });
    setPendingPhotos([]);
    setOpenSections({ veiculo: true, carga: true, cliente: true });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setPendingPhotos([]);
    setOpenSections({ veiculo: true, carga: true, cliente: false });
    setIsOpen(true);
  };

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Filtrar cargas
  const filteredLoads = useMemo(() => {
    let result = loads as any[];
    if (filterClient) result = result.filter(l => l.clientName?.toLowerCase().includes(filterClient.toLowerCase()));
    if (filterStatus) result = result.filter(l => l.status === filterStatus);
    return result;
  }, [loads, filterClient, filterStatus]);

  // Stats
  const totalVolume = filteredLoads.reduce((acc: number, l: any) => acc + parseFloat(l.volumeM3 || "0"), 0);
  const pendentes = filteredLoads.filter((l: any) => l.status === "pendente").length;
  const entregues = filteredLoads.filter((l: any) => l.status === "entregue").length;

  // Agrupar por cliente para relatório
  const byClient = useMemo(() => {
    const map: Record<string, { loads: any[]; totalVolume: number }> = {};
    filteredLoads.forEach((l: any) => {
      const key = l.clientName || "Sem cliente";
      if (!map[key]) map[key] = { loads: [], totalVolume: 0 };
      map[key].loads.push(l);
      map[key].totalVolume += parseFloat(l.volumeM3 || "0");
    });
    return Object.entries(map).sort((a, b) => b[1].totalVolume - a[1].totalVolume);
  }, [filteredLoads]);

  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";

  const handleGenerateReport = (clientFilter?: string) => {
    const reportLoads = clientFilter
      ? filteredLoads.filter((l: any) => l.clientName === clientFilter)
      : filteredLoads;

    const rows = reportLoads.map((l: any) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.date ? new Date(l.date).toLocaleDateString("pt-BR") : "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.vehiclePlate || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.driverName || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.woodType || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.heightM || "-"} × ${l.widthM || "-"} × ${l.lengthM || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#065f46;">${parseFloat(l.volumeM3 || "0").toFixed(3)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.invoiceNumber || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${l.clientName || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">
          <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${l.status === "entregue" ? "#d1fae5" : l.status === "cancelado" ? "#fee2e2" : "#fef3c7"};color:${l.status === "entregue" ? "#065f46" : l.status === "cancelado" ? "#991b1b" : "#92400e"};">${STATUS_LABELS[l.status] || l.status}</span>
        </td>
      </tr>`).join("");

    const totalVol = reportLoads.reduce((acc: number, l: any) => acc + parseFloat(l.volumeM3 || "0"), 0);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Cargas — BTREE Ambiental</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
  .header { background: linear-gradient(135deg, #0d4f2e, #1a7a4a); color: white; padding: 20px 30px; display: flex; align-items: center; gap: 20px; }
  .header img { height: 60px; filter: brightness(0) invert(1); }
  .header-text h1 { margin: 0; font-size: 20px; }
  .header-text p { margin: 4px 0 0; opacity: 0.8; font-size: 12px; }
  .content { padding: 20px 30px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .value { font-size: 22px; font-weight: bold; color: #065f46; }
  .stat .label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .section-title { font-size: 13px; font-weight: bold; color: #0d4f2e; border-bottom: 2px solid #0d4f2e; padding-bottom: 4px; margin: 16px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 12px 30px; text-align: center; font-size: 11px; color: #9ca3af; margin-top: 20px; }
  .footer strong { color: #0d4f2e; }
  .qr-note { font-size: 10px; color: #9ca3af; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <img src="${logoUrl}" alt="BTREE Ambiental" />
  <div class="header-text">
    <h1>Relatório de Controle de Cargas</h1>
    <p>${clientFilter ? `Cliente: ${clientFilter} · ` : ""}${reportLoads.length} carga(s) · Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
    <p>BTREE Empreendimentos LTDA · CNPJ: 47.714.027/0001-52 · Astorga, Paraná</p>
  </div>
</div>
<div class="content">
  <div class="stats">
    <div class="stat"><div class="value">${reportLoads.length}</div><div class="label">Total de Cargas</div></div>
    <div class="stat"><div class="value">${totalVol.toFixed(2)}</div><div class="label">Volume Total (m³)</div></div>
    <div class="stat"><div class="value">${reportLoads.filter((l: any) => l.status === "entregue").length}</div><div class="label">Entregues</div></div>
    <div class="stat"><div class="value">${reportLoads.filter((l: any) => l.status === "pendente").length}</div><div class="label">Pendentes</div></div>
  </div>
  <div class="section-title">Detalhamento das Cargas</div>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Placa</th><th>Motorista</th><th>Tipo</th>
        <th>Dimensões (m)</th><th>Volume (m³)</th><th>NF</th><th>Cliente</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f0fdf4;">
        <td colspan="5" style="padding:8px;font-weight:bold;color:#065f46;">TOTAL</td>
        <td style="padding:8px;font-weight:bold;color:#065f46;font-size:13px;">${totalVol.toFixed(3)} m³</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>
</div>
<div class="footer">
  <strong>BTREE Empreendimentos LTDA</strong> · btreeambiental.com · Astorga, Paraná · (44) XXXX-XXXX
  <br/><span class="qr-note">Acesse btreeambiental.com para verificar autenticidade deste documento</span>
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita pop-ups para gerar o relatório"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const existingPhotos: string[] = useMemo(() => {
    if (!form.photosJson) return [];
    try { return JSON.parse(form.photosJson); } catch { return []; }
  }, [form.photosJson]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Truck className="h-7 w-7" /> Controle de Cargas
          </h1>
          <p className="text-gray-500 text-sm mt-1">{loads.length} carga{loads.length !== 1 ? "s" : ""} registrada{loads.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setViewMode(v => v === "lista" ? "relatorio" : "lista")}
            className="gap-2 border-emerald-300 text-emerald-700"
          >
            <BarChart3 className="h-4 w-4" />
            {viewMode === "lista" ? "Acompanhamento" : "Lista"}
          </Button>
          <Button onClick={() => handleGenerateReport()} variant="outline" className="gap-2 border-emerald-300 text-emerald-700">
            <Download className="h-4 w-4" /> Relatório PDF
          </Button>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Nova Carga
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{totalVolume.toFixed(1)}</p>
            <p className="text-xs text-gray-500">m³ total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
            <p className="text-xs text-gray-500">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{entregues}</p>
            <p className="text-xs text-gray-500">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por motorista, cliente, destino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Filtrar por cliente..."
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Vista de Acompanhamento por Cliente */}
      {viewMode === "relatorio" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-emerald-800">Acompanhamento por Cliente</h2>
          {byClient.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhuma carga encontrada</p>
          ) : (
            byClient.map(([clientName, data]) => (
              <Card key={clientName} className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-bold text-emerald-800">{clientName}</p>
                      <p className="text-sm text-gray-500">{data.loads.length} carga(s)</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-700">{data.totalVolume.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">m³ total</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateReport(clientName)}
                        className="gap-1 border-emerald-300 text-emerald-700"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {data.loads.slice(0, 5).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                        <span>{l.date ? new Date(l.date).toLocaleDateString("pt-BR") : "-"} · {l.vehiclePlate || "-"} · {l.driverName || "-"}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">{parseFloat(l.volumeM3 || "0").toFixed(2)} m³</span>
                          <Badge className={`text-xs ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</Badge>
                        </div>
                      </div>
                    ))}
                    {data.loads.length > 5 && (
                      <p className="text-xs text-gray-400 pt-1">+{data.loads.length - 5} carga(s) adicionais</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Lista */}
      {viewMode === "lista" && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma carga encontrada</p>
              <p className="text-sm mt-1">Clique em "Nova Carga" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLoads.map((load: any) => {
                const photos: string[] = load.photosJson ? JSON.parse(load.photosJson) : [];
                return (
                  <Card key={load.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(load)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">
                              {load.vehiclePlate || "Placa não informada"}
                            </span>
                            <Badge className={`text-xs ${STATUS_COLORS[load.status]}`}>
                              {STATUS_LABELS[load.status]}
                            </Badge>
                            {photos.length > 0 && (
                              <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />{photos.length}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-500">
                            {load.driverName && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />{load.driverName}</span>
                            )}
                            {load.destination && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{load.destination}</span>
                            )}
                            {load.clientName && (
                              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{load.clientName}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {load.date ? new Date(load.date).toLocaleDateString("pt-BR") : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-emerald-700">{parseFloat(load.volumeM3 || "0").toFixed(2)}</p>
                          <p className="text-xs text-gray-400">m³</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sheet de formulário */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); setPendingPhotos([]); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">
              {editId ? "Editar Carga" : "Registrar Nova Carga"}
            </SheetTitle>
          </SheetHeader>

          {/* Botão de análise por foto */}
          <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4" /> Preencher por Foto (IA)
            </p>
            <p className="text-xs text-emerald-600 mb-3">
              Tire foto do formulário de recebimento ou ticket de pesagem. A IA vai extrair os dados automaticamente.
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoForAnalysis(f); e.target.value = ""; }}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoForAnalysis(f); e.target.value = ""; }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 border-emerald-400 text-emerald-700"
                disabled={analyzingPhoto}
                onClick={() => cameraInputRef.current?.click()}
              >
                {analyzingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {analyzingPhoto ? "Analisando..." : "Câmera"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 border-emerald-400 text-emerald-700"
                disabled={analyzingPhoto}
                onClick={() => photoInputRef.current?.click()}
              >
                {analyzingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {analyzingPhoto ? "Analisando..." : "Galeria"}
              </Button>
            </div>
            {(pendingPhotos.length > 0 || existingPhotos.length > 0) && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {[...existingPhotos, ...pendingPhotos].map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Foto"
                    className="w-14 h-10 object-cover rounded cursor-pointer hover:opacity-80 border"
                    onClick={() => setPreviewPhoto(url)}
                  />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            {/* Veículo e Motorista */}
            <SectionTitle icon={<Truck className="h-4 w-4" />} title="Veículo e Motorista" open={openSections.veiculo} onToggle={() => toggleSection("veiculo")} />
            {openSections.veiculo && (
              <div className="space-y-3 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Placa do Veículo</Label>
                    <Input value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" />
                  </div>
                  <div>
                    <Label>Motorista</Label>
                    <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Nome do motorista" />
                  </div>
                </div>
              </div>
            )}

            {/* Medidas da Carga */}
            <SectionTitle icon={<Package className="h-4 w-4" />} title="Medidas da Carga" open={openSections.carga} onToggle={() => toggleSection("carga")} />
            {openSections.carga && (
              <div className="space-y-3 px-1">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Altura (m) *</Label>
                    <Input value={form.heightM} onChange={e => setForm(f => ({ ...f, heightM: e.target.value }))} placeholder="ex: 2.5" required />
                  </div>
                  <div>
                    <Label>Largura (m) *</Label>
                    <Input value={form.widthM} onChange={e => setForm(f => ({ ...f, widthM: e.target.value }))} placeholder="ex: 2.4" required />
                  </div>
                  <div>
                    <Label>Comprimento (m) *</Label>
                    <Input value={form.lengthM} onChange={e => setForm(f => ({ ...f, lengthM: e.target.value }))} placeholder="ex: 7.0" required />
                  </div>
                </div>

                {volume && (
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-emerald-600 font-medium">Volume calculado</p>
                    <p className="text-3xl font-bold text-emerald-700">{volume} <span className="text-lg">m³</span></p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de Madeira</Label>
                    <Input value={form.woodType} onChange={e => setForm(f => ({ ...f, woodType: e.target.value }))} placeholder="ex: Eucalipto" />
                  </div>
                  <div>
                    <Label>Nota Fiscal</Label>
                    <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Número da NF" />
                  </div>
                </div>

                <div>
                  <Label>Destino</Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Cidade ou empresa de destino" />
                </div>
              </div>
            )}

            {/* Cliente */}
            <SectionTitle icon={<FileText className="h-4 w-4" />} title="Cliente" open={openSections.cliente} onToggle={() => toggleSection("cliente")} />
            {openSections.cliente && (
              <div className="space-y-3 px-1">
                <div>
                  <Label>Nome do Cliente</Label>
                  <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Observações</Label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Observações adicionais..."
                    className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pendente">Pendente</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending || analyzingPhoto}>
                {isPending ? "Salvando..." : editId ? "Salvar" : "Registrar Carga"}
              </Button>
            </div>

            {editId && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  if (confirm("Remover esta carga?")) {
                    deleteMutation.mutate({ id: editId });
                    setIsOpen(false);
                  }
                }}
              >
                Remover Carga
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      {/* Preview de foto */}
      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl">
            <div className="flex items-center justify-center">
              <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
