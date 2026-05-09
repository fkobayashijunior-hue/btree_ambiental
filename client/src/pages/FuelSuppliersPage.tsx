import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Fuel, Edit, Trash2, ToggleLeft, ToggleRight, Building2, Phone, Mail, MapPin, User } from "lucide-react";
import { toast } from "sonner";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  simflor: "SIMFLOR",
  astorga: "Sede Astorga",
  postos: "Postos",
};

const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Diesel",
  gasolina: "Gasolina",
  etanol: "Etanol",
  gnv: "GNV",
};

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getEmptyForm() {
  return {
    name: "",
    tradeName: "",
    cnpj: "",
    phone: "",
    email: "",
    contactName: "",
    address: "",
    city: "",
    state: "",
    fuelType: "diesel" as "diesel" | "gasolina" | "etanol" | "gnv",
    pricePerLiter: "",
    locationType: "simflor" as "simflor" | "astorga" | "postos",
    notes: "",
  };
}

export default function FuelSuppliersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(getEmptyForm());
  const [filterLocation, setFilterLocation] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: suppliers = [] } = trpc.fuelSuppliers.list.useQuery();
  const createMut = trpc.fuelSuppliers.create.useMutation({
    onSuccess: () => { utils.fuelSuppliers.list.invalidate(); utils.fuelSuppliers.listActive.invalidate(); setFormOpen(false); resetForm(); toast.success("Fornecedor cadastrado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.fuelSuppliers.update.useMutation({
    onSuccess: () => { utils.fuelSuppliers.list.invalidate(); utils.fuelSuppliers.listActive.invalidate(); setFormOpen(false); resetForm(); toast.success("Fornecedor atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.fuelSuppliers.delete.useMutation({
    onSuccess: () => { utils.fuelSuppliers.list.invalidate(); utils.fuelSuppliers.listActive.invalidate(); toast.success("Fornecedor removido!"); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setForm(getEmptyForm()); setEditId(null); }

  function openEdit(s: any) {
    setForm({
      name: s.name || "",
      tradeName: s.tradeName || "",
      cnpj: s.cnpj || "",
      phone: s.phone || "",
      email: s.email || "",
      contactName: s.contactName || "",
      address: s.address || "",
      city: s.city || "",
      state: s.state || "",
      fuelType: s.fuelType || "diesel",
      pricePerLiter: s.pricePerLiter || "",
      locationType: s.locationType || "simflor",
      notes: s.notes || "",
    });
    setEditId(s.id);
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !form.pricePerLiter) {
      toast.error("Razão Social e Preço/Litro são obrigatórios");
      return;
    }
    const payload = {
      name: form.name,
      tradeName: form.tradeName || undefined,
      cnpj: form.cnpj || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      contactName: form.contactName || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      fuelType: form.fuelType,
      pricePerLiter: form.pricePerLiter,
      locationType: form.locationType,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function toggleActive(s: any) {
    updateMut.mutate({ id: s.id, isActive: s.isActive ? 0 : 1 });
  }

  // Filter suppliers by location
  const filteredSuppliers = filterLocation === "all"
    ? suppliers
    : (suppliers as any[]).filter((s: any) => s.locationType === filterLocation);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-green-700" />
            Fornecedores de Combustível
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banco de dados completo de fornecedores. Ative apenas o que está fornecendo no momento.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-green-700 hover:bg-green-800">
          <Plus className="h-4 w-4 mr-1" /> Novo Fornecedor
        </Button>
      </div>

      {/* Filtro por local */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por local:</span>
        {["all", "simflor", "astorga", "postos"].map(loc => (
          <Button
            key={loc}
            variant={filterLocation === loc ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterLocation(loc)}
            className={filterLocation === loc ? "bg-green-700 hover:bg-green-800" : ""}
          >
            {loc === "all" ? "Todos" : LOCATION_TYPE_LABELS[loc]}
          </Button>
        ))}
      </div>

      {/* Lista de fornecedores */}
      <div className="grid gap-3">
        {filteredSuppliers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum fornecedor cadastrado{filterLocation !== "all" ? ` para ${LOCATION_TYPE_LABELS[filterLocation]}` : ""}. Clique em "Novo Fornecedor" para começar.
            </CardContent>
          </Card>
        )}
        {(filteredSuppliers as any[]).map((s: any) => (
          <Card key={s.id} className={`${!s.isActive ? 'opacity-60 border-dashed' : ''} transition-all`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Nome e badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg truncate">{s.name}</span>
                    <Badge variant={s.isActive ? "default" : "secondary"} className={s.isActive ? "bg-green-600" : ""}>
                      {s.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">{FUEL_TYPE_LABELS[s.fuelType] || s.fuelType}</Badge>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      <MapPin className="h-3 w-3 mr-1" />
                      {LOCATION_TYPE_LABELS[s.locationType] || s.locationType}
                    </Badge>
                  </div>

                  {/* Preço destaque */}
                  <div className="mt-2 flex items-center gap-4 flex-wrap">
                    <span className="font-semibold text-green-700 text-lg">
                      R$ {parseFloat(s.pricePerLiter || "0").toFixed(2)}/L
                    </span>
                    {s.tradeName && <span className="text-sm text-muted-foreground">({s.tradeName})</span>}
                  </div>

                  {/* Detalhes */}
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {s.cnpj && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {s.cnpj}
                      </span>
                    )}
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {s.email}
                      </span>
                    )}
                    {s.contactName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {s.contactName}
                      </span>
                    )}
                  </div>
                  {s.city && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {s.city}{s.state ? `/${s.state}` : ""}{s.address ? ` — ${s.address}` : ""}
                    </div>
                  )}
                  {s.notes && (
                    <div className="mt-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                      {s.notes}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(s)} title={s.isActive ? "Desativar" : "Ativar"}>
                    {s.isActive ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover fornecedor permanentemente?")) deleteMut.mutate({ id: s.id }); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editId ? "Editar Fornecedor" : "Novo Fornecedor de Combustível"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-8">
            {/* Seção: Dados da Empresa */}
            <div className="border-b pb-2 mb-2">
              <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Dados da Empresa</h3>
            </div>
            <div>
              <label className="text-sm font-medium">Razão Social *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Unipetro Distribuidora de Petróleo Ltda" />
            </div>
            <div>
              <label className="text-sm font-medium">Nome Fantasia</label>
              <Input value={form.tradeName} onChange={e => setForm({ ...form, tradeName: e.target.value })} placeholder="Ex: Unipetro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">CNPJ</label>
                <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Pessoa de Contato</label>
                <Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Nome do contato" />
              </div>
            </div>

            {/* Seção: Endereço */}
            <div className="border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Endereço</h3>
            </div>
            <div>
              <label className="text-sm font-medium">Endereço</label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">Cidade</label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Ex: Astorga" />
              </div>
              <div>
                <label className="text-sm font-medium">UF</label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="PR" maxLength={2} />
              </div>
            </div>

            {/* Seção: Combustível e Preço */}
            <div className="border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Combustível e Preço</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo de Combustível</label>
                <Select value={form.fuelType} onValueChange={v => setForm({ ...form, fuelType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="gnv">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Preço por Litro (R$) *</label>
                <Input type="number" step="0.01" value={form.pricePerLiter} onChange={e => setForm({ ...form, pricePerLiter: e.target.value })} placeholder="Ex: 5.89" />
              </div>
            </div>

            {/* Seção: Local de Abastecimento */}
            <div className="border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Local de Abastecimento</h3>
            </div>
            <div>
              <label className="text-sm font-medium">Onde este fornecedor abastece? *</label>
              <Select value={form.locationType} onValueChange={v => setForm({ ...form, locationType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simflor">SIMFLOR (tanque na fazenda)</SelectItem>
                  <SelectItem value="astorga">Sede Astorga (tanque na sede)</SelectItem>
                  <SelectItem value="postos">Postos de Gasolina</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {form.locationType === "simflor" && "Fornecedor entrega diesel no tanque da SIMFLOR"}
                {form.locationType === "astorga" && "Fornecedor entrega diesel no tanque da Sede em Astorga"}
                {form.locationType === "postos" && "Abastecimento feito em postos de gasolina (campo livre no formulário)"}
              </p>
            </div>

            {/* Observações */}
            <div className="mt-4">
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais sobre o fornecedor..." rows={3} />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800 mt-4" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Salvando..." : editId ? "Atualizar Fornecedor" : "Cadastrar Fornecedor"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
