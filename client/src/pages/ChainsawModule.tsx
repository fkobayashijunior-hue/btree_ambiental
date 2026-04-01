import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useFilePicker } from "@/hooks/useFilePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Wrench, Fuel, Link2, Package, ClipboardList,
  AlertTriangle, CheckCircle2, Clock, XCircle, Trash2,
  ArrowRight, ArrowLeft, RotateCcw, TrendingDown, TrendingUp,
  ChevronDown, ChevronUp, Edit
} from "lucide-react";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const PROBLEM_LABELS: Record<string, string> = {
  motor_falhando: "Motor falhando",
  nao_liga: "Não liga",
  superaquecimento: "Superaquecimento",
  vazamento: "Vazamento",
  corrente_problema: "Problema na corrente",
  sabre_problema: "Problema no sabre",
  manutencao_preventiva: "Manutenção preventiva",
  outro: "Outro",
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-slate-100 text-slate-700",
  media: "bg-yellow-100 text-yellow-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-700",
  em_andamento: "bg-yellow-100 text-yellow-700",
  concluida: "bg-green-100 text-green-700",
  cancelada: "bg-slate-100 text-slate-500",
  ativa: "bg-green-100 text-green-700",
  oficina: "bg-orange-100 text-orange-700",
  inativa: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  ativa: "Ativa",
  oficina: "Na oficina",
  inativa: "Inativa",
};

