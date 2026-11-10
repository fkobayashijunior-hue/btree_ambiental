// @ts-nocheck
// Dashboard de custo e receita por planta. Cada fonte de custo pode ser ligada/desligada para conferir o total.
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { exportStyledExcel } from "@/lib/exportExcel";

const FONTES = [
  { chave: "lancamentos", label: "Lançamentos (manuais e planilha)", padrao: true },
  { chave: "pedagio", label: "Pedágios (extrato)", padrao: true },
  { chave: "combustivel_veiculos", label: "Combustível: veículos (consumo)", padrao: true },
  { chave: "combustivel_maquinas", label: "Combustível: máquinas (consumo)", padrao: true },
  { chave: "diarias", label: "Diárias, semanais e terceirizados (igual à tela de Folha)", padrao: true },
  { chave: "folha", label: "Folha CLT/PJ (igual à tela de Folha, com comissões)", padrao: true },
  { chave: "madeira", label: "Compra de madeira (controle de cargas)", padrao: true },
  { chave: "manutencao_veiculos", label: "Manutenção: veículos (registros)", padrao: false },
  { chave: "manutencao_outros", label: "Manutenção: máquinas, equipamentos e óleos", padrao: false },
  { chave: "corte", label: "Corte terceirizado", padrao: false },
  { chave: "frete", label: "Frete terceirizado", padrao: false },
  { chave: "combustivel_terceiros", label: "Combustível de terceiros", padrao: false },
] as const;
const LABEL = Object.fromEntries(FONTES.map((f) => [f.chave, f.label]));

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mesLabel = (ym: string) => `${ym.slice(5)}/${ym.slice(0, 4)}`;
const hojeYM = () => new Date().toISOString().slice(0, 7);
const ultimoDia = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).toISOString().slice(0, 10);
const somaMes = (ym: string, n: number) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);

