// @ts-nocheck
// Célula "Preço/Unid." da aba Cargas Entregues a Receber: clique para editar o preço daquela carga.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RotateCcw } from "lucide-react";

const moeda = (v: number) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PrecoCargaCell({ c, onChanged }: { c: any; onChanged?: () => void }) {
  const utils = trpc.useUtils();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState("");
  const mut = trpc.buyerClients.setCargaPreco.useMutation({
    onSuccess: () => { utils.contasReceber.invalidate(); onChanged?.(); toast.success("Preço atualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const atual = String(Number(c.precoUnit ?? 0)).replace(".", ",");

  const concluir = (salvar: boolean) => {
    setEdit(false);
    const novo = v.trim();
    if (salvar && novo !== atual) mut.mutate({ id: c.id, preco: novo === "" ? null : novo });
  };

  if (edit) {
    return (
      <TableCell className="text-right">
        <Input autoFocus inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ""))}
          className="ml-auto h-8 w-24 px-2 text-right text-sm" placeholder="vazio = padrão"
          onBlur={() => concluir(true)}
          onKeyDown={(e) => { if (e.key === "Enter") concluir(true); if (e.key === "Escape") setEdit(false); }} />
      </TableCell>
    );
  }
  return (
    <TableCell className="cursor-pointer text-right text-sm hover:bg-amber-50" title="Clique para editar o preço desta carga"
      onClick={() => { setV(atual); setEdit(true); }}>
      <span className={c.precoEditado ? "font-semibold text-amber-700" : "text-muted-foreground"}>{moeda(c.precoUnit)}</span>
      {c.precoEditado && (
        <button type="button" className="ml-1 inline-flex align-middle text-amber-600 hover:text-amber-800" disabled={mut.isPending}
          title={`Preço editado. Voltar ao preço do comprador (${moeda(c.precoPadrao)})`}
          onClick={(e) => { e.stopPropagation(); mut.mutate({ id: c.id, preco: null }); }}>
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </TableCell>
  );
}
