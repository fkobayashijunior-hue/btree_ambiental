import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Car, Plus, Fuel, Wrench, MapPin, Calendar } from "lucide-react";

type RecordType = "abastecimento" | "manutencao" | "km";

const RECORD_LABELS: Record<RecordType, string> = {
  abastecimento: "Abastecimento",
  manutencao: "Manutenção",
  km: "Quilometragem",
};

const RECORD_COLORS: Record<RecordType, string> = {
  abastecimento: "bg-blue-100 text-blue-800",
  manutencao: "bg-orange-100 text-orange-800",
  km: "bg-green-100 text-green-800",
};

export default function VehicleControlPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [form, setForm] = useState({
    equipmentId: "",
    date: new Date().toISOString().slice(0, 10),
    recordType: "abastecimento" as RecordType,
    fuelType: "diesel" as "diesel" | "gasolina" | "etanol" | "gnv",
    liters: "",
    fuelCost: "",
    pricePerLiter: "",
    supplier: "",
    odometer: "",
    kmDriven: "",
    maintenanceType: "",
    maintenanceCost: "",
    serviceType: "proprio" as "proprio" | "terceirizado",
    mechanicName: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: records = [], isLoading } = trpc.vehicleRecords.list.useQuery({
    equipmentId: filterEquipment ? parseInt(filterEquipment) : undefined,
  });

  const createMutation = trpc.vehicleRecords.create.useMutation({
    onSuccess: () => {
      toast.success("Registro salvo!");
      utils.vehicleRecords.list.invalidate();
      setIsOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      equipmentId: parseInt(form.equipmentId),
      date: form.date,
      recordType: form.recordType,
      fuelType: form.recordType === "abastecimento" ? form.fuelType : undefined,
      liters: form.recordType === "abastecimento" ? form.liters : undefined,
      fuelCost: form.fuelCost || undefined,
      pricePerLiter: form.pricePerLiter || undefined,
      supplier: form.supplier || undefined,
      odometer: form.odometer || undefined,
      kmDriven: form.kmDriven || undefined,
      maintenanceType: form.maintenanceType || undefined,
      maintenanceCost: form.maintenanceCost || undefined,
      serviceType: form.recordType === "manutencao" ? form.serviceType : undefined,
      mechanicName: form.mechanicName || undefined,
      notes: form.notes || undefined,
    });
  };

  // Vehicles only (filter by type)
  const vehicles = equipmentList.filter((eq: any) =>
    eq.name?.toLowerCase().includes("caminhão") ||
    eq.name?.toLowerCase().includes("caminhao") ||
    eq.name?.toLowerCase().includes("carro") ||
    eq.name?.toLowerCase().includes("pickup") ||
    eq.name?.toLowerCase().includes("van") ||
    true // show all for now
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Car className="h-7 w-7" /> Controle de Veículos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Abastecimentos, km e manutenções de veículos</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Registro
        </Button>
      </div>

      {/* Filter */}
      <div className="max-w-xs">
        <select
          value={filterEquipment}
          onChange={e => setFilterEquipment(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os veículos</option>
          {vehicles.map((eq: any) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro de veículo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">Veículo #{r.equipmentId}</span>
                      <Badge className={`text-xs ${RECORD_COLORS[r.recordType as RecordType]}`}>
                        {RECORD_LABELS[r.recordType as RecordType]}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      {r.odometer && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.odometer} km</span>}
                      {r.supplier && <span>{r.supplier}</span>}
                      {r.maintenanceType && <span>{r.maintenanceType}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.recordType === "abastecimento" && r.liters && (
                      <>
                        <p className="font-bold text-blue-700">{r.liters}L</p>
                        {r.fuelCost && <p className="text-xs text-gray-500">R$ {r.fuelCost}</p>}
                      </>
                    )}
                    {r.recordType === "km" && r.kmDriven && (
                      <p className="font-bold text-green-700">{r.kmDriven} km</p>
                    )}
                    {r.recordType === "manutencao" && r.maintenanceCost && (
                      <p className="font-bold text-orange-700">R$ {r.maintenanceCost}</p>
                    )}
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
            <SheetTitle className="text-emerald-800">Novo Registro de Veículo</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div>
              <Label>Veículo *</Label>
              <select value={form.equipmentId} onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))} required className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione o veículo</option>
                {vehicles.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div>
              <Label>Tipo de Registro *</Label>
              <select value={form.recordType} onChange={e => setForm(f => ({ ...f, recordType: e.target.value as RecordType }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="abastecimento">Abastecimento</option>
                <option value="km">Quilometragem</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>

            <div>
              <Label>Hodômetro (km)</Label>
              <Input value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))} placeholder="ex: 45230" />
            </div>

            {form.recordType === "abastecimento" && (
              <>
                <div>
                  <Label>Combustível *</Label>
                  <select value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="diesel">Diesel</option>
                    <option value="gasolina">Gasolina</option>
                    <option value="etanol">Etanol</option>
                    <option value="gnv">GNV</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Litros *</Label><Input value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="0,0" required /></div>
                  <div><Label>Preço/L</Label><Input value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,00" /></div>
                  <div><Label>Total R$</Label><Input value={form.fuelCost} onChange={e => setForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="0,00" /></div>
                </div>
                <div><Label>Posto/Fornecedor</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do posto" /></div>
              </>
            )}

            {form.recordType === "km" && (
              <div><Label>KM Percorridos</Label><Input value={form.kmDriven} onChange={e => setForm(f => ({ ...f, kmDriven: e.target.value }))} placeholder="ex: 120" /></div>
            )}

            {form.recordType === "manutencao" && (
              <>
                <div><Label>Tipo de Manutenção</Label><Input value={form.maintenanceType} onChange={e => setForm(f => ({ ...f, maintenanceType: e.target.value }))} placeholder="ex: Troca de óleo, Freios..." /></div>
                <div>
                  <Label>Serviço</Label>
                  <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="proprio">Próprio</option>
                    <option value="terceirizado">Terceirizado</option>
                  </select>
                </div>
                <div><Label>Mecânico/Oficina</Label><Input value={form.mechanicName} onChange={e => setForm(f => ({ ...f, mechanicName: e.target.value }))} placeholder="Nome" /></div>
                <div><Label>Custo (R$)</Label><Input value={form.maintenanceCost} onChange={e => setForm(f => ({ ...f, maintenanceCost: e.target.value }))} placeholder="0,00" /></div>
              </>
            )}

            <div>
              <Label>Observações</Label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
