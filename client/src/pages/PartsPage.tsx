import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Package, Plus, Search, AlertTriangle, ShoppingCart, CheckCircle, XCircle, Camera, Image as ImageIcon } from "lucide-react";

type ActiveTab = "estoque" | "solicitacoes";

const URGENCY_COLORS: Record<string, string> = {
  baixa: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-blue-100 text-blue-800",
  rejeitado: "bg-red-100 text-red-800",
  comprado: "bg-purple-100 text-purple-800",
  entregue: "bg-green-100 text-green-800",
};

export default function PartsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("estoque");
  const [search, setSearch] = useState("");
  const [isPartOpen, setIsPartOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [editPartId, setEditPartId] = useState<number | null>(null);

  const [partForm, setPartForm] = useState({
    code: "", name: "", category: "", unit: "un", stockQuantity: "0",
    minStock: "0", unitCost: "", supplier: "", notes: "",
  });
  const [partPhotoBase64, setPartPhotoBase64] = useState<string | null>(null);
  const [partPhotoPreview, setPartPhotoPreview] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState({
    partName: "", quantity: "1", urgency: "media" as "baixa" | "media" | "alta",
    equipmentName: "", reason: "", estimatedCost: "",
  });

  const utils = trpc.useUtils();
  const { data: partsList = [], isLoading: loadingParts } = trpc.parts.listParts.useQuery({ search: search || undefined });
  const { data: requests = [], isLoading: loadingRequests } = trpc.parts.listRequests.useQuery({});
  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});

  const createPartMutation = trpc.parts.createPart.useMutation({
    onSuccess: () => { toast.success("Peça cadastrada!"); utils.parts.listParts.invalidate(); setIsPartOpen(false); resetPartForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updatePartMutation = trpc.parts.updatePart.useMutation({
    onSuccess: () => { toast.success("Peça atualizada!"); utils.parts.listParts.invalidate(); setIsPartOpen(false); setEditPartId(null); resetPartForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deletePartMutation = trpc.parts.deletePart.useMutation({
    onSuccess: () => { toast.success("Peça removida!"); utils.parts.listParts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createRequestMutation = trpc.parts.createRequest.useMutation({
    onSuccess: () => { toast.success("Solicitação enviada!"); utils.parts.listRequests.invalidate(); setIsRequestOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.parts.updateRequestStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.parts.listRequests.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetPartForm = () => {
    setPartForm({ code: "", name: "", category: "", unit: "un", stockQuantity: "0", minStock: "0", unitCost: "", supplier: "", notes: "" });
    setPartPhotoBase64(null);
    setPartPhotoPreview(null);
  };

  const openEditPart = (p: any) => {
    setEditPartId(p.id);
    setPartForm({
      code: p.code || "", name: p.name, category: p.category || "",
      unit: p.unit || "un", stockQuantity: String(p.stockQuantity || 0),
      minStock: String(p.minStock || 0), unitCost: p.unitCost || "",
      supplier: p.supplier || "", notes: p.notes || "",
    });
    setPartPhotoBase64(null);
    setPartPhotoPreview(p.photoUrl || null);
    setIsPartOpen(true);
  };

  // Abre seletor de arquivo de forma segura no mobile
  const openPhotoPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // câmera traseira no mobile
    input.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(input);
    const cleanup = () => {
      setTimeout(() => { try { if (document.body.contains(input)) document.body.removeChild(input); } catch {} }, 300);
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 5MB."); cleanup(); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          setPartPhotoBase64(base64);
          setPartPhotoPreview(base64);
        };
        reader.readAsDataURL(file);
      }
      cleanup();
    });
    input.addEventListener("cancel", cleanup);
    setTimeout(cleanup, 60000);
    input.click();
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      code: partForm.code || undefined,
      name: partForm.name,
      category: partForm.category || undefined,
      unit: partForm.unit,
      stockQuantity: parseInt(partForm.stockQuantity) || 0,
      minStock: parseInt(partForm.minStock) || 0,
      unitCost: partForm.unitCost || undefined,
      supplier: partForm.supplier || undefined,
      notes: partForm.notes || undefined,
      photoBase64: partPhotoBase64 || undefined,
    };
    if (editPartId) updatePartMutation.mutate({ id: editPartId, ...data });
    else createPartMutation.mutate(data);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequestMutation.mutate({
      partName: requestForm.partName,
      quantity: parseInt(requestForm.quantity),
      urgency: requestForm.urgency,
      equipmentName: requestForm.equipmentName || undefined,
      reason: requestForm.reason || undefined,
      estimatedCost: requestForm.estimatedCost || undefined,
    });
  };

  const lowStockCount = partsList.filter((p: any) => p.stockQuantity <= (p.minStock || 0)).length;
  const pendingRequests = requests.filter((r: any) => r.status === "pendente").length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Package className="h-7 w-7" /> Peças e Acessórios
          </h1>
          <p className="text-gray-500 text-sm mt-1">Estoque e solicitações de peças</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "estoque" && (
            <Button onClick={() => { setEditPartId(null); resetPartForm(); setIsPartOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Nova Peça
            </Button>
          )}
          {activeTab === "solicitacoes" && (
            <Button onClick={() => setIsRequestOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <ShoppingCart className="h-4 w-4" /> Nova Solicitação
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{partsList.length}</p>
          <p className="text-xs text-gray-500">Peças cadastradas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          <p className="text-xs text-gray-500">Estoque baixo</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingRequests}</p>
          <p className="text-xs text-gray-500">Solicitações pendentes</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["estoque", "solicitacoes"] as ActiveTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab === "estoque" ? <Package className="h-4 w-4 inline mr-1" /> : <ShoppingCart className="h-4 w-4 inline mr-1" />}
            {tab === "estoque" ? "Estoque" : "Solicitações"}
          </button>
        ))}
      </div>

      {/* Search (estoque only) */}
      {activeTab === "estoque" && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar peça..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      )}

      {/* Estoque */}
      {activeTab === "estoque" && (
        loadingParts ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : partsList.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma peça cadastrada</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Peça</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estoque</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden lg:table-cell">Custo Unit.</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
              </tr></thead>
              <tbody>
                {partsList.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        {p.stockQuantity <= (p.minStock || 0) && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-800">{p.name}</p>
                          {p.code && <p className="text-xs text-gray-400">#{p.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">{p.category || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${p.stockQuantity <= (p.minStock || 0) ? "text-red-600" : "text-emerald-700"}`}>
                        {p.stockQuantity} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 hidden lg:table-cell">{p.unitCost ? `R$ ${p.unitCost}` : "—"}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" onClick={() => openEditPart(p)} className="text-emerald-700 hover:bg-emerald-50">Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Solicitações */}
      {activeTab === "solicitacoes" && (
        loadingRequests ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma solicitação</p></div>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{r.partName}</span>
                        <Badge className={`text-xs ${URGENCY_COLORS[r.urgency]}`}>{r.urgency}</Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Qtd: {r.quantity} · {r.equipmentName || "Sem equipamento"} · {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      {r.reason && <p className="text-xs text-gray-400 mt-1">{r.reason}</p>}
                    </div>
                    {r.status === "pendente" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "aprovado" })}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "rejeitado" })}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {r.status === "aprovado" && (
                      <Button size="sm" variant="ghost" className="text-purple-600 hover:bg-purple-50" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "comprado" })}>
                        <ShoppingCart className="h-4 w-4 mr-1" />Comprado
                      </Button>
                    )}
                    {r.status === "comprado" && (
                      <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "entregue" })}>
                        <CheckCircle className="h-4 w-4 mr-1" />Entregue
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Sheet - Peça */}
      <Sheet open={isPartOpen} onOpenChange={(v) => { setIsPartOpen(v); if (!v) { setEditPartId(null); resetPartForm(); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle className="text-emerald-800">{editPartId ? "Editar Peça" : "Nova Peça"}</SheetTitle></SheetHeader>
          <form onSubmit={handlePartSubmit} className="space-y-4 pb-8">
            {/* Foto da peça */}
            <div>
              <Label>Foto da Peça</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                  {partPhotoPreview ? (
                    <img src={partPhotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openPhotoPicker} className="gap-1.5 text-xs">
                    <Camera className="h-3.5 w-3.5" /> Câmera / Galeria
                  </Button>
                  {partPhotoPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setPartPhotoBase64(null); setPartPhotoPreview(null); }} className="text-red-500 text-xs">
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={partForm.code} onChange={e => setPartForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: FLT-001" /></div>
              <div><Label>Nome *</Label><Input value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome da peça" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={partForm.category} onChange={e => setPartForm(f => ({ ...f, category: e.target.value }))} placeholder="ex: Filtros, Correias..." /></div>
              <div><Label>Unidade</Label><Input value={partForm.unit} onChange={e => setPartForm(f => ({ ...f, unit: e.target.value }))} placeholder="un, L, kg..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estoque Atual</Label><Input type="number" value={partForm.stockQuantity} onChange={e => setPartForm(f => ({ ...f, stockQuantity: e.target.value }))} /></div>
              <div><Label>Estoque Mínimo</Label><Input type="number" value={partForm.minStock} onChange={e => setPartForm(f => ({ ...f, minStock: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo Unitário (R$)</Label><Input value={partForm.unitCost} onChange={e => setPartForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0,00" /></div>
              <div><Label>Fornecedor</Label><Input value={partForm.supplier} onChange={e => setPartForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome" /></div>
            </div>
            <div><Label>Observações</Label><textarea value={partForm.notes} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPartOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createPartMutation.isPending || updatePartMutation.isPending}>
                {createPartMutation.isPending || updatePartMutation.isPending ? "Salvando..." : editPartId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet - Solicitação */}
      <Sheet open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle className="text-emerald-800">Nova Solicitação de Peça</SheetTitle></SheetHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4 pb-8">
            <div><Label>Peça / Material *</Label><Input value={requestForm.partName} onChange={e => setRequestForm(f => ({ ...f, partName: e.target.value }))} required placeholder="Nome da peça ou material" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade *</Label><Input type="number" min="1" value={requestForm.quantity} onChange={e => setRequestForm(f => ({ ...f, quantity: e.target.value }))} required /></div>
              <div>
                <Label>Urgência *</Label>
                <select value={requestForm.urgency} onChange={e => setRequestForm(f => ({ ...f, urgency: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Equipamento</Label>
              <select value={requestForm.equipmentName} onChange={e => setRequestForm(f => ({ ...f, equipmentName: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione (opcional)</option>
                {equipmentList.map((eq: any) => (
                  <option key={eq.id} value={eq.name}>{eq.name}</option>
                ))}
              </select>
            </div>
            <div><Label>Motivo / Justificativa</Label><textarea value={requestForm.reason} onChange={e => setRequestForm(f => ({ ...f, reason: e.target.value }))} className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Por que precisa desta peça?" /></div>
            <div><Label>Custo Estimado (R$)</Label><Input value={requestForm.estimatedCost} onChange={e => setRequestForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="0,00" /></div>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRequestOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
