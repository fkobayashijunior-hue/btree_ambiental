import { describe, it, expect } from "vitest";
import { subordinadosDe } from "./hierarquia";

describe("hierarquia: subordinados", () => {
  // Fabio (1) é superior de Mozart (2) e de Ana (3); Mozart é superior de Joao (4). Carla (5) não tem relação.
  const mapa = new Map<number, number>([[2, 1], [3, 1], [4, 2]]);
  it("inclui diretos e indiretos", () => {
    expect(Array.from(subordinadosDe(mapa, 1)).sort()).toEqual([2, 3, 4]);
  });
  it("Mozart só tem o Joao abaixo dele (não o Fabio nem a Ana)", () => {
    expect(Array.from(subordinadosDe(mapa, 2))).toEqual([4]);
  });
  it("quem não tem ninguém abaixo", () => {
    expect(subordinadosDe(mapa, 5).size).toBe(0);
  });
  it("não entra em laço se houver ciclo", () => {
    const ciclo = new Map<number, number>([[1, 2], [2, 1]]);
    expect(Array.from(subordinadosDe(ciclo, 1))).toEqual([2]);
  });
});
