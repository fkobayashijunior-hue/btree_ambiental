// @ts-nocheck
// "Meus Gastos": o colaborador lança os próprios gastos (foto da nota, planta, tipo). Eles caem em Contas a Pagar para conferência.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Paperclip, Plus } from "lucide-react";
import CustoFormSheet, { FORMAS } from "@/components/custos/CustoFormSheet";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "-");
const formaLabel = (v?: string | null) => FORMAS.find((f) => f.v === v)?.l ?? "";

export default function MeusGastosPage() {
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [form, setForm] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const utils = trpc.useUtils();
  const q = trpc.custos.meusListar.useQuery({ mes, ano });
  const cancelar = trpc.custos.meusCancelar.useMutation({
    onSuccess: () => { utils.custos.meusListar.invalidate(); toast.success("Gasto cancelado"); },
    onError: (e) => toast.error(e.message),
  });

  const itens = q.data?.itens ?? [];
  const resumo = q.data?.resumo;
  const navMes = (d: number) => {
    let m = mes + d, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  return (
    <div className="space-y-4 p-4 pb-28 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Meus gastos</h1>
        <p className="text-sm text-gray-500">Lance aqui o que você gastou a serviço da empresa. O escritório confere e dá baixa.</p>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => navMes(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-36 text-center text-base font-semibold">{MESES[mes - 1]} {ano}</span>
        <Button variant="outline" size="icon" onClick={() => navMes(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Total lançado</p><p className="text-lg font-bold">{moeda(resumo.total)}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Aguardando conferência</p><p className="text-lg font-bold text-amber-700">{resumo.aguardando}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Conferidos</p><p className="text-lg font-bold text-emerald-700">{resumo.conferidos}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Para corrigir</p><p className={`text-lg font-bold ${resumo.devolvidos ? "text-red-600" : ""}`}>{resumo.devolvidos}</p></div>
        </div>
      )}

      {q.isLoading ? (
        <p className="py-8 text-center text-gray-500">Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed py-12 text-center">
          <p className="font-medium text-gray-700">Você ainda não lançou gastos neste mês</p>
          <p className="text-sm text-gray-500">Toque em “Novo gasto” para lançar o primeiro.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((i) => {
            const cancelado = i.status === "cancelado";
            return (
              <li key={i.id} className={`rounded-xl border bg-white p-3 ${cancelado ? "opacity-50" : ""} ${i.conferencia === "devolvido" && !cancelado ? "border-red-300" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => i.editavel && setForm({ open: true, item: i })}>
                    <p className={`truncate font-medium ${cancelado ? "line-through" : ""}`}>{i.descricao}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{dataBR(i.dataCompetencia)} · {i.plantaNome ?? "Sem local"} · {i.categoriaNome}{i.formaPagamento ? ` · ${formaLabel(i.formaPagamento)}` : ""}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {cancelado && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Cancelado</span>}
                      {!cancelado && i.conferencia === "pendente" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Aguardando conferência</span>}
                      {!cancelado && i.conferencia === "conferido" && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Conferido</span>}
                      {!cancelado && i.conferencia === "devolvido" && <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">Corrigir</span>}
                      {i.nfUrl ? (
                        <a href={i.nfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><Paperclip className="h-3 w-3" /> Nota</a>
                      ) : !cancelado && !i.nfNumero ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">Sem nota</span> : null}
                    </div>
                    {!cancelado && i.conferencia === "devolvido" && i.conferenciaObs && (
                      <p className="mt-1 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Para corrigir: {i.conferenciaObs}. Toque para alterar e salvar de novo.</p>
                    )}
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    <p className="whitespace-nowrap text-base font-bold">{moeda(i.valor)}</p>
                    {i.editavel && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-gray-400 hover:text-red-600"
                        onClick={() => confirm("Cancelar este gasto?") && cancelar.mutate({ id: i.id })}><Ban className="h-3 w-3" /> Cancelar</Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button onClick={() => setForm({ open: true, item: null })}
        className="fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-full bg-emerald-600 px-6 text-base text-white shadow-lg hover:bg-emerald-700">
        <Plus className="h-5 w-5" /> Novo gasto
      </Button>

      <CustoFormSheet modo="colaborador" open={form.open} item={form.item}
        onClose={() => setForm({ open: false, item: null })}
        onSaved={() => utils.custos.meusListar.invalidate()} />
    </div>
  );
}
