// @ts-nocheck
import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
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
  Trophy, Star, AlertCircle, Zap, ShoppingCart, CheckCircle2,
  Sparkles, ExternalLink as ExternalLinkIcon, Edit
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// Fuzzy match: verifica se dois nomes de item são equivalentes.
// Estratégia: se um nome contém todas as palavras do outro (com ≥3 chars),
// considera como o mesmo item. Ex: "15w40 motor primeira linha" ≈ "15w40 Valvoline motor primeira linha"
function itemNamesMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (!na || !nb) return false;
  // Compacto (sem espaços): exato ou contenção de 4+ caracteres (evita '10w' casar com '15w40')
  const ca = na.replace(/\s+/g, '');
  const cb = nb.replace(/\s+/g, '');
  if (ca === cb) return true;
  if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
  // Palavras significativas: ≥3 letras, OU qualquer token com dígito (ex: "68", "10w",
  // "15w40") — números curtos são justamente o que distingue produtos parecidos
  // ("68 hidráulico" vs "15w40 hidráulico"), então não podem ser descartados aqui.
  const words = (s: string) => s.split(/\s+/).filter(w => w.length >= 3 || /\d/.test(w));
  const wa = words(na);
  const wb = words(nb);
  // Se algum lado não tem palavras significativas, só casa por exato/compacto acima
  if (wa.length === 0 || wb.length === 0) return false;
  const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return shorter.every(w => longer.includes(w));
}

function fmtPrice(price: string | number) {
  const n = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(n)) return String(price);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Capacidade em litros de cada embalagem (para normalizar preço por litro)
