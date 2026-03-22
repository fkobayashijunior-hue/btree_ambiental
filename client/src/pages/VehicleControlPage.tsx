import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Plus, Calendar, Camera, X, User, Pencil, ImageIcon } from "lucide-react";
import { useFilePicker } from "@/hooks/useFilePicker";

type RecordType = "abastecimento" | "manutencao" | "km";

const RECORD_LABELS: Record<RecordType, string> = {
  abastecimento: "Abastecimento",
  manutencao: "Manutenção",
  km: "Quilometragem",
};

const RECORD_COLORS: Record<RecordType, string> = {
  abastecimento: "bg-blue-100 text-blue-800",
  manutencao: "bg-orange-100 text-orange-800",
  km: "bg-green-100 text-green-800",
};

const emptyForm = {
  equipmentId: "",
  date: new Date().toISOString().slice(0, 10),
  recordType: "abastecimento" as RecordType,
  fuelType: "diesel" as "diesel" | "gasolina" | "etanol" | "gnv",
  liters: "",
  fuelCost: "",
  pricePerLiter: "",
  supplier: "",
  odometer: "",
  kmDriven: "",
  maintenanceType: "",
  maintenanceCost: "",
  serviceType: "proprio" as "proprio" | "terceirizado",
  mechanicName: "",
  notes: "",
};

