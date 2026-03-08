import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cargoLoads, collaborators, clients, equipment } from "../../drizzle/schema";
import { eq, desc, like, or, and, gte, lte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { cloudinaryUpload } from "../cloudinary";

export const cargoLoadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      clientId: z.number().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const results = await db.select().from(cargoLoads).orderBy(desc(cargoLoads.createdAt));

      let filtered = results;
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.driverName?.toLowerCase().includes(s) ||
          r.clientName?.toLowerCase().includes(s) ||
          r.destination?.toLowerCase().includes(s) ||
          r.invoiceNumber?.toLowerCase().includes(s) ||
          r.vehiclePlate?.toLowerCase().includes(s)
        );
      }
      if (input?.clientId) filtered = filtered.filter(r => r.clientId === input.clientId);
      if (input?.status) filtered = filtered.filter(r => r.status === input.status);

      return filtered;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const result = await db.select().from(cargoLoads).where(eq(cargoLoads.id, input.id)).limit(1);
      if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });
      return result[0];
    }),

  // Analisar foto de carga via IA e extrair dados automaticamente
  analyzePhoto: protectedProcedure
    .input(z.object({
      photoBase64: z.string(), // base64 da imagem
    }))
    .mutation(async ({ input }) => {
      // Upload da foto para o Cloudinary primeiro
      const uploaded = await cloudinaryUpload(input.photoBase64, "btree/cargo-analysis");

      // Analisar a imagem com IA
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair dados de documentos de transporte de lenha/madeira no Brasil.
Analise a imagem fornecida (pode ser um formulário de recebimento, ticket de pesagem, nota fiscal ou foto da carga) e extraia os dados disponíveis.
Retorne APENAS um JSON válido com os campos encontrados, sem texto adicional.
Se um campo não estiver visível ou legível, retorne null para esse campo.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem e extraia os dados de transporte/carga. Retorne um JSON com os campos: date (data no formato YYYY-MM-DD), vehiclePlate (placa do veículo), driverName (nome do motorista), heightM (altura em metros, apenas número), widthM (largura em metros, apenas número), lengthM (comprimento em metros, apenas número), volumeM3 (volume em m³, apenas número), woodType (tipo de lenha/madeira), destination (destino/estabelecimento), invoiceNumber (número da nota fiscal/NF), clientName (nome do cliente/empresa recebedora), notes (observações).",
              },
              {
                type: "image_url",
                image_url: { url: uploaded.url, detail: "high" },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cargo_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                date: { type: ["string", "null"], description: "Data no formato YYYY-MM-DD" },
                vehiclePlate: { type: ["string", "null"], description: "Placa do veículo" },
                driverName: { type: ["string", "null"], description: "Nome do motorista" },
                heightM: { type: ["string", "null"], description: "Altura em metros" },
                widthM: { type: ["string", "null"], description: "Largura em metros" },
                lengthM: { type: ["string", "null"], description: "Comprimento em metros" },
                volumeM3: { type: ["string", "null"], description: "Volume em m³" },
                woodType: { type: ["string", "null"], description: "Tipo de lenha/madeira" },
                destination: { type: ["string", "null"], description: "Destino/estabelecimento" },
                invoiceNumber: { type: ["string", "null"], description: "Número da nota fiscal" },
                clientName: { type: ["string", "null"], description: "Nome do cliente/empresa" },
                notes: { type: ["string", "null"], description: "Observações" },
              },
              required: ["date", "vehiclePlate", "driverName", "heightM", "widthM", "lengthM", "volumeM3", "woodType", "destination", "invoiceNumber", "clientName", "notes"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content;
      let extracted: Record<string, string | null> = {};
      try {
        extracted = typeof content === "string" ? JSON.parse(content) : (content as any);
      } catch {
        extracted = {};
      }

      return {
        photoUrl: uploaded.url,
        extracted,
      };
    }),

  // Upload de foto para uma carga existente
  uploadPhoto: protectedProcedure
    .input(z.object({
      cargoId: z.number(),
      photoBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const uploaded = await cloudinaryUpload(input.photoBase64, `btree/cargo/${input.cargoId}`);

      // Buscar fotos existentes
      const existing = await db.select({ photosJson: cargoLoads.photosJson })
        .from(cargoLoads).where(eq(cargoLoads.id, input.cargoId)).limit(1);
      
      let photos: string[] = [];
      if (existing[0]?.photosJson) {
        try { photos = JSON.parse(existing[0].photosJson); } catch { photos = []; }
      }
      photos.push(uploaded.url);

      await db.update(cargoLoads)
        .set({ photosJson: JSON.stringify(photos), updatedAt: new Date() })
        .where(eq(cargoLoads.id, input.cargoId));

      return { url: uploaded.url, photos };
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string(),
      widthM: z.string(),
      lengthM: z.string(),
      volumeM3: z.string(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.insert(cargoLoads).values({
        ...input,
        date: new Date(input.date),
        status: input.status || "pendente",
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string().optional(),
      widthM: z.string().optional(),
      lengthM: z.string().optional(),
      volumeM3: z.string().optional(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, date, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (date) updateData.date = new Date(date);

      await db.update(cargoLoads).set(updateData).where(eq(cargoLoads.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(cargoLoads).where(eq(cargoLoads.id, input.id));
      return { success: true };
    }),
});
