// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, MapPin, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { areaDisplayName, areaStatusLabel, type ClientAreaOption } from "./ClientAreaSelect";

type Props = {
  clientId: number;
  clientName?: string;
  onChanged?: () => void;
};

type Draft = {
  name: string;
  fieldName: string;
  notes: string;
  unit: "ton" | "m3";
  unitPrice: string;
  paymentMethod: string;
  paymentTermDays: string;
  billingCycle: "manual" | "semanal" | "quinzenal" | "mensal";
};

const emptyDraft: Draft = {
  name: "",
  fieldName: "",
  notes: "",
  unit: "ton",
  unitPrice: "",
  paymentMethod: "",
  paymentTermDays: "",
  billingCycle: "manual",
};

const valueOrEmpty = (value: unknown) => value == null ? "" : String(value);

function draftFromArea(area: ClientAreaOption): Draft {
  return {
    name: valueOrEmpty(area.name),
    fieldName: valueOrEmpty(area.fieldName),
    notes: valueOrEmpty(area.notes),
    unit: area.unit === "m3" ? "m3" : "ton",
    unitPrice: valueOrEmpty(area.unitPrice),
    paymentMethod: valueOrEmpty(area.paymentMethod),
    paymentTermDays: valueOrEmpty(area.paymentTermDays),
    billingCycle: ["manual", "semanal", "quinzenal", "mensal"].includes(area.billingCycle as string) ? area.billingCycle as Draft["billingCycle"] : "manual",
  };
}

function validateAgreement(draft: Draft) {
  const price = Number(String(draft.unitPrice).replace(",", "."));
  const days = Number(draft.paymentTermDays);
  if (!draft.unit || !Number.isFinite(price) || price <= 0 || !draft.paymentMethod.trim() || !Number.isInteger(days) || days < 0) {
    return "Para confirmar, informe unidade, preço maior que zero, forma e prazo de pagamento válido.";
  }
  return null;
}

