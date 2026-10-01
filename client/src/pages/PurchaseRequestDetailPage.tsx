// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReceiveStockDialog from "@/components/ReceiveStockDialog";
import {
  ArrowLeft, ExternalLink, Image as ImageIcon, ShoppingCart, Package,
  Truck, Eye, AlertTriangle, Calendar, Edit2, Save, Ban, Trash2, Send, FileText
} from "lucide-react";

// 'Em orçamento' é o rótulo de exibição do valor interno 'analisando'. 'lida' e
// 'aprovada' saíram do fluxo ativo — ficam só pra não quebrar registros antigos.
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', lida: 'Visualizado', analisando: 'Em orçamento', comprando: 'Comprando',
  aprovada: 'Aprovada', comprada: 'Comprada', recebida: 'Recebida', cancelada: 'Cancelada', negada: 'Negada',
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  boleto: 'Boleto', pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro', transferencia: 'Transferência', outro: 'Outro',
};
// Mesma máquina de estados do servidor (server/routers/purchaseRequests.ts) — só pra
// filtrar as opções do dropdown; a validação de verdade acontece no backend.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pendente: ['analisando', 'comprada', 'negada', 'cancelada'],
  analisando: ['comprada', 'negada', 'cancelada'],
  comprada: ['recebida'],
  recebida: [],
  negada: [],
  cancelada: [],
  lida: ['analisando', 'comprada', 'negada', 'cancelada'],
  aprovada: ['comprada', 'cancelada'],
  comprando: ['comprada', 'negada', 'cancelada'],
};
const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lida: 'bg-blue-100 text-blue-800 border-blue-200',
  analisando: 'bg-amber-100 text-amber-800 border-amber-200',
  comprando: 'bg-purple-100 text-purple-800 border-purple-200',
  aprovada: 'bg-green-100 text-green-800 border-green-200',
  comprada: 'bg-violet-100 text-violet-800 border-violet-200',
  recebida: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
  negada: 'bg-red-100 text-red-800 border-red-200',
};
const URGENCY_LABELS: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const URGENCY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600', media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700', critica: 'bg-red-100 text-red-700',
};

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function toInputDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function PurchaseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const id = parseInt(params.id || '0');

  const [showLightbox, setShowLightbox] = useState<string | null>(null);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Compra direta (sem passar por orçamento/fornecedor respondendo — ex: item comprado
  // direto num site/loja online)
  // Recebimento no estoque (conferência por item, com quantidade recebida e local de destino)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showDirectPurchaseDialog, setShowDirectPurchaseDialog] = useState(false);
  const [directSupplierId, setDirectSupplierId] = useState('');
  const [directNewSupplierName, setDirectNewSupplierName] = useState('');
  const [directItemPrices, setDirectItemPrices] = useState<Record<number, string>>({});
  // Editable grid state
  const [editStatus, setEditStatus] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editArrival, setEditArrival] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: req, isLoading } = trpc.purchaseRequests.getById.useQuery({ id });

  // Preenche os campos editáveis da Grade com os dados do servidor. Precisa ser
  // useEffect (não onSuccess do useQuery, removido no React Query v5) — sem isso
  // os campos ficavam sempre em branco, mesmo com os dados já carregados.
  useEffect(() => {
    if (req && !dirty) {
      setEditStatus(req.status);
      setEditUrgency(req.urgency);
      setEditPurchaseDate(toInputDate(req.purchaseDate));
      setEditArrival(toInputDate(req.expectedArrival));
    }
  }, [req, dirty]);

  const updateMutation = trpc.purchaseRequests.update.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); utils.purchaseRequests.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.purchaseRequests.updateStatus.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); utils.purchaseRequests.list.invalidate(); toast.success("Status atualizado"); setDirty(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateDatesMutation = trpc.purchaseRequests.updateDates.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); utils.purchaseRequests.list.invalidate(); toast.success("Datas atualizadas"); setDirty(false); },
    onError: (e) => toast.error(e.message),
  });
  const respondMutation = trpc.purchaseRequests.respond.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); setShowRespondDialog(false); setResponseNotes(''); toast.success("Resposta registrada"); },
    onError: (e) => toast.error(e.message),
  });
  const denyMutation = trpc.purchaseRequests.deny.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); utils.purchaseRequests.list.invalidate(); setShowDenyDialog(false); setDenialReason(''); toast.success("Solicitação rejeitada"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.purchaseRequests.delete.useMutation({
    onSuccess: () => { utils.purchaseRequests.list.invalidate(); toast.success("Solicitação excluída"); navigate('/compras'); },
    onError: (e) => toast.error(e.message),
  });
  const toggleItemMutation = trpc.purchaseRequests.toggleItemConfirm.useMutation({
    onSuccess: () => utils.purchaseRequests.getById.invalidate({ id }),
  });
  const requestQuotationMutation = trpc.purchaseRequests.requestQuotation.useMutation({
    onSuccess: (data) => {
      utils.purchaseRequests.getById.invalidate({ id });
      utils.purchaseRequests.list.invalidate();
      toast.success("Orçamento criado! Abrindo...");
      navigate(`/orcamentos?open=${data.quotationRequestId}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: suppliersList } = trpc.suppliers.list.useQuery({ activeOnly: true });
  const createSupplierMutation = trpc.suppliers.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const applyDecisionMutation = trpc.purchaseRequests.applyQuotationDecision.useMutation({
    onSuccess: () => {
      utils.purchaseRequests.getById.invalidate({ id });
      utils.purchaseRequests.list.invalidate();
      toast.success("Compra registrada!");
      setShowDirectPurchaseDialog(false);
      setDirectSupplierId('');
      setDirectNewSupplierName('');
      setDirectItemPrices({});
    },
    onError: (e) => toast.error(e.message),
  });

  function openDirectPurchaseDialog() {
    // Começa com os preços em branco, um campo por item da solicitação.
    const initial: Record<number, string> = {};
    (req?.items || []).forEach((it: any) => { initial[it.id] = ''; });
    setDirectItemPrices(initial);
    setShowDirectPurchaseDialog(true);
  }

  const directItemsFilled = req?.items?.length > 0 && req.items.every((it: any) => (directItemPrices[it.id] ?? '').trim());
  // "Preço por item" é o preço UNITÁRIO — o total de cada linha (e o total geral) precisa
  // multiplicar pela quantidade do item, senão "R$12" por unidade de 4 unidades vira R$12 no total.
  const directTotal = (req?.items || []).reduce((s: number, it: any) => {
    const unitPrice = parseFloat(String(directItemPrices[it.id] ?? '').replace(',', '.')) || 0;
    const qty = parseFloat(it.quantity) || 1;
    return s + unitPrice * qty;
  }, 0);

  async function handleDirectPurchaseSubmit() {
    if (!directItemsFilled) { toast.error("Informe o preço de todos os itens"); return; }
    let supplierId = directSupplierId ? parseInt(directSupplierId, 10) : null;
    if (!supplierId) {
      if (!directNewSupplierName.trim()) { toast.error("Escolha um fornecedor ou digite o nome de um novo"); return; }
      const created = await createSupplierMutation.mutateAsync({ name: directNewSupplierName.trim() });
      supplierId = created.id;
      utils.suppliers.list.invalidate();
    }
    // O backend espera o TOTAL de cada linha em `price` (ele mesmo divide pela quantidade
    // pra gravar o preço unitário no histórico de cotações) — por isso convertemos aqui.
    const items = (req?.items || []).map((it: any) => {
      const unitPrice = parseFloat(String(directItemPrices[it.id] ?? '').replace(',', '.')) || 0;
      const qty = parseFloat(it.quantity) || 1;
      return { itemId: it.id, price: (unitPrice * qty).toFixed(2) };
    });
    applyDecisionMutation.mutate({ id, winningSupplierId: supplierId, items });
  }

  function saveChanges() {
    updateDatesMutation.mutate({ id, purchaseDate: editPurchaseDate || null, expectedArrival: editArrival || null });
    if (editUrgency && editUrgency !== req.urgency) {
      updateMutation.mutate({ id, urgency: editUrgency as any });
    }
    if (editStatus && editStatus !== req.status) {
      updateStatusMutation.mutate({ id, status: editStatus as any });
    }
  }

  if (isLoading) return <div className="p-4 text-center text-gray-400">Carregando...</div>;
  if (!req) return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/compras')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>
      <div className="p-8 text-center text-gray-400">Solicitação não encontrada</div>
    </div>
  );

  let images: string[] = [];
  try {
    if (req.images && typeof req.images === 'string' && req.images.trim().startsWith('[')) {
      images = JSON.parse(req.images);
    }
  } catch { images = []; }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/compras')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{req.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  <Select value={editStatus} onValueChange={v => { setEditStatus(v); setDirty(true); }}>
                    <SelectTrigger className={`h-7 text-xs w-auto gap-1 border ${STATUS_COLORS[editStatus] || ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS)
                        .filter(([k]) => k === req.status || ALLOWED_TRANSITIONS[req.status]?.includes(k))
                        .map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={editUrgency} onValueChange={v => { setEditUrgency(v); setDirty(true); }}>
                    <SelectTrigger className={`h-7 text-xs w-auto gap-1 border-0 ${URGENCY_COLORS[editUrgency] || ''}`}>
                      {(editUrgency === 'critica' || editUrgency === 'alta') && <AlertTriangle className="w-3 h-3" />}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {req.categoryName && <Badge variant="outline" className="text-xs">{req.categoryName}</Badge>}
                  {dirty && (
                    <Button size="sm" onClick={saveChanges} disabled={updateStatusMutation.isPending || updateMutation.isPending || updateDatesMutation.isPending} className="h-7 text-xs bg-green-600 hover:bg-green-700 ml-auto">
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {(updateStatusMutation.isPending || updateMutation.isPending || updateDatesMutation.isPending) ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  )}
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url, idx) => (
                    <img key={idx} src={url} alt={`Foto ${idx + 1}`}
                      className="w-full h-28 object-cover rounded cursor-pointer hover:opacity-90"
                      onClick={() => setShowLightbox(url)} />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-gray-500">Código</div><div className="font-medium">#{req.id}</div>
                <div className="text-gray-500">Solicitante</div><div className="font-medium">{req.requestedByName || '—'}</div>
                <div className="text-gray-500">Data da solicitação</div><div className="font-medium">{fmtDate(req.requestDate) || '—'}</div>
                {req.equipmentName && (<>
                  <div className="text-gray-500">Equipamento</div>
                  <div className="font-medium">{req.equipmentName}{req.equipmentPlate ? ` (${req.equipmentPlate})` : ''}</div>
                </>)}
                <div className="text-gray-500 self-center">Data da compra</div>
                <div><Input type="date" value={editPurchaseDate} onChange={e => { setEditPurchaseDate(e.target.value); setDirty(true); }} className="h-8 text-xs w-40" /></div>
                <div className="text-gray-500 self-center">Previsão de entrega</div>
                <div><Input type="date" value={editArrival} onChange={e => { setEditArrival(e.target.value); setDirty(true); }} className="h-8 text-xs w-40" /></div>
                <div className="text-gray-500">Recebido em</div><div className="font-medium">{fmtDate(req.receivedDate) || '—'}</div>
                {!!req.isDirectPurchase && (<>
                  <div className="text-gray-500">Origem</div>
                  <div className="font-medium flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">Compra direta</Badge>
                    {req.purchasedByName && <span>comprado por {req.purchasedByName}</span>}
                  </div>
                </>)}
                {req.respondedByName && (<>
                  <div className="text-gray-500">Responsável</div>
                  <div className="font-medium">{req.respondedByName}{req.respondedAt ? ` em ${fmtDate(req.respondedAt)}` : ''}</div>
                </>)}
                {req.suppliersBreakdown && req.suppliersBreakdown.length > 0 ? (<>
                  <div className="text-gray-500">{req.suppliersBreakdown.length > 1 ? 'Fornecedores' : 'Fornecedor vencedor'}</div>
                  <div className="font-medium">
                    {req.suppliersBreakdown.map((s: any) => `${s.supplierName} (R$ ${Number(s.subtotal).toFixed(2)})`).join(', ')}
                  </div>
                </>) : req.winningSupplierName && (<>
                  <div className="text-gray-500">Fornecedor vencedor</div>
                  <div className="font-medium">{req.winningSupplierName}</div>
                </>)}
                {req.finalPrice && (<>
                  <div className="text-gray-500">Preço final</div>
                  <div className="font-medium">R$ {req.finalPrice}</div>
                </>)}
                {req.paymentMethod && (<>
                  <div className="text-gray-500">Forma de pagamento</div>
                  <div className="font-medium">{PAYMENT_METHOD_LABELS[req.paymentMethod] || req.paymentMethod}</div>
                </>)}
                {(req.invoiceUrl || req.receiptUrl) && (<>
                  <div className="text-gray-500">Anexos</div>
                  <div className="font-medium flex flex-wrap gap-3">
                    {req.invoiceUrl && (
                      <a href={req.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Nota Fiscal
                      </a>
                    )}
                    {req.receiptUrl && (
                      <a href={req.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Comprovante
                      </a>
                    )}
                  </div>
                </>)}
              </div>

              {req.quotationRequestId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/orcamentos?open=${req.quotationRequestId}`)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm hover:bg-emerald-100 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Orçamento vinculado — Ver comparativo
                </button>
              ) : (req.status === 'pendente' || req.status === 'lida' || req.status === 'analisando' || req.status === 'comprando') && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => requestQuotationMutation.mutate({ id })}
                    disabled={requestQuotationMutation.isPending || !req.items || req.items.length === 0}
                    title={!req.items || req.items.length === 0 ? "Adicione itens à solicitação para poder pedir orçamento" : undefined}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> {requestQuotationMutation.isPending ? 'Criando...' : 'Solicitar Orçamento'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={openDirectPurchaseDialog}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Registrar Compra Direta
                  </Button>
                </div>
              )}

              {req.description && <p className="text-sm text-gray-600">{req.description}</p>}
              {req.linkUrl && (
                <a href={req.linkUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                  <ExternalLink className="w-3 h-3" /> Ver produto online
                </a>
              )}
              {req.notes && (
                <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                  <span className="font-medium">Obs:</span> {req.notes}
                </div>
              )}
              {req.responseNotes && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-900">
                  <span className="font-medium">Resposta{req.respondedByName ? ` de ${req.respondedByName}` : ''}:</span> {req.responseNotes}
                </div>
              )}
              {req.denialReason && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-900">
                  <span className="font-medium">Motivo da rejeição:</span> {req.denialReason}
                </div>
              )}

              {/* Itens */}
              {req.items && req.items.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Itens solicitados</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="px-2 py-1 text-xs">Item</th>
                        <th className="px-2 py-1 text-xs">Qtd</th>
                        <th className="px-2 py-1 text-xs">Un</th>
                        <th className="px-2 py-1 text-xs">Obs</th>
                        {(req.status === 'comprada' || req.status === 'recebida') && <th className="px-2 py-1 text-xs">Recebido</th>}
                        {(req.status === 'comprada' || req.status === 'recebida') && <th className="px-2 py-1 text-xs">OK</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it: any) => (
                        <tr key={it.id} className="border-b">
                          <td className="px-2 py-1.5">{it.name}</td>
                          <td className="px-2 py-1.5">{it.quantity}</td>
                          <td className="px-2 py-1.5">{it.unit}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-500">{it.notes || '—'}</td>
                          {(req.status === 'comprada' || req.status === 'recebida') && (
                            <td className="px-2 py-1.5 text-xs text-gray-600">
                              {it.receivedQuantity != null ? `${Number(it.receivedQuantity).toLocaleString('pt-BR')} ${it.unit || ''}` : '—'}
                            </td>
                          )}
                          {(req.status === 'comprada' || req.status === 'recebida') && (
                            <td className="px-2 py-1.5">
                              <input type="checkbox" checked={!!it.confirmed}
                                disabled={it.receivedQuantity != null && Number(it.receivedQuantity) > 0}
                                title={it.receivedQuantity != null && Number(it.receivedQuantity) > 0 ? 'Item já lançado no estoque — correções são feitas no módulo de Estoque (ajuste)' : undefined}
                                onChange={e => toggleItemMutation.mutate({ itemId: it.id, confirmed: e.target.checked })} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações do responsável */}
          {req.status !== 'negada' && req.status !== 'cancelada' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRespondDialog(true)}>
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Responder
              </Button>
              {req.status === 'comprada' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowReceiveDialog(true)}>
                  <Package className="w-3.5 h-3.5 mr-1" /> Receber no estoque
                </Button>
              )}
              {req.status !== 'comprada' && req.status !== 'recebida' && (
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowDenyDialog(true)}>
                  <Ban className="w-3.5 h-3.5 mr-1" /> Rejeitar
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-gray-500 border-gray-300 hover:bg-gray-50" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
            </div>
          )}
          {(req.status === 'negada' || req.status === 'cancelada') && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-gray-500 border-gray-300 hover:bg-gray-50" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
            </div>
          )}

      {/* Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowLightbox(null)}>
          <img src={showLightbox} alt="Foto" className="max-w-full max-h-full rounded object-contain" />
        </div>
      )}

      {/* Receber no estoque — conferência por item */}
      <ReceiveStockDialog purchaseRequestId={id} open={showReceiveDialog} onOpenChange={setShowReceiveDialog} />

      {/* Direct Purchase Dialog — para itens comprados direto (site/loja online), sem passar por orçamento */}
      <Dialog open={showDirectPurchaseDialog} onOpenChange={setShowDirectPurchaseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Compra Direta</DialogTitle></DialogHeader>
          <p className="text-xs text-gray-500">
            Para quando o item foi comprado direto (ex: site/loja online), sem passar pelo fluxo
            de orçamento com fornecedores respondendo.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Fornecedor / Loja *</Label>
              <Select value={directSupplierId} onValueChange={(v) => { setDirectSupplierId(v); setDirectNewSupplierName(''); }}>
                <SelectTrigger><SelectValue placeholder="Escolha um fornecedor cadastrado" /></SelectTrigger>
                <SelectContent>
                  {(suppliersList || []).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400 mt-1">Ou, se for um fornecedor novo (ex: "Amazon", "Mercado Livre"), digite abaixo:</p>
              <Input
                className="mt-1"
                placeholder="Nome do fornecedor/loja novo"
                value={directNewSupplierName}
                onChange={(e) => { setDirectNewSupplierName(e.target.value); if (e.target.value) setDirectSupplierId(''); }}
              />
            </div>
            <div>
              <Label>Preço por item *</Label>
              <div className="space-y-2 mt-1">
                {(req?.items || []).map((it: any) => {
                  const unitPrice = parseFloat(String(directItemPrices[it.id] ?? '').replace(',', '.')) || 0;
                  const qty = parseFloat(it.quantity) || 1;
                  return (
                    <div key={it.id} className="flex items-center gap-2">
                      <div className="flex-1 text-sm text-gray-700">
                        {it.name} <span className="text-gray-400 text-xs">({it.quantity} {it.unit})</span>
                      </div>
                      <Input
                        type="number" step="0.01"
                        className="w-28"
                        value={directItemPrices[it.id] ?? ''}
                        onChange={e => setDirectItemPrices(prev => ({ ...prev, [it.id]: e.target.value }))}
                        placeholder="0,00"
                      />
                      <span className="text-xs text-gray-500 w-24 text-right shrink-0">= R$ {(unitPrice * qty).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-base font-bold text-emerald-700">R$ {directTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDirectPurchaseDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleDirectPurchaseSubmit}
              disabled={applyDecisionMutation.isPending || createSupplierMutation.isPending || (!directSupplierId && !directNewSupplierName.trim()) || !directItemsFilled}
            >
              {(applyDecisionMutation.isPending || createSupplierMutation.isPending) ? 'Registrando...' : 'Registrar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responder solicitação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Resposta / parecer *</Label>
              <Textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)}
                placeholder="Ex: Verificando preço com fornecedor, compra aprovada, aguardando orçamento..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespondDialog(false)}>Cancelar</Button>
            <Button onClick={() => respondMutation.mutate({ id, responseNotes })}
              disabled={!responseNotes.trim() || respondMutation.isPending}>
              {respondMutation.isPending ? 'Enviando...' : 'Enviar resposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar solicitação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Motivo da rejeição *</Label>
              <Textarea value={denialReason} onChange={e => setDenialReason(e.target.value)}
                placeholder="Ex: Item fora do orçamento, compra não autorizada..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenyDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => denyMutation.mutate({ id, denialReason })}
              disabled={!denialReason.trim() || denyMutation.isPending}>
              {denyMutation.isPending ? 'Rejeitando...' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir solicitação</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir <strong>{req.title}</strong>? Esta ação não pode ser desfeita e todos os itens e fotos vinculados serão removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
