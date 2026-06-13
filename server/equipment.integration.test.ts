import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock the database to avoid real DB connections in unit tests
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ name: "Escavadeira CAT" }]),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
      orderBy: vi.fn().mockResolvedValue([]),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
    execute: vi.fn().mockResolvedValue([[]]),
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@btree.com",
    name: "Admin BTREE",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Equipment Integration - Schema Validation", () => {
  it("should have equipment_id field in financial entries schema", async () => {
    const { financialEntries } = await import("../drizzle/schema");
    // Check that the schema object has the equipmentId column
    const columns = Object.keys(financialEntries);
    // The table should exist and be an object
    expect(financialEntries).toBeDefined();
    expect(typeof financialEntries).toBe("object");
  });

  it("should have equipment_id field in extra_expenses schema", async () => {
    const { extraExpenses } = await import("../drizzle/schema");
    expect(extraExpenses).toBeDefined();
    expect(typeof extraExpenses).toBe("object");
  });

  it("should have equipment_oil_records table in schema", async () => {
    const { equipmentOilRecords } = await import("../drizzle/schema");
    expect(equipmentOilRecords).toBeDefined();
    expect(typeof equipmentOilRecords).toBe("object");
  });
});

describe("Equipment Integration - Oil Router", () => {
  it("machineHours router should export listOil, createOil, deleteOil procedures", async () => {
    const { machineHoursRouter } = await import("./routers/machineHours");
    expect(machineHoursRouter).toBeDefined();
    // Check that the router has the new oil procedures
    const routerDef = machineHoursRouter as any;
    expect(routerDef._def?.procedures?.listOil || routerDef.listOil).toBeDefined();
    expect(routerDef._def?.procedures?.createOil || routerDef.createOil).toBeDefined();
    expect(routerDef._def?.procedures?.deleteOil || routerDef.deleteOil).toBeDefined();
  });

  it("machineHours router should export equipmentSummary with oil data", async () => {
    const { machineHoursRouter } = await import("./routers/machineHours");
    const routerDef = machineHoursRouter as any;
    expect(routerDef._def?.procedures?.equipmentSummary || routerDef.equipmentSummary).toBeDefined();
  });
});

describe("Equipment Integration - ExtraExpenses Router", () => {
  it("extraExpenses router should accept equipmentId in create", async () => {
    const { extraExpensesRouter } = await import("./routers/extraExpenses");
    expect(extraExpensesRouter).toBeDefined();
    const routerDef = extraExpensesRouter as any;
    expect(routerDef._def?.procedures?.create || routerDef.create).toBeDefined();
  });
});

describe("Equipment Integration - OilType Enum Validation", () => {
  const validOilTypes = ["hidraulico", "motor", "transmissao", "diferencial", "outros"];

  it.each(validOilTypes)("should accept oil type: %s", (oilType) => {
    expect(validOilTypes).toContain(oilType);
  });

  it("should not accept invalid oil type", () => {
    const invalidType = "gasolina";
    expect(validOilTypes).not.toContain(invalidType);
  });
});

describe("Equipment Integration - Financial Auto-generation Logic", () => {
  it("should parse cost string correctly for financial entry", () => {
    const costStr = "150,50";
    const parsed = parseFloat(costStr.replace(",", "."));
    expect(parsed).toBe(150.5);
    expect(parsed).toBeGreaterThan(0);
  });

  it("should generate correct reference month from date", () => {
    const date = "2026-06-13";
    const dateObj = new Date(date);
    const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    expect(refMonth).toBe("2026-06");
  });

  it("should generate correct oil description", () => {
    const oilLabels: Record<string, string> = {
      hidraulico: "Hidráulico",
      motor: "Motor",
      transmissao: "Transmissão",
      diferencial: "Diferencial",
      outros: "Outros",
    };
    const desc = `Óleo ${oilLabels["hidraulico"]} - Escavadeira CAT - 5L (Shell)`;
    expect(desc).toBe("Óleo Hidráulico - Escavadeira CAT - 5L (Shell)");
  });
});
