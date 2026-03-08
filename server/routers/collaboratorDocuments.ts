import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { collaboratorDocuments, collaborators } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";

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

  // Adicionar documento
  add: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      type: z.enum(DOC_TYPES),
      title: z.string().min(2),
      fileBase64: z.string(), // base64 da imagem ou PDF
      fileType: z.string().optional(), // "image/jpeg", "application/pdf"
      issueDate: z.string().optional(), // ISO date string
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Upload para Cloudinary
      const folder = "btree/documents";
      let fileUrl: string;

      if (input.fileBase64.startsWith("data:application/pdf") || input.fileType === "application/pdf") {
        // PDF — upload como raw
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const CLOUD_NAME = "djob7pxme";
        const UPLOAD_PRESET = "btree_ambiental";
        const formData = new FormData();
        formData.append("file", `data:application/pdf;base64,${base64Data}`);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", folder);
        formData.append("resource_type", "raw");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Falha ao fazer upload do PDF");
        const json = await res.json();
        fileUrl = json.secure_url;
      } else {
        // Imagem
        const result = await cloudinaryUpload(input.fileBase64, folder);
        fileUrl = result.url;
      }

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
