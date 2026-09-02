// @ts-nocheck
import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Package, Weight, CheckCircle2,
  Clock, Trash2, Unlock, Eye, RefreshCw, Search, Pencil, ExternalLink,
  MapPin, Truck, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { useWorkLocations } from "@/hooks/useWorkLocations";

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

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

function fmtNum(n: number, decimals = 3) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

type ReportRow = {
  noteId: number;
  actionCode: string;
  noteInvoiceNumber: string | null;
  issueDate: string;
  quantityType: "m3" | "ton";
  noteQuantity: string;
  noteFileUrl: string | null;
  noteStatus: "available" | "used";
  noteNotes: string | null;
  usedAt: string | null;
  cargoId: number | null;
  cargoDate: string | null;
  cargoDeliveryDate: string | null;
  cargoInvoiceNumber: string | null;
  cargoInvoiceUrl: string | null;
  cargoVolumeM3: string | null;
  cargoWeightNetKg: string | null;
  cargoDestination: string | null;
  cargoVehiclePlate: string | null;
  cargoDriverName: string | null;
  cargoStatus: string | null;
  cargoWorkLocationId: number | null;
  workLocationName: string | null;
  destinationName: string | null;
  destinationNickname: string | null;
};

export default function FiscalNotesPage() {
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState<"all" | "m3" | "ton">("all");
  // Edição
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  // Visualização de arquivo
  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  const [viewFileTitle, setViewFileTitle] = useState("");

  const utils = trpc.useUtils();
  const { locations: workLocations } = useWorkLocations();
  const { data: rows = [], isLoading, refetch } = trpc.fiscalNotes.report.useQuery({
    workLocationId: filterLocation !== "all" ? Number(filterLocation) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
    limit: 500,
  });

  const updateMutation = trpc.fiscalNotes.update.useMutation({
    onSuccess: () => {
      toast.success("Ação atualizada com sucesso!");
      utils.fiscalNotes.report.invalidate();
      setEditingNote(null);
      setEditFile(null);
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });
  const releaseMutation = trpc.fiscalNotes.release.useMutation({
    onSuccess: () => {
      toast.success("Nota liberada!");
      utils.fiscalNotes.report.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deleteMutation = trpc.fiscalNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Nota excluída!");
      utils.fiscalNotes.report.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNote) return;
    let fileBase64: string | undefined;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;
    if (editFile) {
      fileBase64 = await fileToBase64(editFile);
      fileName = editFile.name;
      fileMimeType = editFile.type;
    }
    updateMutation.mutate({
      id: editingNote.noteId,
      invoiceNumber: editingNote.noteInvoiceNumber || undefined,
      issueDate: editingNote.issueDate,
      quantityType: editingNote.quantityType,
      quantity: editingNote.noteQuantity,
      notes: editingNote.noteNotes || undefined,
      fileBase64,
      fileName,
      fileMimeType,
    });
  }

  // Filtrar por tipo (m3/ton) — os demais filtros já vão ao backend
  const filtered = useMemo(() => {
    let list = rows as ReportRow[];
    if (filterType !== "all") list = list.filter(r => r.quantityType === filterType);
    return list;
  }, [rows, filterType]);

  // Totais: qtd da nota vs qtd real da carga, separados por tipo
  const totals = useMemo(() => {
    let m3Note = 0, m3Real = 0, tonNote = 0, tonReal = 0;
    for (const r of filtered) {
      const noteQty = parseFloat(String(r.noteQuantity).replace(",", ".")) || 0;
      const vol = parseFloat(String(r.cargoVolumeM3 || "0").replace(",", ".")) || 0;
      const pesoTon = (parseFloat(String(r.cargoWeightNetKg || "0").replace(",", ".")) || 0) / 1000;
      if (r.quantityType === "m3") {
        m3Note += noteQty;
        m3Real += vol;
      } else {
        tonNote += noteQty;
        tonReal += pesoTon;
      }
    }
    return { m3Note, m3Real, tonNote, tonReal, m3Diff: m3Real - m3Note, tonDiff: tonReal - tonNote };
  }, [filtered]);

  const realQtyOf = (r: ReportRow) => {
    if (r.quantityType === "m3") return parseFloat(String(r.cargoVolumeM3 || "0").replace(",", ".")) || 0;
    return (parseFloat(String(r.cargoWeightNetKg || "0").replace(",", ".")) || 0) / 1000;
  };
  const noteQtyOf = (r: ReportRow) => parseFloat(String(r.noteQuantity).replace(",", ".")) || 0;

  const destinoOf = (r: ReportRow) => r.destinationNickname || r.destinationName || r.cargoDestination || "—";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            Controle de Notas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Relatório de ações e notas geradas nas cargas — compare a quantidade da nota com o real da carga
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="col-span-2 md:col-span-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar ação, NF, destino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os locais</SelectItem>
            {(workLocations as any[]).map((l: any) => (
              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">m³ e toneladas</SelectItem>
            <SelectItem value="m3">Metro Cúbico (m³)</SelectItem>
            <SelectItem value="ton">Toneladas (ton)</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Data início" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Data fim" />
      </div>

      {/* Resumo de totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
            <Package className="w-3.5 h-3.5" /> Notas (m³)
          </div>
          <div className="text-xl font-bold text-blue-700 mt-1">{fmtNum(totals.m3Note)} m³</div>
          <div className="text-[11px] text-blue-600">Real das cargas: {fmtNum(totals.m3Real)} m³</div>
        </div>
        <div className={`border rounded-lg p-3 ${totals.m3Diff > 0.001 ? "bg-green-50 border-green-200" : totals.m3Diff < -0.001 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            {totals.m3Diff > 0.001 ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : totals.m3Diff < -0.001 ? <TrendingDown className="w-3.5 h-3.5 text-red-600" /> : <Minus className="w-3.5 h-3.5" />}
            Diferença (m³)
          </div>
          <div className={`text-xl font-bold mt-1 ${totals.m3Diff > 0.001 ? "text-green-700" : totals.m3Diff < -0.001 ? "text-red-700" : "text-gray-700"}`}>
            {totals.m3Diff > 0 ? "+" : ""}{fmtNum(totals.m3Diff)} m³
          </div>
          <div className="text-[11px] text-muted-foreground">Real − Nota (gerar nota de correção)</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800">
            <Weight className="w-3.5 h-3.5" /> Notas (ton)
          </div>
          <div className="text-xl font-bold text-orange-700 mt-1">{fmtNum(totals.tonNote, 2)} ton</div>
          <div className="text-[11px] text-orange-600">Real das cargas: {fmtNum(totals.tonReal, 2)} ton</div>
        </div>
        <div className={`border rounded-lg p-3 ${totals.tonDiff > 0.001 ? "bg-green-50 border-green-200" : totals.tonDiff < -0.001 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            {totals.tonDiff > 0.001 ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : totals.tonDiff < -0.001 ? <TrendingDown className="w-3.5 h-3.5 text-red-600" /> : <Minus className="w-3.5 h-3.5" />}
            Diferença (ton)
          </div>
          <div className={`text-xl font-bold mt-1 ${totals.tonDiff > 0.001 ? "text-green-700" : totals.tonDiff < -0.001 ? "text-red-700" : "text-gray-700"}`}>
            {totals.tonDiff > 0 ? "+" : ""}{fmtNum(totals.tonDiff, 2)} ton
          </div>
          <div className="text-[11px] text-muted-foreground">Real − Nota (gerar nota de correção)</div>
        </div>
      </div>

      {/* Tabela-planilha */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma nota encontrada.</p>
          <p className="text-sm mt-1">As ações são geradas automaticamente ao registrar uma carga.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-green-700 text-white">
                <th className="px-3 py-2 text-left text-xs font-semibold">Data</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Ação</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">NF</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Local</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Destino</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Qtd Nota</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Qtd Real</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Diferença</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const noteQty = noteQtyOf(r);
                const realQty = realQtyOf(r);
                const diff = realQty - noteQty;
                const unit = r.quantityType === "m3" ? "m³" : "ton";
                const isUsed = r.noteStatus === "used";
                return (
                  <tr key={r.noteId} className="border-b hover:bg-green-50/50">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.cargoDate || r.issueDate)}</td>
                    <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{r.actionCode}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.noteInvoiceNumber ? (
                        <span className="flex items-center gap-1">
                          NF {r.noteInvoiceNumber}
                          {(r.noteFileUrl || r.cargoInvoiceUrl) && (
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver arquivo da nota"
                              onClick={() => { setViewFileUrl(r.noteFileUrl || r.cargoInvoiceUrl); setViewFileTitle(`NF ${r.noteInvoiceNumber} · ${r.actionCode}`); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.workLocationName ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{r.workLocationName}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap max-w-[180px] truncate" title={destinoOf(r)}>{destinoOf(r)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{fmtNum(noteQty, r.quantityType === "m3" ? 3 : 2)} {unit}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{r.cargoId ? `${fmtNum(realQty, r.quantityType === "m3" ? 3 : 2)} ${unit}` : "—"}</td>
                    <td className={`px-3 py-2 text-right whitespace-nowrap font-semibold ${diff > 0.001 ? "text-green-700" : diff < -0.001 ? "text-red-700" : "text-gray-500"}`}>
                      {r.cargoId ? `${diff > 0 ? "+" : ""}${fmtNum(diff, r.quantityType === "m3" ? 3 : 2)} ${unit}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <Badge variant={isUsed ? "secondary" : "default"} className={`text-xs ${!isUsed ? "bg-green-100 text-green-700 border-green-200" : ""}`}>
                        {isUsed ? "Utilizada" : "Disponível"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-0.5">
                        {r.cargoId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-800" title={`Ver carga #${r.cargoId}`} onClick={() => window.open(`/cargas?highlight=${r.cargoId}`, "_self")}>
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700" title="Editar ação" onClick={() => setEditingNote({ ...r })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isUsed ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700" title="Liberar nota" onClick={() => releaseMutation.mutate({ id: r.noteId })}>
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" title="Excluir" onClick={() => deleteMutation.mutate({ id: r.noteId })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de Edição */}
      <Dialog open={!!editingNote} onOpenChange={(v) => { if (!v) { setEditingNote(null); setEditFile(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ação / Nota — {editingNote?.actionCode}</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Quantidade *</Label>
                  <Select value={editingNote.quantityType} onValueChange={v => setEditingNote((n: any) => n ? { ...n, quantityType: v } : n)}>
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
                    value={editingNote.noteQuantity}
                    onChange={e => setEditingNote((n: any) => n ? { ...n, noteQuantity: e.target.value } : n)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Emissão *</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={editingNote.issueDate}
                    onChange={e => setEditingNote((n: any) => n ? { ...n, issueDate: e.target.value } : n)}
                  />
                </div>
                <div>
                  <Label>Número da NF (opcional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="ex: 402"
                    value={editingNote.noteInvoiceNumber || ""}
                    onChange={e => setEditingNote((n: any) => n ? { ...n, noteInvoiceNumber: e.target.value } : n)}
                  />
                </div>
              </div>
              <div>
                <Label>Substituir arquivo (opcional)</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => editFileRef.current?.click()}
                >
                  {editFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {editFile.name}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      Clique para selecionar arquivo
                    </div>
                  )}
                </div>
                <input
                  ref={editFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setEditFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  className="mt-1 resize-none"
                  rows={2}
                  value={editingNote.noteNotes || ""}
                  onChange={e => setEditingNote((n: any) => n ? { ...n, noteNotes: e.target.value } : n)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingNote(null); setEditFile(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização de Arquivo */}
      <Dialog open={!!viewFileUrl} onOpenChange={(v) => { if (!v) setViewFileUrl(null); }}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {viewFileTitle}
            </DialogTitle>
          </DialogHeader>
          {viewFileUrl && (
            <div className="flex-1 overflow-hidden rounded-lg border bg-muted/30">
              {viewFileUrl.toLowerCase().includes(".pdf") ? (
                <iframe src={viewFileUrl} className="w-full h-full" title={viewFileTitle} />
              ) : (
                <img src={viewFileUrl} alt={viewFileTitle} className="w-full h-full object-contain" />
              )}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(viewFileUrl!, "_blank")}>
              <ExternalLink className="w-4 h-4" />
              Abrir em nova guia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
