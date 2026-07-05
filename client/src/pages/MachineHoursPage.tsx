import { useState, useMemo, useCallback } from "react";
import { BTREE_LOGO_B64, loadPdfAssets, generatePDFFromHtml } from "@/lib/pdfUtils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Settings, Plus, Clock, Wrench, Fuel, Calendar, AlertTriangle,
  CheckCircle2, FileDown, Pencil, ChevronDown, ChevronUp,
  Package, Search, Trash2, MapPin, Droplets
} from "lucide-react";
import WorkLocationSelect from "@/components/WorkLocationSelect";

type ActiveTab = "resumo" | "horas" | "manutencao" | "abastecimento" | "oleo";
type SheetMode = "horas" | "manutencao" | "abastecimento" | "oleo";

const TAB_LABELS: Record<ActiveTab, string> = {
  resumo: "Resumo",
  horas: "Horas Trabalhadas",
  manutencao: "Manuções",
  abastecimento: "Abastecimentos",
  oleo: "Óleo / Lubrificantes",
};

const OIL_TYPE_LABELS: Record<string, string> = {
  hidraulico: "Hidráulico",
  motor: "Motor",
  transmissao: "Transmissão",
  diferencial: "Diferencial",
  outros: "Outros",
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  revisao: "Revisão",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  proprio: "Próprio",
  terceirizado: "Terceirizado",
};

const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Diesel",
  gasolina: "Gasolina",
  mistura_2t: "Mistura 2T",
  arla: "Arla 32",
};

const emptyHoursForm = {
  equipmentId: "",
  date: new Date().toISOString().slice(0, 10),
  startHourMeter: "",
  endHourMeter: "",
  activity: "",
  location: "",
  notes: "",
  workLocationId: "",
};

const emptyMaintForm = {
  equipmentId: "",
  date: new Date().toISOString().slice(0, 10),
  hourMeter: "",
  type: "corretiva" as "preventiva" | "corretiva" | "revisao",
  serviceType: "proprio" as "proprio" | "terceirizado",
  mechanicName: "",
  thirdPartyCompany: "",
  description: "",
  laborCost: "",
  totalCost: "",
  nextMaintenanceHours: "",
};

type PartLine = {
  partId?: number;
  partCode: string;
  partName: string;
  partPhotoUrl?: string;
  quantity: number;
  unit: string;
  unitCost: string;
  totalCost: string;
  fromStock: number; // 1 = do estoque, 0 = externo
  stockQty?: number;
};

const emptyFuelForm = {
  equipmentId: "",
  date: new Date().toISOString().slice(0, 10),
  hourMeter: "",
  fuelType: "diesel" as "diesel" | "gasolina" | "mistura_2t" | "arla",
  liters: "",
  pricePerLiter: "",
  totalValue: "",
  supplier: "",
  notes: "",
  workLocationId: "",
};

const emptyOilForm = {
  equipmentId: "",
  date: new Date().toISOString().slice(0, 10),
  hourMeter: "",
  oilType: "hidraulico" as "hidraulico" | "motor" | "transmissao" | "diferencial" | "outros",
  quantityLiters: "",
  brand: "",
  supplier: "",
  pricePerLiter: "",
  totalValue: "",
  notes: "",
};

