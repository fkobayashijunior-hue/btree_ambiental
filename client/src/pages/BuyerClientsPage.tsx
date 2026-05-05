import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Phone, Mail, MapPin, DollarSign, Trash2, Edit, History, CreditCard, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const ESTADOS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function BuyerClientsPage() {

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", cnpjCpf: "", inscricaoEstadual: "", phone: "", email: "",
    address: "", city: "", state: "", cep: "", contactPerson: "",
    product: "", paymentMethod: "", notes: ""
  });
  const [editId, setEditId] = useState<number | null>(null);

  const { data: buyers = [], refetch } = trpc.buyerClients.list.useQuery();
  const createMut = trpc.buyerClients.create.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Comprador cadastrado!"); } });
  const updateMut = trpc.buyerClients.update.useMutation({ onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Comprador atualizado!"); } });
  const deleteMut = trpc.buyerClients.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Comprador removido!"); } });

  function resetForm() {
    setForm({ name: "", cnpjCpf: "", inscricaoEstadual: "", phone: "", email: "", address: "", city: "", state: "", cep: "", contactPerson: "", product: "", paymentMethod: "", notes: "" });
    setEditId(null);
  }

  function openEdit(b: any) {
    setForm({
      name: b.name || "", cnpjCpf: b.cnpjCpf || "", inscricaoEstadual: b.inscricaoEstadual || "",
      phone: b.phone || "", email: b.email || "", address: b.address || "",
      city: b.city || "", state: b.state || "", cep: b.cep || "",
      contactPerson: b.contactPerson || "", product: b.product || "",
      paymentMethod: b.paymentMethod || "", notes: b.notes || ""
    });
    setEditId(b.id);
    setFormOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editId) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  const filtered = buyers.filter((b: any) =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.cnpjCpf?.includes(search) ||
    b.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (detailId) {
    return <BuyerDetail id={detailId} onBack={() => setDetailId(null)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" /> Clientes Destino
          </h1>
          <p className="text-sm text-gray-500">Compradores de lenha/madeira</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por nome, CNPJ, cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3">
        {filtered.map((b: any) => (
          <Card key={b.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(b.id)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 truncate">{b.name}</h3>
                    {b.active === 0 && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  {b.cnpjCpf && <p className="text-xs text-gray-500">{b.cnpjCpf}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {b.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}
                    {b.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.email}</span>}
                    {b.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city}-{b.state}</span>}
                  </div>
                  {b.product && <p className="text-xs text-emerald-600 font-medium mt-1">{b.product}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); openEdit(b); }}>
                    <Edit className="h-4 w-4 text-gray-400" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum comprador cadastrado</p>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editId ? "Editar Comprador" : "Novo Comprador"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nome / Razão Social *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">CNPJ / CPF</label>
                <Input value={form.cnpjCpf} onChange={e => setForm(f => ({ ...f, cnpjCpf: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Inscrição Estadual</label>
                <Input value={form.inscricaoEstadual} onChange={e => setForm(f => ({ ...f, inscricaoEstadual: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Endereço</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">CEP</label>
                <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Pessoa de Contato</label>
              <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Produto</label>
                <Input placeholder="Ex: Lenha de eucalipto" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <Input placeholder="Ex: Boleto 30 dias" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMut.isPending || updateMut.isPending}>
              {editId ? "Salvar Alterações" : "Cadastrar Comprador"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ===== DETALHE DO COMPRADOR =====
function BuyerDetail({ id, onBack }: { id: number; onBack: () => void }) {

  const { data: buyer, refetch } = trpc.buyerClients.getById.useQuery({ id });
  const [priceOpen, setPriceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [priceForm, setPriceForm] = useState({ product: "", pricePerUnit: "", unit: "ton", validFrom: "", validUntil: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentDate: "", paymentMethod: "", invoiceNumber: "", notes: "", status: "pendente" as const });

  const addPriceMut = trpc.buyerClients.addPrice.useMutation({ onSuccess: () => { refetch(); setPriceOpen(false); setPriceForm({ product: "", pricePerUnit: "", unit: "ton", validFrom: "", validUntil: "", notes: "" }); toast.success("Preço registrado!"); } });
  const deletePriceMut = trpc.buyerClients.deletePrice.useMutation({ onSuccess: () => { refetch(); toast.success("Preço removido!"); } });
  const addPaymentMut = trpc.buyerClients.addPayment.useMutation({ onSuccess: () => { refetch(); setPaymentOpen(false); setPaymentForm({ amount: "", paymentDate: "", paymentMethod: "", invoiceNumber: "", notes: "", status: "pendente" }); toast.success("Pagamento registrado!"); } });
  const deletePaymentMut = trpc.buyerClients.deletePayment.useMutation({ onSuccess: () => { refetch(); toast.success("Pagamento removido!"); } });
  const updateStatusMut = trpc.buyerClients.updatePaymentStatus.useMutation({ onSuccess: () => { refetch(); } });

  if (!buyer) return <div className="p-6 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">&larr; Voltar</Button>
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{buyer.name}</h1>
          {buyer.cnpjCpf && <p className="text-sm text-gray-500">{buyer.cnpjCpf}</p>}
        </div>
        <Badge variant={buyer.active ? "default" : "secondary"}>{buyer.active ? "Ativo" : "Inativo"}</Badge>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {buyer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{buyer.phone}</div>}
          {buyer.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{buyer.email}</div>}
          {buyer.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />{buyer.address}</div>}
          {buyer.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />{buyer.city}-{buyer.state} {buyer.cep}</div>}
          {buyer.contactPerson && <div>Contato: {buyer.contactPerson}</div>}
          {buyer.product && <div className="text-emerald-600 font-medium">Produto: {buyer.product}</div>}
          {buyer.paymentMethod && <div>Pagamento: {buyer.paymentMethod}</div>}
          {buyer.notes && <div className="col-span-full text-gray-500 italic">{buyer.notes}</div>}
        </CardContent>
      </Card>

      {/* Histórico de Preços */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-blue-600" /> Histórico de Preços</CardTitle>
            <Button size="sm" onClick={() => setPriceOpen(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" /> Preço</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {buyer.prices?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum preço registrado</p>}
          {buyer.prices?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{p.product}</p>
                <p className="text-lg font-bold text-blue-700">R$ {p.pricePerUnit}/{p.unit}</p>
                {p.validFrom && <p className="text-xs text-gray-400">Vigência: {p.validFrom} {p.validUntil ? `até ${p.validUntil}` : "em diante"}</p>}
                {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => deletePriceMut.mutate({ id: p.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagamentos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-green-600" /> Pagamentos</CardTitle>
            <Button size="sm" onClick={() => setPaymentOpen(true)} className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-1" /> Pagamento</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {buyer.payments?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento registrado</p>}
          {buyer.payments?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-lg font-bold text-green-700">R$ {p.amount}</p>
                <p className="text-xs text-gray-500">{p.paymentDate} {p.paymentMethod && `· ${p.paymentMethod}`}</p>
                {p.invoiceNumber && <p className="text-xs text-gray-400">NF: {p.invoiceNumber}</p>}
                {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Select value={p.status} onValueChange={v => updateStatusMut.mutate({ id: p.id, status: v as any })}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => deletePaymentMut.mutate({ id: p.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price Sheet */}
      <Sheet open={priceOpen} onOpenChange={setPriceOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Novo Preço</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Produto *</label>
              <Input placeholder="Ex: Lenha de eucalipto" value={priceForm.product} onChange={e => setPriceForm(f => ({ ...f, product: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Preço (R$) *</label>
                <Input type="number" step="0.01" value={priceForm.pricePerUnit} onChange={e => setPriceForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <Select value={priceForm.unit} onValueChange={v => setPriceForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ton">Tonelada</SelectItem>
                    <SelectItem value="m3">m³</SelectItem>
                    <SelectItem value="st">Estéreo</SelectItem>
                    <SelectItem value="un">Unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Válido de</label>
                <Input type="date" value={priceForm.validFrom} onChange={e => setPriceForm(f => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Válido até</label>
                <Input type="date" value={priceForm.validUntil} onChange={e => setPriceForm(f => ({ ...f, validUntil: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={priceForm.notes} onChange={e => setPriceForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={() => addPriceMut.mutate({ buyerId: id, ...priceForm })} className="w-full bg-blue-600 hover:bg-blue-700" disabled={addPriceMut.isPending}>
              Registrar Preço
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Sheet */}
      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Novo Pagamento</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor (R$) *</label>
                <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <Input placeholder="Boleto, PIX..." value={paymentForm.paymentMethod} onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Nº Nota Fiscal</label>
                <Input value={paymentForm.invoiceNumber} onChange={e => setPaymentForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={paymentForm.status} onValueChange={v => setPaymentForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={() => addPaymentMut.mutate({ buyerId: id, ...paymentForm })} className="w-full bg-green-600 hover:bg-green-700" disabled={addPaymentMut.isPending}>
              Registrar Pagamento
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
