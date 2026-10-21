// @ts-nocheck
// Formulário de meta semanal (criar/editar): responsável, supervisores e linhas "comprador × cargas",
// com planejamento opcional por dia.
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

const DIAS_ABREV = ["Sáb", "Dom", "Seg", "Ter", "Qua", "Qui", "Sex"];

function diasDaSemana(inicio: string): string[] {
  const base = Date.UTC(+inicio.slice(0, 4), +inicio.slice(5, 7) - 1, +inicio.slice(8, 10));
  return Array.from({ length: 7 }, (_, i) => new Date(base + i * 86400000).toISOString().slice(0, 10));
}
const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

type Linha = { destinationId: number | ""; targetCargas: number; observacao: string; porDia: boolean; dias: Record<string, number> };

export function WeeklyGoalForm({ semanaInicio, inicial, onDone, onCancel }: {
  semanaInicio: string;
  inicial?: { id: number; title: string; description: string | null; supervisorIds: number[]; responsibleUserId: number; itens: any[] };
  onDone: () => void;
  onCancel: () => void;
}) {
  const dias = useMemo(() => diasDaSemana(semanaInicio), [semanaInicio]);
  const opcoes = trpc.weeklyGoals.opcoes.useQuery();
  const [title, setTitle] = useState(inicial?.title ?? "Meta da semana");
  const [description, setDescription] = useState(inicial?.description ?? "");
  const [responsavel, setResponsavel] = useState<number | "">(inicial?.responsibleUserId ?? "");
  const [supervisores, setSupervisores] = useState<number[]>(inicial?.supervisorIds ?? []);
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial?.itens?.length
      ? inicial.itens.map(i => ({
          destinationId: i.destinationId, targetCargas: i.targetCargas, observacao: i.observacao ?? "",
          porDia: i.dias.length > 0, dias: Object.fromEntries(i.dias.map((d: any) => [d.data, d.target])),
        }))
      : [{ destinationId: "", targetCargas: 1, observacao: "", porDia: false, dias: {} }]
  );

  const criar = trpc.weeklyGoals.create.useMutation({
    onSuccess: () => { toast.success("Meta criada e responsável avisado."); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const editar = trpc.weeklyGoals.update.useMutation({
    onSuccess: () => { toast.success("Meta alterada. O responsável precisa dar ciência de novo."); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const setLinha = (i: number, p: Partial<Linha>) => setLinhas(ls => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const usuarios = opcoes.data?.usuarios ?? [];
  const pendente = criar.isPending || editar.isPending;

  const salvar = () => {
    if (!title.trim()) return toast.error("Informe um título");
    if (!inicial && !responsavel) return toast.error("Escolha o responsável");
    if (linhas.some(l => !l.destinationId || l.targetCargas < 1)) return toast.error("Preencha o comprador e a quantidade de cada linha");
    const itens = linhas.map(l => ({
      destinationId: Number(l.destinationId), targetCargas: Number(l.targetCargas), observacao: l.observacao.trim() || null,
      dias: l.porDia ? Object.entries(l.dias).filter(([, v]) => Number(v) > 0).map(([data, target]) => ({ data, target: Number(target) })) : [],
    }));
    for (const it of itens) {
      const soma = it.dias.reduce((s, d) => s + d.target, 0);
      if (it.dias.length > 0 && soma !== it.targetCargas) return toast.error(`A soma dos dias (${soma}) precisa ser igual à meta da semana (${it.targetCargas})`);
    }
    if (inicial) editar.mutate({ id: inicial.id, title, description: description || null, supervisorUserIds: supervisores, itens });
    else criar.mutate({ semana: semanaInicio, title, description: description || null, responsibleUserId: Number(responsavel), supervisorUserIds: supervisores, itens });
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Título</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      {!inicial && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Responsável de operação</label>
          <select value={responsavel} onChange={e => setResponsavel(e.target.value ? Number(e.target.value) : "")} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Selecione...</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 block mb-1">Supervisores (você entra automaticamente)</label>
        <div className="max-h-36 overflow-y-auto rounded-md border p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {usuarios.filter(u => u.id !== responsavel).map(u => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={supervisores.includes(u.id)}
                onChange={e => setSupervisores(s => e.target.checked ? [...s, u.id] : s.filter(x => x !== u.id))} />
              {u.nome}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Cargas da semana por comprador</p>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setLinhas(ls => [...ls, { destinationId: "", targetCargas: 1, observacao: "", porDia: false, dias: {} }])}>
            <Plus className="h-3.5 w-3.5" /> Comprador
          </Button>
        </div>
        {linhas.map((l, i) => {
          const soma = Object.values(l.dias).reduce((s, v) => s + Number(v || 0), 0);
          return (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select value={l.destinationId} onChange={e => setLinha(i, { destinationId: e.target.value ? Number(e.target.value) : "" })} className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">Comprador...</option>
                  {(opcoes.data?.compradores ?? []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <Input type="number" min={1} value={l.targetCargas} onChange={e => setLinha(i, { targetCargas: Number(e.target.value) })} className="w-20" />
                <span className="text-xs text-gray-500">cargas</span>
                {linhas.length > 1 && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500" onClick={() => setLinhas(ls => ls.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
              <Input placeholder="Observação (opcional)" value={l.observacao} onChange={e => setLinha(i, { observacao: e.target.value })} className="h-9 text-sm" />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={l.porDia} onChange={e => setLinha(i, { porDia: e.target.checked })} /> Planejar por dia
              </label>
              {l.porDia && (
                <div>
                  <div className="grid grid-cols-7 gap-1">
                    {dias.map((d, k) => (
                      <div key={d} className="text-center">
                        <div className="text-[10px] text-gray-500">{DIAS_ABREV[k]} {fmt(d)}</div>
                        <Input type="number" min={0} value={l.dias[d] ?? ""} onChange={e => setLinha(i, { dias: { ...l.dias, [d]: Number(e.target.value) } })} className="h-8 px-1 text-center text-sm" />
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${soma === Number(l.targetCargas) ? "text-emerald-700" : "text-amber-700"}`}>Soma dos dias: {soma} de {l.targetCargas}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Orientações para a semana</label>
        <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Priorizar Simflor. Duas carretas extras na quinta." />
      </div>

      <div className="flex gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={pendente} onClick={salvar}>{inicial ? "Salvar alterações" : "Criar meta"}</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