export default function MachineHoursPage() {
  // Ler parâmetro ?tab= da URL para abrir aba e sheet corretos via botão de acesso rápido
  const urlTab = (() => {
    try { return new URLSearchParams(window.location.search).get("tab") ?? ""; } catch { return ""; }
  })();
  const validTabs: ActiveTab[] = ["resumo", "horas", "manutencao", "abastecimento", "oleo"];
  const validSheetModes: SheetMode[] = ["horas", "manutencao", "abastecimento", "oleo"];
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    validTabs.includes(urlTab as ActiveTab) ? (urlTab as ActiveTab) : "resumo"
  );
  const [isOpen, setIsOpen] = useState(validSheetModes.includes(urlTab as SheetMode));
  const [sheetMode, setSheetMode] = useState<SheetMode>(
    validSheetModes.includes(urlTab as SheetMode) ? (urlTab as SheetMode) : "horas"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [expandedEquip, setExpandedEquip] = useState<Record<number, boolean>>({});

  const [hoursForm, setHoursForm] = useState({ ...emptyHoursForm });
  const [maintForm, setMaintForm] = useState({ ...emptyMaintForm });
  const [fuelForm, setFuelForm] = useState({ ...emptyFuelForm });
  const [oilForm, setOilForm] = useState({ ...emptyOilForm });

  // Peças da manutenção
  const [partLines, setPartLines] = useState<PartLine[]>([]);
  const [partSearch, setPartSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const utils = trpc.useUtils();

  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: hours = [], isLoading: loadingHours } = trpc.machineHours.listHours.useQuery({});
  const { data: maintenance = [], isLoading: loadingMaint } = trpc.machineHours.listMaintenance.useQuery({});
  const { data: fuel = [], isLoading: loadingFuel } = trpc.machineHours.listFuel.useQuery({});
  const { data: oilRecords = [], isLoading: loadingOil } = trpc.machineHours.listOil.useQuery({});
  const { data: oilStockList = [], refetch: refetchOilStock } = trpc.machineHours.listOilStock.useQuery();
  const [showOilStockForm, setShowOilStockForm] = useState(false);
  const [oilStockForm, setOilStockForm] = useState({ oilType: "hidraulico" as "hidraulico"|"motor"|"transmissao"|"diferencial"|"outros", brand: "", purchaseQuantityLiters: "", pricePerLiter: "", totalValue: "", supplier: "", notes: "", photoBase64: "" });
  const [selectedOilStockId, setSelectedOilStockId] = useState<string>("");
  const { data: alerts = [] } = trpc.machineHours.maintenanceAlerts.useQuery();
  const { data: summary = [] } = trpc.machineHours.equipmentSummary.useQuery();

  // Peças e templates
  const { data: allParts = [] } = trpc.parts.listParts.useQuery({});
  const { data: templates = [] } = trpc.equipmentDetail.listTemplates.useQuery();
  const addMaintenanceParts = trpc.equipmentDetail.addMaintenance.useMutation();

  // Busca de peças por código/nome
  const partResults = useMemo(() => {
    if (!partSearch || partSearch.length < 2) return [];
    const s = partSearch.toLowerCase();
    return (allParts as any[]).filter((p: any) =>
      (p.code?.toLowerCase() ?? "").includes(s) || (p.name?.toLowerCase() ?? "").includes(s)
    ).slice(0, 5);
  }, [allParts, partSearch]);

  const addPartFromSearch = useCallback((p: any) => {
    setPartLines(prev => [...prev, {
      partId: p.id,
      partCode: p.code || "",
      partName: p.name,
      partPhotoUrl: p.imageUrl || undefined,
      quantity: 1,
      unit: p.unit || "un",
      unitCost: p.unitCost || "0",
      totalCost: p.unitCost || "0",
      fromStock: 1,
      stockQty: p.stockQuantity ?? 0,
    }]);
    setPartSearch("");
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    const tmpl = (templates as any[]).find((t: any) => String(t.id) === templateId);
    if (!tmpl?.parts) return;
    const lines: PartLine[] = (tmpl.parts as any[]).map((tp: any) => {
      const part = (allParts as any[]).find((p: any) => p.id === tp.partId);
      return {
        partId: tp.partId || undefined,
        partCode: tp.partCode || part?.code || "",
        partName: tp.partName || part?.name || "",
        partPhotoUrl: part?.imageUrl || undefined,
        quantity: tp.quantity || 1,
        unit: tp.unit || "un",
        unitCost: part?.unitCost || "0",
        totalCost: String(parseFloat(part?.unitCost || "0") * (tp.quantity || 1)),
        fromStock: 1,
        stockQty: part?.stockQuantity ?? 0,
      };
    });
    setPartLines(lines);
  }, [templates, allParts]);

  const updatePartLine = (idx: number, field: keyof PartLine, value: any) => {
    setPartLines(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };
      if (field === "quantity" || field === "unitCost") {
        updated.totalCost = String(parseFloat(updated.unitCost || "0") * (parseFloat(String(updated.quantity)) || 1));
      }
      return updated;
    }));
  };

  const totalPartsCost = useMemo(() =>
    partLines.reduce((sum, p) => sum + parseFloat(p.totalCost || "0"), 0)
  , [partLines]);

  const equipMap = Object.fromEntries((equipmentList as any[]).map((eq: any) => [eq.id, eq.name]));

  // Filtrar registros por equipamento
  const filteredHours = useMemo(() => filterEquipment ? (hours as any[]).filter((h: any) => String(h.equipmentId) === filterEquipment) : hours as any[], [hours, filterEquipment]);
  const filteredMaint = useMemo(() => filterEquipment ? (maintenance as any[]).filter((m: any) => String(m.equipmentId) === filterEquipment) : maintenance as any[], [maintenance, filterEquipment]);
  const filteredFuel = useMemo(() => filterEquipment ? (fuel as any[]).filter((f: any) => String(f.equipmentId) === filterEquipment) : fuel as any[], [fuel, filterEquipment]);
  const filteredOil = useMemo(() => filterEquipment ? (oilRecords as any[]).filter((o: any) => String(o.equipmentId) === filterEquipment) : oilRecords as any[], [oilRecords, filterEquipment]);

  const createHoursMutation = trpc.machineHours.createHours.useMutation({
    onSuccess: () => { toast.success("Horas registradas!"); utils.machineHours.listHours.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const updateHoursMutation = trpc.machineHours.updateHours.useMutation({
    onSuccess: () => { toast.success("Registro atualizado!"); utils.machineHours.listHours.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const createMaintMutation = trpc.machineHours.createMaintenance.useMutation({
    onSuccess: () => { toast.success("Manutenção registrada!"); utils.machineHours.listMaintenance.invalidate(); utils.machineHours.maintenanceAlerts.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMaintMutation = trpc.machineHours.updateMaintenance.useMutation({
    onSuccess: () => { toast.success("Manutenção atualizada!"); utils.machineHours.listMaintenance.invalidate(); utils.machineHours.maintenanceAlerts.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const createFuelMutation = trpc.machineHours.createFuel.useMutation({
    onSuccess: () => { toast.success("Abastecimento registrado! Lançamento financeiro gerado automaticamente."); utils.machineHours.listFuel.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const createOilMutation = trpc.machineHours.createOil.useMutation({
    onSuccess: () => { toast.success("Óleo registrado! Lançamento financeiro gerado automaticamente."); utils.machineHours.listOil.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const createOilWithStockMutation = trpc.machineHours.createOilWithStock.useMutation({
    onSuccess: (d) => { toast.success(`Óleo registrado! Estoque atualizado (${d.newStockQty}L restantes).`); utils.machineHours.listOil.invalidate(); utils.machineHours.equipmentSummary.invalidate(); refetchOilStock(); setIsOpen(false); resetForms(); setSelectedOilStockId(""); },
    onError: (e) => toast.error(e.message),
  });

  const addOilStockMutation = trpc.machineHours.addOilStock.useMutation({
    onSuccess: (d) => { toast.success(d.updated ? "Estoque atualizado!" : "Óleo adicionado ao estoque!"); refetchOilStock(); setShowOilStockForm(false); setOilStockForm({ oilType: "hidraulico", brand: "", purchaseQuantityLiters: "", pricePerLiter: "", totalValue: "", supplier: "", notes: "", photoBase64: "" }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteOilStockMutation = trpc.machineHours.deleteOilStock.useMutation({
    onSuccess: () => { toast.success("Item removido do estoque!"); refetchOilStock(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteOilMutation = trpc.machineHours.deleteOil.useMutation({
    onSuccess: () => { toast.success("Óleo excluído!"); utils.machineHours.listOil.invalidate(); utils.machineHours.equipmentSummary.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForms = () => {
    setHoursForm({ ...emptyHoursForm });
    setMaintForm({ ...emptyMaintForm });
    setFuelForm({ ...emptyFuelForm });
    setOilForm({ ...emptyOilForm });
    setPartLines([]);
    setPartSearch("");
    setSelectedTemplateId("");
    setEditingId(null);
  };

  const openNew = (mode: SheetMode) => {
    resetForms();
    setSheetMode(mode);
    setIsOpen(true);
  };

  const openEditHours = (h: any) => {
    setEditingId(h.id);
    setHoursForm({
      equipmentId: String(h.equipmentId),
      date: new Date(h.date).toISOString().slice(0, 10),
      startHourMeter: h.startHourMeter || "",
      endHourMeter: h.endHourMeter || "",
      activity: h.activity || "",
      location: h.location || "",
      notes: h.notes || "",
      workLocationId: h.workLocationId ? String(h.workLocationId) : "",
    });
    setSheetMode("horas");
    setIsOpen(true);
  };

  const openEditMaint = (m: any) => {
    setEditingId(m.id);
    setMaintForm({
      equipmentId: String(m.equipmentId),
      date: new Date(m.date).toISOString().slice(0, 10),
      hourMeter: m.hourMeter || "",
      type: m.type || "corretiva",
      serviceType: m.serviceType || "proprio",
      mechanicName: m.mechanicName || "",
      thirdPartyCompany: m.thirdPartyCompany || "",
      description: m.description || "",
      laborCost: m.laborCost || "",
      totalCost: m.totalCost || "",
      nextMaintenanceHours: m.nextMaintenanceHours || "",
    });
    setSheetMode("manutencao");
    setIsOpen(true);
  };

  const calcHours = (start: string, end: string): string => {
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (isNaN(s) || isNaN(e) || e <= s) return "";
    return (e - s).toFixed(1);
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (sheetMode === "horas") {
      const worked = calcHours(hoursForm.startHourMeter, hoursForm.endHourMeter);
      if (!worked) return toast.error("Horímetro final deve ser maior que o inicial");
      const payload = {
        equipmentId: parseInt(hoursForm.equipmentId),
        date: hoursForm.date,
        startHourMeter: hoursForm.startHourMeter,
        endHourMeter: hoursForm.endHourMeter,
        hoursWorked: worked,
        activity: hoursForm.activity || undefined,
        location: hoursForm.location || undefined,
        notes: hoursForm.notes || undefined,
        workLocationId: hoursForm.workLocationId ? parseInt(hoursForm.workLocationId) : undefined,
      };
      if (editingId) {
        updateHoursMutation.mutate({ id: editingId, ...payload });
      } else {
        createHoursMutation.mutate(payload);
      }
    } else if (sheetMode === "manutencao") {
      const payload = {
        equipmentId: parseInt(maintForm.equipmentId),
        date: maintForm.date,
        hourMeter: maintForm.hourMeter || undefined,
        type: maintForm.type,
        serviceType: maintForm.serviceType,
        mechanicName: maintForm.mechanicName || undefined,
        thirdPartyCompany: maintForm.thirdPartyCompany || undefined,
        description: maintForm.description || undefined,
        laborCost: maintForm.laborCost || undefined,
        totalCost: maintForm.totalCost || undefined,
        nextMaintenanceHours: maintForm.nextMaintenanceHours || undefined,
      };
      // Incluir peças como JSON no campo partsReplaced
      const payloadWithParts = {
        ...payload,
        partsReplaced: partLines.length > 0 ? JSON.stringify(partLines.map(p => ({
          partId: p.partId,
          code: p.partCode,
          name: p.partName,
          qty: p.quantity,
          unit: p.unit,
          unitCost: p.unitCost,
          totalCost: p.totalCost,
        }))) : undefined,
        totalCost: maintForm.totalCost || String(totalPartsCost + parseFloat(maintForm.laborCost || "0")),
      };
      if (editingId) {
        updateMaintMutation.mutate({ id: editingId, ...payload });
      } else {
        createMaintMutation.mutate(payloadWithParts);
      }
    } else if (sheetMode === "abastecimento") {
      createFuelMutation.mutate({
        equipmentId: parseInt(fuelForm.equipmentId),
        date: fuelForm.date,
        hourMeter: fuelForm.hourMeter || undefined,
        fuelType: fuelForm.fuelType,
        liters: fuelForm.liters,
        pricePerLiter: fuelForm.pricePerLiter || undefined,
        totalValue: fuelForm.totalValue || undefined,
        supplier: fuelForm.supplier || undefined,
        notes: fuelForm.notes || undefined,
        workLocationId: fuelForm.workLocationId ? parseInt(fuelForm.workLocationId) : undefined,
      });
    } else {
      // oleo
      if (selectedOilStockId) {
        createOilWithStockMutation.mutate({
          equipmentId: parseInt(oilForm.equipmentId),
          date: oilForm.date,
          hourMeter: oilForm.hourMeter || undefined,
          oilStockId: parseInt(selectedOilStockId),
          quantityLiters: oilForm.quantityLiters,
          notes: oilForm.notes || undefined,
        });
      } else {
        createOilMutation.mutate({
          equipmentId: parseInt(oilForm.equipmentId),
          date: oilForm.date,
          hourMeter: oilForm.hourMeter || undefined,
          oilType: oilForm.oilType,
          quantityLiters: oilForm.quantityLiters,
          brand: oilForm.brand || undefined,
          supplier: oilForm.supplier || undefined,
          pricePerLiter: oilForm.pricePerLiter || undefined,
          totalValue: oilForm.totalValue || undefined,
          notes: oilForm.notes || undefined,
        });
      }
    }
  };

  // ===== EXPORTAR PDF =====
  const handleExportPDF = async () => {
    const allRecords = [...filteredHours, ...filteredMaint, ...filteredFuel];
    if (allRecords.length === 0) { toast.error("Nenhum registro para exportar"); return; }
    const [kobayashiB64, qrB64] = await loadPdfAssets();
    const vehicleName = filterEquipment ? (equipMap[parseInt(filterEquipment)] || "Todos") : "Todos os equipamentos";
    const now = new Date().toLocaleString("pt-BR");

    const hoursRows = filteredHours.map((h: any) => `
      <tr>
        <td>${new Date(h.date).toLocaleDateString("pt-BR")}</td>
        <td>${equipMap[h.equipmentId] || `#${h.equipmentId}`}</td>
        <td>${h.startHourMeter || "-"}</td>
        <td>${h.endHourMeter || "-"}</td>
        <td><strong>${h.hoursWorked || "-"}h</strong></td>
        <td>${h.activity || "-"}</td>
        <td>${h.location || "-"}</td>
      </tr>`).join("");

    const maintRows = filteredMaint.map((m: any) => `
      <tr>
        <td>${new Date(m.date).toLocaleDateString("pt-BR")}</td>
        <td>${equipMap[m.equipmentId] || `#${m.equipmentId}`}</td>
        <td>${MAINTENANCE_TYPE_LABELS[m.type] || m.type}</td>
        <td>${SERVICE_TYPE_LABELS[m.serviceType] || m.serviceType}</td>
        <td>${m.mechanicName || m.thirdPartyCompany || "-"}</td>
        <td>${m.description || "-"}</td>
        <td>${m.totalCost ? `R$ ${m.totalCost}` : "-"}</td>
        <td>${m.nextMaintenanceHours || "-"}</td>
      </tr>`).join("");

    const fuelRows = filteredFuel.map((f: any) => `
      <tr>
        <td>${new Date(f.date).toLocaleDateString("pt-BR")}</td>
        <td>${equipMap[f.equipmentId] || `#${f.equipmentId}`}</td>
        <td>${FUEL_TYPE_LABELS[f.fuelType] || f.fuelType}</td>
        <td>${f.liters || "-"} L</td>
        <td>${f.pricePerLiter ? `R$ ${f.pricePerLiter}` : "-"}</td>
        <td>${f.totalValue ? `R$ ${f.totalValue}` : "-"}</td>
        <td>${f.supplier || "-"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Controle de Máquinas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
    .header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 24px; display: flex; align-items: center; gap: 18px; }
    .header img { height: 52px; filter: brightness(0) invert(1); }
    .header-text h1 { font-size: 20px; font-weight: bold; }
    .header-text p { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .content { padding: 20px 24px; }
    .section-title { font-size: 14px; font-weight: bold; color: #0d4f2e; border-bottom: 2px solid #0d4f2e; padding-bottom: 4px; margin: 18px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
    th { background: #0d4f2e; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f0fdf4; }
    .footer { margin-top: 24px; padding: 14px 24px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-left img { height: 28px; }
    .footer-text { font-size: 10px; color: #555; }
    .footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
    .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .footer-right img { width: 60px; height: 60px; }
    .footer-right span { font-size: 9px; color: #555; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="header">
  <img src="${BTREE_LOGO_B64}" alt="BTREE Ambiental" />
  <div class="header-text">
    <h1>Relatório de Controle de Máquinas</h1>
    <p>BTREE Empreendimentos LTDA · btreeambiental.com · Equipamento: ${vehicleName} · Emitido em ${now}</p>
  </div>
</div>
<div class="content">
  ${filteredHours.length > 0 ? `
  <div class="section-title">Horas Trabalhadas</div>
  <table>
    <thead><tr><th>Data</th><th>Equipamento</th><th>Horímetro Inicial</th><th>Horímetro Final</th><th>Horas</th><th>Atividade</th><th>Local</th></tr></thead>
    <tbody>${hoursRows}</tbody>
  </table>` : ""}
  ${filteredMaint.length > 0 ? `
  <div class="section-title">Manutenções</div>
  <table>
    <thead><tr><th>Data</th><th>Equipamento</th><th>Tipo</th><th>Serviço</th><th>Responsável</th><th>Descrição</th><th>Custo</th><th>Próx. Horímetro</th></tr></thead>
    <tbody>${maintRows}</tbody>
  </table>` : ""}
  ${filteredFuel.length > 0 ? `
  <div class="section-title">Abastecimentos</div>
  <table>
    <thead><tr><th>Data</th><th>Equipamento</th><th>Combustível</th><th>Litros</th><th>Preço/L</th><th>Total</th><th>Fornecedor</th></tr></thead>
    <tbody>${fuelRows}</tbody>
  </table>` : ""}
</div>
<div class="footer">
  <div class="footer-left">
    <img src="${kobayashiB64}" alt="Kobayashi" />
    <div class="footer-text">
      Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
      <a href="https://btreeambiental.com">btreeambiental.com</a>
    </div>
  </div>
  <div class="footer-right">
    <img src="${qrB64}" alt="QR Code" />
    <span>Acesse nosso site</span>
  </div>
</div>
</body>
</html>`;
    toast.info("Gerando PDF...");
    await generatePDFFromHtml(html, `maquinas-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const isPending = createHoursMutation.isPending || createMaintMutation.isPending || createFuelMutation.isPending || createOilMutation.isPending || updateHoursMutation.isPending || updateMaintMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Settings className="h-7 w-7" /> Controle de Equipamentos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Painel central de controle — horas, consumos, manutenções e custos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button onClick={() => openNew(activeTab === "manutencao" ? "manutencao" : activeTab === "abastecimento" ? "abastecimento" : "horas")} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Alertas de Manutenção Preventiva */}
      {(alerts as any[]).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas de Manutenção Preventiva
          </p>
          {(alerts as any[]).map((alert: any) => (
            <Card key={alert.equipmentId} className={`border-l-4 ${alert.isOverdue ? "border-l-red-500 bg-red-50" : "border-l-orange-400 bg-orange-50"}`}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{alert.equipmentName}</p>
                  <p className="text-xs text-gray-600">
                    Horímetro atual: <strong>{alert.currentHourMeter}h</strong> · Próxima manutenção: <strong>{alert.nextMaintenanceHours}h</strong>
                  </p>
                </div>
                <Badge className={alert.isOverdue ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>
                  {alert.isOverdue
                    ? `Vencida há ${Math.abs(alert.hoursRemaining).toFixed(0)}h`
                    : `Faltam ${alert.hoursRemaining.toFixed(0)}h`
                  }
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtro de equipamento */}
      <div className="max-w-xs">
        <select
          value={filterEquipment}
          onChange={e => setFilterEquipment(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os equipamentos</option>
          {(equipmentList as any[]).map((eq: any) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {(["resumo", "horas", "manutencao", "abastecimento", "oleo"] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "resumo" && <Settings className="h-4 w-4 inline mr-1" />}
            {tab === "horas" && <Clock className="h-4 w-4 inline mr-1" />}
            {tab === "manutencao" && <Wrench className="h-4 w-4 inline mr-1" />}
            {tab === "abastecimento" && <Fuel className="h-4 w-4 inline mr-1" />}
            {tab === "oleo" && <Droplets className="h-4 w-4 inline mr-1" />}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ===== ABA RESUMO ===== */}
      {activeTab === "resumo" && (
        <div className="space-y-3">
          {(summary as any[]).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum equipamento cadastrado</p>
            </div>
          ) : (
            (summary as any[])
              .filter((s: any) => !filterEquipment || String(s.equipmentId) === filterEquipment)
              .map((s: any) => (
                <Card key={s.equipmentId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{s.equipmentName}</p>
                          {s.brand && <span className="text-xs text-gray-400">{s.brand} {s.model || ""}</span>}
                          <Badge className={`text-xs ${s.status === "ativo" ? "bg-green-100 text-green-700" : s.status === "manutencao" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                            {s.status === "ativo" ? "Ativo" : s.status === "manutencao" ? "Em Manutenção" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
                          <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-emerald-700">{s.totalHoursWorked.toFixed(1)}h</p>
                            <p className="text-xs text-gray-500">Horas</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-blue-700">{s.lastHourMeter || "—"}</p>
                            <p className="text-xs text-gray-500">Horímetro</p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-yellow-700">{s.totalFuelLiters.toFixed(1)}L</p>
                            <p className="text-xs text-gray-500">Combustível</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-purple-700">{(s.totalOilLiters ?? 0).toFixed(1)}L</p>
                            <p className="text-xs text-gray-500">Óleo</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-orange-700">{s.maintenanceCount}</p>
                            <p className="text-xs text-gray-500">Manutenções</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-red-700">R$ {(s.totalCost ?? 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500">Custo Total</p>
                          </div>
                        </div>
                        {s.nextMaintenanceHours && s.lastHourMeter && (
                          <div className="mt-2 text-xs text-gray-500">
                            Próxima manutenção programada: horímetro <strong>{s.nextMaintenanceHours}</strong>
                            {parseFloat(s.lastHourMeter) >= parseFloat(s.nextMaintenanceHours) ? (
                              <span className="ml-2 text-red-600 font-semibold">⚠ Vencida!</span>
                            ) : (
                              <span className="ml-2 text-emerald-600">
                                (faltam {(parseFloat(s.nextMaintenanceHours) - parseFloat(s.lastHourMeter)).toFixed(0)}h)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* ===== ABA HORAS ===== */}
      {activeTab === "horas" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openNew("horas")} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar Horas
            </Button>
          </div>
          {loadingHours ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredHours.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum registro de horas</p>
            </div>
          ) : filteredHours.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{equipMap[h.equipmentId] || `Equipamento #${h.equipmentId}`}</p>
                    <p className="text-sm text-gray-500">{h.activity || "Atividade não informada"} {h.location ? `· ${h.location}` : ""}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(h.date).toLocaleDateString("pt-BR")} · Horímetro: {h.startHourMeter} → {h.endHourMeter}
                    </p>
                    {h.locationName && (
                      <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {h.locationName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-700">{h.hoursWorked}</p>
                      <p className="text-xs text-gray-400">horas</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-emerald-600" onClick={() => openEditHours(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== ABA MANUTENÇÃO ===== */}
      {activeTab === "manutencao" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openNew("manutencao")} className="bg-orange-600 hover:bg-orange-700 text-white gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar Manutenção
            </Button>
          </div>
          {loadingMaint ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredMaint.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma manutenção registrada</p>
            </div>
          ) : filteredMaint.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{equipMap[m.equipmentId] || `Equipamento #${m.equipmentId}`}</p>
                      <Badge className="text-xs bg-orange-100 text-orange-800">{MAINTENANCE_TYPE_LABELS[m.type]}</Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800">{SERVICE_TYPE_LABELS[m.serviceType]}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{m.description || "Sem descrição"}</p>
                    <p className="text-xs text-gray-400">
                      {m.mechanicName || m.thirdPartyCompany || "Responsável não informado"} · {new Date(m.date).toLocaleDateString("pt-BR")}
                      {m.hourMeter && ` · Horímetro: ${m.hourMeter}`}
                    </p>
                    {m.nextMaintenanceHours && (
                      <p className="text-xs text-emerald-600 mt-1">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        Próxima manutenção: horímetro {m.nextMaintenanceHours}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    {m.totalCost && (
                      <div className="text-right">
                        <p className="font-bold text-gray-700">R$ {m.totalCost}</p>
                        <p className="text-xs text-gray-400">custo total</p>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-orange-600" onClick={() => openEditMaint(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== ABA ÓLEO ===== */}
      {activeTab === "oleo" && (
        <div className="space-y-3">
          {/* Estoque de Óleo */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-800 text-sm">📦 Estoque de Óleo</h3>
              <Button size="sm" variant="outline" onClick={() => setShowOilStockForm(!showOilStockForm)} className="text-purple-700 border-purple-300 text-xs h-7">
                {showOilStockForm ? "Cancelar" : "+ Entrada de Estoque"}
              </Button>
            </div>
            {showOilStockForm && (
              <div className="bg-white rounded-lg p-3 border border-purple-100 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo *</Label>
                    <select value={oilStockForm.oilType} onChange={e => setOilStockForm(f => ({ ...f, oilType: e.target.value as any }))} className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="hidraulico">Hidráulico</option>
                      <option value="motor">Motor</option>
                      <option value="transmissao">Transmissão</option>
                      <option value="diferencial">Diferencial</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Marca *</Label>
                    <Input value={oilStockForm.brand} onChange={e => setOilStockForm(f => ({ ...f, brand: e.target.value }))} placeholder="ex: Castrol, Shell" className="h-9 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Qtd Comprada (L) *</Label>
                    <Input value={oilStockForm.purchaseQuantityLiters} onChange={e => setOilStockForm(f => ({ ...f, purchaseQuantityLiters: e.target.value }))} placeholder="0,0" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Preço/L (R$)</Label>
                    <Input value={oilStockForm.pricePerLiter} onChange={e => setOilStockForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,00" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Total (R$)</Label>
                    <Input value={oilStockForm.totalValue} onChange={e => setOilStockForm(f => ({ ...f, totalValue: e.target.value }))} placeholder="0,00" className="h-9 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fornecedor</Label>
                  <Input value={oilStockForm.supplier} onChange={e => setOilStockForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do fornecedor" className="h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Foto do Produto</Label>
                  <button type="button" className="text-xs text-purple-600 border border-dashed border-purple-400 rounded px-2 py-1 hover:bg-purple-50 w-full"
                    onClick={() => {
                      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
                      input.onchange = () => {
                        const f = input.files?.[0]; if (!f) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setOilStockForm(prev => ({ ...prev, photoBase64: ev.target?.result as string }));
                        reader.readAsDataURL(f);
                      };
                      document.body.appendChild(input); input.click(); setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 60000);
                    }}>
                    {oilStockForm.photoBase64 ? "✓ Foto selecionada" : "+ Selecionar foto"}
                  </button>
                  {oilStockForm.photoBase64 && <img src={oilStockForm.photoBase64} alt="preview" className="mt-1 h-16 rounded object-cover" />}
                </div>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs" disabled={addOilStockMutation.isPending}
                  onClick={() => addOilStockMutation.mutate({ oilType: oilStockForm.oilType, brand: oilStockForm.brand, purchaseQuantityLiters: oilStockForm.purchaseQuantityLiters, pricePerLiter: oilStockForm.pricePerLiter || undefined, totalValue: oilStockForm.totalValue || undefined, photoBase64: oilStockForm.photoBase64 || undefined, supplier: oilStockForm.supplier || undefined })}>
                  {addOilStockMutation.isPending ? "Salvando..." : "Salvar no Estoque"}
                </Button>
              </div>
            )}
            {(oilStockList as any[]).length === 0 ? (
              <p className="text-xs text-purple-500 text-center py-2">Nenhum item em estoque. Adicione uma entrada acima.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {(oilStockList as any[]).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100">
                    <div className="flex items-center gap-2">
                      {s.photoUrl && <img src={s.photoUrl} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div>
                        <p className="text-xs font-semibold text-purple-800">{OIL_TYPE_LABELS[s.oilType]} · {s.brand}</p>
                        <p className="text-xs text-gray-500">{parseFloat(s.quantityLiters).toFixed(1)}L disponíveis{s.pricePerLiter ? ` · R$ ${s.pricePerLiter}/L` : ""}</p>
                      </div>
                    </div>
                    <button onClick={() => { if (confirm("Remover do estoque?")) deleteOilStockMutation.mutate({ id: s.id }); }} className="text-red-400 hover:text-red-600 ml-2">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => openNew("oleo")} className="bg-purple-600 hover:bg-purple-700 text-white gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar Consumo de Óleo
            </Button>
          </div>
          {loadingOil ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredOil.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Droplets className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum consumo de óleo registrado</p>
            </div>
          ) : filteredOil.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{equipMap[o.equipmentId] || `Equipamento #${o.equipmentId}`}</p>
                    <p className="text-sm text-gray-500">{OIL_TYPE_LABELS[o.oilType] || o.oilType}{o.brand ? ` · ${o.brand}` : ""}{o.supplier ? ` · ${o.supplier}` : ""}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.date).toLocaleDateString("pt-BR")}
                      {o.hourMeter && ` · Horímetro: ${o.hourMeter}`}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-xl font-bold text-purple-700">{o.quantityLiters}L</p>
                      {o.totalValue && <p className="text-sm text-gray-500">R$ {o.totalValue}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => deleteOilMutation.mutate({ id: o.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== ABA ABASTECIMENTO ===== */}
      {activeTab === "abastecimento" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openNew("abastecimento")} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar Abastecimento
            </Button>
          </div>
          {loadingFuel ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredFuel.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum abastecimento registrado</p>
            </div>
          ) : filteredFuel.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{equipMap[f.equipmentId] || `Equipamento #${f.equipmentId}`}</p>
                    <p className="text-sm text-gray-500">{FUEL_TYPE_LABELS[f.fuelType] || f.fuelType} · {f.supplier || "Fornecedor não informado"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(f.date).toLocaleDateString("pt-BR")}
                      {f.hourMeter && ` · Horímetro: ${f.hourMeter}`}
                    </p>
                    {f.locationName && (
                      <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {f.locationName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-700">{f.liters}L</p>
                    {f.totalValue && <p className="text-sm text-gray-500">R$ {f.totalValue}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== SHEET DE CADASTRO/EDIÇÃO ===== */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForms(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">
              {editingId ? "Editar" : "Novo"} — {TAB_LABELS[sheetMode]}
            </SheetTitle>
          </SheetHeader>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 flex-wrap">
            {(["horas", "manutencao", "abastecimento", "oleo"] as SheetMode[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => { setSheetMode(tab); setEditingId(null); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[70px] ${
                  sheetMode === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {tab === "horas" ? "Horas" : tab === "manutencao" ? "Manutenção" : tab === "abastecimento" ? "Abastecimento" : "Óleo"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            {/* Equipamento (comum) */}
            <div>
              <Label>Equipamento *</Label>
              <select
                value={sheetMode === "horas" ? hoursForm.equipmentId : sheetMode === "manutencao" ? maintForm.equipmentId : sheetMode === "abastecimento" ? fuelForm.equipmentId : oilForm.equipmentId}
                onChange={e => {
                  const v = e.target.value;
                  if (sheetMode === "horas") setHoursForm(f => ({ ...f, equipmentId: v }));
                  else if (sheetMode === "manutencao") setMaintForm(f => ({ ...f, equipmentId: v }));
                  else if (sheetMode === "abastecimento") setFuelForm(f => ({ ...f, equipmentId: v }));
                  else setOilForm(f => ({ ...f, equipmentId: v }));
                }}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o equipamento</option>
                {(equipmentList as any[]).map((eq: any) => (
                  <option key={eq.id} value={eq.id}>{eq.name} {eq.brand ? `(${eq.brand})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={sheetMode === "horas" ? hoursForm.date : sheetMode === "manutencao" ? maintForm.date : sheetMode === "abastecimento" ? fuelForm.date : oilForm.date}
                onChange={e => {
                  const v = e.target.value;
                  if (sheetMode === "horas") setHoursForm(f => ({ ...f, date: v }));
                  else if (sheetMode === "manutencao") setMaintForm(f => ({ ...f, date: v }));
                  else if (sheetMode === "abastecimento") setFuelForm(f => ({ ...f, date: v }));
                  else setOilForm(f => ({ ...f, date: v }));
                }}
                required
              />
            </div>

            {/* Campos de Horas */}
            {sheetMode === "horas" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Horímetro Inicial *</Label>
                    <Input value={hoursForm.startHourMeter} onChange={e => setHoursForm(f => ({ ...f, startHourMeter: e.target.value }))} placeholder="ex: 1250.5" required />
                  </div>
                  <div>
                    <Label>Horímetro Final *</Label>
                    <Input value={hoursForm.endHourMeter} onChange={e => setHoursForm(f => ({ ...f, endHourMeter: e.target.value }))} placeholder="ex: 1258.0" required />
                  </div>
                </div>
                {calcHours(hoursForm.startHourMeter, hoursForm.endHourMeter) && (
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-emerald-600">Horas trabalhadas</p>
                    <p className="text-2xl font-bold text-emerald-700">{calcHours(hoursForm.startHourMeter, hoursForm.endHourMeter)}h</p>
                  </div>
                )}
                <div>
                  <Label>Atividade</Label>
                  <Input value={hoursForm.activity} onChange={e => setHoursForm(f => ({ ...f, activity: e.target.value }))} placeholder="ex: Colheita, Plantio..." />
                </div>
                <WorkLocationSelect
                  value={hoursForm.workLocationId}
                  onChange={(id, name) => setHoursForm(f => ({ ...f, workLocationId: id, location: name || f.location }))}
                />
                <div>
                  <Label>Local (texto livre)</Label>
                  <Input value={hoursForm.location} onChange={e => setHoursForm(f => ({ ...f, location: e.target.value }))} placeholder="ex: Talhão 3, Fazenda..." />
                </div>
                <div>
                  <Label>Observações</Label>
                  <textarea value={hoursForm.notes} onChange={e => setHoursForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
                </div>
              </>
            )}

            {/* Campos de Manutenção */}
            {sheetMode === "manutencao" && (
              <>
                <div>
                  <Label>Horímetro</Label>
                  <Input value={maintForm.hourMeter} onChange={e => setMaintForm(f => ({ ...f, hourMeter: e.target.value }))} placeholder="ex: 1250" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo *</Label>
                    <select value={maintForm.type} onChange={e => setMaintForm(f => ({ ...f, type: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="corretiva">Corretiva</option>
                      <option value="preventiva">Preventiva</option>
                      <option value="revisao">Revisão</option>
                    </select>
                  </div>
                  <div>
                    <Label>Serviço *</Label>
                    <select value={maintForm.serviceType} onChange={e => setMaintForm(f => ({ ...f, serviceType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="proprio">Próprio</option>
                      <option value="terceirizado">Terceirizado</option>
                    </select>
                  </div>
                </div>
                {maintForm.serviceType === "proprio" ? (
                  <div>
                    <Label>Mecânico</Label>
                    <Input value={maintForm.mechanicName} onChange={e => setMaintForm(f => ({ ...f, mechanicName: e.target.value }))} placeholder="Nome do mecânico" />
                  </div>
                ) : (
                  <div>
                    <Label>Empresa Terceirizada</Label>
                    <Input value={maintForm.thirdPartyCompany} onChange={e => setMaintForm(f => ({ ...f, thirdPartyCompany: e.target.value }))} placeholder="Nome da empresa" />
                  </div>
                )}
                <div>
                  <Label>Descrição do Serviço</Label>
                  <textarea value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o serviço realizado..." className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>

                {/* ===== SEÇÃO DE PEÇAS ===== */}
                <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-sm">Peças Utilizadas</span>
                    {partLines.length > 0 && (
                      <span className="ml-auto text-xs text-emerald-700 font-semibold">
                        Total peças: R$ {totalPartsCost.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Carregar template */}
                  {(templates as any[]).length > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={selectedTemplateId}
                        onChange={e => { setSelectedTemplateId(e.target.value); if (e.target.value) loadTemplate(e.target.value); }}
                        className="flex-1 h-8 px-2 rounded-md border border-input bg-white text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">📋 Carregar template de manutenção...</option>
                        {(templates as any[]).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Busca de peça */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      value={partSearch}
                      onChange={e => setPartSearch(e.target.value)}
                      placeholder="Buscar peça por código ou nome..."
                      className="pl-7 h-8 text-xs"
                    />
                    {partResults.length > 0 && (
                      <div className="absolute z-50 top-9 left-0 right-0 bg-white border rounded-md shadow-lg">
                        {partResults.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addPartFromSearch(p)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-2 text-xs border-b last:border-0"
                          >
                            {p.imageUrl && <img src={p.imageUrl} className="h-6 w-6 rounded object-cover" />}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{p.name}</span>
                              {p.code && <span className="text-gray-400 ml-1">({p.code})</span>}
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              (p.stockQuantity ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {(p.stockQuantity ?? 0) > 0 ? `${p.stockQuantity} em estoque` : "Sem estoque"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista de peças adicionadas */}
                  {partLines.length > 0 && (
                    <div className="space-y-2">
                      {partLines.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border rounded-md p-2">
                          {p.partPhotoUrl && <img src={p.partPhotoUrl} className="h-8 w-8 rounded object-cover flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.partName}</p>
                            {p.partCode && <p className="text-xs text-gray-400">{p.partCode}</p>}
                            {p.stockQty !== undefined && (
                              <span className={`text-xs ${
                                p.stockQty >= p.quantity ? "text-green-600" : "text-orange-500"
                              }`}>
                                {p.stockQty >= p.quantity ? "✓ Estoque ok" : `⚠ Estoque: ${p.stockQty}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Input
                              type="number"
                              min={1}
                              value={p.quantity}
                              onChange={e => updatePartLine(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="h-7 w-14 text-xs text-center"
                            />
                            <Input
                              value={p.unitCost}
                              onChange={e => updatePartLine(idx, "unitCost", e.target.value)}
                              className="h-7 w-20 text-xs"
                              placeholder="R$"
                            />
                            <button
                              type="button"
                              onClick={() => setPartLines(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {partLines.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-1">Nenhuma peça adicionada</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mão de Obra (R$)</Label>
                    <Input value={maintForm.laborCost} onChange={e => setMaintForm(f => ({ ...f, laborCost: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Custo Total (R$)</Label>
                    <Input
                      value={maintForm.totalCost || (totalPartsCost + parseFloat(maintForm.laborCost || "0")).toFixed(2)}
                      onChange={e => setMaintForm(f => ({ ...f, totalCost: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Próxima Manutenção (horímetro)</Label>
                  <Input value={maintForm.nextMaintenanceHours} onChange={e => setMaintForm(f => ({ ...f, nextMaintenanceHours: e.target.value }))} placeholder="ex: 1500" />
                  <p className="text-xs text-gray-400 mt-1">Defina o horímetro para o próximo alerta de manutenção preventiva</p>
                </div>
              </>
            )}

            {/* Campos de Óleo */}
            {sheetMode === "oleo" && (
              <>
                <div>
                  <Label>Horímetro</Label>
                  <Input value={oilForm.hourMeter} onChange={e => setOilForm(f => ({ ...f, hourMeter: e.target.value }))} placeholder="ex: 1250" />
                </div>
                {/* Seleção do item do estoque */}
                <div>
                  <Label>Óleo do Estoque</Label>
                  <select
                    value={selectedOilStockId}
                    onChange={e => setSelectedOilStockId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Sem estoque (manual) —</option>
                    {(oilStockList as any[]).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {OIL_TYPE_LABELS[s.oilType]} · {s.brand} — {parseFloat(s.quantityLiters).toFixed(1)}L disponíveis
                      </option>
                    ))}
                  </select>
                  {selectedOilStockId && (() => {
                    const item = (oilStockList as any[]).find((s: any) => String(s.id) === selectedOilStockId);
                    return item ? (
                      <p className="text-xs text-emerald-700 mt-1">✓ {OIL_TYPE_LABELS[item.oilType]} · {item.brand} · R$ {item.pricePerLiter || "—"}/L · Estoque: {parseFloat(item.quantityLiters).toFixed(1)}L</p>
                    ) : null;
                  })()}
                </div>
                {/* Campos manuais apenas se não selecionou estoque */}
                {!selectedOilStockId && (
                  <>
                    <div>
                      <Label>Tipo de Óleo *</Label>
                      <select value={oilForm.oilType} onChange={e => setOilForm(f => ({ ...f, oilType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="hidraulico">Hidráulico</option>
                        <option value="motor">Motor</option>
                        <option value="transmissao">Transmissão</option>
                        <option value="diferencial">Diferencial</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Marca</Label>
                        <Input value={oilForm.brand} onChange={e => setOilForm(f => ({ ...f, brand: e.target.value }))} placeholder="ex: Shell, Castrol..." />
                      </div>
                      <div>
                        <Label>Fornecedor</Label>
                        <Input value={oilForm.supplier} onChange={e => setOilForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do fornecedor" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Litros *</Label>
                        <Input value={oilForm.quantityLiters} onChange={e => setOilForm(f => ({ ...f, quantityLiters: e.target.value }))} placeholder="0,0" required />
                      </div>
                      <div>
                        <Label>Preço/L (R$)</Label>
                        <Input value={oilForm.pricePerLiter} onChange={e => setOilForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,00" />
                      </div>
                      <div>
                        <Label>Total (R$)</Label>
                        <Input value={oilForm.totalValue} onChange={e => setOilForm(f => ({ ...f, totalValue: e.target.value }))} placeholder="0,00" />
                      </div>
                    </div>
                  </>
                )}
                {/* Litros quando usa estoque */}
                {selectedOilStockId && (
                  <div>
                    <Label>Quantidade Utilizada (L) *</Label>
                    <Input value={oilForm.quantityLiters} onChange={e => setOilForm(f => ({ ...f, quantityLiters: e.target.value }))} placeholder="0,0" required />
                  </div>
                )}
                <div>
                  <Label>Observações</Label>
                  <textarea value={oilForm.notes} onChange={e => setOilForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-700">
                  {selectedOilStockId ? "✓ O estoque será abatido automaticamente e o custo lançado no Financeiro." : "ℹ️ O custo será lançado automaticamente no módulo Financeiro."}
                </div>
              </>
            )}

            {/* Campos de Abastecimento */}
            {sheetMode === "abastecimento" && (
              <>
                <div>
                  <Label>Horímetro</Label>
                  <Input value={fuelForm.hourMeter} onChange={e => setFuelForm(f => ({ ...f, hourMeter: e.target.value }))} placeholder="ex: 1250" />
                </div>
                <div>
                  <Label>Combustível *</Label>
                  <select value={fuelForm.fuelType} onChange={e => setFuelForm(f => ({ ...f, fuelType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="diesel">Diesel</option>
                    <option value="gasolina">Gasolina</option>
                    <option value="mistura_2t">Mistura 2T</option>
                    <option value="arla">Arla 32</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Litros *</Label>
                    <Input value={fuelForm.liters} onChange={e => setFuelForm(f => ({ ...f, liters: e.target.value }))} placeholder="0,0" required />
                  </div>
                  <div>
                    <Label>Preço/L (R$)</Label>
                    <Input value={fuelForm.pricePerLiter} onChange={e => setFuelForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Total (R$)</Label>
                    <Input value={fuelForm.totalValue} onChange={e => setFuelForm(f => ({ ...f, totalValue: e.target.value }))} placeholder="0,00" />
                  </div>
                </div>
                <WorkLocationSelect
                  value={fuelForm.workLocationId}
                  onChange={(id) => setFuelForm(f => ({ ...f, workLocationId: id }))}
                />
                <div>
                  <Label>Fornecedor / Posto</Label>
                  <Input value={fuelForm.supplier} onChange={e => setFuelForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do posto" />
                </div>
                <div>
                  <Label>Observações</Label>
                  <textarea value={fuelForm.notes} onChange={e => setFuelForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
