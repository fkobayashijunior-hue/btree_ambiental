// @ts-nocheck
// Administrador escolhe quais atalhos aparecem no Painel e em que ordem.
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { CATALOGO_PAINEL, PADRAO_PAINEL } from "@/lib/quickAccessCatalog";

export default function PersonalizarPainelDialog({ open, onClose, atuais }: { open: boolean; onClose: () => void; atuais: string[] }) {
  const utils = trpc.useUtils();
  const [lista, setLista] = useState<string[]>(atuais);
  useEffect(() => { if (open) setLista(atuais); }, [open]);

  const done = () => { utils.quickAccess.get.invalidate(); onClose(); };
  const salvar = trpc.quickAccess.save.useMutation({ onSuccess: () => { toast.success("Painel personalizado"); done(); }, onError: (e) => toast.error(e.message) });
  const reset = trpc.quickAccess.reset.useMutation({ onSuccess: () => { toast.success("Painel voltou ao padrão"); done(); }, onError: (e) => toast.error(e.message) });

  const mover = (i: number, d: number) => setLista((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const porId = Object.fromEntries(CATALOGO_PAINEL.map((c) => [c.id, c]));
  const disponiveis = CATALOGO_PAINEL.filter((c) => !lista.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Personalizar o Painel</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">No seu painel ({lista.length})</p>
            <ul className="space-y-1">
              {lista.map((id, i) => {
                const c = porId[id];
                if (!c) return null;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-lg border p-1.5 text-sm">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md ${c.color}`}><c.icon className="h-4 w-4 text-white" /></span>
                    <span className="flex-1">{c.label}</span>
                    <button type="button" className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Descer"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" className="p-1 text-gray-400 hover:text-red-600" onClick={() => setLista((l) => l.filter((x) => x !== id))} aria-label="Remover"><X className="h-4 w-4" /></button>
                  </li>
                );
              })}
              {lista.length === 0 && <li className="text-sm text-gray-500">Nenhum atalho. Adicione pela lista ao lado.</li>}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Disponíveis</p>
            <ul className="space-y-1">
              {disponiveis.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setLista((l) => [...l, c.id])} className="flex w-full items-center gap-2 rounded-lg border p-1.5 text-left text-sm hover:bg-gray-50">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md ${c.color}`}><c.icon className="h-4 w-4 text-white" /></span>
                    <span className="flex-1">{c.label}</span>
                    <Plus className="h-4 w-4 text-emerald-600" />
                  </button>
                </li>
              ))}
              {disponiveis.length === 0 && <li className="text-sm text-gray-500">Todos os atalhos já estão no painel.</li>}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={salvar.isPending} onClick={() => salvar.mutate({ itens: lista })}>Salvar</Button>
          <Button variant="outline" onClick={() => setLista(PADRAO_PAINEL)}>Usar o padrão (sem salvar)</Button>
          <Button variant="ghost" className="ml-auto text-gray-500" disabled={reset.isPending} onClick={() => reset.mutate()}>Restaurar padrão salvo</Button>
        </div>
        <p className="text-xs text-gray-500">Cada administrador tem o seu painel. Os demais usuários veem o padrão, apenas com os módulos a que têm acesso.</p>
      </DialogContent>
    </Dialog>
  );
}
