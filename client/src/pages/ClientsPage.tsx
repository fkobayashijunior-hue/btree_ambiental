import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Users, Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, Key, Copy, Globe } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type FormData = {
  name: string; document: string; email: string; phone: string;
  address: string; city: string; state: string; notes: string;
};

const emptyForm: FormData = {
  name: "", document: "", email: "", phone: "",
  address: "", city: "", state: "", notes: "",
};

const BRAZIL_STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [accessCodeDialog, setAccessCodeDialog] = useState<{ clientName: string; code: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: clientsList = [], isLoading } = trpc.clients.list.useQuery({ search: search || undefined });

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

  const generateAccessMutation = trpc.clientPortal.generateAccessCode.useMutation({
    onSuccess: (data, variables) => {
      const client = clientsList.find((c: any) => c.id === variables.clientId);
      setAccessCodeDialog({ clientName: client?.name || "Cliente", code: data.accessCode });
    },
    onError: (e) => toast.error(e.message || "Erro ao gerar código de acesso"),
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
    };
    if (editId) updateMutation.mutate({ id: editId, ...data });
    else createMutation.mutate(data);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, document: c.document || "", email: c.email || "", phone: c.phone || "", address: c.address || "", city: c.city || "", state: c.state || "", notes: c.notes || "" });
    setIsOpen(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Código copiado!")).catch(() => toast.error("Não foi possível copiar"));
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
            Cada cliente pode acessar o portal em <strong>/client-portal</strong> usando um código de acesso.
            Clique no botão <strong>🔑 Gerar Código</strong> ao lado de cada cliente para criar o código de acesso.
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
                      onClick={() => generateAccessMutation.mutate({ clientId: c.id })}
                      disabled={generateAccessMutation.isPending}
                      className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs gap-1"
                      title="Gerar código de acesso ao Portal do Cliente"
                    >
                      <Key className="h-3 w-3" />
                      <span className="hidden sm:inline">Código Portal</span>
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

      {/* Dialog: Código de Acesso Gerado */}
      <Dialog open={!!accessCodeDialog} onOpenChange={() => setAccessCodeDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" /> Código de Acesso Gerado
            </DialogTitle>
            <DialogDescription>
              Compartilhe este código com <strong>{accessCodeDialog?.clientName}</strong> para acessar o Portal do Cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-4xl font-bold tracking-widest text-blue-800 font-mono">
                {accessCodeDialog?.code}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => accessCodeDialog && copyCode(accessCodeDialog.code)}
                className="text-blue-600 hover:bg-blue-100"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• O cliente acessa em: <strong>/client-portal</strong></p>
              <p>• O código é válido até ser substituído por um novo</p>
              <p>• Guarde este código em local seguro</p>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => accessCodeDialog && copyCode(accessCodeDialog.code)}
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar Código
            </Button>
          </div>
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
