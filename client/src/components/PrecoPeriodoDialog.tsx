// @ts-nocheck
// "Alterar preço por período": aplica um preço às cargas entregues de um comprador entre duas datas de entrega.
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tags } from "lucide-react";

const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function PrecoPeriodoDialog({ cargas, onChanged }: { cargas: any[]; onChanged?: () => void }) {
  const utils = trpc.useUtils();
  const [aberto, setAberto] = useState(false);
  const [destinoId, setDestinoId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState(hojeLocal());
  const [preco, setPreco] = useState("");

  const compradores = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cargas ?? []) if (c.destinoId) m.set(Number(c.destinoId), String(c.destinoNome ?? `#${c.destinoId}`));
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cargas]);

  const mut = trpc.buyerClients.setPrecoPeriodo.useMutation({
    onSuccess: (r) => {
      utils.contasReceber.invalidate(); onChanged?.(); setAberto(false);
      toast.success(`${r.atualizadas} carga(s) atualizada(s)`);
    },
    onError: (e) => toast.error(e.message),
  });

  const podeAplicar = destinoId && inicio && fim && fim >= inicio && !mut.isPending;
  const aplicar = () => {
    const nome = compradores.find((c) => String(c.id) === destinoId)?.nome ?? "";
    const txt = preco.trim() === "" ? "voltar ao preço do comprador" : `R$ ${preco.trim()} por unidade`;
    if (confirm(`Aplicar ${txt} às cargas de ${nome} entregues de ${inicio.split("-").reverse().join("/")} a ${fim.split("-").reverse().join("/")} (só as ainda não recebidas)?`)) {
      mut.mutate({ destinoId: Number(destinoId), inicio, fim, preco: preco.trim() === "" ? null : preco.trim() });
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setAberto(true)}><Tags className="h-4 w-4" /> Alterar preço por período</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Alterar preço por período</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Comprador</label>
              <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Escolha...</option>
                {compradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="mb-1 block text-sm font-medium">Entregues de</label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="h-10" /></div>
              <div><label className="mb-1 block text-sm font-medium">até</label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-10" /></div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Novo preço por unidade (R$)</label>
              <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="Ex.: 250,00 (vazio = voltar ao preço do comprador)" className="h-10" />
            </div>
            <p className="text-xs text-gray-500">Vale só para as cargas <b>ainda não recebidas</b> e só em Contas a Receber. Os outros relatórios continuam com o preço do cadastro do comprador. Para uma carga só, clique no preço dela na tabela.</p>
            <div className="flex gap-2">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!podeAplicar} onClick={aplicar}>Aplicar</Button>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
