// @ts-nocheck
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, ShoppingCart, AlertTriangle, Clock, CheckCircle2, Package,
  ExternalLink, Image, Trash2, ChevronRight, Filter, X, Paperclip
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  lida: 'Visualizado',
  analisando: 'Analisando',
  comprando: 'Comprando',
  aprovada: 'Aprovada',
  comprada: 'Comprada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
  negada: 'Rejeitado',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lida: 'bg-blue-100 text-blue-800 border-blue-200',
  aprovada: 'bg-green-100 text-green-800 border-green-200',
  comprada: 'bg-purple-100 text-purple-800 border-purple-200',
  recebida: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
  negada: 'bg-red-100 text-red-800 border-red-200',
  analisando: 'bg-amber-100 text-amber-800 border-amber-200',
  comprando: 'bg-purple-100 text-purple-800 border-purple-200',
};

const URGENCY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

const URGENCY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};

const URGENCY_ICONS: Record<string, React.ReactNode> = {
  baixa: <Clock className="w-3 h-3" />,
  media: <Clock className="w-3 h-3" />,
  alta: <AlertTriangle className="w-3 h-3" />,
  critica: <AlertTriangle className="w-3 h-3" />,
};

interface NewItem {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

export default function PurchaseRequestsPage() {
  const [, setLocation] = useLocation();
  
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [urgency, setUrgency] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewItem[]>([{ name: '', quantity: '1', unit: 'un', notes: '' }]);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);

  const { data: requests, isLoading } = trpc.purchaseRequests.list.useQuery();
  const { data: categories } = trpc.purchaseCategories.list.useQuery();
  const { data: equipmentList } = trpc.cargoLoads.listTrucks.useQuery();

  const createMutation = trpc.purchaseRequests.create.useMutation({
    onSuccess: async (data) => {
      // Upload pending images
      for (const img of pendingImages) {
        const base64 = await fileToBase64(img.file);
        await uploadImageMutation.mutateAsync({
          id: data.id,
          imageBase64: base64,
          mimeType: img.file.type,
        });
      }
      utils.purchaseRequests.list.invalidate();
      toast.success("Solicitação criada com sucesso!");
      resetForm();
    },
    onError: (err) => toast.error("Erro ao criar solicitação: " + err.message),
  });

  const uploadImageMutation = trpc.purchaseRequests.uploadImage.useMutation();

  const deleteMutation = trpc.purchaseRequests.delete.useMutation({
    onSuccess: () => {
      utils.purchaseRequests.list.invalidate();
      toast.success("Solicitação excluída");
    },
  });

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function resetForm() {
    setTitle(''); setDescription(''); setLinkUrl(''); setCategoryId('');
    setUrgency('media'); setNotes('');
    setItems([{ name: '', quantity: '1', unit: 'un', notes: '' }]);
    setPendingImages([]);
    setShowForm(false);
  }

