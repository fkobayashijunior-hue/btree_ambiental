import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Fuel, Route, DollarSign, Trash2, Edit, TrendingUp, Calculator } from "lucide-react";
import { toast } from "sonner";

export default function FreightPage() {

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(getEmptyForm());

  const { data: freights = [], refetch } = trpc.freight.list.useQuery();
  const { data: summary } = trpc.freight.summary.useQuery();
  const createMut = trpc.freight.create.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Frete registrado!"); } });
  const updateMut = trpc.freight.update.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Frete atualizado!"); } });
  const deleteMut = trpc.freight.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Frete removido!"); } });

  function getEmptyForm() {
    return {
      date: new Date().toISOString().slice(0, 10),
      vehiclePlate: "", driverName: "", driverType: "proprio" as const,
      origin: "", destination: "", distanceKm: "",
      fuelLiters: "", fuelCostPerLiter: "", fuelTotalCost: "",
      driverCost: "", tollCost: "", maintenanceCost: "",
      otherCosts: "", otherCostsDescription: "",
      totalCost: "", costPerKm: "", costPerTon: "",
      weightTon: "", revenuePerTon: "", totalRevenue: "", profit: "", notes: ""
    };
  }

  function resetForm() { setForm(getEmptyForm()); setEditId(null); }

  function openEdit(f: any) {
    setForm({
      date: f.date || "", vehiclePlate: f.vehiclePlate || f.vehicle_plate || "",
      driverName: f.driverName || f.driver_name || "", driverType: f.driverType || f.driver_type || "proprio",
      origin: f.origin || "", destination: f.destination || "",
      distanceKm: f.distanceKm || f.distance_km || "",
      fuelLiters: f.fuelLiters || f.fuel_liters || "",
      fuelCostPerLiter: f.fuelCostPerLiter || f.fuel_cost_per_liter || "",
      fuelTotalCost: f.fuelTotalCost || f.fuel_total_cost || "",
      driverCost: f.driverCost || f.driver_cost || "",
      tollCost: f.tollCost || f.toll_cost || "",
      maintenanceCost: f.maintenanceCost || f.maintenance_cost || "",
      otherCosts: f.otherCosts || f.other_costs || "",
      otherCostsDescription: f.otherCostsDescription || f.other_costs_description || "",
      totalCost: f.totalCost || f.total_cost || "",
      costPerKm: f.costPerKm || f.cost_per_km || "",
      costPerTon: f.costPerTon || f.cost_per_ton || "",
      weightTon: f.weightTon || f.weight_ton || "",
      revenuePerTon: f.revenuePerTon || f.revenue_per_ton || "",
      totalRevenue: f.totalRevenue || f.total_revenue || "",
      profit: f.profit || "", notes: f.notes || ""
    });
    setEditId(f.id);
    setFormOpen(true);
  }

  function calcTotals() {
    const fuelLiters = parseFloat(form.fuelLiters) || 0;
    const fuelCostPerLiter = parseFloat(form.fuelCostPerLiter) || 0;
    const fuelTotal = fuelLiters * fuelCostPerLiter;
    const driverCost = parseFloat(form.driverCost) || 0;
    const tollCost = parseFloat(form.tollCost) || 0;
    const maintenanceCost = parseFloat(form.maintenanceCost) || 0;
    const otherCosts = parseFloat(form.otherCosts) || 0;
    const totalCost = fuelTotal + driverCost + tollCost + maintenanceCost + otherCosts;
    const distanceKm = parseFloat(form.distanceKm) || 0;
    const weightTon = parseFloat(form.weightTon) || 0;
    const revenuePerTon = parseFloat(form.revenuePerTon) || 0;
    const totalRevenue = weightTon * revenuePerTon;
    const profit = totalRevenue - totalCost;
    const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;
    const costPerTon = weightTon > 0 ? totalCost / weightTon : 0;

    setForm(f => ({
      ...f,
      fuelTotalCost: fuelTotal.toFixed(2),
      totalCost: totalCost.toFixed(2),
      costPerKm: costPerKm.toFixed(2),
      costPerTon: costPerTon.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      profit: profit.toFixed(2),
    }));
  }

  function handleSave() {
    if (!form.date) { toast.error("Data é obrigatória"); return; }
    if (editId) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-600" /> Cálculo de Fretes
          </h1>
          <p className="text-sm text-gray-500">Custos detalhados de transporte</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Total Viagens</p>
              <p className="text-xl font-bold text-gray-800">{Number(summary.totalTrips) || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Custo Total</p>
              <p className="text-xl font-bold text-red-600">R$ {Number(summary.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Receita Total</p>
              <p className="text-xl font-bold text-green-600">R$ {Number(summary.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Lucro</p>
              <p className={`text-xl font-bold ${Number(summary.totalProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                R$ {Number(summary.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {(freights as any[]).map((f: any) => (
          <Card key={f.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{f.date}</span>
                    <Badge variant={f.driver_type === 'terceirizado' ? 'secondary' : 'default'}>
                      {f.driver_type === 'terceirizado' ? 'Terceirizado' : 'Próprio'}
                    </Badge>
                    {f.vehicle_plate && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{f.vehicle_plate}</span>}
                  </div>
                  {f.driver_name && <p className="text-sm text-gray-600">{f.driver_name}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {f.origin && f.destination && <span className="flex items-center gap-1"><Route className="h-3 w-3" />{f.origin} → {f.destination}</span>}
                    {f.distance_km && <span className="flex items-center gap-1"><Route className="h-3 w-3" />{f.distance_km} km</span>}
                    {f.fuel_liters && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{f.fuel_liters} L</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mt-1">
                    {f.total_cost && <span className="text-red-600 font-medium">Custo: R$ {f.total_cost}</span>}
                    {f.total_revenue && <span className="text-green-600 font-medium">Receita: R$ {f.total_revenue}</span>}
                    {f.profit && <span className={`font-bold ${parseFloat(f.profit) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Lucro: R$ {f.profit}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(f)}>
                    <Edit className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteMut.mutate({ id: f.id })}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(freights as any[]).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum frete registrado</p>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editId ? "Editar Frete" : "Novo Cálculo de Frete"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Placa</label>
                <Input value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Motorista</label>
                <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={form.driverType} onValueChange={v => setForm(f => ({ ...f, driverType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprio">Próprio</SelectItem>
                    <SelectItem value="terceirizado">Terceirizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rota */}
            <div className="bg-blue-50 p-3 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-blue-700 flex items-center gap-1"><Route className="h-4 w-4" /> Rota</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Origem</label>
                  <Input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Destino</label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Distância (km)</label>
                  <Input type="number" step="0.1" value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Peso (ton)</label>
                  <Input type="number" step="0.01" value={form.weightTon} onChange={e => setForm(f => ({ ...f, weightTon: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Custos */}
            <div className="bg-red-50 p-3 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-1"><DollarSign className="h-4 w-4" /> Custos</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Litros</label>
                  <Input type="number" step="0.1" value={form.fuelLiters} onChange={e => setForm(f => ({ ...f, fuelLiters: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">R$/Litro</label>
                  <Input type="number" step="0.01" value={form.fuelCostPerLiter} onChange={e => setForm(f => ({ ...f, fuelCostPerLiter: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Comb.</label>
                  <Input type="number" step="0.01" value={form.fuelTotalCost} readOnly className="bg-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Motorista (R$)</label>
                  <Input type="number" step="0.01" value={form.driverCost} onChange={e => setForm(f => ({ ...f, driverCost: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Pedágio (R$)</label>
                  <Input type="number" step="0.01" value={form.tollCost} onChange={e => setForm(f => ({ ...f, tollCost: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Manutenção (R$)</label>
                  <Input type="number" step="0.01" value={form.maintenanceCost} onChange={e => setForm(f => ({ ...f, maintenanceCost: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Outros (R$)</label>
                  <Input type="number" step="0.01" value={form.otherCosts} onChange={e => setForm(f => ({ ...f, otherCosts: e.target.value }))} />
                </div>
              </div>
              {form.otherCosts && (
                <div>
                  <label className="text-sm font-medium">Descrição outros custos</label>
                  <Input value={form.otherCostsDescription} onChange={e => setForm(f => ({ ...f, otherCostsDescription: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Receita */}
            <div className="bg-green-50 p-3 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-700 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Receita</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Receita/ton (R$)</label>
                  <Input type="number" step="0.01" value={form.revenuePerTon} onChange={e => setForm(f => ({ ...f, revenuePerTon: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Receita Total</label>
                  <Input type="number" step="0.01" value={form.totalRevenue} readOnly className="bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Calcular */}
            <Button variant="outline" onClick={calcTotals} className="w-full border-blue-300 text-blue-700">
              <Calculator className="h-4 w-4 mr-2" /> Calcular Totais
            </Button>

            {/* Resultados */}
            {form.totalCost && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between"><span>Custo Total:</span><span className="font-bold text-red-600">R$ {form.totalCost}</span></div>
                {form.costPerKm && <div className="flex justify-between"><span>Custo/km:</span><span>R$ {form.costPerKm}</span></div>}
                {form.costPerTon && <div className="flex justify-between"><span>Custo/ton:</span><span>R$ {form.costPerTon}</span></div>}
                {form.totalRevenue && <div className="flex justify-between"><span>Receita Total:</span><span className="font-bold text-green-600">R$ {form.totalRevenue}</span></div>}
                {form.profit && <div className="flex justify-between"><span>Lucro:</span><span className={`font-bold ${parseFloat(form.profit) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>R$ {form.profit}</span></div>}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending || updateMut.isPending}>
              {editId ? "Salvar Alterações" : "Registrar Frete"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
