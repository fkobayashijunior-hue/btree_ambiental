import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, passwordResetTokens } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  // Validação: precisa ter openId OU email
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId || null,
      name: user.name || '',
      email: user.email || '',
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      (values as any)[field] = value;
      updateSet[field] = value;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values(user);
  return result;
}

export async function updateUserPasswordByEmail(email: string, passwordHash: string, role: 'user' | 'admin' = 'admin') {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Primeiro verifica se o usuário existe
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (existing.length > 0) {
    // Atualizar usuário existente
    await db.update(users)
      .set({ passwordHash, loginMethod: 'email', role, updatedAt: new Date() })
      .where(eq(users.email, email));
    return { action: 'updated' };
  } else {
    // Criar novo usuário
    await db.insert(users).values({
      email,
      name: email.split('@')[0],
      passwordHash,
      loginMethod: 'email',
      role,
      lastSignedIn: new Date(),
    });
    return { action: 'created' };
  }
}

export async function createPasswordResetToken(userId: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Expirar tokens anteriores do mesmo usuário
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

  // Criar novo token válido por 1 hora
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getValidResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const result = await db.select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expiresAt, now),
      eq(passwordResetTokens.usedAt, null as any)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function markTokenAsUsed(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

/**
 * Auto-vincular collaborator ao user pelo email quando faz login OAuth.
 * Se o collaborator já tem user_id, não faz nada.
 */
export async function linkCollaboratorToUser(email: string, openId: string): Promise<void> {
  if (!email) return;
  const db = await getDb();
  if (!db) return;

  const { collaborators } = await import("../drizzle/schema");

  // Buscar o user pelo openId para pegar o id
  const user = await getUserByOpenId(openId);
  if (!user) return;

  // Buscar collaborator pelo email que ainda não tem user_id
  const [collab] = await db.select({ id: collaborators.id, userId: collaborators.userId })
    .from(collaborators)
    .where(eq(collaborators.email, email))
    .limit(1);

  if (collab && !collab.userId) {
    await db.update(collaborators)
      .set({ userId: user.id })
      .where(eq(collaborators.id, collab.id));
    console.log(`[OAuth] Linked collaborator ${collab.id} to user ${user.id} (email: ${email})`);
  }
}

// TODO: add feature queries here as your schema grows.
