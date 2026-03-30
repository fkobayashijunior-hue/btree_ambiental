import { useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Trash2, Plus, Loader2, Wrench,
  Droplets, Scissors, RefreshCw, AlertCircle, Download,
  Image as ImageIcon, ChevronDown, ChevronUp, X, Package,
  Search, CheckCircle, AlertTriangle, FileText, BookOpen,
  Minus, DollarSign, ClipboardList
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// ─── Constantes ───────────────────────────────────────────────────────────────
const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://res.cloudinary.com/djob7pxme/image/upload/v1741107516/btree/logos/logo-kobayashi_ycxsqj.png";
const BTREE_SITE = "https://btreeambiental.com";
const BTREE_CONTATO = "(44) 99999-9999 | contato@btreeambiental.com";
const BTREE_ENDERECO = "Astorga - PR | BTREE Ambiental";

const MAINTENANCE_TYPES = [
  { value: "manutencao", label: "Manutenção Geral", icon: <Wrench className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
  { value: "limpeza", label: "Limpeza", icon: <Droplets className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  { value: "afiacao", label: "Afiação", icon: <Scissors className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
  { value: "revisao", label: "Revisão", icon: <RefreshCw className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  { value: "troca_oleo", label: "Troca de Óleo", icon: <Droplets className="h-4 w-4" />, color: "bg-amber-100 text-amber-800" },
  { value: "outros", label: "Outros", icon: <AlertCircle className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" },
] as const;

type Tab = "fotos" | "manutencao" | "templates";
type MaintType = typeof MAINTENANCE_TYPES[number]["value"];

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PartItem = {
  partId?: number;
  partCode?: string;
  partName: string;
  partPhotoUrl?: string;
  quantity: number;
  unit: string;
  unitCost?: string;
  fromStock: number;
  stockQuantity?: number; // para exibir disponibilidade
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
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

function formatCurrency(val?: string | null) {
  if (!val) return "—";
  return `R$ ${parseFloat(val.replace(",", ".")).toFixed(2).replace(".", ",")}`;
}

// ─── PDF da Ficha de Manutenção ───────────────────────────────────────────────
function generateMaintenancePDF(opts: {
  equipName: string;
  equipBrand?: string | null;
  equipModel?: string | null;
  type: string;
  description: string;
  performedBy?: string | null;
  performedAt: string;
  laborCost?: string;
  parts: PartItem[];
  photos?: string[];
}) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(BTREE_SITE)}`;

  const totalParts = opts.parts.reduce((acc, p) => {
    if (p.unitCost) acc += parseFloat(p.unitCost.replace(",", ".")) * p.quantity;
    return acc;
  }, 0);
  const laborNum = opts.laborCost ? parseFloat(opts.laborCost.replace(",", ".")) : 0;
  const totalGeral = totalParts + laborNum;

  const partsRows = opts.parts.map(p => {
    const total = p.unitCost
      ? `R$ ${(parseFloat(p.unitCost.replace(",", ".")) * p.quantity).toFixed(2)}`
      : "—";
    const photoCell = p.partPhotoUrl
      ? `<img src="${p.partPhotoUrl}" style="height:40px;width:40px;object-fit:cover;border-radius:4px;" />`
      : "—";
    return `
      <tr>
        <td style="text-align:center">${photoCell}</td>
        <td>${p.partCode || "—"}</td>
        <td>${p.partName}</td>
        <td style="text-align:center">${p.quantity} ${p.unit}</td>
        <td style="text-align:right">${p.unitCost ? `R$ ${p.unitCost}` : "—"}</td>
        <td style="text-align:right">${total}</td>
      </tr>`;
  }).join("");

  const typeLabel = MAINTENANCE_TYPES.find(t => t.value === opts.type)?.label || opts.type;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha de Manutenção - ${opts.equipName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2e7d32; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left img { height: 50px; object-fit: contain; }
    .header-info h1 { font-size: 18px; color: #2e7d32; font-weight: bold; }
    .header-info p { font-size: 11px; color: #555; margin-top: 2px; }
    .section { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 14px; }
    .section-title { font-size: 13px; font-weight: bold; color: #2e7d32; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .info-item { font-size: 11px; }
    .info-item strong { color: #555; display: block; font-size: 10px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #2e7d32; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f5f5f5; }
    .total-row td { font-weight: bold; background: #e8f5e9 !important; border-top: 2px solid #2e7d32; }
    .cost-summary { display: flex; justify-content: flex-end; gap: 24px; margin-top: 8px; }
    .cost-item { text-align: right; font-size: 12px; }
    .cost-item strong { display: block; font-size: 14px; color: #2e7d32; }
    .footer { margin-top: 20px; border-top: 2px solid #2e7d32; padding-top: 12px; display: flex; align-items: flex-end; justify-content: space-between; }
    .footer-left { font-size: 10px; color: #555; line-height: 1.6; }
    .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .footer-right img.qr { width: 70px; height: 70px; }
    .dev-credit { font-size: 9px; color: #aaa; text-align: center; margin-top: 6px; }
    .dev-credit img { height: 18px; vertical-align: middle; opacity: 0.6; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${BTREE_LOGO}" alt="BTREE Ambiental" />
      <div class="header-info">
        <h1>Ficha de Manutenção</h1>
        <p>${BTREE_CONTATO}</p>
        <p>${BTREE_ENDERECO}</p>
      </div>
    </div>
    <div style="text-align:right; font-size:11px; color:#555;">
      <div>Emitido em: <strong>${now}</strong></div>
      <div style="margin-top:4px; background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:4px; font-weight:bold;">${typeLabel}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Equipamento</div>
    <div class="info-grid">
      <div class="info-item"><strong>Equipamento</strong>${opts.equipName}</div>
      <div class="info-item"><strong>Marca / Modelo</strong>${opts.equipBrand || "—"} ${opts.equipModel ? `/ ${opts.equipModel}` : ""}</div>
      <div class="info-item"><strong>Data da Manutenção</strong>${opts.performedAt}</div>
      <div class="info-item"><strong>Responsável</strong>${opts.performedBy || "—"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Descrição do Serviço</div>
    <p style="font-size:12px; line-height:1.6;">${opts.description}</p>
  </div>

  ${opts.parts.length > 0 ? `
  <div class="section">
    <div class="section-title">Peças Utilizadas</div>
    <table>
      <thead>
        <tr>
          <th style="width:50px">Foto</th>
          <th>Código</th>
          <th>Peça / Acessório</th>
          <th style="text-align:center">Qtd</th>
          <th style="text-align:right">Vlr Unit.</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${partsRows}
        <tr class="total-row">
          <td colspan="5" style="text-align:right">Total em Peças:</td>
          <td style="text-align:right">R$ ${totalParts.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ""}

  <div class="cost-summary">
    ${laborNum > 0 ? `<div class="cost-item">Mão de Obra<strong>R$ ${laborNum.toFixed(2)}</strong></div>` : ""}
    ${opts.parts.length > 0 ? `<div class="cost-item">Total em Peças<strong>R$ ${totalParts.toFixed(2)}</strong></div>` : ""}
    <div class="cost-item" style="border-left:2px solid #2e7d32; padding-left:16px;">Custo Total<strong style="font-size:16px;">R$ ${totalGeral.toFixed(2)}</strong></div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <p><strong>BTREE Ambiental</strong></p>
      <p>${BTREE_CONTATO}</p>
      <p>${BTREE_ENDERECO}</p>
      <p>${BTREE_SITE}</p>
      <div class="dev-credit" style="margin-top:8px;">
        Desenvolvido por <img src="${KOBAYASHI_LOGO}" alt="Kobayashi" />
      </div>
    </div>
    <div class="footer-right">
      <img class="qr" src="${qrUrl}" alt="QR Code" />
      <span class="qr-label">Acesse nosso site</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error("Popup bloqueado. Permita popups para gerar o PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function EquipmentDetail() {
  const params = useParams<{ id: string }>();
  const equipmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("fotos");
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [expandedMaint, setExpandedMaint] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const maintPhotoRef = useRef<HTMLInputElement>(null);

  // ─── Form de Manutenção ────────────────────────────────────────────────────
  const [maintType, setMaintType] = useState<MaintType>("manutencao");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintBy, setMaintBy] = useState("");
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split("T")[0]);
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintPhoto, setMaintPhoto] = useState<string | null>(null);
  const [laborCost, setLaborCost] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [partSearch, setPartSearch] = useState("");
  const [partsList, setPartsList] = useState<PartItem[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Form de Template ──────────────────────────────────────────────────────
  const [tplName, setTplName] = useState("");
  const [tplType, setTplType] = useState<"preventiva" | "corretiva" | "revisao">("preventiva");
  const [tplDesc, setTplDesc] = useState("");
  const [tplParts, setTplParts] = useState<Array<{ partId?: number; partCode?: string; partName: string; quantity: number; unit: string }>>([]);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: equip, isLoading: loadingEquip } = trpc.equipmentDetail.getById.useQuery(
    { id: equipmentId }, { enabled: equipmentId > 0 }
  );
  const { data: photos = [], refetch: refetchPhotos } = trpc.equipmentDetail.listPhotos.useQuery(
    { equipmentId }, { enabled: equipmentId > 0 }
  );
  const { data: maintenances = [], refetch: refetchMaint } = trpc.equipmentDetail.listMaintenance.useQuery(
    { equipmentId }, { enabled: equipmentId > 0 }
  );
  const { data: templates = [] } = trpc.equipmentDetail.listTemplates.useQuery();
  const { data: templateData, refetch: refetchTemplate } = trpc.equipmentDetail.getTemplateWithParts.useQuery(
    { templateId: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );
  const { data: partSearchResults = [] } = trpc.equipmentDetail.searchPartByCode.useQuery(
    { code: partSearch },
    { enabled: partSearch.length >= 2 }
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const addPhoto = trpc.equipmentDetail.addPhoto.useMutation();
  const removePhoto = trpc.equipmentDetail.removePhoto.useMutation();
  const updateMainPhoto = trpc.equipmentDetail.updateMainPhoto.useMutation();
  const addMaintenance = trpc.equipmentDetail.addMaintenance.useMutation();
  const removeMaintenance = trpc.equipmentDetail.removeMaintenance.useMutation();
  const createTemplate = trpc.equipmentDetail.createTemplate.useMutation();
  const deleteTemplate = trpc.equipmentDetail.deleteTemplate.useMutation();

  // ─── Carregar peças do template ────────────────────────────────────────────
  const handleSelectTemplate = useCallback(async (templateId: number) => {
    setSelectedTemplateId(templateId);
    // Aguardar dados do template e preencher lista de peças
    setTimeout(() => {
      refetchTemplate();
    }, 100);
  }, [refetchTemplate]);

  // Quando templateData mudar, preencher partsList
  const prevTemplateId = useRef<number | null>(null);
  if (templateData && selectedTemplateId && prevTemplateId.current !== selectedTemplateId) {
    prevTemplateId.current = selectedTemplateId;
    const newParts: PartItem[] = (templateData.parts || []).map((tp: any) => ({
      partId: tp.partId ?? undefined,
      partCode: tp.partCode ?? undefined,
      partName: tp.partName,
      partPhotoUrl: tp.photoUrl ?? undefined,
      quantity: tp.quantity,
      unit: tp.unit || "un",
      unitCost: tp.unitCost ?? undefined,
      fromStock: tp.stockQuantity > 0 ? 1 : 0,
      stockQuantity: tp.stockQuantity ?? 0,
    }));
    setPartsList(newParts);
  }

  // ─── Adicionar peça da busca ───────────────────────────────────────────────
  function addPartFromSearch(part: any) {
    setPartsList(prev => [...prev, {
      partId: part.id,
      partCode: part.code ?? undefined,
      partName: part.name,
      partPhotoUrl: part.photoUrl ?? undefined,
      quantity: 1,
      unit: part.unit || "un",
      unitCost: part.unitCost ?? undefined,
      fromStock: (part.stockQuantity ?? 0) > 0 ? 1 : 0,
      stockQuantity: part.stockQuantity ?? 0,
    }]);
    setPartSearch("");
  }

  function addManualPart() {
    setPartsList(prev => [...prev, {
      partName: "",
      quantity: 1,
      unit: "un",
      fromStock: 0,
    }]);
  }

  function updatePart(idx: number, field: keyof PartItem, value: any) {
    setPartsList(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function removePart(idx: number) {
    setPartsList(prev => prev.filter((_, i) => i !== idx));
  }

  // ─── Salvar Manutenção ─────────────────────────────────────────────────────
  async function handleSaveMaintenance() {
    if (!maintDesc.trim()) { toast.error("Descreva o serviço realizado"); return; }
    setIsSaving(true);
    try {
      await addMaintenance.mutateAsync({
        equipmentId,
        type: maintType,
        description: maintDesc,
        performedBy: maintBy || undefined,
        cost: undefined,
        nextMaintenanceDate: maintNextDate || undefined,
        performedAt: maintDate,
        photoBase64: maintPhoto || undefined,
        templateId: selectedTemplateId || undefined,
        parts: partsList.map(p => ({
          partId: p.partId,
          partCode: p.partCode,
          partName: p.partName,
          partPhotoUrl: p.partPhotoUrl,
          quantity: p.quantity,
          unit: p.unit,
          unitCost: p.unitCost,
          fromStock: p.fromStock,
        })),
        laborCost: laborCost || undefined,
      });

      toast.success("Manutenção registrada com sucesso!");
      setShowAddMaint(false);
      resetMaintForm();
      refetchMaint();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar manutenção");
    } finally {
      setIsSaving(false);
    }
  }

  function resetMaintForm() {
    setMaintType("manutencao");
    setMaintDesc("");
    setMaintBy("");
    setMaintDate(new Date().toISOString().split("T")[0]);
    setMaintNextDate("");
    setMaintPhoto(null);
    setLaborCost("");
    setSelectedTemplateId(null);
    setPartsList([]);
    setPartSearch("");
    prevTemplateId.current = null;
  }

  // ─── Salvar Template ───────────────────────────────────────────────────────
  async function handleSaveTemplate() {
    if (!tplName.trim()) { toast.error("Nome do template é obrigatório"); return; }
    try {
      await createTemplate.mutateAsync({
        name: tplName,
        type: tplType,
        description: tplDesc || undefined,
        parts: tplParts.filter(p => p.partName.trim()),
      });
      toast.success("Template criado!");
      setShowTemplateForm(false);
      setTplName(""); setTplType("preventiva"); setTplDesc(""); setTplParts([]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar template");
    }
  }

  // ─── Calcular totais ───────────────────────────────────────────────────────
  const totalParts = partsList.reduce((acc, p) => {
    if (p.unitCost) acc += parseFloat(p.unitCost.replace(",", ".")) * p.quantity;
    return acc;
  }, 0);
  const laborNum = laborCost ? parseFloat(laborCost.replace(",", ".")) : 0;
  const totalGeral = totalParts + laborNum;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loadingEquip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!equip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium">Equipamento não encontrado</p>
        <Button variant="outline" onClick={() => setLocation("/setores-equipamentos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    manutencao: "bg-amber-100 text-amber-800",
    inativo: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/setores-equipamentos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{equip.name}</h1>
            <p className="text-sm text-gray-500 truncate">{equip.brand} {equip.model} {equip.year ? `· ${equip.year}` : ""}</p>
          </div>
          <Badge className={statusColors[equip.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
            {equip.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              {equip.imageUrl && (
                <img src={equip.imageUrl} alt={equip.name}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                  onClick={() => window.open(equip.imageUrl!, "_blank")} />
              )}
              <div className="grid grid-cols-2 gap-2 text-sm flex-1">
                {equip.serialNumber && <div><span className="text-gray-500">Nº Série:</span> <span className="font-medium">{equip.serialNumber}</span></div>}
                {equip.licensePlate && <div><span className="text-gray-500">Placa:</span> <span className="font-medium">{equip.licensePlate}</span></div>}
                {equip.year && <div><span className="text-gray-500">Ano:</span> <span className="font-medium">{equip.year}</span></div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: "fotos", label: "Fotos", icon: <ImageIcon className="h-4 w-4" /> },
            { id: "manutencao", label: "Manutenção", icon: <Wrench className="h-4 w-4" /> },
            { id: "templates", label: "Templates", icon: <BookOpen className="h-4 w-4" /> },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-white shadow text-green-700" : "text-gray-600 hover:text-gray-800"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── ABA: FOTOS ── */}
        {activeTab === "fotos" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Galeria de Fotos</h2>
              <Button size="sm" onClick={() => setShowAddPhoto(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {photos.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-gray-400">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhuma foto cadastrada</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map(p => (
                  <div key={p.id} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                    <img src={p.photoUrl} alt={p.caption || ""} className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(p.photoUrl, "_blank")} />
                    {p.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">{p.caption}</div>
                    )}
                    <button
                      onClick={() => removePhoto.mutate({ id: p.id }, { onSuccess: () => refetchPhotos() })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: MANUTENÇÃO ── */}
        {activeTab === "manutencao" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Histórico de Manutenções</h2>
              <Button size="sm" onClick={() => setShowAddMaint(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-1" /> Registrar
              </Button>
            </div>

            {maintenances.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-gray-400">
                <Wrench className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhuma manutenção registrada</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {maintenances.map((m: any) => {
                  const typeInfo = MAINTENANCE_TYPES.find(t => t.value === m.type);
                  const isExpanded = expandedMaint === m.id;
                  const mParts: any[] = m.parts || [];
                  const totalCost = m.cost ? parseFloat(m.cost) : 0;

                  return (
                    <Card key={m.id} className="overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedMaint(isExpanded ? null : m.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeInfo?.color || "bg-gray-100 text-gray-800"}`}>
                            {typeInfo?.icon}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{typeInfo?.label || m.type}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(m.performedAt).toLocaleDateString("pt-BR")}
                              {m.performedBy && ` · ${m.performedBy}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {totalCost > 0 && (
                            <span className="text-sm font-semibold text-green-700">
                              R$ {totalCost.toFixed(2)}
                            </span>
                          )}
                          {mParts.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {mParts.length} peça{mParts.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                          <p className="text-sm text-gray-700">{m.description}</p>

                          {mParts.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Peças Utilizadas</p>
                              <div className="space-y-2">
                                {mParts.map((p: any) => (
                                  <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg p-2 border">
                                    {p.partPhotoUrl && (
                                      <img src={p.partPhotoUrl} alt={p.partName}
                                        className="w-10 h-10 rounded object-cover flex-shrink-0 cursor-pointer"
                                        onClick={() => window.open(p.partPhotoUrl, "_blank")} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{p.partName}</p>
                                      {p.partCode && <p className="text-xs text-gray-500">Cód: {p.partCode}</p>}
                                    </div>
                                    <div className="text-right text-xs">
                                      <p className="font-medium">{p.quantity} {p.unit}</p>
                                      {p.totalCost && <p className="text-green-700">R$ {parseFloat(p.totalCost).toFixed(2)}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {m.nextMaintenanceDate && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded">
                              Próxima manutenção: {new Date(m.nextMaintenanceDate).toLocaleDateString("pt-BR")}
                            </p>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="flex-1"
                              onClick={() => generateMaintenancePDF({
                                equipName: equip.name,
                                equipBrand: equip.brand,
                                equipModel: equip.model,
                                type: m.type,
                                description: m.description,
                                performedBy: m.performedBy,
                                performedAt: new Date(m.performedAt).toLocaleDateString("pt-BR"),
                                parts: mParts.map((p: any) => ({
                                  partId: p.partId,
                                  partCode: p.partCode,
                                  partName: p.partName,
                                  partPhotoUrl: p.partPhotoUrl,
                                  quantity: p.quantity,
                                  unit: p.unit || "un",
                                  unitCost: p.unitCost,
                                  fromStock: p.fromStock ?? 1,
                                })),
                              })}>
                              <FileText className="h-4 w-4 mr-1" /> PDF
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                              onClick={() => removeMaintenance.mutate({ id: m.id }, { onSuccess: () => refetchMaint() })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: TEMPLATES ── */}
        {activeTab === "templates" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Templates de Manutenção</h2>
              <Button size="sm" onClick={() => setShowTemplateForm(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-1" /> Novo Template
              </Button>
            </div>
            <p className="text-sm text-gray-500">Templates definem quais peças são necessárias para cada tipo de manutenção. Ao registrar uma manutenção, selecione um template para carregar as peças automaticamente.</p>

            {templates.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-gray-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhum template cadastrado</p>
                <p className="text-xs mt-1">Crie templates para agilizar o registro de manutenções</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {templates.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{t.type} {t.description ? `· ${t.description}` : ""}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500"
                        onClick={() => deleteTemplate.mutate({ id: t.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DIALOG: Adicionar Foto ── */}
      <Dialog open={showAddPhoto} onOpenChange={setShowAddPhoto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Foto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {newPhotoBase64 ? (
              <div className="relative">
                <img src={newPhotoBase64} alt="Preview" className="w-full rounded-lg max-h-64 object-contain bg-gray-100" />
                <button onClick={() => setNewPhotoBase64(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => photoInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" /> Galeria
                </Button>
                <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Câmera
                </Button>
              </div>
            )}
            <div>
              <Label>Legenda (opcional)</Label>
              <Input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Ex: Vista lateral, Placa..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddPhoto(false); setNewPhotoBase64(null); setPhotoCaption(""); }}>Cancelar</Button>
            <Button disabled={!newPhotoBase64 || addPhoto.isPending} className="bg-green-600 hover:bg-green-700"
              onClick={async () => {
                if (!newPhotoBase64) return;
                await addPhoto.mutateAsync({ equipmentId, photoBase64: newPhotoBase64, caption: photoCaption || undefined });
                toast.success("Foto adicionada!");
                setShowAddPhoto(false); setNewPhotoBase64(null); setPhotoCaption("");
                refetchPhotos();
              }}>
              {addPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Registrar Manutenção ── */}
      <Dialog open={showAddMaint} onOpenChange={(open) => { if (!open) resetMaintForm(); setShowAddMaint(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Tipo e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Manutenção *</Label>
                <Select value={maintType} onValueChange={(v) => setMaintType(v as MaintType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da Manutenção *</Label>
                <Input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} />
              </div>
            </div>

            {/* Responsável */}
            <div>
              <Label>Responsável / Mecânico</Label>
              <Input value={maintBy} onChange={e => setMaintBy(e.target.value)} placeholder="Nome do responsável..." />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição do Serviço *</Label>
              <textarea
                value={maintDesc}
                onChange={e => setMaintDesc(e.target.value)}
                placeholder="Descreva o serviço realizado..."
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Template */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-blue-800 font-semibold">🔧 Carregar Peças por Template</Label>
              <p className="text-xs text-blue-600 mb-2">Selecione um template para preencher automaticamente as peças necessárias com consulta de estoque</p>
              <Select value={selectedTemplateId?.toString() || ""} onValueChange={(v) => handleSelectTemplate(parseInt(v))}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecionar template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Peças */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Peças Utilizadas</Label>
                <Button size="sm" variant="outline" onClick={addManualPart}>
                  <Plus className="h-3 w-3 mr-1" /> Manual
                </Button>
              </div>

              {/* Busca de peça por código */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={partSearch}
                  onChange={e => setPartSearch(e.target.value)}
                  placeholder="Buscar peça por código ou nome..."
                  className="pl-9"
                />
                {partSearch.length >= 2 && partSearchResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {partSearchResults.map((p: any) => (
                      <button key={p.id}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                        onClick={() => addPartFromSearch(p)}>
                        {p.photoUrl && <img src={p.photoUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.code ? `Cód: ${p.code} · ` : ""}{p.stockQuantity ?? 0} em estoque</p>
                        </div>
                        {(p.stockQuantity ?? 0) > 0
                          ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de peças */}
              {partsList.length > 0 && (
                <div className="space-y-2">
                  {partsList.map((p, idx) => (
                    <div key={idx} className="bg-gray-50 border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        {p.partPhotoUrl && (
                          <img src={p.partPhotoUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Nome da Peça *</Label>
                            <Input value={p.partName} onChange={e => updatePart(idx, "partName", e.target.value)}
                              placeholder="Nome da peça" className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Código</Label>
                            <Input value={p.partCode || ""} onChange={e => updatePart(idx, "partCode", e.target.value)}
                              placeholder="Código" className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Quantidade</Label>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updatePart(idx, "quantity", Math.max(1, p.quantity - 1))}
                                className="border rounded p-1 hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                              <Input type="number" min={1} value={p.quantity}
                                onChange={e => updatePart(idx, "quantity", parseInt(e.target.value) || 1)}
                                className="h-8 text-sm text-center w-16" />
                              <button onClick={() => updatePart(idx, "quantity", p.quantity + 1)}
                                className="border rounded p-1 hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Valor Unitário (R$)</Label>
                            <Input value={p.unitCost || ""} onChange={e => updatePart(idx, "unitCost", e.target.value)}
                              placeholder="0,00" className="h-8 text-sm" />
                          </div>
                        </div>
                        <button onClick={() => removePart(idx)} className="text-red-500 hover:text-red-700 mt-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Indicador de estoque */}
                      {p.partId && (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${(p.stockQuantity ?? 0) >= p.quantity ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                          {(p.stockQuantity ?? 0) >= p.quantity
                            ? <><CheckCircle className="h-3 w-3" /> Em estoque ({p.stockQuantity} disponíveis) — será baixado automaticamente</>
                            : <><AlertTriangle className="h-3 w-3" /> Estoque insuficiente ({p.stockQuantity ?? 0} disponíveis)</>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo de custos */}
              {(partsList.length > 0 || laborCost) && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total em Peças:</span>
                    <span className="font-medium">R$ {totalParts.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Mão de Obra (R$):</span>
                    <Input value={laborCost} onChange={e => setLaborCost(e.target.value)}
                      placeholder="0,00" className="h-7 text-sm flex-1" />
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-green-200 pt-1 mt-1">
                    <span>Custo Total:</span>
                    <span className="text-green-700">R$ {totalGeral.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Próxima manutenção */}
            <div>
              <Label>Próxima Manutenção Prevista (opcional)</Label>
              <Input type="date" value={maintNextDate} onChange={e => setMaintNextDate(e.target.value)} />
            </div>

            {/* Foto */}
            <div>
              <Label>Foto da Manutenção (opcional)</Label>
              {maintPhoto ? (
                <div className="relative mt-1">
                  <img src={maintPhoto} alt="Foto" className="w-full max-h-40 object-contain rounded-lg bg-gray-100" />
                  <button onClick={() => setMaintPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" className="mt-1 w-full" onClick={() => maintPhotoRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Tirar / Selecionar Foto
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetMaintForm(); setShowAddMaint(false); }}>Cancelar</Button>
            <Button disabled={isSaving} className="bg-green-600 hover:bg-green-700" onClick={handleSaveMaintenance}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar Manutenção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Novo Template ── */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Template de Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do Template *</Label>
              <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Ex: Troca de Óleo Motor" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tplType} onValueChange={(v) => setTplType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={tplDesc} onChange={e => setTplDesc(e.target.value)} placeholder="Descrição do template..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Peças do Template</Label>
                <Button size="sm" variant="outline" onClick={() => setTplParts(prev => [...prev, { partName: "", quantity: 1, unit: "un" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {tplParts.map((p, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input value={p.partName} onChange={e => setTplParts(prev => prev.map((tp, i) => i === idx ? { ...tp, partName: e.target.value } : tp))}
                    placeholder="Nome da peça" className="flex-1 h-8 text-sm" />
                  <Input value={p.partCode || ""} onChange={e => setTplParts(prev => prev.map((tp, i) => i === idx ? { ...tp, partCode: e.target.value } : tp))}
                    placeholder="Código" className="w-24 h-8 text-sm" />
                  <Input type="number" min={1} value={p.quantity}
                    onChange={e => setTplParts(prev => prev.map((tp, i) => i === idx ? { ...tp, quantity: parseInt(e.target.value) || 1 } : tp))}
                    className="w-16 h-8 text-sm text-center" />
                  <button onClick={() => setTplParts(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateForm(false)}>Cancelar</Button>
            <Button disabled={createTemplate.isPending} className="bg-green-600 hover:bg-green-700" onClick={handleSaveTemplate}>
              {createTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inputs ocultos */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={async e => { const f = e.target.files?.[0]; if (f) setNewPhotoBase64(await compressImage(f)); e.target.value = ""; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async e => { const f = e.target.files?.[0]; if (f) setNewPhotoBase64(await compressImage(f)); e.target.value = ""; }} />
      <input ref={maintPhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async e => { const f = e.target.files?.[0]; if (f) setMaintPhoto(await compressImage(f)); e.target.value = ""; }} />
    </div>
  );
}
