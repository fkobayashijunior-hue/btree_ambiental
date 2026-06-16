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
  lida: 'Lida',
  aprovada: 'Aprovada',
  comprada: 'Comprada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lida: 'bg-blue-100 text-blue-800 border-blue-200',
  aprovada: 'bg-green-100 text-green-800 border-green-200',
  comprada: 'bg-purple-100 text-purple-800 border-purple-200',
  recebida: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
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

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [urgency, setUrgency] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewItem[]>([{ name: '', quantity: '1', unit: 'un', notes: '' }]);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);

  const { data: requests, isLoading } = trpc.purchaseRequests.list.useQuery();
  const { data: categories } = trpc.purchaseCategories.list.useQuery();

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
      urgency,
      notes: notes || undefined,
      items: validItems,
    });
  }

  const filtered = (requests || []).filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    if (filterCategory !== 'all' && String(r.categoryId) !== filterCategory) return false;
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
            {(filterStatus !== 'all' || filterUrgency !== 'all' || filterCategory !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                setFilterStatus('all'); setFilterUrgency('all'); setFilterCategory('all');
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
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma solicitação encontrada</p>
          <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeira solicitação
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const imgs: string[] = req.images ? JSON.parse(req.images) : [];
            return (
              <Card
                key={req.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: req.urgency === 'critica' ? '#ef4444' : req.urgency === 'alta' ? '#f97316' : req.urgency === 'media' ? '#eab308' : '#9ca3af' }}
                onClick={() => setLocation(`/compras/${req.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">{req.title}</span>
                        <Badge className={`text-xs px-2 py-0.5 border ${STATUS_COLORS[req.status]}`}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                        <Badge className={`text-xs px-2 py-0.5 flex items-center gap-1 ${URGENCY_COLORS[req.urgency]}`}>
                          {URGENCY_ICONS[req.urgency]}
                          {URGENCY_LABELS[req.urgency]}
                        </Badge>
                        {req.categoryName && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: req.categoryColor || '#ccc', color: req.categoryColor || '#666' }}>
                            {req.categoryName}
                          </Badge>
                        )}
                      </div>
                      {req.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{req.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Solicitado: {req.requestDate ? new Date(req.requestDate).toLocaleDateString('pt-BR') : '-'}</span>
                        {req.linkUrl && <ExternalLink className="w-3 h-3" />}
                        {imgs.length > 0 && <span className="flex items-center gap-1"><Image className="w-3 h-3" />{imgs.length}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
