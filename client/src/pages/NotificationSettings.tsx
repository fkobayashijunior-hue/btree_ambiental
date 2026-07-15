import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell, Clock, Users, Save, MessageCircle, UserCheck } from "lucide-react";

type JobConfig = {
  enabled: boolean;
  hour: number;
  minute: number;
  weekday: number | null;
  whatsappCollaboratorIds: number[];
};

type ClientNotifConfig = {
  enabled: boolean;
  clientIds: number[];
};

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export default function NotificationSettings() {
  const { data, isLoading } = trpc.notificationSettings.get.useQuery();
  const utils = trpc.useUtils();

  const [config, setConfig] = useState<Record<string, JobConfig> | null>(null);
  const [clientConfig, setClientConfig] = useState<Record<string, ClientNotifConfig>>({});

  useEffect(() => {
    if (data?.config) setConfig(JSON.parse(JSON.stringify(data.config)));
    setClientConfig(JSON.parse(JSON.stringify((data as any)?.clientConfig ?? {})));
  }, [data]);

  const updateMutation = trpc.notificationSettings.update.useMutation({
    onSuccess: () => {
      utils.notificationSettings.get.invalidate();
      toast.success("Configuração de notificações salva!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateClientMutation = trpc.notificationSettings.updateClientConfig.useMutation({
    onSuccess: () => {
      utils.notificationSettings.get.invalidate();
      toast.success("Notificações de clientes salvas!");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !config || !data) {
    return <div className="p-6 text-muted-foreground">Carregando configurações…</div>;
  }

  const { meta, jobKeys, collaborators } = data as any;
  const d = data as any;

  const clientNotifKeys: string[] = d?.clientNotifKeys ?? ['cargaRegistrada', 'cargaEntregue', 'pagamentoConfirmado'];
  const clientMeta: Record<string, { label: string; description: string; template: string }> = d?.clientMeta ?? {
    cargaRegistrada:     { label: 'Carga registrada',     description: 'Notifica o cliente via WhatsApp quando uma nova carga é registrada.',           template: 'carga_registrada'     },
    cargaEntregue:       { label: 'Carga entregue',       description: 'Notifica o cliente via WhatsApp quando a carga é marcada como entregue.',        template: 'carga_entregue'       },
    pagamentoConfirmado: { label: 'Pagamento confirmado', description: 'Notifica o cliente via WhatsApp quando o fechamento semanal é marcado como pago.', template: 'pagamento_confirmado' },
  };
  const clients: Array<{ id: number; name: string; phone: string | null }> = d?.clients ?? [];

  const patch = (key: string, partial: Partial<JobConfig>) => {
    setConfig((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...partial } } : prev));
  };

  const toggleCollaborator = (key: string, id: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const ids = prev[key].whatsappCollaboratorIds;
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...prev, [key]: { ...prev[key], whatsappCollaboratorIds: next } };
    });
  };

  const patchClient = (key: string, partial: Partial<ClientNotifConfig>) => {
    setClientConfig((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...partial } } : prev));
  };

  const toggleClient = (key: string, id: number) => {
    setClientConfig((prev) => {
      if (!prev) return prev;
      const ids = prev[key].clientIds;
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...prev, [key]: { ...prev[key], clientIds: next } };
    });
  };

  const save = () => updateMutation.mutate(config as any);
  const saveClientConfig = () => {
    if (clientConfig) updateClientMutation.mutate(clientConfig as any);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-600" />
            Configuração de Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina o horário de cada notificação e quem recebe uma cópia por WhatsApp.
          </p>
        </div>
        <Button onClick={save} disabled={updateMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        ℹ️ As notificações internas (sino) continuam funcionando normalmente. A cópia por WhatsApp
        usa o telefone cadastrado do colaborador. Lembre-se: mensagens de texto livre só são
        entregues dentro da janela de 24h da Meta; para envios proativos fora dela é necessário um
        template aprovado.
      </p>

      {jobKeys.map((key: string) => {
        const cfg = config[key];
        const m = meta[key];
        if (!cfg || !m) return null;
        return (
          <Card key={key} className={cfg.enabled ? "" : "opacity-70"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{m.label}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor={`enabled-${key}`} className="text-xs text-muted-foreground">
                    {cfg.enabled ? "Ativa" : "Inativa"}
                  </Label>
                  <Switch
                    id={`enabled-${key}`}
                    checked={cfg.enabled}
                    onCheckedChange={(v) => patch(key, { enabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Horário
                  </Label>
                  <input
                    type="time"
                    value={`${pad(cfg.hour)}:${pad(cfg.minute)}`}
                    onChange={(e) => {
                      const [h, mm] = e.target.value.split(":").map((x) => parseInt(x, 10));
                      patch(key, { hour: isNaN(h) ? 0 : h, minute: isNaN(mm) ? 0 : mm });
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                {m.weekly && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia da semana</Label>
                    <select
                      value={cfg.weekday ?? 1}
                      onChange={(e) => patch(key, { weekday: parseInt(e.target.value, 10) })}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!m.weekly && (
                  <span className="text-xs text-muted-foreground pb-2">Executa todos os dias</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" /> Recebem cópia por WhatsApp
                  <span className="text-muted-foreground">
                    ({cfg.whatsappCollaboratorIds.length} selecionado(s))
                  </span>
                </Label>
                <div className="max-h-44 overflow-y-auto rounded-md border border-input p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {collaborators.length === 0 && (
                    <span className="text-xs text-muted-foreground p-1">
                      Nenhum colaborador ativo encontrado.
                    </span>
                  )}
                  {collaborators.map((c: any) => {
                    const checked = cfg.whatsappCollaboratorIds.includes(c.id);
                    const noPhone = !c.phone;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/60 ${
                          noPhone ? "opacity-50" : ""
                        }`}
                        title={noPhone ? "Sem telefone cadastrado" : c.phone}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={noPhone}
                          onChange={() => toggleCollaborator(key, c.id)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span className="flex items-center gap-1 truncate">
                          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{c.name}</span>
                          {noPhone && <span className="text-[10px] text-amber-600">(sem tel.)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end pb-2">
        <Button onClick={save} disabled={updateMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      {/* ── Notificações para Clientes ── */}
      <div className="pt-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Notificações para Clientes (WhatsApp)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Envie templates aprovados diretamente para os clientes em eventos de carga e pagamento.
            </p>
          </div>
          <Button
            onClick={saveClientConfig}
            disabled={updateClientMutation.isPending}
            className="gap-2"
            variant="outline"
          >
            <Save className="h-4 w-4" />
            {updateClientMutation.isPending ? "Salvando…" : "Salvar notificações de clientes"}
          </Button>
        </div>

        {clientNotifKeys && clientNotifKeys.map((key: string) => {
          const cfg: ClientNotifConfig = clientConfig[key] ?? { enabled: false, clientIds: [] };
          const m = clientMeta?.[key];
          if (!m) return null;
          return (
            <Card key={key} className={cfg.enabled ? "" : "opacity-70"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{m.label}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Template: <code className="bg-muted px-1 rounded">{m.template}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label htmlFor={`client-enabled-${key}`} className="text-xs text-muted-foreground">
                      {cfg.enabled ? "Ativa" : "Inativa"}
                    </Label>
                    <Switch
                      id={`client-enabled-${key}`}
                      checked={cfg.enabled}
                      onCheckedChange={(v) => patchClient(key, { enabled: v })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> Clientes que recebem esta notificação
                    <span className="text-muted-foreground">
                      ({cfg.clientIds.length} selecionado(s))
                    </span>
                  </Label>
                  <div className="max-h-44 overflow-y-auto rounded-md border border-input p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {(!clients || clients.length === 0) && (
                      <span className="text-xs text-muted-foreground p-1">
                        Nenhum cliente ativo encontrado.
                      </span>
                    )}
                    {clients && clients.map((c: any) => {
                      const checked = cfg.clientIds.includes(c.id);
                      const noPhone = !c.phone;
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/60 ${
                            noPhone ? "opacity-50" : ""
                          }`}
                          title={noPhone ? "Sem telefone cadastrado" : c.phone}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={noPhone}
                            onChange={() => toggleClient(key, c.id)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <span className="flex items-center gap-1 truncate">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{c.name}</span>
                            {noPhone && <span className="text-[10px] text-amber-600">(sem tel.)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end pb-8">
          <Button
            onClick={saveClientConfig}
            disabled={updateClientMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateClientMutation.isPending ? "Salvando…" : "Salvar notificações de clientes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
