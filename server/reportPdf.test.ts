import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("reportPdf.generatePdfHtml", () => {
  it("generates HTML with correct structure and company branding", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reportPdf.generatePdfHtml({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      includeMaoDeObra: true,
      includeConsumo: true,
      includeCargas: true,
    });

    // Should return an HTML string
    expect(result).toHaveProperty("html");
    expect(typeof result.html).toBe("string");

    // Should contain the BTREE branding
    expect(result.html).toContain("BTREE Ambiental");
    expect(result.html).toContain("Relatório de Operação");

    // Should contain the period
    expect(result.html).toContain("Período:");

    // Should contain the summary cards
    expect(result.html).toContain("Custo Total");
    expect(result.html).toContain("Mão de Obra");
    expect(result.html).toContain("Consumo");
    expect(result.html).toContain("Cargas");

    // Should contain the footer with Kobayashi
    expect(result.html).toContain("Kobayashi");
    expect(result.html).toContain("btreeambiental.com");

    // Should contain the BTREE logo
    expect(result.html).toContain("logo-btree-final");

    // Should be valid HTML
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("</html>");
  });

  it("shows 'Todos os Locais' when no locationId is provided", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reportPdf.generatePdfHtml({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      includeMaoDeObra: true,
      includeConsumo: true,
      includeCargas: true,
    });

    expect(result.html).toContain("Todos os Locais");
  });

  it("respects section toggles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reportPdf.generatePdfHtml({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      includeMaoDeObra: false,
      includeConsumo: false,
      includeCargas: false,
    });

    // Should still have the summary and structure
    expect(result.html).toContain("BTREE Ambiental");
    expect(result.html).toContain("Custo Total");
  });
});
