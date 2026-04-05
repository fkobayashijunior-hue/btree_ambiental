import { useState } from "react";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Plus, Pencil, Trash2, Wrench, Tractor, Search,
  CheckCircle2, AlertTriangle, XCircle, Layers, FileText, Camera, X, ImageIcon
} from "lucide-react";

const STATUS_CONFIG = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  manutencao: { label: "Manutenção", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  inativo: { label: "Inativo", color: "bg-red-100 text-red-800", icon: XCircle },
};

const SECTOR_COLORS = [
  "#16a34a", "#0891b2", "#7c3aed", "#dc2626", "#ea580c",
  "#ca8a04", "#0d9488", "#db2777", "#4f46e5", "#65a30d",
];

export default function SectorsEquipment() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // Setores state
  const [sectorOpen, setSectorOpen] = useState(false);
  const [editSectorId, setEditSectorId] = useState<number | null>(null);
  const [sectorForm, setSectorForm] = useState({ name: "", description: "", color: "#16a34a" });

  // Equipamentos state
  const [equipOpen, setEquipOpen] = useState(false);
  const [editEquipId, setEditEquipId] = useState<number | null>(null);
  const [equipSearch, setEquipSearch] = useState("");
  const [equipForm, setEquipForm] = useState({
    name: "", typeId: 0, sectorId: 0, brand: "", model: "",
    year: "", serialNumber: "", licensePlate: "", status: "ativo" as "ativo" | "manutencao" | "inativo",
    defaultHeightM: "", defaultWidthM: "", defaultLengthM: "",
  });
  const [filterSectorId, setFilterSectorId] = useState(0);
  // Upload de foto do equipamento
  const [equipPhotoPreview, setEquipPhotoPreview] = useState<string | null>(null);
  const [equipPhotoBase64, setEquipPhotoBase64] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const { openFilePicker } = useFilePicker();

  // Tipo de equipamento state
  const [typeOpen, setTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // Queries
  const { data: sectorsList = [] } = trpc.sectors.listSectors.useQuery();
  const { data: equipTypes = [] } = trpc.sectors.listEquipmentTypes.useQuery();
  const { data: equipList = [], isLoading: equipLoading } = trpc.sectors.listEquipment.useQuery({
    search: equipSearch || undefined,
  });

  // Sector mutations
  const createSector = trpc.sectors.createSector.useMutation({
    onSuccess: () => { toast.success("Setor criado!"); utils.sectors.listSectors.invalidate(); setSectorOpen(false); setSectorForm({ name: "", description: "", color: "#16a34a" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateSector = trpc.sectors.updateSector.useMutation({
    onSuccess: () => { toast.success("Setor atualizado!"); utils.sectors.listSectors.invalidate(); setSectorOpen(false); setEditSectorId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSector = trpc.sectors.deleteSector.useMutation({
    onSuccess: () => { toast.success("Setor removido!"); utils.sectors.listSectors.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Equipment type mutation
  const createType = trpc.sectors.createEquipmentType.useMutation({
    onSuccess: () => { toast.success("Tipo criado!"); utils.sectors.listEquipmentTypes.invalidate(); setTypeOpen(false); setNewTypeName(""); },
    onError: (e) => toast.error(e.message),
  });

  // Equipment mutations
  const createEquip = trpc.sectors.createEquipment.useMutation({
    onSuccess: () => { toast.success("Equipamento cadastrado!"); utils.sectors.listEquipment.invalidate(); setEquipOpen(false); resetEquipForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateEquip = trpc.sectors.updateEquipment.useMutation({
    onSuccess: () => { toast.success("Equipamento atualizado!"); utils.sectors.listEquipment.invalidate(); setEquipOpen(false); setEditEquipId(null); resetEquipForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEquip = trpc.sectors.deleteEquipment.useMutation({
    onSuccess: () => { toast.success("Equipamento removido!"); utils.sectors.listEquipment.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetEquipForm = () => {
    setEquipForm({ name: "", typeId: 0, sectorId: 0, brand: "", model: "", year: "", serialNumber: "", licensePlate: "", status: "ativo", defaultHeightM: "", defaultWidthM: "", defaultLengthM: "" });
    setEquipPhotoPreview(null);
    setEquipPhotoBase64(null);
    setExistingImageUrl(null);
  };

  // Detectar se o tipo selecionado é veículo/caminhão (campo dinâmico)
  const selectedTypeName = equipTypes.find(t => t.id === equipForm.typeId)?.name?.toLowerCase() || "";
  const isVehicleType = selectedTypeName.includes("caminhão") || selectedTypeName.includes("caminhao") ||
    selectedTypeName.includes("veículo") || selectedTypeName.includes("veiculo") ||
    selectedTypeName.includes("carro") || selectedTypeName.includes("moto") ||
    selectedTypeName.includes("van") || selectedTypeName.includes("ônibus") ||
    selectedTypeName.includes("onibus") || selectedTypeName.includes("pickup") ||
    selectedTypeName.includes("utilitário") || selectedTypeName.includes("utilitario");

  const openEditSector = (s: typeof sectorsList[number]) => {
    setEditSectorId(s.id);
    setSectorForm({ name: s.name, description: s.description || "", color: s.color || "#16a34a" });
    setSectorOpen(true);
  };

  const openEditEquip = (e: typeof equipList[number]) => {
    setEditEquipId(e.id);
    setEquipForm({
      name: e.name, typeId: e.typeId, sectorId: (e as any).sectorId || 0, brand: e.brand || "",
      model: e.model || "", year: e.year?.toString() || "",
      serialNumber: e.serialNumber || "", licensePlate: (e as any).licensePlate || "", status: e.status as any,
      defaultHeightM: (e as any).defaultHeightM || "", defaultWidthM: (e as any).defaultWidthM || "", defaultLengthM: (e as any).defaultLengthM || "",
    });
    // Carregar imagem existente
    const imgUrl = (e as any).imageUrl;
    if (imgUrl) {
      setExistingImageUrl(imgUrl);
      setEquipPhotoPreview(imgUrl);
    } else {
      setExistingImageUrl(null);
      setEquipPhotoPreview(null);
    }
    setEquipPhotoBase64(null);
    setEquipOpen(true);
  };

  const handlePhotoChange = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setEquipPhotoPreview(base64);
      setEquipPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };
  const pickEquipPhoto = () => openFilePicker({ accept: "image/*" }, handlePhotoChange);

  const handleSectorSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (editSectorId) {
      updateSector.mutate({ id: editSectorId, ...sectorForm });
    } else {
      createSector.mutate(sectorForm);
    }
  };

  const handleEquipSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!equipForm.typeId) { toast.error("Selecione o tipo de equipamento"); return; }
    const data = {
      name: equipForm.name,
      typeId: equipForm.typeId,
      sectorId: equipForm.sectorId || undefined,
      brand: equipForm.brand || undefined,
      model: equipForm.model || undefined,
      year: equipForm.year ? parseInt(equipForm.year) : undefined,
      serialNumber: isVehicleType ? undefined : (equipForm.serialNumber || undefined),
      licensePlate: isVehicleType ? (equipForm.licensePlate || undefined) : undefined,
      status: equipForm.status,
      imageUrl: equipPhotoBase64 || existingImageUrl || undefined,
      defaultHeightM: isVehicleType ? (equipForm.defaultHeightM || undefined) : undefined,
      defaultWidthM: isVehicleType ? (equipForm.defaultWidthM || undefined) : undefined,
      defaultLengthM: isVehicleType ? (equipForm.defaultLengthM || undefined) : undefined,
    };
    if (editEquipId) {
      updateEquip.mutate({ id: editEquipId, ...data });
    } else {
      createEquip.mutate(data);
    }
  };

  const isPendingEquip = createEquip.isPending || updateEquip.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
          <Layers className="h-7 w-7" /> Setores & Equipamentos
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie os setores da empresa e seus equipamentos</p>
      </div>

      <Tabs defaultValue="equipamentos">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
        </TabsList>

        {/* ===== SETORES ===== */}
        <TabsContent value="setores" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={sectorOpen} onOpenChange={(v) => { setSectorOpen(v); if (!v) { setEditSectorId(null); setSectorForm({ name: "", description: "", color: "#16a34a" }); } }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => { setEditSectorId(null); setSectorForm({ name: "", description: "", color: "#16a34a" }); }}>
                  <Plus className="h-4 w-4" /> Novo Setor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editSectorId ? "Editar Setor" : "Criar Novo Setor"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSectorSubmit} className="space-y-4">
                  <div>
                    <Label>Nome do Setor *</Label>
                    <Input value={sectorForm.name} onChange={e => setSectorForm(f => ({ ...f, name: e.target.value }))} required placeholder="ex: Manutenção, Transporte, Reflorestamento" />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={sectorForm.description} onChange={e => setSectorForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição opcional" />
                  </div>
                  <div>
                    <Label>Cor do Setor</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SECTOR_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${sectorForm.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setSectorForm(f => ({ ...f, color: c }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSectorOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createSector.isPending || updateSector.isPending}>
                      {createSector.isPending || updateSector.isPending ? "Salvando..." : editSectorId ? "Salvar" : "Criar Setor"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {sectorsList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum setor cadastrado</p>
              <p className="text-sm mt-1">Crie setores como "Manutenção", "Transporte", "Reflorestamento"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectorsList.map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: s.color || "#16a34a" }}>
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                          {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600" onClick={() => openEditSector(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => { if (confirm(`Remover setor "${s.name}"?`)) deleteSector.mutate({ id: s.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== EQUIPAMENTOS ===== */}
        <TabsContent value="equipamentos" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar equipamento, placa..." value={equipSearch} onChange={e => setEquipSearch(e.target.value)} className="pl-10" />
            </div>
            <select
              value={filterSectorId}
              onChange={e => setFilterSectorId(parseInt(e.target.value))}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={0}>Todos os setores</option>
              {sectorsList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {/* Botão para criar novo tipo */}
              <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700">
                    <Wrench className="h-4 w-4" /> Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Criar Tipo de Equipamento</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Tipo *</Label>
                      <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="ex: Motosserra, Trator, Caminhão" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setTypeOpen(false)}>Cancelar</Button>
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!newTypeName || createType.isPending}
                        onClick={() => createType.mutate({ name: newTypeName })}>
                        {createType.isPending ? "Criando..." : "Criar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Dialog: Cadastrar/Editar Equipamento */}
              <Dialog open={equipOpen} onOpenChange={(v) => { setEquipOpen(v); if (!v) { setEditEquipId(null); resetEquipForm(); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    <Plus className="h-4 w-4" /> Novo Equipamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editEquipId ? "Editar Equipamento" : "Cadastrar Equipamento"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEquipSubmit} className="space-y-4">
                    {/* Upload de Foto */}
                    <div>
                      <Label className="mb-2 block">Foto do Equipamento</Label>
                      {equipPhotoPreview ? (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                          <img src={equipPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setEquipPhotoPreview(null); setEquipPhotoBase64(null); setExistingImageUrl(null); }}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={pickEquipPhoto}
                            className="absolute bottom-2 right-2 bg-black/60 text-white rounded-lg px-3 py-1 text-xs flex items-center gap-1 hover:bg-black/80"
                          >
                            <Camera className="h-3 w-3" /> Trocar foto
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={pickEquipPhoto}
                          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-sm font-medium">Tirar foto ou escolher da galeria</span>
                          <span className="text-xs">JPG, PNG até 5MB</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome / Identificação *</Label>
                        <Input value={equipForm.name} onChange={e => setEquipForm(f => ({ ...f, name: e.target.value }))} required placeholder="ex: Motosserra #01, Trator Valtra" />
                      </div>
                      <div className="col-span-2">
                        <Label>Setor</Label>
                        <select
                          value={equipForm.sectorId}
                          onChange={e => setEquipForm(f => ({ ...f, sectorId: parseInt(e.target.value) }))}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value={0}>Sem setor definido</option>
                          {sectorsList.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label>Tipo de Equipamento *</Label>
                        <select
                          value={equipForm.typeId}
                          onChange={e => setEquipForm(f => ({ ...f, typeId: parseInt(e.target.value) }))}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        >
                          <option value={0}>Selecione o tipo...</option>
                          {equipTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {equipTypes.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">Crie um tipo de equipamento primeiro usando o botão "Novo Tipo"</p>
                        )}
                      </div>
                      <div>
                        <Label>Marca</Label>
                        <Input value={equipForm.brand} onChange={e => setEquipForm(f => ({ ...f, brand: e.target.value }))} placeholder="ex: Stihl, Valtra" />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Input value={equipForm.model} onChange={e => setEquipForm(f => ({ ...f, model: e.target.value }))} placeholder="ex: MS 250, BH 180" />
                      </div>
                      <div>
                        <Label>Ano</Label>
                        <Input type="number" value={equipForm.year} onChange={e => setEquipForm(f => ({ ...f, year: e.target.value }))} placeholder="ex: 2022" min={1990} max={2030} />
                      </div>
                      <div>
                        {isVehicleType ? (
                          <>
                            <Label>Placa do Veículo</Label>
                            <Input
                              value={equipForm.licensePlate}
                              onChange={e => setEquipForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                              placeholder="ex: ABC-1234 ou ABC1D23"
                              maxLength={8}
                              className="uppercase"
                            />
                          </>
                        ) : (
                          <>
                            <Label>Nº de Série / Patrimônio</Label>
                            <Input value={equipForm.serialNumber} onChange={e => setEquipForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="ex: SN-001234" />
                          </>
                        )}
                      </div>
                      {/* Medidas padrão do caminhão */}
                      {isVehicleType && (
                        <div className="col-span-2">
                          <Label className="flex items-center gap-1 text-emerald-700 font-semibold">📏 Medidas Padrão da Carga (metros)</Label>
                          <p className="text-xs text-gray-500 mb-2">Preenchidas automaticamente ao criar nova carga com este caminhão</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Altura (m)</Label>
                              <Input
                                value={equipForm.defaultHeightM}
                                onChange={e => setEquipForm(f => ({ ...f, defaultHeightM: e.target.value }))}
                                placeholder="2.4"
                                inputMode="decimal"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Largura (m)</Label>
                              <Input
                                value={equipForm.defaultWidthM}
                                onChange={e => setEquipForm(f => ({ ...f, defaultWidthM: e.target.value }))}
                                placeholder="2.4"
                                inputMode="decimal"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Comprimento (m)</Label>
                              <Input
                                value={equipForm.defaultLengthM}
                                onChange={e => setEquipForm(f => ({ ...f, defaultLengthM: e.target.value }))}
                                placeholder="13.80"
                                inputMode="decimal"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="col-span-2">
                        <Label>Status</Label>
                        <select
                          value={equipForm.status}
                          onChange={e => setEquipForm(f => ({ ...f, status: e.target.value as any }))}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="manutencao">Em Manutenção</option>
                          <option value="inativo">Inativo</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setEquipOpen(false)}>Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPendingEquip}>
                        {isPendingEquip ? "Salvando..." : editEquipId ? "Salvar" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {equipLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (filterSectorId ? equipList.filter(e => (e as any).sectorId === filterSectorId) : equipList).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tractor className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum equipamento cadastrado</p>
              <p className="text-sm mt-1">Primeiro crie um tipo (Motosserra, Trator...) e depois cadastre os equipamentos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(filterSectorId ? equipList.filter(e => (e as any).sectorId === filterSectorId) : equipList).map(e => {
                const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ativo;
                const Icon = sc.icon;
                return (
                  <Card key={e.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    {/* Foto do equipamento (se houver) */}
                    {(e as any).imageUrl && (
                      <div className="h-32 w-full overflow-hidden">
                        <img src={(e as any).imageUrl} alt={e.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{e.name}</p>
                          <p className="text-xs text-emerald-600 font-medium">{e.typeName}</p>
                          {(e.brand || e.model) && (
                            <p className="text-xs text-gray-500 mt-1">{[e.brand, e.model].filter(Boolean).join(" · ")}{e.year ? ` · ${e.year}` : ""}</p>
                          )}
                          {(e as any).licensePlate && <p className="text-xs text-blue-600 font-medium">🚗 Placa: {(e as any).licensePlate}</p>}
                          {e.serialNumber && <p className="text-xs text-gray-400">Série: {e.serialNumber}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sc.color}`}>
                            <Icon className="h-3 w-3" /> {sc.label}
                          </span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" onClick={() => openEditEquip(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-700" title="Ficha do Equipamento" onClick={() => setLocation(`/equipamento/${e.id}`)}>
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => { if (confirm(`Remover "${e.name}"?`)) deleteEquip.mutate({ id: e.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
