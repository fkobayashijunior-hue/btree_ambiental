import { useState, useMemo } from "react";
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
  CheckCircle2, FileDown, Pencil, ChevronDown, ChevronUp
} from "lucide-react";

type ActiveTab = "resumo" | "horas" | "manutencao" | "abastecimento";
type SheetMode = "horas" | "manutencao" | "abastecimento";

const TAB_LABELS: Record<ActiveTab, string> = {
  resumo: "Resumo",
  horas: "Horas Trabalhadas",
  manutencao: "Manutenções",
  abastecimento: "Abastecimentos",
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
};

export default function MachineHoursPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("resumo");
  const [isOpen, setIsOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("horas");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [expandedEquip, setExpandedEquip] = useState<Record<number, boolean>>({});

  const [hoursForm, setHoursForm] = useState({ ...emptyHoursForm });
  const [maintForm, setMaintForm] = useState({ ...emptyMaintForm });
  const [fuelForm, setFuelForm] = useState({ ...emptyFuelForm });

  const utils = trpc.useUtils();

  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: hours = [], isLoading: loadingHours } = trpc.machineHours.listHours.useQuery({});
  const { data: maintenance = [], isLoading: loadingMaint } = trpc.machineHours.listMaintenance.useQuery({});
  const { data: fuel = [], isLoading: loadingFuel } = trpc.machineHours.listFuel.useQuery({});
  const { data: alerts = [] } = trpc.machineHours.maintenanceAlerts.useQuery();
  const { data: summary = [] } = trpc.machineHours.equipmentSummary.useQuery();

  const equipMap = Object.fromEntries((equipmentList as any[]).map((eq: any) => [eq.id, eq.name]));

  // Filtrar registros por equipamento
  const filteredHours = useMemo(() => filterEquipment ? (hours as any[]).filter((h: any) => String(h.equipmentId) === filterEquipment) : hours as any[], [hours, filterEquipment]);
  const filteredMaint = useMemo(() => filterEquipment ? (maintenance as any[]).filter((m: any) => String(m.equipmentId) === filterEquipment) : maintenance as any[], [maintenance, filterEquipment]);
  const filteredFuel = useMemo(() => filterEquipment ? (fuel as any[]).filter((f: any) => String(f.equipmentId) === filterEquipment) : fuel as any[], [fuel, filterEquipment]);

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
    onSuccess: () => { toast.success("Abastecimento registrado!"); utils.machineHours.listFuel.invalidate(); utils.machineHours.equipmentSummary.invalidate(); setIsOpen(false); resetForms(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForms = () => {
    setHoursForm({ ...emptyHoursForm });
    setMaintForm({ ...emptyMaintForm });
    setFuelForm({ ...emptyFuelForm });
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
      if (editingId) {
        updateMaintMutation.mutate({ id: editingId, ...payload });
      } else {
        createMaintMutation.mutate(payload);
      }
    } else {
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
      });
    }
  };

  // ===== EXPORTAR PDF =====
  const handleExportPDF = async () => {
    const allRecords = [...filteredHours, ...filteredMaint, ...filteredFuel];
    if (allRecords.length === 0) { toast.error("Nenhum registro para exportar"); return; }
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      const vehicleName = filterEquipment ? (equipMap[parseInt(filterEquipment)] || "Todos") : "Todos os equipamentos";

      doc.setFontSize(16);
      doc.setTextColor(22, 101, 52);
      doc.text("BTREE Ambiental", 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Relatório de Controle de Máquinas`, 14, 26);
      doc.text(`Equipamento: ${vehicleName}`, 14, 33);

      // Horas
      if (filteredHours.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(22, 101, 52);
        doc.text("Horas Trabalhadas", 14, 43);
        autoTable(doc, {
          startY: 47,
          head: [["Data", "Equipamento", "Horímetro Inicial", "Horímetro Final", "Horas", "Atividade", "Local"]],
          body: filteredHours.map((h: any) => [
            new Date(h.date).toLocaleDateString("pt-BR"),
            equipMap[h.equipmentId] || `#${h.equipmentId}`,
            h.startHourMeter,
            h.endHourMeter,
            `${h.hoursWorked}h`,
            h.activity || "-",
            h.location || "-",
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [22, 101, 52], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
        });
      }

      // Manutenções
      if (filteredMaint.length > 0) {
        const startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 47;
        doc.setFontSize(12);
        doc.setTextColor(234, 88, 12);
        doc.text("Manutenções", 14, startY);
        autoTable(doc, {
          startY: startY + 4,
          head: [["Data", "Equipamento", "Tipo", "Serviço", "Responsável", "Descrição", "Custo (R$)", "Próx. Horímetro"]],
          body: filteredMaint.map((m: any) => [
            new Date(m.date).toLocaleDateString("pt-BR"),
            equipMap[m.equipmentId] || `#${m.equipmentId}`,
            MAINTENANCE_TYPE_LABELS[m.type] || m.type,
            SERVICE_TYPE_LABELS[m.serviceType] || m.serviceType,
            m.mechanicName || m.thirdPartyCompany || "-",
            m.description || "-",
            m.totalCost || "-",
            m.nextMaintenanceHours || "-",
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [234, 88, 12], textColor: 255 },
          alternateRowStyles: { fillColor: [255, 247, 237] },
        });
      }

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — Kobayashi Desenvolvimento`, 14, doc.internal.pageSize.height - 8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
      }

      doc.save(`maquinas-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    }
  };

  const isPending = createHoursMutation.isPending || createMaintMutation.isPending || createFuelMutation.isPending || updateHoursMutation.isPending || updateMaintMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Settings className="h-7 w-7" /> Controle de Equipamentos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Horas trabalhadas, manutenções e abastecimentos</p>
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
        {(["resumo", "horas", "manutencao", "abastecimento"] as ActiveTab[]).map(tab => (
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-emerald-700">{s.totalHoursWorked.toFixed(1)}h</p>
                            <p className="text-xs text-gray-500">Horas trabalhadas</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-blue-700">{s.lastHourMeter || "—"}</p>
                            <p className="text-xs text-gray-500">Último horímetro</p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-yellow-700">{s.totalFuelLiters.toFixed(1)}L</p>
                            <p className="text-xs text-gray-500">Combustível total</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-orange-700">{s.maintenanceCount}</p>
                            <p className="text-xs text-gray-500">Manutenções</p>
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
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            {(["horas", "manutencao", "abastecimento"] as SheetMode[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => { setSheetMode(tab); setEditingId(null); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sheetMode === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {tab === "horas" ? "Horas" : tab === "manutencao" ? "Manutenção" : "Abastecimento"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            {/* Equipamento (comum) */}
            <div>
              <Label>Equipamento *</Label>
              <select
                value={sheetMode === "horas" ? hoursForm.equipmentId : sheetMode === "manutencao" ? maintForm.equipmentId : fuelForm.equipmentId}
                onChange={e => {
                  const v = e.target.value;
                  if (sheetMode === "horas") setHoursForm(f => ({ ...f, equipmentId: v }));
                  else if (sheetMode === "manutencao") setMaintForm(f => ({ ...f, equipmentId: v }));
                  else setFuelForm(f => ({ ...f, equipmentId: v }));
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
                value={sheetMode === "horas" ? hoursForm.date : sheetMode === "manutencao" ? maintForm.date : fuelForm.date}
                onChange={e => {
                  const v = e.target.value;
                  if (sheetMode === "horas") setHoursForm(f => ({ ...f, date: v }));
                  else if (sheetMode === "manutencao") setMaintForm(f => ({ ...f, date: v }));
                  else setFuelForm(f => ({ ...f, date: v }));
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
                <div>
                  <Label>Local</Label>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mão de Obra (R$)</Label>
                    <Input value={maintForm.laborCost} onChange={e => setMaintForm(f => ({ ...f, laborCost: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Custo Total (R$)</Label>
                    <Input value={maintForm.totalCost} onChange={e => setMaintForm(f => ({ ...f, totalCost: e.target.value }))} placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <Label>Próxima Manutenção (horímetro)</Label>
                  <Input value={maintForm.nextMaintenanceHours} onChange={e => setMaintForm(f => ({ ...f, nextMaintenanceHours: e.target.value }))} placeholder="ex: 1500" />
                  <p className="text-xs text-gray-400 mt-1">Defina o horímetro para o próximo alerta de manutenção preventiva</p>
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
