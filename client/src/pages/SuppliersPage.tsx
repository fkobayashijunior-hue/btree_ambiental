// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Building2, Phone, MessageCircle, Mail, Globe, MapPin,
  Edit2, Trash2, Search, ChevronDown, ChevronUp, RefreshCw,
  UserPlus, User, AlertTriangle, X
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
  sellerName: string;
  pixKey: string;
}

interface ContactForm {
  contactName: string;
  role: string;
  phone: string;
  whatsapp: string;
  email: string;
}

const emptyForm: SupplierForm = {
  name: '', address: '', city: '', state: '', phone: '',
  whatsapp: '', email: '', website: '', notes: '',
  sellerName: '', pixKey: '',
};

const emptyContact: ContactForm = {
  contactName: '', role: '', phone: '', whatsapp: '', email: '',
};

export default function SuppliersPage() {
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Contact management
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSupplierId, setContactSupplierId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContact);
  const [editContactId, setEditContactId] = useState<number | null>(null);

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

  const syncMutation = trpc.suppliers.syncFromQuotationResponses.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Sincronização concluída: ${data.created} fornecedor(es) criado(s), ${data.updated} atualizado(s).`);
      utils.suppliers.list.invalidate();
    },
    onError: () => toast.error("Erro ao sincronizar fornecedores"),
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Fornecedor excluído permanentemente");
      setDeleteConfirmId(null);
    },
    onError: () => toast.error("Erro ao excluir fornecedor"),
  });

  const addContactMutation = trpc.suppliers.addContact.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Contato adicionado!");
      setShowContactForm(false);
      setContactForm(emptyContact);
      setEditContactId(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateContactMutation = trpc.suppliers.updateContact.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Contato atualizado!");
      setShowContactForm(false);
      setContactForm(emptyContact);
      setEditContactId(null);
    },
  });

  const deleteContactMutation = trpc.suppliers.deleteContact.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Contato removido");
    },
  });

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setDuplicateWarning(null);
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
      sellerName: s.sellerName || '',
      pixKey: s.pixKey || '',
    });
    setEditId(s.id);
    setDuplicateWarning(null);
    setShowForm(true);
  }

  function checkDuplicate(name: string) {
    if (!name.trim() || editId) return;
    const similar = (suppliers || []).find(s =>
      s.companyName.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (similar) {
      setDuplicateWarning(`Já existe um fornecedor com o nome "${similar.companyName}". Verifique antes de cadastrar.`);
    } else {
      setDuplicateWarning(null);
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }
    if (duplicateWarning && !editId) {
      toast.error("Já existe um fornecedor com esse nome. Edite o existente ou use um nome diferente.");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function openAddContact(supplierId: number) {
    setContactSupplierId(supplierId);
    setContactForm(emptyContact);
    setEditContactId(null);
    setShowContactForm(true);
  }

  function openEditContact(contact: any, supplierId: number) {
    setContactSupplierId(supplierId);
    setContactForm({
      contactName: contact.contactName || '',
      role: contact.role || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      email: contact.email || '',
    });
    setEditContactId(contact.id);
    setShowContactForm(true);
  }

  function handleContactSubmit() {
    if (!contactForm.contactName.trim()) {
      toast.error("Informe o nome do contato");
      return;
    }
    if (editContactId) {
      updateContactMutation.mutate({ id: editContactId, ...contactForm });
    } else if (contactSupplierId) {
      addContactMutation.mutate({ supplierId: contactSupplierId, ...contactForm });
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
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setDuplicateWarning(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
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
          {filtered.map(s => {
            const contacts = (s as any).contacts || [];
            const hasDetails = s.address || s.notes || s.sellerName || s.pixKey || contacts.length > 0;
            return (
              <Card key={s.id} className={`${s.active === 0 ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{s.companyName}</span>
                        {s.active === 0 && <Badge variant="outline" className="text-xs text-gray-400">Inativo</Badge>}
                      </div>
                      {(s.city || s.state) && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          {[s.city, s.state].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      {/* Quick contact info */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Phone className="w-3 h-3" /> {s.phone}
                            {s.sellerName && <span className="text-gray-500">· {s.sellerName}</span>}
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
                      {/* Extra contacts summary */}
                      {contacts.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {contacts.map((c: any) => (
                            <span key={c.id} className="flex items-center gap-1 text-xs text-gray-600">
                              <User className="w-3 h-3 text-gray-400" />
                              {c.contactName}
                              {c.role && <span className="text-gray-400">({c.role})</span>}
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline ml-1">{c.phone}</a>
                              )}
                              {c.whatsapp && (
                                <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline ml-1">
                                  <MessageCircle className="w-3 h-3 inline" />
                                </a>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openAddContact(s.id)} className="text-green-600 hover:text-green-800 p-1" title="Adicionar contato">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 p-1">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(s.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {hasDetails && (
                    <button
                      className="flex items-center gap-1 text-xs text-gray-400 mt-2 hover:text-gray-600"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    >
                      {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedId === s.id ? 'Menos detalhes' : 'Mais detalhes'}
                    </button>
                  )}
                  {expandedId === s.id && (
                    <div className="mt-2 pt-2 border-t space-y-2 text-sm text-gray-600">
                      {s.sellerName && <p><span className="font-medium">Vendedor principal:</span> {s.sellerName}</p>}
                      {s.pixKey && <p><span className="font-medium">Chave PIX:</span> <span className="font-mono">{s.pixKey}</span></p>}
                      {s.address && <p><span className="font-medium">Endereço:</span> {s.address}</p>}
                      {s.notes && <p><span className="font-medium">Obs:</span> {s.notes}</p>}
                      {contacts.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Contatos adicionais:</p>
                          <div className="space-y-2">
                            {contacts.map((c: any) => (
                              <div key={c.id} className="flex items-start justify-between bg-gray-50 rounded p-2">
                                <div className="space-y-0.5">
                                  <p className="font-medium text-gray-800">{c.contactName} {c.role && <span className="text-gray-500 font-normal">— {c.role}</span>}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Phone className="w-3 h-3" />{c.phone}</a>}
                                    {c.whatsapp && <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:underline"><MessageCircle className="w-3 h-3" />WhatsApp</a>}
                                    {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-purple-600 hover:underline"><Mail className="w-3 h-3" />{c.email}</a>}
                                  </div>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button variant="ghost" size="sm" onClick={() => openEditContact(c, s.id)} className="text-blue-400 hover:text-blue-600 p-1 h-auto">
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteContactMutation.mutate({ id: c.id })} className="text-red-400 hover:text-red-600 p-1 h-auto">
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Supplier Form Dialog */}
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
              <Input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); checkDuplicate(e.target.value); }}
                placeholder="Ex: Distribuidora ABC"
              />
              {duplicateWarning && (
                <div className="flex items-start gap-2 mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-600" />
                  {duplicateWarning}
                </div>
              )}
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nome do Vendedor</Label>
                <Input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} placeholder="CPF, CNPJ, e-mail ou telefone" />
              </div>
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

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              {editContactId ? 'Editar Contato' : 'Adicionar Contato'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nome *</Label>
                <Input value={contactForm.contactName} onChange={e => setContactForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Ex: Maria" />
              </div>
              <div>
                <Label>Cargo / Setor</Label>
                <Input value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Financeiro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Telefone</Label>
                <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="(44) 99999-9999" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={contactForm.whatsapp} onChange={e => setContactForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(44) 99999-9999" />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowContactForm(false); setContactForm(emptyContact); setEditContactId(null); }}>Cancelar</Button>
            <Button
              onClick={handleContactSubmit}
              disabled={addContactMutation.isPending || updateContactMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {(addContactMutation.isPending || updateContactMutation.isPending) ? 'Salvando...' : editContactId ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir fornecedor permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor e todos os seus contatos serão removidos do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
