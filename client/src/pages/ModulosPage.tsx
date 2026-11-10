// @ts-nocheck
// Administração > Módulos do Sistema: liga/desliga cada módulo para o sistema inteiro.
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function ModulosPage() {
  const utils = trpc.useUtils();
  const q = trpc.modulosConfig.listar.useQuery();
  const definir = trpc.modulosConfig.definir.useMutation({
    onSuccess: (_, v) => {
      utils.modulosConfig.listar.invalidate();
      utils.modulosConfig.inativos.invalidate();
      utils.permissions.listModules.invalidate();
      toast.success(v.ativo ? "Módulo ativado" : "Módulo desativado");
    },
    onError: (e) => toast.error(e.message),
  });

  const lista = q.data ?? [];
  const grupos = Array.from(new Set(lista.map((m) => m.grupo)));
  const inativos = lista.filter((m) => !m.ativo).length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Módulos do sistema</h1>
        <p className="text-sm text-gray-500">
          Desative o que não deve ser usado agora. Um módulo <b>inativo</b> some do menu, do Painel e do Controle de Acesso para <b>todos, inclusive administradores</b>,
          e o servidor recusa o acesso a ele. Reative aqui quando quiser. As permissões de cada usuário não são apagadas.
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">{lista.length - inativos} ativos</span> · <span className={inativos ? "font-medium text-amber-700" : "text-gray-500"}>{inativos} inativos</span>
        </p>
      </div>

      {q.isLoading && <p className="py-6 text-center text-gray-500">Carregando...</p>}

      {grupos.map((g) => (
        <section key={g} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{g}</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {lista.filter((m) => m.grupo === g).map((m) => (
              <div key={m.slug} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${m.ativo ? "bg-white" : "border-amber-300 bg-amber-50"}`}>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${m.ativo ? "" : "text-gray-600"}`}>{m.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {m.ativo ? "Ativo" : <Badge variant="outline" className="border-amber-400 text-amber-700">Inativo</Badge>}
                    {!m.ativo && m.atualizadoPor ? ` · por ${m.atualizadoPor}` : ""}
                  </p>
                </div>
                <Switch checked={m.ativo} disabled={definir.isPending} onCheckedChange={(v) => definir.mutate({ slug: m.slug, ativo: v })} aria-label={`${m.ativo ? "Desativar" : "Ativar"} ${m.label}`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
