// @ts-nocheck
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package } from "lucide-react";

// Dialog de "Receber no estoque" (conferência por item), extraído pra poder ser aberto
// tanto da ficha da solicitação quanto direto da lista, sem precisar navegar até a ficha.
export default function ReceiveStockDialog({
  purchaseRequestId,
  open,
  onOpenChange,
  onReceived,
}: {
  purchaseRequestId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived?: () => void;
}) {
  const utils = trpc.useUtils();
  const [receiveRows, setReceiveRows] = useState<Record<number, { productId: string; locationId: string; quantity: string; content: string; contentUnit: string }>>({});
  const [receivedByCollaboratorId, setReceivedByCollaboratorId] = useState('');

  const { data: stockLocations = [] } = trpc.stock.listLocations.useQuery(undefined, { enabled: open });
  const { data: stockProducts = [] } = trpc.stock.listProducts.useQuery(undefined, { enabled: open });
  const { data: collaborators = [] } = trpc.collaborators.list.useQuery({ active: true }, { enabled: open });
  const { data: pendingReceipt } = trpc.stock.pendingReceipt.useQuery(
    { purchaseRequestId: purchaseRequestId as number },
    { enabled: open && !!purchaseRequestId }
  );
  const receiveMutation = trpc.stock.receivePurchaseItems.useMutation({
    onSuccess: (r) => {
      toast.success(r.complete ? "Compra recebida e itens lançados no estoque!" : "Recebimento parcial lançado no estoque.");
      onOpenChange(false);
      utils.purchaseRequests.getById.invalidate({ id: purchaseRequestId });
      utils.purchaseRequests.list.invalidate();
      utils.stock.balances.invalidate();
      utils.stock.movements.invalidate();
      onReceived?.();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (open) setReceivedByCollaboratorId('');
  }, [open, purchaseRequestId]);

  useEffect(() => {
    if (!open || !pendingReceipt) return;
    const activeLocs = (stockLocations as any[]).filter(l => l.active);
    const defaultLoc = activeLocs.length === 1 ? String(activeLocs[0].id) : '';
    const rows: any = {};
    for (const it of pendingReceipt.items) {
      if (it.remaining <= 0) continue;
      rows[it.id] = {
        productId: it.suggestedProductId ? String(it.suggestedProductId) : '',
        locationId: it.suggestedLocationId ? String(it.suggestedLocationId) : defaultLoc,
        quantity: String(it.remaining).replace('.', ','),
        content: it.packageSize ? String(it.packageSize).replace('.', ',') : '',
        contentUnit: it.packageUnit || '',
      };
    }
    setReceiveRows(rows);
  }, [open, pendingReceipt, stockLocations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> Receber no estoque — Solicitação #{purchaseRequestId}</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500">Confira o que realmente chegou. Pode receber só parte dos itens/quantidades agora; a solicitação só vira “Recebida” quando tudo for recebido.</p>
        {(stockLocations as any[]).filter(l => l.active).length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Cadastre um local de estoque antes (menu Compras → Estoque → Locais).</p>
        )}
        <div>
          <label className="text-sm font-medium">Quem recebeu *</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm mt-1"
            value={receivedByCollaboratorId}
            onChange={e => setReceivedByCollaboratorId(e.target.value)}
          >
            <option value="">Selecione o colaborador...</option>
            {(collaborators as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {(pendingReceipt?.items ?? []).map((it: any) => {
            const row = receiveRows[it.id];
            if (it.remaining <= 0) return (
              <div key={it.id} className="text-sm text-gray-400 border rounded p-2">{it.name} — já recebido ({it.received})</div>
            );
            if (!row) return null;
            const setRow = (patch: any) => setReceiveRows(r => ({ ...r, [it.id]: { ...r[it.id], ...patch } }));
            return (
              <div key={it.id} className="border rounded-lg p-2.5 space-y-2">
                <div className="text-sm font-medium">{it.name} <span className="text-xs font-normal text-gray-500">— pedido: {it.quantityText} {it.unit}{it.received > 0 ? ` · já recebido: ${it.received}` : ''}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_110px] gap-2">
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={row.productId} onChange={e => setRow({ productId: e.target.value })}>
                    <option value="">Produto do catálogo...</option>
                    {(stockProducts as any[]).filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={row.locationId} onChange={e => setRow({ locationId: e.target.value })}>
                    <option value="">Estoque de destino...</option>
                    {(stockLocations as any[]).filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <Input value={row.quantity} onChange={e => setRow({ quantity: e.target.value })} placeholder="Qtd (un)" title="Quantidade de unidades recebidas (ex: 10 baldes)" />
                </div>
                {(() => {
                  const prod = (stockProducts as any[]).find(p => String(p.id) === row.productId);
                  const pu = String(prod?.unit || '').toLowerCase();
                  if (pu !== 'l' && pu !== 'kg' && pu !== 'm') return null;
                  const cUnit = row.contentUnit || (pu === 'm' ? 'm' : pu === 'kg' ? 'kg' : 'L');
                  const c = parseFloat(String(row.content).replace(',', '.'));
                  const q = parseFloat(String(row.quantity).replace(',', '.'));
                  const dens = Number(prod?.density_kg_l) || 0;
                  let total: number | null = null;
                  if (c > 0 && q > 0) {
                    const same = cUnit.toLowerCase() === pu;
                    total = same ? q * c : (pu !== 'm' && dens > 0) ? (pu === 'l' ? (q * c) / dens : q * c * dens) : null;
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_1fr] gap-2 items-center">
                      <div className="text-xs text-gray-600">Conteúdo por unidade (ex: balde de 20 L, rolo de 100 m):</div>
                      <div className="flex gap-1">
                        <Input value={row.content} onChange={e => setRow({ content: e.target.value })} placeholder="20" className="w-full" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={cUnit} onChange={e => setRow({ contentUnit: e.target.value })}>
                          <option value="L">L</option><option value="kg">kg</option><option value="m">m</option>
                        </select>
                        <span className="text-xs font-medium text-emerald-700">{total != null ? `= ${Number(total.toFixed(3)).toLocaleString('pt-BR')} ${prod.unit} no estoque` : (c > 0 && q > 0 ? 'cadastre a densidade do produto' : '')}</span>
                      </div>
                    </div>
                  );
                })()}
                {!row.productId && <p className="text-[11px] text-amber-600">Sem produto vinculado: crie em Estoque → Produtos (ou “Importar das compras”) e volte aqui. Itens sem produto ficam de fora deste recebimento.</p>}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={receiveMutation.isPending} onClick={() => {
            if (!receivedByCollaboratorId) { toast.error('Informe quem recebeu'); return; }
            const items = Object.entries(receiveRows)
              .filter(([, r]) => r.productId && r.locationId && parseFloat(r.quantity.replace(',', '.')) > 0)
              .map(([itemId, r]) => {
                const prod = (stockProducts as any[]).find(p => String(p.id) === r.productId);
                const pu = String(prod?.unit || '').toLowerCase();
                const c = parseFloat(String(r.content).replace(',', '.'));
                const vol = (pu === 'l' || pu === 'kg' || pu === 'm') && c > 0;
                const cUnit = r.contentUnit || (pu === 'm' ? 'm' : pu === 'kg' ? 'kg' : 'L');
                return { itemId: Number(itemId), productId: Number(r.productId), locationId: Number(r.locationId), quantityReceived: parseFloat(r.quantity.replace(',', '.')), ...(vol ? { contentPerUnit: c, contentUnit: cUnit } : {}) };
              });
            if (items.length === 0) { toast.error('Preencha produto, estoque e quantidade de ao menos um item'); return; }
            receiveMutation.mutate({ purchaseRequestId: purchaseRequestId as number, receivedByCollaboratorId: Number(receivedByCollaboratorId), items });
          }}>{receiveMutation.isPending ? 'Lançando...' : 'Confirmar recebimento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
