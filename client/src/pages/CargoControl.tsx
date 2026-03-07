import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Truck, Plus, Search, Package, Calendar, User, MapPin, FileText, ChevronDown, ChevronUp } from "lucide-react";

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

export default function CargoControl() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [openSections, setOpenSections] = useState({ veiculo: true, carga: true, cliente: false });

  const utils = trpc.useUtils();

  const { data: loads = [], isLoading } = trpc.cargoLoads.list.useQuery({
    search: search || undefined,
  });

  const createMutation = trpc.cargoLoads.create.useMutation({
    onSuccess: () => {
      toast.success("Carga registrada com sucesso!");
      utils.cargoLoads.list.invalidate();
      setIsOpen(false);
      setForm(emptyForm);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    });
    setOpenSections({ veiculo: true, carga: true, cliente: true });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpenSections({ veiculo: true, carga: true, cliente: false });
    setIsOpen(true);
  };

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Stats
  const totalVolume = loads.reduce((acc: number, l: any) => acc + parseFloat(l.volumeM3 || "0"), 0);
  const pendentes = loads.filter((l: any) => l.status === "pendente").length;
  const entregues = loads.filter((l: any) => l.status === "entregue").length;

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
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Carga
        </Button>
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por motorista, cliente, destino..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : loads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma carga registrada</p>
          <p className="text-sm mt-1">Clique em "Nova Carga" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load: any) => (
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
          ))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">
              {editId ? "Editar Carga" : "Registrar Nova Carga"}
            </SheetTitle>
          </SheetHeader>

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

                {/* Volume calculado */}
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
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
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
    </div>
  );
}
