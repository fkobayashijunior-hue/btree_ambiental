import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Fuel, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export default function FuelSuppliersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(getEmptyForm());

  const { data: suppliers = [], refetch } = trpc.fuelSuppliers.list.useQuery();
  const createMut = trpc.fuelSuppliers.create.useMutation({
    onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Fornecedor cadastrado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.fuelSuppliers.update.useMutation({
    onSuccess: () => { refetch(); setFormOpen(false); resetForm(); toast.success("Fornecedor atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.fuelSuppliers.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Fornecedor removido!"); },
    onError: (e) => toast.error(e.message),
  });

  function getEmptyForm() {
    return { name: "", fuelType: "diesel" as const, pricePerLiter: "", location: "", notes: "" };
  }
  function resetForm() { setForm(getEmptyForm()); setEditId(null); }

  function openEdit(s: any) {
    setForm({
      name: s.name || "",
      fuelType: s.fuelType || "diesel",
      pricePerLiter: s.pricePerLiter || "",
      location: s.location || "",
      notes: s.notes || "",
    });
    setEditId(s.id);
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !form.pricePerLiter) {
      toast.error("Nome e preço/litro são obrigatórios");
      return;
    }
    if (editId) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  function toggleActive(s: any) {
    updateMut.mutate({ id: s.id, isActive: s.isActive ? 0 : 1 });
  }

  const fuelTypeLabels: Record<string, string> = {
    diesel: "Diesel", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV"
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-green-700" />
            Fornecedores de Combustível
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre fornecedores e seus preços para preenchimento automático nos abastecimentos
          </p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-green-700 hover:bg-green-800">
          <Plus className="h-4 w-4 mr-1" /> Novo Fornecedor
        </Button>
      </div>

      {/* Lista de fornecedores */}
      <div className="grid gap-3">
        {suppliers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum fornecedor cadastrado. Clique em "Novo Fornecedor" para começar.
            </CardContent>
          </Card>
        )}
        {suppliers.map((s: any) => (
          <Card key={s.id} className={`${!s.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{s.name}</span>
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{fuelTypeLabels[s.fuelType] || s.fuelType}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-green-700 text-base">
                    R$ {parseFloat(s.pricePerLiter || "0").toFixed(2)}/L
                  </span>
                  {s.location && <span>📍 {s.location}</span>}
                  {s.notes && <span>📝 {s.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(s)} title={s.isActive ? "Desativar" : "Ativar"}>
                  {s.isActive ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover fornecedor?")) deleteMut.mutate({ id: s.id }); }}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editId ? "Editar Fornecedor" : "Novo Fornecedor"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nome do Fornecedor *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Diesel SIMFLOR, Posto Shell..." />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Combustível</label>
              <Select value={form.fuelType} onValueChange={v => setForm({ ...form, fuelType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="etanol">Etanol</SelectItem>
                  <SelectItem value="gnv">GNV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Preço por Litro (R$) *</label>
              <Input type="number" step="0.01" value={form.pricePerLiter} onChange={e => setForm({ ...form, pricePerLiter: e.target.value })} placeholder="Ex: 5.89" />
            </div>
            <div>
              <label className="text-sm font-medium">Local / Endereço</label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex: Astorga, Fazenda SIMFLOR..." />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." />
            </div>
            <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Salvando..." : editId ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
