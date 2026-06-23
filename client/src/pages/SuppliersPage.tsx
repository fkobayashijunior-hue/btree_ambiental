import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Building2, Phone, MessageCircle, Mail, Globe, MapPin,
  Edit2, Trash2, Search, ChevronDown, ChevronUp, History, RefreshCw
} from "lucide-react";

interface SupplierForm {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  notes: string;
}

const emptyForm: SupplierForm = {
  name: '', address: '', city: '', state: '', phone: '',
  whatsapp: '', email: '', website: '', notes: '',
};

export default function SuppliersPage() {
  
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery({ activeOnly: false });

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Fornecedor cadastrado!");
      resetForm();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Fornecedor atualizado!");
      resetForm();
    },
  });

  const syncMutation = trpc.quotationRequests.syncSuppliersFromResponses.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronização concluída: ${data.created} fornecedor(es) criado(s), ${data.updated} atualizado(s).`);
      utils.suppliers.list.invalidate();
    },
    onError: () => toast.error("Erro ao sincronizar fornecedores"),
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Fornecedor desativado");
    },
  });

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  }

  function openEdit(s: any) {
    setForm({
      name: s.companyName || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      website: s.website || '',
      notes: s.notes || '',
    });
    setEditId(s.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = (suppliers || []).filter(s =>
    s.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Fornecedores
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cadastro de empresas e contatos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Importar fornecedores das respostas de orçamentos"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Importando...' : 'Importar dos Orçamentos'}
          </Button>
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou cidade..."
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum fornecedor cadastrado</p>
          <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Cadastrar primeiro fornecedor
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id} className={`${s.active === 0 ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{s.companyName}</span>
                      {s.active === 0 && <Badge variant="outline" className="text-xs text-gray-400">Inativo</Badge>}
                    </div>
                    {(s.city || s.state) && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        {[s.city, s.state].filter(Boolean).join(' - ')}
                      </div>
                    )}
                    {/* Quick contact buttons */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </a>
                      )}
                      {s.whatsapp && (
                        <a
                          href={`https://wa.me/55${s.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-xs text-purple-600 hover:underline">
                          <Mail className="w-3 h-3" /> {s.email}
                        </a>
                      )}
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                          <Globe className="w-3 h-3" /> Site
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 p-1">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: s.id })} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expandable details */}
                {(s.address || s.notes) && (
                  <button
                    className="flex items-center gap-1 text-xs text-gray-400 mt-2 hover:text-gray-600"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expandedId === s.id ? 'Menos detalhes' : 'Mais detalhes'}
                  </button>
                )}
                {expandedId === s.id && (
                  <div className="mt-2 pt-2 border-t space-y-1 text-sm text-gray-600">
                    {s.address && <p><span className="font-medium">Endereço:</span> {s.address}</p>}
                    {s.notes && <p><span className="font-medium">Obs:</span> {s.notes}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nome da empresa *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Distribuidora ABC" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(44) 99999-9999" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(44) 99999-9999" />
              </div>
            </div>

            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" type="email" />
            </div>

            <div>
              <Label>Site</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
            </div>

            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Astorga" />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="PR" maxLength={2} />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
