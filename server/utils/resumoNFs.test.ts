import { describe, expect, it } from "vitest";
import { calcularResumoNFsSemBoleto, type NFParaResumo } from "./resumoNFs";

const HOJE = "2026-08-20";

describe("calcularResumoNFsSemBoleto", () => {
  it("NF cancelada nunca entra em nenhum card", () => {
    const nfs: NFParaResumo[] = [
      { valor: 1000, statusNfInterno: "cancelado", dataPagamentoConfirmado: HOJE, dataPrevisaoPagamento: HOJE },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r).toEqual({ vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0 });
  });

  it("NF paga soma em Recebidos usando a data de pagamento confirmado", () => {
    const nfs: NFParaResumo[] = [
      { valor: 500, statusNfInterno: "pago", dataPagamentoConfirmado: "2026-08-15", dataPrevisaoPagamento: "2026-08-10" },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.recebidos).toBe(500);
    expect(r.total).toBe(500);
  });

  it("NF paga fora do período (data de pagamento em outro mês) não entra no card do período filtrado", () => {
    const nfs: NFParaResumo[] = [
      { valor: 500, statusNfInterno: "pago", dataPagamentoConfirmado: "2026-07-15", dataPrevisaoPagamento: "2026-08-10" },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.recebidos).toBe(0);
    expect(r.total).toBe(0);
  });

  it("NF em aberto sem Data Previsão de Pagamento não entra em nenhum card", () => {
    const nfs: NFParaResumo[] = [
      { valor: 300, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: null },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r).toEqual({ vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0 });
  });

  it("NF em aberto com previsão vencida entra em Vencidos", () => {
    const nfs: NFParaResumo[] = [
      { valor: 200, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-08-10" },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.vencidos).toBe(200);
    expect(r.total).toBe(200);
  });

  it("NF em aberto com previsão hoje entra em Vencem hoje", () => {
    const nfs: NFParaResumo[] = [
      { valor: 200, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: HOJE },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.vencemHoje).toBe(200);
  });

  it("NF em aberto com previsão futura entra em A vencer", () => {
    const nfs: NFParaResumo[] = [
      { valor: 200, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-08-25" },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.aVencer).toBe(200);
  });

  it("NF em aberto com previsão fora do período filtrado é ignorada", () => {
    const nfs: NFParaResumo[] = [
      { valor: 200, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-09-05" },
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r.total).toBe(0);
  });

  it("combina múltiplas NFs com os 3 status", () => {
    const nfs: NFParaResumo[] = [
      { valor: 100, statusNfInterno: "cancelado", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-08-05" },
      { valor: 200, statusNfInterno: "pago", dataPagamentoConfirmado: "2026-08-12", dataPrevisaoPagamento: "2026-08-01" },
      { valor: 300, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-08-10" }, // vencido
      { valor: 400, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: HOJE },          // vence hoje
      { valor: 500, statusNfInterno: "em_aberto", dataPagamentoConfirmado: null, dataPrevisaoPagamento: "2026-08-30" },  // a vencer
    ];
    const r = calcularResumoNFsSemBoleto(nfs, 8, 2026, HOJE);
    expect(r).toEqual({ vencidos: 300, vencemHoje: 400, aVencer: 500, recebidos: 200, total: 1400 });
  });
});
