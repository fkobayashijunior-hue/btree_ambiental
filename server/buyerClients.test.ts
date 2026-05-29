import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "admin",
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
    res: {} as TrpcContext["res"],
  };
}

describe("buyerClients.addPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should insert a payment record and return success", async () => {
    const mockExecute = vi.fn().mockResolvedValue([{ insertId: 42 }]);
    const mockDb = { execute: mockExecute };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.buyerClients.addPayment({
      buyerId: 1,
      amount: "1500.00",
      paymentDate: "2026-05-29",
      paymentMethod: "pix",
      invoiceNumber: "NF-001",
      notes: "Pagamento referente às cargas de maio",
      status: "pago",
    });

    expect(result).toEqual({ success: true });
    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("should throw INTERNAL_SERVER_ERROR when db is unavailable", async () => {
    (getDb as any).mockResolvedValue(null);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.buyerClients.addPayment({
        buyerId: 1,
        amount: "1000.00",
        paymentDate: "2026-05-29",
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("buyerClients.updatePaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update payment status to 'pago' and return success", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    const mockDb = { update: mockUpdate };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.buyerClients.updatePaymentStatus({
      id: 5,
      status: "pago",
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});

describe("buyerClients.deletePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a payment and return success", async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const mockDb = { delete: mockDelete };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.buyerClients.deletePayment({ id: 3 });

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledOnce();
  });
});

describe("buyerClients.listActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of active buyers", async () => {
    const mockBuyers = [
      { id: 1, name: "Comprador A", active: 1, unit: "ton", pricePerUnit: "150.00" },
      { id: 2, name: "Comprador B", active: 1, unit: "m3", pricePerUnit: "80.00" },
    ];
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockBuyers),
        }),
      }),
    });
    const mockDb = { select: mockSelect };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.buyerClients.listActive();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Comprador A");
    expect(result[1].name).toBe("Comprador B");
  });
});
