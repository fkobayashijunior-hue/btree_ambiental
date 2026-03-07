import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Users, Shield, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FormData = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

const emptyForm: FormData = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  user: "Usuário",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  user: "bg-blue-100 text-blue-800",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const utils = trpc.useUtils();

  const { data: usersList = [], isLoading } = trpc.usersManagement.list.useQuery({
    search: search || undefined,
  });

  const createMutation = trpc.usersManagement.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.usersManagement.list.invalidate();
      setIsOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.usersManagement.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.usersManagement.list.invalidate();
      setIsOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.usersManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      utils.usersManagement.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({
        id: editId,
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password || undefined,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (u: any) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const confirmDelete = (u: any) => {
    setDeleteId(u.id);
    setDeleteName(u.name);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Usuários do Sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerencie quem tem acesso ao sistema e suas permissões
          </p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, email ou perfil..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-emerald-800">Usuários Cadastrados</CardTitle>
          <CardDescription>
            {isLoading ? "Carregando..." : `${usersList.length} usuário${usersList.length !== 1 ? "s" : ""} no sistema`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Perfil</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden lg:table-cell">Último acesso</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-emerald-700">{u.name?.[0]?.toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`text-xs ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-800"}`}>
                          {u.role === "admin" && <Shield className="h-3 w-3 mr-1 inline" />}
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-500 text-sm hidden md:table-cell">{u.email}</td>
                      <td className="py-4 px-4 text-gray-400 text-xs hidden lg:table-cell">
                        {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(u)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Remover</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet para criar/editar */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-emerald-800">
              {editId ? "Editar Usuário" : "Novo Usuário"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Nome do usuário"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label>{editId ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editId}
                  placeholder={editId ? "Deixe em branco para manter" : "Mínimo 4 caracteres"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Perfil de Acesso *</Label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as "user" | "admin" }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Administradores têm acesso total ao sistema, incluindo gestão de usuários.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending}
              >
                {isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteName}</strong>? Esta ação não pode ser desfeita.
              O usuário perderá acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
