import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { UserPlus, Search, Camera, Users, Eye, EyeOff, Lock, ChevronDown, ChevronUp, ImagePlus, X, FileText, Link2, Unlink } from "lucide-react";

// Comprime imagem para máx 800px e qualidade 0.8 (reduz tamanho do base64)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
  name: string; email: string; phone: string; cpf: string;
  address: string; city: string; state: string; zipCode: string;
  role: string; pixKey: string; dailyRate: string;
  employmentType: string; shirtSize: string; pantsSize: string;
  shoeSize: string; bootSize: string; photoBase64: string;
  password: string; linkedUserId: number | null;
};

const emptyForm: FormData = {
  name: "", email: "", phone: "", cpf: "",
  address: "", city: "", state: "", zipCode: "",
  role: "operador", pixKey: "", dailyRate: "",
  employmentType: "diarista", shirtSize: "", pantsSize: "",
  shoeSize: "", bootSize: "", photoBase64: "", password: "",
  linkedUserId: null,
};

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

export default function Collaborators() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [openSections, setOpenSections] = useState({ pessoal: true, endereco: false, epi: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm(f => ({ ...f, photoBase64: compressed }));
    } catch {
      toast.error("Erro ao processar imagem");
    }
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      cpf: form.cpf || undefined,
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
      password: form.password || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Query de usuários disponíveis para vincular
  const { data: availableUsers = [] } = trpc.collaborators.listAvailableUsers.useQuery(undefined, {
    enabled: isOpen && editId !== null,
  });

  // Mutation para vincular/desvincular usuário
  const linkUserMutation = trpc.collaborators.linkUser.useMutation({
    onSuccess: () => {
      toast.success("Vínculo atualizado!");
      utils.collaborators.list.invalidate();
      utils.collaborators.listAvailableUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name || "", email: c.email || "", phone: c.phone || "",
      cpf: c.cpf || "", address: c.address || "",
      city: c.city || "", state: c.state || "", zipCode: c.zipCode || "",
      role: c.role || "operador", pixKey: c.pixKey || "", dailyRate: c.dailyRate || "",
      employmentType: c.employmentType || "diarista", shirtSize: c.shirtSize || "",
      pantsSize: c.pantsSize || "", shoeSize: c.shoeSize || "", bootSize: c.bootSize || "",
      photoBase64: "", password: "",
      linkedUserId: c.userId || null,
    });
    setOpenSections({ pessoal: true, endereco: false, epi: false });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpenSections({ pessoal: true, endereco: false, epi: false });
    setIsOpen(true);
  };

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
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
                    <Badge className={`text-xs mt-1 ${ROLE_COLORS[c.role] || "bg-gray-100 text-gray-800"}`}>
                      {ROLE_LABELS[c.role] || c.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline" size="sm" className="flex-1 text-xs"
                    onClick={() => openEdit(c)}
                  >
                    Editar
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

      {/* Sheet (painel lateral) — sem Dialog+Tabs para evitar bug removeChild */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">
              {editId ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">

            {/* ===== DADOS PESSOAIS ===== */}
            <SectionTitle
              icon={<span>👤</span>}
              title="Dados Pessoais"
              open={openSections.pessoal}
              onToggle={() => toggleSection("pessoal")}
            />
            {openSections.pessoal && (
              <div className="space-y-4 px-1">
                {/* Foto */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center overflow-hidden bg-emerald-50">
                      {form.photoBase64 ? (
                        <img src={form.photoBase64} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Camera className="h-7 w-7 text-emerald-400 mx-auto" />
                          <span className="text-xs text-emerald-500 mt-0.5 block">Foto</span>
                        </div>
                      )}
                    </div>
                    {form.photoBase64 && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, photoBase64: "" }))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5" /> Tirar Foto
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="h-3.5 w-3.5" /> Galeria
                    </Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </div>

                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome completo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Senha de Acesso ao Sistema</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={editId ? "Deixe em branco para manter" : "Senha para login"}
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
                  <Label>Função</Label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ===== ENDEREÇO ===== */}
            <SectionTitle
              icon={<span>📍</span>}
              title="Endereço"
              open={openSections.endereco}
              onToggle={() => toggleSection("endereco")}
            />
            {openSections.endereco && (
              <div className="space-y-4 px-1">
                <div>
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="SP" maxLength={2} />
                  </div>
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" />
                </div>
              </div>
            )}

            {/* ===== EPI & TRABALHO ===== */}
            <SectionTitle
              icon={<span>🦺</span>}
              title="EPI & Trabalho"
              open={openSections.epi}
              onToggle={() => toggleSection("epi")}
            />
            {openSections.epi && (
              <div className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Chave PIX</Label>
                    <Input value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} placeholder="CPF, email ou telefone" />
                  </div>
                  <div>
                    <Label>Diária (R$)</Label>
                    <Input type="number" step="0.01" value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))} placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Vínculo</Label>
                  <select
                    value={form.employmentType}
                    onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="diarista">Diarista</option>
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="terceirizado">Terceirizado</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">🦺 Tamanhos para EPI</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Camisa</Label>
                      <select
                        value={form.shirtSize}
                        onChange={e => setForm(f => ({ ...f, shirtSize: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione</option>
                        {["PP", "P", "M", "G", "GG", "XGG"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Calça (nº)</Label>
                      <Input value={form.pantsSize} onChange={e => setForm(f => ({ ...f, pantsSize: e.target.value }))} placeholder="ex: 42" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Calçado (nº)</Label>
                      <Input value={form.shoeSize} onChange={e => setForm(f => ({ ...f, shoeSize: e.target.value }))} placeholder="ex: 42" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Bota (nº)</Label>
                      <Input value={form.bootSize} onChange={e => setForm(f => ({ ...f, bootSize: e.target.value }))} placeholder="ex: 43" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== VINCULAR USUÁRIO (apenas na edição) ===== */}
            {editId && (
              <div className="space-y-3 px-1">
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-blue-50 text-blue-800 font-semibold text-sm">
                  <Link2 className="h-4 w-4" />
                  Vincular Usuário do Sistema
                </div>
                <div className="px-1">
                  <p className="text-xs text-gray-500 mb-2">Vincule este colaborador a um usuário para que ele acesse o sistema com as permissões corretas.</p>
                  <select
                    value={form.linkedUserId ?? 0}
                    onChange={e => {
                      const uid = parseInt(e.target.value) || null;
                      setForm(f => ({ ...f, linkedUserId: uid }));
                      if (editId) {
                        linkUserMutation.mutate({ collaboratorId: editId, userId: uid });
                      }
                    }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={0}>Nenhum usuário vinculado</option>
                    {availableUsers.map((u: any) => (
                      <option key={u.id} value={u.id} disabled={u.isLinked && u.id !== form.linkedUserId}>
                        {u.name} ({u.email}){u.isLinked && u.id !== form.linkedUserId ? " — já vinculado" : ""}
                      </option>
                    ))}
                  </select>
                  {form.linkedUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, linkedUserId: null }));
                        if (editId) linkUserMutation.mutate({ collaboratorId: editId, userId: null });
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <Unlink className="h-3 w-3" /> Desvincular usuário
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Cadastrar Colaborador"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
