import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { collaboratorDocuments, collaborators } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary"; // agora usa S3 internamente

const DOC_TYPES = ["cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"] as const;

export const collaboratorDocumentsRouter = router({
  // Listar documentos de um colaborador
  list: protectedProcedure
    .input(z.object({ collaboratorId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(collaboratorDocuments)
        .where(eq(collaboratorDocuments.collaboratorId, input.collaboratorId))
        .orderBy(desc(collaboratorDocuments.createdAt));
    }),

  // Adicionar documento (imagem ou PDF) — usa S3 via cloudinaryUpload helper
  add: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      type: z.enum(DOC_TYPES),
      title: z.string().min(2),
      fileBase64: z.string(), // base64 da imagem ou PDF (pode ter prefixo data:...)
      fileType: z.string().optional(), // "image/jpeg", "application/pdf"
      issueDate: z.string().optional(),
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Upload para S3 (cloudinaryUpload agora usa S3 internamente)
      const result = await cloudinaryUpload(input.fileBase64, "btree/documents");
      const fileUrl = result.url;

      const [inserted] = await db.insert(collaboratorDocuments).values({
        collaboratorId: input.collaboratorId,
        type: input.type,
        title: input.title,
        fileUrl,
        fileType: input.fileType,
        issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        notes: input.notes,
        uploadedBy: ctx.user.id,
      });

      const newId = (inserted as any).insertId;
      const created = await db.select().from(collaboratorDocuments)
        .where(eq(collaboratorDocuments.id, newId)).limit(1);
      return created[0];
    }),

  // Remover documento
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(collaboratorDocuments).where(eq(collaboratorDocuments.id, input.id));
      return { success: true };
    }),

  // Buscar colaborador com todos os dados para gerar PDF
  getForPdf: protectedProcedure
    .input(z.object({ collaboratorId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [collab] = await db.select().from(collaborators)
        .where(eq(collaborators.id, input.collaboratorId)).limit(1);

      if (!collab) throw new Error("Colaborador não encontrado");

      const docs = await db.select().from(collaboratorDocuments)
        .where(eq(collaboratorDocuments.collaboratorId, input.collaboratorId))
        .orderBy(desc(collaboratorDocuments.createdAt));

      return { collaborator: collab, documents: docs };
    }),
});
