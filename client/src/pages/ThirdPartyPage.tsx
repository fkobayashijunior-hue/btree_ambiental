import { useState, useEffect, useMemo } from "react";
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
import { Truck, Fuel, DollarSign, Plus, Pencil, Trash2, MapPin, CheckCircle, Clock, AlertTriangle, Package, FileText, Filter, User } from "lucide-react";
import { toast } from "sonner";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined) =>
  v == null ? "—" : `R$ ${parseFloat(String(v)).toFixed(2).replace(".", ",")}`;

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

// ─── ABA FRETES ──────────────────────────────────────────────────────────────
function FreightsTab() {
  const utils = trpc.useUtils();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [payDialog, setPayDialog] = useState<{
    id: number; truckName: string; grossFreight: number; fuelCost: number; netFreight: number; hasRate: boolean;
  } | null>(null);
  const [payNotes, setPayNotes] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  const { data: freights = [], isLoading } = trpc.thirdParty.listFreights.useQuery({
    startDate: dateFrom,
    endDate: dateTo,
  });

  const markPaid = trpc.thirdParty.markFreightPaid.useMutation({
    onSuccess: () => {
      utils.thirdParty.listFreights.invalidate();
      toast.success("Frete marcado como pago e lançado no financeiro!");
      setPayDialog(null);
      setPayNotes("");
    },
    onError: () => toast.error("Erro ao registrar pagamento."),
  });

  const list = freights as any[];
  const totalBruto = list.reduce((s, f) => s + (f.grossFreight || 0), 0);
  const totalComb = list.reduce((s, f) => s + (f.fuelCost || 0), 0);
  const totalLiq = list.reduce((s, f) => s + (f.netFreight || 0), 0);
  const pendentes = list.filter(f => !f.thirdPartyPaid);
  const pagos = list.filter(f => f.thirdPartyPaid);

  return (
    <div className="space-y-4">
      {/* Filtros de data */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <p className="text-xs text-orange-600 font-medium">Frete Bruto</p>
            <p className="text-lg font-bold text-orange-700">R$ {totalBruto.toFixed(2).replace('.', ',')}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <p className="text-xs text-red-600 font-medium">Combustível</p>
            <p className="text-lg font-bold text-red-700">R$ {totalComb.toFixed(2).replace('.', ',')}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <p className="text-xs text-green-600 font-medium">Frete Líquido</p>
            <p className="text-lg font-bold text-green-700">R$ {totalLiq.toFixed(2).replace('.', ',')}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando fretes...</p>}

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-orange-700">
            <Clock className="h-4 w-4" /> Pendentes de pagamento ({pendentes.length})
          </h3>
          {pendentes.map((f: any) => (
            <Card key={f.id} className="border-orange-200">
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{f.truckName}</p>
                    {f.truckOwner && <p className="text-xs text-muted-foreground">Proprietário: {f.truckOwner}</p>}
                    <p className="text-xs text-muted-foreground">{fmtDate(f.date)} · {f.destination || "—"}</p>
                    <p className="text-xs text-muted-foreground">{f.weightTons?.toFixed(3)} ton</p>
                  </div>
                  <div className="text-right">
                    {f.hasRate ? (
                      <>
                        <p className="text-xs text-muted-foreground">R$ {f.ratePerTon}/ton · {f.matchedRateWorksite} → {f.matchedRateDestination}</p>
                        <p className="text-sm">Bruto: <span className="font-semibold">R$ {f.grossFreight?.toFixed(2).replace('.', ',')}</span></p>
                        <p className="text-xs text-red-500">Comb: -R$ {f.fuelCost?.toFixed(2).replace('.', ',')}</p>
                        <p className="text-sm font-bold text-green-700">Líq: R$ {f.netFreight?.toFixed(2).replace('.', ',')}</p>
                      </>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs text-amber-600 flex items-center gap-1 justify-end">
                          <AlertTriangle className="h-3 w-3" /> Sem tarifa automática
                        </span>
                        <p className="text-xs text-muted-foreground">Use valor manual ao pagar</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                    size="sm"
                    className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => { setManualAmount(""); setPayNotes(""); setPayDialog({ id: f.id, truckName: f.truckName, grossFreight: f.grossFreight || 0, fuelCost: f.fuelCost || 0, netFreight: f.netFreight || 0, hasRate: f.hasRate }); }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Pago
                  </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagos */}
      {pagos.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" /> Pagos ({pagos.length})
          </h3>
          {pagos.map((f: any) => (
            <Card key={f.id} className="border-green-200 bg-green-50/30">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{f.truckName}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(f.date)} · {f.destination || "—"}</p>
                    <p className="text-xs text-muted-foreground">{f.weightTons?.toFixed(3)} ton</p>
                    {f.thirdPartyPaymentNotes && <p className="text-xs text-muted-foreground italic">{f.thirdPartyPaymentNotes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">R$ {f.netFreight?.toFixed(2).replace('.', ',')}</p>
                    <Badge variant="outline" className="text-green-700 border-green-300 text-xs">Pago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {list.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma carga de terceirizado no período.</p>
          <p className="text-xs mt-1">Certifique-se de que os caminhões estão marcados como terceirizados e que há tarifas cadastradas.</p>
        </div>
      )}

      {/* Dialog de pagamento */}
      <Dialog open={!!payDialog} onOpenChange={o => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento de Frete</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <p className="text-sm">Caminhão: <span className="font-semibold">{payDialog.truckName}</span></p>
              {payDialog.hasRate ? (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete Bruto:</span>
                    <span className="font-medium">R$ {payDialog.grossFreight.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Combustível:</span>
                    <span className="text-red-600">-R$ {payDialog.fuelCost.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span>Frete Líquido:</span>
                    <span className="text-green-700">R$ {payDialog.netFreight.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="text-amber-700 text-xs mb-2">Sem tarifa automática para este destino. Informe o valor manualmente:</p>
                  <div>
                    <Label>Valor do Frete (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualAmount}
                      onChange={e => setManualAmount(e.target.value)}
                      placeholder="Ex: 1500.00"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Ex: Pago via PIX para João..."
                  rows={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">O valor será lançado automaticamente como despesa no financeiro.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={markPaid.isPending || (!payDialog?.hasRate && !manualAmount)}
              onClick={() => {
                if (!payDialog) return;
                if (!payDialog.hasRate && !manualAmount) {
                  toast.error("Informe o valor do frete.");
                  return;
                }
                markPaid.mutate({
                  cargoLoadId: payDialog.id,
                  notes: payNotes || undefined,
                  grossAmount: payDialog.grossFreight.toFixed(2),
                  fuelCost: payDialog.fuelCost.toFixed(2),
                  netAmount: payDialog.netFreight.toFixed(2),
                  truckName: payDialog.truckName,
                  manualAmount: manualAmount || undefined,
                });
              }}
            >
              {markPaid.isPending ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
    worksiteCustom?: boolean; destinationCustom?: boolean;
  } | null>(null);

  // Extrair locais e destinos únicos já cadastrados
  const existingWorksites = useMemo(() => {
    const set = new Set<string>();
    (rates as any[]).forEach(r => { if (r.worksite) set.add(r.worksite); });
    return Array.from(set).sort();
  }, [rates]);

  const existingDestinations = useMemo(() => {
    const set = new Set<string>();
    (rates as any[]).forEach(r => { if (r.destination) set.add(r.destination); });
    return Array.from(set).sort();
  }, [rates]);

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
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm text-muted-foreground">
          Configure o valor (R$/ton) por combinação de local de trabalho e destino.
        </p>
        <Button
          size="sm"
          className="shrink-0"
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
            {/* Layout mobile: cards ao invés de tabela */}
            <div className="block sm:hidden">
              {(items as any[]).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.destination}</p>
                    <p className="text-green-700 font-semibold text-sm">{fmt(r.ratePerTon)}</p>
                    {r.notes && <p className="text-muted-foreground text-xs truncate">{r.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setForm({ id: r.id, worksite: r.worksite, destination: r.destination, ratePerTon: r.ratePerTon, notes: r.notes ?? "" })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500"
                      onClick={() => deleteRate.mutate({ id: r.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Layout desktop: tabela */}
            <div className="hidden sm:block">
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
                            onClick={() => setForm({ id: r.id, worksite: r.worksite, destination: r.destination, ratePerTon: r.ratePerTon, notes: r.notes ?? "" })}
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
            </div>
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
              {existingWorksites.length > 0 && !form?.worksiteCustom ? (
                <div className="space-y-1">
                  <Select
                    value={form?.worksite ?? ""}
                    onValueChange={(v) => {
                      if (v === "__novo__") {
                        setForm((p) => p ? { ...p, worksite: "", worksiteCustom: true } : null);
                      } else {
                        setForm((p) => p ? { ...p, worksite: v, worksiteCustom: false } : null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou crie novo" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingWorksites.map(w => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                      <SelectItem value="__novo__">+ Novo local...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={form?.worksite ?? ""}
                    onChange={(e) => setForm((p) => p ? { ...p, worksite: e.target.value } : null)}
                    placeholder="Ex: SIMFLOR, Fazenda GW"
                    className="flex-1"
                  />
                  {existingWorksites.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm((p) => p ? { ...p, worksiteCustom: false } : null)}>
                      Lista
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Destino</Label>
              {existingDestinations.length > 0 && !form?.destinationCustom ? (
                <div className="space-y-1">
                  <Select
                    value={form?.destination ?? ""}
                    onValueChange={(v) => {
                      if (v === "__novo__") {
                        setForm((p) => p ? { ...p, destination: "", destinationCustom: true } : null);
                      } else {
                        setForm((p) => p ? { ...p, destination: v, destinationCustom: false } : null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou crie novo" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingDestinations.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="__novo__">+ Novo destino...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={form?.destination ?? ""}
                    onChange={(e) => setForm((p) => p ? { ...p, destination: e.target.value } : null)}
                    placeholder="Ex: Líder Lobato, Sonoco Lda."
                    className="flex-1"
                  />
                  {existingDestinations.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm((p) => p ? { ...p, destinationCustom: false } : null)}>
                      Lista
                    </Button>
                  )}
                </div>
              )}
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
  // ── Filtros ──────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  const { data: fuelList = [], isLoading } = trpc.thirdParty.listFuel.useQuery({
    startDate: dateFrom,
    endDate: dateTo,
  });
  const { data: trucks = [] } = trpc.thirdParty.listThirdPartyTrucks.useQuery();
  const { data: freights = [] } = trpc.thirdParty.listFreights.useQuery({
    startDate: dateFrom,
    endDate: dateTo,
  });

  // Lista de proprietários únicos
  const owners = useMemo(() => {
    const set = new Set<string>();
    (trucks as any[]).forEach(t => { if (t.thirdPartyOwner) set.add(t.thirdPartyOwner); });
    return Array.from(set).sort();
  }, [trucks]);

  // Filtrar abastecimentos pelo proprietário selecionado
  const filteredFuel = useMemo(() => {
    if (ownerFilter === "all") return fuelList as any[];
    return (fuelList as any[]).filter(f => f.ownerName === ownerFilter);
  }, [fuelList, ownerFilter]);

  // Filtrar cargas pelo proprietário selecionado
  const filteredFreights = useMemo(() => {
    if (ownerFilter === "all") return freights as any[];
    return (freights as any[]).filter(f => f.truckOwner === ownerFilter);
  }, [freights, ownerFilter]);

  const totalGasto = filteredFuel.reduce((acc, f) => acc + parseFloat(f.total || "0"), 0);
  const totalLitros = filteredFuel.reduce((acc, f) => acc + parseFloat(f.liters || "0"), 0);

  // ── Gerador de PDF ───────────────────────────────────────────────────────
  const generatePDF = () => {
    const owner = ownerFilter === "all" ? "Todos os Proprietários" : ownerFilter;
    const periodStr = `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}`;
    const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const totalBruto = filteredFreights.reduce((acc, c) => acc + (c.grossFreight || 0), 0);
    const totalCombustivel = filteredFreights.reduce((acc, c) => acc + (c.fuelCost || 0), 0);
    const totalLiquido = filteredFreights.reduce((acc, c) => acc + (c.netFreight || 0), 0);
    const totalTons = filteredFreights.reduce((acc, c) => acc + (c.weightTons || 0), 0);

    const cargosRows = filteredFreights.map(c => `
      <tr>
        <td>${fmtDate(c.date)}</td>
        <td>${c.truckName || '—'}</td>
        <td>${c.destination || '—'}</td>
        <td style="text-align:right">${c.weightTons?.toFixed(3) ?? '—'} t</td>
        <td style="text-align:right">${c.ratePerTon ? fmtCurrency(c.ratePerTon) + '/t' : '—'}</td>
        <td style="text-align:right">${fmtCurrency(c.grossFreight || 0)}</td>
        <td style="text-align:right; color:#dc2626">${fmtCurrency(c.fuelCost || 0)}</td>
        <td style="text-align:right; font-weight:bold; color:#166534">${fmtCurrency(c.netFreight || 0)}</td>
      </tr>`).join('');

    const fuelRows = filteredFuel.map(f => `
      <tr>
        <td>${fmtDate(f.date)}</td>
        <td>${f.equipmentName || '—'}</td>
        <td>${f.location || '—'}</td>
        <td style="text-align:right">${parseFloat(f.liters || '0').toFixed(1)} L</td>
        <td style="text-align:right">${f.pricePerLiter ? fmtCurrency(parseFloat(f.pricePerLiter)) + '/L' : '—'}</td>
        <td style="text-align:right; font-weight:bold; color:#ea580c">${fmtCurrency(parseFloat(f.total || '0'))}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Relatório Terceirizado — ${owner}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #166534; padding-bottom: 12px; margin-bottom: 20px; }
      .logo-area h1 { font-size: 22px; color: #166534; font-weight: 900; letter-spacing: 1px; }
      .logo-area p { font-size: 10px; color: #555; margin-top: 2px; }
      .report-info { text-align: right; }
      .report-info h2 { font-size: 14px; color: #333; }
      .report-info p { font-size: 10px; color: #666; margin-top: 2px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; }
      .summary-card.red { background: #fff7ed; border-color: #fed7aa; }
      .summary-card.blue { background: #eff6ff; border-color: #bfdbfe; }
      .summary-card.dark { background: #166534; border-color: #166534; color: white; }
      .summary-card label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
      .summary-card .value { font-size: 15px; font-weight: bold; margin-top: 2px; }
      .section-title { font-size: 13px; font-weight: bold; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px; margin-bottom: 10px; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #166534; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
      tr:nth-child(even) td { background: #f9fafb; }
      .total-row td { font-weight: bold; background: #f0fdf4 !important; border-top: 2px solid #166534; }
      .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
      @media print { body { padding: 12px; } }
    </style></head><body>
    <div class="header">
      <div class="logo-area">
        <h1>🌿 BTREE AMBIENTAL</h1>
        <p>Biomassa · Tratamento · Reflorestamento · Estrutura · Eucalipto</p>
        <p>Astorga, Paraná — btreeambiental.com</p>
      </div>
      <div class="report-info">
        <h2>Relatório de Terceirizado</h2>
        <p><strong>Proprietário:</strong> ${owner}</p>
        <p><strong>Período:</strong> ${periodStr}</p>
        <p><strong>Emitido em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <label>Total de Cargas</label>
        <div class="value">${filteredFreights.length}</div>
      </div>
      <div class="summary-card blue">
        <label>Peso Total</label>
        <div class="value">${totalTons.toFixed(3)} t</div>
      </div>
      <div class="summary-card">
        <label>Frete Bruto</label>
        <div class="value">${fmtCurrency(totalBruto)}</div>
      </div>
      <div class="summary-card red">
        <label>Combustível (abate)</label>
        <div class="value">${fmtCurrency(totalCombustivel)}</div>
      </div>
      <div class="summary-card dark">
        <label>Frete Líquido a Pagar</label>
        <div class="value">${fmtCurrency(totalLiquido)}</div>
      </div>
      <div class="summary-card red">
        <label>Total Combustível</label>
        <div class="value">${fmtCurrency(totalGasto)}</div>
      </div>
      <div class="summary-card blue">
        <label>Total Litros</label>
        <div class="value">${totalLitros.toFixed(1)} L</div>
      </div>
    </div>

    <div class="section-title">📦 Cargas do Período</div>
    <table>
      <thead><tr>
        <th>Data</th><th>Caminhão</th><th>Destino</th><th>Peso</th><th>Tarifa</th><th>Frete Bruto</th><th>Combustível</th><th>Frete Líquido</th>
      </tr></thead>
      <tbody>
        ${cargosRows || '<tr><td colspan="8" style="text-align:center;padding:12px;color:#9ca3af">Nenhuma carga no período</td></tr>'}
        <tr class="total-row">
          <td colspan="3">TOTAL</td>
          <td style="text-align:right">${totalTons.toFixed(3)} t</td>
          <td></td>
          <td style="text-align:right">${fmtCurrency(totalBruto)}</td>
          <td style="text-align:right; color:#dc2626">${fmtCurrency(totalCombustivel)}</td>
          <td style="text-align:right; color:#166534">${fmtCurrency(totalLiquido)}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">⛽ Abastecimentos do Período</div>
    <table>
      <thead><tr>
        <th>Data</th><th>Caminhão</th><th>Local / Posto</th><th>Litros</th><th>Preço/L</th><th>Total</th>
      </tr></thead>
      <tbody>
        ${fuelRows || '<tr><td colspan="6" style="text-align:center;padding:12px;color:#9ca3af">Nenhum abastecimento no período</td></tr>'}
        <tr class="total-row">
          <td colspan="3">TOTAL</td>
          <td style="text-align:right">${totalLitros.toFixed(1)} L</td>
          <td></td>
          <td style="text-align:right; color:#ea580c">${fmtCurrency(totalGasto)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>BTREE Ambiental — Sistema de Gestão Interno</span>
      <span>Documento gerado automaticamente — ${new Date().toLocaleString('pt-BR')}</span>
    </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Permita pop-ups para gerar o PDF'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">De</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Até</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Proprietário</label>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-48">
              <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os proprietários</SelectItem>
              {owners.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-green-700 text-green-700 hover:bg-green-50"
          onClick={generatePDF}
        >
          <FileText className="h-4 w-4" />
          Gerar Relatório PDF
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <p className="text-xs text-orange-700 font-medium">Total Combustível</p>
            <p className="text-lg font-bold text-orange-600">{fmt(totalGasto)}</p>
            <p className="text-xs text-muted-foreground">{totalLitros.toFixed(1)} litros</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs text-blue-700 font-medium">Abastecimentos</p>
            <p className="text-lg font-bold text-blue-600">{filteredFuel.length}</p>
            <p className="text-xs text-muted-foreground">registros no período</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <p className="text-xs text-green-700 font-medium">Cargas no Período</p>
            <p className="text-lg font-bold text-green-600">{filteredFreights.length}</p>
            <p className="text-xs text-muted-foreground">
              {filteredFreights.reduce((a, c) => a + (c.weightTons || 0), 0).toFixed(1)} t
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {filteredFuel.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-8">Nenhum abastecimento no período selecionado.</p>
      )}

      <div className="grid gap-3">
        {filteredFuel.map((f) => (
          <Card key={`${f.fromVehicleRecords ? 'vr' : 'tp'}-${f.id}`}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{f.equipmentName ?? `Equip. #${f.equipmentId}`}</p>
                  {f.ownerName && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <User className="h-3 w-3" />{f.ownerName}
                    </span>
                  )}
                  {f.fromVehicleRecords ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Controle</span>
                  ) : (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Manual</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {f.date ? new Date(f.date).toLocaleDateString("pt-BR") : "—"}
                  {f.location ? ` · ${f.location}` : ""}
                </p>
                <div className="flex gap-3 text-sm">
                  <span>{parseFloat(f.liters || '0').toFixed(1)}L</span>
                  {f.pricePerLiter && <span className="text-muted-foreground">@ {fmt(f.pricePerLiter)}/L</span>}
                  <span className="font-semibold text-orange-600">{fmt(f.total)}</span>
                </div>
                {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

      <Tabs defaultValue="freights">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="freights" className="flex flex-col items-center gap-0.5 py-2 text-xs">
            <Package className="h-4 w-4 shrink-0" />
            <span>Fretes</span>
          </TabsTrigger>
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

        <TabsContent value="freights" className="mt-4">
          <FreightsTab />
        </TabsContent>
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