export default function DashboardPlantaTab() {
  const [de, setDe] = useState(hojeYM());
  const [ate, setAte] = useState(hojeYM());
  const [ativas, setAtivas] = useState<Set<string>>(new Set(FONTES.filter((f) => f.padrao).map((f) => f.chave)));
  const [maisFontes, setMaisFontes] = useState(false);

  const ini = `${de}-01`;
  const fim = ultimoDia(ate);
  const q = trpc.custos.dashboardPlanta.useQuery({ inicio: ini, fim }, { enabled: de <= ate, retry: false });

  const alternar = (c: string) => setAtivas((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const nomePlanta = (id: number | null) => (id === null ? "Sem planta" : q.data?.nomes?.[id] ?? `Local #${id}`);

  const calc = useMemo(() => {
    const d = q.data;
    if (!d) return null;
    const linhas = d.linhas.filter((l) => ativas.has(l.fonte));
    const ids = new Set<number | null>();
    linhas.forEach((l) => ids.add(l.plantaId));
    d.receita.forEach((r) => ids.add(r.plantaId));
    const porPlanta = new Map<number | null, { custo: number; receita: number; cargas: number }>();
    const get = (p: number | null) => porPlanta.get(p) ?? porPlanta.set(p, { custo: 0, receita: 0, cargas: 0 }).get(p)!;
    linhas.forEach((l) => { get(l.plantaId).custo += l.valor; });
    d.receita.forEach((r) => { const x = get(r.plantaId); x.receita += r.valor; x.cargas += r.cargas; });

    const matriz = new Map<string, Map<number | null, number>>();
    linhas.forEach((l) => {
      const m = matriz.get(l.fonte) ?? matriz.set(l.fonte, new Map()).get(l.fonte)!;
      m.set(l.plantaId, (m.get(l.plantaId) ?? 0) + l.valor);
    });

    let fixo = 0, variavel = 0;
    const cats = new Map<string, number>();
    linhas.filter((l) => l.fonte === "lancamentos" || l.fonte === "pedagio").forEach((l) => {
      if (l.tipo === "fixo") fixo += l.valor; else variavel += l.valor;
      cats.set(l.categoria ?? "—", (cats.get(l.categoria ?? "—") ?? 0) + l.valor);
    });

    const meses = new Map<string, { mes: string; custo: number; receita: number }>();
    const mes = (m: string) => meses.get(m) ?? meses.set(m, { mes: m, custo: 0, receita: 0 }).get(m)!;
    linhas.forEach((l) => { mes(l.mes).custo += l.valor; });
    d.receita.forEach((r) => { mes(r.mes).receita += r.valor; });

    const semPlanta = (fonte: string) => d.linhas.filter((l) => l.fonte === fonte && l.plantaId === null).reduce((s, l) => s + l.valor, 0);

    const plantas = Array.from(ids).sort((a, b) => (a === null ? 1 : b === null ? -1 : (porPlanta.get(b)?.custo ?? 0) - (porPlanta.get(a)?.custo ?? 0)));
    const total = Array.from(porPlanta.values()).reduce((s, x) => ({ custo: s.custo + x.custo, receita: s.receita + x.receita, cargas: s.cargas + x.cargas }), { custo: 0, receita: 0, cargas: 0 });
    return {
      plantas, porPlanta, matriz, fixo, variavel, total,
      cats: Array.from(cats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      meses: Array.from(meses.values()).sort((a, b) => a.mes.localeCompare(b.mes)).map((m) => ({ ...m, nome: mesLabel(m.mes) })),
      avisos: {
        combSemLocal: semPlanta("combustivel_veiculos") + semPlanta("combustivel_maquinas"),
        pedagioSemPlanta: semPlanta("pedagio"),
        lancSemPlanta: semPlanta("lancamentos"),
      },
    };
  }, [q.data, ativas]);

  const exportar = async () => {
    if (!calc) return;
    const cols = calc.plantas;
    const fontes = FONTES.filter((f) => calc.matriz.has(f.chave));
    await exportStyledExcel({
      title: "BTREE AMBIENTAL — CUSTO E RECEITA POR PLANTA",
      subtitle: `Período: ${mesLabel(de)} a ${mesLabel(ate)}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
      sheetName: "Por planta",
      columns: [{ header: "Fonte", width: 44 }, ...cols.map((p) => ({ header: nomePlanta(p), width: 18, align: "right", numFmt: "#,##0.00" })), { header: "Total", width: 18, align: "right", numFmt: "#,##0.00" }],
      rows: [
        ...fontes.map((f) => {
          const m = calc.matriz.get(f.chave)!;
          return [f.label, ...cols.map((p) => m.get(p) ?? 0), Array.from(m.values()).reduce((s, v) => s + v, 0)];
        }),
        ["CUSTO TOTAL", ...cols.map((p) => calc.porPlanta.get(p)?.custo ?? 0), calc.total.custo],
        ["RECEITA (cargas entregues)", ...cols.map((p) => calc.porPlanta.get(p)?.receita ?? 0), calc.total.receita],
        ["RESULTADO", ...cols.map((p) => (calc.porPlanta.get(p)?.receita ?? 0) - (calc.porPlanta.get(p)?.custo ?? 0)), calc.total.receita - calc.total.custo],
      ],
      filename: `custo-por-planta-${de}_${ate}.xlsx`,
    });
    toast.success("Planilha gerada");
  };

  const atalho = (a: string, b: string) => { setDe(a); setAte(b); };
  const extras = FONTES.filter((f) => !f.padrao);

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="block text-xs text-gray-500">De</label><input type="month" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm" /></div>
        <div><label className="block text-xs text-gray-500">Até</label><input type="month" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm" /></div>
        <Button size="sm" variant="outline" onClick={() => atalho(hojeYM(), hojeYM())}>Este mês</Button>
        <Button size="sm" variant="outline" onClick={() => atalho(somaMes(hojeYM(), -1), somaMes(hojeYM(), -1))}>Mês passado</Button>
        <Button size="sm" variant="outline" onClick={() => atalho(somaMes(hojeYM(), -2), hojeYM())}>3 meses</Button>
        <Button size="sm" variant="outline" onClick={() => atalho(`${hojeYM().slice(0, 4)}-01`, hojeYM())}>Ano</Button>
        <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={exportar} disabled={!calc}><FileDown className="h-4 w-4" /> Excel</Button>
      </div>
      {de > ate && <p className="text-sm text-red-600">O mês inicial é depois do final.</p>}

      {/* Fontes */}
      <div className="rounded-xl border bg-white p-3">
        <p className="mb-2 text-sm font-semibold">O que soma no custo</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {FONTES.filter((f) => f.padrao).map((f) => (
            <label key={f.chave} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativas.has(f.chave)} onChange={() => alternar(f.chave)} /> {f.label}</label>
          ))}
        </div>
        <button type="button" className="mt-2 text-xs font-medium text-emerald-700 underline" onClick={() => setMaisFontes((v) => !v)}>
          {maisFontes ? "Ocultar outras fontes" : "Outras fontes de custo (desligadas)"}
        </button>
        {maisFontes && (
          <div className="mt-2 grid gap-1 border-t pt-2 sm:grid-cols-2">
            {extras.map((f) => (
              <label key={f.chave} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativas.has(f.chave)} onChange={() => alternar(f.chave)} /> {f.label}</label>
            ))}
            <p className="col-span-full text-xs text-gray-500">Estas fontes são custos reais, mas ficam desligadas para não contar duas vezes o que já foi lançado à mão (ex.: manutenção, serviço terceirizado). Frete e manutenção de máquinas não têm planta: entram em “Sem planta”.</p>
          </div>
        )}
      </div>

      {q.isLoading && <p className="py-8 text-center text-gray-500">Carregando...</p>}
      {q.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{q.error.message}</p>}

      {calc && q.data && (
        <>
          {/* Alertas */}
          {(q.data.alertas.length > 0 || q.data.erros.length > 0 || calc.avisos.combSemLocal > 0 || calc.avisos.pedagioSemPlanta > 0 || calc.avisos.lancSemPlanta > 0) && (
            <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-1 font-semibold"><AlertTriangle className="h-4 w-4" /> Atenção</p>
              {calc.avisos.combSemLocal > 0 && <p>• {moeda(calc.avisos.combSemLocal)} de combustível sem Local de Trabalho (aparece em “Sem planta”).</p>}
              {calc.avisos.pedagioSemPlanta > 0 && <p>• {moeda(calc.avisos.pedagioSemPlanta)} de pedágios sem planta. Atribua em Custos → “sem planta”.</p>}
              {calc.avisos.lancSemPlanta > 0 && <p>• {moeda(calc.avisos.lancSemPlanta)} em lançamentos sem planta.</p>}
              {q.data.alertas.map((a, i) => <p key={i}>• {a.texto}</p>)}
              {q.data.erros.map((e, i) => <p key={`e${i}`} className="text-red-700">• Não foi possível calcular: {e}</p>)}
            </div>
          )}

          {/* Totais */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Receita (cargas entregues)</p><p className="text-lg font-bold text-emerald-700">{moeda(calc.total.receita)}</p></div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Custo (fontes marcadas)</p><p className="text-lg font-bold text-orange-600">{moeda(calc.total.custo)}</p></div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Resultado</p><p className={`text-lg font-bold ${calc.total.receita - calc.total.custo >= 0 ? "text-emerald-700" : "text-red-600"}`}>{moeda(calc.total.receita - calc.total.custo)}</p></div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Fixo × variável (lançamentos)</p><p className="text-sm font-semibold"><span className="text-blue-700">{moeda(calc.fixo)}</span> · <span className="text-orange-600">{moeda(calc.variavel)}</span></p></div>
          </div>

          {/* Por planta */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {calc.plantas.map((p) => {
              const x = calc.porPlanta.get(p) ?? { custo: 0, receita: 0, cargas: 0 };
              const res = x.receita - x.custo;
              return (
                <div key={String(p)} className={`rounded-xl border bg-white p-3 ${p === null ? "border-dashed" : ""}`}>
                  <p className="font-semibold">{nomePlanta(p)}</p>
                  <dl className="mt-1 space-y-0.5 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Receita{x.cargas ? ` (${x.cargas} cargas)` : ""}</dt><dd>{moeda(x.receita)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Custo</dt><dd>{moeda(x.custo)}</dd></div>
                    <div className="flex justify-between border-t pt-0.5 font-semibold"><dt>Resultado</dt><dd className={res >= 0 ? "text-emerald-700" : "text-red-600"}>{moeda(res)}</dd></div>
                    {x.receita > 0 && <div className="flex justify-between text-xs text-gray-500"><dt>Margem</dt><dd>{((res / x.receita) * 100).toFixed(1)}%</dd></div>}
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Fonte × planta */}
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="px-3 py-2">Fonte</th>{calc.plantas.map((p) => <th key={String(p)} className="px-3 py-2 text-right">{nomePlanta(p)}</th>)}<th className="px-3 py-2 text-right">Total</th></tr>
              </thead>
              <tbody>
                {FONTES.filter((f) => calc.matriz.has(f.chave)).map((f) => {
                  const m = calc.matriz.get(f.chave)!;
                  return (
                    <tr key={f.chave} className="border-t">
                      <td className="px-3 py-1.5">{f.label}</td>
                      {calc.plantas.map((p) => <td key={String(p)} className="px-3 py-1.5 text-right">{m.get(p) ? moeda(m.get(p)!) : "-"}</td>)}
                      <td className="px-3 py-1.5 text-right font-medium">{moeda(Array.from(m.values()).reduce((s, v) => s + v, 0))}</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-3 py-2">Custo total</td>
                  {calc.plantas.map((p) => <td key={String(p)} className="px-3 py-2 text-right">{moeda(calc.porPlanta.get(p)?.custo ?? 0)}</td>)}
                  <td className="px-3 py-2 text-right">{moeda(calc.total.custo)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {calc.meses.length > 0 && (
              <div className="rounded-xl border bg-white p-3">
                <p className="mb-2 text-sm font-semibold">Evolução mensal</p>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={calc.meses}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => moeda(v)} />
                      <Legend />
                      <Bar dataKey="receita" name="Receita" fill="#059669" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="custo" name="Custo" fill="#ea580c" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {calc.cats.length > 0 && (
              <div className="rounded-xl border bg-white p-3">
                <p className="mb-2 text-sm font-semibold">Maiores tipos de gasto (lançamentos e pedágios)</p>
                <ul className="space-y-1 text-sm">
                  {calc.cats.map(([c, v]) => (
                    <li key={c} className="flex justify-between border-b pb-1 last:border-0"><span>{c}</span><span className="font-medium">{moeda(v)}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Receita = cargas entregues × preço do comprador (igual ao “Resultado por cliente”), agrupada pelo Local de Trabalho da carga. Custo = fontes marcadas acima, na data do gasto.</p>
        </>
      )}
    </div>
  );
}
