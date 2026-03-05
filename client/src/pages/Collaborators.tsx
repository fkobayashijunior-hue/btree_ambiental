import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, Search, Camera, User, MapPin, Phone, CreditCard, Shirt, Edit, Users } from "lucide-react";

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

type FormData = {
  name: string; email: string; phone: string; cpf: string; rg: string;
  address: string; city: string; state: string; zipCode: string;
  role: string; pixKey: string; dailyRate: string;
  employmentType: string; shirtSize: string; pantsSize: string;
  shoeSize: string; bootSize: string; photoBase64: string;
};

const emptyForm: FormData = {
  name: "", email: "", phone: "", cpf: "", rg: "",
  address: "", city: "", state: "", zipCode: "",
  role: "operador", pixKey: "", dailyRate: "",
  employmentType: "diarista", shirtSize: "", pantsSize: "",
  shoeSize: "", bootSize: "", photoBase64: "",
};

export default function Collaborators() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: collaborators = [], isLoading } = trpc.collaborators.list.useQuery({
    search: search || undefined,
  });

  const createMutation = trpc.collaborators.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      utils.collaborators.list.invalidate();
      setIsOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.collaborators.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      utils.collaborators.list.invalidate();
      setIsOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, photoBase64: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zipCode: form.zipCode || undefined,
      role: form.role as any,
      pixKey: form.pixKey || undefined,
      dailyRate: form.dailyRate || undefined,
      employmentType: form.employmentType as any || undefined,
      shirtSize: form.shirtSize as any || undefined,
      pantsSize: form.pantsSize || undefined,
      shoeSize: form.shoeSize || undefined,
      bootSize: form.bootSize || undefined,
      photoBase64: form.photoBase64 || undefined,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name || "", email: c.email || "", phone: c.phone || "",
      cpf: c.cpf || "", rg: c.rg || "", address: c.address || "",
      city: c.city || "", state: c.state || "", zipCode: c.zipCode || "",
      role: c.role || "operador", pixKey: c.pixKey || "", dailyRate: c.dailyRate || "",
      employmentType: c.employmentType || "diarista", shirtSize: c.shirtSize || "",
      pantsSize: c.pantsSize || "", shoeSize: c.shoeSize || "", bootSize: c.bootSize || "",
      photoBase64: "",
    });
    setIsOpen(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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

        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <UserPlus className="h-4 w-4" /> Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-emerald-800">
                {editId ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="pessoal">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="endereco">Endereço</TabsTrigger>
                  <TabsTrigger value="epi">EPI & Trabalho</TabsTrigger>
                </TabsList>

                {/* Aba: Dados Pessoais */}
                <TabsContent value="pessoal" className="space-y-4 pt-4">
                  {/* Foto */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center overflow-hidden cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {form.photoBase64 ? (
                        <img src={form.photoBase64} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-emerald-400 mx-auto" />
                          <span className="text-xs text-emerald-500 mt-1 block">Foto</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">Foto do colaborador</p>
                      <p className="text-xs text-gray-400">Clique para selecionar uma foto</p>
                      <p className="text-xs text-gray-400">A biometria facial será configurada na aba de presença</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome completo" />
                    </div>
                    <div>
                      <Label>CPF</Label>
                      <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <Label>RG</Label>
                      <Input value={form.rg} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} placeholder="00.000.000-0" />
                    </div>
                    <div>
                      <Label>Celular</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                    </div>
                    <div>
                      <Label>Função *</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Vínculo</Label>
                      <Select value={form.employmentType} onValueChange={v => setForm(f => ({ ...f, employmentType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clt">CLT</SelectItem>
                          <SelectItem value="terceirizado">Terceirizado</SelectItem>
                          <SelectItem value="diarista">Diarista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Aba: Endereço */}
                <TabsContent value="endereco" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Endereço</Label>
                      <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro" />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" />
                    </div>
                  </div>
                </TabsContent>

                {/* Aba: EPI & Trabalho */}
                <TabsContent value="epi" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Chave PIX</Label>
                      <Input value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} placeholder="CPF, email ou telefone" />
                    </div>
                    <div>
                      <Label>Diária (R$)</Label>
                      <Input value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))} placeholder="0,00" />
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Shirt className="h-4 w-4" /> Tamanhos para EPI
                      </p>
                    </div>

                    <div>
                      <Label>Camisa</Label>
                      <Select value={form.shirtSize} onValueChange={v => setForm(f => ({ ...f, shirtSize: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {["PP", "P", "M", "G", "GG", "XGG"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Calça (número)</Label>
                      <Input value={form.pantsSize} onChange={e => setForm(f => ({ ...f, pantsSize: e.target.value }))} placeholder="ex: 42" />
                    </div>
                    <div>
                      <Label>Calçado (número)</Label>
                      <Input value={form.shoeSize} onChange={e => setForm(f => ({ ...f, shoeSize: e.target.value }))} placeholder="ex: 42" />
                    </div>
                    <div>
                      <Label>Bota (número)</Label>
                      <Input value={form.bootSize} onChange={e => setForm(f => ({ ...f, bootSize: e.target.value }))} placeholder="ex: 42" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                  {isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Cadastrar Colaborador"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum colaborador cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Colaborador" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collaborators.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[c.role] || "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[c.role] || c.role}
                    </span>
                    <div className="mt-2 space-y-1">
                      {c.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </p>
                      )}
                      {c.city && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {c.city}{c.state ? `, ${c.state}` : ""}
                        </p>
                      )}
                      {c.cpf && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> {c.cpf}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {c.faceDescriptor ? (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        ✓ Biometria
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-gray-400">
                        Sem biometria
                      </Badge>
                    )}
                    <Badge variant={c.active ? "default" : "secondary"} className={`text-xs ${c.active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}`}>
                      {c.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
