import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Paperclip } from "lucide-react";

const selectCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const PAYMENT_METHODS: Record<string, string> = {
  boleto: "Boleto", pix: "PIX", cartao_credito: "Cartão de Crédito", cartao_debito: "Cartão de Débito",
  dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro",
};

type Item = { name: string; qty: string; unit: string; price: string };

const num = (v: string) => parseFloat(String(v ?? "").replace(",", ".")) || 0;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const newItem = (): Item => ({ name: "", qty: "1", unit: "un", price: "" });

async function uploadPurchaseFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "btree_ambiental");
  formData.append("folder", "btree-receipts");
  const res = await fetch("https://api.cloudinary.com/v1_1/djob7pxme/auto/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload não retornou URL");
  return data.secure_url as string;
}

// Compra feita direto por um colaborador, sem solicitação prévia: registra fornecedor, valor, nota fiscal
// (obrigatória), quem comprou e equipamento. A solicitação nasce como "Comprada" e segue o fluxo normal.
export default function DirectPurchaseDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: number) => void }) {
  const utils = trpc.useUtils();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ activeOnly: true }, { enabled: open });
  const { data: categories = [] } = trpc.purchaseCategories.list.useQuery(undefined, { enabled: open });
  const { data: collaborators = [] } = trpc.collaborators.list.useQuery({ active: true }, { enabled: open });
  const { data: equipmentList = [] } = trpc.purchaseRequests.listEquipmentOptions.useQuery(undefined, { enabled: open });

  const createSupplier = trpc.suppliers.create.useMutation({ onError: (e) => toast.error(e.message) });
  const register = trpc.purchaseRequests.registerDirectPurchase.useMutation({
    onSuccess: (r) => {
      toast.success("Compra direta registrada");
      utils.purchaseRequests.list.invalidate();
      reset();
      onOpenChange(false);
      onCreated(r.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState<null | "invoice" | "receipt">(null);

  function reset() {
    setSupplierId(""); setNewSupplierName(""); setBuyerId(""); setPurchaseDate(today); setPaymentMethod("");
    setCategoryId(""); setEquipmentId(""); setTitle(""); setNotes(""); setItems([newItem()]); setInvoiceUrl(""); setReceiptUrl("");
  }

  const total = useMemo(() => items.reduce((s, it) => s + num(it.qty) * num(it.price), 0), [items]);

  function patchItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function pickFile(kind: "invoice" | "receipt", file?: File) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadPurchaseFile(file);
      if (kind === "invoice") setInvoiceUrl(url); else setReceiptUrl(url);
      toast.success(kind === "invoice" ? "Nota fiscal anexada" : "Comprovante anexado");
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar o arquivo");
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (!supplierId && !newSupplierName.trim()) return toast.error("Escolha o fornecedor ou digite o nome de um novo");
    if (!buyerId) return toast.error("Informe quem comprou");
    if (!invoiceUrl) return toast.error("Anexe a nota fiscal");
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const label = it.name.trim() || `Item ${idx + 1}`;
      if (!it.name.trim()) return toast.error(`Item ${idx + 1}: informe o nome`);
      if (num(it.qty) <= 0) return toast.error(`"${label}": informe a quantidade`);
      if (!it.price.trim()) return toast.error(`"${label}": informe o preço unitário`);
    }
    let sid = supplierId ? Number(supplierId) : null;
    if (!sid) {
      const created = await createSupplier.mutateAsync({ name: newSupplierName.trim() });
      sid = created.id;
      utils.suppliers.list.invalidate();
    }
    register.mutate({
      title: title.trim() || undefined,
      supplierId: sid!,
      categoryId: categoryId ? Number(categoryId) : null,
      equipmentId: equipmentId ? Number(equipmentId) : null,
      paymentMethod: (paymentMethod || undefined) as any,
      purchaseDate: purchaseDate || undefined,
      purchasedByCollaboratorId: Number(buyerId),
      invoiceUrl,
      receiptUrl: receiptUrl || undefined,
      notes: notes.trim() || undefined,
      items: items.map(it => ({ name: it.name.trim(), quantity: num(it.qty), unit: it.unit.trim() || "un", unitPrice: num(it.price) })),
    });
  }

  const busy = register.isPending || createSupplier.isPending || uploading !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar compra direta</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500 -mt-2">Para compras feitas direto por um colaborador, sem solicitação prévia. A compra fica registrada com nota fiscal, valor e quem comprou.</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Fornecedor / Loja *</Label>
            <select className={selectCls} value={supplierId} onChange={e => { setSupplierId(e.target.value); if (e.target.value) setNewSupplierName(""); }}>
              <option value="">Escolha um fornecedor cadastrado</option>
              {(suppliers as any[]).map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </select>
            {!supplierId && <Input className="mt-1.5" placeholder="…ou digite o nome de um novo fornecedor" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />}
          </div>
          <div>
            <Label>Quem comprou *</Label>
            <select className={selectCls} value={buyerId} onChange={e => setBuyerId(e.target.value)}>
              <option value="">Selecione o colaborador</option>
              {(collaborators as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><Label>Data da compra</Label><Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
          <div>
            <Label>Forma de pagamento</Label>
            <select className={selectCls} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="">—</option>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Categoria</Label>
            <select className={selectCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {(categories as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Equipamento</Label>
            <select className={selectCls} value={equipmentId} onChange={e => setEquipmentId(e.target.value)}>
              <option value="">— (compra não é de um equipamento específico)</option>
              {(equipmentList as any[]).map(e => <option key={e.id} value={e.id}>{e.name}{e.licensePlate ? ` (${e.licensePlate})` : ""}{e.typeName ? ` — ${e.typeName}` : ""}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><Label>Título (opcional)</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Se vazio, usa o nome do primeiro item" /></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Itens comprados</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setItems(p => [...p, newItem()])}><Plus className="w-3.5 h-3.5 mr-1" /> Item</Button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3 bg-gray-50/50">
              <div className="col-span-12 sm:col-span-5"><Label className="text-xs">Item *</Label><Input value={it.name} onChange={e => patchItem(i, { name: e.target.value })} placeholder="Ex: Óleo 15w40" /></div>
              <div className="col-span-4 sm:col-span-2"><Label className="text-xs">Qtd *</Label><Input value={it.qty} onChange={e => patchItem(i, { qty: e.target.value })} /></div>
              <div className="col-span-4 sm:col-span-2"><Label className="text-xs">Unidade</Label><Input value={it.unit} onChange={e => patchItem(i, { unit: e.target.value })} /></div>
              <div className="col-span-4 sm:col-span-2"><Label className="text-xs">Preço unit. (R$) *</Label><Input value={it.price} onChange={e => patchItem(i, { price: e.target.value })} /></div>
              <div className="col-span-12 sm:col-span-1 text-right">
                {items.length > 1 && <Button type="button" size="sm" variant="ghost" className="text-red-600 h-9 px-2" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-semibold">Total da compra: R$ {fmt(total)}</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Nota fiscal * <span className="text-xs font-normal text-red-600">(obrigatória)</span></Label>
            <Input type="file" accept="image/*,application/pdf" disabled={uploading === "invoice"} onChange={e => pickFile("invoice", e.target.files?.[0])} />
            {uploading === "invoice" && <p className="text-xs text-gray-400 mt-1">Enviando…</p>}
            {invoiceUrl && <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"><Paperclip className="w-3 h-3" /> Nota anexada — abrir</a>}
          </div>
          <div>
            <Label>Comprovante de pagamento <span className="text-xs font-normal text-gray-400">(opcional)</span></Label>
            <Input type="file" accept="image/*,application/pdf" disabled={uploading === "receipt"} onChange={e => pickFile("receipt", e.target.files?.[0])} />
            {uploading === "receipt" && <p className="text-xs text-gray-400 mt-1">Enviando…</p>}
            {receiptUrl && <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"><Paperclip className="w-3 h-3" /> Comprovante anexado — abrir</a>}
          </div>
        </div>
        <div><Label>Observações</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar compra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
