import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Trash2, Plus, Loader2, Wrench,
  Droplets, Scissors, RefreshCw, AlertCircle, Download,
  Image as ImageIcon, ChevronDown, ChevronUp, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

const MAINTENANCE_TYPES = [
  { value: "manutencao", label: "Manutenção", icon: <Wrench className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
  { value: "limpeza", label: "Limpeza", icon: <Droplets className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  { value: "afiacao", label: "Afiação", icon: <Scissors className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
  { value: "revisao", label: "Revisão", icon: <RefreshCw className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  { value: "troca_oleo", label: "Troca de Óleo", icon: <Droplets className="h-4 w-4" />, color: "bg-amber-100 text-amber-800" },
  { value: "outros", label: "Outros", icon: <AlertCircle className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" },
] as const;

type Tab = "fotos" | "manutencao";

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

export default function EquipmentDetail() {
  const params = useParams<{ id: string }>();
  const equipmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("fotos");
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const maintPhotoRef = useRef<HTMLInputElement>(null);

  // Manutenção form
  const [maintType, setMaintType] = useState<typeof MAINTENANCE_TYPES[number]["value"]>("manutencao");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintBy, setMaintBy] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split("T")[0]);
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintPhoto, setMaintPhoto] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);

  // Queries
  const { data: equip, isLoading: loadingEquip } = trpc.equipmentDetail.getById.useQuery(
    { id: equipmentId }, { enabled: equipmentId > 0 }
  );
  const { data: photos = [], refetch: refetchPhotos } = trpc.equipmentDetail.listPhotos.useQuery(
    { equipmentId }, { enabled: equipmentId > 0 }
  );
  const { data: maintenances = [], refetch: refetchMaint } = trpc.equipmentDetail.listMaintenance.useQuery(
    { equipmentId }, { enabled: equipmentId > 0 }
  );

  // Mutations
  const addPhotoMutation = trpc.equipmentDetail.addPhoto.useMutation({
    onSuccess: () => { toast.success("Foto adicionada!"); refetchPhotos(); setShowAddPhoto(false); setNewPhotoBase64(null); setPhotoCaption(""); },
    onError: (e) => toast.error(e.message || "Erro ao adicionar foto"),
  });
  const removePhotoMutation = trpc.equipmentDetail.removePhoto.useMutation({
    onSuccess: () => { toast.success("Foto removida"); refetchPhotos(); },
    onError: (e) => toast.error(e.message),
  });
  const addMaintMutation = trpc.equipmentDetail.addMaintenance.useMutation({
    onSuccess: () => { toast.success("Manutenção registrada!"); refetchMaint(); setShowAddMaint(false); resetMaintForm(); },
    onError: (e) => toast.error(e.message || "Erro ao registrar manutenção"),
  });
  const removeMaintMutation = trpc.equipmentDetail.removeMaintenance.useMutation({
    onSuccess: () => { toast.success("Registro removido"); refetchMaint(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMainPhotoMutation = trpc.equipmentDetail.updateMainPhoto.useMutation({
    onSuccess: () => { toast.success("Foto principal atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  const resetMaintForm = () => {
    setMaintType("manutencao"); setMaintDesc(""); setMaintBy("");
    setMaintCost(""); setMaintDate(new Date().toISOString().split("T")[0]);
    setMaintNextDate(""); setMaintPhoto(null);
  };

  const handlePhotoFile = async (file: File, target: "main" | "gallery" | "maint") => {
    try {
      const compressed = await compressImage(file);
      if (target === "gallery") setNewPhotoBase64(compressed);
      else if (target === "maint") setMaintPhoto(compressed);
    } catch { toast.error("Erro ao processar imagem"); }
  };

  const handleGeneratePdf = () => {
    if (!equip) return;
    const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
    const maintRows = maintenances.map(m => {
      const typeInfo = MAINTENANCE_TYPES.find(t => t.value === m.type);
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${new Date(m.performedAt).toLocaleDateString("pt-BR")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${typeInfo?.label || m.type}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.description}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.performedBy || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.cost ? `R$ ${m.cost}` : "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString("pt-BR") : "-"}</td>
      </tr>`;
    }).join("");

    const photoGrid = photos.slice(0, 6).map(p => `
      <div style="display:inline-block;margin:4px;text-align:center;">
        <img src="${p.photoUrl}" style="width:150px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />
        ${p.caption ? `<p style="font-size:10px;color:#6b7280;margin:2px 0 0;">${p.caption}</p>` : ""}
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha do Equipamento — ${equip.name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 0; }
  .header { background: linear-gradient(135deg, #0d4f2e, #1a7a4a); color: white; padding: 20px 30px; display: flex; align-items: center; gap: 20px; }
  .header img { height: 60px; filter: brightness(0) invert(1); }
  .header-text h1 { margin: 0; font-size: 20px; }
  .header-text p { margin: 4px 0 0; opacity: 0.8; font-size: 12px; }
  .content { padding: 24px 30px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: bold; color: #0d4f2e; border-bottom: 2px solid #0d4f2e; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { margin-bottom: 8px; }
  .field label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
  .field value { font-size: 13px; font-weight: 500; color: #111; }
  .main-photo { width: 120px; height: 90px; object-fit: cover; border-radius: 8px; border: 2px solid #0d4f2e; float: right; margin-left: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10px; color: #374151; text-transform: uppercase; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 12px 30px; text-align: center; font-size: 11px; color: #9ca3af; }
  .footer strong { color: #0d4f2e; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <img src="${logoUrl}" alt="BTREE Ambiental" />
  <div class="header-text">
    <h1>Ficha do Equipamento</h1>
    <p>BTREE Empreendimentos LTDA · btreeambiental.com · Astorga, PR</p>
  </div>
</div>
<div class="content">
  ${equip.imageUrl ? `<img src="${equip.imageUrl}" class="main-photo" alt="Foto" />` : ""}
  <div class="section">
    <div class="section-title">Dados do Equipamento</div>
    <div class="grid">
      <div class="field"><label>Nome</label><value>${equip.name}</value></div>
      <div class="field"><label>Status</label><value>${equip.status === "ativo" ? "Ativo" : equip.status === "manutencao" ? "Em Manutenção" : "Inativo"}</value></div>
      <div class="field"><label>Marca</label><value>${equip.brand || "-"}</value></div>
      <div class="field"><label>Modelo</label><value>${equip.model || "-"}</value></div>
      <div class="field"><label>Ano</label><value>${equip.year || "-"}</value></div>
      <div class="field"><label>N° de Série</label><value>${equip.serialNumber || "-"}</value></div>
    </div>
  </div>
  ${photos.length > 0 ? `
  <div class="section">
    <div class="section-title">Fotos</div>
    <div>${photoGrid}</div>
  </div>` : ""}
  <div class="section">
    <div class="section-title">Histórico de Manutenções (${maintenances.length} registros)</div>
    ${maintenances.length > 0 ? `
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Responsável</th><th>Custo</th><th>Próxima</th></tr></thead>
      <tbody>${maintRows}</tbody>
    </table>` : "<p style='color:#9ca3af;font-size:12px;'>Nenhuma manutenção registrada.</p>"}
  </div>
</div>
<div class="footer">
  Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} · 
  <strong>BTREE Empreendimentos LTDA</strong> · btreeambiental.com · Astorga, Paraná
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita pop-ups para gerar o PDF"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  if (loadingEquip) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!equip) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">
          Equipamento não encontrado.
          <Button variant="link" onClick={() => setLocation("/setores")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    ativo: "bg-emerald-100 text-emerald-800",
    manutencao: "bg-amber-100 text-amber-800",
    inativo: "bg-gray-100 text-gray-600",
  };
  const statusLabels: Record<string, string> = {
    ativo: "Ativo", manutencao: "Em Manutenção", inativo: "Inativo",
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/setores")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{equip.name}</h1>
              <p className="text-sm text-muted-foreground">{equip.brand} {equip.model} {equip.year ? `· ${equip.year}` : ""}</p>
            </div>
          </div>
          <Button onClick={handleGeneratePdf} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Download className="h-4 w-4" /> Gerar Ficha
          </Button>
        </div>

        {/* Info card */}
        <div className="flex items-center gap-4 p-4 bg-card border rounded-xl">
          {equip.imageUrl ? (
            <img src={equip.imageUrl} alt={equip.name} className="w-20 h-16 rounded-lg object-cover border flex-shrink-0" />
          ) : (
            <div className="w-20 h-16 rounded-lg bg-emerald-50 flex items-center justify-center border flex-shrink-0">
              <Wrench className="h-8 w-8 text-emerald-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold">{equip.name}</p>
            <p className="text-sm text-muted-foreground">{equip.brand} {equip.model}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[equip.status] || "bg-gray-100 text-gray-600"}>
                {statusLabels[equip.status] || equip.status}
              </Badge>
              {equip.serialNumber && <span className="text-xs text-muted-foreground">S/N: {equip.serialNumber}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(["fotos", "manutencao"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "fotos" ? `Fotos (${photos.length})` : `Manutenções (${maintenances.length})`}
            </button>
          ))}
        </div>

        {/* Tab: Fotos */}
        {activeTab === "fotos" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{photos.length} foto(s) cadastrada(s)</p>
              <Button onClick={() => setShowAddPhoto(true)} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
                <Camera className="h-4 w-4" /> Adicionar Foto
              </Button>
            </div>
            {photos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma foto cadastrada</p>
                <p className="text-sm mt-1">Adicione fotos do equipamento e da placa</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border bg-card">
                    <img
                      src={photo.photoUrl}
                      alt={photo.caption || "Foto"}
                      className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewPhoto(photo.photoUrl)}
                    />
                    {photo.caption && (
                      <div className="p-2 text-xs text-muted-foreground truncate">{photo.caption}</div>
                    )}
                    <button
                      onClick={() => { if (confirm("Remover esta foto?")) removePhotoMutation.mutate({ id: photo.id }); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Manutenções */}
        {activeTab === "manutencao" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{maintenances.length} registro(s)</p>
              <Button onClick={() => setShowAddMaint(true)} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
                <Plus className="h-4 w-4" /> Registrar Manutenção
              </Button>
            </div>
            {maintenances.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma manutenção registrada</p>
                <p className="text-sm mt-1">Registre manutenções, limpezas, afiações e revisões</p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenances.map(m => {
                  const typeInfo = MAINTENANCE_TYPES.find(t => t.value === m.type) || MAINTENANCE_TYPES[5];
                  const photos = m.photosJson ? JSON.parse(m.photosJson) : [];
                  return (
                    <div key={m.id} className="border rounded-xl p-4 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${typeInfo.color} flex-shrink-0`}>
                            {typeInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{typeInfo.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(m.performedAt).toLocaleDateString("pt-BR")}
                              </span>
                              {m.cost && <span className="text-xs font-medium text-emerald-700">R$ {m.cost}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                            {m.performedBy && <p className="text-xs text-muted-foreground mt-0.5">Responsável: {m.performedBy}</p>}
                            {m.nextMaintenanceDate && (
                              <p className="text-xs text-amber-600 mt-0.5 font-medium">
                                Próxima: {new Date(m.nextMaintenanceDate).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                            {photos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {photos.map((url: string, i: number) => (
                                  <img
                                    key={i} src={url} alt="Foto"
                                    className="w-16 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                                    onClick={() => setPreviewPhoto(url)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { if (confirm("Remover este registro?")) removeMaintMutation.mutate({ id: m.id }); }}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Adicionar Foto */}
      <Dialog open={showAddPhoto} onOpenChange={setShowAddPhoto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Foto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f, "gallery"); e.target.value = ""; }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f, "gallery"); e.target.value = ""; }} />
            {newPhotoBase64 ? (
              <div className="relative">
                <img src={newPhotoBase64} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button onClick={() => setNewPhotoBase64(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Câmera
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => photoInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4" /> Galeria
                </Button>
              </div>
            )}
            <input
              type="text" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)}
              placeholder="Legenda (ex: Foto da placa, Vista lateral)"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPhoto(false)}>Cancelar</Button>
            <Button
              onClick={() => { if (!newPhotoBase64) { toast.error("Selecione uma foto"); return; } addPhotoMutation.mutate({ equipmentId, photoBase64: newPhotoBase64, caption: photoCaption || undefined }); }}
              disabled={addPhotoMutation.isPending || !newPhotoBase64}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {addPhotoMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Manutenção */}
      <Dialog open={showAddMaint} onOpenChange={setShowAddMaint}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo *</label>
              <select value={maintType} onChange={e => setMaintType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <textarea value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={3}
                placeholder="Descreva o serviço realizado..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Data *</label>
                <input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Próxima Manutenção</label>
                <input type="date" value={maintNextDate} onChange={e => setMaintNextDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Responsável</label>
                <input type="text" value={maintBy} onChange={e => setMaintBy(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Custo (R$)</label>
                <input type="text" value={maintCost} onChange={e => setMaintCost(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Foto (opcional)</label>
              <input ref={maintPhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f, "maint"); e.target.value = ""; }} />
              {maintPhoto ? (
                <div className="relative">
                  <img src={maintPhoto} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  <button onClick={() => setMaintPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={() => maintPhotoRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Tirar/Selecionar Foto
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMaint(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!maintDesc.trim()) { toast.error("Informe a descrição"); return; }
                addMaintMutation.mutate({
                  equipmentId, type: maintType, description: maintDesc,
                  performedBy: maintBy || undefined, cost: maintCost || undefined,
                  performedAt: maintDate,
                  nextMaintenanceDate: maintNextDate || undefined,
                  photoBase64: maintPhoto || undefined,
                });
              }}
              disabled={addMaintMutation.isPending || !maintDesc}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {addMaintMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview foto */}
      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl">
            <div className="flex items-center justify-center">
              <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
