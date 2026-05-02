import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Users, Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, Key, Globe, Eye, EyeOff, Lock, FileText, Upload, X, ExternalLink } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type FormData = {
  name: string; document: string; email: string; phone: string;
  address: string; city: string; state: string; notes: string;
  pricePerTon: string; paymentTermDays: string;
};

const emptyForm: FormData = {
  name: "", document: "", email: "", phone: "",
  address: "", city: "", state: "", notes: "",
  pricePerTon: "", paymentTermDays: "20",
};

const BRAZIL_STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  // Diálogo de senha do portal
  const [passwordDialog, setPasswordDialog] = useState<{ clientId: number; clientName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Documentos do cliente
  const [docClientId, setDocClientId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<string>("proposta");
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const { data: clientsList = [], isLoading } = trpc.clients.list.useQuery({ search: search || undefined });
  const { data: clientDocs = [], refetch: refetchDocs } = trpc.cargoLoads.listClientDocuments.useQuery(
    { clientId: docClientId ?? 0 },
    { enabled: !!docClientId }
  );
  const uploadDocMutation = trpc.cargoLoads.uploadClientDocument.useMutation({
    onSuccess: () => { toast.success("Documento enviado!"); refetchDocs(); setDocTitle(""); },
    onError: (e) => toast.error(e.message || "Erro ao enviar documento"),
  });
  const deleteDocMutation = trpc.cargoLoads.deleteClientDocument.useMutation({
    onSuccess: () => { toast.success("Documento removido!"); refetchDocs(); },
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docClientId) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10MB)"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocMutation.mutate({
        clientId: docClientId,
        type: docType as any,
        title: docTitle || file.name,
        fileBase64: base64,
        fileType: file.type || "application/pdf",
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { toast.success("Cliente cadastrado!"); utils.clients.list.invalidate(); setIsOpen(false); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { toast.success("Cliente atualizado!"); utils.clients.list.invalidate(); setIsOpen(false); setEditId(null); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { toast.success("Cliente removido!"); utils.clients.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const setPasswordMutation = trpc.clientPortal.setClientPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha do portal definida com sucesso!");
      setPasswordDialog(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message || "Erro ao definir senha"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      document: form.document || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      notes: form.notes || undefined,
      pricePerTon: form.pricePerTon || undefined,
      paymentTermDays: form.paymentTermDays ? parseInt(form.paymentTermDays) : undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...data });
    else createMutation.mutate(data);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setDocClientId(c.id);
    setForm({ name: c.name, document: c.document || "", email: c.email || "", phone: c.phone || "", address: c.address || "", city: c.city || "", state: c.state || "", notes: c.notes || "", pricePerTon: c.pricePerTon || "", paymentTermDays: c.paymentTermDays ? String(c.paymentTermDays) : "20" });
    setIsOpen(true);
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordDialog || !newPassword.trim()) return;
    setPasswordMutation.mutate({ clientId: passwordDialog.clientId, password: newPassword });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">Clientes contratantes de serviços florestais</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setIsOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Informativo sobre Portal do Cliente */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-blue-800 text-sm">Portal do Cliente</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Cada cliente acessa o portal em <strong>/client-portal</strong> usando o <strong>e-mail</strong> e uma <strong>senha</strong>.
            Clique no botão <strong>🔑 Definir Senha</strong> ao lado de cada cliente para configurar o acesso.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por nome, documento, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-emerald-800">Clientes Cadastrados</CardTitle>
          <CardDescription>{isLoading ? "Carregando..." : `${clientsList.length} cliente${clientsList.length !== 1 ? "s" : ""}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : clientsList.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhum cliente cadastrado</p></div>
          ) : (
            <div className="space-y-3">
              {clientsList.map((c: any) => (
                <div key={c.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-emerald-700">{c.name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                      {c.document && <p className="text-xs text-gray-400">CPF/CNPJ: {c.document}</p>}
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {c.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.email && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        {(c.city || c.state) && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{[c.city, c.state].filter(Boolean).join(" - ")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!c.email) { toast.error("Cadastre um e-mail para este cliente antes de definir a senha do portal."); return; }
                        setPasswordDialog({ clientId: c.id, clientName: c.name }); setNewPassword(""); setShowPassword(false);
                      }}
                      className={`text-xs gap-1 ${c.email ? 'text-blue-700 border-blue-200 hover:bg-blue-50' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                      title={c.email ? "Definir senha do Portal do Cliente" : "Cadastre um e-mail primeiro"}
                    >
                      <Key className="h-3 w-3" />
                      <span className="hidden sm:inline">Senha Portal</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-emerald-700 hover:bg-emerald-50">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setDeleteId(c.id); setDeleteName(c.name); }} className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Definir Senha do Portal */}
      <Dialog open={!!passwordDialog} onOpenChange={(v) => { if (!v) { setPasswordDialog(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" /> Senha do Portal
            </DialogTitle>
            <DialogDescription>
              Defina a senha de acesso ao Portal do Cliente para <strong>{passwordDialog?.clientName}</strong>.
              O cliente usará o e-mail cadastrado + esta senha para entrar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  minLength={4}
                  required
                  className="w-full h-10 pl-3 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
              <p>• O cliente acessa em: <strong>/client-portal</strong></p>
              <p>• Login: e-mail cadastrado + esta senha</p>
              <p>• Compartilhe a senha com segurança</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPasswordDialog(null)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={setPasswordMutation.isPending || !newPassword.trim()}>
                {setPasswordMutation.isPending ? "Salvando..." : "Definir Senha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sheet: Formulário de Cliente */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle className="text-emerald-800">{editId ? "Editar Cliente" : "Novo Cliente"}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div><Label>Nome / Razão Social *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome completo ou razão social" /></div>
            <div><Label>CPF / CNPJ</Label><Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="000.000.000-00" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
            </div>
            <div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cidade</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" /></div>
              <div>
                <Label>Estado</Label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">UF</option>
                  {BRAZIL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-blue-800">Configurações de Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço por Tonelada (R$)</Label><Input type="number" step="0.01" value={form.pricePerTon} onChange={e => setForm(f => ({ ...f, pricePerTon: e.target.value }))} placeholder="130.00" /></div>
                <div><Label>Prazo Pagamento (dias)</Label><Input type="number" value={form.paymentTermDays} onChange={e => setForm(f => ({ ...f, paymentTermDays: e.target.value }))} placeholder="20" /></div>
              </div>
            </div>
            {/* Seção de Documentos - só aparece ao editar */}
            {editId && (
              <div className="p-3 bg-amber-50 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos do Cliente</p>
                {/* Lista de documentos existentes */}
                {clientDocs.length > 0 && (
                  <div className="space-y-2">
                    {clientDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-2 bg-white p-2 rounded-md border">
                        <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-gray-500">{doc.type} • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button type="button" onClick={() => deleteDocMutation.mutate({ id: doc.id })} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Upload de novo documento */}
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs">
                        <option value="proposta">Proposta</option>
                        <option value="contrato">Contrato</option>
                        <option value="nota_fiscal">Nota Fiscal</option>
                        <option value="boleto">Boleto</option>
                        <option value="recibo">Recibo</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Título</Label>
                      <Input className="h-9 text-xs" value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Nome do documento" />
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-2 h-10 rounded-md border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">{uploading ? "Enviando..." : "Selecionar arquivo (PDF, imagem)"}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDocUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}
            <div><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Informações adicionais..." /></div>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? "Salvando..." : editId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* AlertDialog: Confirmar exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover <strong>{deleteName}</strong>? O histórico de cargas será mantido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