export default function VehicleControlPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { openFilePicker } = useFilePicker();
  const utils = trpc.useUtils();
  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: records = [], isLoading } = trpc.vehicleRecords.list.useQuery({
    equipmentId: filterEquipment ? parseInt(filterEquipment) : undefined,
  });

  const createMutation = trpc.vehicleRecords.create.useMutation({
    onSuccess: () => {
      toast.success("Registro salvo!");
      utils.vehicleRecords.list.invalidate();
      setIsOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.vehicleRecords.update.useMutation({
    onSuccess: () => {
      toast.success("Registro atualizado!");
      utils.vehicleRecords.list.invalidate();
      setIsOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setPhotoPreview(null);
    setPhotoBase64(null);
    setEditingId(null);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      equipmentId: String(r.equipmentId || ""),
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      recordType: r.recordType || "abastecimento",
      fuelType: r.fuelType || "diesel",
      liters: r.liters || "",
      fuelCost: r.fuelCost || "",
      pricePerLiter: r.pricePerLiter || "",
      supplier: r.supplier || "",
      odometer: r.odometer || "",
      kmDriven: r.kmDriven || "",
      maintenanceType: r.maintenanceType || "",
      maintenanceCost: r.maintenanceCost || "",
      serviceType: r.serviceType || "proprio",
      mechanicName: r.mechanicName || "",
      notes: r.notes || "",
    });
    setPhotoPreview(r.photoUrl || null);
    setPhotoBase64(null);
    setIsOpen(true);
  };

  const handlePhotoChange = (files: FileList) => {
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
  };

  // Abrir galeria sem capture para permitir selecionar da galeria no mobile
  const openGallery = () => openFilePicker({ accept: "image/*" }, handlePhotoChange);
  const openCamera = () => openFilePicker({ accept: "image/*", capture: "environment" }, handlePhotoChange);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentId) { toast.error("Selecione o veículo"); return; }

    const payload = {
      equipmentId: parseInt(form.equipmentId),
      date: form.date,
      recordType: form.recordType,
      fuelType: form.recordType === "abastecimento" ? form.fuelType : undefined,
      liters: form.recordType === "abastecimento" ? form.liters || undefined : undefined,
      fuelCost: form.fuelCost || undefined,
      pricePerLiter: form.pricePerLiter || undefined,
      supplier: form.supplier || undefined,
      odometer: form.odometer || undefined,
      kmDriven: form.kmDriven || undefined,
      maintenanceType: form.maintenanceType || undefined,
      maintenanceCost: form.maintenanceCost || undefined,
      serviceType: form.recordType === "manutencao" ? form.serviceType : undefined,
      mechanicName: form.mechanicName || undefined,
      notes: form.notes || undefined,
      photoBase64: photoBase64 || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const equipMap = Object.fromEntries(equipmentList.map((eq: any) => [eq.id, eq.name]));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Car className="h-7 w-7" /> Controle de Abastecimento
          </h1>
          <p className="text-gray-500 text-sm mt-1">Abastecimentos, km e manutenções de veículos</p>
        </div>
        <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Registro
        </Button>
      </div>

      {/* Filter */}
      <div className="max-w-xs">
        <select
          value={filterEquipment}
          onChange={e => setFilterEquipment(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os veículos</option>
          {equipmentList.map((eq: any) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro de veículo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Foto clicável */}
                  {r.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setViewPhoto(r.photoUrl)}
                      className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 hover:opacity-80 transition-opacity"
                    >
                      <img src={r.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">
                          {equipMap[r.equipmentId] || `Veículo #${r.equipmentId}`}
                        </span>
                        <Badge className={`text-xs ${RECORD_COLORS[r.recordType as RecordType]}`}>
                          {RECORD_LABELS[r.recordType as RecordType]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {r.recordType === "abastecimento" && r.liters && (
                            <>
                              <p className="font-bold text-blue-700">{r.liters}L</p>
                              {r.fuelCost && <p className="text-xs text-gray-500">R$ {r.fuelCost}</p>}
                            </>
                          )}
                          {r.recordType === "km" && r.kmDriven && (
                            <p className="font-bold text-green-700">{r.kmDriven} km</p>
                          )}
                          {r.recordType === "manutencao" && r.maintenanceCost && (
                            <p className="font-bold text-orange-700">R$ {r.maintenanceCost}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-emerald-600"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      {r.odometer && <span>{r.odometer} km</span>}
                      {r.supplier && <span>{r.supplier}</span>}
                      {r.maintenanceType && <span>{r.maintenanceType}</span>}
                      {r.fuelType && r.recordType === "abastecimento" && <span className="capitalize">{r.fuelType}</span>}
                      {r.registeredByName && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <User className="h-3 w-3" /> {r.registeredByName}
                        </span>
                      )}
                    </div>
                    {r.notes && <p className="text-xs text-gray-400 mt-1 italic">{r.notes}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal visualização de foto */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-lg p-2">
          {viewPhoto && (
            <img src={viewPhoto} alt="Foto do registro" className="w-full rounded-lg object-contain max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet de cadastro/edição */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">
              {editingId ? "Editar Registro" : "Novo Registro de Veículo"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div>
              <Label>Veículo *</Label>
              <select value={form.equipmentId} onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))} required className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione o veículo</option>
                {equipmentList.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div>
              <Label>Tipo de Registro *</Label>
              <select value={form.recordType} onChange={e => setForm(f => ({ ...f, recordType: e.target.value as RecordType }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="abastecimento">Abastecimento</option>
                <option value="km">Quilometragem</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>

            <div>
              <Label>Hodômetro (km)</Label>
              <Input value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))} placeholder="ex: 45230" />
            </div>

            {form.recordType === "abastecimento" && (
              <>
                <div>
                  <Label>Combustível *</Label>
                  <select value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="diesel">Diesel</option>
                    <option value="gasolina">Gasolina</option>
                    <option value="etanol">Etanol</option>
                    <option value="gnv">GNV</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Litros</Label><Input value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="0,0" /></div>
                  <div><Label>Preço/L</Label><Input value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,00" /></div>
                  <div><Label>Total R$</Label><Input value={form.fuelCost} onChange={e => setForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="0,00" /></div>
                </div>
                <div><Label>Posto/Fornecedor</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome do posto" /></div>
              </>
            )}

            {form.recordType === "km" && (
              <div><Label>KM Percorridos</Label><Input value={form.kmDriven} onChange={e => setForm(f => ({ ...f, kmDriven: e.target.value }))} placeholder="ex: 120" /></div>
            )}

            {form.recordType === "manutencao" && (
              <>
                <div><Label>Tipo de Manutenção</Label><Input value={form.maintenanceType} onChange={e => setForm(f => ({ ...f, maintenanceType: e.target.value }))} placeholder="ex: Troca de óleo, Freios..." /></div>
                <div>
                  <Label>Serviço</Label>
                  <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value as any }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="proprio">Próprio</option>
                    <option value="terceirizado">Terceirizado</option>
                  </select>
                </div>
                <div><Label>Mecânico/Oficina</Label><Input value={form.mechanicName} onChange={e => setForm(f => ({ ...f, mechanicName: e.target.value }))} placeholder="Nome" /></div>
                <div><Label>Custo (R$)</Label><Input value={form.maintenanceCost} onChange={e => setForm(f => ({ ...f, maintenanceCost: e.target.value }))} placeholder="0,00" /></div>
              </>
            )}

            {/* Foto */}
            <div>
              <Label className="mb-2 block">Foto do Registro</Label>
              {photoPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button type="button" onClick={openCamera}
                      className="bg-black/60 text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1 hover:bg-black/80">
                      <Camera className="h-3 w-3" /> Câmera
                    </button>
                    <button type="button" onClick={openGallery}
                      className="bg-black/60 text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1 hover:bg-black/80">
                      <ImageIcon className="h-3 w-3" /> Galeria
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={openCamera}
                    className="flex-1 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs font-medium">Câmera</span>
                  </button>
                  <button type="button" onClick={openGallery}
                    className="flex-1 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs font-medium">Galeria</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
