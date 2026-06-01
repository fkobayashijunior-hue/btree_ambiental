import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1, role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-driver",
    email: "driver@test.com",
    name: "Motorista Teste",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("cargoLoads.getMyDriverInfo", () => {
  it("returns driver info structure for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.getMyDriverInfo();

    // Deve retornar a estrutura esperada
    expect(result).toHaveProperty("collaborator");
    expect(result).toHaveProperty("defaultTruckId");
    expect(result).toHaveProperty("trucks");
    expect(result).toHaveProperty("isDriver");
    expect(result).toHaveProperty("defaultMeasures");
    expect(Array.isArray(result.trucks)).toBe(true);

    // Medidas padrão devem ser as de eucalipto
    expect(result.defaultMeasures).toEqual({
      heightM: "2.4",
      widthM: "2.4",
      lengthM: "13.80",
    });
  });
});

describe("cargoLoads.getMyPendingLoads", () => {
  it("returns an array for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.getMyPendingLoads();

    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array when user has no linked collaborator", async () => {
    // User ID 99999 provavelmente não tem colaborador vinculado
    const ctx = createAuthContext(99999);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.getMyPendingLoads();

    expect(result).toEqual([]);
  });
});

describe("cargoLoads.listTrackingPhotos", () => {
  it("returns an array for a given cargo ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Cargo ID 1 pode ou não existir, mas a query deve retornar array
    const result = await caller.cargoLoads.listTrackingPhotos({ cargoId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cargoLoads.advanceTrackingWithPhoto", () => {
  it("rejects invalid cargo ID gracefully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Avançar tracking de um cargo que não existe deve funcionar (update sem match)
    const result = await caller.cargoLoads.advanceTrackingWithPhoto({
      cargoId: 999999,
      stage: "carregando",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("photoUrl", null);
  });

  it("advances tracking without photo", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.advanceTrackingWithPhoto({
      cargoId: 999999,
      stage: "em_transito",
      notes: "Saindo da roça",
    });

    expect(result.success).toBe(true);
    expect(result.photoUrl).toBeNull();
  });
});

describe("cargoLoads.listDestinations", () => {
  it("returns an array of destinations", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.listDestinations();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cargoLoads.listDrivers", () => {
  it("returns an array of drivers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.listDrivers();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cargoLoads.listTrucks", () => {
  it("returns an array of trucks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.listTrucks();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cargoLoads.createDestination with price fields", () => {
  it("creates a destination with pricePerTon and returns it in listDestinations", async () => {
    const ctx = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    // Create destination with price per ton
    const created = await caller.cargoLoads.createDestination({
      name: `Destino Teste Preço ${Date.now()}`,
      city: "Astorga",
      state: "PR",
      pricePerTon: "135.50",
      priceType: "ton",
    });

    expect(created).toHaveProperty("id");
    expect(created.id).toBeGreaterThan(0);

    // Verify it appears in listDestinations with price fields
    const list = await caller.cargoLoads.listDestinations();
    const found = list.find((d: any) => d.id === created.id);

    expect(found).toBeDefined();
    expect(found?.pricePerTon).toBe("135.50");
    expect(found?.priceType).toBe("ton");
  });

  it("creates a destination with pricePerM3", async () => {
    const ctx = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    const created = await caller.cargoLoads.createDestination({
      name: `Destino Teste M3 ${Date.now()}`,
      pricePerM3: "48.00",
      priceType: "m3",
    });

    expect(created).toHaveProperty("id");

    const list = await caller.cargoLoads.listDestinations();
    const found = list.find((d: any) => d.id === created.id);

    expect(found).toBeDefined();
    expect(found?.pricePerM3).toBe("48.00");
    expect(found?.priceType).toBe("m3");
  });

  it("creates a destination without price (price fields are null)", async () => {
    const ctx = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    const created = await caller.cargoLoads.createDestination({
      name: `Destino Sem Preço ${Date.now()}`,
    });

    expect(created).toHaveProperty("id");

    const list = await caller.cargoLoads.listDestinations();
    const found = list.find((d: any) => d.id === created.id);

    expect(found).toBeDefined();
    expect(found?.pricePerTon == null || found?.pricePerTon === "").toBe(true);
    expect(found?.pricePerM3 == null || found?.pricePerM3 === "").toBe(true);
  });
});

describe("cargoLoads.listDestinations shape", () => {
  it("each destination has the expected price fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.cargoLoads.listDestinations();

    expect(Array.isArray(list)).toBe(true);

    // If there are any destinations, check they have the new fields
    if (list.length > 0) {
      const first = list[0] as any;
      // These fields should exist (even if null)
      expect("pricePerTon" in first).toBe(true);
      expect("pricePerM3" in first).toBe(true);
      expect("priceType" in first).toBe(true);
    }
  });
});
