// @ts-nocheck
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WeeklyGoalForm } from "@/components/WeeklyGoalForm";
import { ChevronLeft, ChevronRight, Plus, Target, CheckCircle2, AlertTriangle } from "lucide-react";

export const ALERTA_LABEL: Record<string, string> = {
  em_negociacao: "Em negociação: falta acordo",
  ciencia_pendente: "Ciência pendente",
  sem_relato_hoje: "Sem relato hoje",
  problema_hoje: "Problema informado",
  pergunta_sem_resposta: "Pergunta sem resposta",
  atrasada_no_ritmo: "Abaixo do ritmo",
};
export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  aguardando_ciencia: { label: "Aguardando ciência", cls: "bg-amber-100 text-amber-800" },
  em_negociacao: { label: "Em negociação", cls: "bg-orange-100 text-orange-800" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-100 text-blue-800" },
  encerrada: { label: "Encerrada", cls: "bg-gray-100 text-gray-700" },
  cancelada: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

const fmtBR = (d: string) => d.split("-").reverse().join("/");
function somaDias(d: string, n: number) {
  const ms = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function BarraProgresso({ pct, cor = "bg-emerald-500" }: { pct: number; cor?: string }) {
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full ${cor}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function WeeklyGoals() {
  const [, navigate] = useLocation();
  const { hasAccess, isAdmin } = usePermissions();
  const podeCriar = isAdmin || hasAccess("metas-semanais-gestao");
  const [semana, setSemana] = useState<string | undefined>(undefined);
  const [novo, setNovo] = useState(false);
  const lista = trpc.weeklyGoals.list.useQuery(semana ? { semana } : undefined);
  const utils = trpc.useUtils();
  const d = lista.data;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2"><Target className="h-7 w-7" /> Metas semanais</h1>
          <p className="text-sm text-gray-500 mt-1">Meta de cargas por comprador, relatos do dia e conversa com os supervisores.</p>
        </div>
        {podeCriar && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => d && setSemana(somaDias(d.semana.start, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-sm font-medium min-w-48 text-center">
          {d ? `${fmtBR(d.semana.start)} a ${fmtBR(d.semana.end)}` : "..."}
        </div>
        <Button size="sm" variant="outline" onClick={() => d && setSemana(somaDias(d.semana.start, 7))}><ChevronRight className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => setSemana(undefined)}>Esta semana</Button>
      </div>

      {lista.isLoading && <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />}
      {lista.isError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{lista.error.message}</div>}

      {d && d.metas.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center text-gray-500">
          <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma meta nesta semana.</p>
          {podeCriar && <p className="text-sm mt-1">Use "Nova meta" para definir as cargas por comprador.</p>}
        </div>
      )}

      <div className="space-y-3">
        {d?.metas.map(m => (
          <button key={m.id} onClick={() => navigate(`/metas-semanais/${m.id}`)} className="w-full text-left rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{m.responsibleName ?? "—"}</p>
                <p className="text-xs text-gray-500">{m.title} · {m.metaResumo}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={STATUS_LABEL[m.status]?.cls}>{STATUS_LABEL[m.status]?.label ?? m.status}</Badge>
                {m.ack === "com_ressalva" && <Badge className="bg-amber-100 text-amber-800">Com ressalvas</Badge>}
                {m.hoje.fechou && <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Fechou hoje</Badge>}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {m.progresso.itens.map((it, i) => (
                <div key={it.itemId} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate">{m.metaResumo.split(", ")[i]?.replace(/^\d+x /, "")}</span>
                  <div className="flex-1"><BarraProgresso pct={it.pct} /></div>
                  <span className="w-28 text-right text-xs text-gray-600">{it.carregadas} de {it.meta}{it.entregues > 0 ? ` · ${it.entregues} entregue(s)` : ""}</span>
                </div>
              ))}
            </div>
            {m.alertas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.alertas.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" /> {ALERTA_LABEL[a]}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <Sheet open={novo} onOpenChange={setNovo}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle className="text-emerald-800">Nova meta semanal</SheetTitle></SheetHeader>
          <p className="text-xs text-gray-500 mt-1">Semana {d ? `${fmtBR(d.semana.start)} a ${fmtBR(d.semana.end)}` : ""}</p>
          <div className="pt-4">
            {d && novo && (
              <WeeklyGoalForm semanaInicio={d.semana.start}
                onDone={() => { setNovo(false); utils.weeklyGoals.invalidate(); }}
                onCancel={() => setNovo(false)} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