export default function ClientAreasManager({ clientId, clientName, onChanged }: Props) {
  const utils = trpc.useUtils();
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(emptyDraft);
  const { data: areas = [], isLoading, isError } = trpc.clientAreas.list.useQuery({ clientId }, { enabled: clientId > 0, retry: false });

  const createArea = trpc.clientAreas.create.useMutation({
    onSuccess: async () => {
      toast.success("Área criada como pendente. Configure o acordo antes de usar ações financeiras.");
      await utils.clientAreas.list.invalidate({ clientId });
      setDraft(emptyDraft);
      setIsCreating(false);
      onChanged?.();
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar a área."),
  });
  const updateArea = trpc.clientAreas.update.useMutation({
    onSuccess: async () => {
      toast.success("Área atualizada.");
      await utils.clientAreas.list.invalidate({ clientId });
      setEditingId(null);
      onChanged?.();
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a área."),
  });

  const saveCreate = () => {
    if (!draft.name.trim()) { toast.error("Informe o nome da área."); return; }
    createArea.mutate({ clientId, name: draft.name.trim(), fieldName: draft.fieldName.trim() || undefined, notes: draft.notes.trim() || undefined });
  };

  const saveEdit = (area: ClientAreaOption) => {
    const agreementStatus = validateAgreement(editingDraft) ? "pending" : "confirmed";
    updateArea.mutate({
      id: area.id,
      name: editingDraft.name.trim() || undefined,
      fieldName: editingDraft.fieldName.trim() || undefined,
      notes: editingDraft.notes.trim() || undefined,
      unit: editingDraft.unit,
      unitPrice: editingDraft.unitPrice.replace(",", ".") || undefined,
      paymentMethod: editingDraft.paymentMethod.trim() || undefined,
      paymentTermDays: editingDraft.paymentTermDays ? Number(editingDraft.paymentTermDays) : undefined,
      billingCycle: editingDraft.billingCycle,
      agreementStatus,
    });
  };

  const beginEdit = (area: ClientAreaOption) => { setEditingId(area.id); setEditingDraft(draftFromArea(area)); };
  const areaList = areas as ClientAreaOption[];

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-emerald-800 flex items-center justify-between gap-2">
          <span>Áreas e acordos{clientName ? ` — ${clientName}` : ""}</span>
          <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => { setIsCreating((value) => !value); setDraft(emptyDraft); }}>
            <Plus className="h-3.5 w-3.5" /> Nova área
          </Button>
        </CardTitle>
        <p className="text-xs text-gray-500">A Área atual representa o legado (areaId nulo). Toda área nova nasce pendente e não copia preço, prazo ou saldo.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isCreating && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
            <p className="text-sm font-semibold text-emerald-800">Cadastrar nova área</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label>Nome da área *</Label><Input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} placeholder="Área 2" autoFocus /></div>
              <div><Label>Fazenda / campo / talhão</Label><Input value={draft.fieldName} onChange={(e) => setDraft((v) => ({ ...v, fieldName: e.target.value }))} placeholder="Fazenda A / Talhão 01" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={draft.notes} onChange={(e) => setDraft((v) => ({ ...v, notes: e.target.value }))} placeholder="Informações da área" rows={2} /></div>
            <p className="text-[11px] text-amber-700 flex items-center gap-1"><MapPin className="h-3 w-3" />O GPS é opcional e será configurado separadamente. Não inferimos coordenadas.</p>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancelar</Button><Button type="button" size="sm" className="bg-emerald-600 text-white" onClick={saveCreate} disabled={createArea.isPending}>{createArea.isPending ? "Criando..." : "Criar pendente"}</Button></div>
          </div>
        )}

        {isLoading && <div className="text-sm text-gray-400 py-3">Carregando áreas...</div>}
        {isError && <div className="text-sm text-red-600 py-3">Não foi possível carregar áreas. Tente novamente.</div>}
        {!isLoading && !isError && areaList.length === 0 && <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">Nenhuma área nova cadastrada. O legado continua sendo a Área atual.</div>}

        {areaList.map((area) => {
          const isEditing = editingId === area.id;
          const currentDraft = isEditing ? editingDraft : draftFromArea(area);
          const pending = area.agreementStatus === "pending";
          const agreementError = isEditing ? validateAgreement(editingDraft) : null;
          return (
            <div key={area.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800">{areaDisplayName(area)}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Local próprio: {area.workLocationName || (area.workLocationId ? `#${area.workLocationId}` : "a configurar")}</p>
                </div>
                <span className={`text-[11px] rounded-full px-2 py-1 font-medium flex items-center gap-1 ${pending ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
                  {pending ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {areaStatusLabel(area)}
                </span>
              </div>
              {!isEditing ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">{area.unit && area.unitPrice ? `${area.unit === "m3" ? "m³" : "ton"} · R$ ${area.unitPrice}` : "Condições ainda não configuradas"}{area.paymentMethod ? ` · ${area.paymentMethod}` : ""}</div>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => beginEdit(area)}><Save className="h-3 w-3" /> Configurar</Button>
                </div>
              ) : (
                <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><Label>Nome da área</Label><Input value={currentDraft.name} onChange={(e) => setEditingDraft((v) => ({ ...v, name: e.target.value }))} /></div>
                    <div><Label>Campo / talhão</Label><Input value={currentDraft.fieldName} onChange={(e) => setEditingDraft((v) => ({ ...v, fieldName: e.target.value }))} /></div>
                    <div><Label>Unidade *</Label><select value={currentDraft.unit} onChange={(e) => setEditingDraft((v) => ({ ...v, unit: e.target.value as Draft["unit"] }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"><option value="ton">Tonelada</option><option value="m3">m³</option></select></div>
                    <div><Label>Preço por unidade *</Label><Input type="number" min="0" step="0.01" value={currentDraft.unitPrice} onChange={(e) => setEditingDraft((v) => ({ ...v, unitPrice: e.target.value }))} placeholder="130.00" /></div>
                    <div><Label>Forma de pagamento *</Label><Input value={currentDraft.paymentMethod} onChange={(e) => setEditingDraft((v) => ({ ...v, paymentMethod: e.target.value }))} placeholder="PIX, boleto..." /></div>
                    <div><Label>Prazo (dias) *</Label><Input type="number" min="0" step="1" value={currentDraft.paymentTermDays} onChange={(e) => setEditingDraft((v) => ({ ...v, paymentTermDays: e.target.value }))} placeholder="21" /></div>
                    <div><Label>Ciclo de cobrança</Label><select value={currentDraft.billingCycle} onChange={(e) => setEditingDraft((v) => ({ ...v, billingCycle: e.target.value as Draft["billingCycle"] }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"><option value="manual">Manual</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option></select></div>
                  </div>
                  <div><Label>Observações</Label><Textarea value={currentDraft.notes} onChange={(e) => setEditingDraft((v) => ({ ...v, notes: e.target.value }))} rows={2} /></div>
                  {agreementError ? <p className="text-[11px] text-amber-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Salvar mantém o acordo pendente: {agreementError}</p> : <p className="text-[11px] text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Condições completas: o acordo será confirmado.</p>}
                  <div className="flex gap-2 justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button><Button type="button" size="sm" className="bg-emerald-600 text-white" onClick={() => saveEdit(area)} disabled={updateArea.isPending || !currentDraft.name.trim()}>{updateArea.isPending ? "Salvando..." : "Salvar condições"}</Button></div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export { ClientAreasManager };
