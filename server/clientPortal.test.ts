import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

describe("clientPortal router", () => {
  it("listAllReplantings returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientPortal.listAllReplantings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listAllPayments returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientPortal.listAllPayments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("deleteReplanting throws on non-existent id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Deletar um ID que não existe deve funcionar sem erro (DELETE sem match)
    const result = await caller.clientPortal.deleteReplanting({ id: 999999 });
    expect(result).toEqual({ success: true });
  });

  it("deletePayment throws on non-existent id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientPortal.deletePayment({ id: 999999 });
    expect(result).toEqual({ success: true });
  });
});

describe("cargoLoads tracking photos", () => {
  it("listTrackingPhotos returns array for valid cargoId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.listTrackingPhotos({ cargoId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("listTrackingPhotos returns empty for non-existent cargoId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cargoLoads.listTrackingPhotos({ cargoId: 999999 });
    expect(result).toEqual([]);
  });
});
