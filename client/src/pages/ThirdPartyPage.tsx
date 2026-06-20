import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Fuel, DollarSign, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined) =>
  v == null ? "—" : `R$ ${parseFloat(String(v)).toFixed(2).replace(".", ",")}`;

// ─── CAMINHÕES TERCEIRIZADOS ──────────────────────────────────────────────────
function TrucksTab() {
  const utils = trpc.useUtils();
  // Listar TODOS os equipamentos categoria caminhão
  const { data: allEquip = [], isLoading } = trpc.sectors.listEquipment.useQuery({});

  // Filtrar caminhões: typeName contém "Caminhão" OU tipo de equipamento é caminhão
  const trucks = (allEquip as any[]).filter(
    (e: any) =>
      (e.typeName && e.typeName.toLowerCase().includes("caminhão")) ||
      (e.typeName && e.typeName.toLowerCase().includes("caminhao")) ||
      (e.category && e.category.toLowerCase().includes("caminhao"))
  );

  const setThirdParty = trpc.thirdParty.setThirdParty.useMutation({
    onSuccess: () => {
      utils.thirdParty.listThirdPartyTrucks.invalidate();
      utils.sectors.listEquipment.invalidate();
      toast.success("Configuração atualizada!");
    },
  });

  const [editOwner, setEditOwner] = useState<{ id: number; name: string; owner: string } | null>(null);

  const handleToggle = (truck: any, checked: boolean) => {
    if (checked) {
      setEditOwner({ id: truck.id, name: truck.name, owner: truck.thirdPartyOwner ?? "" });
    } else {
      setThirdParty.mutate({ id: truck.id, isThirdParty: false, thirdPartyOwner: undefined });
    }
  };

  const handleSaveOwner = () => {
    if (!editOwner) return;
    setThirdParty.mutate({
      id: editOwner.id,
      isThirdParty: true,
      thirdPartyOwner: editOwner.owner,
    });
    setEditOwner(null);
  };

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Marque os caminhões que pertencem a terceiros. O nome do proprietário será exibido nos relatórios de frete.
      </p>

      {trucks.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Nenhum caminhão cadastrado.</p>
      )}

      <div className="grid gap-3">
        {trucks.map((truck: any) => (
          <Card key={truck.id} className={truck.isThirdParty ? "border-orange-400" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{truck.name}</p>
                <p className="text-sm text-muted-foreground">
                  {truck.brand} {truck.model} {truck.licensePlate ? `· ${truck.licensePlate}` : ""}
                </p>
                {truck.isThirdParty && truck.thirdPartyOwner && (
                  <Badge variant="outline" className="mt-1 text-orange-600 border-orange-400">
                    Proprietário: {truck.thirdPartyOwner}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {truck.isThirdParty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEditOwner({ id: truck.id, name: truck.name, owner: truck.thirdPartyOwner ?? "" })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Terceirizado</span>
                  <Switch
                    checked={!!truck.isThirdParty}
                    onCheckedChange={(c) => handleToggle(truck, c)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para informar proprietário */}
      <Dialog open={!!editOwner} onOpenChange={(o) => !o && setEditOwner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proprietário — {editOwner?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Nome do proprietário</Label>
            <Input
              value={editOwner?.owner ?? ""}
              onChange={(e) =>
                setEditOwner((prev) => prev ? { ...prev, owner: e.target.value } : null)
              }
              placeholder="Ex: Daniel Silva"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOwner(null)}>Cancelar</Button>
            <Button onClick={handleSaveOwner}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TARIFAS DE FRETE ─────────────────────────────────────────────────────────
function RatesTab() {
  const utils = trpc.useUtils();
  const { data: rates = [], isLoading } = trpc.thirdParty.listRates.useQuery();

  const createRate = trpc.thirdParty.createRate.useMutation({
    onSuccess: () => { utils.thirdParty.listRates.invalidate(); toast.success("Tarifa criada!"); setForm(null); },
  });
  const updateRate = trpc.thirdParty.updateRate.useMutation({
    onSuccess: () => { utils.thirdParty.listRates.invalidate(); toast.success("Tarifa atualizada!"); setForm(null); },
  });
  const deleteRate = trpc.thirdParty.deleteRate.useMutation({
    onSuccess: () => { utils.thirdParty.listRates.invalidate(); toast.success("Tarifa removida."); },
  });

  const [form, setForm] = useState<{
    id?: number; worksite: string; destination: string; ratePerTon: string; notes: string;
  } | null>(null);

  const handleSubmit = () => {
    if (!form) return;
    if (form.id) {
      updateRate.mutate({ id: form.id, worksite: form.worksite, destination: form.destination, ratePerTon: form.ratePerTon, notes: form.notes });
    } else {
      createRate.mutate({ worksite: form.worksite, destination: form.destination, ratePerTon: form.ratePerTon, notes: form.notes });
    }
  };

  // Agrupar por local de trabalho
  const grouped = (rates as any[]).reduce((acc: Record<string, any[]>, r) => {
    if (!acc[r.worksite]) acc[r.worksite] = [];
    acc[r.worksite].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configure o valor (R$/ton) por combinação de local de trabalho e destino.
        </p>
        <Button
          size="sm"
          onClick={() => setForm({ worksite: "", destination: "", ratePerTon: "", notes: "" })}
        >
          <Plus className="h-4 w-4 mr-1" /> Nova Tarifa
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {Object.entries(grouped).map(([worksite, items]) => (
        <Card key={worksite}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              {worksite}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead>R$/ton</TableHead>
                  <TableHead>Obs.</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items as any[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.destination}</TableCell>
                    <TableCell className="text-green-700 font-semibold">{fmt(r.ratePerTon)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.notes ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setForm({ id: r.id, worksite: r.worksite, destination: r.destination, ratePerTon: r.ratePerTon, notes: r.notes ?? "" })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => deleteRate.mutate({ id: r.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {rates.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-8">Nenhuma tarifa cadastrada.</p>
      )}

      {/* Dialog form */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar Tarifa" : "Nova Tarifa de Frete"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Local de Trabalho</Label>
              <Input
                value={form?.worksite ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, worksite: e.target.value } : null)}
                placeholder="Ex: SIMFLOR, Fazenda GW"
              />
            </div>
            <div>
              <Label>Destino</Label>
              <Input
                value={form?.destination ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, destination: e.target.value } : null)}
                placeholder="Ex: Líder Lobato, Sonoco Lda."
              />
            </div>
            <div>
              <Label>Valor (R$/ton)</Label>
              <Input
                type="number"
                step="0.01"
                value={form?.ratePerTon ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, ratePerTon: e.target.value } : null)}
                placeholder="Ex: 89.00"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form?.notes ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, notes: e.target.value } : null)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createRate.isPending || updateRate.isPending}>
              {form?.id ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ABASTECIMENTOS TERCEIRIZADOS ─────────────────────────────────────────────
function FuelTab() {
  const utils = trpc.useUtils();
  const { data: fuelList = [], isLoading } = trpc.thirdParty.listFuel.useQuery();
  const { data: trucks = [] } = trpc.thirdParty.listThirdPartyTrucks.useQuery();

  const createFuel = trpc.thirdParty.createFuel.useMutation({
    onSuccess: () => { utils.thirdParty.listFuel.invalidate(); toast.success("Abastecimento registrado!"); setForm(null); },
  });
  const updateFuel = trpc.thirdParty.updateFuel.useMutation({
    onSuccess: () => { utils.thirdParty.listFuel.invalidate(); toast.success("Atualizado!"); setForm(null); },
  });
  const deleteFuel = trpc.thirdParty.deleteFuel.useMutation({
    onSuccess: () => { utils.thirdParty.listFuel.invalidate(); toast.success("Removido."); },
  });

  const emptyForm = {
    id: undefined as number | undefined,
    equipmentId: "",
    date: new Date().toISOString().slice(0, 16),
    liters: "",
    pricePerLiter: "",
    total: "",
    location: "",
    notes: "",
  };
  const [form, setForm] = useState<typeof emptyForm | null>(null);

  // Calcular total automaticamente
  useEffect(() => {
    if (!form) return;
    const l = parseFloat(form.liters);
    const p = parseFloat(form.pricePerLiter);
    if (!isNaN(l) && !isNaN(p)) {
      setForm((prev) => prev ? { ...prev, total: (l * p).toFixed(2) } : null);
    }
  }, [form?.liters, form?.pricePerLiter]);

  const handleSubmit = () => {
    if (!form || !form.equipmentId) return;
    const payload = {
      equipmentId: parseInt(form.equipmentId),
      date: form.date,
      liters: form.liters,
      pricePerLiter: form.pricePerLiter,
      total: form.total,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };
    if (form.id) {
      updateFuel.mutate({ id: form.id, ...payload });
    } else {
      createFuel.mutate(payload);
    }
  };

  const totalGasto = (fuelList as any[]).reduce((acc, f) => acc + parseFloat(f.total || "0"), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Abastecimentos de caminhões terceirizados. O custo é lançado automaticamente no financeiro.
          </p>
          <p className="text-sm font-semibold text-orange-600 mt-1">
            Total gasto: {fmt(totalGasto)}
          </p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
          <Plus className="h-4 w-4 mr-1" /> Novo Abastecimento
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {(fuelList as any[]).length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-8">Nenhum abastecimento registrado.</p>
      )}

      <div className="grid gap-3">
        {(fuelList as any[]).map((f) => (
          <Card key={f.id}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <p className="font-semibold">{f.equipmentName ?? `Equip. #${f.equipmentId}`}</p>
                <p className="text-sm text-muted-foreground">
                  {f.date ? new Date(f.date).toLocaleDateString("pt-BR") : "—"}
                  {f.location ? ` · ${f.location}` : ""}
                </p>
                <div className="flex gap-3 text-sm">
                  <span>{f.liters}L</span>
                  <span className="text-muted-foreground">@ {fmt(f.pricePerLiter)}/L</span>
                  <span className="font-semibold text-orange-600">{fmt(f.total)}</span>
                </div>
                {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      id: f.id,
                      equipmentId: String(f.equipmentId),
                      date: f.date?.slice(0, 16) ?? "",
                      liters: f.liters,
                      pricePerLiter: f.pricePerLiter,
                      total: f.total,
                      location: f.location ?? "",
                      notes: f.notes ?? "",
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => deleteFuel.mutate({ id: f.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog form */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar Abastecimento" : "Novo Abastecimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Caminhão Terceirizado *</Label>
              <Select
                value={form?.equipmentId ?? ""}
                onValueChange={(v) => setForm((p) => p ? { ...p, equipmentId: v } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o caminhão" />
                </SelectTrigger>
                <SelectContent>
                  {(trucks as any[]).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.thirdPartyOwner ? `(${t.thirdPartyOwner})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data e Hora *</Label>
              <Input
                type="datetime-local"
                value={form?.date ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, date: e.target.value } : null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Litros *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form?.liters ?? ""}
                  onChange={(e) => setForm((p) => p ? { ...p, liters: e.target.value } : null)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Preço/Litro (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form?.pricePerLiter ?? ""}
                  onChange={(e) => setForm((p) => p ? { ...p, pricePerLiter: e.target.value } : null)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form?.total ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, total: e.target.value } : null)}
                placeholder="Calculado automaticamente"
              />
            </div>
            <div>
              <Label>Local / Posto</Label>
              <Input
                value={form?.location ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, location: e.target.value } : null)}
                placeholder="Ex: Posto Shell - Lobato"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form?.notes ?? ""}
                onChange={(e) => setForm((p) => p ? { ...p, notes: e.target.value } : null)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createFuel.isPending || updateFuel.isPending}>
              {form?.id ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ThirdPartyPage() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-100">
          <Truck className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Terceirizados</h1>
          <p className="text-muted-foreground text-sm">
            Caminhões terceirizados, tarifas de frete e abastecimentos
          </p>
        </div>
      </div>

      <Tabs defaultValue="trucks">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="trucks" className="flex flex-col items-center gap-0.5 py-2 text-xs">
            <Truck className="h-4 w-4 shrink-0" />
            <span>Caminhões</span>
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex flex-col items-center gap-0.5 py-2 text-xs">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>Tarifas</span>
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex flex-col items-center gap-0.5 py-2 text-xs">
            <Fuel className="h-4 w-4 shrink-0" />
            <span>Abastecimentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trucks" className="mt-4">
          <TrucksTab />
        </TabsContent>
        <TabsContent value="rates" className="mt-4">
          <RatesTab />
        </TabsContent>
        <TabsContent value="fuel" className="mt-4">
          <FuelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
