import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CollaboratorEditSheet from "@/components/CollaboratorEditSheet";
import { toast } from "sonner";
import { UserPlus, Search, Users, FileText, MapPin } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  administrativo: "Administrativo",
  encarregado: "Encarregado",
  mecanico: "Mecânico",
  motosserrista: "Motosserrista",
  carregador: "Carregador",
  operador: "Operador",
  motorista: "Motorista",
  terceirizado: "Terceirizado",
};

const ROLE_COLORS: Record<string, string> = {
  administrativo: "bg-blue-100 text-blue-800",
  encarregado: "bg-purple-100 text-purple-800",
  mecanico: "bg-orange-100 text-orange-800",
  motosserrista: "bg-red-100 text-red-800",
  carregador: "bg-yellow-100 text-yellow-800",
  operador: "bg-green-100 text-green-800",
  motorista: "bg-teal-100 text-teal-800",
  terceirizado: "bg-gray-100 text-gray-800",
};

export default function Collaborators() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: collaborators = [], isLoading } = trpc.collaborators.list.useQuery({
    search: search || undefined,
  });

  // Query de clientes para exibir o "Local de Trabalho" nos cards
  const { data: clientsList = [] } = trpc.clients.list.useQuery();

  const utils = trpc.useUtils();
  const toggleActiveMutation = trpc.collaborators.toggleActive.useMutation({
    onSuccess: () => {
      utils.collaborators.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (c: any) => {
    setEditId(c.id);
    setIsOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setIsOpen(true);
  };

  // Abre a ficha de edição automaticamente quando chega via ?edit=<id> (ex: link "Nome" na Folha de Pagamento)
  useEffect(() => {
    if (isLoading || collaborators.length === 0) return;
    const editParam = new URLSearchParams(window.location.search).get("edit");
    if (!editParam) return;
    const targetId = parseInt(editParam, 10);
    const target = collaborators.find((c: any) => c.id === targetId);
    if (target) {
      openEdit(target);
    }
    // Remove o parâmetro da URL para não reabrir ao fechar/atualizar
    setLocation("/colaboradores", { replace: true });
  }, [isLoading, collaborators]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Colaboradores
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {collaborators.length} colaborador{collaborators.length !== 1 ? "es" : ""} cadastrado{collaborators.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <UserPlus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum colaborador cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Colaborador" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collaborators.map((c: any) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-bold text-lg">{c.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-500 truncate">{c.phone}</p>}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge className={`text-xs ${ROLE_COLORS[c.role] || "bg-gray-100 text-gray-800"}`}>
                        {ROLE_LABELS[c.role] || c.role}
                      </Badge>
                      {c.clientId && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="h-2.5 w-2.5" />
                          {clientsList.find((cl: any) => cl.id === c.clientId)?.name || "Cliente"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Badge de status */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.active === 1 || c.active === true
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-600"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      c.active === 1 || c.active === true ? "bg-emerald-500" : "bg-red-400"
                    }`} />
                    {c.active === 1 || c.active === true ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline" size="sm" className="flex-1 text-xs"
                    onClick={() => openEdit(c)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline" size="sm" className={`text-xs px-2 ${
                      c.active === 1 || c.active === true
                        ? "text-red-600 border-red-200 hover:bg-red-50"
                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    }`}
                    onClick={() => toggleActiveMutation.mutate({ id: c.id, active: !(c.active === 1 || c.active === true) })}
                    disabled={toggleActiveMutation.isPending}
                    title={c.active === 1 || c.active === true ? "Inativar" : "Ativar"}
                  >
                    {c.active === 1 || c.active === true ? "Inativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm" className="flex-1 gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                    onClick={() => setLocation(`/colaboradores/${c.id}`)}
                  >
                    <FileText className="h-3 w-3" /> Ficha
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CollaboratorEditSheet
        open={isOpen}
        onOpenChange={(v) => { setIsOpen(v); if (!v) setEditId(null); }}
        collaboratorId={editId}
      />
    </div>
  );
}
