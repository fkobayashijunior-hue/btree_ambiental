// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, UserCheck, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Contractor {
  id: number;
  name: string;
  ratePerM3: string;
  phone: string | null;
  notes: string | null;
  isActive: number;
}

export default function ThirdPartyContractorsPage() {
  const utils = trpc.useUtils();

  const { data: contractors = [], isLoading } = trpc.thirdPartyContractors.list.useQuery();

  const createMutation = trpc.thirdPartyContractors.create.useMutation({
    onSuccess: () => {
      utils.thirdPartyContractors.list.invalidate();
      utils.thirdPartyContractors.listActive.invalidate();
      toast.success("Terceirizado cadastrado com sucesso!");
      setShowForm(false);
      resetForm();
    },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });

  const updateMutation = trpc.thirdPartyContractors.update.useMutation({
    onSuccess: () => {
      utils.thirdPartyContractors.list.invalidate();
      utils.thirdPartyContractors.listActive.invalidate();
      toast.success("Terceirizado atualizado com sucesso!");
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteMutation = trpc.thirdPartyContractors.delete.useMutation({
    onSuccess: () => {
      utils.thirdPartyContractors.list.invalidate();
      utils.thirdPartyContractors.listActive.invalidate();
      toast.success("Terceirizado removido.");
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", ratePerM3: "", phone: "", notes: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function resetForm() {
    setForm({ name: "", ratePerM3: "", phone: "", notes: "" });
  }

  function openEdit(c: Contractor) {
    setEditingId(c.id);
    setForm({ name: c.name, ratePerM3: c.ratePerM3, phone: c.phone || "", notes: c.notes || "" });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terceirizados de Corte</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cadastre os terceirizados e defina o valor por m³ de lenha cortada
            </p>
          </div>
          <Button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Terceirizado
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : contractors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum terceirizado cadastrado ainda.</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                Cadastrar primeiro terceirizado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contractors.map((c) => (
              <Card key={c.id} className={c.isActive ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        {!c.isActive && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-emerald-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {parseFloat(c.ratePerM3 || "0").toFixed(2)} / m³</span>
                      </div>
                      {c.phone && (
                        <p className="text-sm text-muted-foreground mt-1">📞 {c.phone}</p>
                      )}
                      {c.notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">{c.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c as Contractor)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingId(null); resetForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Terceirizado" : "Novo Terceirizado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Serginho"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Valor por m³ (R$) *</Label>
                <Input
                  placeholder="Ex: 38,00"
                  value={form.ratePerM3}
                  onChange={(e) => setForm(f => ({ ...f, ratePerM3: e.target.value }))}
                  type="number"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor que será pago por metro cúbico de lenha cortada
                </p>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  placeholder="(44) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  placeholder="Informações adicionais..."
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Tem certeza que deseja remover este terceirizado? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => { if (deleteConfirm) { deleteMutation.mutate({ id: deleteConfirm }); setDeleteConfirm(null); } }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