  function addItem() {
    setItems(prev => [...prev, { name: '', quantity: '1', unit: 'un', notes: '' }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof NewItem, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingImages(prev => [...prev, ...newImages]);
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Informe o título da solicitação");
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    createMutation.mutate({
      title,
      description: description || undefined,
      linkUrl: linkUrl || undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      equipmentId: equipmentId ? parseInt(equipmentId) : undefined,
      urgency,
      notes: notes || undefined,
      items: validItems,
    });
  }

  const filtered = (requests || []).filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    if (filterCategory !== 'all' && String(r.categoryId) !== filterCategory) return false;
    if (filterEquipment !== 'all' && String(r.equipmentId || '') !== filterEquipment) return false;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      const hay = `${r.title || ''} ${r.description || ''} ${r.equipmentName || ''} ${r.categoryName || ''} ${r.requestedByName || ''}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  const pendingCount = (requests || []).filter(r => r.status === 'pendente').length;
  const criticalCount = (requests || []).filter(r => r.urgency === 'critica').length;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Solicitações de Compras
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie pedidos de peças e materiais</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Solicitação
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
            <div className="text-xs text-yellow-600">Pendentes</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
            <div className="text-xs text-red-600">Críticas</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{(requests || []).length}</div>
            <div className="text-xs text-green-600">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUrgency} onValueChange={setFilterUrgency}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda urgência</SelectItem>
                {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {(categories || []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEquipment} onValueChange={setFilterEquipment}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos equipamentos</SelectItem>
                {(equipmentList || []).map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}{e.licensePlate ? ` (${e.licensePlate})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar..."
              className="w-40 h-8 text-xs"
            />
            {(filterStatus !== 'all' || filterUrgency !== 'all' || filterCategory !== 'all' || filterEquipment !== 'all' || searchText.trim()) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                setFilterStatus('all'); setFilterUrgency('all'); setFilterCategory('all'); setFilterEquipment('all'); setSearchText('');
              }}>
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">Nenhuma solicitação encontrada</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeira solicitação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-green-700 text-white">
                  <th className="px-3 py-2 text-left text-xs font-semibold">Cód.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Prioridade</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Solicitação</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Itens</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Fotos</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Link</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Equipamento</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Solicitante</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Data solicitação</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Responsável</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Data compra</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Entrega prevista</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Recebido em</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Observações</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const urgencyOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
                  return (
                    <tr
                      key={req.id}
                      className="border-b hover:bg-green-50/60 cursor-pointer"
                      onClick={() => setLocation(`/compras/${req.id}`)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-green-700">#{req.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge className={`text-xs px-2 py-0.5 flex items-center gap-1 w-fit ${URGENCY_COLORS[req.urgency]}`}>
                          {URGENCY_ICONS[req.urgency]}
                          {URGENCY_LABELS[req.urgency]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{req.title}</div>
                        {req.description && <div className="text-xs text-gray-500 line-clamp-1">{req.description}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{(req.items && req.items.length > 0) ? req.items.map((it: any) => `${it.quantity} ${it.unit} ${it.name}`).join('; ') : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{(() => { try { const imgs = req.images ? JSON.parse(req.images) : []; return imgs.length > 0 ? `${imgs.length} foto(s)` : '—'; } catch { return '—'; } })()}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.linkUrl ? <a href={req.linkUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline">Abrir</a> : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {req.equipmentName ? `${req.equipmentName}${req.equipmentPlate ? ` (${req.equipmentPlate})` : ''}` : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.categoryName || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.requestedByName || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.requestDate ? new Date(req.requestDate).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge className={`text-xs px-2 py-0.5 border ${STATUS_COLORS[req.status]}`}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.respondedByName || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.purchaseDate ? new Date(req.purchaseDate).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.expectedArrival ? new Date(req.expectedArrival).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{req.receivedDate ? new Date(req.receivedDate).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] truncate">{req.notes || '—'}</td>
                      <td className="px-3 py-2 text-right"><ChevronRight className="w-4 h-4 text-gray-300 inline" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              Nova Solicitação de Compra
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Óleo motor trator" />
            </div>

            {/* Category + Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgência</Label>
                <Select value={urgency} onValueChange={(v: any) => setUrgency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="critica">🔴 Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Equipment (optional) */}
            <div>
              <Label>Equipamento (opcional)</Label>
              <Select value={equipmentId} onValueChange={setEquipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a um equipamento..." />
                </SelectTrigger>
                <SelectContent>
                  {(equipmentList || []).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}{e.licensePlate ? ` (${e.licensePlate})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">Se a compra for para um equipamento específico (caminhão, trator, motosserra), selecione aqui.</p>
            </div>
            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes sobre o que precisa ser comprado..." rows={2} />
            </div>

            {/* Link URL */}
            <div>
              <Label className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Link do produto (opcional)
              </Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." type="url" />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens solicitados</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder="Nome do item"
                        className="mb-1 h-8 text-sm"
                      />
                      <div className="flex gap-1">
                        <Input
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          placeholder="Qtd"
                          className="w-16 h-7 text-xs"
                        />
                        <Input
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                          placeholder="Un"
                          className="w-16 h-7 text-xs"
                        />
                        <Input
                          value={item.notes}
                          onChange={e => updateItem(idx, 'notes', e.target.value)}
                          placeholder="Observação"
                          className="flex-1 h-7 text-xs"
                        />
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            <div>
              <Label className="flex items-center gap-1">
                <Image className="w-3 h-3" /> Fotos / Imagens
              </Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-4 h-4 mr-2" /> Anexar fotos
                </Button>
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img.preview} className="w-16 h-16 object-cover rounded border" alt="" />
                        <button
                          type="button"
                          onClick={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? 'Salvando...' : 'Criar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
