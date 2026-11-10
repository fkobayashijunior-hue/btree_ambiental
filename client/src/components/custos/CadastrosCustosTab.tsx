// @ts-nocheck
// Aba "Cadastros" (só administrador): tipos de gasto (categorias) e cartões/contas.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";

const select = "h-10 rounded-md border border-input bg-background px-2 text-sm";

function Categorias() {
  const utils = trpc.useUtils();
  const lista = trpc.custos.categorias.useQuery({ incluirInativas: true });
  const excluir = trpc.custos.excluirCategoria.useMutation({
    onSuccess: () => { utils.custos.categorias.invalidate(); toast.success("Tipo de gasto excluído"); },
    onError: (e) => toast.error(e.message),
  });
  const salvar = trpc.custos.salvarCategoria.useMutation({
    onSuccess: () => { utils.custos.categorias.invalidate(); setEd(null); toast.success("Salvo"); },
    onError: (e) => toast.error(e.message),
  });
  const [ed, setEd] = useState<any>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categorias</h2>
          <p className="text-sm text-gray-500">O que aparece nos botões do lançamento. O “Costuma ser” (fixo ou variável) vem daqui e aparece em todo gasto da categoria.</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setEd({ nome: "", tipoPadrao: "variavel", ativa: true })}><Plus className="h-4 w-4" /> Novo</Button>
      </div>
      {ed && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-gray-50 p-3">
          <div><label className="block text-xs text-gray-500">Nome</label><Input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} className="h-10 w-56" maxLength={80} /></div>
          <div><label className="block text-xs text-gray-500">Costuma ser</label>
            <select className={select} value={ed.tipoPadrao} onChange={(e) => setEd({ ...ed, tipoPadrao: e.target.value })}>
              <option value="variavel">Variável</option><option value="fixo">Fixo</option>
            </select></div>
          <label className="flex items-center gap-1 pb-2 text-sm"><input type="checkbox" checked={ed.ativa} onChange={(e) => setEd({ ...ed, ativa: e.target.checked })} /> Ativo</label>
          <Button size="sm" disabled={salvar.isPending} onClick={() => salvar.mutate({ id: ed.id, nome: ed.nome, tipoPadrao: ed.tipoPadrao, ativa: ed.ativa })}>Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button>
        </div>
      )}
      <ul className="divide-y rounded-xl border bg-white">
        {(lista.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2">
            <div className={c.ativa ? "" : "text-gray-400"}>
              <span className="font-medium">{c.nome}</span>
              <span className="ml-2 text-xs text-gray-500">{c.tipoPadrao === "fixo" ? "Fixo" : "Variável"}{c.automatica ? " · vem do Abastecimento" : ""}{c.ativa ? "" : " · inativo"}</span>
            </div>
            {!c.automatica && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Alterar" onClick={() => setEd({ ...c })}><Pencil className="h-4 w-4" /></Button>
                {c.nome !== "Pedágio / TAG" && (
                  <Button size="sm" variant="ghost" title="Excluir" className="text-gray-400 hover:text-red-600" disabled={excluir.isPending}
                    onClick={() => confirm(`Excluir o tipo de gasto "${c.nome}"? Só é possível se nenhum gasto o usar.`) && excluir.mutate({ id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Cartoes() {
  const utils = trpc.useUtils();
  const lista = trpc.custos.cartoes.useQuery({ incluirInativos: true });
  const excluir = trpc.custos.excluirCartao.useMutation({
    onSuccess: () => { utils.custos.cartoes.invalidate(); toast.success("Cartão excluído"); },
    onError: (e) => toast.error(e.message),
  });
  const salvar = trpc.custos.salvarCartao.useMutation({
    onSuccess: () => { utils.custos.cartoes.invalidate(); setEd(null); toast.success("Salvo"); },
    onError: (e) => toast.error(e.message),
  });
  const [ed, setEd] = useState<any>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cartões e contas</h2>
          <p className="text-sm text-gray-500">Aparecem quando alguém escolhe pagar no cartão.</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setEd({ nome: "", tipo: "credito", banco: "", final: "", titular: "", ativo: true })}><Plus className="h-4 w-4" /> Novo</Button>
      </div>
      {ed && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-gray-50 p-3">
          <div><label className="block text-xs text-gray-500">Nome</label><Input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} className="h-10 w-48" placeholder="Ex.: Cartão Sicoob" maxLength={80} /></div>
          <div><label className="block text-xs text-gray-500">Tipo</label>
            <select className={select} value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value })}>
              <option value="credito">Crédito</option><option value="debito">Débito</option><option value="conta">Conta</option>
            </select></div>
          <div><label className="block text-xs text-gray-500">Banco</label><Input value={ed.banco ?? ""} onChange={(e) => setEd({ ...ed, banco: e.target.value })} className="h-10 w-32" /></div>
          <div><label className="block text-xs text-gray-500">Final</label><Input value={ed.final ?? ""} onChange={(e) => setEd({ ...ed, final: e.target.value })} className="h-10 w-20" maxLength={10} /></div>
          <div><label className="block text-xs text-gray-500">Titular</label><Input value={ed.titular ?? ""} onChange={(e) => setEd({ ...ed, titular: e.target.value })} className="h-10 w-40" /></div>
          <label className="flex items-center gap-1 pb-2 text-sm"><input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Ativo</label>
          <Button size="sm" disabled={salvar.isPending} onClick={() => salvar.mutate({ id: ed.id, nome: ed.nome, tipo: ed.tipo, banco: ed.banco || null, final: ed.final || null, titular: ed.titular || null, ativo: ed.ativo })}>Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button>
        </div>
      )}
      <ul className="divide-y rounded-xl border bg-white">
        {(lista.data ?? []).length === 0 && <li className="px-3 py-4 text-sm text-gray-500">Nenhum cartão cadastrado.</li>}
        {(lista.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2">
            <div className={c.ativo ? "" : "text-gray-400"}>
              <span className="font-medium">{c.nome}</span>
              <span className="ml-2 text-xs text-gray-500">{c.tipo}{c.banco ? ` · ${c.banco}` : ""}{c.final ? ` · final ${c.final}` : ""}{c.titular ? ` · ${c.titular}` : ""}{c.ativo ? "" : " · inativo"}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" title="Alterar" onClick={() => setEd({ ...c })}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" title="Excluir" className="text-gray-400 hover:text-red-600" disabled={excluir.isPending}
                onClick={() => confirm(`Excluir "${c.nome}"? Só é possível se nenhum gasto o usar.`) && excluir.mutate({ id: c.id })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Conferentes() {
  const utils = trpc.useUtils();
  const cfg = trpc.custos.conferentesConfig.useQuery();
  const [sel, setSel] = useState<number[] | null>(null);
  const atual = sel ?? cfg.data?.selecionados ?? [];
  const salvar = trpc.custos.salvarConferentes.useMutation({
    onSuccess: () => { utils.custos.conferentesConfig.invalidate(); utils.custos.minhaConferencia.invalidate(); setSel(null); toast.success("Responsáveis salvos"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Quem confere os gastos</h2>
        <p className="text-sm text-gray-500">Estas pessoas verificam se cada gasto foi preenchido corretamente e podem aprovar ou devolver para correção. Administradores sempre podem conferir.</p>
      </div>
      <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-xl border bg-white p-3 sm:grid-cols-2">
        {(cfg.data?.usuarios ?? []).map((u) => (
          <label key={u.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={atual.includes(u.id)}
              onChange={(e) => setSel(e.target.checked ? [...atual, u.id] : atual.filter((x) => x !== u.id))} />
            {u.nome}
          </label>
        ))}
      </div>
      <Button size="sm" disabled={sel === null || salvar.isPending} onClick={() => salvar.mutate({ userIds: atual })}>Salvar responsáveis</Button>
    </section>
  );
}

function PedagioPlanta() {
  const utils = trpc.useUtils();
  const plantas = trpc.custos.plantas.useQuery();
  const cfg = trpc.custos.pedagioConfig.useQuery();
  const salvar = trpc.custos.salvarPedagioConfig.useMutation({
    onSuccess: () => { utils.custos.pedagioConfig.invalidate(); toast.success("Salvo"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Planta padrão dos pedágios</h2>
        <p className="text-sm text-gray-500">Os pedágios (TAG) vêm do extrato do banco, que não informa a planta. Os novos entram nesta planta; se deixar vazio, entram “sem planta” até alguém atribuir.</p>
      </div>
      <select className={select} value={cfg.data?.plantaPadraoId ?? ""} onChange={(e) => salvar.mutate({ plantaPadraoId: e.target.value ? Number(e.target.value) : null })}>
        <option value="">Sem planta (atribuir depois)</option>
        {(plantas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
    </section>
  );
}

export default function CadastrosCustosTab() {
  return (
    <div className="space-y-8">
      <PedagioPlanta />
      <Conferentes />
      <Categorias />
      <Cartoes />
    </div>
  );
}
