import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, FileText, Upload, Package, Weight, CheckCircle2,
  Clock, Trash2, Unlock, Eye, RefreshCw, Search
} from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatQty(qty: string, type: string) {
  const n = parseFloat(qty);
  if (isNaN(n)) return qty;
  return type === "m3" ? `${n} m³` : `${n} ton`;
}

function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

type FiscalNote = {
  id: number;
  actionCode: string;
  invoiceNumber: string | null;
  issueDate: string;
  quantityType: "m3" | "ton";
  quantity: string;
  fileUrl: string | null;
  status: "available" | "used";
  usedByClientName: string | null;
  usedAt: string | null;
  notes: string | null;
};

function NoteCard({ note, onRelease, onDelete }: {
  note: FiscalNote;
  onRelease: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const isUsed = note.status === "used";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isUsed ? "bg-muted/40 border-muted" : "bg-card border-border"} transition-all`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${note.quantityType === "m3" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
        {note.quantityType === "m3" ? <Package className="w-5 h-5" /> : <Weight className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-sm">{note.actionCode}</span>
          {note.invoiceNumber && (
            <span className="text-xs text-muted-foreground">NF {note.invoiceNumber}</span>
          )}
          <Badge variant={isUsed ? "secondary" : "default"} className={`text-xs ${!isUsed ? "bg-green-100 text-green-700 border-green-200" : ""}`}>
            {isUsed ? "Utilizada" : "Disponível"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
          <span>{formatDate(note.issueDate)}</span>
          <span className="font-medium text-foreground">{formatQty(note.quantity, note.quantityType)}</span>
          {isUsed && note.usedByClientName && (
            <span className="text-orange-600">→ {note.usedByClientName}</span>
          )}
          {note.notes && <span className="italic truncate max-w-[200px]">{note.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {note.fileUrl && (
          <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver arquivo">
              <Eye className="w-4 h-4" />
            </Button>
          </a>
        )}
        {isUsed && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700" title="Liberar nota" onClick={() => onRelease(note.id)}>
            <Unlock className="w-4 h-4" />
          </Button>
        )}
        {!isUsed && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" title="Excluir" onClick={() => onDelete(note.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FiscalNotesPage() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "m3" | "ton">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    invoiceNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    quantityType: "m3" as "m3" | "ton",
    quantity: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: notes = [], isLoading } = trpc.fiscalNotes.list.useQuery({ quantityType: tab === "all" ? "all" : tab });
  const { data: stats } = trpc.fiscalNotes.stats.useQuery();

  const createMutation = trpc.fiscalNotes.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Ação ${data.actionCode} criada com sucesso!`);
      utils.fiscalNotes.list.invalidate();
      utils.fiscalNotes.stats.invalidate();
      utils.fiscalNotes.getAvailable.invalidate();
      setOpen(false);
      setForm({ invoiceNumber: "", issueDate: new Date().toISOString().split("T")[0], quantityType: "m3", quantity: "", notes: "" });
      setSelectedFile(null);
    },
    onError: (e) => toast.error("Erro ao criar: " + e.message),
  });

  const releaseMutation = trpc.fiscalNotes.release.useMutation({
    onSuccess: () => {
      toast.success("Nota liberada!");
      utils.fiscalNotes.list.invalidate();
      utils.fiscalNotes.stats.invalidate();
      utils.fiscalNotes.getAvailable.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const deleteMutation = trpc.fiscalNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Nota excluída!");
      utils.fiscalNotes.list.invalidate();
      utils.fiscalNotes.stats.invalidate();
      utils.fiscalNotes.getAvailable.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.quantity || !form.issueDate) {
      toast.error("Preencha a data de emissão e a quantidade.");
      return;
    }
    let fileBase64: string | undefined;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;
    if (selectedFile) {
      fileBase64 = await fileToBase64(selectedFile);
      fileName = selectedFile.name;
      fileMimeType = selectedFile.type;
    }
    createMutation.mutate({ ...form, fileBase64, fileName, fileMimeType });
  }

  const filtered = (notes as FiscalNote[]).filter(n => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      n.actionCode.toLowerCase().includes(s) ||
      (n.invoiceNumber || "").toLowerCase().includes(s) ||
      (n.usedByClientName || "").toLowerCase().includes(s) ||
      (n.notes || "").toLowerCase().includes(s)
    );
  });

  const m3Notes = filtered.filter(n => n.quantityType === "m3");
  const tonNotes = filtered.filter(n => n.quantityType === "ton");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Controle de Notas
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Banco de ações e notas fiscais geradas pela BTREE
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Ação / Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nova Ação / Nota</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Quantidade *</Label>
                  <Select value={form.quantityType} onValueChange={v => setForm(f => ({ ...f, quantityType: v as "m3" | "ton" }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m3">Metro Cúbico (m³)</SelectItem>
                      <SelectItem value="ton">Toneladas (ton)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input
                    className="mt-1"
                    placeholder={form.quantityType === "m3" ? "ex: 30" : "ex: 40"}
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Emissão *</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={form.issueDate}
                    onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Número da NF (opcional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="ex: 402"
                    value={form.invoiceNumber}
                    onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Upload da Nota (PDF/Imagem)</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedFile.name}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      Clique para selecionar arquivo
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  className="mt-1 resize-none"
                  rows={2}
                  placeholder="Observações sobre esta nota..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="col-span-1">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-green-200">
          <CardContent className="p-3">
            <div className="text-xs text-green-600">Disponíveis</div>
            <div className="text-2xl font-bold text-green-600">{stats?.available ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-gray-200">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Utilizadas</div>
            <div className="text-2xl font-bold text-muted-foreground">{stats?.used ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-blue-200">
          <CardContent className="p-3">
            <div className="text-xs text-blue-600">m³ Disp.</div>
            <div className="text-2xl font-bold text-blue-600">{stats?.m3Available ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-orange-200">
          <CardContent className="p-3">
            <div className="text-xs text-orange-600">ton Disp.</div>
            <div className="text-2xl font-bold text-orange-600">{stats?.tonAvailable ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código, NF, cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas ({filtered.length})</TabsTrigger>
          <TabsTrigger value="m3">
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Metro Cúbico ({m3Notes.length})
          </TabsTrigger>
          <TabsTrigger value="ton">
            <Weight className="w-3.5 h-3.5 mr-1.5" />
            Toneladas ({tonNotes.length})
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Carregando...
          </div>
        ) : (
          <>
            <TabsContent value="all">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma nota encontrada.</p>
                  <p className="text-sm mt-1">Clique em "Nova Ação / Nota" para registrar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Disponíveis primeiro */}
                  {filtered.filter(n => n.status === "available").length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Disponíveis</span>
                      </div>
                      <div className="space-y-2">
                        {filtered.filter(n => n.status === "available").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Utilizadas */}
                  {filtered.filter(n => n.status === "used").length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Utilizadas</span>
                      </div>
                      <div className="space-y-2">
                        {filtered.filter(n => n.status === "used").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="m3">
              {m3Notes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma nota de metro cúbico.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {m3Notes.filter(n => n.status === "available").length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Disponíveis</span>
                      </div>
                      <div className="space-y-2">
                        {m3Notes.filter(n => n.status === "available").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                  {m3Notes.filter(n => n.status === "used").length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Utilizadas</span>
                      </div>
                      <div className="space-y-2">
                        {m3Notes.filter(n => n.status === "used").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ton">
              {tonNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Weight className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma nota de toneladas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tonNotes.filter(n => n.status === "available").length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Disponíveis</span>
                      </div>
                      <div className="space-y-2">
                        {tonNotes.filter(n => n.status === "available").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                  {tonNotes.filter(n => n.status === "used").length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Utilizadas</span>
                      </div>
                      <div className="space-y-2">
                        {tonNotes.filter(n => n.status === "used").map(n => (
                          <NoteCard key={n.id} note={n} onRelease={id => releaseMutation.mutate({ id })} onDelete={id => deleteMutation.mutate({ id })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
