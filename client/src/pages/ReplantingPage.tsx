import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Leaf, Plus, Search, Calendar, MapPin, Trees, Image as ImageIcon, X, Eye } from "lucide-react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR");
}

export default function ReplantingPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    area: "",
    species: "Eucalipto",
    quantity: "",
    areaHectares: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: replantings, isLoading } = trpc.clientPortal.getPortalData.useQuery(
    { clientId: 0, email: "" },
    { enabled: false }
  );

  // Buscar replantios de todos os clientes via procedure admin
  const { data: allReplantings, isLoading: loadingReplantings } = trpc.clientPortal.listAllReplantings.useQuery();

  const addReplanting = trpc.clientPortal.addReplanting.useMutation({
    onSuccess: () => {
      toast.success("Replantio registrado com sucesso!");
      setOpen(false);
      resetForm();
      utils.clientPortal.listAllReplantings.invalidate();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setSaving(false),
  });

  function resetForm() {
    setForm({
      clientId: "",
      date: new Date().toISOString().split("T")[0],
      area: "",
      species: "Eucalipto",
      quantity: "",
      areaHectares: "",
      notes: "",
    });
    setPhotos([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) return toast.error("Selecione um cliente");
    if (!form.date) return toast.error("Informe a data");
    setSaving(true);
    addReplanting.mutate({
      clientId: parseInt(form.clientId),
      date: form.date,
      area: form.area || undefined,
      species: form.species || undefined,
      quantity: form.quantity ? parseInt(form.quantity) : undefined,
      areaHectares: form.areaHectares || undefined,
      notes: form.notes || undefined,
    });
  }

  const filtered = useMemo(() => {
    if (!allReplantings) return [];
    let list = [...allReplantings];
    if (clientFilter && clientFilter !== "all") {
      list = list.filter((r: any) => String(r.clientId) === clientFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r: any) =>
        r.area?.toLowerCase().includes(s) ||
        r.species?.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s) ||
        r.clientName?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [allReplantings, clientFilter, search]);

  return (
    <div className="space-y-4 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-bold text-gray-800">Replantios</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Novo Replantio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Registrar Replantio
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Espécie</Label>
                  <Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Eucalipto" />
                </div>
              </div>
              <div>
                <Label>Área / Local</Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: Fazenda Boa Vista - Talhão 3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Qtd. Mudas</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>Hectares</Label>
                  <Input value={form.areaHectares} onChange={(e) => setForm({ ...form, areaHectares: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre o replantio..." rows={3} />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={saving}>
                {saving ? "Salvando..." : "Registrar Replantio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por área, espécie, notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients?.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loadingReplantings ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Leaf className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum replantio encontrado</p>
            <p className="text-sm">Registre o primeiro replantio clicando no botão acima.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-green-700">
                      {r.clientName || `Cliente #${r.clientId}`}
                    </CardTitle>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(r.date)}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                    {r.species || "Eucalipto"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.area && (
                  <p className="text-sm flex items-center gap-1 text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {r.area}
                  </p>
                )}
                <div className="flex gap-4 text-sm">
                  {r.quantity && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Trees className="h-3.5 w-3.5 text-green-500" />
                      {r.quantity.toLocaleString("pt-BR")} mudas
                    </span>
                  )}
                  {r.areaHectares && (
                    <span className="text-gray-600">{r.areaHectares} ha</span>
                  )}
                </div>
                {r.notes && (
                  <p className="text-xs text-gray-500 line-clamp-2">{r.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
