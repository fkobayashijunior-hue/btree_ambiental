import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Truck, HardHat } from "lucide-react";

function fmtBRL(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? "0")) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Janela de comissão de Motorista (por carga entregue, conforme o destino) ou Operador
// (toneladas do cliente ÷ nº de operadores), com base nas entregas do PRÓPRIO mês da
// Folha sendo visualizado. As tarifas usadas ficam editáveis aqui mesmo.
export default function CommissionModal({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  referenceMonth,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: number | null;
  collaboratorName: string;
  referenceMonth: string;
  onApplied: (commission: string) => void;
}) {
  const { data, isLoading } = trpc.payroll.getCommissionBreakdown.useQuery(
    { collaboratorId: collaboratorId as number, referenceMonth },
    { enabled: open && collaboratorId !== null }
  );
  const updateRates = trpc.payroll.updateCommissionRates.useMutation({
    onError: (e) => toast.error(e.message || "Erro ao salvar tarifas"),
  });

  // Tarifas editáveis localmente (inicializadas com o que veio do servidor)
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  // Nº de operadores: vem calculado automaticamente (exclui quem tem comissão fixa),
  // mas fica editável aqui para casos excepcionais.
  const [numOperadoresDraft, setNumOperadoresDraft] = useState<string>("");

  useEffect(() => {
    if (data?.rates) {
      const drafts: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.rates)) drafts[k] = String(v);
      setRateDrafts(drafts);
    }
    if (data?.tipo === "operador") {
      setNumOperadoresDraft(String(data.numOperadoresAuto ?? data.numOperadores));
    }
  }, [data]);

  if (!open) return null;

  const rate = (key: string): number => parseFloat(rateDrafts[key] ?? "0") || 0;

  const motoristaTotal = data?.tipo === "motorista"
    ? data.items.reduce((s, i) => s + i.quantidade * rate(`motorista_${i.categoria}`), 0)
    : 0;

  const operadorRate = rate("operador_por_tonelada");
  const numOperadores = parseInt(numOperadoresDraft, 10) || 0;
  const operadorTotal = data?.tipo === "operador" && numOperadores > 0
    ? (data.totalTonelada / numOperadores) * operadorRate
    : 0;

  const total = data?.tipo === "motorista" ? motoristaTotal : data?.tipo === "operador" ? operadorTotal : 0;

  const handleApply = async () => {
    // Persiste as tarifas que foram alteradas (todas, por simplicidade — é idempotente).
    // Tarifas de motorista/terceirizado são salvas por colaborador (não afetam outros
    // motoristas); a de operador continua global (compartilhada por todos os operadores).
    if (Object.keys(rateDrafts).length > 0) {
      await updateRates.mutateAsync({
        rates: rateDrafts,
        collaboratorId: data?.tipo === "motorista" ? (collaboratorId ?? undefined) : undefined,
      });
    }
    onApplied(total.toFixed(2));
    toast.success(`Comissão de R$ ${fmtBRL(total)} aplicada para ${collaboratorName}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data?.tipo === "motorista" ? <Truck className="h-5 w-5 text-emerald-600" /> : <HardHat className="h-5 w-5 text-emerald-600" />}
            Comissão — {collaboratorName}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : data.tipo === "motorista" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Baseado nas cargas entregues em <strong>{data.periodoBase}</strong>. As tarifas
              abaixo são próprias deste motorista — alterá-las não afeta outros motoristas.
            </p>
            {data.items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma carga entregue em destinos com comissão nesse período.</p>
            ) : (
              <div className="space-y-2">
                {data.items.map((item) => (
                  <div key={item.categoria} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        {data.unidade === "tonelada"
                          ? `${item.quantidade.toFixed(2)} ton (${item.cargas} carga${item.cargas !== 1 ? "s" : ""})`
                          : `${item.quantidade} carga${item.quantidade !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-500">R$</Label>
                      <Input
                        type="number" step="0.01"
                        className="h-8 w-24 text-right"
                        value={rateDrafts[`motorista_${item.categoria}`] ?? ""}
                        onChange={e => setRateDrafts(prev => ({ ...prev, [`motorista_${item.categoria}`]: e.target.value }))}
                      />
                      <span className="text-xs text-gray-500">{data.unidade === "tonelada" ? "/ton" : "/carga"}</span>
                      <span className="w-24 text-right text-sm font-semibold text-gray-800">
                        R$ {fmtBRL(item.quantidade * rate(`motorista_${item.categoria}`))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm font-semibold text-gray-700">Total da Comissão</span>
              <span className="text-lg font-bold text-emerald-700">R$ {fmtBRL(motoristaTotal)}</span>
            </div>
          </div>
        ) : data.tipo === "operador" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Baseado nas toneladas entregues em <strong>{data.periodoBase}</strong> para o cliente vinculado a este colaborador.
            </p>
            {!data.clienteNome ? (
              <p className="text-sm text-amber-600 text-center py-4">
                Este colaborador não tem "Local de Trabalho" (cliente) definido no cadastro — não é possível calcular a comissão.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-medium text-gray-800" translate="no">{data.clienteNome}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500">Toneladas líquidas do mês</p>
                    <p className="font-medium text-gray-800">{data.totalTonelada.toFixed(2)} ton</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Nº de operadores desse cliente</p>
                      <p className="text-[11px] text-gray-400">Automático (exclui comissão fixa)</p>
                    </div>
                    <Input
                      type="number" step="1" min="1"
                      className="h-8 w-16 text-right"
                      value={numOperadoresDraft}
                      onChange={e => setNumOperadoresDraft(e.target.value)}
                    />
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Tarifa</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">R$</span>
                      <Input
                        type="number" step="0.01"
                        className="h-8 w-20 text-right"
                        value={rateDrafts.operador_por_tonelada ?? ""}
                        onChange={e => setRateDrafts(prev => ({ ...prev, operador_por_tonelada: e.target.value }))}
                      />
                      <span className="text-xs text-gray-500">/ton</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {data.totalTonelada.toFixed(2)} ton ÷ {numOperadores} operador{numOperadores !== 1 ? "es" : ""} × R$ {fmtBRL(operadorRate)}/ton
                </p>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-semibold text-gray-700">Total da Comissão</span>
                  <span className="text-lg font-bold text-emerald-700">R$ {fmtBRL(operadorTotal)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Esse tipo de colaborador não tem regra automática de comissão.</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApply}
            disabled={isLoading || !data || (data.tipo === "operador" && !data.clienteNome) || updateRates.isPending}
          >
            {updateRates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar Comissão"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
