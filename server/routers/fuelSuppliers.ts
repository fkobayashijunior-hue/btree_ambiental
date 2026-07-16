import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { fuelSuppliers, fuelPriceHistory, fuelInvoices, fuelSupplierPrices } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

export const fuelSuppliersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).orderBy(desc(fuelSuppliers.id));
  }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).where(eq(fuelSuppliers.isActive, 1)).orderBy(fuelSuppliers.name);
  }),

  listActiveByLocation: protectedProcedure
    .input(z.object({
      locationType: z.enum(["simflor", "astorga", "postos"]),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // First try new multi-price table
      if (input.fuelType) {
        const priceRows = await db.select({
          supplierId: fuelSupplierPrices.supplierId,
          fuelType: fuelSupplierPrices.fuelType,
          pricePerLiter: fuelSupplierPrices.pricePerLiter,
          locationType: fuelSupplierPrices.locationType,
        }).from(fuelSupplierPrices)
          .where(and(
            eq(fuelSupplierPrices.locationType, input.locationType),
            eq(fuelSupplierPrices.fuelType, input.fuelType),
            eq(fuelSupplierPrices.isActive, 1)
          ));
        if (priceRows.length > 0) {
          const supplierIds = priceRows.map(p => p.supplierId);
          const allSuppliers = await db.select().from(fuelSuppliers)
            .where(eq(fuelSuppliers.isActive, 1))
            .orderBy(fuelSuppliers.name);
          return allSuppliers
            .filter(s => supplierIds.includes(s.id))
            .map(s => {
              const price = priceRows.find(p => p.supplierId === s.id);
              return { ...s, pricePerLiter: price?.pricePerLiter || s.pricePerLiter, locationType: input.locationType };
            });
        }
      }
      // Fallback to old single-location/type per supplier
      return db.select().from(fuelSuppliers)
        .where(and(
          eq(fuelSuppliers.isActive, 1),
          eq(fuelSuppliers.locationType, input.locationType)
        ))
        .orderBy(fuelSuppliers.name);
    }),

  // ===== PREÇOS POR LOCAL/TIPO (nova tabela multi-preço) =====
  listSupplierPrices: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(fuelSupplierPrices)
        .where(eq(fuelSupplierPrices.supplierId, input.supplierId))
        .orderBy(fuelSupplierPrices.locationType, fuelSupplierPrices.fuelType);
    }),

  upsertSupplierPrice: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]),
      locationType: z.enum(["simflor", "astorga", "postos"]),
      pricePerLiter: z.string().min(1),
      isActive: z.number().optional().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check if exists
      const [existing] = await db.select().from(fuelSupplierPrices)
        .where(and(
          eq(fuelSupplierPrices.supplierId, input.supplierId),
          eq(fuelSupplierPrices.fuelType, input.fuelType),
          eq(fuelSupplierPrices.locationType, input.locationType)
        ));
      if (existing) {
        await db.update(fuelSupplierPrices).set({
          pricePerLiter: input.pricePerLiter,
          isActive: input.isActive ?? 1,
        }).where(eq(fuelSupplierPrices.id, existing.id));
        return { success: true, id: existing.id };
      } else {
        await db.insert(fuelSupplierPrices).values({
          supplierId: input.supplierId,
          fuelType: input.fuelType,
          locationType: input.locationType,
          pricePerLiter: input.pricePerLiter,
          isActive: input.isActive ?? 1,
        });
        return { success: true };
      }
    }),

  deleteSupplierPrice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(fuelSupplierPrices).where(eq(fuelSupplierPrices.id, input.id));
      return { success: true };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      contactName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).default("diesel"),
      pricePerLiter: z.string().min(1),
      locationType: z.enum(["simflor", "astorga", "postos"]).default("simflor"),
      location: z.string().optional(),
      workLocationId: z.number().optional(),
      notes: z.string().optional(),
      tankCapacity: z.string().optional(),
      tankAlertThreshold: z.string().optional(),
      vendorName: z.string().optional(),
      managerName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fuelSuppliers).values({
        name: input.name,
        tradeName: input.tradeName || null,
        cnpj: input.cnpj || null,
        phone: input.phone || null,
        email: input.email || null,
        contactName: input.contactName || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        fuelType: input.fuelType,
        pricePerLiter: input.pricePerLiter,
        locationType: input.locationType,
        location: input.location || null,
        workLocationId: input.workLocationId || null,
        notes: input.notes || null,
        tankCapacity: input.tankCapacity || null,
        tankAlertThreshold: input.tankAlertThreshold || '20',
        vendorName: input.vendorName || null,
        managerName: input.managerName || null,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      tradeName: z.string().nullable().optional(),
      cnpj: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      contactName: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).optional(),
      pricePerLiter: z.string().optional(),
      locationType: z.enum(["simflor", "astorga", "postos"]).optional(),
      location: z.string().nullable().optional(),
      workLocationId: z.number().nullable().optional(),
      isActive: z.number().optional(),
      notes: z.string().nullable().optional(),
      tankCapacity: z.string().nullable().optional(),
      tankAlertThreshold: z.string().nullable().optional(),
      vendorName: z.string().nullable().optional(),
      managerName: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.tradeName !== undefined) updateData.tradeName = data.tradeName;
      if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.contactName !== undefined) updateData.contactName = data.contactName;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.fuelType !== undefined) updateData.fuelType = data.fuelType;
      if (data.pricePerLiter !== undefined) updateData.pricePerLiter = data.pricePerLiter;
      if (data.locationType !== undefined) updateData.locationType = data.locationType;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.workLocationId !== undefined) updateData.workLocationId = data.workLocationId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.tankCapacity !== undefined) updateData.tankCapacity = data.tankCapacity;
      if (data.tankAlertThreshold !== undefined) updateData.tankAlertThreshold = data.tankAlertThreshold;
      if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
      if (data.managerName !== undefined) updateData.managerName = data.managerName;
      // If price changed, record in history
      if (data.pricePerLiter !== undefined) {
        const [existing] = await db.select({ pricePerLiter: fuelSuppliers.pricePerLiter }).from(fuelSuppliers).where(eq(fuelSuppliers.id, id));
        if (existing && existing.pricePerLiter !== data.pricePerLiter) {
          await db.insert(fuelPriceHistory).values({
            supplierId: id,
            oldPrice: existing.pricePerLiter,
            newPrice: data.pricePerLiter,
            changedBy: ctx.user?.id || null,
          });
        }
      }
      await db.update(fuelSuppliers).set(updateData).where(eq(fuelSuppliers.id, id));
      return { success: true };
    }),

  priceHistory: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.supplierId) {
        return db.select().from(fuelPriceHistory)
          .where(eq(fuelPriceHistory.supplierId, input.supplierId))
          .orderBy(desc(fuelPriceHistory.changedAt));
      }
      return db.select().from(fuelPriceHistory).orderBy(desc(fuelPriceHistory.changedAt));
    }),

  fuelReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get all vehicle records of type abastecimento
      const { vehicleRecords } = await import('../../drizzle/schema');
      const { gte, lte } = await import('drizzle-orm');
      let conditions: any[] = [eq(vehicleRecords.recordType, 'abastecimento')];
      if (input.startDate) {
        conditions.push(gte(vehicleRecords.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(vehicleRecords.date, input.endDate));
      }
      const records = await db.select().from(vehicleRecords).where(and(...conditions)).orderBy(desc(vehicleRecords.date));
      return records;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(fuelSuppliers).where(eq(fuelSuppliers.id, input.id));
      return { success: true };
    }),

  // ===== OCR - LEITURA AUTOMÁTICA DE NF POR FOTO =====
  extractInvoiceFromPhoto: protectedProcedure
    .input(z.object({
      photos: z.array(z.object({
        base64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
        label: z.string().default("nf"), // "nf" or "boleto"
      })).max(3).default([]),
      photoUrls: z.array(z.object({
        url: z.string().url(),
        label: z.string().default("nf"),
      })).max(3).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Collect photo URLs (either pre-uploaded from frontend or upload here)
      const uploadedPhotos: { label: string; url: string }[] = [];
      
      // If frontend already uploaded to Cloudinary, use those URLs directly
      if (input.photoUrls && input.photoUrls.length > 0) {
        for (const p of input.photoUrls) {
          uploadedPhotos.push({ label: p.label, url: p.url });
        }
        console.log('[OCR] Using pre-uploaded URLs:', uploadedPhotos.map(p => p.label).join(', '));
      }
      
      // Only upload base64 photos if no pre-uploaded URLs were provided
      if (uploadedPhotos.length === 0) {
      for (const photo of input.photos) {
        try {
          // Try Cloudinary first (works on Hostinger)
          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/djob7pxme/image/upload`;
          
          // Use JSON body approach which is more reliable across Node.js versions
          const cloudRes = await fetch(cloudinaryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: `data:${photo.mimeType};base64,${photo.base64}`,
              upload_preset: 'azaconnect',
              folder: 'btree-invoices',
            }),
          });
          
          if (cloudRes.ok) {
            const cloudData = await cloudRes.json();
            uploadedPhotos.push({ label: photo.label, url: cloudData.secure_url });
            console.log('[OCR] Cloudinary upload OK for', photo.label, cloudData.secure_url);
          } else {
            const errText = await cloudRes.text().catch(() => 'unknown');
            console.warn('[OCR] Cloudinary failed for', photo.label, 'status:', cloudRes.status, 'body:', errText.substring(0, 200));
            // Fallback to S3 if Cloudinary fails
            try {
              const buffer = Buffer.from(photo.base64, "base64");
              const ext = photo.mimeType.includes("png") ? "png" : "jpg";
              const randomSuffix = Math.random().toString(36).substring(2, 10);
              const fileKey = `invoices/${photo.label}-${Date.now()}-${randomSuffix}.${ext}`;
              const { url } = await storagePut(fileKey, buffer, photo.mimeType);
              uploadedPhotos.push({ label: photo.label, url });
              console.log('[OCR] S3 fallback OK for', photo.label);
            } catch (s3Err: any) {
              console.warn('[OCR] Both Cloudinary and S3 upload failed for', photo.label, s3Err?.message);
            }
          }
        } catch (err: any) {
          console.warn('[OCR] Cloudinary fetch error for', photo.label, err?.message);
          // Fallback to S3
          try {
            const buffer = Buffer.from(photo.base64, "base64");
            const ext = photo.mimeType.includes("png") ? "png" : "jpg";
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            const fileKey = `invoices/${photo.label}-${Date.now()}-${randomSuffix}.${ext}`;
            const { url } = await storagePut(fileKey, buffer, photo.mimeType);
            uploadedPhotos.push({ label: photo.label, url });
            console.log('[OCR] S3 fallback OK for', photo.label);
          } catch (s3Err: any) {
            console.warn('[OCR] Both Cloudinary and S3 upload failed for', photo.label, s3Err?.message);
          }
        }
      }
      } // end if (uploadedPhotos.length === 0)
      
      if (uploadedPhotos.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível fazer upload das fotos. Tente novamente." });
      }

      // 2. Build image content array for LLM
      const imageContents: any[] = uploadedPhotos.map(p => ({
        type: "image_url",
        image_url: { url: p.url, detail: "high" }
      }));

      const photoLabels = uploadedPhotos.map(p => p.label === 'boleto' ? 'boleto bancário' : 'nota fiscal').join(' e ');

      // 3. Use LLM vision to extract data from all photos
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair dados de notas fiscais e boletos brasileiros.
Analise TODAS as imagens enviadas (pode ser nota fiscal, boleto ou ambos) e extraia os seguintes dados em formato JSON:
- invoiceNumber: número da nota fiscal (apenas números)
- invoiceDate: data de emissão no formato YYYY-MM-DD
- dueDate: data de vencimento no formato YYYY-MM-DD
- totalAmount: valor total (apenas números com ponto decimal, ex: 17100.00)
- liters: quantidade em litros (apenas números, se houver)
- pricePerLiter: preço por litro (apenas números com ponto decimal, se houver)
- fuelType: tipo de combustível (diesel, gasolina, etanol ou gnv)
- bankName: nome do banco (se for boleto)
- barcodeNumber: linha digitável COMPLETA do boleto (todos os números incluindo pontos e espaços, se visível)
- transporterName: nome da transportadora (se houver)
- transporterPlate: placa do veículo (se houver)
- supplierName: razão social do fornecedor/emitente
- supplierCnpj: CNPJ do fornecedor/emitente
- deliveryLocation: local de entrega (se houver)
- paymentMethod: forma de pagamento (boleto, pix, transferencia, cheque, dinheiro)
Combine informações de TODAS as imagens. Se a NF tem dados do produto e o boleto tem dados de pagamento, combine ambos.
Retorne APENAS o JSON, sem texto adicional. Se um campo não for encontrado, use null.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia os dados destas imagens (${photoLabels}):` },
              ...imageContents
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "invoice_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                invoiceNumber: { type: ["string", "null"] },
                invoiceDate: { type: ["string", "null"] },
                dueDate: { type: ["string", "null"] },
                totalAmount: { type: ["string", "null"] },
                liters: { type: ["string", "null"] },
                pricePerLiter: { type: ["string", "null"] },
                fuelType: { type: ["string", "null"] },
                bankName: { type: ["string", "null"] },
                barcodeNumber: { type: ["string", "null"] },
                transporterName: { type: ["string", "null"] },
                transporterPlate: { type: ["string", "null"] },
                supplierName: { type: ["string", "null"] },
                supplierCnpj: { type: ["string", "null"] },
                deliveryLocation: { type: ["string", "null"] },
                paymentMethod: { type: ["string", "null"] },
              },
              required: ["invoiceNumber", "invoiceDate", "dueDate", "totalAmount", "liters", "pricePerLiter", "fuelType", "bankName", "barcodeNumber", "transporterName", "transporterPlate", "supplierName", "supplierCnpj", "deliveryLocation", "paymentMethod"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices?.[0]?.message?.content;
      let extracted: any = {};
      try {
        extracted = typeof content === "string" ? JSON.parse(content) : {};
      } catch {
        const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
        if (jsonMatch) {
          try { extracted = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
        }
      }

      const nfPhoto = uploadedPhotos.find(p => p.label === 'nf');
      const boletoPhoto = uploadedPhotos.find(p => p.label === 'boleto');

      return {
        invoicePhotoUrl: nfPhoto?.url || uploadedPhotos[0]?.url || null,
        boletoPhotoUrl: boletoPhoto?.url || null,
        extracted,
      };
    }),

  // ===== CONTAS A PAGAR (NOTAS FISCAIS / BOLETOS) =====
  listInvoices: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let conditions: any[] = [];
      if (input?.supplierId) conditions.push(eq(fuelInvoices.supplierId, input.supplierId));
      if (input?.status) conditions.push(eq(fuelInvoices.status, input.status));
      const invoices = conditions.length > 0
        ? await db.select().from(fuelInvoices).where(and(...conditions)).orderBy(desc(fuelInvoices.id))
        : await db.select().from(fuelInvoices).orderBy(desc(fuelInvoices.id));
      // Enrich with supplier name
      const suppliers = await db.select().from(fuelSuppliers);
      const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
      return invoices.map(inv => ({
        ...inv,
        supplierName: supplierMap[inv.supplierId]?.name || `Fornecedor #${inv.supplierId}`,
        supplierTradeName: supplierMap[inv.supplierId]?.tradeName || null,
      }));
    }),

  createInvoice: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string().min(1),
      dueDate: z.string().min(1),
      totalAmount: z.string().min(1),
      liters: z.string().optional(),
      pricePerLiter: z.string().optional(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).default("diesel"),
      paymentMethod: z.string().optional(),
      bankName: z.string().optional(),
      barcodeNumber: z.string().optional(),
      transporterName: z.string().optional(),
      transporterPlate: z.string().optional(),
      deliveryLocation: z.string().optional(),
      notes: z.string().optional(),
      invoicePhotoUrl: z.string().optional(),
      boletoPhotoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fuelInvoices).values({
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        totalAmount: input.totalAmount,
        liters: input.liters || null,
        pricePerLiter: input.pricePerLiter || null,
        fuelType: input.fuelType,
        paymentMethod: input.paymentMethod || null,
        bankName: input.bankName || null,
        barcodeNumber: input.barcodeNumber || null,
        transporterName: input.transporterName || null,
        transporterPlate: input.transporterPlate || null,
        deliveryLocation: input.deliveryLocation || null,
        notes: input.notes || null,
        invoicePhotoUrl: input.invoicePhotoUrl || null,
        boletoPhotoUrl: input.boletoPhotoUrl || null,
        registeredBy: ctx.user?.id || null,
      });
      // Notify Mary (financeiro) about new invoice
      try {
        const { notifyFinanceiro } = await import('./notifications');
        const supplier = await db.select().from(fuelSuppliers).where(eq(fuelSuppliers.id, input.supplierId));
        const supplierName = supplier[0]?.name || `Fornecedor #${input.supplierId}`;
        const dueDateFmt = input.dueDate.split('-').reverse().join('/');
        await notifyFinanceiro({
          type: 'pagamento_boleto',
          title: `Nova NF combustível: ${supplierName}`,
          message: `NF ${input.invoiceNumber} | Valor: R$ ${input.totalAmount} | Vencimento: ${dueDateFmt}`,
        });
      } catch (e) { console.warn('[Notification] Error notifying financeiro:', e); }
      return { success: true };
    }),

  updateInvoice: protectedProcedure
    .input(z.object({
      id: z.number(),
      supplierId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      dueDate: z.string().optional(),
      totalAmount: z.string().optional(),
      liters: z.string().nullable().optional(),
      pricePerLiter: z.string().nullable().optional(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).optional(),
      paymentMethod: z.string().nullable().optional(),
      bankName: z.string().nullable().optional(),
      barcodeNumber: z.string().nullable().optional(),
      status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
      paidAt: z.string().nullable().optional(),
      paidAmount: z.string().nullable().optional(),
      transporterName: z.string().nullable().optional(),
      transporterPlate: z.string().nullable().optional(),
      deliveryLocation: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }
      await db.update(fuelInvoices).set(updateData).where(eq(fuelInvoices.id, id));
      return { success: true };
    }),

  markInvoicePaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string().min(1),
      paidAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(fuelInvoices).set({
        status: "pago",
        paidAt: input.paidAt,
        paidAmount: input.paidAmount || null,
      }).where(eq(fuelInvoices.id, input.id));
      return { success: true };
    }),

  deleteInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(fuelInvoices).where(eq(fuelInvoices.id, input.id));
      return { success: true };
    }),

  // ===== SALDO DO TANQUE POR LOCAL =====
  tankStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { vehicleRecords } = await import('../../drizzle/schema');
    
    // Get suppliers with tank capacity (SIMFLOR and Astorga)
    const suppliers = await db.select().from(fuelSuppliers)
      .where(and(eq(fuelSuppliers.isActive, 1)));
    
    const tanksWithCapacity = suppliers.filter(s => s.tankCapacity && parseFloat(s.tankCapacity) > 0);
    
    const results = [];
    for (const supplier of tanksWithCapacity) {
      // Get the latest invoice for this supplier (most recent delivery)
      const latestInvoices = await db.select().from(fuelInvoices)
        .where(eq(fuelInvoices.supplierId, supplier.id))
        .orderBy(desc(fuelInvoices.id));
      
      // Sum all liters from invoices
      const totalDelivered = latestInvoices.reduce((sum, inv) => sum + parseFloat(inv.liters || '0'), 0);
      
      // Sum all liters used from vehicle records linked to this supplier's invoices
      const invoiceIds = latestInvoices.map(inv => inv.id);
      let totalUsed = 0;
      
      if (invoiceIds.length > 0) {
        // Get liters_used from invoices
        totalUsed = latestInvoices.reduce((sum, inv) => sum + parseFloat(inv.litersUsed || '0'), 0);
      }
      
      // Also count vehicle records that reference this supplier by name but have no invoice link
      const unlinkedRecords = await db.select().from(vehicleRecords)
        .where(and(
          eq(vehicleRecords.recordType, 'abastecimento'),
          eq(vehicleRecords.supplier, supplier.name)
        ));
      const unlinkedLiters = unlinkedRecords
        .filter(r => !r.fuelInvoiceId)
        .reduce((sum, r) => sum + parseFloat(r.liters || '0'), 0);
      
      const capacity = parseFloat(supplier.tankCapacity!);
      const currentLevel = Math.max(0, totalDelivered - totalUsed - unlinkedLiters);
      const percentage = capacity > 0 ? Math.round((currentLevel / capacity) * 100) : 0;
      const threshold = parseInt(supplier.tankAlertThreshold || '20');
      const isLow = percentage <= threshold;
      
      results.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        tradeName: supplier.tradeName,
        locationType: supplier.locationType,
        tankCapacity: capacity,
        currentLevel: Math.round(currentLevel),
        percentage: Math.min(100, percentage),
        threshold,
        isLow,
        totalDelivered,
        totalUsed: totalUsed + unlinkedLiters,
      });
    }
    return results;
  }),

  // ===== LISTAR NFs ATIVAS (com saldo) PARA VINCULAR NO ABASTECIMENTO =====
  activeInvoices: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let conditions: any[] = [eq(fuelInvoices.status, 'pendente')];
      if (input?.supplierId) conditions.push(eq(fuelInvoices.supplierId, input.supplierId));
      const invoices = await db.select().from(fuelInvoices).where(and(...conditions)).orderBy(desc(fuelInvoices.id));
      const suppliers = await db.select().from(fuelSuppliers);
      const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
      return invoices.map(inv => {
        const totalLiters = parseFloat(inv.liters || '0');
        const usedLiters = parseFloat(inv.litersUsed || '0');
        const remainingLiters = Math.max(0, totalLiters - usedLiters);
        return {
          ...inv,
          supplierName: supplierMap[inv.supplierId]?.name || '',
          remainingLiters,
          percentUsed: totalLiters > 0 ? Math.round((usedLiters / totalLiters) * 100) : 0,
        };
      }).filter(inv => {
        const totalLiters = parseFloat(inv.liters || '0');
        const usedLiters = parseFloat(inv.litersUsed || '0');
        return totalLiters === 0 || usedLiters < totalLiters; // Only show invoices with remaining liters
      });
    }),

  // ===== VINCULAR ABASTECIMENTO A UMA NF (atualizar liters_used) =====
  linkFuelingToInvoice: protectedProcedure
    .input(z.object({
      invoiceId: z.number(),
      liters: z.number(),
      vehicleRecordId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Get current invoice
      const [invoice] = await db.select().from(fuelInvoices).where(eq(fuelInvoices.id, input.invoiceId));
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "NF não encontrada" });
      
      const currentUsed = parseFloat(invoice.litersUsed || '0');
      const newUsed = currentUsed + input.liters;
      
      await db.update(fuelInvoices).set({
        litersUsed: newUsed.toFixed(1),
      }).where(eq(fuelInvoices.id, input.invoiceId));
      
      // Update vehicle record with invoice link if provided
      if (input.vehicleRecordId) {
        const { vehicleRecords } = await import('../../drizzle/schema');
        await db.update(vehicleRecords).set({
          fuelInvoiceId: input.invoiceId,
        }).where(eq(vehicleRecords.id, input.vehicleRecordId));
      }
      
      // Check tank level and notify if low
      const [supplier] = await db.select().from(fuelSuppliers).where(eq(fuelSuppliers.id, invoice.supplierId));
      if (supplier?.tankCapacity) {
        const capacity = parseFloat(supplier.tankCapacity);
        const threshold = parseInt(supplier.tankAlertThreshold || '20');
        // Calculate approximate tank level
        const allInvoices = await db.select().from(fuelInvoices).where(eq(fuelInvoices.supplierId, supplier.id));
        const totalDelivered = allInvoices.reduce((s, i) => s + parseFloat(i.liters || '0'), 0);
        const totalUsedAll = allInvoices.reduce((s, i) => s + parseFloat(i.litersUsed || '0'), 0) - currentUsed + newUsed;
        const currentLevel = Math.max(0, totalDelivered - totalUsedAll);
        const percentage = capacity > 0 ? Math.round((currentLevel / capacity) * 100) : 100;
        
        if (percentage <= threshold) {
          try {
            const { notifyFinanceiro } = await import('./notifications');
            const locationLabel = supplier.locationType === 'simflor' ? 'SIMFLOR' : supplier.locationType === 'astorga' ? 'Sede Astorga' : 'Postos';
            await notifyFinanceiro({
              type: 'pagamento_boleto',
              title: `🛢️ Tanque BAIXO: ${locationLabel}`,
              message: `O tanque de ${locationLabel} (${supplier.name}) está com apenas ${percentage}% — aproximadamente ${Math.round(currentLevel)}L de ${capacity}L.\nÉ necessário solicitar nova entrega de combustível.`,
            });
          } catch (e) { console.warn('[TankAlert] Error notifying:', e); }
          try {
            const { notifyOwner } = await import('../_core/notification');
            const locationLabel = supplier.locationType === 'simflor' ? 'SIMFLOR' : supplier.locationType === 'astorga' ? 'Sede Astorga' : 'Postos';
            await notifyOwner({
              title: `🛢️ Tanque BAIXO: ${locationLabel} — ${percentage}%`,
              content: `O tanque de ${locationLabel} (${supplier.name}) está com apenas ${Math.round(currentLevel)}L de ${capacity}L (${percentage}%).\nSolicite nova entrega de combustível.`,
            });
          } catch (e) { console.warn('[TankAlert] Error notifying owner:', e); }
        }
      }
      
      return { success: true, newUsed };
    }),
});
