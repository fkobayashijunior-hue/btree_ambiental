import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";

// Helper to get a fresh DB connection
async function getConnection() {
  return mysql.createConnection(process.env.DATABASE_URL!);
}

// Helper to create a notification
export async function createNotification(params: {
  recipientUserId: number;
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria' | 'fechamento_carga' | 'fechamento_semanal' | 'geral';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO notifications (recipient_user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)`,
      [params.recipientUserId, params.type, params.title, params.message || null, params.relatedId || null, params.relatedType || null]
    );
  } finally {
    await conn.end();
  }
}

// Helper to notify multiple users
export async function notifyUsers(params: {
  recipientUserIds: number[];
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria' | 'fechamento_carga' | 'fechamento_semanal' | 'geral';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  const conn = await getConnection();
  try {
    for (const userId of params.recipientUserIds) {
      await conn.execute(
        `INSERT INTO notifications (recipient_user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, params.type, params.title, params.message || null, params.relatedId || null, params.relatedType || null]
      );
    }
  } finally {
    await conn.end();
  }
}

// Helper to find users by role or name for notification targeting
export async function findUsersByRole(role: 'admin' | 'user'): Promise<number[]> {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE role = ?`,
      [role]
    ) as any;
    return rows.map((r: any) => r.id);
  } finally {
    await conn.end();
  }
}

// Find user by name (partial match)
export async function findUserByName(name: string): Promise<number | null> {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE name LIKE ? LIMIT 1`,
      [`%${name}%`]
    ) as any;
    return rows.length > 0 ? rows[0].id : null;
  } finally {
    await conn.end();
  }
}

// Notify financeiro (Julia Mary)
export async function notifyFinanceiro(params: {
  type: 'solicitacao_peca' | 'pagamento_boleto' | 'pagamento_diaria';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  // Find Julia Mary by name
  let juliaId = await findUserByName("Julia");
  if (!juliaId) juliaId = await findUserByName("julia");
  
  // Also notify all admins
  const adminIds = await findUsersByRole('admin');
  
  const allRecipients = new Set<number>();
  if (juliaId) allRecipients.add(juliaId);
  adminIds.forEach(id => allRecipients.add(id));
  
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params,
    });
  }
}

// Notify ADM/Comercial (Fábio)
export async function notifyAdmComercial(params: {
  type: 'fechamento_carga' | 'fechamento_semanal';
  title: string;
  message?: string;
  relatedId?: number;
  relatedType?: string;
}) {
  // Find Fábio by name
  let fabioId = await findUserByName("Fábio");
  if (!fabioId) fabioId = await findUserByName("Fabio");
  
  // Also notify all admins
  const adminIds = await findUsersByRole('admin');
  
  const allRecipients = new Set<number>();
  if (fabioId) allRecipients.add(fabioId);
  adminIds.forEach(id => allRecipients.add(id));
  
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params,
    });
  }
}

export const notificationsRouter = router({
  // List notifications for current user
  list: protectedProcedure
    .input(z.object({
      onlyUnread: z.boolean().optional().default(false),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        const onlyUnread = input?.onlyUnread ?? false;
        const limit = input?.limit ?? 50;
        
        let query = `SELECT * FROM notifications WHERE recipient_user_id = ?`;
        const params: any[] = [ctx.user.id];
        
        if (onlyUnread) {
          query += ` AND is_read = 0`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);
        
        const [rows] = await conn.execute(query, params) as any;
        return rows;
      } finally {
        await conn.end();
      }
    }),

  // Get unread count
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const conn = await getConnection();
      try {
        const [rows] = await conn.execute(
          `SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = ? AND is_read = 0`,
          [ctx.user.id]
        ) as any;
        return { count: rows[0]?.count || 0 };
      } finally {
        await conn.end();
      }
    }),

  // Mark one as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?`,
          [input.id, ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND is_read = 0`,
          [ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  // Delete a notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        await conn.execute(
          `DELETE FROM notifications WHERE id = ? AND recipient_user_id = ?`,
          [input.id, ctx.user.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),
});
