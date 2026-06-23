import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Tag, TrendingDown, Clock, Building2, ChevronDown, ChevronUp,
  Pencil, Trash2, MessageCircle, Link2, Copy, Check, Send, User,
  Package, X, Eye, FileText, Phone, Mail, ExternalLink, Ban,
  Trophy, Star, AlertCircle, Zap, ShoppingCart, CheckCircle2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function fmtPrice(price: string) {
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtExpiry(expiresAt: number) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Expira em ${days}d ${hours}h`;
  return `Expira em ${hours}h`;
}

const PRESET_COLORS = [
  '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#10B981',
  '#F97316', '#EC4899', '#6B7280', '#14B8A6', '#84CC16',
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativa: { label: 'Ativa', color: 'bg-green-100 text-green-700 border-green-200' },
  respondida: { label: 'Respondida', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  expirada: { label: 'Expirada', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-500 border-red-200' },
};

// Dados da empresa
const COMPANY = {
  name: 'BTREE Ambiental',
  commercial: 'Fábio Jundy Kobayashi',
  phone: '(44) 98833-4679',
  whatsapp: '5544988334679',
  instagram: '@btree_ambiental',
  site: 'btreeambiental.com',
};

type QuotItem = { name: string; quantity: string; unit: string };
type ResponseItem = { name: string; quantity: string; unit?: string; price: string; brand?: string; notes?: string };

export default function QuotationsPage() {
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState('catalog');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProd, setExpandedProd] = useState<string | null>(null);

  // New quotation form
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [qSupplierId, setQSupplierId] = useState('');
  const [qCategoryId, setQCategoryId] = useState('');
  const [qProductName, setQProductName] = useState('');
  const [qUnit, setQUnit] = useState('un');
  const [qPrice, setQPrice] = useState('');
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qNotes, setQNotes] = useState('');

  // Category management
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');
  const [editCatId, setEditCatId] = useState<number | null>(null);

  // ===== SOLICITAÇÃO DE ORÇAMENTO =====
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqRequesterId, setReqRequesterId] = useState('');
  const [reqItems, setReqItems] = useState<QuotItem[]>([{ name: '', quantity: '1', unit: 'un' }]);
  const [reqNotes, setReqNotes] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [viewResponsesId, setViewResponsesId] = useState<number | null>(null);
  const [showAutoProcessConfirm, setShowAutoProcessConfirm] = useState(false);
  const [autoProcessUrgency, setAutoProcessUrgency] = useState<'baixa'|'media'|'alta'|'critica'>('media');
  const [autoProcessResult, setAutoProcessResult] = useState<null | { suppliersCreated: number; suppliersUpdated: number; categoryName: string; catalogEntriesCreated: number; purchaseRequestId: number }>(null);

  const { data: grouped, isLoading } = trpc.quotations.listByCategory.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery({ activeOnly: true });
  const { data: categories } = trpc.purchaseCategories.list.useQuery();
  const { data: collaborators } = trpc.collaborators.list.useQuery({});
  const { data: quotRequests, refetch: refetchRequests } = trpc.quotationRequests.list.useQuery();
  const { data: requestDetail } = trpc.quotationRequests.getById.useQuery(
    { id: viewResponsesId! },
    { enabled: viewResponsesId !== null }
  );

  const createQuoteMutation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      utils.quotations.listByCategory.invalidate();
      toast.success("Orçamento registrado!");
      resetQuoteForm();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteQuoteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.listByCategory.invalidate();
      toast.success("Orçamento excluído");
    },
  });

  const createCatMutation = trpc.purchaseCategories.create.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria criada!");
      resetCatForm();
    },
  });

  const updateCatMutation = trpc.purchaseCategories.update.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria atualizada!");
      resetCatForm();
    },
  });

  const deleteCatMutation = trpc.purchaseCategories.delete.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria excluída");
    },
  });

  const createRequestMutation = trpc.quotationRequests.create.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      setGeneratedId(data.id);
      refetchRequests();
      toast.success("Solicitação criada! Link gerado com sucesso.");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const cancelRequestMutation = trpc.quotationRequests.cancel.useMutation({
    onSuccess: () => {
      refetchRequests();
      toast.success("Solicitação cancelada");
    },
  });

  const autoProcessMutation = trpc.quotationRequests.autoProcess.useMutation({
    onSuccess: (data) => {
      setShowAutoProcessConfirm(false);
      setAutoProcessResult(data);
      utils.suppliers.list.invalidate();
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      refetchRequests();
    },
    onError: (err) => {
      setShowAutoProcessConfirm(false);
      toast.error("Erro ao processar: " + err.message);
    },
  });

  function resetQuoteForm() {
    setQSupplierId(''); setQCategoryId(''); setQProductName('');
    setQUnit('un'); setQPrice(''); setQNotes('');
    setQDate(new Date().toISOString().slice(0, 10));
    setShowQuoteForm(false);
  }

  function resetCatForm() {
    setCatName(''); setCatColor('#6B7280'); setEditCatId(null); setShowCatForm(false);
  }

  function resetRequestForm() {
    setReqTitle(''); setReqRequesterId('');
    setReqItems([{ name: '', quantity: '1', unit: 'un' }]);
    setReqNotes(''); setGeneratedToken(null); setGeneratedId(null);
    setShowRequestForm(false);
  }

  function handleSubmitQuote() {
    if (!qSupplierId || !qProductName || !qPrice) {
      toast.error("Preencha fornecedor, produto e preço");
      return;
    }
    createQuoteMutation.mutate({
      supplierId: parseInt(qSupplierId),
      categoryId: qCategoryId ? parseInt(qCategoryId) : undefined,
      productName: qProductName,
      unit: qUnit,
      price: qPrice,
      quotationDate: qDate + ' 00:00:00',
      notes: qNotes || undefined,
    });
  }

  function handleSubmitCat() {
    if (!catName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    if (editCatId) {
      updateCatMutation.mutate({ id: editCatId, name: catName, color: catColor });
    } else {
      createCatMutation.mutate({ name: catName, color: catColor });
    }
  }

  function addItem() {
    setReqItems([...reqItems, { name: '', quantity: '1', unit: 'un' }]);
  }

  function removeItem(idx: number) {
    setReqItems(reqItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof QuotItem, value: string) {
    setReqItems(reqItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function handleCreateRequest() {
    if (!reqTitle.trim()) { toast.error("Informe o título da solicitação"); return; }
    const validItems = reqItems.filter(i => i.name.trim());
    if (validItems.length === 0) { toast.error("Adicione ao menos um item"); return; }

    const requester = (collaborators || []).find(c => String(c.id) === reqRequesterId);
    createRequestMutation.mutate({
      title: reqTitle,
      requesterId: requester?.id,
      requesterName: requester?.name,
      requesterPhone: requester?.phone || undefined,
      requesterEmail: requester?.email || undefined,
      items: validItems,
      notes: reqNotes || undefined,
    });
  }

  function getPublicLink(token: string) {
    return `${window.location.origin}/orcamento/${token}`;
  }

  function buildWhatsAppMessage(token: string) {
    const requester = (collaborators || []).find(c => String(c.id) === reqRequesterId);
    const validItems = reqItems.filter(i => i.name.trim());
    const link = getPublicLink(token);
    const firstName = requester?.name ? requester.name.split(' ')[0] : 'a equipe BTREE Ambiental';

    let msg = `🌿 *${COMPANY.name}*\n`;
    msg += `📞 Contato Comercial: ${COMPANY.phone} · ${COMPANY.commercial}\n`;
    msg += `🌐 ${COMPANY.site}\n`;
    msg += `📸 Instagram: ${COMPANY.instagram}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Olá! Tudo bem? Aqui é o ${firstName} da BTREE Ambiental!!\n`;
    msg += `Eu gostaria de solicitar um orçamento! Segue abaixo:\n\n`;
    msg += `📋 *${reqTitle}*\n\n`;
    msg += `*Itens solicitados:*\n`;
    validItems.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} — ${item.quantity} ${item.unit}\n`;
    });
    if (reqNotes) msg += `\n📝 *Obs:* ${reqNotes}\n`;
    msg += `\nFavor mandar formulário de orçamento, ou se preferir preencha nosso formulário pelo link:\n${link}\n`;
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (requester) {
      msg += `*Solicitante:* ${requester.name}\n`;
      if (requester.phone) msg += `📱 ${requester.phone}\n`;
      if (requester.email) msg += `✉️ ${requester.email}\n`;
    }
    return msg;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicLink(token));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link copiado!");
  }

  async function copyMessage(token: string) {
    await navigator.clipboard.writeText(buildWhatsAppMessage(token));
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
    toast.success("Mensagem copiada!");
  }

  function openWhatsApp(token: string) {
    const msg = encodeURIComponent(buildWhatsAppMessage(token));
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-purple-600" />
            Orçamentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de preços e solicitações para fornecedores</p>
        </div>
        <Button onClick={() => setShowQuoteForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="catalog">Catálogo de Preços</TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <Send className="w-3 h-3" /> Solicitar
          </TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        {/* CATALOG TAB */}
        <TabsContent value="catalog" className="space-y-3 mt-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : !grouped || grouped.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum orçamento registrado</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowQuoteForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Registrar primeiro orçamento
              </Button>
            </div>
          ) : (
            grouped.map(cat => {
              const catKey = cat.categoryId?.toString() ?? 'sem_categoria';
              const isExpanded = expandedCat === catKey;
              return (
                <Card key={catKey} className="overflow-hidden">
                  <button className="w-full text-left" onClick={() => setExpandedCat(isExpanded ? null : catKey)}>
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                          <span className="font-semibold text-gray-900">{cat.categoryName}</span>
                          <Badge variant="outline" className="text-xs">{cat.products.length} produto(s)</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </CardHeader>
                  </button>
                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-3">
                      {cat.products.map(prod => {
                        const prodKey = `${catKey}-${prod.productName}`;
                        const isProdExpanded = expandedProd === prodKey;
                        const latestQuote = prod.quotes.reduce((latest, q) =>
                          q.quotationDate > latest.quotationDate ? q : latest, prod.quotes[0]);
                        return (
                          <div key={prod.productName} className="border rounded-lg overflow-hidden">
                            <button
                              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                              onClick={() => setExpandedProd(isProdExpanded ? null : prodKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-800">{prod.productName}</span>
                                  {prod.unit && <span className="text-xs text-gray-400 ml-1">/ {prod.unit}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3 text-green-500" />
                                      <span className="text-sm font-bold text-green-700">{fmtPrice(prod.lowestPrice)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">menor preço</div>
                                  </div>
                                  {isProdExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                              </div>
                            </button>
                            {isProdExpanded && (
                              <div className="divide-y">
                                {prod.quotes.map((q) => {
                                  const isLowest = q.price === prod.lowestPrice;
                                  const isLatest = q.id === latestQuote?.id;
                                  return (
                                    <div key={q.id} className={`p-3 flex items-center justify-between ${isLowest ? 'bg-green-50' : ''}`}>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-3 h-3 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-700">{q.supplierName}</span>
                                          {isLowest && <Badge className="text-xs bg-green-100 text-green-700 border-green-200"><TrendingDown className="w-2 h-2 mr-1" /> Menor</Badge>}
                                          {isLatest && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-2 h-2 mr-1" /> Último</Badge>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className={`text-sm font-bold ${isLowest ? 'text-green-700' : 'text-gray-700'}`}>{fmtPrice(q.price)}</span>
                                          <span className="text-xs text-gray-400">{fmt(q.quotationDate)}</span>
                                          {q.supplierPhone && <a href={`tel:${q.supplierPhone}`} className="text-xs text-blue-500 hover:underline">{q.supplierPhone}</a>}
                                          {q.supplierWhatsapp && (
                                            <a href={`https://wa.me/55${q.supplierWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:underline">WhatsApp</a>
                                          )}
                                        </div>
                                        {q.notes && <p className="text-xs text-gray-400 mt-0.5">{q.notes}</p>}
                                      </div>
                                      <Button variant="ghost" size="sm" onClick={() => deleteQuoteMutation.mutate({ id: q.id })} className="text-red-300 hover:text-red-500 p-1">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* SOLICITAR ORÇAMENTO TAB */}
        <TabsContent value="requests" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Crie solicitações para enviar a fornecedores via WhatsApp ou link</p>
            <Button size="sm" onClick={() => setShowRequestForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-3 h-3 mr-1" /> Nova Solicitação
            </Button>
          </div>

          {/* Lista de solicitações */}
          {!quotRequests || quotRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma solicitação criada</p>
              <p className="text-xs mt-1">Crie uma solicitação para gerar mensagem WhatsApp ou link para fornecedores</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowRequestForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeira solicitação
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {quotRequests.map(req => {
                const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.ativa;
                const expired = req.isExpired;
                return (
                  <Card key={req.id} className={expired && req.status === 'ativa' ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 truncate">{req.title}</span>
                            <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                            {expired && req.status === 'ativa' && (
                              <Badge className="text-xs bg-orange-100 text-orange-600 border-orange-200">Expirado</Badge>
                            )}
                          </div>
                          {req.requesterName && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              <span>{req.requesterName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                            <Package className="w-3 h-3" />
                            <span>{req.items.length} item(s)</span>
                            <span className="mx-1">·</span>
                            <span>{fmt(req.createdAt)}</span>
                            {!expired && req.status === 'ativa' && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-amber-600">{fmtExpiry(req.expiresAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewResponsesId(req.id)}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Ver respostas"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {req.status === 'ativa' && !expired && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLink(req.token)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Copiar link"
                              >
                                <Link2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWhatsApp(req.token)}
                                className="text-green-500 hover:text-green-700 p-1"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {req.status === 'ativa' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelRequestMutation.mutate({ id: req.id })}
                              className="text-red-300 hover:text-red-500 p-1"
                              title="Cancelar"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Gerencie os tipos de produtos</p>
            <Button size="sm" onClick={() => { setCatName(''); setCatColor('#6B7280'); setEditCatId(null); setShowCatForm(true); }} className="bg-gray-700 hover:bg-gray-800">
              <Plus className="w-3 h-3 mr-1" /> Nova Categoria
            </Button>
          </div>
          <div className="space-y-2">
            {(categories || []).map(cat => (
              <Card key={cat.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setCatName(cat.name); setCatColor(cat.color); setEditCatId(cat.id); setShowCatForm(true); }} className="text-blue-400 hover:text-blue-600 p-1">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteCatMutation.mutate({ id: cat.id })} className="text-red-300 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG: NOVA SOLICITAÇÃO DE ORÇAMENTO ===== */}
      <Dialog open={showRequestForm} onOpenChange={(open) => { if (!open) resetRequestForm(); else setShowRequestForm(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              {generatedToken ? 'Solicitação Criada!' : 'Nova Solicitação de Orçamento'}
            </DialogTitle>
          </DialogHeader>

          {!generatedToken ? (
            <div className="space-y-4">
              {/* Título */}
              <div>
                <Label>Título da Solicitação *</Label>
                <Input value={reqTitle} onChange={e => setReqTitle(e.target.value)} placeholder="Ex: Orçamento de Óleos e Filtros — Junho/2026" />
              </div>

              {/* Solicitante */}
              <div>
                <Label>Solicitante (Colaborador)</Label>
                <Select value={reqRequesterId} onValueChange={setReqRequesterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(collaborators || []).filter(c => c.active !== 0).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reqRequesterId && (() => {
                  const c = (collaborators || []).find(x => String(x.id) === reqRequesterId);
                  return c ? (
                    <div className="mt-1 text-xs text-gray-500 flex gap-3">
                      {c.phone && <span>📱 {c.phone}</span>}
                      {c.email && <span>✉️ {c.email}</span>}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Itens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Itens Solicitados *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {reqItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          placeholder={`Item ${idx + 1} — Ex: Óleo Motor 15W40`}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          placeholder="Qtd"
                        />
                      </div>
                      <div className="w-16">
                        <Input
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                          placeholder="un"
                        />
                      </div>
                      {reqItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 mt-0.5">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label>Observações</Label>
                <Textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} placeholder="Condições especiais, prazo de entrega, etc." rows={2} />
              </div>

              {/* Preview da mensagem */}
              {reqTitle && reqItems.some(i => i.name.trim()) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Preview da Mensagem WhatsApp
                  </p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {(() => {
                      const r = (collaborators || []).find(c => String(c.id) === reqRequesterId);
                      const fn = r?.name ? r.name.split(' ')[0] : 'a equipe BTREE Ambiental';
                      return `🌿 *${COMPANY.name}*\n📞 Contato Comercial: ${COMPANY.phone} · ${COMPANY.commercial}\n🌐 ${COMPANY.site}\n📸 Instagram: ${COMPANY.instagram}\n━━━━━━━━━━━━━━━━━━━━\n\nOlá! Tudo bem? Aqui é o ${fn} da BTREE Ambiental!!\nEu gostaria de solicitar um orçamento! Segue abaixo:\n\n📋 *${reqTitle}*\n\n*Itens solicitados:*\n${reqItems.filter(i => i.name.trim()).map((item, idx) => `${idx + 1}. ${item.name} — ${item.quantity} ${item.unit}`).join('\n')}\n\nFavor mandar formulário de orçamento, ou se preferir preencha nosso formulário pelo link:\n[link será gerado ao criar]`;
                    })()}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* ===== RESULTADO APÓS CRIAÇÃO ===== */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Check className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">Solicitação criada com sucesso!</p>
                <p className="text-sm text-green-600 mt-1">Compartilhe o link com o fornecedor</p>
              </div>

              {/* Link público */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <Link2 className="w-4 h-4 text-blue-500" /> Link para o Fornecedor
                </Label>
                <div className="flex gap-2">
                  <Input value={getPublicLink(generatedToken)} readOnly className="text-xs bg-gray-50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(generatedToken)}
                    className="flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">O fornecedor acessa este link, vê os itens e preenche o orçamento sem precisar de login</p>
              </div>

              {/* Mensagem WhatsApp */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <MessageCircle className="w-4 h-4 text-green-500" /> Mensagem WhatsApp
                </Label>
                <div className="bg-gray-50 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {buildWhatsAppMessage(generatedToken)}
                  </pre>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyMessage(generatedToken)}
                    className="flex-1"
                  >
                    {copiedMsg ? <Check className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                    Copiar Mensagem
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openWhatsApp(generatedToken)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Abrir WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedToken ? (
              <>
                <Button variant="outline" onClick={resetRequestForm}>Cancelar</Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={createRequestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createRequestMutation.isPending ? 'Criando...' : 'Criar Solicitação'}
                </Button>
              </>
            ) : (
              <Button onClick={resetRequestForm} variant="outline" className="w-full">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: VER RESPOSTAS ===== */}
      <Dialog open={viewResponsesId !== null} onOpenChange={(open) => { if (!open) setViewResponsesId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Respostas dos Fornecedores
            </DialogTitle>
          </DialogHeader>

          {requestDetail && (
            <div className="space-y-4">
              {/* Info da solicitação */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-800">{requestDetail.title}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  {requestDetail.requesterName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {requestDetail.requesterName}</span>}
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {requestDetail.items.length} item(s)</span>
                  <Badge className={`text-xs ${STATUS_LABELS[requestDetail.status]?.color}`}>{STATUS_LABELS[requestDetail.status]?.label}</Badge>
                </div>
                <div className="mt-2 space-y-1">
                  {requestDetail.items.map((item: QuotItem, i: number) => (
                    <div key={i} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="w-4 text-gray-400">{i + 1}.</span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-400">— {item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Respostas */}
              {requestDetail.responses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma resposta recebida ainda</p>
                  <p className="text-xs mt-1">Compartilhe o link com os fornecedores</p>
                </div>
              ) : (() => {
                // Calcular melhor preço por item (nome normalizado)
                const bestPriceByItem: Record<string, { price: number; supplierId: number }> = {};
                requestDetail.responses.forEach((resp: any, rIdx: number) => {
                  resp.items.forEach((item: ResponseItem) => {
                    const key = item.name.toLowerCase().trim();
                    const price = parseFloat(item.price);
                    if (!isNaN(price)) {
                      if (!(key in bestPriceByItem) || price < bestPriceByItem[key].price) {
                        bestPriceByItem[key] = { price, supplierId: rIdx };
                      }
                    }
                  });
                });
                // Calcular total por fornecedor
                const totals = requestDetail.responses.map((resp: any) => ({
                  id: resp.id,
                  total: resp.items.reduce((sum: number, item: ResponseItem) => sum + (parseFloat(item.price) || 0), 0),
                }));
                const minTotal = Math.min(...totals.map((t: any) => t.total));
                return (
                  <div className="space-y-4">
                    {/* Comparativo de melhor preço por item */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-800">Comparativo — Melhor Preço por Item</span>
                      </div>
                      <div className="space-y-1">
                        {requestDetail.items.map((reqItem: QuotItem, i: number) => {
                          const key = reqItem.name.toLowerCase().trim();
                          const best = bestPriceByItem[key];
                          // Coletar todos os preços para este item
                          const allPrices = requestDetail.responses
                            .map((resp: any, rIdx: number) => {
                              const found = resp.items.find((it: ResponseItem) => it.name.toLowerCase().trim() === key);
                              if (!found) return null;
                              return { supplier: resp.supplierName, price: parseFloat(found.price), rIdx };
                            })
                            .filter(Boolean)
                            .sort((a: any, b: any) => a.price - b.price);
                          if (allPrices.length === 0) return null;
                          const bestSupplier = allPrices[0]!;
                          const worstPrice = allPrices[allPrices.length - 1]?.price || 0;
                          const saving = worstPrice - bestSupplier.price;
                          return (
                            <div key={i} className="bg-white rounded p-2 border border-amber-100">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">{reqItem.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-green-700">{fmtPrice(String(bestSupplier.price))}</span>
                                  <span className="text-xs text-green-600 font-medium">{bestSupplier.supplier}</span>
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                </div>
                              </div>
                              {saving > 0.01 && (
                                <p className="text-xs text-gray-400 mt-0.5">Economia de {fmtPrice(String(saving))} vs. maior preço</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-gray-700">{requestDetail.responses.length} resposta(s) recebida(s)</p>
                    {requestDetail.responses.map((resp: any, rIdx: number) => {
                      const total = totals.find((t: any) => t.id === resp.id)?.total || 0;
                      const isBestTotal = Math.abs(total - minTotal) < 0.01;
                      return (
                        <Card key={resp.id} className={`border-2 ${isBestTotal ? 'border-green-400 bg-green-50/30' : 'border-blue-100'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800">{resp.supplierName}</p>
                                  {isBestTotal && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-1">
                                      <Trophy className="w-3 h-3" /> Menor Total
                                    </Badge>
                                  )}
                                </div>
                                {resp.cnpj && <p className="text-xs text-gray-500">CNPJ: {resp.cnpj}</p>}
                                {resp.address && <p className="text-xs text-gray-500">{resp.address}</p>}
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-400">{fmt(resp.createdAt)}</span>
                                <p className="text-sm font-bold text-gray-700 mt-1">Total: {fmtPrice(String(total))}</p>
                              </div>
                            </div>
                            {(resp.sellerName || resp.sellerPhone || resp.sellerEmail) && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                {resp.sellerName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {resp.sellerName}</span>}
                                {resp.sellerPhone && <a href={`tel:${resp.sellerPhone}`} className="flex items-center gap-1 text-blue-500 hover:underline"><Phone className="w-3 h-3" /> {resp.sellerPhone}</a>}
                                {resp.sellerEmail && <a href={`mailto:${resp.sellerEmail}`} className="flex items-center gap-1 text-blue-500 hover:underline"><Mail className="w-3 h-3" /> {resp.sellerEmail}</a>}
                              </div>
                            )}
                            <div className="mt-3 space-y-2">
                              {resp.items.map((item: ResponseItem, i: number) => {
                                const key = item.name.toLowerCase().trim();
                                const isBest = bestPriceByItem[key]?.supplierId === rIdx;
                                const itemPrice = parseFloat(item.price);
                                return (
                                  <div key={i} className={`flex items-center justify-between rounded p-2 text-sm ${isBest ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-800">{item.name}</span>
                                        {item.brand && <span className="text-xs text-gray-400">({item.brand})</span>}
                                        {isBest && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                      </div>
                                      <span className="text-xs text-gray-400">{item.quantity} {item.unit || 'un'}</span>
                                      {item.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>}
                                    </div>
                                    <span className={`font-bold ml-2 ${isBest ? 'text-green-700' : 'text-gray-700'}`}>{fmtPrice(item.price)}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {resp.notes && <p className="text-xs text-gray-500 mt-2 italic border-t pt-2">{resp.notes}</p>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {requestDetail && requestDetail.responses.length > 0 && !autoProcessResult && (
              <Button
                onClick={() => setShowAutoProcessConfirm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                disabled={autoProcessMutation.isPending}
              >
                <Zap className="w-4 h-4 mr-2" />
                {autoProcessMutation.isPending ? "Processando..." : "Processar Automaticamente"}
              </Button>
            )}
            {autoProcessResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-full">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Processado! {autoProcessResult.suppliersCreated} fornecedor(es) criado(s), {autoProcessResult.catalogEntriesCreated} entradas no catálogo, solicitação de compra #{autoProcessResult.purchaseRequestId} gerada.</span>
              </div>
            )}
            <Button variant="outline" onClick={() => { setViewResponsesId(null); setAutoProcessResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação: Processar Automaticamente */}
      <AlertDialog open={showAutoProcessConfirm} onOpenChange={setShowAutoProcessConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Processar orçamento automaticamente?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação irá executar automaticamente:</p>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span><strong>Criar fornecedores</strong> de todas as respostas recebidas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-purple-500" />
                    <span><strong>Criar categoria</strong> com o título do orçamento</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                    <span><strong>Registrar catálogo de preços</strong> com todos os itens e valores</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4 text-green-500" />
                    <span><strong>Criar solicitação de compra</strong> com os menores preços</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Urgência da solicitação de compra</label>
                  <select
                    value={autoProcessUrgency}
                    onChange={(e) => setAutoProcessUrgency(e.target.value as any)}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (viewResponsesId) {
                  autoProcessMutation.mutate({ quotationRequestId: viewResponsesId, urgency: autoProcessUrgency });
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" /> Processar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Quotation Dialog */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-600" />
              Registrar Orçamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={qSupplierId} onValueChange={setQSupplierId}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={qCategoryId} onValueChange={setQCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                <SelectContent>
                  {(categories || []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produto / Item *</Label>
              <Input value={qProductName} onChange={e => setQProductName(e.target.value)} placeholder="Ex: Óleo Motor 15W40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preço (R$) *</Label>
                <Input value={qPrice} onChange={e => setQPrice(e.target.value)} placeholder="0,00" type="number" step="0.01" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={qUnit} onChange={e => setQUnit(e.target.value)} placeholder="un, L, kg..." />
              </div>
            </div>
            <div>
              <Label>Data do orçamento</Label>
              <Input type="date" value={qDate} onChange={e => setQDate(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={qNotes} onChange={e => setQNotes(e.target.value)} placeholder="Condições, validade, frete..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetQuoteForm}>Cancelar</Button>
            <Button onClick={handleSubmitQuote} disabled={createQuoteMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
              {createQuoteMutation.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCatId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Óleos e Lubrificantes" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${catColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCatColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCatForm}>Cancelar</Button>
            <Button onClick={handleSubmitCat} disabled={createCatMutation.isPending || updateCatMutation.isPending}>
              {(createCatMutation.isPending || updateCatMutation.isPending) ? 'Salvando...' : editCatId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
