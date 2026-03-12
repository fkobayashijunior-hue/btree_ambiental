import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Settings, Plus, Clock, Wrench, Fuel, Calendar, ChevronDown, ChevronUp } from "lucide-react";

type ActiveTab = "horas" | "manutencao" | "abastecimento";

const TAB_LABELS: Record<ActiveTab, string> = {
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

export default function MachineHoursPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("horas");
  const [isOpen, setIsOpen] = useState(false);

  // Horas form
  const [hoursForm, setHoursForm] = useState({
    equipmentId: "",
    date: new Date().toISOString().slice(0, 10),
    startHourMeter: "",
    endHourMeter: "",
    activity: "",
    location: "",
    notes: "",
  });

  // Manutenção form
  const [maintForm, setMaintForm] = useState({
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
  });

  // Abastecimento form
  const [fuelForm, setFuelForm] = useState({
    equipmentId: "",
    date: new Date().toISOString().slice(0, 10),
    hourMeter: "",
    fuelType: "diesel" as "diesel" | "gasolina" | "mistura_2t" | "arla",
    liters: "",
    pricePerLiter: "",
    totalValue: "",
    supplier: "",
    notes: "",
  });

  const utils = trpc.useUtils();

  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: hours = [], isLoading: loadingHours } = trpc.machineHours.listHours.useQuery({});
  const { data: maintenance = [], isLoading: loadingMaint } = trpc.machineHours.listMaintenance.useQuery({});
  const { data: fuel = [], isLoading: loadingFuel } = trpc.machineHours.listFuel.useQuery({});

  // Mapa de equipamentos para lookup rápido pelo id
  const equipMap = Object.fromEntries((equipmentList as any[]).map((eq: any) => [eq.id, eq.name]));

  const createHoursMutation = trpc.machineHours.createHours.useMutation({
    onSuccess: () => {
      toast.success("Horas registradas!");
      utils.machineHours.listHours.invalidate();
      setIsOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createMaintMutation = trpc.machineHours.createMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Manutenção registrada!");
      utils.machineHours.listMaintenance.invalidate();
      setIsOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createFuelMutation = trpc.machineHours.createFuel.useMutation({
    onSuccess: () => {
      toast.success("Abastecimento registrado!");
      utils.machineHours.listFuel.invalidate();
      setIsOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const calcHours = (start: string, end: string): string => {
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (isNaN(s) || isNaN(e) || e <= s) return "";
    return (e - s).toFixed(1);
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (activeTab === "horas") {
      const worked = calcHours(hoursForm.startHourMeter, hoursForm.endHourMeter);
      if (!worked) return toast.error("Horímetro final deve ser maior que o inicial");
      createHoursMutation.mutate({
        equipmentId: parseInt(hoursForm.equipmentId),
        date: hoursForm.date,
        startHourMeter: hoursForm.startHourMeter,
        endHourMeter: hoursForm.endHourMeter,
        hoursWorked: worked,
        activity: hoursForm.activity || undefined,
        location: hoursForm.location || undefined,
        notes: hoursForm.notes || undefined,
      });
    } else if (activeTab === "manutencao") {
      createMaintMutation.mutate({
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
      });
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

  const isPending = createHoursMutation.isPending || createMaintMutation.isPending || createFuelMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Settings className="h-7 w-7" /> Controle de Máquinas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Horas trabalhadas, manutenções e abastecimentos</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Registro
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["horas", "manutencao", "abastecimento"] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "horas" && <Clock className="h-4 w-4 inline mr-1" />}
            {tab === "manutencao" && <Wrench className="h-4 w-4 inline mr-1" />}
            {tab === "abastecimento" && <Fuel className="h-4 w-4 inline mr-1" />}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "horas" && (
        <div className="space-y-3">
          {loadingHours ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : hours.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum registro de horas</p>
            </div>
          ) : hours.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{equipMap[h.equipmentId] || `Equipamento #${h.equipmentId}`}</p>
                    <p className="text-sm text-gray-500">{h.activity || "Atividade não informada"} · {h.location || ""}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(h.date).toLocaleDateString("pt-BR")} · Horímetro: {h.startHourMeter} → {h.endHourMeter}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-700">{h.hoursWorked}</p>
                    <p className="text-xs text-gray-400">horas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "manutencao" && (
        <div className="space-y-3">
          {loadingMaint ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : maintenance.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma manutenção registrada</p>
            </div>
          ) : maintenance.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{equipMap[m.equipmentId] || `Equipamento #${m.equipmentId}`}</p>
                      <Badge className="text-xs bg-orange-100 text-orange-800">{MAINTENANCE_TYPE_LABELS[m.type]}</Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800">{SERVICE_TYPE_LABELS[m.serviceType]}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{m.description || "Sem descrição"}</p>
                    <p className="text-xs text-gray-400">
                      {m.mechanicName || m.thirdPartyCompany || "Responsável não informado"} · {new Date(m.date).toLocaleDateString("pt-BR")}
                      {m.hourMeter && ` · Horímetro: ${m.hourMeter}`}
                    </p>
                  </div>
                  {m.totalCost && (
                    <div className="text-right">
                      <p className="font-bold text-gray-700">R$ {m.totalCost}</p>
                      <p className="text-xs text-gray-400">custo total</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "abastecimento" && (
        <div className="space-y-3">
          {loadingFuel ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : fuel.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum abastecimento registrado</p>
            </div>
          ) : fuel.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{equipMap[f.equipmentId] || `Equipamento #${f.equipmentId}`}</p>
                    <p className="text-sm text-gray-500">{f.fuelType} · {f.supplier || "Fornecedor não informado"}</p>
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

      {/* Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">Novo Registro — {TAB_LABELS[activeTab]}</SheetTitle>
          </SheetHeader>

          {/* Sub-tabs dentro do Sheet */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            {(["horas", "manutencao", "abastecimento"] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            {/* Equipamento (comum a todos) */}
            <div>
              <Label>Equipamento *</Label>
              <select
                value={activeTab === "horas" ? hoursForm.equipmentId : activeTab === "manutencao" ? maintForm.equipmentId : fuelForm.equipmentId}
                onChange={e => {
                  const v = e.target.value;
                  if (activeTab === "horas") setHoursForm(f => ({ ...f, equipmentId: v }));
                  else if (activeTab === "manutencao") setMaintForm(f => ({ ...f, equipmentId: v }));
                  else setFuelForm(f => ({ ...f, equipmentId: v }));
                }}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o equipamento</option>
                {equipmentList.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>{eq.name} {eq.brand ? `(${eq.brand})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={activeTab === "horas" ? hoursForm.date : activeTab === "manutencao" ? maintForm.date : fuelForm.date}
                onChange={e => {
                  const v = e.target.value;
                  if (activeTab === "horas") setHoursForm(f => ({ ...f, date: v }));
                  else if (activeTab === "manutencao") setMaintForm(f => ({ ...f, date: v }));
                  else setFuelForm(f => ({ ...f, date: v }));
                }}
                required
              />
            </div>

            {/* Campos específicos por aba */}
            {activeTab === "horas" && (
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
              </>
            )}

            {activeTab === "manutencao" && (
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
                </div>
              </>
            )}

            {activeTab === "abastecimento" && (
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
              </>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
