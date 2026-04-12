import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Plus, Calendar, Camera, X, User, Pencil, ImageIcon, FileDown, FileSpreadsheet, MapPin } from "lucide-react";
import { useFilePicker } from "@/hooks/useFilePicker";
import WorkLocationSelect from "@/components/WorkLocationSelect";

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
  workLocationId: "",
};

// Meses em português
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function VehicleControlPage() {
  const now = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
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

  // Filtrar por mês/ano no frontend
  const filteredRecords = useMemo(() => {
    return (records as any[]).filter((r: any) => {
      const d = new Date(r.createdAt);
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
  }, [records, filterMonth, filterYear]);

  // Totais do período filtrado (apenas abastecimentos)
  const fuelRecords = useMemo(() => filteredRecords.filter((r: any) => r.recordType === "abastecimento"), [filteredRecords]);
  const totalLiters = useMemo(() => fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.liters) || 0), 0), [fuelRecords]);
  const totalCost = useMemo(() => fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.fuelCost) || 0), 0), [fuelRecords]);

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

  const deleteMutation = trpc.vehicleRecords.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro excluído!");
      utils.vehicleRecords.list.invalidate();
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
      workLocationId: r.workLocationId ? String(r.workLocationId) : "",
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
      workLocationId: form.workLocationId ? parseInt(form.workLocationId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const periodLabel = `${MONTHS[filterMonth]} ${filterYear}`;

  // ===== EXPORTAR PDF =====
  const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
  const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
  const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

  const handleExportPDF = () => {
    if (filteredRecords.length === 0) { toast.error("Nenhum registro para exportar no período"); return; }
    const vehicleName = filterEquipment ? (equipMap[parseInt(filterEquipment)] || "Todos os veículos") : "Todos os veículos";
    const now = new Date().toLocaleString("pt-BR");

    const tableRows = filteredRecords.map((r: any) => `
      <tr>
        <td>${new Date(r.createdAt).toLocaleDateString("pt-BR")}</td>
        <td>${equipMap[r.equipmentId] || `#${r.equipmentId}`}</td>
        <td>${RECORD_LABELS[r.recordType as RecordType] || r.recordType}</td>
        <td>${r.recordType === "abastecimento" ? (r.fuelType || "-") : "-"}</td>
        <td>${r.recordType === "abastecimento" ? `${r.liters || "0"} L` : (r.kmDriven ? `${r.kmDriven} km` : "-")}</td>
        <td>${r.fuelCost || r.maintenanceCost ? `R$ ${r.fuelCost || r.maintenanceCost}` : "-"}</td>
        <td>${r.supplier || r.maintenanceType || "-"}</td>
        <td>${r.registeredByName || "-"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Abastecimentos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
    .header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 24px; display: flex; align-items: center; gap: 18px; }
    .header img { height: 52px; filter: brightness(0) invert(1); }
    .header-text h1 { font-size: 20px; font-weight: bold; }
    .header-text p { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .content { padding: 20px 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .summary-card .value { font-size: 16px; font-weight: bold; color: #0d4f2e; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0d4f2e; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f0fdf4; }
    .footer { margin-top: 24px; padding: 14px 24px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-left img { height: 28px; }
    .footer-text { font-size: 10px; color: #555; }
    .footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
    .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .footer-right img { width: 60px; height: 60px; }
    .footer-right span { font-size: 9px; color: #555; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="header">
  <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
  <div class="header-text">
    <h1>Relatório de Abastecimentos — ${periodLabel}</h1>
    <p>BTREE Empreendimentos LTDA · btreeambiental.com · Veículo: ${vehicleName} · Emitido em ${now}</p>
  </div>
</div>
<div class="content">
  <div class="summary">
    <div class="summary-card"><div class="label">Total de Registros</div><div class="value">${filteredRecords.length}</div></div>
    <div class="summary-card"><div class="label">Abastecimentos</div><div class="value">${fuelRecords.length}</div></div>
    <div class="summary-card"><div class="label">Total de Litros</div><div class="value">${totalLiters.toFixed(1)} L</div></div>
    <div class="summary-card"><div class="label">Custo Total</div><div class="value">R$ ${totalCost.toFixed(2)}</div></div>
  </div>
  <table>
    <thead><tr><th>Data</th><th>Veículo</th><th>Tipo</th><th>Combustível</th><th>Litros/KM</th><th>Valor (R$)</th><th>Posto/Tipo</th><th>Registrado por</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>
<div class="footer">
  <div class="footer-left">
    <img src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
    <div class="footer-text">
      Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
      <a href="https://btreeambiental.com">btreeambiental.com</a>
    </div>
  </div>
  <div class="footer-right">
    <img src="${BTREE_QR}" alt="QR Code" />
    <span>Acesse nosso site</span>
  </div>
</div>
<script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita popups para gerar o PDF"); return; }
    win.document.write(html);
    win.document.close();
  };

  // ===== EXPORTAR EXCEL (ExcelJS profissional) =====
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) { toast.error("Nenhum registro para exportar no período"); return; }
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");
      const vehicleName = filterEquipment ? (equipMap[parseInt(filterEquipment)] || "Todos os veículos") : "Todos os veículos";
      const now = new Date().toLocaleString("pt-BR");

      const wb = new ExcelJS.Workbook();
      wb.creator = "BTREE Ambiental";
      wb.created = new Date();
      const ws = wb.addWorksheet("Abastecimentos", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
      });

      // Cores padrão BTREE (mesmo do PDF)
      const GREEN_DARK = "0D4F2E";
      const GREEN_LIGHT = "F0FDF4";
      const GREEN_BORDER = "BBF7D0";
      const WHITE = "FFFFFF";
      const GRAY_BORDER = "E5E7EB";
      const GRAY_TEXT = "6B7280";

      // Definir colunas
      ws.columns = [
        { key: "data", width: 14 },
        { key: "veiculo", width: 22 },
        { key: "tipo", width: 16 },
        { key: "combustivel", width: 14 },
        { key: "litros", width: 12 },
        { key: "kmPercorridos", width: 14 },
        { key: "hodometro", width: 14 },
        { key: "precoLitro", width: 14 },
        { key: "custoTotal", width: 16 },
        { key: "fornecedor", width: 22 },
        { key: "tipoManutencao", width: 18 },
        { key: "mecanico", width: 18 },
        { key: "observacoes", width: 28 },
        { key: "registradoPor", width: 18 },
      ];

      // ===== CABEÇALHO (linhas 1-4) =====
      // Linha 1: Título principal
      ws.mergeCells("A1:N1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "BTREE AMBIENTAL — RELATÓRIO DE ABASTECIMENTOS";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: WHITE } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 36;

      // Linha 2: Subtítulo
      ws.mergeCells("A2:N2");
      const subtitleCell = ws.getCell("A2");
      subtitleCell.value = `BTREE Empreendimentos LTDA  \u2022  btreeambiental.com  \u2022  Ve\u00edculo: ${vehicleName}  \u2022  Per\u00edodo: ${periodLabel}  \u2022  Emitido em ${now}`;
      subtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: WHITE } };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 22;

      // Linha 3: Resumo (cards)
      ws.mergeCells("A3:C3");
      ws.getCell("A3").value = `Total de Registros: ${filteredRecords.length}`;
      ws.mergeCells("D3:F3");
      ws.getCell("D3").value = `Abastecimentos: ${fuelRecords.length}`;
      ws.mergeCells("G3:J3");
      ws.getCell("G3").value = `Total de Litros: ${totalLiters.toFixed(1)} L`;
      ws.mergeCells("K3:N3");
      ws.getCell("K3").value = `Custo Total: R$ ${totalCost.toFixed(2)}`;
      ["A3", "D3", "G3", "K3"].forEach(ref => {
        const c = ws.getCell(ref);
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: GREEN_DARK } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_LIGHT } };
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.border = { top: { style: "thin", color: { argb: GREEN_BORDER } }, bottom: { style: "thin", color: { argb: GREEN_BORDER } }, left: { style: "thin", color: { argb: GREEN_BORDER } }, right: { style: "thin", color: { argb: GREEN_BORDER } } };
      });
      ws.getRow(3).height = 28;

      // Linha 4: vazia (espaçamento)
      ws.getRow(4).height = 8;

      // ===== CABEÇALHO DA TABELA (linha 5) =====
      const headers = ["Data", "Ve\u00edculo", "Tipo", "Combust\u00edvel", "Litros", "KM Percorridos", "Hod\u00f4metro", "Pre\u00e7o/L (R$)", "Custo Total (R$)", "Posto/Fornecedor", "Tipo Manuten\u00e7\u00e3o", "Mec\u00e2nico", "Observa\u00e7\u00f5es", "Registrado por"];
      const headerRow = ws.getRow(5);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { top: { style: "thin", color: { argb: GREEN_DARK } }, bottom: { style: "thin", color: { argb: GREEN_DARK } }, left: { style: "thin", color: { argb: GREEN_DARK } }, right: { style: "thin", color: { argb: GREEN_DARK } } };
      });
      headerRow.height = 24;

      // ===== DADOS (a partir da linha 6) =====
      filteredRecords.forEach((r: any, idx: number) => {
        const rowNum = 6 + idx;
        const row = ws.getRow(rowNum);
        const isEven = idx % 2 === 0;
        const values = [
          new Date(r.createdAt).toLocaleDateString("pt-BR"),
          equipMap[r.equipmentId] || `#${r.equipmentId}`,
          RECORD_LABELS[r.recordType as RecordType] || r.recordType,
          r.fuelType || "-",
          r.liters ? parseFloat(r.liters) : "-",
          r.kmDriven || "-",
          r.odometer || "-",
          r.pricePerLiter ? parseFloat(r.pricePerLiter) : "-",
          r.fuelCost ? parseFloat(r.fuelCost) : (r.maintenanceCost ? parseFloat(r.maintenanceCost) : "-"),
          r.supplier || "-",
          r.maintenanceType || "-",
          r.mechanicName || "-",
          r.notes || "-",
          r.registeredByName || "-",
        ];
        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.font = { name: "Arial", size: 10 };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_LIGHT } };
          }
          cell.border = { bottom: { style: "thin", color: { argb: GRAY_BORDER } } };
          // Formatar valores monetários
          if ((i === 7 || i === 8) && typeof v === "number") {
            cell.numFmt = '#,##0.00';
          }
          if (i === 4 && typeof v === "number") {
            cell.numFmt = '#,##0.0';
          }
        });
        row.height = 20;
      });

      // ===== LINHA DE TOTAIS =====
      const totalsRowNum = 6 + filteredRecords.length;
      const totalsRow = ws.getRow(totalsRowNum);
      const totalMaintCost = filteredRecords.filter((r: any) => r.recordType === "manutencao").reduce((s: number, r: any) => s + (parseFloat(r.maintenanceCost) || 0), 0);
      const totalsValues = [
        `TOTAIS \u2014 ${periodLabel}`,
        vehicleName,
        `${filteredRecords.length} registros`,
        "",
        totalLiters,
        "",
        "",
        "",
        totalCost + totalMaintCost,
        "", "", "", "", "",
      ];
      totalsValues.forEach((v, i) => {
        const cell = totalsRow.getCell(i + 1);
        cell.value = v;
        cell.font = { name: "Arial", size: 11, bold: true, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "medium", color: { argb: GREEN_DARK } }, bottom: { style: "medium", color: { argb: GREEN_DARK } } };
        if ((i === 4 || i === 8) && typeof v === "number") {
          cell.numFmt = '#,##0.00';
        }
      });
      totalsRow.height = 26;

      // ===== RODAPÉ =====
      const footerRowNum = totalsRowNum + 2;
      ws.mergeCells(`A${footerRowNum}:N${footerRowNum}`);
      const footerCell = ws.getCell(`A${footerRowNum}`);
      footerCell.value = "Desenvolvido por Kobayashi Desenvolvimento de Sistemas  \u2022  btreeambiental.com";
      footerCell.font = { name: "Arial", size: 9, italic: true, color: { argb: GRAY_TEXT } };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };

      // Gerar e salvar
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `abastecimentos-${filterYear}-${String(filterMonth + 1).padStart(2, "0")}.xlsx`);
      toast.success("Excel profissional gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar Excel");
      console.error(err);
    }
  };

  const equipMap = Object.fromEntries(equipmentList.map((eq: any) => [eq.id, eq.name]));
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Anos disponíveis (últimos 3 anos)
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Car className="h-7 w-7" /> Controle de Abastecimento
          </h1>
          <p className="text-gray-500 text-sm mt-1">Abastecimentos, km e manutenções de veículos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Mês */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Mês</label>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(parseInt(e.target.value))}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>

        {/* Ano */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Ano</label>
          <select
            value={filterYear}
            onChange={e => setFilterYear(parseInt(e.target.value))}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Veículo */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-500">Veículo</label>
          <select
            value={filterEquipment}
            onChange={e => setFilterEquipment(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os veículos</option>
            {equipmentList.map((eq: any) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de resumo do período */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{filteredRecords.length}</p>
            <p className="text-xs text-gray-500">Registros em {periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{totalLiters.toFixed(1)} L</p>
            <p className="text-xs text-gray-500">Total abastecido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">R$ {totalCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Custo de combustível</p>
          </CardContent>
        </Card>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro em {periodLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((r: any) => (
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
                      {(r as any).locationName && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <MapPin className="h-3 w-3" /> {(r as any).locationName}
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

            <WorkLocationSelect
              value={form.workLocationId}
              onChange={(id) => setForm(f => ({ ...f, workLocationId: id }))}
            />

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
