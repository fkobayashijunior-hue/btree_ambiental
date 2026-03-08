import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const map = new Map<string, string>();
  cookieHeader.split(";").forEach(part => {
    const [key, ...val] = part.trim().split("=");
    if (key) map.set(key.trim(), decodeURIComponent(val.join("=")));
  });
  return map;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const cookies = parseCookies(opts.req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    if (sessionCookie) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "btree-secret-key");
      const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ["HS256"] });
      const userId = (payload as any).userId as string | undefined;
      const email = (payload as any).email as string | undefined;
      if (userId) {
        user = (await db.getUserById(parseInt(userId))) ?? null;
      } else if (email) {
        user = (await db.getUserByEmail(email)) ?? null;
      }
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
