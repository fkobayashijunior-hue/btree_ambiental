// @ts-nocheck
// Importação de custos por planilha: baixar modelo → escolher arquivo → ver prévia (válidas / erros / duplicadas) → confirmar.
import { useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilePicker } from "@/hooks/useFilePicker";
import { baixarModeloCustos, lerLinhasPlanilha } from "@/lib/modeloCustos";
import { FORMAS } from "./CustoFormSheet";
import { Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Copy } from "lucide-react";

export default function ImportarCustosDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const { openFilePicker } = useFilePicker();
  const plantas = trpc.custos.plantas.useQuery(undefined, { enabled: open });
  const categorias = trpc.custos.categorias.useQuery(undefined, { enabled: open });
  const cartoes = trpc.custos.cartoes.useQuery(undefined, { enabled: open });
  const colabs = trpc.custos.colaboradores.useQuery(undefined, { enabled: open });
  const importar = trpc.custos.importar.useMutation();
  const [arquivo, setArquivo] = useState("");
  const [linhas, setLinhas] = useState<any[]>([]);
  const [prev, setPrev] = useState<any>(null);
  const [feito, setFeito] = useState<any>(null);

  const reset = () => { setArquivo(""); setLinhas([]); setPrev(null); setFeito(null); };
  const fechar = () => { reset(); onClose(); };

  const modelo = () =>
    baixarModeloCustos({
      plantas: (plantas.data ?? []).map((p) => p.nome),
      categorias: (categorias.data ?? []).filter((c) => !c.automatica).map((c) => c.nome),
      cartoes: (cartoes.data ?? []).map((c) => c.nome),
      formas: FORMAS.map((f) => f.l),
      colaboradores: (colabs.data ?? []).map((c) => c.nome),
    });

  const escolher = () =>
    openFilePicker({ accept: ".xlsx,.xls,.csv" }, async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const nome = wb.SheetNames.find((n) => n.toLowerCase().startsWith("lan")) ?? wb.SheetNames[0];
        const matriz = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: "" });
        const { linhas: l, erro } = lerLinhasPlanilha(matriz as any[][]);
        if (erro) return toast.error(erro);
        if (l.length === 0) return toast.error("A planilha não tem lançamentos preenchidos.");
        if (l.length > 2000) return toast.error("Máximo de 2000 linhas por importação.");
        setArquivo(file.name); setLinhas(l); setFeito(null);
        setPrev(await importar.mutateAsync({ arquivo: file.name, linhas: l, confirmar: false }));
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível ler a planilha");
      }
    });

  const confirmar = async () => {
    try {
      const r = await importar.mutateAsync({ arquivo, linhas, confirmar: true });
      setFeito(r); setPrev(null);
      onImported();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível importar");
    }
  };

  const problemas = (prev?.linhas ?? []).filter((l: any) => l.situacao !== "ok");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Importar gastos por planilha</DialogTitle></DialogHeader>

        {feito ? (
          <div className="space-y-3 py-2">
            <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Importação concluída</p>
            <ul className="text-sm text-gray-700">
              <li><b>{feito.resumo.lancamentosNovos}</b> lançamento(s) criado(s)</li>
              {feito.resumo.duplicadas > 0 && <li>{feito.resumo.duplicadas} linha(s) já existiam e foram ignoradas</li>}
              {feito.resumo.erros > 0 && <li>{feito.resumo.erros} linha(s) com erro não foram importadas</li>}
            </ul>
            <p className="text-xs text-gray-500">Os gastos importados ficam aguardando conferência. Gastos futuros aparecem no mês correspondente como “a pagar”.</p>
            <Button onClick={fechar}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <p className="mb-2">1. Baixe o modelo, preencha e salve. As listas (local, categoria, centro de custo, cartão, colaborador) já vêm no modelo.</p>
              <Button variant="outline" size="sm" className="gap-1" onClick={modelo} disabled={plantas.isLoading || categorias.isLoading}><Download className="h-4 w-4" /> Baixar modelo</Button>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <p className="mb-2">2. Escolha a planilha preenchida. Nada é gravado antes de você confirmar.</p>
              <Button size="sm" className="gap-1" onClick={escolher} disabled={importar.isPending}>
                {importar.isPending && !prev ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Escolher planilha
              </Button>
              {arquivo && <span className="ml-2 text-xs text-gray-500">{arquivo}</span>}
            </div>

            {prev && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2"><p className="text-2xl font-bold text-emerald-700">{prev.resumo.validas}</p><p className="text-xs">linhas válidas<br />({prev.resumo.lancamentosNovos} lançamentos)</p></div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2"><p className="flex items-center justify-center gap-1 text-2xl font-bold text-red-700"><AlertTriangle className="h-4 w-4" />{prev.resumo.erros}</p><p className="text-xs">com erro</p></div>
                  <div className="rounded-xl border bg-gray-50 p-2"><p className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-600"><Copy className="h-4 w-4" />{prev.resumo.duplicadas}</p><p className="text-xs">já importadas</p></div>
                </div>
                {problemas.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-2 py-1">Linha</th><th className="px-2 py-1">Situação</th><th className="px-2 py-1">O que houve</th></tr></thead>
                      <tbody>
                        {problemas.map((l: any) => (
                          <tr key={l.linha} className="border-t">
                            <td className="px-2 py-1">{l.linha}</td>
                            <td className="px-2 py-1">{l.situacao === "erro" ? <span className="text-red-700">Erro</span> : <span className="text-gray-500">Já importada</span>}</td>
                            <td className="px-2 py-1">{l.mensagem}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {prev.resumo.erros > 0 && <p className="text-xs text-amber-700">As linhas com erro não serão importadas. Corrija na planilha e importe de novo: as que já entraram não duplicam.</p>}
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={importar.isPending || prev.resumo.lancamentosNovos === 0} onClick={confirmar}>
                    {importar.isPending ? "Importando..." : `Importar ${prev.resumo.lancamentosNovos} lançamento(s)`}
                  </Button>
                  <Button variant="outline" onClick={reset}>Escolher outro arquivo</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
