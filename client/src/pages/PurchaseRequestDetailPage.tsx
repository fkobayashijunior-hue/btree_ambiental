// @ts-nocheck
import { useState, useMemo } from "react";
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
import {
  ArrowLeft, ExternalLink, Image as ImageIcon, ShoppingCart, Package,
  Truck, Eye, AlertTriangle, Calendar, Edit2, Table, LayoutGrid, Save, Ban, Trash2
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', lida: 'Visualizado', analisando: 'Analisando', comprando: 'Comprando',
  aprovada: 'Aprovada', comprada: 'Comprada', recebida: 'Recebida', cancelada: 'Cancelada', negada: 'Rejeitado',
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

  const [viewMode, setViewMode] = useState<'ficha' | 'grade'>('ficha');
  const [showLightbox, setShowLightbox] = useState<string | null>(null);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Editable grid state
  const [editStatus, setEditStatus] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editArrival, setEditArrival] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: req, isLoading } = trpc.purchaseRequests.getById.useQuery({ id }, {
    onSuccess: (d) => {
      if (!dirty) {
        setEditStatus(d.status);
        setEditPurchaseDate(toInputDate(d.purchaseDate));
        setEditArrival(toInputDate(d.expectedArrival));
      }
    },
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

  function saveGrid() {
    // salva datas + status juntos
    updateDatesMutation.mutate({ id, purchaseDate: editPurchaseDate || null, expectedArrival: editArrival || null }, {
      onSuccess: () => {
        if (editStatus && editStatus !== req.status) {
          updateStatusMutation.mutate({ id, status: editStatus as any });
        }
      },
    });
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
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/compras')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="flex gap-1 border rounded-lg p-1 bg-gray-50">
          <Button size="sm" variant={viewMode === 'ficha' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setViewMode('ficha')}>
            <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Ficha
          </Button>
          <Button size="sm" variant={viewMode === 'grade' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setViewMode('grade')}>
            <Table className="w-3.5 h-3.5 mr-1" /> Grade
          </Button>
        </div>
      </div>

      {viewMode === 'ficha' ? (
        <>
          {/* ============ VISÃO FICHA ============ */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{req.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={`text-xs border ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</Badge>
                  <Badge className={`text-xs ${URGENCY_COLORS[req.urgency]}`}>
                    {req.urgency === 'critica' || req.urgency === 'alta' ? <AlertTriangle className="w-3 h-3 mr-1 inline" /> : null}
                    {URGENCY_LABELS[req.urgency]}
                  </Badge>
                  {req.categoryName && <Badge variant="outline" className="text-xs">{req.categoryName}</Badge>}
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
                <div className="text-gray-500">Data da compra</div><div className="font-medium">{fmtDate(req.purchaseDate) || '—'}</div>
                <div className="text-gray-500">Previsão de entrega</div><div className="font-medium">{fmtDate(req.expectedArrival) || '—'}</div>
                <div className="text-gray-500">Recebido em</div><div className="font-medium">{fmtDate(req.receivedDate) || '—'}</div>
                {req.respondedByName && (<>
                  <div className="text-gray-500">Responsável</div>
                  <div className="font-medium">{req.respondedByName}{req.respondedAt ? ` em ${fmtDate(req.respondedAt)}` : ''}</div>
                </>)}
              </div>

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
                        <th className="px-2 py-1 text-xs">OK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it: any) => (
                        <tr key={it.id} className="border-b">
                          <td className="px-2 py-1.5">{it.name}</td>
                          <td className="px-2 py-1.5">{it.quantity}</td>
                          <td className="px-2 py-1.5">{it.unit}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-500">{it.notes || '—'}</td>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={!!it.confirmed}
                              onChange={e => toggleItemMutation.mutate({ itemId: it.id, confirmed: e.target.checked })} />
                          </td>
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
        </>
      ) : (
        <>
          {/* ============ VISÃO GRADE (editável) ============ */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500 w-40">Código</td><td className="px-3 py-2 font-medium">#{req.id}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Título</td><td className="px-3 py-2 font-medium">{req.title}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Descrição</td><td className="px-3 py-2">{req.description || '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Solicitante</td><td className="px-3 py-2">{req.requestedByName || '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Data solicitação</td><td className="px-3 py-2">{fmtDate(req.requestDate) || '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Equipamento</td><td className="px-3 py-2">{req.equipmentName ? `${req.equipmentName}${req.equipmentPlate ? ` (${req.equipmentPlate})` : ''}` : '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Categoria</td><td className="px-3 py-2">{req.categoryName || '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Urgência</td><td className="px-3 py-2"><Badge className={`text-xs ${URGENCY_COLORS[req.urgency]}`}>{URGENCY_LABELS[req.urgency]}</Badge></td></tr>
                  <tr className="border-b bg-green-50/50">
                    <td className="px-3 py-2 text-gray-700 font-medium">Status *</td>
                    <td className="px-3 py-2">
                      <Select value={editStatus} onValueChange={v => { setEditStatus(v); setDirty(true); }}>
                        <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr className="border-b bg-green-50/50">
                    <td className="px-3 py-2 text-gray-700 font-medium">Data da compra *</td>
                    <td className="px-3 py-2">
                      <Input type="date" value={editPurchaseDate} onChange={e => { setEditPurchaseDate(e.target.value); setDirty(true); }} className="h-8 text-xs w-44" />
                    </td>
                  </tr>
                  <tr className="border-b bg-green-50/50">
                    <td className="px-3 py-2 text-gray-700 font-medium">Data de entrega *</td>
                    <td className="px-3 py-2">
                      <Input type="date" value={editArrival} onChange={e => { setEditArrival(e.target.value); setDirty(true); }} className="h-8 text-xs w-44" />
                    </td>
                  </tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Recebido em</td><td className="px-3 py-2">{fmtDate(req.receivedDate) || '—'}</td></tr>
                  <tr className="border-b"><td className="px-3 py-2 text-gray-500">Responsável</td><td className="px-3 py-2">{req.respondedByName || '—'}</td></tr>
                  {req.responseNotes && <tr className="border-b"><td className="px-3 py-2 text-gray-500">Resposta</td><td className="px-3 py-2">{req.responseNotes}</td></tr>}
                  {req.denialReason && <tr className="border-b"><td className="px-3 py-2 text-gray-500">Motivo rejeição</td><td className="px-3 py-2 text-red-700">{req.denialReason}</td></tr>}
                  {req.linkUrl && (
                    <tr className="border-b"><td className="px-3 py-2 text-gray-500">Link</td>
                      <td className="px-3 py-2"><a href={req.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Abrir produto</a></td>
                    </tr>
                  )}
                  {images.length > 0 && (
                    <tr><td className="px-3 py-2 text-gray-500">Fotos</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {images.map((url, idx) => (
                            <img key={idx} src={url} alt="" className="w-12 h-12 object-cover rounded cursor-pointer" onClick={() => setShowLightbox(url)} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Itens na grade */}
          {req.items && req.items.length > 0 && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-3 py-2 text-xs">Item</th>
                      <th className="px-3 py-2 text-xs">Qtd</th>
                      <th className="px-3 py-2 text-xs">Un</th>
                      <th className="px-3 py-2 text-xs">Obs</th>
                      <th className="px-3 py-2 text-xs">Conferido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {req.items.map((it: any) => (
                      <tr key={it.id} className="border-b">
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="px-3 py-2">{it.quantity}</td>
                        <td className="px-3 py-2">{it.unit}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{it.notes || '—'}</td>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={!!it.confirmed}
                            onChange={e => toggleItemMutation.mutate({ itemId: it.id, confirmed: e.target.checked })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveGrid} disabled={!dirty || updateStatusMutation.isPending || updateDatesMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-1" /> {updateStatusMutation.isPending || updateDatesMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRespondDialog(true)}>
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Responder
            </Button>
            {req.status !== 'comprada' && req.status !== 'recebida' && req.status !== 'negada' && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowDenyDialog(true)}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Rejeitar
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-gray-500 border-gray-300 hover:bg-gray-50" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
            </Button>
          </div>
          <p className="text-xs text-gray-400">* Campos editáveis em destaque. Clique em Salvar para gravar.</p>
        </>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowLightbox(null)}>
          <img src={showLightbox} alt="Foto" className="max-w-full max-h-full rounded object-contain" />
        </div>
      )}

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