const PACKAGING_LITERS: Record<string, number> = {
  '1L': 1, '5L': 5, '10L': 10, '20L': 20, '200L': 200,
};
// Extrai capacidade da embalagem (ex: '20L' -> 20). Retorna null se não for volume.
function packagingLiters(pack?: string): number | null {
  if (!pack) return null;
  const p = pack.trim().toUpperCase();
  if (PACKAGING_LITERS[p]) return PACKAGING_LITERS[p];
  const m = p.match(/(\d+(?:[\.,]\d+)?)\s*L/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}
// Preço normalizado: se o item tem embalagem em litros, retorna preço POR LITRO; senão, preço unitário.
// Isso evita comparar "galão 5L" com "galão 20L" pelo preço bruto.
function normalizedUnitPrice(item: ResponseItem): number {
  const price = parseFloat(String(item.price).replace(',', '.'));
  if (isNaN(price)) return NaN;
  const qty = parseFloat(String(item.quantity || '1').replace(',', '.')) || 1;
  const total = price * qty; // price é unitário; total da linha
  const lit = packagingLiters((item as any).packaging);
  if (lit && lit > 0) return total / (lit * qty); // R$ por litro
  return price; // R$ por unidade
}
// Chave de agrupamento: nome do produto normalizado (sem marca/embalagem) + categoria de embalagem.
function itemGroupKey(name: string, pack?: string): string {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(galao|galão|tambor|litro|litros|lt|balde)\b/g, '')
    .replace(/\d+\s*l\b/g, '') // remove "20l", "5l" do nome
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const lit = packagingLiters(pack);
  const packCat = lit ? (lit >= 100 ? 'tambor' : 'galao') : 'un';
  return n + '|' + packCat;
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  boleto: 'Boleto', pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro', transferencia: 'Transferência', outro: 'Outro',
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
type ResponseItem = {
  packaging?: string; name: string; quantity: string; unit?: string; price: string; brand?: string; notes?: string };

type SummaryItem = {
  name: string;
  quantity: string;
  unit: string;
  bestPrice: number;
  bestSupplierName: string;
  bestSupplierPhone: string | null;
  subtotal: number;
  found: boolean;
};

type AutoProcessResult = {
  suppliersCreated: number;
  suppliersUpdated: number;
  categoryId: number;
  categoryName: string;
  catalogEntriesCreated: number;
  quotationRequestId: number;
  quotationTitle: string;
  requesterName?: string | null;
  summaryItems: SummaryItem[];
  grandTotal: number;
  responseCount: number;
};

export default function QuotationsPage() {
  const utils = trpc.useUtils();
  const searchString = useSearch();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState('last');

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
  const [autoProcessResult, setAutoProcessResult] = useState<AutoProcessResult | null>(null);
  const [showWhatsAppSummary, setShowWhatsAppSummary] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  // Rascunho de quantidade em edição na revisão pré-compra (por nome do item),
  // antes de confirmar no bestChoices — reseta ao trocar/fechar o orçamento aberto.
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  const { data: suppliers } = trpc.suppliers.list.useQuery({ activeOnly: true });
  const { data: categories } = trpc.purchaseCategories.list.useQuery();
  const { data: collaboratorsRaw } = trpc.collaborators.list.useQuery({ active: true });
  const collaborators = collaboratorsRaw ? [...collaboratorsRaw].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : undefined;
  const { data: quotRequests, refetch: refetchRequests } = trpc.quotationRequests.list.useQuery();
  const { data: itemCatalog } = trpc.quotationRequests.listItemCatalog.useQuery();
  const [catalogSearch, setCatalogSearch] = useState('');
  const { data: requestDetail } = trpc.quotationRequests.getById.useQuery(
    { id: viewResponsesId! },
    { enabled: viewResponsesId !== null }
  );

  // Abre direto o comparativo de um orçamento quando chega com ?open=<id> —
  // usado pelo botão "Solicitar Orçamento" da Solicitação de Compra.
  useEffect(() => {
    if (!searchString) return;
    const params = new URLSearchParams(searchString);
    const openId = params.get('open');
    if (openId) {
      setActiveTab('requests');
      setViewResponsesId(parseInt(openId, 10));
    }
  }, [searchString]);

  function fmtBreakdown(breakdown: Array<{ supplierName: string; subtotal: number }> | undefined) {
    if (!breakdown || breakdown.length === 0) return '';
    return breakdown.map(s => `${s.supplierName}: ${fmtPrice(String(s.subtotal))}`).join(' · ');
  }

  const confirmPurchaseMutation = trpc.quotationRequests.confirmPurchaseDecision.useMutation({
    onSuccess: (data) => {
      utils.quotationRequests.getById.invalidate({ id: viewResponsesId! });
      toast.success(`Compra confirmada! ${fmtBreakdown(data.suppliersBreakdown)}`);
      setShowConfirmPurchaseDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Dialog de "Confirmar Compra" — pede forma de pagamento e permite anexar NF/comprovante
  // antes de fechar a compra (opcionais; a compra fecha mesmo sem nenhum dos dois).
  const [showConfirmPurchaseDialog, setShowConfirmPurchaseDialog] = useState(false);
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('');
  const [confirmInvoiceUrl, setConfirmInvoiceUrl] = useState('');
  const [confirmReceiptUrl, setConfirmReceiptUrl] = useState('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  async function uploadPurchaseFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'btree_ambiental');
    formData.append('folder', 'btree-receipts');
    const res = await fetch('https://api.cloudinary.com/v1_1/djob7pxme/auto/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Upload não retornou URL');
    return data.secure_url as string;
  }

  async function handlePickFile(kind: 'invoice' | 'receipt', file: File | undefined) {
    if (!file) return;
    const setUploading = kind === 'invoice' ? setUploadingInvoice : setUploadingReceipt;
    const setUrl = kind === 'invoice' ? setConfirmInvoiceUrl : setConfirmReceiptUrl;
    setUploading(true);
    try {
      const url = await uploadPurchaseFile(file);
      setUrl(url);
      toast.success(kind === 'invoice' ? 'Nota Fiscal anexada' : 'Comprovante anexado');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  }

  function openConfirmPurchaseDialog() {
    setConfirmPaymentMethod('');
    setConfirmInvoiceUrl('');
    setConfirmReceiptUrl('');
    setShowConfirmPurchaseDialog(true);
  }

  const createPurchaseFromDecisionMutation = trpc.quotationRequests.createPurchaseRequestFromDecision.useMutation({
    onSuccess: (data) => {
      utils.quotationRequests.getById.invalidate({ id: viewResponsesId! });
      toast.success(`Solicitação de Compra gerada! ${fmtBreakdown(data.suppliersBreakdown)}`);
      navigate(`/compras/${data.purchaseRequestId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const createQuoteMutation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      utils.quotations.listByCategory.invalidate();
      toast.success("Orçamento registrado!");
      resetQuoteForm();
    },
    onError: (err) => toast.error("Erro: " + err.message),
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

  const [editResp, setEditResp] = useState<any>(null);
  const [editItemsResp, setEditItemsResp] = useState<any>(null);
  const [editItemsList, setEditItemsList] = useState<any[]>([]);
  const adminUpdateItemsMutation = trpc.quotationRequests.adminUpdateResponseItems.useMutation({
    onSuccess: () => {
      utils.quotationRequests.getById.invalidate();
      setEditItemsResp(null);
      toast.success("Itens da resposta atualizados!");
    },
    onError: (err) => toast.error("Erro ao atualizar itens: " + err.message),
  });
  const adminSetBestMutation = trpc.quotationRequests.adminSetBestChoice.useMutation({
    onSuccess: () => {
      utils.quotationRequests.getById.invalidate();
      toast.success("Vencedor do item definido!");
    },
    onError: (err) => toast.error("Erro ao definir vencedor: " + err.message),
  });
  const adminUpdateRespMutation = trpc.quotationRequests.adminUpdateResponse.useMutation({
    onSuccess: () => {
      utils.quotationRequests.getById.invalidate();
      setEditResp(null);
      toast.success("Resposta atualizada!");
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });
  const autoProcessMutation = trpc.quotationRequests.autoProcess.useMutation({
    onSuccess: (data) => {
      setShowAutoProcessConfirm(false);
      setAutoProcessResult(data);
      setShowWhatsAppSummary(true);
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
      unitPrice: qPrice,
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

  function getQuotationLink(id: number) {
    return `${window.location.origin}/orcamentos`;
  }

  // Aceita dados do formulário (ao criar) OU de uma solicitação já salva (ao reenviar)
  function buildWhatsAppMessage(token: string, savedReq?: any) {
    const title = savedReq ? savedReq.title : reqTitle;
    const items: QuotItem[] = savedReq ? (savedReq.items || []) : reqItems.filter(i => i.name.trim());
    const notes = savedReq ? savedReq.notes : reqNotes;
    const requesterName = savedReq ? savedReq.requesterName : (collaborators || []).find(c => String(c.id) === reqRequesterId)?.name;
    const requesterPhone = savedReq ? savedReq.requesterPhone : (collaborators || []).find(c => String(c.id) === reqRequesterId)?.phone;
    const requesterEmail = savedReq ? savedReq.requesterEmail : (collaborators || []).find(c => String(c.id) === reqRequesterId)?.email;
    const link = getPublicLink(token);
    const firstName = requesterName ? requesterName.split(' ')[0] : 'a equipe BTREE Ambiental';

    // Nota: emojis de 4 bytes (fora do BMP, ex: 🌿📞🌐📸📋) viram "�" quando passam pelo
    // link wa.me/?text= — é uma limitação do próprio WhatsApp ao decodificar a URL, não
    // do nosso código. Por isso essa mensagem usa só texto simples e símbolos de 3 bytes
    // (como "━", que é seguro). Não reintroduza emojis aqui.
    let msg = `*${COMPANY.name}*\n`;
    msg += `Contato Comercial: ${COMPANY.phone} · ${COMPANY.commercial}\n`;
    msg += `${COMPANY.site}\n`;
    msg += `Instagram: ${COMPANY.instagram}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Olá! Tudo bem? Aqui é ${firstName} da BTREE Ambiental!!\n`;
    msg += `Eu gostaria de solicitar um orçamento! Segue abaixo:\n\n`;
    msg += `*${title}*\n\n`;
    msg += `*Itens solicitados:*\n`;
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} — ${item.quantity} ${item.unit}\n`;
    });
    if (notes) msg += `\n*Obs:* ${notes}\n`;
    msg += `\nFavor mandar formulário de orçamento, ou se preferir preencha nosso formulário pelo link:\n${link}\n`;
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (requesterName) {
      msg += `*Solicitante:* ${requesterName}\n`;
      if (requesterPhone) msg += `Tel: ${requesterPhone}\n`;
      if (requesterEmail) msg += `E-mail: ${requesterEmail}\n`;
    }
    return msg;
  }

  // ===== MENSAGEM WHATSAPP PARA GESTORES (RESUMO DE COMPRAS) =====
  function buildManagerWhatsAppMessage(result: AutoProcessResult): string {
    const today = new Date().toLocaleDateString('pt-BR');
    const systemLink = `${window.location.origin}/orcamentos?open=${result.quotationRequestId}`;

    // Mesma observação de buildWhatsAppMessage: sem emojis de 4 bytes aqui, só texto e "━".
    let msg = `*BTREE Ambiental — Resumo de Cotação*\n`;
    msg += `Data: ${today}\n`;
    if (result.requesterName) msg += `Solicitante: ${result.requesterName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*${result.quotationTitle}*\n`;
    msg += `Fornecedores consultados: ${result.responseCount}\n\n`;
    msg += `*Melhor preço por item:*\n\n`;

    result.summaryItems.forEach((item, i) => {
      if (item.found) {
        msg += `${i + 1}. *${item.name}*\n`;
        msg += `   • Qtd: ${item.quantity} ${item.unit}\n`;
        msg += `   • Fornecedor: ${item.bestSupplierName}\n`;
        msg += `   • Valor un.: ${fmtPrice(item.bestPrice)}\n`;
        msg += `   • Subtotal: *${fmtPrice(item.subtotal)}*\n\n`;
      } else {
        msg += `${i + 1}. *${item.name}*\n`;
        msg += `   (Não cotado)\n\n`;
      }
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*TOTAL ESTIMADO: ${fmtPrice(result.grandTotal)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Para ver o orçamento completo com todos os fornecedores e preços:\n`;
    msg += `${systemLink}\n\n`;
    msg += `_Aguardamos sua aprovação para prosseguir com a compra._\n`;
    msg += `\n*BTREE Ambiental* | ${COMPANY.phone}`;

    return msg;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicLink(token));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link copiado!");
  }

  async function copyMessage(token: string, savedReq?: any) {
    await navigator.clipboard.writeText(buildWhatsAppMessage(token, savedReq));
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
    toast.success("Mensagem copiada!");
  }

  function openWhatsApp(token: string, savedReq?: any) {
    const msg = encodeURIComponent(buildWhatsAppMessage(token, savedReq));
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  async function copyManagerMessage() {
    if (!autoProcessResult) return;
    await navigator.clipboard.writeText(buildManagerWhatsAppMessage(autoProcessResult));
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
    toast.success("Mensagem copiada para o WhatsApp!");
  }

  function openManagerWhatsApp() {
    if (!autoProcessResult) return;
    const msg = encodeURIComponent(buildManagerWhatsAppMessage(autoProcessResult));
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
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="last" className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Orçamentos
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <Send className="w-3 h-3" /> Solicitar
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Itens
          </TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        {/* ÚLTIMOS ORÇAMENTOS — lista que abre o detalhe completo */}
        <TabsContent value="last" className="space-y-3 mt-3">
          <p className="text-sm text-gray-500">Últimos orçamentos — toque para abrir o comparativo completo</p>
          {!quotRequests || quotRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum orçamento ainda</p>
              <p className="text-xs mt-1">Crie uma solicitação na aba Solicitar</p>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-2 md:hidden">
                {quotRequests.map((req: any) => {
                  const expired = req.isExpired;
                  const statusKey = expired && req.status === 'ativa' ? 'expirada' : req.status;
                  const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS['ativa'];
                  const respCount = req.responseCount ?? req.responses?.length ?? null;
                  return (
                    <button
                      key={req.id}
                      className="w-full text-left"
                      onClick={() => { setAutoProcessResult(null); setQtyDrafts({}); setViewResponsesId(req.id); }}
                    >
                      <Card className="hover:border-emerald-300 hover:shadow-sm transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800 truncate">{req.title}</p>
                                <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {req.items.length} item(s)</span>
                                {respCount !== null && (
                                  <span className="flex items-center gap-1 text-emerald-700"><Building2 className="w-3 h-3" /> {respCount} resposta(s)</span>
                                )}
                                {req.requesterName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {req.requesterName}</span>}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>

              {/* Desktop/notebook: tabela */}
              <Card className="hidden md:block overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-700 text-white">
                        <th className="px-3 py-2 text-left text-xs font-semibold">Título</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Itens</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Respostas</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Solicitante</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotRequests.map((req: any) => {
                        const expired = req.isExpired;
                        const statusKey = expired && req.status === 'ativa' ? 'expirada' : req.status;
                        const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS['ativa'];
                        const respCount = req.responseCount ?? req.responses?.length ?? null;
                        return (
                          <tr
                            key={req.id}
                            className="border-b hover:bg-emerald-50/60 cursor-pointer"
                            onClick={() => { setAutoProcessResult(null); setQtyDrafts({}); setViewResponsesId(req.id); }}
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">{req.title}</td>
                            <td className="px-3 py-2 whitespace-nowrap"><Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge></td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-600">{req.items.length}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-emerald-700">{respCount ?? '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-600">{req.requesterName || '—'}</td>
                            <td className="px-3 py-2 text-right"><ChevronDown className="w-4 h-4 text-gray-300 inline -rotate-90" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* REQUESTS TAB */}
        <TabsContent value="requests" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Solicite orçamentos para fornecedores via link</p>
            <Button size="sm" onClick={() => setShowRequestForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-3 h-3 mr-1" /> Nova Solicitação
            </Button>
          </div>

          {!quotRequests || quotRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma solicitação criada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotRequests.map((req: any) => {
                const expired = req.isExpired;
                const statusKey = expired && req.status === 'ativa' ? 'expirada' : req.status;
                const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS['ativa'];
                return (
                  <Card key={req.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 truncate">{req.title}</p>
                            <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" /> {req.items.length} item(s)
                            </span>
                            {req.requesterName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {req.requesterName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {fmtExpiry(req.expiresAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setAutoProcessResult(null); setQtyDrafts({}); setViewResponsesId(req.id); }}
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
                                onClick={() => openWhatsApp(req.token, req)}
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

        {/* CATÁLOGO DE ITENS — tabela de consulta com todo item já orçado */}
        <TabsContent value="catalog" className="space-y-3 mt-3">
          <Input
            placeholder="Buscar item..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
          />
          {!itemCatalog || itemCatalog.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum item orçado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-right px-3 py-2 font-medium">Preço</th>
                    <th className="text-left px-3 py-2 font-medium">Data do Orçamento</th>
                    <th className="text-left px-3 py-2 font-medium">Fornecedor</th>
                    <th className="text-left px-3 py-2 font-medium">CNPJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itemCatalog
                    .filter((row) => row.itemName.toLowerCase().includes(catalogSearch.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{row.itemName}</td>
                        <td className="px-3 py-2 text-right font-medium text-purple-700 whitespace-nowrap">
                          R$ {row.price.toFixed(2)}{row.unit ? `/${row.unit}` : ''}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {new Date(row.quotationDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{row.supplierName}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.cnpj || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

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
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-800">{cat.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setEditCatId(cat.id); setCatName(cat.name); setCatColor(cat.color || '#6B7280'); setShowCatForm(true); }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => deleteCatMutation.mutate({ id: cat.id })}
                        className="text-red-300 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG: CRIAR SOLICITAÇÃO ===== */}
      <Dialog open={showRequestForm} onOpenChange={(open) => { if (!open) resetRequestForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Nova Solicitação de Orçamento
            </DialogTitle>
          </DialogHeader>

          {!generatedToken ? (
            <div className="space-y-4">
              <div>
                <Label>Título da Solicitação *</Label>
                <Input value={reqTitle} onChange={e => setReqTitle(e.target.value)} placeholder="Ex: Óleos e Lubrificantes — Julho 2025" />
              </div>
              <div>
                <Label>Solicitante</Label>
                <Select value={reqRequesterId} onValueChange={setReqRequesterId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar colaborador..." /></SelectTrigger>
                  <SelectContent>
                    {(collaborators || []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Itens *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {reqItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <Input
                        placeholder="Nome do item"
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        className="w-16"
                      />
                      <Input
                        placeholder="Un"
                        value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="w-16"
                      />
                      {reqItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-400 p-1">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} placeholder="Prazo, especificações, etc." rows={2} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Solicitação criada com sucesso!</p>
              </div>

              {/* Link para fornecedor */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <Link2 className="w-4 h-4 text-blue-500" /> Link para Fornecedor
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
      <Dialog open={viewResponsesId !== null} onOpenChange={(open) => { if (!open) { setViewResponsesId(null); setAutoProcessResult(null); setShowWhatsAppSummary(false); setQtyDrafts({}); } }}>
        <DialogContent className="max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Respostas dos Fornecedores
            </DialogTitle>
          </DialogHeader>

          {requestDetail && (
            <div className="space-y-4 min-w-0">
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
                // ===== COMPARATIVO EM PLANILHA (item × fornecedor) com preço normalizado por litro =====
                // Agrupar pelo NOME do produto (ignorando embalagem) e comparar por R$/litro para óleos.
                // Assim, galão 5L e galão 20L do MESMO produto ficam na MESMA linha, e o vencedor é o menor R$/L.
                type Cell = { price: number; norm: number; unit: string; pack?: string; brand?: string; supplier: string; rIdx: number; itemIndex: number };
                const suppliersList: string[] = requestDetail.responses.map((r: any) => r.tradeName || r.supplierName);
                const nameKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\d+\s*l\b/gi, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
                // Mapa: nameKey -> { label, unit, cells: Cell[] }
                const rowsMap: Record<string, { label: string; unit: string; cells: Cell[] }> = {};
                const ensureRow = (label: string, unit: string, gk: string) => {
                  if (!rowsMap[gk]) rowsMap[gk] = { label, unit, cells: [] };
                  return rowsMap[gk];
                };
                // Itens solicitados (linhas base)
                requestDetail.items.forEach((reqItem: QuotItem) => {
                  ensureRow(reqItem.name, reqItem.unit || 'un', nameKey(reqItem.name));
                });
                // Respostas: preencher células (agrupando por nome do produto)
                requestDetail.responses.forEach((resp: any, rIdx: number) => {
                  const supplierName = resp.tradeName || resp.supplierName;
                  (resp.items || []).forEach((item: ResponseItem, itemIndex: number) => {
                    const price = parseFloat(String(item.price).replace(',', '.'));
                    if (isNaN(price)) return;
                    const norm = normalizedUnitPrice(item);
                    if (isNaN(norm)) return;
                    // Casar com um item solicitado pelo NOME (ignorando embalagem)
                    const matchedReq = requestDetail.items.find((ri: QuotItem) => itemNamesMatch(ri.name, item.name));
                    const gk = matchedReq ? nameKey(matchedReq.name) : nameKey(item.name);
                    ensureRow(matchedReq ? matchedReq.name : item.name, item.unit || 'un', gk);
                    rowsMap[gk].cells.push({
                      price, norm,
                      unit: packagingLiters((item as any).packaging) ? 'L' : (item.unit || 'un'),
                      pack: (item as any).packaging, brand: item.brand,
                      supplier: supplierName, rIdx, itemIndex,
                    });
                  });
                });
                const rowsArr = Object.entries(rowsMap).map(([gk, r]) => ({ gk, ...r }));
                // Escolha manual salva em bestChoices (por nome do item)
                let manualChoices: Record<string, { responseId: number; itemIndex: number }> = {};
                try { manualChoices = (requestDetail as any).bestChoices ? JSON.parse((requestDetail as any).bestChoices) : {}; } catch (_) { manualChoices = {}; }
                // Melhor por linha: respeita escolha manual; senão, menor preço normalizado (R$/L para óleos)
                rowsArr.forEach(r => {
                  const manual = manualChoices[r.label] || manualChoices[r.gk];
                  let bestCell: Cell | null = null;
                  if (manual) {
                    const resp = requestDetail.responses.find((x: any) => x.id === manual.responseId);
                    if (resp) {
                      const sName = resp.tradeName || resp.supplierName;
                      bestCell = r.cells.find(c => c.supplier === sName && c.itemIndex === manual.itemIndex) || null;
                    }
                  }
                  if (!bestCell && r.cells.length) {
                    bestCell = r.cells.reduce((a, b) => (b.norm < a.norm ? b : a));
                  }
                  (r as any).bestCell = bestCell;
                  (r as any).best = bestCell ? bestCell.norm : null;
                });
                // Totais por fornecedor (soma do preço bruto de seus itens)
                const totals = requestDetail.responses.map((resp: any) => ({
                  id: resp.id,
                  total: (resp.items || []).reduce((sum: number, item: ResponseItem) => sum + (parseFloat(String(item.price).replace(',', '.')) || 0), 0),
                }));
                const minTotal = Math.min(...totals.map((t: any) => t.total));
                return (
                  <div className="space-y-4">
                    {/* Planilha comparativa */}
                    <div className="rounded-lg border border-emerald-200 overflow-hidden shadow-sm">
                      <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-semibold">Comparativo de Preços</span>
                        <span className="text-[11px] text-emerald-100 ml-auto hidden md:inline">menor valor por linha em destaque</span>
                      </div>
                      {/* ===== VISÃO MOBILE (cartões por item) ===== */}
                      <div className="md:hidden space-y-3 p-2 bg-gray-50/50">
                        {rowsArr.map((r, ri) => (
                          <div key={ri} className="rounded-lg border border-emerald-200 bg-white shadow-sm overflow-hidden">
                            <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
                              <span className="font-semibold text-emerald-900 text-sm">{r.label}</span>
                              <span className="text-[11px] text-gray-500">{r.unit}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {suppliersList.map((s: string, si: number) => {
                                const cell = r.cells.find(c => c.supplier === s);
                                if (!cell) return null;
                                const isBest = (r as any).bestCell === cell;
                                return (
                                  <button
                                    key={si}
                                    type="button"
                                    onClick={() => {
                                      const choices: Record<string, { responseId: number; itemIndex: number }> = { ...(manualChoices || {}) };
                                      choices[r.label] = { responseId: requestDetail.responses[cell.rIdx].id, itemIndex: cell.itemIndex };
                                      adminSetBestMutation.mutate({ quotationRequestId: requestDetail.id, choices });
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${isBest ? 'bg-emerald-100/70' : ''}`}
                                  >
                                    <div className="min-w-0">
                                      <p className={`text-sm font-medium truncate ${isBest ? 'text-emerald-900' : 'text-gray-700'}`}>{cell.supplier}</p>
                                      {(cell.pack || cell.brand) && (
                                        <p className="text-[11px] text-gray-400">{[cell.brand, cell.pack].filter(Boolean).join(' · ')}</p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <p className={`text-base font-bold ${isBest ? 'text-emerald-800' : 'text-gray-800'}`}>
                                        {fmtPrice(String(cell.price))}
                                        {isBest && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline ml-1 -mt-0.5" />}
                                      </p>
                                      {cell.unit === 'L' && <p className="text-[11px] text-gray-500">{fmtPrice(String(cell.norm))}/L</p>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {(r as any).bestCell && (
                              <div className="bg-emerald-700 text-white px-3 py-1.5 flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Melhor</span>
                                <span className="font-semibold">{fmtPrice(String((r as any).bestCell.price))} · {(r as any).bestCell.supplier}{(r as any).bestCell.pack ? ` · ${(r as any).bestCell.pack}` : ''}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* ===== VISÃO DESKTOP (tabela) ===== */}
                      <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-emerald-50 text-emerald-900">
                              <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-emerald-50 z-10">Item</th>
                              {suppliersList.map((s: string, i: number) => (
                                <th key={i} className="text-right px-3 py-2 font-semibold whitespace-nowrap">{s}</th>
                              ))}
                              <th className="text-right px-3 py-2 font-semibold text-emerald-700 whitespace-nowrap">Melhor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowsArr.map((r, ri) => (
                              <tr key={ri} className={ri % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-inherit whitespace-nowrap">
                                  {r.label}
                                  <span className="block text-[10px] text-gray-400 font-normal">{r.unit}</span>
                                </td>
                                {suppliersList.map((s: string, si: number) => {
                                  const cell = r.cells.find(c => c.supplier === s);
                                  if (!cell) return <td key={si} className="px-3 py-2 text-right text-gray-300">—</td>;
                                  const isBest = (r as any).bestCell === cell;
                                  return (
                                    <td key={si} className={`px-3 py-2 text-right whitespace-nowrap ${isBest ? 'bg-emerald-100/70 font-bold text-emerald-800' : 'text-gray-700'}`}>
                                      <button
                                        type="button"
                                        title="Definir como vencedor deste item"
                                        onClick={() => {
                                          const choices: Record<string, { responseId: number; itemIndex: number }> = { ...(manualChoices || {}) };
                                          choices[r.label] = { responseId: requestDetail.responses[cell.rIdx].id, itemIndex: cell.itemIndex };
                                          adminSetBestMutation.mutate({ quotationRequestId: requestDetail.id, choices });
                                        }}
                                        className="text-left hover:opacity-80"
                                      >
                                        <span className="block font-bold">{fmtPrice(String(cell.price))}</span>
                                        {cell.unit === 'L' && <span className="block text-[10px] font-normal text-gray-500">{fmtPrice(String(cell.norm))}/L</span>}
                                        {(cell.pack || cell.brand) && (
                                          <span className="block text-[10px] font-normal text-gray-400">{[cell.brand, cell.pack].filter(Boolean).join(' · ')}</span>
                                        )}
                                      </button>
                                      {isBest && <Star className="w-3 h-3 text-amber-500 fill-amber-500 inline ml-1" />}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-emerald-700">
                                  {(r as any).bestCell ? fmtPrice(String((r as any).bestCell.price)) : '—'}
                                  {(r as any).bestCell && <span className="block text-[10px] font-normal text-gray-400">{(r as any).bestCell.supplier}{(r as any).bestCell.pack ? ` · ${(r as any).bestCell.pack}` : ''}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Revisão antes de comprar: fornecedor e quantidade editáveis por item */}
                    {(() => {
                      const reviewRows = rowsArr.map((r: any) => {
                        const reqItem = requestDetail.items.find((i: QuotItem) => itemNamesMatch(i.name, r.label));
                        const override = manualChoices[r.label] || manualChoices[r.gk];
                        const quantity = qtyDrafts[r.label] ?? override?.quantity ?? reqItem?.quantity ?? '';
                        const chosen = r.bestCell as (typeof r.cells)[number] | null;
                        const unitPrice = chosen?.price ?? 0;
                        const subtotal = unitPrice * (parseFloat(quantity) || 0);
                        return { ...r, quantity, chosen, unitPrice, subtotal };
                      });
                      const reviewTotal = reviewRows.reduce((s: number, r: any) => s + r.subtotal, 0);
                      const commitChoice = (label: string, gk: string, responseId: number, itemIndex: number, quantity: string) => {
                        const choices = { ...(manualChoices || {}) };
                        choices[label] = { responseId, itemIndex, quantity };
                        adminSetBestMutation.mutate({ quotationRequestId: requestDetail.id, choices });
                      };
                      return (
                        <div className="rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                          <div className="bg-slate-700 text-white px-3 py-2 flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            <span className="text-sm font-semibold">Revisar antes de comprar</span>
                            <span className="text-[11px] text-slate-200 ml-auto hidden md:inline">troque o fornecedor ou a quantidade de cada item</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700">
                                  <th className="text-left px-3 py-2 font-semibold">Item</th>
                                  <th className="text-left px-3 py-2 font-semibold">Fornecedor</th>
                                  <th className="text-right px-3 py-2 font-semibold w-20">Qtd</th>
                                  <th className="text-right px-3 py-2 font-semibold">Preço Un.</th>
                                  <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reviewRows.map((r: any) => (
                                  <tr key={r.gk} className="border-t">
                                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.label}</td>
                                    <td className="px-3 py-2">
                                      <select
                                        className="border rounded px-1.5 py-1 text-xs w-full max-w-[240px] bg-white"
                                        value={r.chosen ? `${r.chosen.rIdx}-${r.chosen.itemIndex}` : ''}
                                        onChange={(e) => {
                                          const [rIdxStr, itemIdxStr] = e.target.value.split('-');
                                          const respId = requestDetail.responses[parseInt(rIdxStr, 10)].id;
                                          commitChoice(r.label, r.gk, respId, parseInt(itemIdxStr, 10), r.quantity || '1');
                                        }}
                                      >
                                        {r.cells.length === 0 && <option value="">— nenhuma resposta —</option>}
                                        {r.cells.map((c: any, ci: number) => (
                                          <option key={ci} value={`${c.rIdx}-${c.itemIndex}`}>
                                            {c.supplier} — {fmtPrice(String(c.price))}{c.pack ? ` (${c.pack})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2">
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="h-7 text-xs text-right w-20 ml-auto"
                                        value={r.quantity}
                                        onChange={(e) => setQtyDrafts(prev => ({ ...prev, [r.label]: e.target.value }))}
                                        onBlur={() => {
                                          if (r.chosen) commitChoice(r.label, r.gk, requestDetail.responses[r.chosen.rIdx].id, r.chosen.itemIndex, r.quantity);
                                        }}
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">{r.chosen ? fmtPrice(String(r.unitPrice)) : '—'}</td>
                                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{r.chosen ? fmtPrice(String(r.subtotal)) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t bg-slate-50 font-bold">
                                  <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                                  <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap">{fmtPrice(String(reviewTotal))}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <p className="text-[11px] text-gray-400 px-3 py-2 bg-slate-50 border-t">
                            É isso que vai ser usado ao clicar em "Confirmar Compra" ou "Gerar Solicitação de Compra" — ajuste aqui se o fornecedor não tiver toda a quantidade ou se você quiser comprar de outro fornecedor.
                          </p>
                        </div>
                      );
                    })()}
                    <p className="text-sm font-medium text-gray-700">{requestDetail.responses.length} resposta(s) recebida(s)</p>

                    {/* Desktop/notebook: tabela analítica */}
                    <div className="hidden md:block rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-left text-gray-600">
                              <th className="px-3 py-2 font-semibold">Fornecedor</th>
                              <th className="px-3 py-2 font-semibold">Contato</th>
                              <th className="px-3 py-2 font-semibold">Itens cotados</th>
                              <th className="px-3 py-2 font-semibold">Condições</th>
                              <th className="px-3 py-2 font-semibold text-right">Total</th>
                              <th className="px-3 py-2 font-semibold text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requestDetail.responses.map((resp: any) => {
                              const total = totals.find((t: any) => t.id === resp.id)?.total || 0;
                              const isBestTotal = Math.abs(total - minTotal) < 0.01;
                              return (
                                <tr key={resp.id} className={`border-t align-top ${isBestTotal ? 'bg-green-50/40' : ''}`}>
                                  <td className="px-3 py-2 min-w-[160px]">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-gray-800">{resp.tradeName || resp.supplierName}</span>
                                      {isBestTotal && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 flex items-center gap-1">
                                          <Trophy className="w-2.5 h-2.5" /> Menor Total
                                        </Badge>
                                      )}
                                    </div>
                                    {resp.tradeName && resp.supplierName && resp.tradeName !== resp.supplierName && <p className="text-gray-400 mt-0.5">{resp.supplierName}</p>}
                                    {resp.cnpj && <p className="text-gray-500 mt-0.5">CNPJ: {resp.cnpj}</p>}
                                    {resp.address && <p className="text-gray-500">{resp.address}</p>}
                                    <p className="text-gray-400 mt-0.5">{fmt(resp.createdAt)}</p>
                                  </td>
                                  <td className="px-3 py-2 min-w-[140px]">
                                    {resp.sellerName && <p className="flex items-center gap-1 text-gray-600"><User className="w-3 h-3" /> {resp.sellerName}</p>}
                                    {resp.sellerPhone && <a href={`tel:${resp.sellerPhone}`} className="flex items-center gap-1 text-blue-500 hover:underline mt-0.5"><Phone className="w-3 h-3" /> {resp.sellerPhone}</a>}
                                    {resp.sellerEmail && <a href={`mailto:${resp.sellerEmail}`} className="flex items-center gap-1 text-blue-500 hover:underline mt-0.5 break-all"><Mail className="w-3 h-3 shrink-0" /> {resp.sellerEmail}</a>}
                                  </td>
                                  <td className="px-3 py-2 min-w-[220px]">
                                    <div className="space-y-1">
                                      {resp.items.map((item: ResponseItem, i: number) => {
                                        const gk = itemGroupKey(item.name, (item as any).packaging);
                                        const grp = rowsMap[gk];
                                        const itemNorm = normalizedUnitPrice(item);
                                        const isBest = !!grp && grp.cells.length > 0 && !isNaN(itemNorm) && Math.abs(itemNorm - Math.min(...grp.cells.map(c => c.norm))) < 0.0001;
                                        return (
                                          <div key={i} className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${isBest ? 'bg-green-100/70' : 'bg-gray-50'}`}>
                                            <div className="min-w-0">
                                              <span className="font-medium text-gray-800">{item.name}</span>
                                              {(item as any).packaging && <span className="text-gray-400"> ({(item as any).packaging})</span>}
                                              {isBest && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 inline ml-1" />}
                                              <span className="block text-gray-400">{item.quantity} {item.unit || 'un'}{item.brand ? ` · ${item.brand}` : ''}</span>
                                            </div>
                                            <span className={`font-bold whitespace-nowrap ${isBest ? 'text-green-700' : 'text-gray-700'}`}>{fmtPrice(item.price)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {resp.notes && <p className="text-gray-400 italic mt-1">{resp.notes}</p>}
                                  </td>
                                  <td className="px-3 py-2 min-w-[120px]">
                                    {resp.paymentTerms && <p className="text-blue-700">💳 {resp.paymentTerms}</p>}
                                    {resp.deliveryTerms && <p className="text-purple-700 mt-0.5">🚚 {resp.deliveryTerms}</p>}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${isBestTotal ? 'text-green-700' : 'text-gray-800'}`}>{fmtPrice(String(total))}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost" size="sm" className="p-1.5 h-auto text-blue-600 hover:bg-blue-50"
                                        title="Editar dados do fornecedor"
                                        onClick={() => setEditResp({
                                          id: resp.id,
                                          supplierName: resp.supplierName || '',
                                          tradeName: resp.tradeName || '',
                                          cnpj: resp.cnpj || '',
                                          address: resp.address || '',
                                          sellerName: resp.sellerName || '',
                                          sellerPhone: resp.sellerPhone || '',
                                          sellerEmail: resp.sellerEmail || '',
                                          paymentTerms: resp.paymentTerms || '',
                                          deliveryTerms: resp.deliveryTerms || '',
                                          productsSold: resp.productsSold || '',
                                          notes: resp.notes || '',
                                        })}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="sm" className="p-1.5 h-auto text-emerald-600 hover:bg-emerald-50"
                                        title="Editar itens / preços"
                                        onClick={() => {
                                          setEditItemsResp(resp);
                                          setEditItemsList((resp.items || []).map((it: any) => ({
                                            name: it.name || '',
                                            quantity: it.quantity || '1',
                                            unit: it.unit || 'un',
                                            price: it.price || '',
                                            brand: it.brand || '',
                                            packaging: it.packaging || '',
                                            notes: it.notes || '',
                                          })));
                                        }}
                                      >
                                        <Package className="w-3.5 h-3.5" />
                                      </Button>
                                      {resp.responseToken && (
                                        <Button
                                          variant="ghost" size="sm" className="p-1.5 h-auto text-amber-600 hover:bg-amber-50"
                                          title={`Copiar link de revisão para ${resp.supplierName}`}
                                          onClick={() => {
                                            const link = `${window.location.origin}/orcamento/resposta/${resp.responseToken}`;
                                            navigator.clipboard.writeText(link).then(() => toast.success(`Link de revisão copiado! Envie para ${resp.supplierName}`));
                                          }}
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile: cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                    {requestDetail.responses.map((resp: any, rIdx: number) => {
                      const total = totals.find((t: any) => t.id === resp.id)?.total || 0;
                      const isBestTotal = Math.abs(total - minTotal) < 0.01;
                      return (
                        <Card key={resp.id} className={`border-2 ${isBestTotal ? 'border-green-400 bg-green-50/30' : 'border-blue-100'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800">{resp.tradeName || resp.supplierName}</p>
                                  {isBestTotal && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-1">
                                      <Trophy className="w-3 h-3" /> Menor Total
                                    </Badge>
                                  )}
                                </div>
                                {resp.tradeName && resp.supplierName && resp.tradeName !== resp.supplierName && <p className="text-xs text-gray-400">{resp.supplierName}</p>}
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
                            {(resp.paymentTerms || resp.deliveryTerms) && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {resp.paymentTerms && <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">💳 {resp.paymentTerms}</span>}
                                {resp.deliveryTerms && <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-0.5">🚚 {resp.deliveryTerms}</span>}
                              </div>
                            )}
                            <div className="mt-3 space-y-2">
                              {resp.items.map((item: ResponseItem, i: number) => {
                                // Melhor preço normalizado deste item (por grupo nome+embalagem)
                                const gk = itemGroupKey(item.name, (item as any).packaging);
                                const grp = rowsMap[gk];
                                const itemNorm = normalizedUnitPrice(item);
                                const isBest = !!grp && grp.cells.length > 0 && !isNaN(itemNorm) && Math.abs(itemNorm - Math.min(...grp.cells.map(c => c.norm))) < 0.0001;
                                const itemPrice = parseFloat(String(item.price).replace(',', '.'));
                                return (
                                  <div key={i} className={`flex items-center justify-between rounded p-2 text-sm ${isBest ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-800">{item.name}</span>
                                        {item.brand && <span className="text-xs text-gray-400">({item.brand})</span>}
                                        {(item as any).packaging && <Badge variant="outline" className="text-[10px] px-1 py-0">{(item as any).packaging}</Badge>}
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
                            <div className="mt-3 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs text-blue-700 border-blue-300 hover:bg-blue-50 mb-2"
                                onClick={() => setEditResp({
                                  id: resp.id,
                                  supplierName: resp.supplierName || '',
                                  tradeName: resp.tradeName || '',
                                  cnpj: resp.cnpj || '',
                                  address: resp.address || '',
                                  sellerName: resp.sellerName || '',
                                  sellerPhone: resp.sellerPhone || '',
                                  sellerEmail: resp.sellerEmail || '',
                                  paymentTerms: resp.paymentTerms || '',
                                  deliveryTerms: resp.deliveryTerms || '',
                                  productsSold: resp.productsSold || '',
                                  notes: resp.notes || '',
                                })}
                              >
                                <Pencil className="w-3 h-3 mr-1" /> Editar dados do fornecedor
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => {
                                  setEditItemsResp(resp);
                                  setEditItemsList((resp.items || []).map((it: any) => ({
                                    name: it.name || '',
                                    quantity: it.quantity || '1',
                                    unit: it.unit || 'un',
                                    price: it.price || '',
                                    brand: it.brand || '',
                                    packaging: it.packaging || '',
                                    notes: it.notes || '',
                                  })));
                                }}
                              >
                                <Package className="w-3 h-3 mr-1" /> Editar itens / preços
                              </Button>
                            </div>
                            {resp.responseToken && (
                              <div className="mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                                  onClick={() => {
                                    const link = `${window.location.origin}/orcamento/resposta/${resp.responseToken}`;
                                    navigator.clipboard.writeText(link).then(() => toast.success(`Link de revisão copiado! Envie para ${resp.supplierName}`));
                                  }}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Copiar link de revisão para {resp.supplierName}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>

                    {requestDetail.purchaseRequestId && (
                      <Card className="border-2 border-emerald-300 bg-emerald-50/40">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                              <ShoppingCart className="w-4 h-4" /> Vinculado à Solicitação de Compra #{requestDetail.purchaseRequestId}
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-emerald-700"
                              onClick={() => navigate(`/compras/${requestDetail.purchaseRequestId}`)}
                            >
                              Ver solicitação <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          {requestDetail.purchaseRequestDecided ? (
                            <div className="space-y-1.5">
                              <p className="text-sm text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Compra já confirmada nessa solicitação.
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-emerald-800">
                                {requestDetail.purchasePaymentMethod && (
                                  <span>Pagamento: <strong>{PAYMENT_METHOD_LABELS[requestDetail.purchasePaymentMethod] || requestDetail.purchasePaymentMethod}</strong></span>
                                )}
                                {requestDetail.purchaseInvoiceUrl && (
                                  <a href={requestDetail.purchaseInvoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline">
                                    <FileText className="w-3.5 h-3.5" /> Ver Nota Fiscal
                                  </a>
                                )}
                                {requestDetail.purchaseReceiptUrl && (
                                  <a href={requestDetail.purchaseReceiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline">
                                    <FileText className="w-3.5 h-3.5" /> Ver Comprovante
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-emerald-800">
                                Fecha automaticamente com o melhor preço de cada item (respeitando qualquer escolha manual
                                feita na planilha acima) — pode envolver mais de um fornecedor.
                              </p>
                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700 h-9 w-full sm:w-auto"
                                disabled={confirmPurchaseMutation.isPending || adminSetBestMutation.isPending}
                                onClick={openConfirmPurchaseDialog}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Confirmar Compra
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {!requestDetail.purchaseRequestId && requestDetail.responses.length > 0 && (
                      <Card className="border-2 border-purple-300 bg-purple-50/40">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-semibold text-purple-900 flex items-center gap-1.5">
                            <ShoppingCart className="w-4 h-4" /> Nenhuma Solicitação de Compra vinculada — gerar uma agora?
                          </p>
                          <p className="text-xs text-purple-800">
                            Fecha automaticamente com o melhor preço de cada item (respeitando qualquer escolha manual
                            feita na planilha acima) — pode envolver mais de um fornecedor.
                          </p>
                          <Button
                            className="bg-purple-600 hover:bg-purple-700 h-9 w-full sm:w-auto"
                            disabled={createPurchaseFromDecisionMutation.isPending || adminSetBestMutation.isPending}
                            onClick={() => createPurchaseFromDecisionMutation.mutate({ quotationRequestId: requestDetail.id })}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {createPurchaseFromDecisionMutation.isPending ? 'Gerando...' : 'Gerar Solicitação de Compra'}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="pt-2">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setViewResponsesId(null); setAutoProcessResult(null); setShowWhatsAppSummary(false); setQtyDrafts({}); }}
              >
                Fechar
              </Button>
              {requestDetail && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (requestDetail) openWhatsApp(requestDetail.token, requestDetail);
                  }}
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar fornecedores
                </Button>
              )}
              {requestDetail && requestDetail.responses.length > 0 && !autoProcessResult && (
                <Button
                  onClick={() => setShowAutoProcessConfirm(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={autoProcessMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {autoProcessMutation.isPending ? "Gerando..." : "Avisar Gestores (WhatsApp)"}
                </Button>
              )}
              {autoProcessResult && (
                <Button
                  onClick={() => setShowWhatsAppSummary(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ver Resumo
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação: Gerar Resumo */}
      <AlertDialog open={showAutoProcessConfirm} onOpenChange={setShowAutoProcessConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Avisar os gestores por WhatsApp?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Isso é só pra comunicação — não é necessário pra fechar a compra (já dá pra usar
                  "Confirmar Compra"/"Gerar Solicitação de Compra" direto, sem passar por aqui).
                </p>
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
                    <span><strong>Registrar catálogo de preços</strong> com todos os itens e valores, de todos os fornecedores</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span><strong>Gerar mensagem profissional</strong> com resumo de onde comprar e totais</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (viewResponsesId) {
                  autoProcessMutation.mutate({ quotationRequestId: viewResponsesId });
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Avisar Gestores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL: RESUMO WHATSAPP PARA GESTORES ===== */}
      <Dialog open={showWhatsAppSummary} onOpenChange={setShowWhatsAppSummary}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Resumo para Gestores — WhatsApp
            </DialogTitle>
          </DialogHeader>

          {autoProcessResult && (
            <div className="space-y-4">
              {/* Resumo visual */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Processado com sucesso</span>
                </div>
                <p className="text-xs text-green-700">
                  {autoProcessResult.suppliersCreated} fornecedor(es) criado(s) · {autoProcessResult.catalogEntriesCreated} entradas no catálogo
                </p>
              </div>

              {/* Tabela de itens */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500" /> Melhor preço por item
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-2 text-xs font-semibold text-gray-600">Item</th>
                        <th className="text-center p-2 text-xs font-semibold text-gray-600">Qtd</th>
                        <th className="text-left p-2 text-xs font-semibold text-gray-600">Fornecedor</th>
                        <th className="text-right p-2 text-xs font-semibold text-gray-600">Valor Un.</th>
                        <th className="text-right p-2 text-xs font-semibold text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoProcessResult.summaryItems.map((item, i) => (
                        <tr key={i} className={`border-b last:border-0 ${item.found ? '' : 'bg-red-50'}`}>
                          <td className="p-2 font-medium text-gray-800">{item.name}</td>
                          <td className="p-2 text-center text-gray-600">{item.quantity} {item.unit}</td>
                          <td className="p-2 text-gray-600">
                            {item.found ? (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                                {item.bestSupplierName}
                              </span>
                            ) : (
                              <span className="text-red-400 italic text-xs">Não cotado</span>
                            )}
                          </td>
                          <td className="p-2 text-right text-gray-700">
                            {item.found ? fmtPrice(item.bestPrice) : '—'}
                          </td>
                          <td className="p-2 text-right font-semibold text-gray-800">
                            {item.found ? fmtPrice(item.subtotal) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={4} className="p-2 text-right font-bold text-gray-700">TOTAL ESTIMADO:</td>
                        <td className="p-2 text-right font-bold text-green-700 text-base">{fmtPrice(autoProcessResult.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Link para o sistema */}
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-2">
                <ExternalLinkIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <span>Link para o orçamento completo:</span>
                <a
                  href={`${window.location.origin}/orcamentos?open=${autoProcessResult.quotationRequestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium truncate"
                >
                  {window.location.host}/orcamentos?open={autoProcessResult.quotationRequestId}
                </a>
              </div>

              {/* Mensagem formatada */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <MessageCircle className="w-4 h-4 text-green-500" /> Mensagem para Gestores
                </Label>
                <div className="bg-[#ECE5DD] border rounded-lg p-3 max-h-72 overflow-y-auto">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {buildManagerWhatsAppMessage(autoProcessResult)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyManagerMessage}
                  className="flex-1"
                >
                  {copiedWhatsApp ? (
                    <><Check className="w-4 h-4 mr-2 text-green-500" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar Mensagem</>
                  )}
                </Button>
                <Button
                  onClick={openManagerWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Abrir no WhatsApp
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppSummary(false)} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {(suppliers || []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.companyName}</SelectItem>)}
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

      {/* Dialog: Editar dados do fornecedor na resposta */}
      <Dialog open={!!editResp} onOpenChange={() => setEditResp(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Editar fornecedor</DialogTitle>
          </DialogHeader>
          {editResp && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nome Fantasia</Label>
                  <Input value={editResp.tradeName} onChange={e => setEditResp((p: any) => ({ ...p, tradeName: e.target.value }))} placeholder="Como conhecemos a loja" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Razão Social</Label>
                  <Input value={editResp.supplierName} onChange={e => setEditResp((p: any) => ({ ...p, supplierName: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={editResp.cnpj} onChange={e => setEditResp((p: any) => ({ ...p, cnpj: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Cidade/UF</Label>
                  <Input value={editResp.address} onChange={e => setEditResp((p: any) => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Vendedor</Label>
                  <Input value={editResp.sellerName} onChange={e => setEditResp((p: any) => ({ ...p, sellerName: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Telefone/WhatsApp</Label>
                  <Input value={editResp.sellerPhone} onChange={e => setEditResp((p: any) => ({ ...p, sellerPhone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Formas de pagamento</Label>
                  <Input value={editResp.paymentTerms} onChange={e => setEditResp((p: any) => ({ ...p, paymentTerms: e.target.value }))} placeholder="Ex: 28 dias, à vista, boleto" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Entrega / frete</Label>
                  <Input value={editResp.deliveryTerms} onChange={e => setEditResp((p: any) => ({ ...p, deliveryTerms: e.target.value }))} placeholder="Ex: 3 dias, frete grátis" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">O que vende</Label>
                  <Input value={editResp.productsSold} onChange={e => setEditResp((p: any) => ({ ...p, productsSold: e.target.value }))} placeholder="Ex: óleos, filtros, peças" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={editResp.notes} onChange={e => setEditResp((p: any) => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditResp(null)}>Cancelar</Button>
            <Button
              disabled={adminUpdateRespMutation.isPending}
              onClick={() => adminUpdateRespMutation.mutate({
                responseId: editResp.id,
                supplierName: editResp.supplierName,
                tradeName: editResp.tradeName,
                cnpj: editResp.cnpj,
                address: editResp.address,
                sellerName: editResp.sellerName,
                sellerPhone: editResp.sellerPhone,
                sellerEmail: editResp.sellerEmail,
                paymentTerms: editResp.paymentTerms,
                deliveryTerms: editResp.deliveryTerms,
                productsSold: editResp.productsSold,
                notes: editResp.notes,
              })}
            >
              {adminUpdateRespMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar itens/preços de uma resposta */}
      <Dialog open={!!editItemsResp} onOpenChange={() => setEditItemsResp(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Itens — {editItemsResp?.tradeName || editItemsResp?.supplierName}</DialogTitle>
          </DialogHeader>
          {editItemsResp && (
            <div className="space-y-3">
              {editItemsList.map((it: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-2 space-y-2 bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    <Input
                      className="flex-1 h-8 text-xs"
                      value={it.name}
                      onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                      placeholder="Produto"
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => setEditItemsList(editItemsList.filter((_, i) => i !== idx))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Qtd</Label>
                      <Input className="h-8 text-xs" value={it.quantity} onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Preço unit. (R$)</Label>
                      <Input className="h-8 text-xs" value={it.price} onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} placeholder="0,00" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Embalagem</Label>
                      <select
                        className="h-8 w-full text-xs border rounded px-1 bg-white"
                        value={it.packaging}
                        onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, packaging: e.target.value } : x))}
                      >
                        <option value="">—</option>
                        <option value="1L">1L</option>
                        <option value="5L">5L</option>
                        <option value="10L">10L</option>
                        <option value="20L">20L (galão)</option>
                        <option value="200L">200L (tambor)</option>
                        <option value="Unidade">Unidade</option>
                        <option value="Kg">Kg</option>
                        <option value="Caixa">Caixa</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Marca</Label>
                      <Input className="h-8 text-xs" value={it.brand} onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, brand: e.target.value } : x))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Obs.</Label>
                      <Input className="h-8 text-xs" value={it.notes} onChange={e => setEditItemsList(editItemsList.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setEditItemsList([...editItemsList, { name: '', quantity: '1', unit: 'un', price: '', brand: '', packaging: '', notes: '' }])}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar item
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemsResp(null)}>Cancelar</Button>
            <Button
              disabled={adminUpdateItemsMutation.isPending}
              onClick={() => {
                const valid = editItemsList.filter((i: any) => i.name.trim() && String(i.price).trim());
                if (valid.length === 0) { toast.error('Informe ao menos um item com preço'); return; }
                adminUpdateItemsMutation.mutate({ responseId: editItemsResp.id, items: valid });
              }}
            >
              {adminUpdateItemsMutation.isPending ? 'Salvando...' : 'Salvar itens'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar Compra — forma de pagamento + NF/comprovante (opcionais) */}
      <Dialog open={showConfirmPurchaseDialog} onOpenChange={setShowConfirmPurchaseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Confirmar Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={confirmPaymentMethod} onValueChange={setConfirmPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Selecionar (opcional)..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-gray-400" /> Nota Fiscal (opcional)</Label>
              {confirmInvoiceUrl ? (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <a href={confirmInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Anexada — ver arquivo
                  </a>
                  <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => setConfirmInvoiceUrl('')}><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <Input type="file" accept="image/*,application/pdf" disabled={uploadingInvoice}
                  onChange={e => handlePickFile('invoice', e.target.files?.[0])} className="mt-1" />
              )}
              {uploadingInvoice && <p className="text-xs text-gray-400 mt-1">Enviando...</p>}
            </div>
            <div>
              <Label className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-gray-400" /> Comprovante de Pagamento (opcional)</Label>
              {confirmReceiptUrl ? (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <a href={confirmReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Anexado — ver arquivo
                  </a>
                  <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => setConfirmReceiptUrl('')}><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <Input type="file" accept="image/*,application/pdf" disabled={uploadingReceipt}
                  onChange={e => handlePickFile('receipt', e.target.files?.[0])} className="mt-1" />
              )}
              {uploadingReceipt && <p className="text-xs text-gray-400 mt-1">Enviando...</p>}
            </div>
            <p className="text-[11px] text-gray-400">Nada aqui é obrigatório — pode confirmar a compra e anexar depois.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmPurchaseDialog(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={confirmPurchaseMutation.isPending || uploadingInvoice || uploadingReceipt}
              onClick={() => confirmPurchaseMutation.mutate({
                quotationRequestId: requestDetail.id,
                paymentMethod: confirmPaymentMethod || undefined,
                invoiceUrl: confirmInvoiceUrl || undefined,
                receiptUrl: confirmReceiptUrl || undefined,
              })}
            >
              {confirmPurchaseMutation.isPending ? 'Confirmando...' : 'Confirmar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
