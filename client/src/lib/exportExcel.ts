// Exportação de tabelas para Excel (.xlsx), com o mesmo estilo visual usado nas
// exportações já existentes no sistema (cabeçalho verde BTREE, linhas zebradas, rodapé).

export type ExcelColumn = {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
  numFmt?: string; // ex: '#,##0.00' — aplicado só quando o valor da célula é number
};

export type ExcelSheetSpec = {
  sheetName: string;
  title: string;
  subtitle: string;
  columns: ExcelColumn[];
  rows: (string | number | null | undefined)[][];
  totalsRow?: (string | number | null | undefined)[];
};

const GREEN_DARK = "0D4F2E";
const GREEN_LIGHT = "F0FDF4";
const GRAY_BORDER = "E5E7EB";
const WHITE = "FFFFFF";
const GRAY_TEXT = "6B7280";

function addStyledSheet(wb: any, spec: ExcelSheetSpec) {
  const ws = wb.addWorksheet(spec.sheetName, {
    properties: { defaultRowHeight: 18 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const lastCol = spec.columns.length;
  ws.columns = spec.columns.map((c, i) => ({ key: `c${i}`, width: c.width }));

  // Linha 1: título
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = spec.title;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // Linha 2: subtítulo
  ws.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = spec.subtitle;
  subtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: WHITE } };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  // Linha 3: cabeçalho da tabela
  const headerRow = ws.getRow(3);
  spec.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: GREEN_DARK } }, bottom: { style: "thin", color: { argb: GREEN_DARK } }, left: { style: "thin", color: { argb: GREEN_DARK } }, right: { style: "thin", color: { argb: GREEN_DARK } } };
  });
  headerRow.height = 26;

  if (spec.rows.length === 0) {
    ws.mergeCells(4, 1, 4, lastCol);
    const emptyCell = ws.getCell(4, 1);
    emptyCell.value = "Nenhum registro neste período";
    emptyCell.font = { name: "Arial", size: 10, italic: true, color: { argb: GRAY_TEXT } };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
  }

  // Dados (a partir da linha 4)
  spec.rows.forEach((values, idx) => {
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);
    const isEven = idx % 2 === 0;
    values.forEach((v, i) => {
      const col = spec.columns[i];
      const cell = row.getCell(i + 1);
      cell.value = v ?? "-";
      cell.font = { name: "Arial", size: 9 };
      cell.alignment = { horizontal: col?.align ?? "left", vertical: "middle", wrapText: false };
      if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_LIGHT } };
      cell.border = { bottom: { style: "thin", color: { argb: GRAY_BORDER } } };
      if (typeof v === "number" && col?.numFmt) cell.numFmt = col.numFmt;
    });
    row.height = 18;
  });

  // Totais (opcional)
  if (spec.totalsRow && spec.rows.length > 0) {
    const totalsRowNum = 4 + spec.rows.length;
    const totalsRow = ws.getRow(totalsRowNum);
    spec.totalsRow.forEach((v, i) => {
      const col = spec.columns[i];
      const cell = totalsRow.getCell(i + 1);
      cell.value = v ?? "";
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
      cell.alignment = { horizontal: col?.align ?? "left", vertical: "middle" };
      if (typeof v === "number" && col?.numFmt) cell.numFmt = col.numFmt;
    });
    totalsRow.height = 24;
  }

  // Rodapé
  const footerRowNum = 4 + Math.max(spec.rows.length, 1) + (spec.totalsRow && spec.rows.length > 0 ? 1 : 0) + 1;
  ws.mergeCells(footerRowNum, 1, footerRowNum, lastCol);
  const footerCell = ws.getCell(footerRowNum, 1);
  footerCell.value = "Desenvolvido por Kobayashi Desenvolvimento de Sistemas  •  btreeambiental.com";
  footerCell.font = { name: "Arial", size: 9, italic: true, color: { argb: GRAY_TEXT } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
}

export async function exportStyledExcel(opts: ExcelSheetSpec & { filename: string }) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  wb.creator = "BTREE Ambiental";
  wb.created = new Date();
  addStyledSheet(wb, opts);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, opts.filename);
}

// Gera um único arquivo .xlsx com várias planilhas (uma aba do Excel por item de `sheets`).
export async function exportMultiSheetExcel(opts: { sheets: ExcelSheetSpec[]; filename: string }) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  wb.creator = "BTREE Ambiental";
  wb.created = new Date();
  for (const sheet of opts.sheets) {
    addStyledSheet(wb, sheet);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, opts.filename);
}
