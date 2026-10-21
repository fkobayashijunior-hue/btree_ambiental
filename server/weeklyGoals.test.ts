import { describe, it, expect } from "vitest";
import {
  weekBounds, addDays, papelNaMeta, podeEditarMeta, podeRelatar, tiposMensagemPermitidos,
  calcularProgresso, calcularAlertas, normalizaDestino,
} from "./utils/weeklyGoals";

describe("weekBounds (sábado a sexta)", () => {
  it("quarta 01/10/2026 pertence à semana 26/09 a 02/10", () => {
    const w = weekBounds("2026-09-30"); // quarta
    expect(w.start).toBe("2026-09-26");
    expect(w.end).toBe("2026-10-02");
    expect(w.days).toHaveLength(7);
    expect(w.days[0]).toBe("2026-09-26");
  });
  it("sábado inicia a própria semana e sexta a encerra", () => {
    expect(weekBounds("2026-09-26").start).toBe("2026-09-26");
    expect(weekBounds("2026-10-02").start).toBe("2026-09-26");
    expect(weekBounds("2026-10-03").start).toBe("2026-10-03");
  });
  it("domingo e segunda ficam na semana que começou no sábado anterior", () => {
    expect(weekBounds("2026-09-27").start).toBe("2026-09-26");
    expect(weekBounds("2026-09-28").start).toBe("2026-09-26");
  });
  it("addDays atravessa virada de mês", () => {
    expect(addDays("2026-09-30", 2)).toBe("2026-10-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("papéis e permissões", () => {
  const meta = { responsibleUserId: 10, createdBy: 1 };
  it("identifica cada papel", () => {
    expect(papelNaMeta({ id: 99, isAdmin: true }, meta, [])).toBe("admin");
    expect(papelNaMeta({ id: 1, isAdmin: false }, meta, [])).toBe("criador");
    expect(papelNaMeta({ id: 10, isAdmin: false }, meta, [])).toBe("responsavel");
    expect(papelNaMeta({ id: 5, isAdmin: false }, meta, [5, 6])).toBe("supervisor");
    expect(papelNaMeta({ id: 7, isAdmin: false }, meta, [5, 6])).toBeNull();
  });
  it("quem pode o quê", () => {
    expect(podeRelatar("responsavel")).toBe(true);
    expect(podeRelatar("supervisor")).toBe(false);
    expect(podeEditarMeta("supervisor")).toBe(false);
    expect(podeEditarMeta("criador")).toBe(true);
    expect(tiposMensagemPermitidos("responsavel")).not.toContain("pergunta");
    expect(tiposMensagemPermitidos("supervisor")).toContain("pergunta");
    expect(tiposMensagemPermitidos(null)).toHaveLength(0);
  });
});

describe("calcularProgresso", () => {
  const dias = weekBounds("2026-09-30").days;
  const itens = [
    { id: 1, destinationId: 7, targetCargas: 3, dias: [{ data: "2026-09-28", target: 1 }, { data: "2026-09-30", target: 1 }, { data: "2026-10-02", target: 1 }] },
    { id: 2, destinationId: 8, targetCargas: 2, dias: [] },
  ];
  const cargas = [
    { id: 1, data: "2026-09-28", destinationId: 7, status: "entregue" },
    { id: 2, data: "2026-09-30", destinationId: 7, status: "pendente" },
    { id: 3, data: "2026-09-30", destinationId: 10007, status: "entregue" }, // legado +10000
    { id: 4, data: "2026-09-29", destinationId: 8, status: "cancelado" },    // ignorada
    { id: 5, data: "2026-09-29", destinationId: 8, status: "pendente" },
    { id: 6, data: "2026-09-29", destinationId: 99, status: "pendente" },    // outro comprador
  ];
  const r = calcularProgresso(itens, cargas, dias);

  it("conta por comprador, ignora canceladas e normaliza id legado", () => {
    expect(normalizaDestino(10007)).toBe(7);
    expect(r.itens[0].carregadas).toBe(3);
    expect(r.itens[0].entregues).toBe(2);
    expect(r.itens[1].carregadas).toBe(1);
    expect(r.itens[0].pct).toBe(100);
    expect(r.itens[1].pct).toBe(50);
  });
  it("planejado por dia só existe quando foi informado", () => {
    expect(r.itens[0].porDia.find(d => d.data === "2026-09-28")!.planejado).toBe(1);
    expect(r.itens[0].porDia.find(d => d.data === "2026-09-29")!.planejado).toBe(0);
    expect(r.itens[1].porDia[0].planejado).toBeNull();
  });
  it("total não deixa o excedente de um comprador cobrir a falta de outro", () => {
    const extra = calcularProgresso([{ id: 1, destinationId: 7, targetCargas: 1, dias: [] }, { id: 2, destinationId: 8, targetCargas: 1, dias: [] }],
      [{ id: 1, data: "2026-09-28", destinationId: 7, status: "pendente" }, { id: 2, data: "2026-09-29", destinationId: 7, status: "pendente" }], dias);
    expect(extra.total.carregadas).toBe(1);
    expect(extra.total.meta).toBe(2);
    expect(extra.total.pct).toBe(50);
  });
});

describe("calcularAlertas", () => {
  const base = {
    status: "em_andamento", ack: "de_acordo" as const, hoje: "2026-09-30", semana: { start: "2026-09-26", end: "2026-10-02" },
    relatosHoje: 1, fechouHoje: false, problemaHoje: false, perguntasSemResposta: 0, pctMeta: 50, diasDecorridos: 4,
  };
  it("sem alertas quando tudo certo", () => expect(calcularAlertas(base)).toEqual([]));
  it("detecta ciência, relato, problema e pergunta", () => {
    const a = calcularAlertas({ ...base, ack: "pendente", relatosHoje: 0, problemaHoje: true, perguntasSemResposta: 2 });
    expect(a).toEqual(expect.arrayContaining(["ciencia_pendente", "sem_relato_hoje", "problema_hoje", "pergunta_sem_resposta"]));
  });
  it("alerta de ritmo só depois do 3º dia e quando está 25 pontos abaixo", () => {
    expect(calcularAlertas({ ...base, pctMeta: 20, diasDecorridos: 4 })).toContain("atrasada_no_ritmo");
    expect(calcularAlertas({ ...base, pctMeta: 20, diasDecorridos: 2 })).not.toContain("atrasada_no_ritmo");
    expect(calcularAlertas({ ...base, pctMeta: 50, diasDecorridos: 4 })).not.toContain("atrasada_no_ritmo");
  });
  it("metas encerradas não geram alerta", () => {
    expect(calcularAlertas({ ...base, status: "encerrada", ack: "pendente" })).toEqual([]);
  });
});

describe("meta em negociação", () => {
  const base = {
    status: "em_negociacao", ack: "com_ressalva" as const, hoje: "2026-09-30", semana: { start: "2026-09-26", end: "2026-10-02" },
    relatosHoje: 0, fechouHoje: false, problemaHoje: false, perguntasSemResposta: 0, pctMeta: 0, diasDecorridos: 5,
  };
  it("só mostra o alerta de negociação (não cobra relato nem ritmo)", () => {
    expect(calcularAlertas(base)).toEqual(["em_negociacao"]);
  });
  it("pergunta sem resposta continua aparecendo", () => {
    expect(calcularAlertas({ ...base, perguntasSemResposta: 1 })).toEqual(["em_negociacao", "pergunta_sem_resposta"]);
  });
});
