// @ts-nocheck
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Image, CheckCircle2, Clock, ShoppingCart,
  Package, Truck, ClipboardCheck, Eye, AlertTriangle, Calendar, Edit2
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lida: 'bg-blue-100 text-blue-800 border-blue-200',
  aprovada: 'bg-green-100 text-green-800 border-green-200',
  comprada: 'bg-purple-100 text-purple-800 border-purple-200',
  recebida: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', lida: 'Lida', aprovada: 'Aprovada',
  comprada: 'Comprada', recebida: 'Recebida', cancelada: 'Cancelada',
};

const URGENCY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};

const URGENCY_LABELS: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PurchaseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  
  const utils = trpc.useUtils();
  const id = parseInt(params.id || '0');

  const [showLightbox, setShowLightbox] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expectedArrival, setExpectedArrival] = useState('');

  const { data: req, isLoading } = trpc.purchaseRequests.getById.useQuery({ id });

  const markReadMutation = trpc.purchaseRequests.markRead.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); toast.success("Marcado como lida"); },
  });

  const markPurchasedMutation = trpc.purchaseRequests.markPurchased.useMutation({
    onSuccess: () => {
      utils.purchaseRequests.getById.invalidate({ id });
      setShowPurchaseDialog(false);
      toast.success("Marcado como comprado");
    },
  });

  const markReceivedMutation = trpc.purchaseRequests.markReceived.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); toast.success("Marcado como recebido"); },
  });

  const confirmItemsMutation = trpc.purchaseRequests.confirmItems.useMutation({
    onSuccess: () => { utils.purchaseRequests.getById.invalidate({ id }); toast.success("Itens confirmados"); },
  });

  const toggleItemMutation = trpc.purchaseRequests.toggleItemConfirm.useMutation({
    onSuccess: () => utils.purchaseRequests.getById.invalidate({ id }),
  });

  if (isLoading) return <div className="p-4 text-center text-gray-400">Carregando...</div>;
  if (!req) return <div className="p-4 text-center text-gray-400">Solicitação não encontrada</div>;

  const images: string[] = req.images ? JSON.parse(req.images) : [];

  // Timeline steps
  const timeline = [
    {
      key: 'request',
      label: 'Solicitado',
      icon: <ShoppingCart className="w-4 h-4" />,
      date: req.requestDate,
      done: true,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      key: 'read',
      label: 'Lido pelo responsável',
      icon: <Eye className="w-4 h-4" />,
      date: req.readDate,
      done: !!req.readDate,
      color: req.readDate ? 'text-blue-600' : 'text-gray-400',
      bgColor: req.readDate ? 'bg-blue-100' : 'bg-gray-100',
      action: !req.readDate ? () => markReadMutation.mutate({ id }) : undefined,
      actionLabel: 'Marcar como lida',
    },
    {
      key: 'purchase',
      label: 'Comprado',
      icon: <ShoppingCart className="w-4 h-4" />,
      date: req.purchaseDate,
      done: !!req.purchaseDate,
      color: req.purchaseDate ? 'text-purple-600' : 'text-gray-400',
      bgColor: req.purchaseDate ? 'bg-purple-100' : 'bg-gray-100',
      action: !req.purchaseDate ? () => setShowPurchaseDialog(true) : undefined,
      actionLabel: 'Registrar compra',
    },
    {
      key: 'arrival',
      label: 'Previsão de chegada',
      icon: <Truck className="w-4 h-4" />,
      date: req.expectedArrival,
      done: !!req.expectedArrival,
      color: req.expectedArrival ? 'text-orange-600' : 'text-gray-400',
      bgColor: req.expectedArrival ? 'bg-orange-100' : 'bg-gray-100',
      isInfo: true,
    },
    {
      key: 'received',
      label: 'Recebido',
      icon: <Package className="w-4 h-4" />,
      date: req.receivedDate,
      done: !!req.receivedDate,
      color: req.receivedDate ? 'text-emerald-600' : 'text-gray-400',
      bgColor: req.receivedDate ? 'bg-emerald-100' : 'bg-gray-100',
      action: !req.receivedDate && req.purchaseDate ? () => markReceivedMutation.mutate({ id }) : undefined,
      actionLabel: 'Marcar como recebido',
    },
    {
      key: 'confirmed',
      label: 'Itens conferidos',
      icon: <ClipboardCheck className="w-4 h-4" />,
      date: req.itemsConfirmedDate,
      done: !!req.itemsConfirmedDate,
      color: req.itemsConfirmedDate ? 'text-teal-600' : 'text-gray-400',
      bgColor: req.itemsConfirmedDate ? 'bg-teal-100' : 'bg-gray-100',
      action: !req.itemsConfirmedDate && req.receivedDate ? () => confirmItemsMutation.mutate({ id }) : undefined,
      actionLabel: 'Confirmar todos os itens',
    },
  ];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/compras')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{req.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={`text-xs border ${STATUS_COLORS[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </Badge>
                <Badge className={`text-xs ${URGENCY_COLORS[req.urgency]}`}>
                  {req.urgency === 'critica' || req.urgency === 'alta'
                    ? <AlertTriangle className="w-3 h-3 mr-1 inline" />
                    : <Clock className="w-3 h-3 mr-1 inline" />}
                  {URGENCY_LABELS[req.urgency]}
                </Badge>
                {req.categoryName && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: req.categoryColor || '#ccc', color: req.categoryColor || '#666' }}>
                    {req.categoryName}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {req.description && (
            <p className="text-sm text-gray-600 mt-3">{req.description}</p>
          )}

          {req.linkUrl && (
            <a href={req.linkUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
              onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3" /> Ver produto online
            </a>
          )}

          {req.notes && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
              <span className="font-medium">Obs:</span> {req.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="relative">
            {timeline.map((step, idx) => (
              <div key={step.key} className="flex gap-3 pb-4 last:pb-0">
                {/* Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.bgColor} ${step.color}`}>
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                  </div>
                  {idx < timeline.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${step.done ? 'bg-green-200' : 'bg-gray-200'}`} style={{ minHeight: '16px' }} />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                    {step.date && (
                      <span className="text-xs text-gray-400">{fmt(step.date)}</span>
                    )}
                  </div>
                  {step.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 h-7 text-xs"
                      onClick={step.action}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {step.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {req.items && req.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens Solicitados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {req.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <Checkbox
                  checked={item.confirmed === 1}
                  onCheckedChange={(checked) =>
                    toggleItemMutation.mutate({ itemId: item.id, confirmed: !!checked })
                  }
                />
                <div className="flex-1">
                  <span className={`text-sm ${item.confirmed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {item.quantity} {item.unit}
                  </span>
                  {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                </div>
                {item.confirmed === 1 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {images.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-4 h-4" /> Fotos ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowLightbox(url)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(null)}
        >
          <img src={showLightbox} alt="Foto" className="max-w-full max-h-full rounded object-contain" />
        </div>
      )}

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data da compra</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Previsão de chegada</Label>
              <Input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => markPurchasedMutation.mutate({
                id,
                purchaseDate: purchaseDate ? purchaseDate + ' 00:00:00' : undefined,
                expectedArrival: expectedArrival ? expectedArrival + ' 00:00:00' : undefined,
              })}
              disabled={markPurchasedMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {markPurchasedMutation.isPending ? 'Salvando...' : 'Confirmar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