// ─────────────────────────────────────────────
// ABA MOTOSSERRAS
// ─────────────────────────────────────────────
function ChainsawsTab() {
  const { data: chainsawList = [], refetch } = trpc.chainsawModule.chainsaws.list.useQuery();
  const createMutation = trpc.chainsawModule.chainsaws.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success('Motosserra cadastrada!'); } });
  const updateMutation = trpc.chainsawModule.chainsaws.update.useMutation({ onSuccess: () => { refetch(); setEditItem(null); toast.success('Atualizado!'); } });
  const deleteMutation = trpc.chainsawModule.chainsaws.delete.useMutation({ onSuccess: () => { refetch(); toast.success('Removida!'); } });
  const openOSMutation = trpc.chainsawModule.os.open.useMutation({ onSuccess: () => { refetch(); setOSDialog(null); toast.success('OS aberta com sucesso!'); } });

  const { openFilePicker } = useFilePicker();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [osDialog, setOSDialog] = useState<any>(null);
  const [form, setForm] = useState({ name: "", brand: "", model: "", serialNumber: "", chainType: "30", notes: "" });
  const [osForm, setOSForm] = useState({ problemType: "motor_falhando", problemDescription: "", priority: "media" });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [osPhotoPreview, setOSPhotoPreview] = useState<string | null>(null);
  const [osPhotoBase64, setOSPhotoBase64] = useState<string | null>(null);

  function resetForm() {
    setForm({ name: "", brand: "", model: "", serialNumber: "", chainType: "30", notes: "" });
    setPhotoPreview(null);
    setPhotoBase64(null);
  }

  function handlePhotoChange(files: FileList) {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setPhotoPreview(b64);
      setPhotoBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  function handleOSPhotoChange(files: FileList) {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setOSPhotoPreview(b64);
      setOSPhotoBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1a3a2a]">Motosserras Cadastradas</h2>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-2">
          <Plus className="w-4 h-4" /> Nova Motosserra
        </Button>
      </div>

      <div className="grid gap-3">
        {chainsawList.length === 0 && (
          <Card><CardContent className="py-8 text-center text-slate-500">Nenhuma motosserra cadastrada.</CardContent></Card>
        )}
        {chainsawList.map((cs: any) => (
          <Card key={cs.id} className="border-l-4" style={{ borderLeftColor: cs.status === "ativa" ? "#2d6a4f" : cs.status === "oficina" ? "#f97316" : "#94a3b8" }}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {cs.imageUrl && (
                    <img src={cs.imageUrl} alt={cs.name} className="w-14 h-14 object-cover rounded-lg border flex-shrink-0" onClick={() => window.open(cs.imageUrl, '_blank')} style={{cursor:'pointer'}} />
                  )}
                  <div>
                    <p className="font-semibold text-[#1a3a2a]">{cs.name}</p>
                    <p className="text-sm text-slate-500">{cs.brand} {cs.model} {cs.serialNumber ? `· Série: ${cs.serialNumber}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Corrente: {cs.chainType} dentes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_COLORS[cs.status]}>{STATUS_LABELS[cs.status]}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(cs); setForm({ name: cs.name, brand: cs.brand || "", model: cs.model || "", serialNumber: cs.serialNumber || "", chainType: cs.chainType || "30", notes: cs.notes || "" }); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setOSDialog(cs)}>
                    <Wrench className="w-3 h-3 mr-1" /> Abrir OS
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (confirm("Remover motosserra?")) deleteMutation.mutate({ id: cs.id }); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {cs.notes && <p className="text-xs text-slate-500 mt-1 italic">{cs.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showCreate || !!editItem} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Motosserra" : "Nova Motosserra"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Stihl MS 381 #1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Marca</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Stihl, Husqvarna..." /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="MS 381" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº de Série</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
              <div><Label>Tipo de Corrente</Label>
                <Select value={form.chainType} onValueChange={v => setForm(f => ({ ...f, chainType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dentes</SelectItem>
                    <SelectItem value="34">34 dentes</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Foto da Motosserra</Label>
              <div className="mt-1 flex items-center gap-3">
                {(photoPreview || editItem?.imageUrl) && (
                  <img src={photoPreview || editItem?.imageUrl} alt="Foto" className="w-20 h-20 object-cover rounded-lg border" onClick={() => window.open(photoPreview || editItem?.imageUrl, '_blank')} style={{cursor:'pointer'}} />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => openFilePicker({ accept: "image/*", capture: "environment" }, handlePhotoChange)}>
                  📷 {photoPreview || editItem?.imageUrl ? "Trocar Foto" : "Adicionar Foto"}
                </Button>
                {(photoPreview || editItem?.imageUrl) && (
                  <Button type="button" variant="outline" size="sm" className="text-red-500" onClick={() => { setPhotoPreview(null); setPhotoBase64(null); if (editItem) setEditItem((e: any) => ({ ...e, imageUrl: null })); }}>✕</Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>Cancelar</Button>
            <Button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white" disabled={createMutation.isPending || updateMutation.isPending} onClick={() => {
              if (!form.name) return toast.error('Nome obrigatório');
              const imageUrl = photoBase64 || (editItem?.imageUrl ?? undefined);
              if (editItem) updateMutation.mutate({ id: editItem.id, ...form, imageUrl });
              else createMutation.mutate({ ...form, imageUrl });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Abrir OS */}
      <Dialog open={!!osDialog} onOpenChange={(o) => { if (!o) setOSDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir OS — {osDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo de Problema *</Label>
              <Select value={osForm.problemType} onValueChange={v => setOSForm(f => ({ ...f, problemType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROBLEM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={osForm.priority} onValueChange={v => setOSForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição do Problema</Label>
              <Textarea value={osForm.problemDescription} onChange={e => setOSForm(f => ({ ...f, problemDescription: e.target.value }))} rows={3} placeholder="Descreva o problema para o mecânico..." />
            </div>
            <div>
              <Label>Foto do Problema (opcional)</Label>
              <div className="mt-1 flex items-center gap-3">
                {osPhotoPreview && (
                  <img src={osPhotoPreview} alt="Foto" className="w-20 h-20 object-cover rounded-lg border" />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => openFilePicker({ accept: "image/*", capture: "environment" }, handleOSPhotoChange)}>
                  📷 {osPhotoPreview ? "Trocar Foto" : "Adicionar Foto"}
                </Button>
                {osPhotoPreview && (
                  <Button type="button" variant="outline" size="sm" className="text-red-500" onClick={() => { setOSPhotoPreview(null); setOSPhotoBase64(null); }}>✕</Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOSDialog(null); setOSPhotoPreview(null); setOSPhotoBase64(null); }}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" disabled={openOSMutation.isPending} onClick={() => {
              if (!osDialog) return;
              openOSMutation.mutate({ chainsawId: osDialog.id, problemType: osForm.problemType as any, problemDescription: osForm.problemDescription, priority: osForm.priority as any, imageUrl: osPhotoBase64 || undefined });
            }}>Abrir OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABA COMBUSTÍVEL
// ─────────────────────────────────────────────
function FuelTab() {
  const { data: containers = [], refetch: refetchContainers } = trpc.chainsawModule.fuel.listContainers.useQuery();
  const { data: events = [] } = trpc.chainsawModule.fuel.listEvents.useQuery({ containerId: undefined });
  const { data: chainsawList = [] } = trpc.chainsawModule.chainsaws.list.useQuery();

  const createContainerMutation = trpc.chainsawModule.fuel.createContainer.useMutation({ onSuccess: () => { refetchContainers(); setShowCreateContainer(false); toast.success('Galão cadastrado!'); } });
  const supplyMutation = trpc.chainsawModule.fuel.supplyContainer.useMutation({ onSuccess: (d) => { refetchContainers(); setSupplyDialog(null); toast.success(`Galão abastecido!${d.oil2tMl ? ` Baixa automática: ${d.oil2tMl}ml de óleo 2T` : ""}`); } });
  const useMutation = trpc.chainsawModule.fuel.useFuel.useMutation({ onSuccess: () => { refetchContainers(); setUseDialog(null); toast.success('Uso registrado!'); } });
  const transferMutation = trpc.chainsawModule.fuel.transferFuel.useMutation({ onSuccess: () => { refetchContainers(); setTransferDialog(false); toast.success('Transferência realizada!'); } });

  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [supplyDialog, setSupplyDialog] = useState<any>(null);
  const [useDialog, setUseDialog] = useState<any>(null);
  const [transferDialog, setTransferDialog] = useState(false);
  const [containerForm, setContainerForm] = useState({ name: "", color: "vermelho", type: "puro" as "puro" | "mistura", capacityLiters: "20" });
  const [supplyForm, setSupplyForm] = useState({ volumeLiters: "", costPerLiter: "", totalCost: "", notes: "" });
  const [useForm, setUseForm] = useState({ volumeLiters: "", chainsawId: "", notes: "" });
  const [transferForm, setTransferForm] = useState({ sourceContainerId: "", targetContainerId: "", volumeLiters: "", notes: "" });

  const EVENT_LABELS: Record<string, string> = { abastecimento: "Abastecimento", uso: "Uso no campo", transferencia: "Transferência" };
  const EVENT_COLORS: Record<string, string> = { abastecimento: "text-green-600", uso: "text-orange-600", transferencia: "text-blue-600" };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1a3a2a]">Controle de Combustível</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferDialog(true)} className="gap-2 text-blue-600 border-blue-200">
            <ArrowRight className="w-4 h-4" /> Transferir
          </Button>
          <Button onClick={() => setShowCreateContainer(true)} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-2">
            <Plus className="w-4 h-4" /> Novo Galão
          </Button>
        </div>
      </div>

      {/* Galões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {containers.length === 0 && (
          <Card className="col-span-2"><CardContent className="py-8 text-center text-slate-500">Nenhum galão cadastrado.</CardContent></Card>
        )}
        {containers.map((c: any) => {
          const pct = Math.min(100, (parseFloat(c.currentVolumeLiters || "0") / parseFloat(c.capacityLiters || "20")) * 100);
          return (
            <Card key={c.id} className={`border-2 ${c.type === "mistura" ? "border-green-300" : "border-red-300"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${c.color === "verde" ? "bg-green-500" : c.color === "vermelho" ? "bg-red-500" : "bg-slate-400"}`} />
                  {c.name}
                  <Badge className={c.type === "mistura" ? "bg-green-100 text-green-700 ml-auto" : "bg-red-100 text-red-700 ml-auto"}>
                    {c.type === "mistura" ? "Mistura 2T" : "Gasolina Pura"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Volume atual</span>
                    <span className="font-semibold">{parseFloat(c.currentVolumeLiters || "0").toFixed(1)}L / {c.capacityLiters}L</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSupplyDialog(c); setSupplyForm({ volumeLiters: "", costPerLiter: "", totalCost: "", notes: "" }); }}>
                    <TrendingUp className="w-3 h-3 mr-1" /> Abastecer
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-orange-600 border-orange-200" onClick={() => { setUseDialog(c); setUseForm({ volumeLiters: "", chainsawId: "", notes: "" }); }}>
                    <TrendingDown className="w-3 h-3 mr-1" /> Registrar Uso
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Histórico */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Últimos Eventos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {events.slice(0, 20).map((e: any) => (
                <div key={e.id} className="px-4 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className={`font-medium ${EVENT_COLORS[e.eventType]}`}>{EVENT_LABELS[e.eventType]}</span>
                    <span className="text-slate-500 ml-2">{parseFloat(e.volumeLiters).toFixed(1)}L</span>
                    {e.oil2tMl && <span className="text-green-600 ml-2 text-xs">(+{e.oil2tMl}ml óleo 2T)</span>}
                    {e.notes && <span className="text-slate-400 ml-2 text-xs italic">{e.notes}</span>}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(e.eventDate).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Novo Galão */}
      <Dialog open={showCreateContainer} onOpenChange={setShowCreateContainer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar Galão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={containerForm.name} onChange={e => setContainerForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Galão Verde (Mistura)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cor</Label>
                <Select value={containerForm.color} onValueChange={v => setContainerForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vermelho">Vermelho</SelectItem>
                    <SelectItem value="verde">Verde</SelectItem>
                    <SelectItem value="amarelo">Amarelo</SelectItem>
                    <SelectItem value="azul">Azul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={containerForm.type} onValueChange={v => setContainerForm(f => ({ ...f, type: v as "puro" | "mistura" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="puro">Gasolina Pura</SelectItem>
                    <SelectItem value="mistura">Mistura (2T)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Capacidade (litros)</Label><Input type="number" value={containerForm.capacityLiters} onChange={e => setContainerForm(f => ({ ...f, capacityLiters: e.target.value }))} /></div>
            {containerForm.type === "mistura" && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
                <strong>Proporção automática:</strong> Ao abastecer este galão, o sistema dará baixa automática de <strong>20ml de óleo 2T por litro</strong> (400ml para 20L).
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateContainer(false)}>Cancelar</Button>
            <Button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white" onClick={() => {
              if (!containerForm.name) return toast.error('Nome obrigatório');
              createContainerMutation.mutate(containerForm);
            }}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Abastecer */}
      <Dialog open={!!supplyDialog} onOpenChange={(o) => { if (!o) setSupplyDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abastecer — {supplyDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {supplyDialog?.type === "mistura" && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
                Baixa automática de óleo 2T: <strong>20ml por litro abastecido</strong>
              </div>
            )}
            <div><Label>Volume (litros) *</Label><Input type="number" step="0.1" value={supplyForm.volumeLiters} onChange={e => setSupplyForm(f => ({ ...f, volumeLiters: e.target.value }))} placeholder="Ex: 20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço/litro (R$)</Label><Input type="number" step="0.01" value={supplyForm.costPerLiter} onChange={e => setSupplyForm(f => ({ ...f, costPerLiter: e.target.value }))} placeholder="0,00" /></div>
              <div><Label>Total (R$)</Label><Input type="number" step="0.01" value={supplyForm.totalCost} onChange={e => setSupplyForm(f => ({ ...f, totalCost: e.target.value }))} placeholder="0,00" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={supplyForm.notes} onChange={e => setSupplyForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplyDialog(null)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
              if (!supplyForm.volumeLiters) return toast.error('Volume obrigatório');
              supplyMutation.mutate({ containerId: supplyDialog.id, ...supplyForm });
            }}>Registrar Abastecimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Uso */}
      <Dialog open={!!useDialog} onOpenChange={(o) => { if (!o) setUseDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Uso — {useDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Volume usado (litros) *</Label><Input type="number" step="0.1" value={useForm.volumeLiters} onChange={e => setUseForm(f => ({ ...f, volumeLiters: e.target.value }))} placeholder="Ex: 2.5" /></div>
            <div><Label>Motosserra</Label>
              <Select value={useForm.chainsawId} onValueChange={v => setUseForm(f => ({ ...f, chainsawId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                <SelectContent>
                  {chainsawList.map((cs: any) => <SelectItem key={cs.id} value={String(cs.id)}>{cs.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={useForm.notes} onChange={e => setUseForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseDialog(null)}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => {
              if (!useForm.volumeLiters) return toast.error('Volume obrigatório');
              useMutation.mutate({ containerId: useDialog.id, volumeLiters: useForm.volumeLiters, chainsawId: useForm.chainsawId ? parseInt(useForm.chainsawId) : undefined, notes: useForm.notes });
            }}>Registrar Uso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Transferência */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir Combustível</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Galão de Origem</Label>
              <Select value={transferForm.sourceContainerId} onValueChange={v => setTransferForm(f => ({ ...f, sourceContainerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar galão" /></SelectTrigger>
                <SelectContent>{containers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({parseFloat(c.currentVolumeLiters || "0").toFixed(1)}L)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center"><ArrowRight className="w-5 h-5 text-slate-400" /></div>
            <div><Label>Galão de Destino</Label>
              <Select value={transferForm.targetContainerId} onValueChange={v => setTransferForm(f => ({ ...f, targetContainerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar galão" /></SelectTrigger>
                <SelectContent>{containers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Volume (litros) *</Label><Input type="number" step="0.1" value={transferForm.volumeLiters} onChange={e => setTransferForm(f => ({ ...f, volumeLiters: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
              if (!transferForm.sourceContainerId || !transferForm.targetContainerId || !transferForm.volumeLiters)
                return toast.error('Preencha todos os campos');
              transferMutation.mutate({ sourceContainerId: parseInt(transferForm.sourceContainerId), targetContainerId: parseInt(transferForm.targetContainerId), volumeLiters: transferForm.volumeLiters, notes: transferForm.notes });
            }}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABA CORRENTES
// ─────────────────────────────────────────────
function ChainsTab() {
  const { data: stocks = [], refetch } = trpc.chainsawModule.chains.listStock.useQuery();
  const { data: events = [] } = trpc.chainsawModule.chains.listEvents.useQuery({ chainType: undefined });
  const { data: chainsawList = [] } = trpc.chainsawModule.chainsaws.list.useQuery();

  const upsertMutation = trpc.chainsawModule.chains.upsertStock.useMutation({ onSuccess: () => { refetch(); setStockDialog(null); toast.success('Estoque atualizado!'); } });
  const eventMutation = trpc.chainsawModule.chains.registerEvent.useMutation({ onSuccess: () => { refetch(); setEventDialog(null); toast.success('Movimentação registrada!'); } });

  const [stockDialog, setStockDialog] = useState<any>(null);
  const [eventDialog, setEventDialog] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ chainType: "", sharpenedInBox: 0, inField: 0, inWorkshop: 0, totalStock: 0 });
  const [eventForm, setEventForm] = useState({ chainType: "", eventType: "envio_campo" as any, quantity: 1, chainsawId: "", notes: "" });

  const EVENT_LABELS: Record<string, string> = {
    envio_campo: "Envio para campo",
    retorno_oficina: "Retorno para oficina",
    afiacao_concluida: "Afiação concluída",
    baixa_estoque: "Baixa (descarte/substituição)",
    entrada_estoque: "Entrada (compra)",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1a3a2a]">Controle de Correntes</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEventForm({ chainType: stocks[0]?.chainType || "30", eventType: "envio_campo", quantity: 1, chainsawId: "", notes: "" }); setEventDialog(true); }} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Registrar Movimentação
          </Button>
          <Button onClick={() => { setStockForm({ chainType: "", sharpenedInBox: 0, inField: 0, inWorkshop: 0, totalStock: 0 }); setStockDialog(true); }} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-2">
            <Plus className="w-4 h-4" /> Novo Tipo
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {stocks.length === 0 && (
          <Card><CardContent className="py-8 text-center text-slate-500">Nenhum tipo de corrente cadastrado. Clique em "Novo Tipo" para inicializar.</CardContent></Card>
        )}
        {stocks.map((s: any) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Corrente {s.chainType} dentes</span>
                <Button size="sm" variant="outline" onClick={() => { setStockForm({ chainType: s.chainType, sharpenedInBox: s.sharpenedInBox, inField: s.inField, inWorkshop: s.inWorkshop, totalStock: s.totalStock }); setStockDialog(true); }}>
                  <Edit className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{s.sharpenedInBox}</p>
                  <p className="text-xs text-green-600 mt-1">Afiadas na Caixa</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-700">{s.inField}</p>
                  <p className="text-xs text-orange-600 mt-1">Em Campo</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{s.inWorkshop}</p>
                  <p className="text-xs text-blue-600 mt-1">Na Oficina</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{s.totalStock}</p>
                  <p className="text-xs text-slate-600 mt-1">Total em Estoque</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histórico de movimentações */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Histórico de Movimentações</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {events.slice(0, 20).map((e: any) => (
                <div key={e.id} className="px-4 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{EVENT_LABELS[e.eventType]}</span>
                    <span className="text-slate-500 ml-2">Corrente {e.chainType} dentes</span>
                    <span className="text-slate-500 ml-2">× {e.quantity}</span>
                    {e.notes && <span className="text-slate-400 ml-2 text-xs italic">{e.notes}</span>}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(e.eventDate).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Novo Tipo / Editar Estoque */}
      <Dialog open={!!stockDialog} onOpenChange={(o) => { if (!o) setStockDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{stockForm.chainType && stocks.find((s: any) => s.chainType === stockForm.chainType) ? "Editar Estoque" : "Novo Tipo de Corrente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo (dentes) *</Label><Input value={stockForm.chainType} onChange={e => setStockForm(f => ({ ...f, chainType: e.target.value }))} placeholder="Ex: 30" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Afiadas na Caixa</Label><Input type="number" value={stockForm.sharpenedInBox} onChange={e => setStockForm(f => ({ ...f, sharpenedInBox: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Em Campo</Label><Input type="number" value={stockForm.inField} onChange={e => setStockForm(f => ({ ...f, inField: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Na Oficina</Label><Input type="number" value={stockForm.inWorkshop} onChange={e => setStockForm(f => ({ ...f, inWorkshop: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Total em Estoque</Label><Input type="number" value={stockForm.totalStock} onChange={e => setStockForm(f => ({ ...f, totalStock: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(null)}>Cancelar</Button>
            <Button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white" onClick={() => {
              if (!stockForm.chainType) return toast.error('Tipo obrigatório');
              upsertMutation.mutate(stockForm);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Movimentação */}
      <Dialog open={!!eventDialog} onOpenChange={(o) => { if (!o) setEventDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Movimentação de Correntes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo de Corrente *</Label>
              <Select value={eventForm.chainType} onValueChange={v => setEventForm(f => ({ ...f, chainType: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>{stocks.map((s: any) => <SelectItem key={s.chainType} value={s.chainType}>{s.chainType} dentes</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo de Movimentação *</Label>
              <Select value={eventForm.eventType} onValueChange={v => setEventForm(f => ({ ...f, eventType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="envio_campo">Envio para campo (caixa → campo)</SelectItem>
                  <SelectItem value="retorno_oficina">Retorno para oficina (campo → oficina)</SelectItem>
                  <SelectItem value="afiacao_concluida">Afiação concluída (oficina → caixa)</SelectItem>
                  <SelectItem value="entrada_estoque">Entrada em estoque (compra)</SelectItem>
                  <SelectItem value="baixa_estoque">Baixa em estoque (descarte)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade *</Label><Input type="number" min={1} value={eventForm.quantity} onChange={e => setEventForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} /></div>
            {(eventForm.eventType === "envio_campo" || eventForm.eventType === "retorno_oficina") && (
              <div><Label>Motosserra</Label>
                <Select value={eventForm.chainsawId} onValueChange={v => setEventForm(f => ({ ...f, chainsawId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>{chainsawList.map((cs: any) => <SelectItem key={cs.id} value={String(cs.id)}>{cs.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Observações para o mecânico</Label><Textarea value={eventForm.notes} onChange={e => setEventForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex: corrente precisa baixar as guias" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialog(null)}>Cancelar</Button>
            <Button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white" onClick={() => {
              if (!eventForm.chainType) return toast.error('Selecione o tipo de corrente');
              eventMutation.mutate({ ...eventForm, chainsawId: eventForm.chainsawId ? parseInt(eventForm.chainsawId) : undefined });
            }}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABA PEÇAS E ESTOQUE
// ─────────────────────────────────────────────
function PartsTab() {
  const { data: parts = [], refetch } = trpc.chainsawModule.parts.list.useQuery();
  const createMutation = trpc.chainsawModule.parts.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success('Peça cadastrada!'); } });
  const updateMutation = trpc.chainsawModule.parts.update.useMutation({ onSuccess: () => { refetch(); setEditItem(null); toast.success('Atualizado!'); } });
  const deleteMutation = trpc.chainsawModule.parts.delete.useMutation({ onSuccess: () => { refetch(); toast.success('Removida!'); } });
  const entryMutation = trpc.chainsawModule.parts.stockEntry.useMutation({ onSuccess: () => { refetch(); setEntryDialog(null); toast.success('Entrada registrada!'); } });
  const { openFilePicker } = useFilePicker();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [entryDialog, setEntryDialog] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", category: "", unit: "un", currentStock: "0", minStock: "0", unitCost: "", notes: "" });
  const [entryForm, setEntryForm] = useState({ quantity: "", unitCost: "", notes: "" });
  const [partPhotoPreview, setPartPhotoPreview] = useState<string | null>(null);
  const [partPhotoBase64, setPartPhotoBase64] = useState<string | null>(null);

  function handlePartPhotoChange(files: FileList) {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setPartPhotoPreview(b64);
      setPartPhotoBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  const CATEGORIES = ["Corrente", "Sabre", "Filtro", "Vela", "Óleo", "Carburador", "Embreagem", "Outros"];

  // Agrupar por categoria
  const grouped = parts.reduce((acc: any, p: any) => {
    const cat = p.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1a3a2a]">Peças e Estoque</h2>
        <Button onClick={() => { setForm({ code: "", name: "", category: "", unit: "un", currentStock: "0", minStock: "0", unitCost: "", notes: "" }); setShowCreate(true); }} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-2">
          <Plus className="w-4 h-4" /> Nova Peça
        </Button>
      </div>

      {parts.length === 0 && (
        <Card><CardContent className="py-8 text-center text-slate-500">Nenhuma peça cadastrada.</CardContent></Card>
      )}

      {Object.entries(grouped).map(([cat, catParts]: [string, any]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat}</h3>
          <div className="space-y-2">
            {catParts.map((p: any) => {
              const isLow = parseFloat(p.currentStock) <= parseFloat(p.minStock || "0") && parseFloat(p.minStock || "0") > 0;
              return (
                <Card key={p.id} className={isLow ? "border-red-300 bg-red-50" : ""}>
                  <CardContent className="py-2 px-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border flex-shrink-0" onClick={() => window.open(p.imageUrl, '_blank')} style={{cursor:'pointer'}} />
                        )}
                        <div>
                          <p className="font-medium text-[#1a3a2a]">{p.name} {p.code && <span className="text-xs text-slate-400">({p.code})</span>}</p>
                          <p className="text-sm text-slate-500">
                            Estoque: <strong className={isLow ? "text-red-600" : "text-green-700"}>{p.currentStock} {p.unit}</strong>
                            {p.minStock && parseFloat(p.minStock) > 0 && <span className="text-slate-400 ml-2">· Mínimo: {p.minStock}</span>}
                            {p.unitCost && <span className="text-slate-400 ml-2">· R$ {p.unitCost}/{p.unit}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isLow && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />Estoque baixo</Badge>}
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setEntryDialog(p); setEntryForm({ quantity: "", unitCost: "", notes: "" }); }}>
                          <TrendingUp className="w-3 h-3 mr-1" /> Entrada
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditItem(p); setForm({ code: p.code || "", name: p.name, category: p.category || "", unit: p.unit || "un", currentStock: p.currentStock || "0", minStock: p.minStock || "0", unitCost: p.unitCost || "", notes: p.notes || "" }); }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => { if (confirm("Remover peça?")) deleteMutation.mutate({ id: p.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Dialog Criar/Editar */}
      <Dialog open={showCreate || !!editItem} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Peça" : "Nova Peça/Consumível"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: CORR-30" /></div>
              <div><Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Óleo 2T Stihl 100ml" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Estoque Atual</Label><Input type="number" step="0.01" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} /></div>
              <div><Label>Estoque Mínimo</Label><Input type="number" step="0.01" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></div>
            </div>
            <div><Label>Custo unitário (R$)</Label><Input type="number" step="0.01" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Foto da Peça (opcional)</Label>
              <div className="mt-1 flex items-center gap-3">
                {(partPhotoPreview || editItem?.imageUrl) && (
                  <img src={partPhotoPreview || editItem?.imageUrl} alt="Foto" className="w-20 h-20 object-cover rounded-lg border" onClick={() => window.open(partPhotoPreview || editItem?.imageUrl, '_blank')} style={{cursor:'pointer'}} />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => openFilePicker({ accept: "image/*" }, handlePartPhotoChange)}>
                  📷 {partPhotoPreview || editItem?.imageUrl ? "Trocar Foto" : "Adicionar Foto"}
                </Button>
                {(partPhotoPreview || editItem?.imageUrl) && (
                  <Button type="button" variant="outline" size="sm" className="text-red-500" onClick={() => { setPartPhotoPreview(null); setPartPhotoBase64(null); if (editItem) setEditItem((e: any) => ({ ...e, imageUrl: null })); }}>✕</Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); setPartPhotoPreview(null); setPartPhotoBase64(null); }}>Cancelar</Button>
            <Button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white" disabled={createMutation.isPending || updateMutation.isPending} onClick={() => {
              if (!form.name) return toast.error('Nome obrigatório');
              const imageUrl = partPhotoBase64 || (editItem?.imageUrl ?? undefined);
              if (editItem) updateMutation.mutate({ id: editItem.id, ...form, imageUrl });
              else createMutation.mutate({ ...form, imageUrl });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Entrada de Estoque */}
      <Dialog open={!!entryDialog} onOpenChange={(o) => { if (!o) setEntryDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Entrada de Estoque — {entryDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Quantidade *</Label><Input type="number" step="0.01" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} placeholder={`Em ${entryDialog?.unit}`} /></div>
            <div><Label>Custo unitário (R$)</Label><Input type="number" step="0.01" value={entryForm.unitCost} onChange={e => setEntryForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialog(null)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
              if (!entryForm.quantity) return toast.error('Quantidade obrigatória');
              entryMutation.mutate({ partId: entryDialog.id, ...entryForm });
            }}>Registrar Entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABA ORDENS DE SERVIÇO
// ─────────────────────────────────────────────
function ServiceOrdersTab() {
  const [statusFilter, setStatusFilter] = useState<"todas" | "aberta" | "em_andamento" | "concluida" | "cancelada">("todas");
  const { data: orders = [], refetch } = trpc.chainsawModule.os.list.useQuery({ status: statusFilter });
  const { data: parts = [] } = trpc.chainsawModule.parts.list.useQuery();

  const startMutation = trpc.chainsawModule.os.startService.useMutation({ onSuccess: () => { refetch(); toast.success('OS em andamento!'); } });
  const completeMutation = trpc.chainsawModule.os.complete.useMutation({ onSuccess: () => { refetch(); setCompleteDialog(null); toast.success('OS concluída!'); } });
  const cancelMutation = trpc.chainsawModule.os.cancel.useMutation({ onSuccess: () => { refetch(); toast.success('OS cancelada.'); } });

  const [completeDialog, setCompleteDialog] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({ serviceDescription: "", parts: [] as any[] });
  const [newPart, setNewPart] = useState({ partId: "", partName: "", quantity: "1", unit: "un", unitCost: "", fromStock: 1 });

  function addPart() {
    if (!newPart.partName) return;
    setCompleteForm(f => ({ ...f, parts: [...f.parts, { ...newPart, partId: newPart.partId ? parseInt(newPart.partId) : undefined }] }));
    setNewPart({ partId: "", partName: "", quantity: "1", unit: "un", unitCost: "", fromStock: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-[#1a3a2a]">Ordens de Serviço</h2>
        <div className="flex gap-1 flex-wrap">
          {(["todas", "aberta", "em_andamento", "concluida", "cancelada"] as const).map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
              className={statusFilter === s ? "bg-[#2d6a4f] text-white" : ""}
              onClick={() => setStatusFilter(s)}>
              {s === "todas" ? "Todas" : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {orders.length === 0 && (
          <Card><CardContent className="py-8 text-center text-slate-500">Nenhuma OS encontrada.</CardContent></Card>
        )}
        {orders.map((o: any) => (
          <Card key={o.id} className={`border-l-4 ${o.status === "aberta" ? "border-blue-400" : o.status === "em_andamento" ? "border-yellow-400" : o.status === "concluida" ? "border-green-400" : "border-slate-300"}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1a3a2a]">OS #{o.id}</span>
                    <Badge className={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                    <Badge className={PRIORITY_COLORS[o.priority]}>{o.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{o.chainsawName || `Motosserra #${o.chainsawId}`}</p>
                  <p className="text-sm text-slate-600">{PROBLEM_LABELS[o.problemType]}</p>
                  {o.problemDescription && <p className="text-xs text-slate-500 mt-1 italic">"{o.problemDescription}"</p>}
                  {o.serviceDescription && <p className="text-xs text-green-700 mt-1"><strong>Serviço realizado:</strong> {o.serviceDescription}</p>}
                  <p className="text-xs text-slate-400 mt-1">Aberta em {new Date(o.openedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {o.status === "aberta" && (
                    <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => startMutation.mutate({ id: o.id })}>
                      <Wrench className="w-3 h-3 mr-1" /> Iniciar
                    </Button>
                  )}
                  {(o.status === "aberta" || o.status === "em_andamento") && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setCompleteDialog(o); setCompleteForm({ serviceDescription: "", parts: [] }); }}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => { if (confirm("Cancelar OS?")) cancelMutation.mutate({ id: o.id }); }}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Concluir OS */}
      <Dialog open={!!completeDialog} onOpenChange={(o) => { if (!o) setCompleteDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Concluir OS #{completeDialog?.id} — {completeDialog?.chainsawName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição do Serviço Realizado *</Label>
              <Textarea value={completeForm.serviceDescription} onChange={e => setCompleteForm(f => ({ ...f, serviceDescription: e.target.value }))} rows={3} placeholder="Descreva o que foi feito..." />
            </div>

            {/* Peças usadas */}
            <div>
              <Label className="text-base font-semibold">Peças Utilizadas</Label>
              {completeForm.parts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {completeForm.parts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5 text-sm">
                      <span>{p.partName} × {p.quantity} {p.unit}</span>
                      <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={() => setCompleteForm(f => ({ ...f, parts: f.parts.filter((_, j) => j !== i) }))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 border rounded p-3 space-y-2">
                <p className="text-sm font-medium text-slate-600">Adicionar peça</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Peça do estoque</Label>
                    <Select value={newPart.partId} onValueChange={v => {
                      const p = parts.find((p: any) => String(p.id) === v);
                      setNewPart(f => ({ ...f, partId: v, partName: p?.name || f.partName, unit: p?.unit || f.unit, unitCost: p?.unitCost || f.unitCost }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                      <SelectContent>{parts.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.currentStock} {p.unit})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Nome da peça *</Label><Input value={newPart.partName} onChange={e => setNewPart(f => ({ ...f, partName: e.target.value }))} placeholder="Nome" /></div>
                  <div><Label className="text-xs">Quantidade</Label><Input type="number" step="0.01" value={newPart.quantity} onChange={e => setNewPart(f => ({ ...f, quantity: e.target.value }))} /></div>
                  <div><Label className="text-xs">Unidade</Label><Input value={newPart.unit} onChange={e => setNewPart(f => ({ ...f, unit: e.target.value }))} /></div>
                </div>
                <Button size="sm" variant="outline" onClick={addPart} className="w-full gap-2"><Plus className="w-3 h-3" /> Adicionar Peça</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
              if (!completeForm.serviceDescription) return toast.error('Descreva o serviço realizado');
              completeMutation.mutate({ id: completeDialog.id, serviceDescription: completeForm.serviceDescription, parts: completeForm.parts });
            }}>Concluir OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function ChainsawModule() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a3a2a]">Controle de Motosserras</h1>
        <p className="text-slate-500 text-sm mt-1">Gestão completa: motores, combustível, correntes, peças e ordens de serviço</p>
      </div>

      <Tabs defaultValue="chainsaws">
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="chainsaws" className="gap-1 text-xs md:text-sm"><Wrench className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Motosserras</span></TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1 text-xs md:text-sm"><Fuel className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Combustível</span></TabsTrigger>
          <TabsTrigger value="chains" className="gap-1 text-xs md:text-sm"><Link2 className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Correntes</span></TabsTrigger>
          <TabsTrigger value="parts" className="gap-1 text-xs md:text-sm"><Package className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Peças</span></TabsTrigger>
          <TabsTrigger value="os" className="gap-1 text-xs md:text-sm"><ClipboardList className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">OS</span></TabsTrigger>
        </TabsList>

        <TabsContent value="chainsaws"><ChainsawsTab /></TabsContent>
        <TabsContent value="fuel"><FuelTab /></TabsContent>
        <TabsContent value="chains"><ChainsTab /></TabsContent>
        <TabsContent value="parts"><PartsTab /></TabsContent>
        <TabsContent value="os"><ServiceOrdersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
