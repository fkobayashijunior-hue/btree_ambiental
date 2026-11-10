import { describe, it, expect } from "vitest";
import { precoDaCarga, temPrecoEditado, normalizarPreco } from "./utils/precoCarga";

describe("preço editável da carga", () => {
  it("usa o preço editado quando existe, senão o do comprador", () => {
    expect(precoDaCarga({ buyer_price_override: "250", price_per_unit: "240" })).toBe(250);
    expect(precoDaCarga({ buyer_price_override: null, price_per_unit: "240" })).toBe(240);
    expect(precoDaCarga({ buyer_price_override: "", price_per_unit: "240,50" })).toBe(240.5);
    expect(precoDaCarga({})).toBe(0);
  });
  it("sabe se a carga tem preço editado", () => {
    expect(temPrecoEditado({ buyer_price_override: "250" })).toBe(true);
    expect(temPrecoEditado({ buyer_price_override: null })).toBe(false);
  });
  it("valida o preço digitado", () => {
    expect(normalizarPreco("250,5")).toBe("250.5");
    expect(normalizarPreco("")).toBeNull();
    expect(normalizarPreco(null)).toBeNull();
    expect(() => normalizarPreco("abc")).toThrow();
    expect(() => normalizarPreco("-1")).toThrow();
  });
});
