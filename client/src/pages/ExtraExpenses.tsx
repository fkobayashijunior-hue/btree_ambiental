import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Camera, X, Receipt, Filter, TrendingDown, MapPin } from "lucide-react";
import WorkLocationSelect from "@/components/WorkLocationSelect";
import { useFilePicker } from "@/hooks/useFilePicker";

const CATEGORIES = [
  { value: "abastecimento", label: "Abastecimento", color: "bg-blue-100 text-blue-700" },
  { value: "refeicao", label: "Refeição", color: "bg-orange-100 text-orange-700" },
  { value: "compra_material", label: "Compra de Material", color: "bg-purple-100 text-purple-700" },
  { value: "servico_terceiro", label: "Serviço de Terceiro", color: "bg-yellow-100 text-yellow-700" },
  { value: "pedagio", label: "Pedágio", color: "bg-gray-100 text-gray-700" },
  { value: "outro", label: "Outro", color: "bg-red-100 text-red-700" },
];

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

const CLOUDINARY_CLOUD_NAME = "djob7pxme";
const CLOUDINARY_UPLOAD_PRESET = "azaconnect";

function getCategoryInfo(value: string) {
  return CATEGORIES.find(c => c.value === value) || { label: value, color: "bg-gray-100 text-gray-700" };
}

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ExtraExpenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "" as any,
    description: "",
    amount: "",
    paymentMethod: "dinheiro" as any,
    receiptImageUrl: "",
    notes: "",
    workLocationId: "",
  });

  const { openFilePicker } = useFilePicker();

  const queryInput = {
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    category: filterCategory !== "all" ? filterCategory : undefined,
  };

  const { data: expenses = [], refetch } = trpc.extraExpenses.list.useQuery(queryInput);
  const createMutation = trpc.extraExpenses.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto registrado com sucesso!");
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.extraExpenses.delete.useMutation({
    onSuccess: () => { toast.success("Gasto removido."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      date: new Date().toISOString().split("T")[0],
      category: "" as any,
      description: "",
      amount: "",
      paymentMethod: "dinheiro" as any,
      receiptImageUrl: "",
      notes: "",
      workLocationId: "",
    });
  }

  async function handlePhotoUpload() {
    openFilePicker(
      { accept: "image/*,application/pdf" },
      async (files: FileList) => {
        const file = files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Arquivo muito grande. Máximo 10MB.");
          return;
        }
        setUploadingPhoto(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.secure_url) {
            setForm(f => ({ ...f, receiptImageUrl: data.secure_url }));
            toast.success("Foto da nota enviada!");
          } else {
            toast.error("Erro ao enviar foto.");
          }
        } catch {
          toast.error("Erro ao enviar foto.");
        } finally {
          setUploadingPhoto(false);
        }
      }
    );
  }

  function handleSubmit() {
    if (!form.category) return toast.error("Selecione uma categoria.");
    if (!form.description.trim()) return toast.error("Informe uma descrição.");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("Informe o valor.");
    createMutation.mutate({
      ...form,
      workLocationId: form.workLocationId ? parseInt(form.workLocationId) : undefined,
    });
  }

  // Totais
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const totalByCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + parseFloat(e.amount || "0"), 0),
  })).filter(c => c.total > 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-500" />
            Gastos Extras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de despesas avulsas com foto da nota</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Gasto
        </Button>
      </div>

      {/* Resumo */}
      {isAdmin && expenses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="col-span-2 md:col-span-1 bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-orange-600 font-medium">Total no Período</span>
              </div>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(total.toString())}</p>
            </CardContent>
          </Card>
          {totalByCategory.slice(0, 3).map(cat => (
            <Card key={cat.value} className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{cat.label}</p>
                <p className="text-lg font-bold">{formatCurrency(cat.total.toString())}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtros:</span>
        </div>
        <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
          className="w-36 h-8 text-sm" placeholder="De" />
        <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
          className="w-36 h-8 text-sm" placeholder="Até" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterDateFrom || filterDateTo || filterCategory !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterCategory("all"); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Lista */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum gasto registrado</p>
          <p className="text-sm">Clique em "Novo Gasto" para registrar uma despesa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(expense => {
            const catInfo = getCategoryInfo(expense.category);
            return (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Mobile-first: stack vertically */}
                  <div className="flex flex-col gap-2">
                    {/* Top row: badge + date + payment */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${catInfo.color} border-0`}>{catInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">• {expense.paymentMethod}</span>
                    </div>

                    {/* Description + amount row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug">{expense.description}</p>
                        {expense.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{expense.notes}</p>}
                      </div>
                      {isAdmin && (
                        <p className="text-base font-bold text-orange-600 shrink-0 whitespace-nowrap">{formatCurrency(expense.amount)}</p>
                      )}
                    </div>

                    {/* Footer: author + location + photo + delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Por: {expense.registeredByName || "—"}</p>
                        {expense.locationName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{expense.locationName}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {expense.receiptImageUrl && (
                          <a href={expense.receiptImageUrl} target="_blank" rel="noopener noreferrer"
                            className="w-10 h-10 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                            <img src={expense.receiptImageUrl} alt="Nota" className="w-full h-full object-cover" />
                          </a>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { if (confirm("Remover este gasto?")) deleteMutation.mutate({ id: expense.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de novo gasto */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Gasto Extra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Almoço equipe campo, Parafusos 6mm..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Foto da Nota Fiscal (opcional)</Label>
              {form.receiptImageUrl ? (
                <div className="mt-2 relative inline-block">
                  <img src={form.receiptImageUrl} alt="Nota" className="w-32 h-32 object-cover rounded-lg border" />
                  <button onClick={() => setForm(f => ({ ...f, receiptImageUrl: "" }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" className="mt-1 w-full" onClick={handlePhotoUpload} disabled={uploadingPhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? "Enviando..." : "Adicionar Foto / PDF"}
                </Button>
              )}
            </div>

            <WorkLocationSelect
              value={form.workLocationId}
              onChange={(id) => setForm(f => ({ ...f, workLocationId: id }))}
            />

            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." rows={2}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar Gasto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
