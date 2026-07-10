var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t, router, publicProcedure, requireUser, protectedProcedure, adminProcedure;
var init_trpc = __esm({
  "server/_core/trpc.ts"() {
    "use strict";
    init_const();
    t = initTRPC.context().create({
      transformer: superjson
    });
    router = t.router;
    publicProcedure = t.procedure;
    requireUser = t.middleware(async (opts) => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      return next({
        ctx: {
          ...ctx,
          user: ctx.user
        }
      });
    });
    protectedProcedure = t.procedure.use(requireUser);
    adminProcedure = t.procedure.use(
      t.middleware(async (opts) => {
        const { ctx, next } = opts;
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }
        return next({
          ctx: {
            ...ctx,
            user: ctx.user
          }
        });
      })
    );
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendanceRecords: () => attendanceRecords,
  autoFreightTrips: () => autoFreightTrips,
  biometricAttendance: () => biometricAttendance,
  buyerClients: () => buyerClients,
  buyerPayments: () => buyerPayments,
  buyerPriceHistory: () => buyerPriceHistory,
  cargoDestinations: () => cargoDestinations,
  cargoLoads: () => cargoLoads,
  cargoShipments: () => cargoShipments,
  cargoTrackingPhotos: () => cargoTrackingPhotos,
  cargoWeeklyClosings: () => cargoWeeklyClosings,
  chainsawChainEvents: () => chainsawChainEvents,
  chainsawChainStock: () => chainsawChainStock,
  chainsawPartMovements: () => chainsawPartMovements,
  chainsawParts: () => chainsawParts,
  chainsawServiceOrders: () => chainsawServiceOrders,
  chainsawServiceParts: () => chainsawServiceParts,
  chainsaws: () => chainsaws,
  clientAdvanceDeductions: () => clientAdvanceDeductions,
  clientAdvances: () => clientAdvances,
  clientContracts: () => clientContracts,
  clientDocuments: () => clientDocuments,
  clientPaymentReceipts: () => clientPaymentReceipts,
  clientPayments: () => clientPayments,
  clientPortalAccess: () => clientPortalAccess,
  clients: () => clients,
  collaboratorAttendance: () => collaboratorAttendance,
  collaboratorDocuments: () => collaboratorDocuments,
  collaborators: () => collaborators,
  equipment: () => equipment,
  equipmentMaintenance: () => equipmentMaintenance,
  equipmentOilRecords: () => equipmentOilRecords,
  equipmentPhotos: () => equipmentPhotos,
  equipmentTypes: () => equipmentTypes,
  extraExpenses: () => extraExpenses,
  farmGeofences: () => farmGeofences,
  financialEntries: () => financialEntries,
  freightCalculations: () => freightCalculations,
  freightCycles: () => freightCycles,
  freightRates: () => freightRates,
  fuelContainerEvents: () => fuelContainerEvents,
  fuelContainers: () => fuelContainers,
  fuelInvoices: () => fuelInvoices,
  fuelPriceHistory: () => fuelPriceHistory,
  fuelRecords: () => fuelRecords,
  fuelSuppliers: () => fuelSuppliers,
  gpsDeviceLinks: () => gpsDeviceLinks,
  gpsHoursLog: () => gpsHoursLog,
  gpsLocations: () => gpsLocations,
  machineFuel: () => machineFuel,
  machineHours: () => machineHours,
  machineMaintenance: () => machineMaintenance,
  maintenanceParts: () => maintenanceParts,
  maintenanceTemplateParts: () => maintenanceTemplateParts,
  maintenanceTemplates: () => maintenanceTemplates,
  notifications: () => notifications,
  oilStock: () => oilStock,
  parts: () => parts,
  partsRequests: () => partsRequests,
  partsStockMovements: () => partsStockMovements,
  passwordResetTokens: () => passwordResetTokens,
  preventiveMaintenanceAlerts: () => preventiveMaintenanceAlerts,
  preventiveMaintenancePlans: () => preventiveMaintenancePlans,
  purchaseCategories: () => purchaseCategories,
  purchaseOrderItems: () => purchaseOrderItems,
  purchaseOrders: () => purchaseOrders,
  purchaseRequestItems: () => purchaseRequestItems,
  purchaseRequests: () => purchaseRequests,
  quotationRequests: () => quotationRequests,
  quotationResponses: () => quotationResponses,
  quotations: () => quotations,
  replantingRecords: () => replantingRecords,
  rolePermissions: () => rolePermissions,
  sectors: () => sectors,
  suppliers: () => suppliers,
  thirdPartyContractors: () => thirdPartyContractors,
  thirdPartyFuel: () => thirdPartyFuel,
  userPermissions: () => userPermissions,
  userProfiles: () => userProfiles,
  users: () => users,
  vehicleRecords: () => vehicleRecords
});
import { mysqlTable, int, bigint, timestamp, mysqlEnum, varchar, text, index, tinyint, datetime } from "drizzle-orm/mysql-core";
var attendanceRecords, biometricAttendance, cargoDestinations, cargoLoads, cargoShipments, chainsawChainEvents, chainsawChainStock, chainsawPartMovements, chainsawParts, chainsawServiceOrders, chainsawServiceParts, chainsaws, clientContracts, clientPaymentReceipts, clientPayments, clientPortalAccess, clients, collaboratorAttendance, collaboratorDocuments, collaborators, equipment, equipmentMaintenance, equipmentPhotos, equipmentTypes, extraExpenses, financialEntries, fuelContainerEvents, fuelContainers, fuelRecords, gpsDeviceLinks, gpsHoursLog, gpsLocations, machineFuel, machineHours, equipmentOilRecords, oilStock, machineMaintenance, maintenanceParts, maintenanceTemplateParts, maintenanceTemplates, parts, partsRequests, partsStockMovements, passwordResetTokens, preventiveMaintenanceAlerts, preventiveMaintenancePlans, purchaseOrderItems, purchaseOrders, replantingRecords, rolePermissions, sectors, userPermissions, userProfiles, users, vehicleRecords, cargoTrackingPhotos, cargoWeeklyClosings, clientDocuments, buyerClients, buyerPriceHistory, buyerPayments, freightCalculations, notifications, fuelSuppliers, fuelPriceHistory, fuelInvoices, autoFreightTrips, thirdPartyContractors, purchaseCategories, purchaseRequests, purchaseRequestItems, suppliers, quotations, farmGeofences, freightCycles, quotationRequests, quotationResponses, freightRates, thirdPartyFuel, clientAdvances, clientAdvanceDeductions;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    attendanceRecords = mysqlTable("attendance_records", {
      id: int().autoincrement().notNull(),
      userId: int("user_id").notNull().references(() => users.id),
      date: timestamp({ mode: "string" }).notNull(),
      employmentType: mysqlEnum("employment_type", ["clt", "terceirizado", "diarista"]).notNull(),
      dailyValue: varchar("daily_value", { length: 20 }).notNull(),
      pixKey: varchar("pix_key", { length: 255 }).notNull(),
      function: varchar({ length: 100 }).notNull(),
      observations: text(),
      paymentStatus: mysqlEnum("payment_status", ["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
      paidAt: timestamp("paid_at", { mode: "string" }),
      paidBy: int("paid_by").references(() => users.id),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    biometricAttendance = mysqlTable("biometric_attendance", {
      id: int().autoincrement().notNull(),
      collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
      date: timestamp({ mode: "string" }).notNull(),
      checkInTime: timestamp("check_in_time", { mode: "string" }).notNull(),
      checkOutTime: timestamp("check_out_time", { mode: "string" }),
      location: varchar({ length: 255 }),
      latitude: varchar({ length: 20 }),
      longitude: varchar({ length: 20 }),
      photoUrl: text("photo_url"),
      confidence: varchar({ length: 10 }),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    cargoDestinations = mysqlTable("cargo_destinations", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      address: varchar({ length: 500 }),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      notes: text(),
      active: int().default(1).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      createdBy: int("created_by"),
      clientId: int("client_id"),
      pricePerTon: varchar("price_per_ton", { length: 20 }),
      pricePerM3: varchar("price_per_m3", { length: 20 }),
      priceType: varchar("price_type", { length: 10 }).default("ton"),
      // Campos de comprador (unificação)
      isBuyer: tinyint("is_buyer").default(0),
      cnpjCpf: varchar("cnpj_cpf", { length: 30 }),
      inscricaoEstadual: varchar("inscricao_estadual", { length: 30 }),
      phone: varchar({ length: 30 }),
      email: varchar({ length: 255 }),
      cep: varchar({ length: 10 }),
      contactPerson: varchar("contact_person", { length: 255 }),
      product: varchar({ length: 255 }),
      paymentMethod: varchar("payment_method", { length: 100 }),
      pricePerUnit: varchar("price_per_unit", { length: 20 }),
      unit: varchar({ length: 20 }).default("ton")
    });
    cargoLoads = mysqlTable("cargo_loads", {
      id: int().autoincrement().notNull(),
      date: timestamp({ mode: "string" }).notNull(),
      vehicleId: int("vehicle_id"),
      vehiclePlate: varchar("vehicle_plate", { length: 20 }),
      driverCollaboratorId: int("driver_collaborator_id"),
      driverName: varchar("driver_name", { length: 255 }),
      heightM: varchar("height_m", { length: 20 }).notNull(),
      widthM: varchar("width_m", { length: 20 }).notNull(),
      lengthM: varchar("length_m", { length: 20 }).notNull(),
      volumeM3: varchar("volume_m3", { length: 20 }).notNull(),
      woodType: varchar("wood_type", { length: 100 }),
      destination: varchar({ length: 255 }),
      invoiceNumber: varchar("invoice_number", { length: 100 }),
      clientId: int("client_id"),
      clientName: varchar("client_name", { length: 255 }),
      photosJson: text("photos_json"),
      notes: text(),
      status: mysqlEnum(["pendente", "entregue", "cancelado"]).default("pendente").notNull(),
      registeredBy: int("registered_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      weightKg: varchar("weight_kg", { length: 20 }),
      destinationId: int("destination_id"),
      trackingStatus: mysqlEnum("tracking_status", ["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).default("aguardando"),
      trackingUpdatedAt: timestamp("tracking_updated_at", { mode: "string" }),
      trackingNotes: text("tracking_notes"),
      weightOutPhotoUrl: text("weight_out_photo_url"),
      weightInPhotoUrl: text("weight_in_photo_url"),
      weightOutKg: varchar("weight_out_kg", { length: 20 }),
      weightInKg: varchar("weight_in_kg", { length: 20 }),
      finalHeightM: varchar("final_height_m", { length: 20 }),
      finalWidthM: varchar("final_width_m", { length: 20 }),
      finalLengthM: varchar("final_length_m", { length: 20 }),
      finalVolumeM3: varchar("final_volume_m3", { length: 20 }),
      workLocationId: int("work_location_id"),
      weightNetKg: varchar("weight_net_kg", { length: 20 }),
      invoiceUrl: text("invoice_url"),
      boletoUrl: text("boleto_url"),
      boletoAmount: varchar("boleto_amount", { length: 20 }),
      boletoDueDate: timestamp("boleto_due_date", { mode: "string" }),
      paymentReceiptUrl: text("payment_receipt_url"),
      paymentStatus: mysqlEnum("payment_status", ["sem_boleto", "a_pagar", "pago"]).default("sem_boleto"),
      paidAt: timestamp("paid_at", { mode: "string" }),
      humidity: varchar({ length: 20 }),
      deliveryDate: timestamp("delivery_date", { mode: "string" }),
      receivedByBuyer: int("received_by_buyer").default(0).notNull(),
      receivedAt: timestamp("received_at", { mode: "string" }),
      receiverName: varchar("receiver_name", { length: 255 }),
      thirdPartyContractor: varchar("third_party_contractor", { length: 255 }),
      thirdPartyCost: varchar("third_party_cost", { length: 20 }),
      thirdPartyPaid: tinyint("third_party_paid").default(0),
      thirdPartyPaidAt: datetime("third_party_paid_at"),
      thirdPartyPaymentNotes: text("third_party_payment_notes"),
      invoiceChecked: int("invoice_checked").default(0).notNull(),
      invoiceCheckedAt: bigint("invoice_checked_at", { mode: "number" }).notNull().default(0),
      invoiceCheckedBy: int("invoice_checked_by"),
      invoiceCheckedByName: varchar("invoice_checked_by_name", { length: 255 })
    });
    cargoShipments = mysqlTable("cargo_shipments", {
      id: int().autoincrement().notNull(),
      truckId: int("truck_id").notNull().references(() => equipment.id),
      driverId: int("driver_id").notNull().references(() => users.id),
      date: timestamp({ mode: "string" }).notNull(),
      height: varchar({ length: 20 }).notNull(),
      width: varchar({ length: 20 }).notNull(),
      length: varchar({ length: 20 }).notNull(),
      volume: varchar({ length: 20 }).notNull(),
      destination: varchar({ length: 255 }),
      invoiceNumber: varchar("invoice_number", { length: 100 }),
      woodType: varchar("wood_type", { length: 100 }),
      client: varchar({ length: 255 }),
      imagesUrls: text("images_urls"),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    chainsawChainEvents = mysqlTable("chainsaw_chain_events", {
      id: int().autoincrement().notNull(),
      chainType: varchar("chain_type", { length: 20 }).notNull(),
      eventType: mysqlEnum("event_type", ["envio_campo", "retorno_oficina", "afiacao_concluida", "baixa_estoque", "entrada_estoque"]).notNull(),
      quantity: int().notNull(),
      chainsawId: int("chainsaw_id"),
      registeredBy: int("registered_by"),
      notes: text(),
      eventDate: timestamp("event_date", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    chainsawChainStock = mysqlTable("chainsaw_chain_stock", {
      id: int().autoincrement().notNull(),
      chainType: varchar("chain_type", { length: 20 }).notNull(),
      sharpenedInBox: int("sharpened_in_box").default(0).notNull(),
      inField: int("in_field").default(0).notNull(),
      inWorkshop: int("in_workshop").default(0).notNull(),
      totalStock: int("total_stock").default(0).notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    chainsawPartMovements = mysqlTable("chainsaw_part_movements", {
      id: int().autoincrement().notNull(),
      partId: int("part_id").notNull(),
      type: mysqlEnum(["entrada", "saida"]).notNull(),
      quantity: varchar({ length: 20 }).notNull(),
      reason: varchar({ length: 255 }),
      serviceOrderId: int("service_order_id"),
      unitCost: varchar("unit_cost", { length: 20 }),
      registeredBy: int("registered_by"),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    chainsawParts = mysqlTable("chainsaw_parts", {
      id: int().autoincrement().notNull(),
      code: varchar({ length: 50 }),
      name: varchar({ length: 255 }).notNull(),
      category: varchar({ length: 100 }),
      unit: varchar({ length: 20 }).default("un"),
      currentStock: varchar("current_stock", { length: 20 }).default("0"),
      minStock: varchar("min_stock", { length: 20 }).default("0"),
      unitCost: varchar("unit_cost", { length: 20 }),
      notes: text(),
      isActive: int("is_active").default(1),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      imageUrl: text("image_url")
    });
    chainsawServiceOrders = mysqlTable("chainsaw_service_orders", {
      id: int().autoincrement().notNull(),
      chainsawId: int("chainsaw_id").notNull(),
      problemType: mysqlEnum("problem_type", ["motor_falhando", "nao_liga", "superaquecimento", "vazamento", "corrente_problema", "sabre_problema", "manutencao_preventiva", "outro"]).notNull(),
      problemDescription: text("problem_description"),
      priority: mysqlEnum(["baixa", "media", "alta", "urgente"]).default("media").notNull(),
      status: mysqlEnum(["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta").notNull(),
      mechanicId: int("mechanic_id"),
      serviceDescription: text("service_description"),
      completedAt: timestamp("completed_at", { mode: "string" }),
      openedBy: int("opened_by"),
      openedAt: timestamp("opened_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      imageUrl: text("image_url")
    });
    chainsawServiceParts = mysqlTable("chainsaw_service_parts", {
      id: int().autoincrement().notNull(),
      serviceOrderId: int("service_order_id").notNull(),
      partId: int("part_id"),
      partName: varchar("part_name", { length: 255 }).notNull(),
      quantity: varchar({ length: 20 }).notNull(),
      unit: varchar({ length: 20 }).default("un"),
      unitCost: varchar("unit_cost", { length: 20 }),
      fromStock: int("from_stock").default(1),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    chainsaws = mysqlTable("chainsaws", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 100 }).notNull(),
      brand: varchar({ length: 100 }),
      model: varchar({ length: 100 }),
      serialNumber: varchar("serial_number", { length: 100 }),
      chainType: varchar("chain_type", { length: 20 }).default("30"),
      status: mysqlEnum(["ativa", "oficina", "inativa"]).default("ativa").notNull(),
      notes: text(),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      imageUrl: text("image_url")
    });
    clientContracts = mysqlTable("client_contracts", {
      id: int().autoincrement().notNull(),
      clientId: int("client_id").notNull().references(() => clients.id),
      description: varchar({ length: 500 }).notNull(),
      billingType: mysqlEnum("billing_type", ["peso_kg", "metro_m3", "fixo"]).default("metro_m3").notNull(),
      unitPrice: varchar("unit_price", { length: 20 }),
      estimatedVolume: varchar("estimated_volume", { length: 20 }),
      totalAmount: varchar("total_amount", { length: 20 }),
      dueDate: timestamp("due_date", { mode: "string" }),
      status: mysqlEnum(["ativo", "pago", "atrasado", "cancelado"]).default("ativo").notNull(),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    clientPaymentReceipts = mysqlTable("client_payment_receipts", {
      id: int().autoincrement().notNull(),
      clientId: int("client_id").notNull().references(() => clients.id),
      contractId: int("contract_id").references(() => clientContracts.id),
      paymentDate: timestamp("payment_date", { mode: "string" }).notNull(),
      amount: varchar({ length: 20 }).notNull(),
      paymentMethod: mysqlEnum("payment_method", ["pix", "transferencia", "dinheiro", "cheque", "outros"]).default("pix").notNull(),
      receiptUrl: varchar("receipt_url", { length: 1e3 }),
      referenceMonth: varchar("reference_month", { length: 7 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    clientPayments = mysqlTable("client_payments", {
      id: int().autoincrement().notNull(),
      // Banco de produção usa camelCase sem underscore
      clientId: int("clientId").notNull().references(() => clients.id),
      amount: varchar("amount", { length: 20 }),
      dueDate: timestamp("dueDate", { mode: "string" }),
      paidDate: timestamp("paidDate", { mode: "string" }),
      status: varchar("status", { length: 50 }).default("pending").notNull(),
      description: text(),
      referenceMonth: varchar("referenceMonth", { length: 7 }),
      loadId: int("loadId"),
      notes: text(),
      createdAt: timestamp("createdAt", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      createdBy: int("createdBy"),
      invoiceNumber: varchar("invoiceNumber", { length: 100 }),
      paymentMethod: varchar("paymentMethod", { length: 100 }),
      bankDetails: text(),
      attachmentUrl: text()
    });
    clientPortalAccess = mysqlTable(
      "client_portal_access",
      {
        id: int().autoincrement().notNull(),
        clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
        accessCode: varchar("access_code", { length: 64 }).notNull(),
        active: int().default(1).notNull(),
        lastAccessAt: timestamp("last_access_at", { mode: "string" }),
        createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
        createdBy: int("created_by").references(() => users.id)
      },
      (table) => [
        index("client_portal_access_access_code_unique").on(table.accessCode)
      ]
    );
    clients = mysqlTable("clients", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      document: varchar({ length: 20 }),
      email: varchar({ length: 320 }),
      phone: varchar({ length: 20 }),
      address: varchar({ length: 500 }),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      notes: text(),
      password: varchar({ length: 255 }),
      active: int().default(1).notNull(),
      pricePerTon: varchar("price_per_ton", { length: 20 }),
      residuePerTon: varchar("residue_per_ton", { length: 20 }),
      billingCycle: mysqlEnum("billing_cycle", ["semanal", "quinzenal", "mensal"]).default("mensal"),
      billingDayOfWeek: int("billing_day_of_week").default(5),
      paymentTermDays: int("payment_term_days").default(30),
      documentsJson: text("documents_json"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    collaboratorAttendance = mysqlTable("collaborator_attendance", {
      id: int().autoincrement().notNull(),
      collaboratorId: int("collaborator_id").notNull(),
      date: timestamp({ mode: "string" }).notNull(),
      employmentTypeCa: mysqlEnum("employment_type_ca", ["clt", "terceirizado", "diarista"]).default("diarista").notNull(),
      dailyValue: varchar("daily_value", { length: 20 }).default("0").notNull(),
      pixKey: varchar("pix_key", { length: 255 }),
      activity: varchar({ length: 255 }),
      observations: text(),
      paymentStatusCa: mysqlEnum("payment_status_ca", ["pendente", "pago"]).default("pendente").notNull(),
      paidAt: timestamp("paid_at", { mode: "string" }),
      registeredBy: int("registered_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      latitude: varchar({ length: 20 }),
      longitude: varchar({ length: 20 }),
      locationName: varchar("location_name", { length: 255 }),
      workLocationId: int("work_location_id")
    });
    collaboratorDocuments = mysqlTable("collaborator_documents", {
      id: int().autoincrement().notNull(),
      collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
      type: mysqlEnum(["cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"]).default("outros").notNull(),
      title: varchar({ length: 255 }).notNull(),
      fileUrl: varchar("file_url", { length: 1e3 }).notNull(),
      fileType: varchar("file_type", { length: 50 }),
      issueDate: timestamp("issue_date", { mode: "string" }),
      expiryDate: timestamp("expiry_date", { mode: "string" }),
      notes: text(),
      uploadedBy: int("uploaded_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    collaborators = mysqlTable("collaborators", {
      id: int().autoincrement().notNull(),
      userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
      name: varchar({ length: 255 }).notNull(),
      email: varchar({ length: 320 }),
      phone: varchar({ length: 20 }),
      cpf: varchar({ length: 14 }),
      rg: varchar({ length: 20 }),
      address: varchar({ length: 500 }),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      zipCode: varchar("zip_code", { length: 10 }),
      photoUrl: text("photo_url"),
      faceDescriptor: text("face_descriptor"),
      role: mysqlEnum(["administrativo", "encarregado", "mecanico", "motosserrista", "carregador", "operador", "motorista", "terceirizado"]).default("operador").notNull(),
      pixKey: varchar("pix_key", { length: 255 }),
      dailyRate: varchar("daily_rate", { length: 20 }),
      employmentType: mysqlEnum("employment_type", ["clt", "terceirizado", "diarista"]).default("diarista"),
      shirtSize: mysqlEnum("shirt_size", ["PP", "P", "M", "G", "GG", "XGG"]),
      pantsSize: varchar("pants_size", { length: 10 }),
      shoeSize: varchar("shoe_size", { length: 5 }),
      bootSize: varchar("boot_size", { length: 5 }),
      active: int().default(1).notNull(),
      clientId: int("client_id"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    equipment = mysqlTable("equipment", {
      id: int().autoincrement().notNull(),
      typeId: int("type_id").notNull().references(() => equipmentTypes.id),
      name: varchar({ length: 255 }).notNull(),
      brand: varchar({ length: 100 }),
      model: varchar({ length: 100 }),
      year: int(),
      serialNumber: varchar("serial_number", { length: 100 }),
      licensePlate: varchar("license_plate", { length: 20 }),
      imageUrl: text("image_url"),
      status: mysqlEnum(["ativo", "manutencao", "inativo"]).default("ativo").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      sectorId: int("sector_id"),
      clientId: int("client_id"),
      defaultHeightM: varchar("default_height_m", { length: 20 }),
      defaultWidthM: varchar("default_width_m", { length: 20 }),
      defaultLengthM: varchar("default_length_m", { length: 20 }),
      category: mysqlEnum(["maquina", "veiculo", "caminhao"]).default("maquina"),
      accumulatedHours: varchar("accumulated_hours", { length: 20 }).default("0"),
      accumulatedKm: varchar("accumulated_km", { length: 20 }).default("0"),
      isThirdParty: tinyint("is_third_party").default(0).notNull(),
      thirdPartyOwner: varchar("third_party_owner", { length: 255 }),
      invoiceUrl: text("invoice_url"),
      documentUrl: text("document_url"),
      insuranceUrl: text("insurance_url"),
      responsibleDriverId: int("responsible_driver_id")
    });
    equipmentMaintenance = mysqlTable("equipment_maintenance", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      type: mysqlEnum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]).default("manutencao").notNull(),
      description: text().notNull(),
      performedBy: varchar("performed_by", { length: 255 }),
      cost: varchar({ length: 20 }),
      nextMaintenanceDate: timestamp("next_maintenance_date", { mode: "string" }),
      photosJson: text("photos_json"),
      registeredBy: int("registered_by").references(() => users.id),
      performedAt: timestamp("performed_at", { mode: "string" }).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    equipmentPhotos = mysqlTable("equipment_photos", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      photoUrl: varchar("photo_url", { length: 1e3 }).notNull(),
      caption: varchar({ length: 255 }),
      uploadedBy: int("uploaded_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    equipmentTypes = mysqlTable("equipment_types", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 100 }).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    extraExpenses = mysqlTable("extra_expenses", {
      id: int().autoincrement().notNull(),
      date: timestamp({ mode: "string" }).notNull(),
      category: mysqlEnum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]).notNull(),
      description: varchar({ length: 500 }).notNull(),
      amount: varchar({ length: 20 }).notNull(),
      paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia", "debito"]).default("dinheiro").notNull(),
      receiptImageUrl: text("receipt_image_url"),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      registeredByName: varchar("registered_by_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      workLocationId: int("work_location_id"),
      clientId: int("client_id"),
      equipmentId: int("equipment_id")
    });
    financialEntries = mysqlTable("financial_entries", {
      id: int().autoincrement().notNull(),
      type: mysqlEnum(["receita", "despesa"]).notNull(),
      category: varchar({ length: 100 }).notNull(),
      description: varchar({ length: 500 }).notNull(),
      amount: varchar({ length: 20 }).notNull(),
      date: timestamp({ mode: "string" }).notNull(),
      referenceMonth: varchar("reference_month", { length: 7 }),
      paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).default("pix").notNull(),
      status: mysqlEnum(["pendente", "confirmado", "cancelado"]).default("confirmado").notNull(),
      clientId: int("client_id"),
      clientName: varchar("client_name", { length: 255 }),
      receiptImageUrl: text("receipt_image_url"),
      notes: text(),
      registeredBy: int("registered_by"),
      registeredByName: varchar("registered_by_name", { length: 255 }),
      cargoLoadId: int("cargo_load_id"),
      autoGenerated: int("auto_generated").default(0),
      equipmentId: int("equipment_id"),
      equipmentName: varchar("equipment_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    fuelContainerEvents = mysqlTable("fuel_container_events", {
      id: int().autoincrement().notNull(),
      containerId: int("container_id").notNull(),
      eventType: mysqlEnum("event_type", ["abastecimento", "uso", "transferencia"]).notNull(),
      volumeLiters: varchar("volume_liters", { length: 10 }).notNull(),
      costPerLiter: varchar("cost_per_liter", { length: 20 }),
      totalCost: varchar("total_cost", { length: 20 }),
      oil2TMl: varchar("oil2t_ml", { length: 10 }),
      sourceContainerId: int("source_container_id"),
      chainsawId: int("chainsaw_id"),
      registeredBy: int("registered_by"),
      notes: text(),
      workLocationId: int("work_location_id"),
      eventDate: timestamp("event_date", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    fuelContainers = mysqlTable("fuel_containers", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 100 }).notNull(),
      color: varchar({ length: 30 }).default("vermelho"),
      type: mysqlEnum(["puro", "mistura"]).notNull(),
      capacityLiters: varchar("capacity_liters", { length: 10 }).default("20"),
      currentVolumeLiters: varchar("current_volume_liters", { length: 10 }).default("0"),
      isActive: int("is_active").default(1),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    fuelRecords = mysqlTable("fuel_records", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      operatorId: int("operator_id").notNull().references(() => users.id),
      date: timestamp({ mode: "string" }).notNull(),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "mistura_2t"]).notNull(),
      liters: varchar({ length: 20 }).notNull(),
      totalValue: varchar("total_value", { length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      odometer: varchar({ length: 20 }),
      station: varchar({ length: 255 }),
      invoiceUrl: text("invoice_url"),
      odometerImageUrl: text("odometer_image_url"),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      workLocationId: int("work_location_id")
    });
    gpsDeviceLinks = mysqlTable("gps_device_links", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      traccarDeviceId: int("traccar_device_id").notNull(),
      traccarDeviceName: varchar("traccar_device_name", { length: 255 }),
      traccarUniqueId: varchar("traccar_unique_id", { length: 100 }),
      active: int().default(1).notNull(),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    gpsHoursLog = mysqlTable("gps_hours_log", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      gpsDeviceLinkId: int("gps_device_link_id"),
      date: timestamp({ mode: "string" }).notNull(),
      hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
      hourMeterStart: varchar("hour_meter_start", { length: 20 }),
      hourMeterEnd: varchar("hour_meter_end", { length: 20 }),
      distanceKm: varchar("distance_km", { length: 20 }),
      source: mysqlEnum(["gps_auto", "manual"]).default("gps_auto").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    gpsLocations = mysqlTable("gps_locations", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      latitude: varchar({ length: 30 }).notNull(),
      longitude: varchar({ length: 30 }).notNull(),
      radiusMeters: int("radius_meters").default(2e3).notNull(),
      isActive: tinyint("is_active").default(1).notNull(),
      clientId: int("client_id"),
      notes: text(),
      createdBy: int("created_by"),
      createdByName: varchar("created_by_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    machineFuel = mysqlTable("machine_fuel", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp({ mode: "string" }).notNull(),
      hourMeter: varchar("hour_meter", { length: 20 }),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "mistura_2t", "arla"]).notNull(),
      liters: varchar({ length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      totalValue: varchar("total_value", { length: 20 }),
      supplier: varchar({ length: 255 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      workLocationId: int("work_location_id")
    });
    machineHours = mysqlTable("machine_hours", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      operatorCollaboratorId: int("operator_collaborator_id").references(() => collaborators.id),
      date: timestamp({ mode: "string" }).notNull(),
      startHourMeter: varchar("start_hour_meter", { length: 20 }).notNull(),
      endHourMeter: varchar("end_hour_meter", { length: 20 }).notNull(),
      hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
      activity: varchar({ length: 255 }),
      location: varchar({ length: 255 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      workLocationId: int("work_location_id"),
      source: mysqlEnum(["manual", "gps"]).default("manual").notNull()
    });
    equipmentOilRecords = mysqlTable("equipment_oil_records", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp({ mode: "string" }).notNull(),
      hourMeter: varchar("hour_meter", { length: 20 }),
      oilType: mysqlEnum("oil_type", ["hidraulico", "motor", "transmissao", "diferencial", "outros"]).notNull(),
      quantityLiters: varchar("quantity_liters", { length: 20 }).notNull(),
      brand: varchar({ length: 100 }),
      supplier: varchar({ length: 255 }),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      totalValue: varchar("total_value", { length: 20 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    oilStock = mysqlTable("oil_stock", {
      id: int().autoincrement().notNull(),
      oilType: mysqlEnum("oil_type", ["hidraulico", "motor", "transmissao", "diferencial", "outros"]).notNull(),
      brand: varchar({ length: 100 }).notNull(),
      quantityLiters: varchar("quantity_liters", { length: 20 }).notNull(),
      purchaseQuantityLiters: varchar("purchase_quantity_liters", { length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      totalValue: varchar("total_value", { length: 20 }),
      photoUrl: text("photo_url"),
      supplier: varchar({ length: 255 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    machineMaintenance = mysqlTable("machine_maintenance", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp({ mode: "string" }).notNull(),
      hourMeter: varchar("hour_meter", { length: 20 }),
      type: mysqlEnum(["preventiva", "corretiva", "revisao"]).default("corretiva").notNull(),
      serviceType: mysqlEnum("service_type", ["proprio", "terceirizado"]).default("proprio").notNull(),
      mechanicCollaboratorId: int("mechanic_collaborator_id").references(() => collaborators.id),
      mechanicName: varchar("mechanic_name", { length: 255 }),
      thirdPartyCompany: varchar("third_party_company", { length: 255 }),
      partsReplaced: text("parts_replaced"),
      laborCost: varchar("labor_cost", { length: 20 }),
      totalCost: varchar("total_cost", { length: 20 }),
      description: text(),
      nextMaintenanceHours: varchar("next_maintenance_hours", { length: 20 }),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    maintenanceParts = mysqlTable("maintenance_parts", {
      id: int().autoincrement().notNull(),
      maintenanceId: int("maintenance_id").notNull().references(() => equipmentMaintenance.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => parts.id, { onDelete: "set null" }),
      partCode: varchar("part_code", { length: 50 }),
      partName: varchar("part_name", { length: 255 }).notNull(),
      partPhotoUrl: text("part_photo_url"),
      quantity: int().default(1).notNull(),
      unit: varchar({ length: 20 }).default("un"),
      unitCost: varchar("unit_cost", { length: 20 }),
      totalCost: varchar("total_cost", { length: 20 }),
      fromStock: int("from_stock").default(1),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    maintenanceTemplateParts = mysqlTable("maintenance_template_parts", {
      id: int().autoincrement().notNull(),
      templateId: int("template_id").notNull().references(() => maintenanceTemplates.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => parts.id, { onDelete: "set null" }),
      partCode: varchar("part_code", { length: 50 }),
      partName: varchar("part_name", { length: 255 }).notNull(),
      quantity: int().default(1).notNull(),
      unit: varchar({ length: 20 }).default("un"),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    maintenanceTemplates = mysqlTable("maintenance_templates", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      type: mysqlEnum(["preventiva", "corretiva", "revisao"]).default("preventiva").notNull(),
      description: text(),
      estimatedCost: varchar("estimated_cost", { length: 20 }),
      active: int().default(1).notNull(),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    parts = mysqlTable("parts", {
      id: int().autoincrement().notNull(),
      code: varchar({ length: 50 }),
      name: varchar({ length: 255 }).notNull(),
      category: varchar({ length: 100 }),
      unit: varchar({ length: 20 }).default("un"),
      stockQuantity: int("stock_quantity").default(0).notNull(),
      minStock: int("min_stock").default(0),
      unitCost: varchar("unit_cost", { length: 20 }),
      supplier: varchar({ length: 255 }),
      photoUrl: text("photo_url"),
      notes: text(),
      active: int().default(1).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id),
      photosJson: text("photos_json")
    });
    partsRequests = mysqlTable("parts_requests", {
      id: int().autoincrement().notNull(),
      partId: int("part_id").references(() => parts.id),
      partName: varchar("part_name", { length: 255 }).notNull(),
      quantity: int().notNull(),
      urgency: mysqlEnum(["baixa", "media", "alta"]).default("media").notNull(),
      equipmentId: int("equipment_id").references(() => equipment.id),
      equipmentName: varchar("equipment_name", { length: 255 }),
      reason: text(),
      status: mysqlEnum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]).default("pendente").notNull(),
      approvedBy: int("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at", { mode: "string" }),
      rejectionReason: text("rejection_reason"),
      estimatedCost: varchar("estimated_cost", { length: 20 }),
      requestedBy: int("requested_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    partsStockMovements = mysqlTable("parts_stock_movements", {
      id: int().autoincrement().notNull(),
      partId: int("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
      type: mysqlEnum(["entrada", "saida"]).notNull(),
      quantity: int().notNull(),
      reason: varchar({ length: 255 }),
      referenceId: int("reference_id"),
      referenceType: varchar("reference_type", { length: 50 }),
      unitCost: varchar("unit_cost", { length: 20 }),
      notes: text(),
      registeredBy: int("registered_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    passwordResetTokens = mysqlTable(
      "password_reset_tokens",
      {
        id: int().autoincrement().notNull(),
        userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        token: varchar({ length: 128 }).notNull(),
        expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
        usedAt: timestamp("used_at", { mode: "string" }),
        createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("password_reset_tokens_token_unique").on(table.token)
      ]
    );
    preventiveMaintenanceAlerts = mysqlTable("preventive_maintenance_alerts", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      planId: int("plan_id").notNull(),
      status: mysqlEnum(["pendente", "em_andamento", "concluido", "ignorado"]).default("pendente").notNull(),
      currentHours: varchar("current_hours", { length: 20 }).notNull(),
      dueHours: varchar("due_hours", { length: 20 }).notNull(),
      generatedAt: timestamp("generated_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      resolvedAt: timestamp("resolved_at", { mode: "string" }),
      resolvedBy: int("resolved_by"),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    preventiveMaintenancePlans = mysqlTable("preventive_maintenance_plans", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull(),
      name: varchar({ length: 255 }).notNull(),
      type: mysqlEnum(["troca_oleo", "engraxamento", "filtro_ar", "filtro_combustivel", "correia", "revisao_geral", "abastecimento", "outros"]).default("outros").notNull(),
      intervalHours: int("interval_hours").notNull(),
      lastDoneHours: varchar("last_done_hours", { length: 20 }).default("0"),
      lastDoneAt: timestamp("last_done_at", { mode: "string" }),
      alertThresholdHours: int("alert_threshold_hours").default(10),
      active: int().default(1).notNull(),
      notes: text(),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    purchaseOrderItems = mysqlTable("purchase_order_items", {
      id: int().autoincrement().notNull(),
      orderId: int("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
      partId: int("part_id"),
      partName: varchar("part_name", { length: 255 }).notNull(),
      partCode: varchar("part_code", { length: 50 }),
      partCategory: varchar("part_category", { length: 100 }),
      supplier: varchar({ length: 255 }),
      unit: varchar({ length: 20 }).default("un"),
      quantity: int().notNull(),
      unitCost: varchar("unit_cost", { length: 20 }),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    purchaseOrders = mysqlTable("purchase_orders", {
      id: int().autoincrement().notNull(),
      title: varchar({ length: 255 }).notNull(),
      status: mysqlEnum(["rascunho", "enviado", "aprovado", "rejeitado", "comprado"]).default("rascunho").notNull(),
      notes: text(),
      createdBy: int("created_by"),
      approvedBy: int("approved_by"),
      approvedAt: timestamp("approved_at", { mode: "string" }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    replantingRecords = mysqlTable("replanting_records", {
      id: int().autoincrement().notNull(),
      clientId: int("client_id").notNull().references(() => clients.id),
      date: timestamp({ mode: "string" }).notNull(),
      area: varchar({ length: 100 }),
      species: varchar({ length: 100 }).default("Eucalipto"),
      quantity: int(),
      areaHectares: varchar("area_hectares", { length: 20 }),
      notes: text(),
      photosJson: text("photos_json"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    rolePermissions = mysqlTable("role_permissions", {
      id: int().autoincrement().notNull(),
      roleName: varchar("role_name", { length: 50 }).notNull(),
      module: varchar({ length: 50 }).notNull(),
      canView: int("can_view").default(0).notNull(),
      canCreate: int("can_create").default(0).notNull(),
      canEdit: int("can_edit").default(0).notNull(),
      canDelete: int("can_delete").default(0).notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      updatedBy: int("updated_by").references(() => users.id)
    });
    sectors = mysqlTable("sectors", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 100 }).notNull(),
      description: text(),
      color: varchar({ length: 20 }).default("#16a34a"),
      active: int().default(1).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    userPermissions = mysqlTable(
      "user_permissions",
      {
        id: int().autoincrement().notNull(),
        userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        modules: text(),
        profile: varchar({ length: 64 }).default("custom"),
        allowedClientIds: text("allowed_client_ids"),
        allowedWorkLocationIds: text("allowed_work_location_ids"),
        updatedBy: int("updated_by"),
        updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
        createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
      },
      (table) => [
        index("user_id").on(table.userId)
      ]
    );
    userProfiles = mysqlTable("user_profiles", {
      id: int().autoincrement().notNull(),
      userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      profileType: mysqlEnum("profile_type", ["administrativo", "encarregado", "mecanico", "motosserrista", "carregador", "operador", "motorista", "terceirizado"]).notNull(),
      cpf: varchar({ length: 14 }),
      phone: varchar({ length: 20 }),
      pixKey: varchar("pix_key", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    users = mysqlTable(
      "users",
      {
        id: int().autoincrement().notNull(),
        openId: varchar({ length: 64 }),
        name: text().notNull(),
        email: varchar({ length: 320 }).notNull(),
        loginMethod: varchar({ length: 64 }).default("email").notNull(),
        role: mysqlEnum(["user", "admin"]).default("user").notNull(),
        createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
        lastSignedIn: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
        passwordHash: varchar("password_hash", { length: 255 })
      },
      (table) => [
        index("users_openId_unique").on(table.openId),
        index("users_email_unique").on(table.email)
      ]
    );
    vehicleRecords = mysqlTable("vehicle_records", {
      id: int().autoincrement().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp({ mode: "string" }).notNull(),
      recordType: mysqlEnum("record_type", ["abastecimento", "manutencao", "km"]).notNull(),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "etanol", "gnv"]),
      liters: varchar({ length: 20 }),
      fuelCost: varchar("fuel_cost", { length: 20 }),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      supplier: varchar({ length: 255 }),
      odometer: varchar({ length: 20 }),
      kmDriven: varchar("km_driven", { length: 20 }),
      maintenanceType: varchar("maintenance_type", { length: 255 }),
      maintenanceCost: varchar("maintenance_cost", { length: 20 }),
      serviceType: mysqlEnum("service_type", ["proprio", "terceirizado"]),
      mechanicName: varchar("mechanic_name", { length: 255 }),
      driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      maintenanceLocation: varchar("maintenance_location", { length: 255 }),
      photosJson: text("photos_json"),
      photoUrl: text("photo_url"),
      workLocationId: int("work_location_id"),
      fuelInvoiceId: int("fuel_invoice_id"),
      chargedValue: varchar("charged_value", { length: 20 })
    });
    cargoTrackingPhotos = mysqlTable("cargo_tracking_photos", {
      id: int("id").autoincrement().primaryKey(),
      cargoId: int("cargo_id").notNull().references(() => cargoLoads.id, { onDelete: "cascade" }),
      stage: varchar("stage", { length: 50 }).notNull(),
      photoUrl: text("photo_url").notNull(),
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      registeredByName: varchar("registered_by_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull()
    });
    cargoWeeklyClosings = mysqlTable("cargo_weekly_closings", {
      id: int().autoincrement().notNull(),
      clientId: int("client_id").notNull().references(() => clients.id),
      weekStart: timestamp("week_start", { mode: "string" }).notNull(),
      weekEnd: timestamp("week_end", { mode: "string" }).notNull(),
      totalLoads: int("total_loads").default(0).notNull(),
      totalWeightKg: varchar("total_weight_kg", { length: 20 }),
      totalAmount: varchar("total_amount", { length: 20 }),
      pricePerTon: varchar("price_per_ton", { length: 20 }),
      dueDate: timestamp("due_date", { mode: "string" }),
      status: mysqlEnum(["aberto", "fechado", "pago", "atrasado"]).default("aberto").notNull(),
      paidAt: timestamp("paid_at", { mode: "string" }),
      receiptUrl: varchar("receipt_url", { length: 1e3 }),
      notes: text(),
      closedBy: int("closed_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    clientDocuments = mysqlTable("client_documents", {
      id: int().autoincrement().notNull(),
      clientId: int("client_id").notNull(),
      type: mysqlEnum(["proposta", "contrato", "nota_fiscal", "boleto", "recibo", "outros"]).default("outros").notNull(),
      title: varchar({ length: 255 }).notNull(),
      fileUrl: varchar("file_url", { length: 1e3 }).notNull(),
      fileType: varchar("file_type", { length: 50 }),
      notes: text(),
      uploadedBy: int("uploaded_by"),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    buyerClients = mysqlTable("buyer_clients", {
      id: int().primaryKey().autoincrement(),
      name: varchar({ length: 255 }).notNull(),
      cnpjCpf: varchar("cnpj_cpf", { length: 30 }),
      inscricaoEstadual: varchar("inscricao_estadual", { length: 30 }),
      phone: varchar({ length: 30 }),
      email: varchar({ length: 255 }),
      address: text(),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      cep: varchar({ length: 10 }),
      contactPerson: varchar("contact_person", { length: 255 }),
      product: varchar({ length: 255 }),
      paymentMethod: varchar("payment_method", { length: 100 }),
      pricePerUnit: varchar("price_per_unit", { length: 20 }),
      unit: varchar({ length: 20 }).default("ton"),
      notes: text(),
      active: tinyint().default(1).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    buyerPriceHistory = mysqlTable("buyer_price_history", {
      id: int().primaryKey().autoincrement(),
      buyerId: int("buyer_id").notNull(),
      product: varchar({ length: 255 }).notNull(),
      pricePerUnit: varchar("price_per_unit", { length: 20 }).notNull(),
      unit: varchar({ length: 20 }).default("ton").notNull(),
      validFrom: varchar("valid_from", { length: 10 }),
      validUntil: varchar("valid_until", { length: 10 }),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    buyerPayments = mysqlTable("buyer_payments", {
      id: int().primaryKey().autoincrement(),
      buyerId: int("buyer_id").notNull(),
      amount: varchar({ length: 20 }).notNull(),
      paymentDate: varchar("payment_date", { length: 10 }).notNull(),
      paymentMethod: varchar("payment_method", { length: 50 }),
      invoiceNumber: varchar("invoice_number", { length: 50 }),
      notes: text(),
      status: mysqlEnum(["pendente", "pago", "atrasado"]).default("pendente").notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    freightCalculations = mysqlTable("freight_calculations", {
      id: int().primaryKey().autoincrement(),
      cargoLoadId: int("cargo_load_id"),
      date: varchar({ length: 10 }).notNull(),
      vehiclePlate: varchar("vehicle_plate", { length: 20 }),
      driverName: varchar("driver_name", { length: 255 }),
      driverType: mysqlEnum("driver_type", ["proprio", "terceirizado"]).default("proprio").notNull(),
      origin: varchar({ length: 255 }),
      destination: varchar({ length: 255 }),
      distanceKm: varchar("distance_km", { length: 20 }),
      fuelLiters: varchar("fuel_liters", { length: 20 }),
      fuelCostPerLiter: varchar("fuel_cost_per_liter", { length: 20 }),
      fuelTotalCost: varchar("fuel_total_cost", { length: 20 }),
      driverCost: varchar("driver_cost", { length: 20 }),
      tollCost: varchar("toll_cost", { length: 20 }),
      maintenanceCost: varchar("maintenance_cost", { length: 20 }),
      otherCosts: varchar("other_costs", { length: 20 }),
      otherCostsDescription: text("other_costs_description"),
      totalCost: varchar("total_cost", { length: 20 }),
      costPerKm: varchar("cost_per_km", { length: 20 }),
      costPerTon: varchar("cost_per_ton", { length: 20 }),
      weightTon: varchar("weight_ton", { length: 20 }),
      revenuePerTon: varchar("revenue_per_ton", { length: 20 }),
      totalRevenue: varchar("total_revenue", { length: 20 }),
      profit: varchar({ length: 20 }),
      notes: text(),
      createdBy: int("created_by"),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    notifications = mysqlTable("notifications", {
      id: int().primaryKey().autoincrement(),
      recipientUserId: int("recipient_user_id").notNull(),
      type: mysqlEnum(["solicitacao_peca", "pagamento_boleto", "pagamento_diaria", "fechamento_carga", "fechamento_semanal", "geral"]).default("geral").notNull(),
      title: varchar({ length: 255 }).notNull(),
      message: text(),
      relatedId: int("related_id"),
      relatedType: varchar("related_type", { length: 50 }),
      isRead: tinyint("is_read").default(0).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    fuelSuppliers = mysqlTable("fuel_suppliers", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      tradeName: varchar("trade_name", { length: 255 }),
      cnpj: varchar({ length: 20 }),
      phone: varchar({ length: 30 }),
      email: varchar({ length: 255 }),
      contactName: varchar("contact_name", { length: 255 }),
      address: text(),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "etanol", "gnv"]).default("diesel").notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }).notNull(),
      locationType: mysqlEnum("location_type", ["simflor", "astorga", "postos"]).default("simflor").notNull(),
      location: varchar({ length: 255 }),
      workLocationId: int("work_location_id"),
      isActive: tinyint("is_active").default(1).notNull(),
      notes: text(),
      tankCapacity: varchar("tank_capacity", { length: 20 }),
      tankAlertThreshold: varchar("tank_alert_threshold", { length: 5 }).default("20"),
      vendorName: varchar("vendor_name", { length: 255 }),
      managerName: varchar("manager_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    fuelPriceHistory = mysqlTable("fuel_price_history", {
      id: int().autoincrement().notNull(),
      supplierId: int("supplier_id").notNull(),
      oldPrice: varchar("old_price", { length: 20 }).notNull(),
      newPrice: varchar("new_price", { length: 20 }).notNull(),
      changedBy: int("changed_by"),
      changedAt: timestamp("changed_at", { mode: "string" }).defaultNow().notNull()
    });
    fuelInvoices = mysqlTable("fuel_invoices", {
      id: int().autoincrement().notNull(),
      supplierId: int("supplier_id").notNull(),
      invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
      invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
      dueDate: varchar("due_date", { length: 10 }).notNull(),
      totalAmount: varchar("total_amount", { length: 20 }).notNull(),
      liters: varchar({ length: 20 }),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
      paymentMethod: varchar("payment_method", { length: 50 }),
      bankName: varchar("bank_name", { length: 100 }),
      barcodeNumber: varchar("barcode_number", { length: 100 }),
      status: mysqlEnum(["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
      paidAt: varchar("paid_at", { length: 10 }),
      paidAmount: varchar("paid_amount", { length: 20 }),
      transporterName: varchar("transporter_name", { length: 255 }),
      transporterPlate: varchar("transporter_plate", { length: 20 }),
      deliveryLocation: varchar("delivery_location", { length: 100 }),
      notes: text(),
      invoicePhotoUrl: text("invoice_photo_url"),
      boletoPhotoUrl: text("boleto_photo_url"),
      litersUsed: varchar("liters_used", { length: 20 }).default("0"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    autoFreightTrips = mysqlTable("auto_freight_trips", {
      id: int().primaryKey().autoincrement(),
      equipmentId: int("equipment_id").notNull(),
      equipmentName: varchar("equipment_name", { length: 255 }),
      traccarDeviceId: int("traccar_device_id"),
      tripDate: varchar("trip_date", { length: 10 }).notNull(),
      startTime: varchar("start_time", { length: 30 }),
      endTime: varchar("end_time", { length: 30 }),
      distanceKm: varchar("distance_km", { length: 20 }),
      durationMinutes: int("duration_minutes"),
      startAddress: text("start_address"),
      endAddress: text("end_address"),
      fuelCost: varchar("fuel_cost", { length: 20 }).default("0"),
      maintenanceCost: varchar("maintenance_cost", { length: 20 }).default("0"),
      totalCost: varchar("total_cost", { length: 20 }).default("0"),
      status: mysqlEnum(["detectado", "confirmado", "ignorado"]).default("detectado").notNull(),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    thirdPartyContractors = mysqlTable("third_party_contractors", {
      id: int().autoincrement().notNull(),
      name: varchar({ length: 255 }).notNull(),
      ratePerM3: varchar("rate_per_m3", { length: 20 }).notNull().default("0"),
      phone: varchar({ length: 30 }),
      notes: text(),
      isActive: tinyint("is_active").default(1).notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    purchaseCategories = mysqlTable("purchase_categories", {
      id: int().autoincrement().primaryKey().notNull(),
      name: varchar({ length: 100 }).notNull(),
      color: varchar({ length: 20 }).default("#6B7280").notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    purchaseRequests = mysqlTable("purchase_requests", {
      id: int().autoincrement().primaryKey().notNull(),
      title: varchar({ length: 255 }).notNull(),
      description: text(),
      images: text(),
      // JSON array of S3 URLs
      linkUrl: varchar("link_url", { length: 500 }),
      categoryId: int("category_id").references(() => purchaseCategories.id),
      status: mysqlEnum(["pendente", "lida", "aprovada", "comprada", "recebida", "cancelada"]).default("pendente").notNull(),
      urgency: mysqlEnum(["baixa", "media", "alta", "critica"]).default("media").notNull(),
      requestDate: timestamp("request_date", { mode: "string" }).defaultNow().notNull(),
      readDate: timestamp("read_date", { mode: "string" }),
      purchaseDate: timestamp("purchase_date", { mode: "string" }),
      expectedArrival: timestamp("expected_arrival", { mode: "string" }),
      receivedDate: timestamp("received_date", { mode: "string" }),
      itemsConfirmedDate: timestamp("items_confirmed_date", { mode: "string" }),
      requestedBy: int("requested_by").references(() => users.id),
      approvedBy: int("approved_by").references(() => users.id),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    purchaseRequestItems = mysqlTable("purchase_request_items", {
      id: int().autoincrement().primaryKey().notNull(),
      requestId: int("request_id").notNull().references(() => purchaseRequests.id),
      name: varchar({ length: 255 }).notNull(),
      quantity: varchar({ length: 50 }).notNull(),
      unit: varchar({ length: 50 }),
      notes: text(),
      confirmed: tinyint().default(0).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    suppliers = mysqlTable("suppliers", {
      id: int().autoincrement().primaryKey().notNull(),
      companyName: varchar("company_name", { length: 255 }).notNull(),
      tradeName: varchar("trade_name", { length: 255 }),
      cnpj: varchar({ length: 20 }),
      address: text(),
      city: varchar({ length: 100 }),
      state: varchar({ length: 2 }),
      zipCode: varchar("zip_code", { length: 10 }),
      phone: varchar({ length: 30 }),
      whatsapp: varchar({ length: 30 }),
      email: varchar({ length: 255 }),
      contactName: varchar("contact_name", { length: 255 }),
      productCategories: text("product_categories"),
      notes: text(),
      isActive: tinyint("is_active").default(1).notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
      website: varchar({ length: 500 }),
      active: tinyint().default(1).notNull()
    });
    quotations = mysqlTable("quotations", {
      id: int().autoincrement().primaryKey().notNull(),
      supplierId: int("supplier_id").notNull().references(() => suppliers.id),
      categoryId: int("category_id").references(() => purchaseCategories.id),
      productName: varchar("product_name", { length: 255 }).notNull(),
      unit: varchar({ length: 50 }),
      quantity: varchar({ length: 50 }),
      unitPrice: varchar("unit_price", { length: 30 }).notNull(),
      // colunas reais do banco Hostinger
      totalPrice: varchar("total_price", { length: 30 }),
      currency: varchar({ length: 10 }).default("BRL"),
      quotedAt: bigint("quoted_at", { mode: "number" }).notNull(),
      validUntil: bigint("valid_until", { mode: "number" }),
      notes: text(),
      purchaseRequestId: int("purchase_request_id"),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow()
    });
    farmGeofences = mysqlTable("farm_geofences", {
      id: int().autoincrement().primaryKey().notNull(),
      name: varchar({ length: 255 }).notNull(),
      latitude: varchar({ length: 30 }).notNull(),
      longitude: varchar({ length: 30 }).notNull(),
      radiusMeters: int("radius_meters").default(500).notNull(),
      equipmentId: int("equipment_id").references(() => equipment.id),
      active: tinyint().default(1).notNull(),
      notes: text(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    freightCycles = mysqlTable("freight_cycles", {
      id: int().autoincrement().primaryKey().notNull(),
      equipmentId: int("equipment_id").references(() => equipment.id),
      geofenceId: int("geofence_id").references(() => farmGeofences.id),
      driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
      driverName: varchar("driver_name", { length: 255 }),
      status: mysqlEnum("status", ["em_fazenda", "em_transito", "concluido", "cancelado"]).default("em_fazenda").notNull(),
      arrivedFarmAt: timestamp("arrived_farm_at", { mode: "string" }),
      leftFarmAt: timestamp("left_farm_at", { mode: "string" }),
      returnedFarmAt: timestamp("returned_farm_at", { mode: "string" }),
      startLat: varchar("start_lat", { length: 30 }),
      startLng: varchar("start_lng", { length: 30 }),
      endLat: varchar("end_lat", { length: 30 }),
      endLng: varchar("end_lng", { length: 30 }),
      distanceKm: varchar("distance_km", { length: 20 }),
      cargoLoadId: int("cargo_load_id").references(() => cargoLoads.id),
      destination: varchar({ length: 255 }),
      totalFuelCost: varchar("total_fuel_cost", { length: 20 }).default("0"),
      totalMaintenanceCost: varchar("total_maintenance_cost", { length: 20 }).default("0"),
      totalCost: varchar("total_cost", { length: 20 }).default("0"),
      trajectoryJson: text("trajectory_json"),
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    quotationRequests = mysqlTable("quotation_requests", {
      id: int().autoincrement().primaryKey().notNull(),
      title: varchar({ length: 255 }).notNull(),
      requesterId: int("requester_id").references(() => collaborators.id),
      requesterName: varchar("requester_name", { length: 255 }),
      requesterPhone: varchar("requester_phone", { length: 30 }),
      requesterEmail: varchar("requester_email", { length: 255 }),
      itemsJson: text("items_json").notNull(),
      // JSON array: [{name, quantity, unit}]
      token: varchar({ length: 64 }).notNull(),
      expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
      status: mysqlEnum(["ativa", "respondida", "expirada", "cancelada"]).default("ativa").notNull(),
      notes: text(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    quotationResponses = mysqlTable("quotation_responses", {
      id: int().autoincrement().primaryKey().notNull(),
      quotationRequestId: int("quotation_request_id").notNull().references(() => quotationRequests.id),
      supplierName: varchar("supplier_name", { length: 255 }).notNull(),
      cnpj: varchar({ length: 30 }),
      address: text(),
      sellerName: varchar("seller_name", { length: 255 }),
      sellerPhone: varchar("seller_phone", { length: 30 }),
      sellerEmail: varchar("seller_email", { length: 255 }),
      itemsJson: text("items_json").notNull(),
      // JSON array: [{name, quantity, unit, price, brand, notes}]
      notes: text(),
      responseToken: varchar("response_token", { length: 64 }),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    freightRates = mysqlTable("freight_rates", {
      id: int().autoincrement().primaryKey().notNull(),
      worksite: varchar({ length: 255 }).notNull(),
      // ex: SIMFLOR, Fazenda GW
      destination: varchar({ length: 255 }).notNull(),
      // ex: Líder Lobato, Sonoco Lda.
      ratePerTon: varchar("rate_per_ton", { length: 20 }).notNull(),
      // R$/ton
      notes: text(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    thirdPartyFuel = mysqlTable("third_party_fuel", {
      id: int().autoincrement().primaryKey().notNull(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp({ mode: "string" }).notNull(),
      liters: varchar({ length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }).notNull(),
      total: varchar({ length: 20 }).notNull(),
      location: varchar({ length: 255 }),
      notes: text(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
    clientAdvances = mysqlTable("client_advances", {
      id: int().autoincrement().primaryKey().notNull(),
      clientId: int("client_id").notNull().references(() => clients.id),
      amount: varchar({ length: 20 }).notNull(),
      // valor do adiantamento
      balanceRemaining: varchar("balance_remaining", { length: 20 }).notNull(),
      // saldo restante
      description: text(),
      receiptUrl: varchar("receipt_url", { length: 1e3 }),
      // comprovante
      date: timestamp({ mode: "string" }).notNull(),
      startDate: timestamp("start_date", { mode: "string" }),
      // data de início dos abatimentos (opcional)
      status: mysqlEnum(["ativo", "quitado"]).default("ativo").notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
    });
    clientAdvanceDeductions = mysqlTable("client_advance_deductions", {
      id: int().autoincrement().primaryKey().notNull(),
      advanceId: int("advance_id").notNull().references(() => clientAdvances.id),
      clientId: int("client_id").notNull(),
      cargoLoadId: int("cargo_load_id"),
      // carga que gerou o abatimento
      weeklyClosingId: int("weekly_closing_id"),
      // fechamento que gerou o abatimento
      amount: varchar({ length: 20 }).notNull(),
      // valor abatido
      balanceBefore: varchar("balance_before", { length: 20 }).notNull(),
      balanceAfter: varchar("balance_after", { length: 20 }).notNull(),
      description: text(),
      date: timestamp({ mode: "string" }).notNull(),
      createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createPasswordResetToken: () => createPasswordResetToken,
  createUser: () => createUser,
  getDb: () => getDb,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getValidResetToken: () => getValidResetToken,
  linkCollaboratorToUser: () => linkCollaboratorToUser,
  markTokenAsUsed: () => markTokenAsUsed,
  updateUserPasswordByEmail: () => updateUserPasswordByEmail,
  upsertUser: () => upsertUser
});
import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
function getDbConnectionConfig() {
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
  if (dbHost && dbUser && dbPassword && dbName) {
    console.log(`[Database] Using individual DB params: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
    return {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName
    };
  }
  if (process.env.DATABASE_URL) {
    console.log("[Database] Using DATABASE_URL connection string");
    return process.env.DATABASE_URL;
  }
  return null;
}
async function getDb() {
  if (!_db) {
    const config = getDbConnectionConfig();
    if (!config) {
      console.warn("[Database] No database configuration available");
      return null;
    }
    try {
      if (typeof config === "string") {
        _db = drizzle(config);
      } else {
        const pool = mysql.createPool({
          ...config,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        });
        _db = drizzle(pool);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId || null,
      name: user.name || "",
      email: user.email || ""
    };
    const updateSet = {};
    const textFields = ["loginMethod", "passwordHash"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      values[field] = value;
      updateSet[field] = value;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (drizzleError) {
    console.error("[getUserByEmail] Drizzle query failed:", drizzleError.message);
    console.error("[getUserByEmail] Cause:", drizzleError.cause?.message || drizzleError.cause?.sqlMessage || "unknown");
    try {
      console.log("[getUserByEmail] Attempting raw SQL fallback...");
      const rows = await db.execute(
        /*sql*/
        `SELECT * FROM users WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`
      );
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          openId: row.openId || row.open_id || null,
          name: row.name,
          email: row.email,
          loginMethod: row.loginMethod || row.login_method || "email",
          role: row.role || "user",
          createdAt: row.createdAt || row.created_at || null,
          updatedAt: row.updatedAt || row.updated_at || null,
          lastSignedIn: row.lastSignedIn || row.last_signed_in || null,
          passwordHash: row.password_hash || row.passwordHash || null
        };
      }
      return void 0;
    } catch (rawError) {
      console.error("[getUserByEmail] Raw SQL also failed:", rawError.message);
      throw drizzleError;
    }
  }
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createUser(user) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(users).values(user);
  return result;
}
async function updateUserPasswordByEmail(email, passwordHash, role = "admin") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({ passwordHash, loginMethod: "email", role, updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq(users.email, email));
    return { action: "updated" };
  } else {
    await db.insert(users).values({
      email,
      name: email.split("@")[0],
      passwordHash,
      loginMethod: "email",
      role,
      lastSignedIn: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ")
    });
    return { action: "created" };
  }
}
async function createPasswordResetToken(userId, token) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}
async function getValidResetToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const result = await db.select().from(passwordResetTokens).where(and(
    eq(passwordResetTokens.token, token),
    gt(passwordResetTokens.expiresAt, now),
    eq(passwordResetTokens.usedAt, null)
  )).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function markTokenAsUsed(tokenId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(passwordResetTokens).set({ usedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(passwordResetTokens.id, tokenId));
}
async function linkCollaboratorToUser(email, openId) {
  if (!email) return;
  const db = await getDb();
  if (!db) return;
  const { collaborators: collaborators4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const user = await getUserByOpenId(openId);
  if (!user) return;
  const [collab] = await db.select({ id: collaborators4.id, userId: collaborators4.userId }).from(collaborators4).where(eq(collaborators4.email, email)).limit(1);
  if (collab && !collab.userId) {
    await db.update(collaborators4).set({ userId: user.id }).where(eq(collaborators4.id, collab.id));
    console.log(`[OAuth] Linked collaborator ${collab.id} to user ${user.id} (email: ${email})`);
  }
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/cloudinary.ts
var cloudinary_exports = {};
__export(cloudinary_exports, {
  cloudinaryUpload: () => cloudinaryUpload
});
async function cloudinaryUpload(data, _folder = "btree", originalFileName) {
  let base64;
  let contentType = "image/jpeg";
  if (Buffer.isBuffer(data)) {
    base64 = data.toString("base64");
    contentType = "image/jpeg";
  } else if (data.startsWith("data:")) {
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      base64 = match[2];
    } else {
      base64 = data.replace(/^data:[^;]+;base64,/, "");
    }
  } else {
    base64 = data;
  }
  const dataUri = `data:${contentType};base64,${base64}`;
  const params = new URLSearchParams();
  params.append("file", dataUri);
  params.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (originalFileName) {
    const nameWithoutExt = originalFileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp2 = Date.now();
    params.append("public_id", `${nameWithoutExt}_${timestamp2}`);
  }
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}
var CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET;
var init_cloudinary = __esm({
  "server/cloudinary.ts"() {
    "use strict";
    CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "djob7pxme";
    CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "btree_ambiental";
  }
});

// server/routers/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  createNotification: () => createNotification,
  findUserByName: () => findUserByName,
  findUsersByRole: () => findUsersByRole,
  notificationsRouter: () => notificationsRouter,
  notifyAdmComercial: () => notifyAdmComercial,
  notifyFinanceiro: () => notifyFinanceiro,
  notifyUsers: () => notifyUsers
});
import { z as z5 } from "zod";
import mysql2 from "mysql2/promise";
async function getConnection() {
  return mysql2.createConnection(process.env.DATABASE_URL);
}
async function createNotification(params) {
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
async function notifyUsers(params) {
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
async function findUsersByRole(role) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE role = ?`,
      [role]
    );
    return rows.map((r) => r.id);
  } finally {
    await conn.end();
  }
}
async function findUserByName(name) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM users WHERE name LIKE ? LIMIT 1`,
      [`%${name}%`]
    );
    return rows.length > 0 ? rows[0].id : null;
  } finally {
    await conn.end();
  }
}
async function notifyFinanceiro(params) {
  let juliaId = await findUserByName("Julia");
  if (!juliaId) juliaId = await findUserByName("julia");
  const adminIds = await findUsersByRole("admin");
  const allRecipients = /* @__PURE__ */ new Set();
  if (juliaId) allRecipients.add(juliaId);
  adminIds.forEach((id) => allRecipients.add(id));
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params
    });
  }
}
async function notifyAdmComercial(params) {
  let fabioId = await findUserByName("F\xE1bio");
  if (!fabioId) fabioId = await findUserByName("Fabio");
  const adminIds = await findUsersByRole("admin");
  const allRecipients = /* @__PURE__ */ new Set();
  if (fabioId) allRecipients.add(fabioId);
  adminIds.forEach((id) => allRecipients.add(id));
  if (allRecipients.size > 0) {
    await notifyUsers({
      recipientUserIds: Array.from(allRecipients),
      ...params
    });
  }
}
var notificationsRouter;
var init_notifications = __esm({
  "server/routers/notifications.ts"() {
    "use strict";
    init_trpc();
    notificationsRouter = router({
      // List notifications for current user
      list: protectedProcedure.input(z5.object({
        onlyUnread: z5.boolean().optional().default(false),
        limit: z5.number().optional().default(50)
      }).optional()).query(async ({ ctx, input }) => {
        const conn = await getConnection();
        try {
          const onlyUnread = input?.onlyUnread ?? false;
          const limit = input?.limit ?? 50;
          let query = `SELECT * FROM notifications WHERE recipient_user_id = ?`;
          const params = [ctx.user.id];
          if (onlyUnread) {
            query += ` AND is_read = 0`;
          }
          query += ` ORDER BY created_at DESC LIMIT ?`;
          params.push(limit);
          const [rows] = await conn.execute(query, params);
          return rows;
        } finally {
          await conn.end();
        }
      }),
      // Get unread count
      unreadCount: protectedProcedure.query(async ({ ctx }) => {
        const conn = await getConnection();
        try {
          const [rows] = await conn.execute(
            `SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = ? AND is_read = 0`,
            [ctx.user.id]
          );
          return { count: rows[0]?.count || 0 };
        } finally {
          await conn.end();
        }
      }),
      // Mark one as read
      markAsRead: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ ctx, input }) => {
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
      markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
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
      delete: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ ctx, input }) => {
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
      })
    });
  }
});

// server/autoFinancial.ts
var autoFinancial_exports = {};
__export(autoFinancial_exports, {
  generateFinancialEntriesForCargo: () => generateFinancialEntriesForCargo
});
import { eq as eq5 } from "drizzle-orm";
async function generateFinancialEntriesForCargo(cargo, userId, userName) {
  const db = await getDb();
  if (!db) return;
  const weightNetKg = parseFloat(cargo.weightNetKg || "0");
  if (weightNetKg <= 0) return;
  const weightTon = weightNetKg / 1e3;
  const dateObj = new Date(cargo.date);
  const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
  const dateFmt = dateObj.toLocaleDateString("pt-BR");
  const existing = await db.select().from(financialEntries).where(eq5(financialEntries.cargoLoadId, cargo.id));
  if (existing.length > 0) return;
  if (cargo.destinationId) {
    const [dest] = await db.select().from(cargoDestinations).where(eq5(cargoDestinations.id, cargo.destinationId)).limit(1);
    if (dest) {
      const priceRaw = dest.pricePerUnit ?? (dest.priceType === "m3" ? dest.pricePerM3 : dest.pricePerTon);
      const priceVal = priceRaw ? parseFloat(priceRaw) : 0;
      if (priceVal > 0) {
        const qty = dest.priceType === "m3" ? parseFloat(String(cargo.volumeM3 || 0)) : weightTon;
        const revenueAmount = (qty * priceVal).toFixed(2);
        await db.insert(financialEntries).values({
          type: "receita",
          category: "venda_madeira",
          description: `Carga #${cargo.id} - ${dest.name} - ${qty.toFixed(3)} ${dest.priceType === "m3" ? "m\xB3" : "ton"} \xD7 R$ ${priceVal.toFixed(2)} - NF: ${cargo.invoiceNumber || "S/N"} - Placa: ${cargo.vehiclePlate || "N/I"}`,
          amount: revenueAmount,
          date: dateObj.toISOString().slice(0, 19).replace("T", " "),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "pendente",
          clientName: dest.name,
          cargoLoadId: cargo.id,
          autoGenerated: 1,
          registeredBy: userId,
          registeredByName: userName + " (auto)"
        });
      }
    }
  }
  if (cargo.clientId) {
    const [client] = await db.select().from(clients).where(eq5(clients.id, cargo.clientId)).limit(1);
    if (client && client.pricePerTon) {
      const pricePerTon = parseFloat(client.pricePerTon);
      if (pricePerTon > 0) {
        const expenseAmount = (weightTon * pricePerTon).toFixed(2);
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "Pagamento Fornecedor Madeira",
          description: `Carga #${cargo.id} - ${client.name} - ${weightTon.toFixed(3)} ton \xD7 R$ ${pricePerTon.toFixed(2)}/ton - NF: ${cargo.invoiceNumber || "S/N"} - Placa: ${cargo.vehiclePlate || "N/I"}`,
          amount: expenseAmount,
          date: dateObj.toISOString().slice(0, 19).replace("T", " "),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "pendente",
          clientId: cargo.clientId,
          clientName: client.name,
          cargoLoadId: cargo.id,
          autoGenerated: 1,
          registeredBy: userId,
          registeredByName: userName + " (auto)"
        });
      }
    }
  }
}
var init_autoFinancial = __esm({
  "server/autoFinancial.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/_core/index.ts
import dotenv from "dotenv";
import path2 from "path";
import express2 from "express";
import { createServer } from "http";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
init_const();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
init_notification();
init_trpc();
import { z } from "zod";
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_trpc();

// server/routers/collaborators.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z2 } from "zod";
import { eq as eq2, desc, and as and2, like, or, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
async function resolveAllowedClientIds(db, ctx) {
  if (ctx.user.role === "admin") return null;
  let allowedClientIds = null;
  try {
    const [perm] = await db.select().from(userPermissions).where(eq2(userPermissions.userId, ctx.user.id));
    if (perm?.allowedClientIds) {
      allowedClientIds = JSON.parse(perm.allowedClientIds);
    }
  } catch {
    try {
      const [rows] = await db.execute(sql`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
      const row = rows?.[0];
      if (row?.allowed_client_ids) {
        allowedClientIds = JSON.parse(row.allowed_client_ids);
      }
    } catch {
    }
  }
  if (!allowedClientIds) {
    try {
      const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq2(collaborators.userId, ctx.user.id));
      if (collab?.clientId) {
        allowedClientIds = [collab.clientId];
      }
    } catch {
    }
  }
  return allowedClientIds;
}
var collaboratorRoles = [
  "administrativo",
  "encarregado",
  "mecanico",
  "motosserrista",
  "carregador",
  "operador",
  "motorista",
  "terceirizado"
];
var collaboratorsRouter = router({
  // Listar todos os colaboradores (filtrado por allowedClientIds para encarregados)
  list: protectedProcedure.input(z2.object({
    search: z2.string().optional(),
    role: z2.string().optional(),
    active: z2.boolean().optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allowedClientIds = await resolveAllowedClientIds(db, ctx);
    const conditions = [];
    if (input?.active !== void 0) {
      conditions.push(eq2(collaborators.active, input.active ? 1 : 0));
    }
    if (input?.role) {
      conditions.push(eq2(collaborators.role, input.role));
    }
    if (input?.search) {
      conditions.push(
        or(
          like(collaborators.name, `%${input.search}%`),
          like(collaborators.cpf, `%${input.search}%`),
          like(collaborators.phone, `%${input.search}%`)
        )
      );
    }
    if (allowedClientIds && allowedClientIds.length > 0) {
      conditions.push(inArray(collaborators.clientId, allowedClientIds));
    }
    if (conditions.length > 0) {
      return await db.select().from(collaborators).where(conditions.length === 1 ? conditions[0] : and2(...conditions)).orderBy(desc(collaborators.createdAt));
    }
    return await db.select().from(collaborators).orderBy(desc(collaborators.createdAt));
  }),
  // Buscar colaborador por ID
  getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select().from(collaborators).where(eq2(collaborators.id, input.id)).limit(1);
    return result[0] || null;
  }),
  // Criar colaborador (encarregado só pode cadastrar para o cliente dele)
  create: protectedProcedure.input(z2.object({
    name: z2.string().min(2),
    email: z2.string().email().optional().or(z2.literal("")),
    phone: z2.string().optional(),
    cpf: z2.string().optional(),
    address: z2.string().optional(),
    city: z2.string().optional(),
    state: z2.string().max(2).optional(),
    zipCode: z2.string().optional(),
    role: z2.enum(collaboratorRoles),
    pixKey: z2.string().optional(),
    dailyRate: z2.string().optional(),
    employmentType: z2.enum(["clt", "terceirizado", "diarista"]).optional(),
    shirtSize: z2.enum(["PP", "P", "M", "G", "GG", "XGG"]).optional(),
    pantsSize: z2.string().optional(),
    shoeSize: z2.string().optional(),
    bootSize: z2.string().optional(),
    photoBase64: z2.string().optional(),
    faceDescriptor: z2.string().optional(),
    password: z2.string().min(4).optional(),
    // senha de acesso ao sistema
    clientId: z2.number().nullable().optional()
    // local de trabalho (cliente vinculado)
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allowedClientIds = await resolveAllowedClientIds(db, ctx);
    let finalClientId = input.clientId ?? null;
    if (allowedClientIds && allowedClientIds.length > 0) {
      if (!finalClientId || !allowedClientIds.includes(finalClientId)) {
        finalClientId = allowedClientIds[0];
      }
    }
    let photoUrl;
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, "btree/collaborators");
      photoUrl = result.url;
    }
    let userId;
    if (input.email && input.password) {
      const passwordHash = await bcrypt.hash(input.password, 10);
      await updateUserPasswordByEmail(input.email, passwordHash, "user");
      const userRecord = await db.select({ id: users.id }).from(users).where(eq2(users.email, input.email)).limit(1);
      if (userRecord.length > 0) userId = userRecord[0].id;
    }
    const [inserted] = await db.insert(collaborators).values({
      name: input.name,
      email: input.email || void 0,
      phone: input.phone,
      cpf: input.cpf,
      address: input.address,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      role: input.role,
      pixKey: input.pixKey,
      dailyRate: input.dailyRate,
      employmentType: input.employmentType,
      shirtSize: input.shirtSize,
      pantsSize: input.pantsSize,
      shoeSize: input.shoeSize,
      bootSize: input.bootSize,
      photoUrl,
      faceDescriptor: input.faceDescriptor,
      userId: userId || null,
      clientId: finalClientId,
      createdBy: ctx.user.id
    });
    const newId = inserted.insertId;
    const created = await db.select().from(collaborators).where(eq2(collaborators.id, newId)).limit(1);
    return created[0];
  }),
  // Vincular colaborador a usuário do sistema
  linkUser: protectedProcedure.input(z2.object({
    collaboratorId: z2.number(),
    userId: z2.number().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(collaborators).set({ userId: input.userId }).where(eq2(collaborators.id, input.collaboratorId));
    return { success: true };
  }),
  // Listar usuários disponíveis para vincular (que ainda não estão vinculados a outro colaborador)
  listAvailableUsers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(users.name);
    const allCollabs = await db.select({ userId: collaborators.userId }).from(collaborators);
    const linkedUserIds = new Set(allCollabs.map((c) => c.userId).filter(Boolean));
    return allUsers.map((u) => ({ ...u, isLinked: linkedUserIds.has(u.id) }));
  }),
  // Atualizar colaborador
  update: protectedProcedure.input(z2.object({
    id: z2.number(),
    name: z2.string().min(2).optional(),
    email: z2.string().email().optional().or(z2.literal("")),
    phone: z2.string().optional(),
    cpf: z2.string().optional(),
    address: z2.string().optional(),
    city: z2.string().optional(),
    state: z2.string().max(2).optional(),
    zipCode: z2.string().optional(),
    role: z2.enum(collaboratorRoles).optional(),
    pixKey: z2.string().optional(),
    dailyRate: z2.string().optional(),
    employmentType: z2.enum(["clt", "terceirizado", "diarista"]).optional(),
    shirtSize: z2.enum(["PP", "P", "M", "G", "GG", "XGG"]).optional().nullable(),
    pantsSize: z2.string().optional(),
    shoeSize: z2.string().optional(),
    bootSize: z2.string().optional(),
    photoBase64: z2.string().optional(),
    faceDescriptor: z2.string().optional(),
    active: z2.boolean().optional(),
    password: z2.string().min(4).optional(),
    // nova senha (opcional na edição)
    clientId: z2.number().nullable().optional()
    // local de trabalho (cliente vinculado)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, photoBase64, password, ...rest } = input;
    const updateData = { ...rest };
    if (photoBase64) {
      const result = await cloudinaryUpload(photoBase64, "btree/collaborators");
      updateData.photoUrl = result.url;
    }
    if (updateData.active !== void 0) {
      updateData.active = updateData.active ? 1 : 0;
    }
    if (input.email && password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await updateUserPasswordByEmail(input.email, passwordHash, "user");
      const userRecord = await db.select({ id: users.id }).from(users).where(eq2(users.email, input.email)).limit(1);
      if (userRecord.length > 0) {
        updateData.userId = userRecord[0].id;
      }
    }
    await db.update(collaborators).set(updateData).where(eq2(collaborators.id, id));
    const updated = await db.select().from(collaborators).where(eq2(collaborators.id, id)).limit(1);
    return updated[0];
  }),
  // Salvar descritor facial (para biometria)
  saveFaceDescriptor: protectedProcedure.input(z2.object({
    id: z2.number(),
    faceDescriptor: z2.string(),
    // JSON array de 128 floats
    photoBase64: z2.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const updateData = { faceDescriptor: input.faceDescriptor };
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, "btree/faces");
      updateData.photoUrl = result.url;
    }
    await db.update(collaborators).set(updateData).where(eq2(collaborators.id, input.id));
    return { success: true };
  }),
  // Registrar ponto (manual ou biométrico)
  registerAttendance: protectedProcedure.input(z2.object({
    collaboratorId: z2.number(),
    checkInOverride: z2.string().optional(),
    // ISO string para registro manual
    checkOutOverride: z2.string().optional(),
    // ISO string para saída manual
    location: z2.string().optional(),
    latitude: z2.string().optional(),
    longitude: z2.string().optional(),
    notes: z2.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const checkInTime = input.checkInOverride ? new Date(input.checkInOverride) : /* @__PURE__ */ new Date();
    const checkOutTime = input.checkOutOverride ? new Date(input.checkOutOverride) : void 0;
    const checkInStr = checkInTime instanceof Date ? checkInTime.toISOString().replace("T", " ").slice(0, 19) : checkInTime;
    const checkOutStr = checkOutTime instanceof Date ? checkOutTime.toISOString().replace("T", " ").slice(0, 19) : checkOutTime;
    const dateStr = checkInStr.slice(0, 10) + " 00:00:00";
    const [inserted] = await db.insert(biometricAttendance).values({
      collaboratorId: input.collaboratorId,
      date: dateStr,
      checkInTime: checkInStr,
      checkOutTime: checkOutStr,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      registeredBy: ctx.user.id,
      notes: input.notes
    });
    const newId = inserted.insertId;
    return { success: true, id: newId };
  }),
  // Listar registros de ponto (filtrado por allowedClientIds)
  listAttendance: protectedProcedure.input(z2.object({
    date: z2.string().optional(),
    // YYYY-MM-DD
    collaboratorId: z2.number().optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allowedClientIds = await resolveAllowedClientIds(db, ctx);
    const baseQuery = db.select({
      id: biometricAttendance.id,
      collaboratorId: biometricAttendance.collaboratorId,
      collaboratorName: collaborators.name,
      collaboratorRole: collaborators.role,
      collaboratorPhoto: collaborators.photoUrl,
      collaboratorClientId: collaborators.clientId,
      checkInTime: biometricAttendance.checkInTime,
      checkOutTime: biometricAttendance.checkOutTime,
      location: biometricAttendance.location,
      latitude: biometricAttendance.latitude,
      longitude: biometricAttendance.longitude,
      notes: biometricAttendance.notes,
      createdAt: biometricAttendance.createdAt
    }).from(biometricAttendance).innerJoin(collaborators, eq2(biometricAttendance.collaboratorId, collaborators.id));
    let conditions = [];
    if (input?.collaboratorId) {
      conditions.push(eq2(biometricAttendance.collaboratorId, input.collaboratorId));
    }
    if (allowedClientIds && allowedClientIds.length > 0) {
      conditions.push(inArray(collaborators.clientId, allowedClientIds));
    }
    if (conditions.length > 0) {
      const records2 = await baseQuery.where(conditions.length === 1 ? conditions[0] : and2(...conditions)).orderBy(desc(biometricAttendance.checkInTime));
      return records2;
    }
    const records = await baseQuery.orderBy(desc(biometricAttendance.checkInTime));
    return records;
  }),
  // Buscar todos os descritores faciais (para reconhecimento)
  getMyPhoto: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select({ photoUrl: collaborators.photoUrl }).from(collaborators).where(eq2(collaborators.userId, ctx.user.id)).limit(1);
    return result[0]?.photoUrl ?? null;
  }),
  getFaceDescriptors: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role,
      photoUrl: collaborators.photoUrl,
      faceDescriptor: collaborators.faceDescriptor
    }).from(collaborators).where(and2(eq2(collaborators.active, 1)));
    return result.filter((c) => c.faceDescriptor !== null);
  })
});

// server/routers/sectors.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z3 } from "zod";
import { alias } from "drizzle-orm/mysql-core";
import { eq as eq3 } from "drizzle-orm";
var collaborators2 = collaborators;
var driverAlias = alias(collaborators, "driver");
var sectorsRouter = router({
  // --- SETORES ---
  listSectors: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(sectors).orderBy(sectors.name);
  }),
  createSector: protectedProcedure.input(z3.object({
    name: z3.string().min(1),
    description: z3.string().optional(),
    color: z3.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(sectors).values({
      name: input.name,
      description: input.description,
      color: input.color || "#16a34a",
      createdBy: ctx.user.id
    });
    return { id: result.insertId };
  }),
  updateSector: protectedProcedure.input(z3.object({
    id: z3.number(),
    name: z3.string().min(1).optional(),
    description: z3.string().optional(),
    color: z3.string().optional(),
    active: z3.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(sectors).set(data).where(eq3(sectors.id, id));
    return { success: true };
  }),
  deleteSector: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(sectors).where(eq3(sectors.id, input.id));
    return { success: true };
  }),
  // --- TIPOS DE EQUIPAMENTO ---
  listEquipmentTypes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(equipmentTypes).orderBy(equipmentTypes.name);
  }),
  createEquipmentType: protectedProcedure.input(z3.object({ name: z3.string().min(1) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(equipmentTypes).values({ name: input.name });
    return { id: result.insertId };
  }),
  // --- EQUIPAMENTOS ---
  listEquipment: protectedProcedure.input(z3.object({
    search: z3.string().optional(),
    typeId: z3.number().optional(),
    status: z3.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let userAllowedClientIds = null;
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq3(userPermissions.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        userAllowedClientIds = JSON.parse(perm.allowedClientIds);
      } else {
        const [collab] = await db.select({ clientId: collaborators2.clientId }).from(collaborators2).where(eq3(collaborators2.userId, ctx.user.id));
        if (collab?.clientId) {
          userAllowedClientIds = [collab.clientId];
        } else {
          userAllowedClientIds = null;
        }
      }
    }
    const rows = await db.select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      model: equipment.model,
      year: equipment.year,
      serialNumber: equipment.serialNumber,
      licensePlate: equipment.licensePlate,
      imageUrl: equipment.imageUrl,
      status: equipment.status,
      typeId: equipment.typeId,
      sectorId: equipment.sectorId,
      clientId: equipment.clientId,
      typeName: equipmentTypes.name,
      clientName: clients.name,
      createdAt: equipment.createdAt,
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM,
      category: equipment.category,
      isThirdParty: equipment.isThirdParty,
      thirdPartyOwner: equipment.thirdPartyOwner,
      invoiceUrl: equipment.invoiceUrl,
      documentUrl: equipment.documentUrl,
      insuranceUrl: equipment.insuranceUrl,
      responsibleDriverId: equipment.responsibleDriverId,
      responsibleDriverName: driverAlias.name
    }).from(equipment).leftJoin(equipmentTypes, eq3(equipment.typeId, equipmentTypes.id)).leftJoin(clients, eq3(equipment.clientId, clients.id)).leftJoin(driverAlias, eq3(equipment.responsibleDriverId, driverAlias.id)).orderBy(equipment.name);
    return rows.filter((r) => {
      if (userAllowedClientIds && userAllowedClientIds.length > 0) {
        if (!r.clientId || !userAllowedClientIds.includes(r.clientId)) return false;
      }
      if (input.typeId && r.typeId !== input.typeId) return false;
      if (input.status && r.status !== input.status) return false;
      if (input.search) {
        const s = input.search.toLowerCase();
        return r.name.toLowerCase().includes(s) || (r.brand || "").toLowerCase().includes(s) || (r.model || "").toLowerCase().includes(s) || (r.serialNumber || "").toLowerCase().includes(s) || (r.licensePlate || "").toLowerCase().includes(s);
      }
      return true;
    });
  }),
  createEquipment: protectedProcedure.input(z3.object({
    name: z3.string().min(1),
    typeId: z3.number(),
    sectorId: z3.number().optional(),
    clientId: z3.number().optional().nullable(),
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
    licensePlate: z3.string().optional(),
    imageUrl: z3.string().optional(),
    status: z3.enum(["ativo", "manutencao", "inativo"]).optional(),
    defaultHeightM: z3.string().optional(),
    defaultWidthM: z3.string().optional(),
    defaultLengthM: z3.string().optional(),
    invoiceUrl: z3.string().optional(),
    documentUrl: z3.string().optional(),
    insuranceUrl: z3.string().optional(),
    responsibleDriverId: z3.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let imageUrl = input.imageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const result2 = await cloudinaryUpload(imageUrl, "btree/equipment");
      imageUrl = result2.url;
    }
    const [result] = await db.insert(equipment).values({
      ...input,
      imageUrl,
      status: input.status || "ativo"
    });
    return { id: result.insertId };
  }),
  updateEquipment: protectedProcedure.input(z3.object({
    id: z3.number(),
    name: z3.string().optional(),
    typeId: z3.number().optional(),
    sectorId: z3.number().optional().nullable(),
    clientId: z3.number().optional().nullable(),
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
    licensePlate: z3.string().optional(),
    imageUrl: z3.string().optional(),
    status: z3.enum(["ativo", "manutencao", "inativo"]).optional(),
    defaultHeightM: z3.string().optional().nullable(),
    defaultWidthM: z3.string().optional().nullable(),
    defaultLengthM: z3.string().optional().nullable(),
    invoiceUrl: z3.string().optional().nullable(),
    documentUrl: z3.string().optional().nullable(),
    insuranceUrl: z3.string().optional().nullable(),
    responsibleDriverId: z3.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    if (data.imageUrl && data.imageUrl.startsWith("data:")) {
      const uploaded = await cloudinaryUpload(data.imageUrl, "btree/equipment");
      data.imageUrl = uploaded.url;
    }
    await db.update(equipment).set(data).where(eq3(equipment.id, id));
    return { success: true };
  }),
  deleteEquipment: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipment).where(eq3(equipment.id, input.id));
    return { success: true };
  })
});

// server/routers/usersManagement.ts
init_trpc();
init_db();
init_schema();
import { z as z4 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { eq as eq4, desc as desc2 } from "drizzle-orm";

// server/auth.ts
init_db();
import bcrypt2 from "bcryptjs";
var SALT_ROUNDS = 10;
async function hashPassword(password) {
  return bcrypt2.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt2.compare(password, hash);
}
async function registerUser(data) {
  const existingUser = await getUserByEmail(data.email);
  if (existingUser) {
    throw new Error("Email j\xE1 cadastrado");
  }
  const passwordHash = await hashPassword(data.password);
  const user = {
    name: data.name,
    email: data.email,
    passwordHash,
    loginMethod: "email",
    role: data.role || "user"
  };
  await createUser(user);
  const newUser = await getUserByEmail(data.email);
  if (!newUser) {
    throw new Error("Erro ao criar usu\xE1rio");
  }
  const { passwordHash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}
async function loginUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Email ou senha inv\xE1lidos");
  }
  if (!user.passwordHash) {
    throw new Error("Usu\xE1rio n\xE3o possui senha cadastrada");
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Email ou senha inv\xE1lidos");
  }
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// server/routers/usersManagement.ts
var usersManagementRouter = router({
  // Listar todos os usuários (admin only)
  list: protectedProcedure.input(z4.object({
    search: z4.string().optional()
  }).optional()).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    let query = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn
    }).from(users).$dynamic();
    const results = await query.orderBy(desc2(users.createdAt));
    if (input?.search) {
      const s = input.search.toLowerCase();
      return results.filter(
        (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s)
      );
    }
    return results;
  }),
  // Criar novo usuário (admin only)
  create: protectedProcedure.input(z4.object({
    name: z4.string().min(2),
    email: z4.string().email(),
    password: z4.string().min(4),
    role: z4.enum(["user", "admin"]).default("user")
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const existing = await db.select({ id: users.id }).from(users).where(eq4(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new TRPCError3({ code: "CONFLICT", message: "Email j\xE1 cadastrado" });
    }
    const passwordHash = await hashPassword(input.password);
    await db.insert(users).values({
      name: input.name,
      email: input.email,
      passwordHash,
      loginMethod: "email",
      role: input.role,
      lastSignedIn: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { success: true };
  }),
  // Atualizar usuário (admin only)
  update: protectedProcedure.input(z4.object({
    id: z4.number(),
    name: z4.string().min(2).optional(),
    email: z4.string().email().optional(),
    role: z4.enum(["user", "admin"]).optional(),
    password: z4.string().min(4).optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    const updateData = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.role) updateData.role = input.role;
    if (input.password) {
      updateData.passwordHash = await hashPassword(input.password);
    }
    await db.update(users).set(updateData).where(eq4(users.id, input.id));
    return { success: true };
  }),
  // Remover usuário (admin only, não pode remover a si mesmo)
  delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    if (ctx.user.id === input.id) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Voc\xEA n\xE3o pode remover sua pr\xF3pria conta" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
    await db.delete(users).where(eq4(users.id, input.id));
    return { success: true };
  })
});

// server/routers/cargoLoads.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z6 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq6, desc as desc3, asc, and as and3, sql as sql2, ne, or as or3 } from "drizzle-orm";
import mysql3 from "mysql2/promise";
async function getDirectConnection() {
  const connConfig = process.env.DB_HOST ? {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || ""
  } : process.env.DATABASE_URL;
  const conn = await mysql3.createConnection(connConfig);
  return conn;
}
var cargoLoadsRouter = router({
  // ===== DESTINOS =====
  // Verificar se nota fiscal já existe (para validação em tempo real no frontend)
  checkInvoice: protectedProcedure.input(z6.object({ invoiceNumber: z6.string(), excludeId: z6.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { exists: false, cargo: null };
    const trimmed = input.invoiceNumber.trim();
    if (!trimmed) return { exists: false, cargo: null };
    const conditions = input.excludeId ? and3(eq6(cargoLoads.invoiceNumber, trimmed), ne(cargoLoads.id, input.excludeId)) : eq6(cargoLoads.invoiceNumber, trimmed);
    const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date, clientName: cargoLoads.clientName }).from(cargoLoads).where(conditions).limit(1);
    if (existing.length > 0) {
      return { exists: true, cargo: existing[0] };
    }
    return { exists: false, cargo: null };
  }),
  listDestinations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(cargoDestinations).where(eq6(cargoDestinations.active, 1)).orderBy(cargoDestinations.name);
  }),
  createDestination: protectedProcedure.input(z6.object({
    name: z6.string().min(1),
    address: z6.string().optional(),
    city: z6.string().optional(),
    state: z6.string().optional(),
    notes: z6.string().optional(),
    clientId: z6.number().optional(),
    pricePerTon: z6.string().optional(),
    pricePerM3: z6.string().optional(),
    priceType: z6.enum(["ton", "m3"]).optional().default("ton"),
    // Campos de comprador (unificação)
    isBuyer: z6.number().optional().default(0),
    cnpjCpf: z6.string().optional(),
    inscricaoEstadual: z6.string().optional(),
    phone: z6.string().optional(),
    email: z6.string().optional(),
    cep: z6.string().optional(),
    contactPerson: z6.string().optional(),
    product: z6.string().optional(),
    paymentMethod: z6.string().optional(),
    pricePerUnit: z6.string().optional(),
    unit: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const {
      name,
      address,
      city,
      state,
      notes,
      clientId,
      pricePerTon,
      pricePerM3,
      priceType,
      isBuyer,
      cnpjCpf,
      inscricaoEstadual,
      phone,
      email,
      cep,
      contactPerson,
      product,
      paymentMethod,
      pricePerUnit,
      unit
    } = input;
    let conn = null;
    try {
      conn = await getDirectConnection();
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const [result] = await conn.execute(
        "INSERT INTO cargo_destinations (name, address, city, state, notes, client_id, price_per_ton, price_per_m3, price_type, is_buyer, cnpj_cpf, inscricao_estadual, phone, email, cep, contact_person, product, payment_method, price_per_unit, unit, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          address || null,
          city || null,
          state || null,
          notes || null,
          clientId || null,
          pricePerTon || null,
          pricePerM3 || null,
          priceType || "ton",
          isBuyer || 0,
          cnpjCpf || null,
          inscricaoEstadual || null,
          phone || null,
          email || null,
          cep || null,
          contactPerson || null,
          product || null,
          paymentMethod || null,
          pricePerUnit || null,
          unit || "ton",
          ctx.user.id,
          now
        ]
      );
      return { success: true, id: result?.insertId };
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  }),
  updateDestination: protectedProcedure.input(z6.object({
    id: z6.number(),
    name: z6.string().min(1).optional(),
    address: z6.string().optional(),
    city: z6.string().optional(),
    state: z6.string().optional(),
    notes: z6.string().optional(),
    clientId: z6.number().nullable().optional(),
    pricePerTon: z6.string().nullable().optional(),
    pricePerM3: z6.string().nullable().optional(),
    priceType: z6.enum(["ton", "m3"]).nullable().optional(),
    // Campos de comprador
    isBuyer: z6.number().nullable().optional(),
    cnpjCpf: z6.string().nullable().optional(),
    inscricaoEstadual: z6.string().nullable().optional(),
    phone: z6.string().nullable().optional(),
    email: z6.string().nullable().optional(),
    cep: z6.string().nullable().optional(),
    contactPerson: z6.string().nullable().optional(),
    product: z6.string().nullable().optional(),
    paymentMethod: z6.string().nullable().optional(),
    pricePerUnit: z6.string().nullable().optional(),
    unit: z6.string().nullable().optional()
  })).mutation(async ({ input }) => {
    const {
      id,
      name,
      address,
      city,
      state,
      notes,
      clientId,
      pricePerTon,
      pricePerM3,
      priceType,
      isBuyer,
      cnpjCpf,
      inscricaoEstadual,
      phone,
      email,
      cep,
      contactPerson,
      product,
      paymentMethod,
      pricePerUnit,
      unit
    } = input;
    let conn = null;
    try {
      conn = await getDirectConnection();
      const setClauses = [];
      const params = [];
      if (name !== void 0) {
        setClauses.push("name = ?");
        params.push(name);
      }
      if (address !== void 0) {
        setClauses.push("address = ?");
        params.push(address || null);
      }
      if (city !== void 0) {
        setClauses.push("city = ?");
        params.push(city || null);
      }
      if (state !== void 0) {
        setClauses.push("state = ?");
        params.push(state || null);
      }
      if (notes !== void 0) {
        setClauses.push("notes = ?");
        params.push(notes || null);
      }
      if (clientId !== void 0) {
        setClauses.push("client_id = ?");
        params.push(clientId || null);
      }
      if (pricePerTon !== void 0) {
        setClauses.push("price_per_ton = ?");
        params.push(pricePerTon || null);
      }
      if (pricePerM3 !== void 0) {
        setClauses.push("price_per_m3 = ?");
        params.push(pricePerM3 || null);
      }
      if (priceType !== void 0) {
        setClauses.push("price_type = ?");
        params.push(priceType || "ton");
      }
      if (isBuyer !== void 0) {
        setClauses.push("is_buyer = ?");
        params.push(isBuyer ?? 0);
      }
      if (cnpjCpf !== void 0) {
        setClauses.push("cnpj_cpf = ?");
        params.push(cnpjCpf || null);
      }
      if (inscricaoEstadual !== void 0) {
        setClauses.push("inscricao_estadual = ?");
        params.push(inscricaoEstadual || null);
      }
      if (phone !== void 0) {
        setClauses.push("phone = ?");
        params.push(phone || null);
      }
      if (email !== void 0) {
        setClauses.push("email = ?");
        params.push(email || null);
      }
      if (cep !== void 0) {
        setClauses.push("cep = ?");
        params.push(cep || null);
      }
      if (contactPerson !== void 0) {
        setClauses.push("contact_person = ?");
        params.push(contactPerson || null);
      }
      if (product !== void 0) {
        setClauses.push("product = ?");
        params.push(product || null);
      }
      if (paymentMethod !== void 0) {
        setClauses.push("payment_method = ?");
        params.push(paymentMethod || null);
      }
      if (pricePerUnit !== void 0) {
        setClauses.push("price_per_unit = ?");
        params.push(pricePerUnit || null);
      }
      if (unit !== void 0) {
        setClauses.push("unit = ?");
        params.push(unit || "ton");
      }
      if (setClauses.length === 0) return { success: true };
      params.push(id);
      await conn.execute(`UPDATE cargo_destinations SET ${setClauses.join(", ")} WHERE id = ?`, params);
      return { success: true };
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  }),
  deleteDestination: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(cargoDestinations).set({ active: 0 }).where(eq6(cargoDestinations.id, input.id));
    return { success: true };
  }),
  // ===== CARGAS =====
  list: protectedProcedure.input(z6.object({
    search: z6.string().optional(),
    clientId: z6.number().optional(),
    status: z6.enum(["pendente", "entregue", "cancelado"]).optional(),
    dateFrom: z6.string().optional(),
    dateTo: z6.string().optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let userAllowedClientIds = null;
    if (ctx.user.role !== "admin") {
      const { userPermissions: upTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [perm] = await db.select().from(upTable).where(eq6(upTable.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        userAllowedClientIds = JSON.parse(perm.allowedClientIds);
      } else {
        const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq6(collaborators.userId, ctx.user.id));
        if (collab?.clientId) {
          userAllowedClientIds = [collab.clientId];
        } else {
          userAllowedClientIds = null;
        }
      }
    }
    const results = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverCollaboratorId: cargoLoads.driverCollaboratorId,
      driverName: cargoLoads.driverName,
      heightM: cargoLoads.heightM,
      widthM: cargoLoads.widthM,
      lengthM: cargoLoads.lengthM,
      volumeM3: cargoLoads.volumeM3,
      woodType: cargoLoads.woodType,
      destination: cargoLoads.destination,
      destinationId: cargoLoads.destinationId,
      weightKg: cargoLoads.weightKg,
      invoiceNumber: cargoLoads.invoiceNumber,
      clientId: cargoLoads.clientId,
      clientName: cargoLoads.clientName,
      photosJson: cargoLoads.photosJson,
      notes: cargoLoads.notes,
      status: cargoLoads.status,
      trackingStatus: cargoLoads.trackingStatus,
      trackingUpdatedAt: cargoLoads.trackingUpdatedAt,
      trackingNotes: cargoLoads.trackingNotes,
      weightOutPhotoUrl: cargoLoads.weightOutPhotoUrl,
      weightInPhotoUrl: cargoLoads.weightInPhotoUrl,
      registeredBy: cargoLoads.registeredBy,
      createdAt: cargoLoads.createdAt,
      updatedAt: cargoLoads.updatedAt,
      weightOutKg: cargoLoads.weightOutKg,
      weightInKg: cargoLoads.weightInKg,
      weightNetKg: cargoLoads.weightNetKg,
      workLocationId: cargoLoads.workLocationId,
      finalHeightM: cargoLoads.finalHeightM,
      finalWidthM: cargoLoads.finalWidthM,
      finalLengthM: cargoLoads.finalLengthM,
      finalVolumeM3: cargoLoads.finalVolumeM3,
      invoiceUrl: cargoLoads.invoiceUrl,
      boletoUrl: cargoLoads.boletoUrl,
      boletoAmount: cargoLoads.boletoAmount,
      boletoDueDate: cargoLoads.boletoDueDate,
      paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
      paymentStatus: cargoLoads.paymentStatus,
      paidAt: cargoLoads.paidAt,
      humidity: cargoLoads.humidity,
      deliveryDate: cargoLoads.deliveryDate,
      // Joins
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate,
      locationName: gpsLocations.name,
      driverPhotoUrl: collaborators.photoUrl,
      receiverName: cargoLoads.receiverName,
      thirdPartyContractor: cargoLoads.thirdPartyContractor,
      thirdPartyCost: cargoLoads.thirdPartyCost
    }).from(cargoLoads).leftJoin(clients, eq6(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq6(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq6(cargoLoads.vehicleId, equipment.id)).leftJoin(gpsLocations, eq6(cargoLoads.workLocationId, gpsLocations.id)).leftJoin(collaborators, eq6(cargoLoads.driverCollaboratorId, collaborators.id)).orderBy(desc3(cargoLoads.date), desc3(cargoLoads.createdAt));
    let filtered = results;
    if (userAllowedClientIds && userAllowedClientIds.length > 0) {
      filtered = filtered.filter((r) => r.clientId && userAllowedClientIds.includes(r.clientId));
    }
    if (input?.search) {
      const s = input.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.driverName?.toLowerCase().includes(s) || r.clientName?.toLowerCase().includes(s) || r.clientNameJoined?.toLowerCase().includes(s) || r.destination?.toLowerCase().includes(s) || r.destinationNameJoined?.toLowerCase().includes(s) || r.invoiceNumber?.toLowerCase().includes(s) || r.vehiclePlate?.toLowerCase().includes(s) || r.vehiclePlateJoined?.toLowerCase().includes(s)
      );
    }
    if (input?.clientId) filtered = filtered.filter((r) => r.clientId === input.clientId);
    if (input?.status) filtered = filtered.filter((r) => r.status === input.status);
    if (input?.dateFrom) filtered = filtered.filter((r) => r.date && r.date >= input.dateFrom);
    if (input?.dateTo) filtered = filtered.filter((r) => r.date && r.date <= input.dateTo);
    return filtered.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined,
      driverPhotoUrl: r.driverPhotoUrl || null
    }));
  }),
  getById: protectedProcedure.input(z6.object({ id: z6.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const result = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverCollaboratorId: cargoLoads.driverCollaboratorId,
      driverName: cargoLoads.driverName,
      heightM: cargoLoads.heightM,
      widthM: cargoLoads.widthM,
      lengthM: cargoLoads.lengthM,
      volumeM3: cargoLoads.volumeM3,
      woodType: cargoLoads.woodType,
      destination: cargoLoads.destination,
      destinationId: cargoLoads.destinationId,
      weightKg: cargoLoads.weightKg,
      invoiceNumber: cargoLoads.invoiceNumber,
      clientId: cargoLoads.clientId,
      clientName: cargoLoads.clientName,
      photosJson: cargoLoads.photosJson,
      notes: cargoLoads.notes,
      status: cargoLoads.status,
      trackingStatus: cargoLoads.trackingStatus,
      trackingUpdatedAt: cargoLoads.trackingUpdatedAt,
      trackingNotes: cargoLoads.trackingNotes,
      weightOutPhotoUrl: cargoLoads.weightOutPhotoUrl,
      weightInPhotoUrl: cargoLoads.weightInPhotoUrl,
      registeredBy: cargoLoads.registeredBy,
      createdAt: cargoLoads.createdAt,
      updatedAt: cargoLoads.updatedAt,
      weightOutKg: cargoLoads.weightOutKg,
      weightInKg: cargoLoads.weightInKg,
      weightNetKg: cargoLoads.weightNetKg,
      finalHeightM: cargoLoads.finalHeightM,
      finalWidthM: cargoLoads.finalWidthM,
      finalLengthM: cargoLoads.finalLengthM,
      finalVolumeM3: cargoLoads.finalVolumeM3,
      workLocationId: cargoLoads.workLocationId,
      invoiceUrl: cargoLoads.invoiceUrl,
      boletoUrl: cargoLoads.boletoUrl,
      boletoAmount: cargoLoads.boletoAmount,
      boletoDueDate: cargoLoads.boletoDueDate,
      paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
      paymentStatus: cargoLoads.paymentStatus,
      paidAt: cargoLoads.paidAt,
      humidity: cargoLoads.humidity,
      deliveryDate: cargoLoads.deliveryDate,
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate,
      locationName: gpsLocations.name,
      driverPhotoUrl: collaborators.photoUrl,
      receiverName: cargoLoads.receiverName,
      thirdPartyContractor: cargoLoads.thirdPartyContractor,
      thirdPartyCost: cargoLoads.thirdPartyCost
    }).from(cargoLoads).leftJoin(clients, eq6(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq6(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq6(cargoLoads.vehicleId, equipment.id)).leftJoin(gpsLocations, eq6(cargoLoads.workLocationId, gpsLocations.id)).leftJoin(collaborators, eq6(cargoLoads.driverCollaboratorId, collaborators.id)).where(eq6(cargoLoads.id, input.id)).limit(1);
    if (!result.length) throw new TRPCError4({ code: "NOT_FOUND" });
    const r = result[0];
    return {
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined,
      driverPhotoUrl: r.driverPhotoUrl || null
    };
  }),
  // Listagem pública para portal do cliente (por token)
  getByClientToken: publicProcedure.input(z6.object({ clientId: z6.number(), token: z6.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const client = await db.select().from(clients).where(eq6(clients.id, input.clientId)).limit(1);
    if (!client.length) throw new TRPCError4({ code: "NOT_FOUND" });
    const loads = await db.select().from(cargoLoads).where(eq6(cargoLoads.clientId, input.clientId)).orderBy(desc3(cargoLoads.date), desc3(cargoLoads.createdAt));
    return loads;
  }),
  uploadPhoto: protectedProcedure.input(z6.object({
    cargoId: z6.number(),
    photoBase64: z6.string(),
    photoType: z6.enum(["cargo", "weight_out", "weight_in"]).default("cargo")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const uploaded = await cloudinaryUpload(input.photoBase64, `btree/cargo/${input.cargoId}`);
    if (input.photoType === "weight_out") {
      await db.update(cargoLoads).set({ weightOutPhotoUrl: uploaded.url, updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq6(cargoLoads.id, input.cargoId));
      return { url: uploaded.url };
    } else if (input.photoType === "weight_in") {
      await db.update(cargoLoads).set({ weightInPhotoUrl: uploaded.url, updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq6(cargoLoads.id, input.cargoId));
      return { url: uploaded.url };
    }
    const existing = await db.select({ photosJson: cargoLoads.photosJson }).from(cargoLoads).where(eq6(cargoLoads.id, input.cargoId)).limit(1);
    let photos = [];
    if (existing[0]?.photosJson) {
      try {
        photos = JSON.parse(existing[0].photosJson);
      } catch {
        photos = [];
      }
    }
    photos.push(uploaded.url);
    await db.update(cargoLoads).set({ photosJson: JSON.stringify(photos), updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq6(cargoLoads.id, input.cargoId));
    return { url: uploaded.url, photos };
  }),
  create: protectedProcedure.input(z6.object({
    date: z6.string(),
    vehicleId: z6.number().optional(),
    vehiclePlate: z6.string().optional(),
    driverCollaboratorId: z6.number().optional(),
    driverName: z6.string().optional(),
    heightM: z6.string(),
    widthM: z6.string(),
    lengthM: z6.string(),
    volumeM3: z6.string(),
    weightKg: z6.string().optional(),
    weightOutKg: z6.string().optional(),
    weightInKg: z6.string().optional(),
    weightNetKg: z6.string().optional(),
    woodType: z6.string().optional(),
    destination: z6.string().optional(),
    destinationId: z6.number().optional(),
    invoiceNumber: z6.string().optional(),
    clientId: z6.number().optional(),
    clientName: z6.string().optional(),
    photosJson: z6.string().optional(),
    notes: z6.string().optional(),
    status: z6.enum(["pendente", "entregue", "cancelado"]).optional(),
    workLocationId: z6.number().optional(),
    humidity: z6.string().optional(),
    deliveryDate: z6.string().optional(),
    receiverName: z6.string().optional(),
    thirdPartyContractor: z6.string().optional(),
    thirdPartyCost: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    if (input.invoiceNumber && input.invoiceNumber.trim() !== "") {
      const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date }).from(cargoLoads).where(eq6(cargoLoads.invoiceNumber, input.invoiceNumber.trim())).limit(1);
      if (existing.length > 0) {
        const dateFmt = existing[0].date ? new Date(existing[0].date).toLocaleDateString("pt-BR") : "N/I";
        throw new TRPCError4({
          code: "CONFLICT",
          message: `Nota fiscal ${input.invoiceNumber} j\xE1 est\xE1 sendo usada em outra carga (Placa: ${existing[0].vehiclePlate || "N/I"}, Data: ${dateFmt}). Verifique o n\xFAmero da nota.`
        });
      }
    }
    let finalPhotosJson = input.photosJson;
    if (input.photosJson) {
      try {
        const photos = JSON.parse(input.photosJson);
        const uploadedUrls = [];
        for (const photo of photos) {
          if (photo.startsWith("data:")) {
            const uploaded = await cloudinaryUpload(photo, `btree/cargo/new`);
            uploadedUrls.push(uploaded.url);
          } else {
            uploadedUrls.push(photo);
          }
        }
        finalPhotosJson = JSON.stringify(uploadedUrls);
      } catch {
      }
    }
    const sanitizeNum = (v) => v ? v.replace(",", ".") : v;
    try {
      await db.insert(cargoLoads).values({
        ...input,
        photosJson: finalPhotosJson || null,
        heightM: sanitizeNum(input.heightM),
        widthM: sanitizeNum(input.widthM),
        lengthM: sanitizeNum(input.lengthM),
        volumeM3: sanitizeNum(input.volumeM3),
        weightKg: sanitizeNum(input.weightKg),
        weightNetKg: sanitizeNum(input.weightNetKg),
        weightOutKg: sanitizeNum(input.weightOutKg),
        weightInKg: sanitizeNum(input.weightInKg),
        humidity: sanitizeNum(input.humidity),
        date: new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate).toISOString().slice(0, 19).replace("T", " ") : null,
        status: input.status || "pendente",
        trackingStatus: "aguardando",
        registeredBy: ctx.user.id,
        workLocationId: input.workLocationId || null
      });
    } catch (dbErr) {
      const realErr = dbErr.cause || dbErr;
      console.error("[cargoLoads.create] DB ERROR:", realErr.code, realErr.errno, realErr.sqlState, realErr.sqlMessage || realErr.message);
      console.error("[cargoLoads.create] Full error:", dbErr.message);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro DB [${realErr.code || "UNKNOWN"}]: ${realErr.sqlMessage || realErr.message || dbErr.message}`
      });
    }
    try {
      const { notifyAdmComercial: notifyAdmComercial2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const dateFmt = new Date(input.date).toLocaleDateString("pt-BR");
      const clientInfo = input.clientName || (input.destination ? `Destino: ${input.destination}` : "");
      const weightInfo = input.weightNetKg ? `${(parseFloat(input.weightNetKg) / 1e3).toFixed(2)} ton` : `${input.volumeM3} m\xB3`;
      await notifyAdmComercial2({
        type: "fechamento_carga",
        title: `Nova carga registrada${clientInfo ? ": " + clientInfo : ""}`,
        message: `Data: ${dateFmt} | ${weightInfo} | Placa: ${input.vehiclePlate || "N/I"} | Por: ${ctx.user.name}`,
        relatedType: "cargo_load"
      });
    } catch (e) {
    }
    if (input.status === "entregue" && input.weightNetKg && parseFloat(input.weightNetKg) > 0) {
      try {
        const { generateFinancialEntriesForCargo: generateFinancialEntriesForCargo2 } = await Promise.resolve().then(() => (init_autoFinancial(), autoFinancial_exports));
        const [newCargo] = await db.select().from(cargoLoads).orderBy(desc3(cargoLoads.id)).limit(1);
        if (newCargo) {
          await generateFinancialEntriesForCargo2(newCargo, ctx.user.id, ctx.user.name);
        }
      } catch (e) {
      }
    }
    return { success: true };
  }),
  update: protectedProcedure.input(z6.object({
    id: z6.number(),
    date: z6.string().optional(),
    vehicleId: z6.number().optional(),
    vehiclePlate: z6.string().optional(),
    driverCollaboratorId: z6.number().optional(),
    driverName: z6.string().optional(),
    heightM: z6.string().optional(),
    widthM: z6.string().optional(),
    lengthM: z6.string().optional(),
    volumeM3: z6.string().optional(),
    weightKg: z6.string().optional(),
    weightNetKg: z6.string().optional(),
    woodType: z6.string().optional(),
    destination: z6.string().optional(),
    destinationId: z6.number().optional(),
    invoiceNumber: z6.string().optional(),
    clientId: z6.number().optional(),
    clientName: z6.string().optional(),
    photosJson: z6.string().optional(),
    notes: z6.string().optional(),
    status: z6.enum(["pendente", "entregue", "cancelado"]).optional(),
    trackingStatus: z6.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).optional(),
    trackingNotes: z6.string().optional(),
    weightOutKg: z6.string().optional(),
    weightInKg: z6.string().optional(),
    workLocationId: z6.number().optional(),
    humidity: z6.string().optional(),
    deliveryDate: z6.string().optional(),
    invoiceUrl: z6.string().optional(),
    boletoUrl: z6.string().optional(),
    boletoAmount: z6.string().optional(),
    boletoDueDate: z6.string().optional(),
    paymentReceiptUrl: z6.string().optional(),
    paymentStatus: z6.enum(["sem_boleto", "a_pagar", "pago"]).optional(),
    paidAt: z6.string().optional(),
    receiverName: z6.string().optional(),
    thirdPartyContractor: z6.string().optional(),
    thirdPartyCost: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    if (input.invoiceNumber && input.invoiceNumber.trim() !== "") {
      const existing = await db.select({ id: cargoLoads.id, vehiclePlate: cargoLoads.vehiclePlate, date: cargoLoads.date }).from(cargoLoads).where(and3(
        eq6(cargoLoads.invoiceNumber, input.invoiceNumber.trim()),
        ne(cargoLoads.id, input.id)
      )).limit(1);
      if (existing.length > 0) {
        const dateFmt = existing[0].date ? new Date(existing[0].date).toLocaleDateString("pt-BR") : "N/I";
        throw new TRPCError4({
          code: "CONFLICT",
          message: `Nota fiscal ${input.invoiceNumber} j\xE1 est\xE1 sendo usada em outra carga (Placa: ${existing[0].vehiclePlate || "N/I"}, Data: ${dateFmt}). Verifique o n\xFAmero da nota.`
        });
      }
    }
    const { id, date, deliveryDate, receiverName, thirdPartyContractor, thirdPartyCost, notes, ...rest } = input;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const updateData = { ...rest, updatedAt: now };
    if (date) updateData.date = new Date(date).toISOString().slice(0, 19).replace("T", " ");
    if (deliveryDate !== void 0) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate).toISOString().slice(0, 19).replace("T", " ") : null;
    if (rest.trackingStatus) updateData.trackingUpdatedAt = now;
    const numericFields = ["heightM", "widthM", "lengthM", "volumeM3", "weightKg", "weightNetKg", "weightOutKg", "weightInKg", "humidity", "finalHeightM", "finalWidthM", "finalLengthM", "finalVolumeM3", "boletoAmount"];
    for (const field of numericFields) {
      if (updateData[field] && typeof updateData[field] === "string") {
        updateData[field] = updateData[field].replace(",", ".");
      }
    }
    if (rest.photosJson) {
      try {
        const photos = JSON.parse(rest.photosJson);
        const uploadedUrls = [];
        for (const photo of photos) {
          if (photo.startsWith("data:")) {
            const uploaded = await cloudinaryUpload(photo, `btree/cargo/${id}`);
            uploadedUrls.push(uploaded.url);
          } else {
            uploadedUrls.push(photo);
          }
        }
        updateData.photosJson = JSON.stringify(uploadedUrls);
      } catch {
      }
    }
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === void 0) {
        delete updateData[key];
      }
    }
    console.log("[cargoLoads.update] id:", id, "keys:", Object.keys(updateData), "receiverName:", receiverName);
    try {
      await db.update(cargoLoads).set(updateData).where(eq6(cargoLoads.id, id));
      const extraUpdates = [];
      const extraParams = [];
      if (receiverName !== void 0) {
        extraUpdates.push("receiver_name = ?");
        extraParams.push(receiverName || null);
      }
      if (thirdPartyContractor !== void 0) {
        extraUpdates.push("third_party_contractor = ?");
        extraParams.push(thirdPartyContractor || null);
      }
      if (thirdPartyCost !== void 0) {
        extraUpdates.push("third_party_cost = ?");
        extraParams.push(thirdPartyCost || null);
      }
      if (notes !== void 0) {
        extraUpdates.push("notes = ?");
        extraParams.push(notes || null);
      }
      if (extraUpdates.length > 0) {
        extraParams.push(id);
        const conn = await getDirectConnection();
        try {
          await conn.execute(`UPDATE cargo_loads SET ${extraUpdates.join(", ")} WHERE id = ?`, extraParams);
        } finally {
          await conn.end();
        }
      }
    } catch (dbErr) {
      const realErr = dbErr.cause || dbErr;
      console.error("[cargoLoads.update] DB ERROR:", realErr.code, realErr.errno, realErr.sqlState, realErr.sqlMessage || realErr.message);
      console.error("[cargoLoads.update] Full error:", dbErr.message);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro DB [${realErr.code || "UNKNOWN"}]: ${realErr.sqlMessage || realErr.message || dbErr.message}`
      });
    }
    if (input.status === "entregue") {
      try {
        const { generateFinancialEntriesForCargo: generateFinancialEntriesForCargo2 } = await Promise.resolve().then(() => (init_autoFinancial(), autoFinancial_exports));
        const [cargo] = await db.select().from(cargoLoads).where(eq6(cargoLoads.id, id)).limit(1);
        if (cargo) {
          await generateFinancialEntriesForCargo2(cargo, ctx.user.id, ctx.user.name);
        }
      } catch (e) {
      }
    }
    return { success: true };
  }),
  updateTracking: protectedProcedure.input(z6.object({
    id: z6.number(),
    trackingStatus: z6.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
    trackingNotes: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(cargoLoads).set({
      trackingStatus: input.trackingStatus,
      trackingNotes: input.trackingNotes,
      trackingUpdatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      // Finalizar carga quando tracking chega em "finalizado"
      status: input.trackingStatus === "finalizado" ? "entregue" : void 0
    }).where(eq6(cargoLoads.id, input.id));
    if (input.trackingStatus === "finalizado") {
      try {
        const { generateFinancialEntriesForCargo: generateFinancialEntriesForCargo2 } = await Promise.resolve().then(() => (init_autoFinancial(), autoFinancial_exports));
        const [cargo] = await db.select().from(cargoLoads).where(eq6(cargoLoads.id, input.id)).limit(1);
        if (cargo) {
          await generateFinancialEntriesForCargo2(cargo, ctx.user.id, ctx.user.name);
        }
      } catch (e) {
      }
    }
    return { success: true };
  }),
  // Upload de documento (nota, boleto, comprovante) para uma carga
  uploadDocument: protectedProcedure.input(z6.object({
    cargoId: z6.number(),
    docBase64: z6.string(),
    docType: z6.enum(["invoice", "boleto", "payment_receipt"]),
    boletoAmount: z6.string().optional(),
    boletoDueDate: z6.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const uploaded = await cloudinaryUpload(input.docBase64, `btree/docs/${input.cargoId}`);
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const updateData = { updatedAt: now };
    if (input.docType === "invoice") {
      updateData.invoiceUrl = uploaded.url;
    } else if (input.docType === "boleto") {
      updateData.boletoUrl = uploaded.url;
      updateData.paymentStatus = "a_pagar";
      if (input.boletoAmount) updateData.boletoAmount = input.boletoAmount;
      if (input.boletoDueDate) updateData.boletoDueDate = input.boletoDueDate;
    } else if (input.docType === "payment_receipt") {
      updateData.paymentReceiptUrl = uploaded.url;
      updateData.paymentStatus = "pago";
      updateData.paidAt = now;
    }
    await db.update(cargoLoads).set(updateData).where(eq6(cargoLoads.id, input.cargoId));
    if (input.docType === "boleto") {
      try {
        const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
        const amountInfo = input.boletoAmount ? `R$ ${input.boletoAmount}` : "Valor n\xE3o informado";
        const dueInfo = input.boletoDueDate ? (/* @__PURE__ */ new Date(input.boletoDueDate + "T12:00:00")).toLocaleDateString("pt-BR") : "Sem vencimento";
        await notifyFinanceiro2({
          type: "pagamento_boleto",
          title: `Novo boleto cadastrado - Carga #${input.cargoId}`,
          message: `Valor: ${amountInfo} | Vencimento: ${dueInfo}`,
          relatedId: input.cargoId,
          relatedType: "cargo_load"
        });
      } catch (e) {
      }
    }
    return { url: uploaded.url, success: true };
  }),
  // Listar cargas com boleto (para integração financeira)
  listBoletos: protectedProcedure.input(z6.object({
    status: z6.enum(["a_pagar", "pago"]).optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      clientId: cargoLoads.clientId,
      clientName: cargoLoads.clientName,
      destination: cargoLoads.destination,
      invoiceNumber: cargoLoads.invoiceNumber,
      boletoUrl: cargoLoads.boletoUrl,
      boletoAmount: cargoLoads.boletoAmount,
      boletoDueDate: cargoLoads.boletoDueDate,
      paymentReceiptUrl: cargoLoads.paymentReceiptUrl,
      paymentStatus: cargoLoads.paymentStatus,
      paidAt: cargoLoads.paidAt,
      volumeM3: cargoLoads.volumeM3,
      weightNetKg: cargoLoads.weightNetKg,
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name
    }).from(cargoLoads).leftJoin(clients, eq6(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq6(cargoLoads.destinationId, cargoDestinations.id)).orderBy(desc3(cargoLoads.boletoDueDate), desc3(cargoLoads.date));
    let filtered = results.filter((r) => r.boletoUrl);
    if (input?.status) filtered = filtered.filter((r) => r.paymentStatus === input.status);
    return filtered.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination
    }));
  }),
  // Marcar boleto como pago (com data e observação opcionais)
  markAsPaid: protectedProcedure.input(z6.object({
    id: z6.number(),
    paidAt: z6.string().optional(),
    // formato YYYY-MM-DD
    notes: z6.string().optional()
  })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const paidAtDatetime = input.paidAt ? input.paidAt + " 12:00:00" : now;
      await conn.execute(
        "UPDATE cargo_loads SET payment_status = ?, paid_at = ?, updated_at = ? WHERE id = ?",
        ["pago", paidAtDatetime, now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  // Desfazer pagamento de uma carga (reverter para sem_boleto)
  unmarkAsPaid: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      await conn.execute(
        "UPDATE cargo_loads SET payment_status = ?, paid_at = NULL, updated_at = ? WHERE id = ?",
        ["sem_boleto", now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  // Atualizar data de pagamento de um boleto já pago
  updatePaymentDate: protectedProcedure.input(z6.object({
    id: z6.number(),
    paidAt: z6.string()
    // formato YYYY-MM-DD
  })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const paidAtDatetime = input.paidAt + " 12:00:00";
      await conn.execute(
        "UPDATE cargo_loads SET paid_at = ?, updated_at = ? WHERE id = ?",
        [paidAtDatetime, now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  delete: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(cargoLoads).where(eq6(cargoLoads.id, input.id));
    return { success: true };
  }),
  // ===== TRACKING PHOTOS =====
  listTrackingPhotos: protectedProcedure.input(z6.object({ cargoId: z6.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(cargoTrackingPhotos).where(eq6(cargoTrackingPhotos.cargoId, input.cargoId)).orderBy(cargoTrackingPhotos.createdAt);
  }),
  addTrackingPhoto: protectedProcedure.input(z6.object({
    cargoId: z6.number(),
    stage: z6.string().min(1),
    photoBase64: z6.string(),
    notes: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const uploaded = await cloudinaryUpload(input.photoBase64, `btree/tracking/${input.cargoId}`);
    await db.insert(cargoTrackingPhotos).values({
      cargoId: input.cargoId,
      stage: input.stage,
      photoUrl: uploaded.url,
      notes: input.notes,
      registeredBy: ctx.user.id,
      registeredByName: ctx.user.name
    });
    return { url: uploaded.url, success: true };
  }),
  deleteTrackingPhoto: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(cargoTrackingPhotos).where(eq6(cargoTrackingPhotos.id, input.id));
    return { success: true };
  }),
  // Listar fotos de tracking para o portal do cliente (público)
  getTrackingPhotosPublic: publicProcedure.input(z6.object({ cargoId: z6.number(), clientId: z6.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [load] = await db.select({ clientId: cargoLoads.clientId, clientName: cargoLoads.clientName }).from(cargoLoads).where(eq6(cargoLoads.id, input.cargoId)).limit(1);
    if (!load) throw new TRPCError4({ code: "NOT_FOUND" });
    return db.select().from(cargoTrackingPhotos).where(eq6(cargoTrackingPhotos.cargoId, input.cargoId)).orderBy(cargoTrackingPhotos.createdAt);
  }),
  // ===== CAMINHÕES E MOTORISTAS =====
  // Listar caminhões disponíveis (tipo veículo)
  listTrucks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const all = await db.select({
      id: equipment.id,
      name: equipment.name,
      licensePlate: equipment.licensePlate,
      brand: equipment.brand,
      model: equipment.model,
      status: equipment.status,
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM
    }).from(equipment).orderBy(equipment.name);
    return all.filter((e) => e.licensePlate || e.name.toLowerCase().includes("caminh") || e.name.toLowerCase().includes("ve\xEDculo") || e.name.toLowerCase().includes("veiculo") || e.name.toLowerCase().includes("carro") || e.name.toLowerCase().includes("van"));
  }),
  // Listar motoristas (colaboradores)
  listDrivers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role
    }).from(collaborators).orderBy(collaborators.name);
  }),
  // ===== EXPERIÊNCIA DO MOTORISTA =====
  // Buscar informações do motorista logado (colaborador vinculado + caminhão)
  getMyDriverInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [myCollaborator] = await db.select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role
    }).from(collaborators).where(eq6(collaborators.userId, ctx.user.id)).limit(1);
    const allEquip = await db.select({
      id: equipment.id,
      name: equipment.name,
      licensePlate: equipment.licensePlate,
      brand: equipment.brand,
      model: equipment.model,
      status: equipment.status,
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM
    }).from(equipment).orderBy(equipment.name);
    const trucksList = allEquip.filter(
      (e) => e.licensePlate || e.name.toLowerCase().includes("caminh") || e.name.toLowerCase().includes("ve\xEDculo") || e.name.toLowerCase().includes("veiculo") || e.name.toLowerCase().includes("carro") || e.name.toLowerCase().includes("van") || e.name.toLowerCase().includes("bitrem") || e.name.toLowerCase().includes("carreta")
    );
    let defaultTruckId = null;
    if (myCollaborator) {
      const [lastCargo] = await db.select({ vehicleId: cargoLoads.vehicleId }).from(cargoLoads).where(eq6(cargoLoads.driverCollaboratorId, myCollaborator.id)).orderBy(desc3(cargoLoads.createdAt)).limit(1);
      if (lastCargo?.vehicleId) defaultTruckId = lastCargo.vehicleId;
    }
    const defaultTruck = trucksList.find((t2) => t2.id === defaultTruckId);
    const defaultMeasures = {
      heightM: defaultTruck?.defaultHeightM || "2.4",
      widthM: defaultTruck?.defaultWidthM || "2.4",
      lengthM: defaultTruck?.defaultLengthM || "13.80"
    };
    return {
      collaborator: myCollaborator || null,
      defaultTruckId,
      trucks: trucksList,
      isDriver: myCollaborator?.role === "motorista",
      defaultMeasures
    };
  }),
  // Buscar cargas pendentes do motorista logado
  getMyPendingLoads: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [myCollaborator] = await db.select({ id: collaborators.id }).from(collaborators).where(eq6(collaborators.userId, ctx.user.id)).limit(1);
    if (!myCollaborator) return [];
    const loads = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      heightM: cargoLoads.heightM,
      widthM: cargoLoads.widthM,
      lengthM: cargoLoads.lengthM,
      volumeM3: cargoLoads.volumeM3,
      clientName: cargoLoads.clientName,
      clientId: cargoLoads.clientId,
      destination: cargoLoads.destination,
      destinationId: cargoLoads.destinationId,
      status: cargoLoads.status,
      trackingStatus: cargoLoads.trackingStatus,
      trackingNotes: cargoLoads.trackingNotes,
      notes: cargoLoads.notes,
      createdAt: cargoLoads.createdAt,
      // Joins
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate
    }).from(cargoLoads).leftJoin(clients, eq6(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq6(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq6(cargoLoads.vehicleId, equipment.id)).where(and3(
      eq6(cargoLoads.driverCollaboratorId, myCollaborator.id),
      eq6(cargoLoads.status, "pendente")
    )).orderBy(desc3(cargoLoads.createdAt));
    return loads.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined
    }));
  }),
  // Avançar tracking + enviar foto em um único passo
  // Atualizar medidas padrão de um caminhão (admin)
  updateTruckDefaults: protectedProcedure.input(z6.object({
    equipmentId: z6.number(),
    defaultHeightM: z6.string().optional(),
    defaultWidthM: z6.string().optional(),
    defaultLengthM: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(equipment).set({
      defaultHeightM: input.defaultHeightM || null,
      defaultWidthM: input.defaultWidthM || null,
      defaultLengthM: input.defaultLengthM || null
    }).where(eq6(equipment.id, input.equipmentId));
    return { success: true };
  }),
  advanceTrackingWithPhoto: protectedProcedure.input(z6.object({
    cargoId: z6.number(),
    stage: z6.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
    photoBase64: z6.string().optional(),
    notes: z6.string().optional(),
    // Campos de peso (pesagem saída e chegada)
    weightKg: z6.string().optional(),
    weightNetKg: z6.string().optional(),
    // Campos de metragem final (ao finalizar)
    finalHeightM: z6.string().optional(),
    finalWidthM: z6.string().optional(),
    finalLengthM: z6.string().optional(),
    finalVolumeM3: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const updateData = {
      trackingStatus: input.stage,
      trackingNotes: input.notes || null,
      trackingUpdatedAt: now,
      updatedAt: now
    };
    if (input.stage === "pesagem_saida" && input.weightKg) {
      updateData.weightOutKg = input.weightKg;
    }
    if (input.stage === "pesagem_chegada" && input.weightKg) {
      updateData.weightInKg = input.weightKg;
    }
    if (input.stage === "pesagem_chegada" && input.weightNetKg) {
      updateData.weightNetKg = input.weightNetKg;
    }
    if (input.stage === "finalizado") {
      updateData.status = "entregue";
      if (input.finalHeightM) updateData.finalHeightM = input.finalHeightM;
      if (input.finalWidthM) updateData.finalWidthM = input.finalWidthM;
      if (input.finalLengthM) updateData.finalLengthM = input.finalLengthM;
      if (input.finalVolumeM3) updateData.finalVolumeM3 = input.finalVolumeM3;
    }
    await db.update(cargoLoads).set(updateData).where(eq6(cargoLoads.id, input.cargoId));
    let photoUrl = null;
    if (input.photoBase64) {
      const uploaded = await cloudinaryUpload(input.photoBase64, `btree/tracking/${input.cargoId}`);
      photoUrl = uploaded.url;
      await db.insert(cargoTrackingPhotos).values({
        cargoId: input.cargoId,
        stage: input.stage,
        photoUrl: uploaded.url,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name
      });
    }
    return { success: true, photoUrl };
  }),
  // ===== FECHAMENTOS SEMANAIS =====
  listWeeklyClosings: protectedProcedure.input(z6.object({ clientId: z6.number() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    let query = db.select({
      id: cargoWeeklyClosings.id,
      clientId: cargoWeeklyClosings.clientId,
      clientName: clients.name,
      weekStart: cargoWeeklyClosings.weekStart,
      weekEnd: cargoWeeklyClosings.weekEnd,
      totalLoads: cargoWeeklyClosings.totalLoads,
      totalWeightKg: cargoWeeklyClosings.totalWeightKg,
      totalAmount: cargoWeeklyClosings.totalAmount,
      pricePerTon: cargoWeeklyClosings.pricePerTon,
      dueDate: cargoWeeklyClosings.dueDate,
      status: cargoWeeklyClosings.status,
      paidAt: cargoWeeklyClosings.paidAt,
      receiptUrl: cargoWeeklyClosings.receiptUrl,
      notes: cargoWeeklyClosings.notes,
      createdAt: cargoWeeklyClosings.createdAt
    }).from(cargoWeeklyClosings).leftJoin(clients, eq6(cargoWeeklyClosings.clientId, clients.id)).orderBy(desc3(cargoWeeklyClosings.weekEnd));
    const results = await query;
    if (input?.clientId) return results.filter((r) => r.clientId === input.clientId);
    return results;
  }),
  createWeeklyClosing: protectedProcedure.input(z6.object({
    clientId: z6.number(),
    weekStart: z6.string(),
    weekEnd: z6.string(),
    pricePerTon: z6.string().optional(),
    notes: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const normalizeDate = (d) => d.length === 10 ? d + "T12:00:00" : d;
    const weekStartStr = input.weekStart.slice(0, 10);
    const weekEndStr = input.weekEnd.slice(0, 10);
    const [client] = await db.select().from(clients).where(eq6(clients.id, input.clientId));
    let pricePerTon = input.pricePerTon;
    if (!pricePerTon || parseFloat(pricePerTon) === 0) {
      const clientPrice = client?.pricePerTon;
      pricePerTon = clientPrice && parseFloat(String(clientPrice)) > 0 ? String(clientPrice) : "130";
    }
    const conn = await getDirectConnection();
    let loadsInPeriod = [];
    try {
      const [rows] = await conn.execute(
        `SELECT id, weight_net_kg, weight_out_kg FROM cargo_loads WHERE client_id = ? AND DATE(COALESCE(delivery_date, date)) >= ? AND DATE(COALESCE(delivery_date, date)) <= ?`,
        [input.clientId, weekStartStr, weekEndStr]
      );
      loadsInPeriod = rows;
    } finally {
      await conn.end();
    }
    const totalLoads = loadsInPeriod.length;
    const totalWeightKg = loadsInPeriod.reduce((sum, l) => {
      const weight = parseFloat(l.weight_net_kg || l.weight_out_kg || "0");
      return sum + weight;
    }, 0);
    const totalWeightTon = totalWeightKg / 1e3;
    const totalAmount = (totalWeightTon * parseFloat(pricePerTon)).toFixed(2);
    const paymentTermDays = client?.paymentTermDays || 21;
    const dueDate = new Date(normalizeDate(input.weekEnd));
    dueDate.setDate(dueDate.getDate() + paymentTermDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10) + " 12:00:00";
    const result = await db.insert(cargoWeeklyClosings).values({
      clientId: input.clientId,
      weekStart: weekStartStr + " 12:00:00",
      weekEnd: weekEndStr + " 12:00:00",
      totalLoads,
      totalWeightKg: totalWeightKg.toFixed(2),
      totalAmount,
      pricePerTon,
      dueDate: dueDateStr,
      status: "fechado",
      closedBy: ctx.user.id,
      notes: input.notes
    });
    try {
      const { notifyAdmComercial: notifyAdmComercial2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const clientName = client?.name || `Cliente #${input.clientId}`;
      const weekStartFmt = (/* @__PURE__ */ new Date(input.weekStart + "T12:00:00")).toLocaleDateString("pt-BR");
      const weekEndFmt = (/* @__PURE__ */ new Date(input.weekEnd + "T12:00:00")).toLocaleDateString("pt-BR");
      await notifyAdmComercial2({
        type: "fechamento_semanal",
        title: `Fechamento semanal: ${clientName}`,
        message: `Per\xEDodo ${weekStartFmt} a ${weekEndFmt} | ${totalLoads} cargas | ${totalWeightTon.toFixed(2)} ton | R$ ${totalAmount}`,
        relatedId: result.insertId,
        relatedType: "weekly_closing"
      });
    } catch (e) {
    }
    return { success: true, id: result.insertId, totalLoads, totalWeightKg: totalWeightKg.toFixed(2), totalAmount };
  }),
  updateWeeklyClosingStatus: protectedProcedure.input(z6.object({
    id: z6.number(),
    status: z6.enum(["aberto", "fechado", "pago", "atrasado"]),
    paidAt: z6.string().optional(),
    receiptUrl: z6.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const updateData = { status: input.status };
    if (input.status === "pago") updateData.paidAt = input.paidAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    if (input.receiptUrl) updateData.receiptUrl = input.receiptUrl;
    await db.update(cargoWeeklyClosings).set(updateData).where(eq6(cargoWeeklyClosings.id, input.id));
    if (input.status === "pago") {
      try {
        const [closing] = await db.select().from(cargoWeeklyClosings).where(eq6(cargoWeeklyClosings.id, input.id)).limit(1);
        if (closing) {
          const conn2 = await getDirectConnection();
          try {
            const weekStartStr = closing.weekStart ? new Date(closing.weekStart).toISOString().slice(0, 10) : null;
            const weekEndStr = closing.weekEnd ? new Date(closing.weekEnd).toISOString().slice(0, 10) : null;
            if (weekStartStr && weekEndStr) {
              await conn2.execute(
                `UPDATE cargo_loads SET payment_status = 'pago', updated_at = NOW() WHERE client_id = ? AND DATE(COALESCE(delivery_date, date)) >= ? AND DATE(COALESCE(delivery_date, date)) <= ? AND payment_status != 'pago'`,
                [closing.clientId, weekStartStr, weekEndStr]
              );
            }
          } finally {
            await conn2.end();
          }
        }
      } catch (e) {
        console.warn("[WeeklyClosing] Error marking loads as paid:", e);
      }
    }
    if (input.status === "pago" || input.receiptUrl) {
      try {
        const [closing] = await db.select().from(cargoWeeklyClosings).where(eq6(cargoWeeklyClosings.id, input.id)).limit(1);
        if (closing) {
          const [client] = await db.select().from(clients).where(eq6(clients.id, closing.clientId)).limit(1);
          const clientName = client?.name || "Cliente";
          const weekStartFmt = closing.weekStart ? new Date(closing.weekStart).toLocaleDateString("pt-BR") : "-";
          const weekEndFmt = closing.weekEnd ? new Date(closing.weekEnd).toLocaleDateString("pt-BR") : "-";
          const totalAmount = closing.totalAmount ? parseFloat(closing.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00";
          const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          await notifyOwner2({
            title: `Fechamento ${input.status === "pago" ? "marcado como PAGO" : "atualizado"}: ${clientName}`,
            content: `Semana ${weekStartFmt} a ${weekEndFmt}
Valor: R$ ${totalAmount}${input.receiptUrl ? "\nComprovante anexado." : ""}`
          }).catch(() => {
          });
          const { notifyAdmComercial: notifyAdmComercial2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
          await notifyAdmComercial2({
            type: "fechamento_semanal",
            title: `Fechamento ${input.status === "pago" ? "PAGO" : "atualizado"}: ${clientName}`,
            message: `Semana ${weekStartFmt} a ${weekEndFmt} \u2014 R$ ${totalAmount}${input.receiptUrl ? " (comprovante anexado)" : ""}`,
            relatedId: closing.id,
            relatedType: "weekly_closing"
          }).catch(() => {
          });
        }
      } catch (e) {
        console.warn("[WeeklyClosing] Error sending notification:", e);
      }
    }
    return { success: true };
  }),
  deleteWeeklyClosing: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(cargoWeeklyClosings).where(eq6(cargoWeeklyClosings.id, input.id));
    return { success: true };
  }),
  // Atualizar data de pagamento de um fechamento semanal já pago
  updateWeeklyClosingPaymentDate: protectedProcedure.input(z6.object({
    id: z6.number(),
    paidAt: z6.string()
    // formato YYYY-MM-DD
  })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const paidAtDatetime = input.paidAt + " 12:00:00";
      await conn.execute(
        "UPDATE cargo_weekly_closings SET paid_at = ?, updated_at = ? WHERE id = ?",
        [paidAtDatetime, now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  // ===== DOCUMENTOS DO CLIENTE =====
  listClientDocuments: protectedProcedure.input(z6.object({ clientId: z6.number() })).query(async ({ input }) => {
    let conn = null;
    try {
      conn = await getDirectConnection();
      await conn.execute(`
          CREATE TABLE IF NOT EXISTS client_documents (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            \`type\` enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
            title varchar(255) NOT NULL,
            file_url varchar(1000) NOT NULL,
            file_type varchar(50),
            notes text,
            uploaded_by int,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(id)
          )
        `);
      const [rows] = await conn.execute(
        "SELECT id, client_id as clientId, `type`, title, file_url as fileUrl, file_type as fileType, notes, uploaded_by as uploadedBy, created_at as createdAt FROM client_documents WHERE client_id = ? ORDER BY created_at DESC",
        [input.clientId]
      );
      return rows || [];
    } catch (err) {
      console.error("[listClientDocuments] Error:", err?.message, err?.code, err?.errno);
      throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao listar documentos: ${err?.message || "Desconhecido"}` });
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  }),
  uploadClientDocument: protectedProcedure.input(z6.object({
    clientId: z6.number(),
    type: z6.enum(["proposta", "contrato", "nota_fiscal", "boleto", "recibo", "outros"]),
    title: z6.string().min(1),
    fileBase64: z6.string(),
    fileType: z6.string().optional(),
    fileName: z6.string().optional(),
    notes: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const uploaded = await cloudinaryUpload(
      input.fileBase64,
      `btree/client-docs/${input.clientId}`,
      input.fileName
    );
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    let conn = null;
    try {
      conn = await getDirectConnection();
      await conn.execute(`
          CREATE TABLE IF NOT EXISTS client_documents (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            \`type\` enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
            title varchar(255) NOT NULL,
            file_url varchar(1000) NOT NULL,
            file_type varchar(50),
            notes text,
            uploaded_by int,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(id)
          )
        `);
      const [result] = await conn.execute(
        "INSERT INTO client_documents (client_id, `type`, title, file_url, file_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [input.clientId, input.type, input.title, uploaded.url, input.fileType || null, input.notes || null, now]
      );
      return { success: true, id: result?.insertId, url: uploaded.url };
    } catch (err) {
      console.error("[uploadClientDocument] Error:", err?.message, err?.code, err?.errno, err?.sqlState);
      throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao salvar documento: ${err?.message || "Desconhecido"}` });
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  }),
  deleteClientDocument: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    let conn = null;
    try {
      conn = await getDirectConnection();
      await conn.execute("DELETE FROM client_documents WHERE id = ?", [input.id]);
      return { success: true };
    } catch (err) {
      console.error("[deleteClientDocument] Error:", err?.message);
      throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao excluir documento: ${err?.message || "Desconhecido"}` });
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  }),
  // ===== ATUALIZAR PREÇO DO CLIENTE =====
  updateClientPricing: protectedProcedure.input(z6.object({
    clientId: z6.number(),
    pricePerTon: z6.string().optional(),
    residuePerTon: z6.string().optional(),
    billingCycle: z6.enum(["semanal", "quinzenal", "mensal"]).optional(),
    billingDayOfWeek: z6.number().optional(),
    paymentTermDays: z6.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const { clientId, ...rest } = input;
    await db.update(clients).set(rest).where(eq6(clients.id, clientId));
    return { success: true };
  }),
  // ===== RELATÓRIO POR DESTINO/COMPRADOR =====
  markReceivedByBuyer: protectedProcedure.input(z6.object({ id: z6.number(), received: z6.boolean() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(cargoLoads).set({
      receivedByBuyer: input.received ? 1 : 0,
      receivedAt: input.received ? now : null
    }).where(eq6(cargoLoads.id, input.id));
    const { financialEntries: financialEntries2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    if (input.received) {
      const existing = await db.select({ id: financialEntries2.id }).from(financialEntries2).where(and3(eq6(financialEntries2.cargoLoadId, input.id), eq6(financialEntries2.autoGenerated, 1))).limit(1);
      if (existing.length === 0) {
        const [cargo] = await db.select({
          id: cargoLoads.id,
          date: cargoLoads.date,
          destinationId: cargoLoads.destinationId,
          weightNetKg: cargoLoads.weightNetKg,
          weightKg: cargoLoads.weightKg,
          volumeM3: cargoLoads.volumeM3,
          invoiceNumber: cargoLoads.invoiceNumber
        }).from(cargoLoads).where(eq6(cargoLoads.id, input.id)).limit(1);
        if (cargo && cargo.destinationId) {
          const [dest] = await db.select({
            id: cargoDestinations.id,
            name: cargoDestinations.name,
            pricePerTon: cargoDestinations.pricePerTon,
            pricePerM3: cargoDestinations.pricePerM3,
            priceType: cargoDestinations.priceType,
            pricePerUnit: cargoDestinations.pricePerUnit,
            unit: cargoDestinations.unit
          }).from(cargoDestinations).where(eq6(cargoDestinations.id, cargo.destinationId)).limit(1);
          if (dest) {
            const weightNetKg = parseFloat(cargo.weightNetKg || cargo.weightKg || "0");
            const weightTon = weightNetKg / 1e3;
            const volumeM3 = parseFloat(String(cargo.volumeM3 || 0));
            const priceRaw = dest.pricePerUnit ?? (dest.priceType === "m3" ? dest.pricePerM3 : dest.pricePerTon);
            const priceVal = priceRaw ? parseFloat(priceRaw) : 0;
            if (priceVal > 0 && (weightTon > 0 || volumeM3 > 0)) {
              const qty = dest.priceType === "m3" ? volumeM3 : weightTon;
              const revenueAmount = (qty * priceVal).toFixed(2);
              const dateObj = new Date(cargo.date || now);
              const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
              await db.insert(financialEntries2).values({
                type: "receita",
                category: "venda_madeira",
                description: `Carga #${cargo.id} recebida - ${dest.name} - ${qty.toFixed(3)} ${dest.priceType === "m3" ? "m\xB3" : "ton"} \xD7 R$ ${priceVal.toFixed(2)} - NF: ${cargo.invoiceNumber || "S/N"}`,
                amount: revenueAmount,
                date: dateObj.toISOString().slice(0, 19).replace("T", " "),
                referenceMonth: refMonth,
                paymentMethod: "transferencia",
                status: "confirmado",
                clientName: dest.name,
                cargoLoadId: cargo.id,
                autoGenerated: 1,
                registeredBy: ctx.user.id,
                registeredByName: ctx.user.name + " (auto-recebimento)"
              });
            }
          }
        }
      }
    } else {
      await db.delete(financialEntries2).where(and3(
        eq6(financialEntries2.cargoLoadId, input.id),
        eq6(financialEntries2.autoGenerated, 1)
      ));
    }
    return { success: true, financialUpdated: true };
  }),
  listByDestination: protectedProcedure.input(z6.object({
    destinationId: z6.number().optional(),
    buyerId: z6.number().optional(),
    startDate: z6.string().optional(),
    endDate: z6.string().optional(),
    receivedFilter: z6.enum(["all", "received", "pending"]).optional(),
    statusFilter: z6.enum(["all", "entregue", "pendente"]).optional(),
    paymentStatusFilter: z6.enum(["all", "sem_boleto", "a_pagar", "pago"]).optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const conditions = [];
    if (input.statusFilter && input.statusFilter !== "all") {
      conditions.push(eq6(cargoLoads.status, input.statusFilter));
    }
    if (input.destinationId) {
      const realDestId = input.destinationId >= 1e4 ? input.destinationId - 1e4 : input.destinationId;
      const destResult = await db.select({ name: cargoDestinations.name, isBuyer: cargoDestinations.isBuyer }).from(cargoDestinations).where(eq6(cargoDestinations.id, realDestId)).limit(1);
      const destName = destResult.length > 0 ? destResult[0].name : null;
      const orClauses = [
        eq6(cargoLoads.destinationId, realDestId)
      ];
      if (input.destinationId >= 1e4) {
        orClauses.push(eq6(cargoLoads.destinationId, input.destinationId));
      }
      if (destName) orClauses.push(eq6(cargoLoads.destination, destName));
      conditions.push(or3(...orClauses));
    }
    if (input.startDate) {
      conditions.push(sql2`${cargoLoads.date} >= ${input.startDate}`);
    }
    if (input.endDate) {
      conditions.push(sql2`${cargoLoads.date} <= ${input.endDate + " 23:59:59"}`);
    }
    if (input.receivedFilter === "received") {
      conditions.push(eq6(cargoLoads.receivedByBuyer, 1));
    } else if (input.receivedFilter === "pending") {
      conditions.push(eq6(cargoLoads.receivedByBuyer, 0));
    }
    if (input.paymentStatusFilter && input.paymentStatusFilter !== "all") {
      conditions.push(eq6(cargoLoads.paymentStatus, input.paymentStatusFilter));
    }
    const results = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      deliveryDate: cargoLoads.deliveryDate,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      destination: cargoLoads.destination,
      destinationId: cargoLoads.destinationId,
      clientName: cargoLoads.clientName,
      invoiceNumber: cargoLoads.invoiceNumber,
      volumeM3: cargoLoads.volumeM3,
      weightKg: cargoLoads.weightKg,
      weightNetKg: cargoLoads.weightNetKg,
      weightInKg: cargoLoads.weightInKg,
      weightOutKg: cargoLoads.weightOutKg,
      woodType: cargoLoads.woodType,
      receivedByBuyer: cargoLoads.receivedByBuyer,
      receivedAt: cargoLoads.receivedAt,
      status: cargoLoads.status,
      paymentStatus: cargoLoads.paymentStatus,
      trackingStatus: cargoLoads.trackingStatus,
      heightM: cargoLoads.heightM,
      widthM: cargoLoads.widthM,
      lengthM: cargoLoads.lengthM,
      notes: cargoLoads.notes,
      receiverName: cargoLoads.receiverName,
      thirdPartyContractor: cargoLoads.thirdPartyContractor,
      thirdPartyCost: cargoLoads.thirdPartyCost
    }).from(cargoLoads).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(asc(cargoLoads.date), asc(cargoLoads.id));
    let buyerInfo = null;
    let destInfo = null;
    if (input.destinationId && input.destinationId > 0) {
      const realDestId = input.destinationId >= 1e4 ? input.destinationId - 1e4 : input.destinationId;
      const destRows = await db.select({
        name: cargoDestinations.name,
        isBuyer: cargoDestinations.isBuyer,
        pricePerUnit: cargoDestinations.pricePerUnit,
        unit: cargoDestinations.unit,
        pricePerTon: cargoDestinations.pricePerTon,
        pricePerM3: cargoDestinations.pricePerM3,
        priceType: cargoDestinations.priceType
      }).from(cargoDestinations).where(eq6(cargoDestinations.id, realDestId)).limit(1);
      if (destRows.length > 0) {
        const d = destRows[0];
        if (d.isBuyer) {
          const effectivePrice = d.pricePerUnit ?? (d.priceType === "m3" ? d.pricePerM3 : d.pricePerTon);
          const effectiveUnit = d.unit ?? (d.priceType === "m3" ? "m3" : "ton");
          buyerInfo = { name: d.name, pricePerUnit: effectivePrice, unit: effectiveUnit };
        } else {
          destInfo = { name: d.name, pricePerTon: d.pricePerTon, pricePerM3: d.pricePerM3, priceType: d.priceType };
        }
      }
    }
    return { loads: results, buyerInfo, destInfo };
  }),
  listThirdParty: protectedProcedure.input(z6.object({
    startDate: z6.string().optional(),
    endDate: z6.string().optional(),
    contractor: z6.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const conditions = [
      sql2`${cargoLoads.thirdPartyContractor} IS NOT NULL AND ${cargoLoads.thirdPartyContractor} != ''`
    ];
    if (input.startDate) {
      conditions.push(sql2`${cargoLoads.date} >= ${input.startDate}`);
    }
    if (input.endDate) {
      conditions.push(sql2`${cargoLoads.date} <= ${input.endDate + " 23:59:59"}`);
    }
    if (input.contractor) {
      conditions.push(sql2`${cargoLoads.thirdPartyContractor} = ${input.contractor}`);
    }
    const results = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      deliveryDate: cargoLoads.deliveryDate,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      destination: cargoLoads.destination,
      clientName: cargoLoads.clientName,
      invoiceNumber: cargoLoads.invoiceNumber,
      volumeM3: cargoLoads.volumeM3,
      weightNetKg: cargoLoads.weightNetKg,
      woodType: cargoLoads.woodType,
      status: cargoLoads.status,
      thirdPartyContractor: cargoLoads.thirdPartyContractor,
      thirdPartyCost: cargoLoads.thirdPartyCost,
      thirdPartyPaid: cargoLoads.thirdPartyPaid,
      thirdPartyPaidAt: cargoLoads.thirdPartyPaidAt,
      thirdPartyPaymentNotes: cargoLoads.thirdPartyPaymentNotes,
      notes: cargoLoads.notes
    }).from(cargoLoads).where(and3(...conditions)).orderBy(asc(cargoLoads.date), asc(cargoLoads.id));
    return results;
  }),
  // Marcar carga de corte terceirizado como paga
  markThirdPartyPaid: protectedProcedure.input(z6.object({
    id: z6.number(),
    paidAt: z6.string(),
    // YYYY-MM-DD
    notes: z6.string().optional()
  })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const paidAtDatetime = input.paidAt + " 12:00:00";
      await conn.execute(
        "UPDATE cargo_loads SET third_party_paid = 1, third_party_paid_at = ?, third_party_payment_notes = ?, updated_at = ? WHERE id = ?",
        [paidAtDatetime, input.notes || null, now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  // Desfazer pagamento de corte terceirizado
  markThirdPartyUnpaid: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      await conn.execute(
        "UPDATE cargo_loads SET third_party_paid = 0, third_party_paid_at = NULL, third_party_payment_notes = NULL, updated_at = ? WHERE id = ?",
        [now, input.id]
      );
      return { success: true };
    } finally {
      await conn.end();
    }
  }),
  // Marcar múltiplas cargas de um terceirizado como pagas de uma vez
  markThirdPartyPaidBulk: protectedProcedure.input(z6.object({
    ids: z6.array(z6.number()),
    paidAt: z6.string(),
    // YYYY-MM-DD
    notes: z6.string().optional()
  })).mutation(async ({ input }) => {
    if (!input.ids.length) return { success: true, count: 0 };
    const conn = await getDirectConnection();
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const paidAtDatetime = input.paidAt + " 12:00:00";
      const placeholders = input.ids.map(() => "?").join(",");
      await conn.execute(
        `UPDATE cargo_loads SET third_party_paid = 1, third_party_paid_at = ?, third_party_payment_notes = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [paidAtDatetime, input.notes || null, now, ...input.ids]
      );
      return { success: true, count: input.ids.length };
    } finally {
      await conn.end();
    }
  })
});

// server/routers/machineHours.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z7 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";
import { eq as eq7, desc as desc4, sql as sql3, inArray as inArray2 } from "drizzle-orm";
async function resolveAllowedClientIds2(db, ctx) {
  if (ctx.user.role === "admin") return null;
  let allowedClientIds = null;
  try {
    const [perm] = await db.select().from(userPermissions).where(eq7(userPermissions.userId, ctx.user.id));
    if (perm?.allowedClientIds) {
      allowedClientIds = JSON.parse(perm.allowedClientIds);
    }
  } catch {
    try {
      const [rows] = await db.execute(sql3`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
      const row = rows?.[0];
      if (row?.allowed_client_ids) {
        allowedClientIds = JSON.parse(row.allowed_client_ids);
      }
    } catch {
    }
  }
  if (!allowedClientIds) {
    try {
      const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq7(collaborators.userId, ctx.user.id));
      if (collab?.clientId) {
        allowedClientIds = [collab.clientId];
      }
    } catch {
    }
  }
  return allowedClientIds;
}
async function getAllowedLocationIds(db, allowedClientIds) {
  const locs = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(inArray2(gpsLocations.clientId, allowedClientIds));
  return locs.map((l) => l.id);
}
var machineHoursRouter = router({
  // === HORAS TRABALHADAS ===
  listHours: protectedProcedure.input(z7.object({ equipmentId: z7.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const allowedClientIds = await resolveAllowedClientIds2(db, ctx);
    let allowedLocationIds = null;
    if (allowedClientIds && allowedClientIds.length > 0) {
      allowedLocationIds = await getAllowedLocationIds(db, allowedClientIds);
    }
    const results = await db.select().from(machineHours).orderBy(desc4(machineHours.createdAt));
    let filtered = input?.equipmentId ? results.filter((r) => r.equipmentId === input.equipmentId) : results;
    if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
      filtered = filtered.filter((r) => {
        if (r.workLocationId && allowedLocationIds.includes(r.workLocationId)) return true;
        return false;
      });
    }
    const locIdsRaw = filtered.map((r) => r.workLocationId).filter((id) => id !== null && id !== void 0);
    const locIds = Array.from(new Set(locIdsRaw));
    let locMap = {};
    if (locIds.length > 0) {
      const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray2(gpsLocations.id, locIds));
      locMap = Object.fromEntries(locsData.map((l) => [l.id, l.name]));
    }
    return filtered.map((r) => ({ ...r, locationName: r.workLocationId ? locMap[r.workLocationId] || null : null }));
  }),
  createHours: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    operatorCollaboratorId: z7.number().optional(),
    date: z7.string(),
    startHourMeter: z7.string(),
    endHourMeter: z7.string(),
    hoursWorked: z7.string(),
    activity: z7.string().optional(),
    location: z7.string().optional(),
    notes: z7.string().optional(),
    workLocationId: z7.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { workLocationId, ...rest } = input;
    await db.insert(machineHours).values({
      ...rest,
      date: input.date,
      registeredBy: ctx.user.id,
      workLocationId: workLocationId || null
    });
    return { success: true };
  }),
  updateHours: protectedProcedure.input(z7.object({
    id: z7.number(),
    date: z7.string().optional(),
    startHourMeter: z7.string().optional(),
    endHourMeter: z7.string().optional(),
    hoursWorked: z7.string().optional(),
    activity: z7.string().optional().nullable(),
    location: z7.string().optional().nullable(),
    notes: z7.string().optional().nullable(),
    workLocationId: z7.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    await db.update(machineHours).set({
      ...rest,
      ...date ? { date } : {}
    }).where(eq7(machineHours.id, id));
    return { success: true };
  }),
  deleteHours: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineHours).where(eq7(machineHours.id, input.id));
    return { success: true };
  }),
  // === MANUTENÇÕES ===
  listMaintenance: protectedProcedure.input(z7.object({ equipmentId: z7.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(machineMaintenance).orderBy(desc4(machineMaintenance.createdAt));
    if (input?.equipmentId) return results.filter((r) => r.equipmentId === input.equipmentId);
    return results;
  }),
  createMaintenance: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    date: z7.string(),
    hourMeter: z7.string().optional(),
    type: z7.enum(["preventiva", "corretiva", "revisao"]),
    serviceType: z7.enum(["proprio", "terceirizado"]),
    mechanicCollaboratorId: z7.number().optional(),
    mechanicName: z7.string().optional(),
    thirdPartyCompany: z7.string().optional(),
    partsReplaced: z7.string().optional(),
    // JSON string
    laborCost: z7.string().optional(),
    totalCost: z7.string().optional(),
    description: z7.string().optional(),
    nextMaintenanceHours: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(machineMaintenance).values({
      ...input,
      date: input.date,
      registeredBy: ctx.user.id
    });
    if (input.totalCost && parseFloat(input.totalCost.replace(",", ".")) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq7(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const typeLabel = input.type === "preventiva" ? "Preventiva" : input.type === "corretiva" ? "Corretiva" : "Revis\xE3o";
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "manutencao",
          description: `Manuten\xE7\xE3o ${typeLabel} - ${eqName}${input.description ? ": " + input.description.slice(0, 80) : ""}`,
          amount: input.totalCost.replace(",", "."),
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    return { success: true };
  }),
  updateMaintenance: protectedProcedure.input(z7.object({
    id: z7.number(),
    date: z7.string().optional(),
    hourMeter: z7.string().optional().nullable(),
    type: z7.enum(["preventiva", "corretiva", "revisao"]).optional(),
    serviceType: z7.enum(["proprio", "terceirizado"]).optional(),
    mechanicName: z7.string().optional().nullable(),
    thirdPartyCompany: z7.string().optional().nullable(),
    description: z7.string().optional().nullable(),
    laborCost: z7.string().optional().nullable(),
    totalCost: z7.string().optional().nullable(),
    nextMaintenanceHours: z7.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    await db.update(machineMaintenance).set({
      ...rest,
      ...date ? { date } : {}
    }).where(eq7(machineMaintenance.id, id));
    return { success: true };
  }),
  deleteMaintenance: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineMaintenance).where(eq7(machineMaintenance.id, input.id));
    return { success: true };
  }),
  // === ABASTECIMENTO ===
  listFuel: protectedProcedure.input(z7.object({ equipmentId: z7.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const allowedClientIds = await resolveAllowedClientIds2(db, ctx);
    let allowedLocationIds = null;
    if (allowedClientIds && allowedClientIds.length > 0) {
      allowedLocationIds = await getAllowedLocationIds(db, allowedClientIds);
    }
    const results = await db.select().from(machineFuel).orderBy(desc4(machineFuel.createdAt));
    let filteredFuel = input?.equipmentId ? results.filter((r) => r.equipmentId === input.equipmentId) : results;
    if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
      filteredFuel = filteredFuel.filter((r) => {
        if (r.workLocationId && allowedLocationIds.includes(r.workLocationId)) return true;
        return false;
      });
    }
    const fuelLocIdsRaw = filteredFuel.map((r) => r.workLocationId).filter((id) => id !== null && id !== void 0);
    const fuelLocIds = Array.from(new Set(fuelLocIdsRaw));
    let fuelLocMap = {};
    if (fuelLocIds.length > 0) {
      const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray2(gpsLocations.id, fuelLocIds));
      fuelLocMap = Object.fromEntries(locsData.map((l) => [l.id, l.name]));
    }
    return filteredFuel.map((r) => ({ ...r, locationName: r.workLocationId ? fuelLocMap[r.workLocationId] || null : null }));
  }),
  createFuel: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    date: z7.string(),
    hourMeter: z7.string().optional(),
    fuelType: z7.enum(["diesel", "gasolina", "mistura_2t", "arla"]),
    liters: z7.string(),
    pricePerLiter: z7.string().optional(),
    totalValue: z7.string().optional(),
    supplier: z7.string().optional(),
    notes: z7.string().optional(),
    workLocationId: z7.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { workLocationId, ...rest } = input;
    await db.insert(machineFuel).values({
      ...rest,
      date: input.date,
      registeredBy: ctx.user.id,
      workLocationId: workLocationId || null
    });
    if (input.totalValue && parseFloat(input.totalValue.replace(",", ".")) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq7(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const fuelLabels = { diesel: "Diesel", gasolina: "Gasolina", mistura_2t: "Mistura 2T", arla: "Arla 32" };
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "combustivel",
          description: `Abastecimento ${fuelLabels[input.fuelType] || input.fuelType} - ${eqName} - ${input.liters}L${input.supplier ? " (" + input.supplier + ")" : ""}`,
          amount: input.totalValue.replace(",", "."),
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    return { success: true };
  }),
  updateFuel: protectedProcedure.input(z7.object({
    id: z7.number(),
    workLocationId: z7.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(machineFuel).set(rest).where(eq7(machineFuel.id, id));
    return { success: true };
  }),
  deleteFuel: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineFuel).where(eq7(machineFuel.id, input.id));
    return { success: true };
  }),
  // === ALERTAS DE MANUTENÇÃO PREVENTIVA ===
  maintenanceAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const maintenances = await db.select().from(machineMaintenance).orderBy(desc4(machineMaintenance.createdAt));
    const hoursRecords = await db.select().from(machineHours).orderBy(desc4(machineHours.createdAt));
    const equipmentList = await db.select().from(equipment);
    const equipMap = Object.fromEntries(equipmentList.map((e) => [e.id, e.name]));
    const lastMaintByEquip = {};
    for (const m of maintenances) {
      if (m.nextMaintenanceHours && !lastMaintByEquip[m.equipmentId]) {
        lastMaintByEquip[m.equipmentId] = m;
      }
    }
    const lastHourByEquip = {};
    for (const h of hoursRecords) {
      if (!lastHourByEquip[h.equipmentId]) {
        lastHourByEquip[h.equipmentId] = h.endHourMeter;
      }
    }
    const alerts = [];
    for (const [equipIdStr, maint] of Object.entries(lastMaintByEquip)) {
      const equipId = parseInt(equipIdStr);
      const currentHour = parseFloat(lastHourByEquip[equipId] || "0");
      const nextMaintHour = parseFloat(maint.nextMaintenanceHours);
      if (isNaN(nextMaintHour)) continue;
      const hoursRemaining = nextMaintHour - currentHour;
      if (hoursRemaining <= 50) {
        alerts.push({
          equipmentId: equipId,
          equipmentName: equipMap[equipId] || `Equipamento #${equipId}`,
          currentHourMeter: currentHour,
          nextMaintenanceHours: nextMaintHour,
          hoursRemaining,
          isOverdue: hoursRemaining < 0,
          lastMaintenanceDate: maint.date,
          maintenanceType: maint.type
        });
      }
    }
    return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  }),
  // === RESUMO POR EQUIPAMENTO ===
  equipmentSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const equipmentList = await db.select().from(equipment);
    const hoursRecords = await db.select().from(machineHours).orderBy(desc4(machineHours.createdAt));
    const maintenances = await db.select().from(machineMaintenance).orderBy(desc4(machineMaintenance.createdAt));
    const fuelRecords3 = await db.select().from(machineFuel).orderBy(desc4(machineFuel.createdAt));
    const oilRecords = await db.select().from(equipmentOilRecords).orderBy(desc4(equipmentOilRecords.createdAt));
    return equipmentList.map((eq38) => {
      const eqHours = hoursRecords.filter((h) => h.equipmentId === eq38.id);
      const eqMaint = maintenances.filter((m) => m.equipmentId === eq38.id);
      const eqFuel = fuelRecords3.filter((f) => f.equipmentId === eq38.id);
      const eqOil = oilRecords.filter((o) => o.equipmentId === eq38.id);
      const totalHours = eqHours.reduce((sum, h) => sum + (parseFloat(h.hoursWorked) || 0), 0);
      const totalFuelLiters = eqFuel.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
      const totalFuelCost = eqFuel.reduce((sum, f) => sum + (parseFloat(f.totalValue || "0") || 0), 0);
      const totalMaintCost = eqMaint.reduce((sum, m) => sum + (parseFloat(m.totalCost || "0") || 0), 0);
      const totalOilLiters = eqOil.reduce((sum, o) => sum + (parseFloat(o.quantityLiters) || 0), 0);
      const totalOilCost = eqOil.reduce((sum, o) => sum + (parseFloat(o.totalValue || "0") || 0), 0);
      const totalCost = totalFuelCost + totalMaintCost + totalOilCost;
      const lastHourMeter = eqHours.length > 0 ? eqHours[0].endHourMeter : null;
      const lastMaintenance = eqMaint.length > 0 ? eqMaint[0] : null;
      return {
        equipmentId: eq38.id,
        equipmentName: eq38.name,
        brand: eq38.brand,
        model: eq38.model,
        status: eq38.status,
        totalHoursWorked: totalHours,
        lastHourMeter,
        totalFuelLiters,
        totalFuelCost,
        totalMaintCost,
        totalOilLiters,
        totalOilCost,
        totalCost,
        maintenanceCount: eqMaint.length,
        lastMaintenanceDate: lastMaintenance?.date || null,
        nextMaintenanceHours: lastMaintenance?.nextMaintenanceHours || null
      };
    });
  }),
  // === ÓLEO ===
  listOil: protectedProcedure.input(z7.object({ equipmentId: z7.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(equipmentOilRecords).orderBy(desc4(equipmentOilRecords.createdAt));
    return input?.equipmentId ? results.filter((r) => r.equipmentId === input.equipmentId) : results;
  }),
  createOil: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    date: z7.string(),
    hourMeter: z7.string().optional(),
    oilType: z7.enum(["hidraulico", "motor", "transmissao", "diferencial", "outros"]),
    quantityLiters: z7.string(),
    brand: z7.string().optional(),
    supplier: z7.string().optional(),
    pricePerLiter: z7.string().optional(),
    totalValue: z7.string().optional(),
    notes: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(equipmentOilRecords).values({
      ...input,
      date: input.date,
      registeredBy: ctx.user.id
    });
    if (input.totalValue && parseFloat(input.totalValue.replace(",", ".")) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq7(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const oilLabels = { hidraulico: "Hidr\xE1ulico", motor: "Motor", transmissao: "Transmiss\xE3o", diferencial: "Diferencial", outros: "Outros" };
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "manutencao",
          description: `\xD3leo ${oilLabels[input.oilType] || input.oilType} - ${eqName} - ${input.quantityLiters}L${input.brand ? " (" + input.brand + ")" : ""}`,
          amount: input.totalValue.replace(",", "."),
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    return { success: true };
  }),
  updateOil: protectedProcedure.input(z7.object({
    id: z7.number(),
    date: z7.string().optional(),
    hourMeter: z7.string().optional().nullable(),
    oilType: z7.enum(["hidraulico", "motor", "transmissao", "diferencial", "outros"]).optional(),
    quantityLiters: z7.string().optional(),
    brand: z7.string().optional().nullable(),
    supplier: z7.string().optional().nullable(),
    pricePerLiter: z7.string().optional().nullable(),
    totalValue: z7.string().optional().nullable(),
    notes: z7.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    await db.update(equipmentOilRecords).set({
      ...rest,
      ...date ? { date } : {}
    }).where(eq7(equipmentOilRecords.id, id));
    return { success: true };
  }),
  deleteOil: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(equipmentOilRecords).where(eq7(equipmentOilRecords.id, input.id));
    return { success: true };
  }),
  // === ESTOQUE DE ÓLEO ===
  listOilStock: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(oilStock).orderBy(desc4(oilStock.createdAt));
  }),
  addOilStock: protectedProcedure.input(z7.object({
    oilType: z7.enum(["hidraulico", "motor", "transmissao", "diferencial", "outros"]),
    brand: z7.string().min(1),
    purchaseQuantityLiters: z7.string(),
    pricePerLiter: z7.string().optional(),
    totalValue: z7.string().optional(),
    photoBase64: z7.string().optional(),
    supplier: z7.string().optional(),
    notes: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let photoUrl;
    if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
      const res2 = await cloudinaryUpload(input.photoBase64, "btree/oil-stock");
      photoUrl = res2.url;
    }
    const existing = await db.select().from(oilStock).where(eq7(oilStock.oilType, input.oilType)).then((rows) => rows.find((r) => r.brand.toLowerCase() === input.brand.toLowerCase()));
    if (existing) {
      const newQty = (parseFloat(existing.quantityLiters) + parseFloat(input.purchaseQuantityLiters)).toFixed(2);
      await db.update(oilStock).set({
        quantityLiters: newQty,
        purchaseQuantityLiters: input.purchaseQuantityLiters,
        pricePerLiter: input.pricePerLiter || existing.pricePerLiter,
        totalValue: input.totalValue || existing.totalValue,
        photoUrl: photoUrl || existing.photoUrl,
        supplier: input.supplier || existing.supplier,
        notes: input.notes || existing.notes
      }).where(eq7(oilStock.id, existing.id));
      return { id: existing.id, updated: true };
    }
    const [res] = await db.insert(oilStock).values({
      oilType: input.oilType,
      brand: input.brand,
      quantityLiters: input.purchaseQuantityLiters,
      purchaseQuantityLiters: input.purchaseQuantityLiters,
      pricePerLiter: input.pricePerLiter,
      totalValue: input.totalValue,
      photoUrl,
      supplier: input.supplier,
      notes: input.notes,
      registeredBy: ctx.user.id
    });
    return { id: res.insertId, updated: false };
  }),
  deleteOilStock: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(oilStock).where(eq7(oilStock.id, input.id));
    return { success: true };
  }),
  // createOil com baixa de estoque
  createOilWithStock: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    date: z7.string(),
    hourMeter: z7.string().optional(),
    oilStockId: z7.number(),
    quantityLiters: z7.string(),
    notes: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [stockItem] = await db.select().from(oilStock).where(eq7(oilStock.id, input.oilStockId));
    if (!stockItem) throw new TRPCError5({ code: "NOT_FOUND", message: "Item de estoque n\xE3o encontrado" });
    const currentQty = parseFloat(stockItem.quantityLiters);
    const usedQty = parseFloat(input.quantityLiters);
    if (usedQty > currentQty) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: `Estoque insuficiente. Dispon\xEDvel: ${currentQty.toFixed(2)}L` });
    }
    const newQty = (currentQty - usedQty).toFixed(2);
    await db.update(oilStock).set({ quantityLiters: newQty }).where(eq7(oilStock.id, input.oilStockId));
    const pricePerLiter = stockItem.pricePerLiter ? parseFloat(stockItem.pricePerLiter) : 0;
    const totalValue = pricePerLiter > 0 ? (pricePerLiter * usedQty).toFixed(2) : void 0;
    await db.insert(equipmentOilRecords).values({
      equipmentId: input.equipmentId,
      date: input.date,
      hourMeter: input.hourMeter,
      oilType: stockItem.oilType,
      quantityLiters: input.quantityLiters,
      brand: stockItem.brand,
      supplier: stockItem.supplier,
      pricePerLiter: stockItem.pricePerLiter,
      totalValue,
      notes: input.notes,
      registeredBy: ctx.user.id
    });
    if (totalValue && parseFloat(totalValue) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq7(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const oilLabels = { hidraulico: "Hidr\xE1ulico", motor: "Motor", transmissao: "Transmiss\xE3o", diferencial: "Diferencial", outros: "Outros" };
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "manutencao",
          description: `\xD3leo ${oilLabels[stockItem.oilType] || stockItem.oilType} (${stockItem.brand}) - ${eqName} - ${input.quantityLiters}L`,
          amount: totalValue,
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    return { success: true, newStockQty: newQty };
  })
});

// server/routers/vehicleRecords.ts
init_trpc();
init_db();
init_schema();
import { z as z8 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
import { eq as eq8, desc as desc5, inArray as inArray3, sql as sql4 } from "drizzle-orm";

// server/notifyTeam.ts
import nodemailer from "nodemailer";
async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass }
    });
  }
  return null;
}
var EVENT_LABELS = {
  presenca_registrada: { icon: "\u2705", color: "#059669", label: "Presen\xE7a Registrada" },
  abastecimento_registrado: { icon: "\u26FD", color: "#0284c7", label: "Abastecimento Registrado" },
  pedido_pecas_criado: { icon: "\u{1F527}", color: "#d97706", label: "Pedido de Pe\xE7as Criado" },
  pedido_compra_criado: { icon: "\u{1F6D2}", color: "#7c3aed", label: "Pedido de Compra Criado" },
  pedido_compra_enviado: { icon: "\u{1F4E4}", color: "#0891b2", label: "Pedido de Compra Enviado" },
  pedido_pecas_aprovado: { icon: "\u2714\uFE0F", color: "#16a34a", label: "Pedido de Pe\xE7as Aprovado" },
  pedido_pecas_rejeitado: { icon: "\u274C", color: "#dc2626", label: "Pedido de Pe\xE7as Rejeitado" }
};
function buildHtml(payload) {
  const meta = EVENT_LABELS[payload.event];
  const rows = Object.entries(payload.details).filter(([, v]) => v !== null && v !== void 0 && v !== "").map(([k, v]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${k}</td>
        <td style="padding:8px 12px;color:#111827;border-bottom:1px solid #e5e7eb;">${v}</td>
      </tr>`).join("");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:${meta.color};padding:24px 32px;">
      <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png"
           alt="BTREE Ambiental" style="height:40px;margin-bottom:12px;display:block;" />
      <h2 style="margin:0;color:#fff;font-size:20px;">${meta.icon} ${meta.label}</h2>
    </div>
    <!-- Body -->
    <div style="padding:24px 32px;">
      <p style="color:#374151;margin:0 0 20px;">${payload.title}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
      ${payload.registeredBy ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Registrado por: <strong>${payload.registeredBy}</strong></p>` : ""}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      BTREE Ambiental \u2014 Sistema de Gest\xE3o Operacional<br/>
      Este \xE9 um e-mail autom\xE1tico, n\xE3o responda.
    </div>
  </div>
</body>
</html>`;
}
async function notifyTeam(payload) {
  const rawEmails = process.env.NOTIFY_EMAILS || "";
  const recipients = rawEmails.split(",").map((e) => e.trim()).filter((e) => e.includes("@"));
  if (recipients.length === 0) {
    console.log(`[notifyTeam] NOTIFY_EMAILS n\xE3o configurado \u2014 evento ${payload.event} n\xE3o enviado por e-mail.`);
    return;
  }
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log(`[notifyTeam] SMTP n\xE3o configurado \u2014 evento ${payload.event} n\xE3o enviado.`);
      return;
    }
    const meta = EVENT_LABELS[payload.event];
    const subject = `${meta.icon} ${meta.label} \u2014 BTREE Ambiental`;
    const html = buildHtml(payload);
    const text2 = [
      payload.title,
      "",
      ...Object.entries(payload.details).filter(([, v]) => v !== null && v !== void 0 && v !== "").map(([k, v]) => `${k}: ${v}`),
      payload.registeredBy ? `
Registrado por: ${payload.registeredBy}` : ""
    ].join("\n");
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BTREE Ambiental" <noreply@btreeambiental.com>',
      to: recipients.join(", "),
      subject,
      html,
      text: text2
    });
    console.log(`[notifyTeam] E-mail enviado (${payload.event}) para: ${recipients.join(", ")}`);
  } catch (err) {
    console.error(`[notifyTeam] Erro ao enviar e-mail (${payload.event}):`, err);
  }
}

// server/routers/vehicleRecords.ts
var vehicleRecordsRouter = router({
  list: protectedProcedure.input(z8.object({
    equipmentId: z8.number().optional(),
    recordType: z8.enum(["abastecimento", "manutencao", "km"]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let allowedClientIds = null;
    if (ctx.user.role !== "admin") {
      try {
        const [perm] = await db.select().from(userPermissions).where(eq8(userPermissions.userId, ctx.user.id));
        if (perm?.allowedClientIds) {
          allowedClientIds = JSON.parse(perm.allowedClientIds);
        }
      } catch {
        try {
          const [rows] = await db.execute(sql4`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
          const row = rows?.[0];
          if (row?.allowed_client_ids) {
            allowedClientIds = JSON.parse(row.allowed_client_ids);
          }
        } catch {
        }
      }
      if (!allowedClientIds) {
        try {
          const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq8(collaborators.userId, ctx.user.id));
          if (collab?.clientId) {
            allowedClientIds = [collab.clientId];
          }
        } catch {
        }
      }
    }
    let allowedLocationIds = null;
    if (allowedClientIds && allowedClientIds.length > 0) {
      const locs = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(inArray3(gpsLocations.clientId, allowedClientIds));
      allowedLocationIds = locs.map((l) => l.id);
    }
    const results = await db.select().from(vehicleRecords).orderBy(desc5(vehicleRecords.date), desc5(vehicleRecords.createdAt));
    let filtered = results;
    if (input?.equipmentId) filtered = filtered.filter((r) => r.equipmentId === input.equipmentId);
    if (input?.recordType) filtered = filtered.filter((r) => r.recordType === input.recordType);
    if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
      filtered = filtered.filter((r) => {
        if (!r.workLocationId) return true;
        return allowedLocationIds.includes(r.workLocationId);
      });
    }
    const userIdsRaw = filtered.map((r) => r.registeredBy).filter((id) => id !== null && id !== void 0);
    const userIds = Array.from(new Set(userIdsRaw));
    let userMap = {};
    if (userIds.length > 0) {
      const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray3(users.id, userIds));
      userMap = Object.fromEntries(usersData.map((u) => [u.id, u.name]));
    }
    const locIdsRaw = filtered.map((r) => r.workLocationId).filter((id) => id !== null && id !== void 0);
    const locIds = Array.from(new Set(locIdsRaw));
    let locMap = {};
    if (locIds.length > 0) {
      const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray3(gpsLocations.id, locIds));
      locMap = Object.fromEntries(locsData.map((l) => [l.id, l.name]));
    }
    return filtered.map((r) => ({
      ...r,
      registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null,
      locationName: r.workLocationId ? locMap[r.workLocationId] || null : null
    }));
  }),
  create: protectedProcedure.input(z8.object({
    equipmentId: z8.number(),
    date: z8.string(),
    recordType: z8.enum(["abastecimento", "manutencao", "km"]),
    fuelType: z8.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
    liters: z8.string().optional(),
    fuelCost: z8.string().optional(),
    pricePerLiter: z8.string().optional(),
    supplier: z8.string().optional(),
    odometer: z8.string().optional(),
    kmDriven: z8.string().optional(),
    maintenanceType: z8.string().optional(),
    maintenanceCost: z8.string().optional(),
    serviceType: z8.enum(["proprio", "terceirizado"]).optional(),
    mechanicName: z8.string().optional(),
    driverCollaboratorId: z8.number().optional(),
    photoBase64: z8.string().optional(),
    photosBase64: z8.array(z8.string()).optional(),
    // múltiplas fotos
    notes: z8.string().optional(),
    workLocationId: z8.number().optional(),
    fuelInvoiceId: z8.number().optional(),
    chargedValue: z8.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let photoUrl;
    let photosJson;
    const photosToUpload = input.photosBase64?.filter((p) => p.startsWith("data:")) || [];
    if (photosToUpload.length > 0) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const uploadedUrls = [];
      for (const b64 of photosToUpload) {
        const result = await cloudinaryUpload2(b64, "btree/vehicle-records");
        uploadedUrls.push(result.url);
      }
      photosJson = JSON.stringify(uploadedUrls);
      photoUrl = uploadedUrls[0];
    } else if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(input.photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
      photosJson = JSON.stringify([photoUrl]);
    }
    const { photoBase64, photosBase64, workLocationId, fuelInvoiceId, ...rest } = input;
    await db.insert(vehicleRecords).values({
      ...rest,
      date: input.date.length === 10 ? `${input.date} 00:00:00` : new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
      photoUrl,
      photosJson,
      registeredBy: ctx.user.id,
      workLocationId: workLocationId || null,
      fuelInvoiceId: fuelInvoiceId || null
    });
    if (fuelInvoiceId && input.liters) {
      try {
        const [inv] = await db.select().from(fuelInvoices).where(eq8(fuelInvoices.id, fuelInvoiceId));
        if (inv) {
          const currentUsed = parseFloat(inv.litersUsed || "0");
          const newUsed = currentUsed + parseFloat(input.liters.replace(",", "."));
          await db.update(fuelInvoices).set({ litersUsed: String(newUsed.toFixed(2)) }).where(eq8(fuelInvoices.id, fuelInvoiceId));
        }
      } catch (e) {
        console.error("Erro ao atualizar litros da NF:", e);
      }
    }
    const costValue = input.recordType === "abastecimento" ? input.fuelCost : input.maintenanceCost;
    if (costValue && parseFloat(costValue.replace(",", ".")) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq8(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const fuelLabels = { diesel: "Diesel", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV" };
        const desc32 = input.recordType === "abastecimento" ? `Abastecimento ${fuelLabels[input.fuelType] || input.fuelType} - ${eqName} - ${input.liters}L${input.supplier ? " (" + input.supplier + ")" : ""}` : `Manuten\xE7\xE3o ${input.maintenanceType || ""} - ${eqName}${input.notes ? ": " + input.notes.slice(0, 60) : ""}`;
        await db.insert(financialEntries).values({
          type: "despesa",
          category: input.recordType === "abastecimento" ? "combustivel" : "manutencao",
          description: desc32,
          amount: costValue.replace(",", "."),
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: "transferencia",
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    if (input.recordType === "abastecimento") {
      const dateFormatted = new Date(input.date).toLocaleDateString("pt-BR");
      const fuelLabels = { diesel: "Diesel", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV" };
      notifyTeam({
        event: "abastecimento_registrado",
        title: `Abastecimento registrado em ${dateFormatted}.`,
        details: {
          "Data": dateFormatted,
          "Combust\xEDvel": input.fuelType ? fuelLabels[input.fuelType] || input.fuelType : "\u2014",
          "Litros": input.liters ? `${input.liters} L` : "\u2014",
          "Valor Total": input.fuelCost ? `R$ ${input.fuelCost}` : "\u2014",
          "Pre\xE7o / Litro": input.pricePerLiter ? `R$ ${input.pricePerLiter}` : "\u2014",
          "Fornecedor": input.supplier || "\u2014",
          "Od\xF4metro": input.odometer ? `${input.odometer} km` : "\u2014",
          "Observa\xE7\xF5es": input.notes || "\u2014"
        },
        registeredBy: ctx.user.name
      }).catch(() => {
      });
    }
    return { success: true };
  }),
  update: protectedProcedure.input(z8.object({
    id: z8.number(),
    date: z8.string().optional(),
    recordType: z8.enum(["abastecimento", "manutencao", "km"]).optional(),
    fuelType: z8.enum(["diesel", "gasolina", "etanol", "gnv"]).optional().nullable(),
    liters: z8.string().optional().nullable(),
    fuelCost: z8.string().optional().nullable(),
    pricePerLiter: z8.string().optional().nullable(),
    supplier: z8.string().optional().nullable(),
    odometer: z8.string().optional().nullable(),
    kmDriven: z8.string().optional().nullable(),
    maintenanceType: z8.string().optional().nullable(),
    maintenanceCost: z8.string().optional().nullable(),
    serviceType: z8.enum(["proprio", "terceirizado"]).optional().nullable(),
    mechanicName: z8.string().optional().nullable(),
    driverCollaboratorId: z8.number().optional().nullable(),
    photoBase64: z8.string().optional().nullable(),
    photosBase64: z8.array(z8.string()).optional().nullable(),
    // múltiplas fotos
    notes: z8.string().optional().nullable(),
    workLocationId: z8.number().optional().nullable(),
    fuelInvoiceId: z8.number().optional().nullable(),
    chargedValue: z8.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, photoBase64, photosBase64, date, ...rest } = input;
    let photoUrl;
    let photosJson;
    const photosToUpload = photosBase64?.filter((p) => !!p && p.startsWith("data:")) || [];
    if (photosToUpload.length > 0) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const uploadedUrls = [];
      for (const b64 of photosToUpload) {
        const result = await cloudinaryUpload2(b64, "btree/vehicle-records");
        uploadedUrls.push(result.url);
      }
      photosJson = JSON.stringify(uploadedUrls);
      photoUrl = uploadedUrls[0];
    } else if (photosBase64 && photosBase64.length > 0) {
      const existingUrls = photosBase64.filter((p) => !!p && !p.startsWith("data:"));
      if (existingUrls.length > 0) {
        photosJson = JSON.stringify(existingUrls);
        photoUrl = existingUrls[0];
      }
    } else if (photoBase64 && photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
      photosJson = JSON.stringify([photoUrl]);
    }
    const updateData = { ...rest };
    if (date) updateData.date = new Date(date);
    if (photoUrl !== void 0) updateData.photoUrl = photoUrl;
    if (photosJson !== void 0) updateData.photosJson = photosJson;
    await db.update(vehicleRecords).set(updateData).where(eq8(vehicleRecords.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z8.object({ id: z8.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(vehicleRecords).where(eq8(vehicleRecords.id, input.id));
    return { success: true };
  })
});

// server/routers/parts.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z9 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
import { eq as eq9, desc as desc6 } from "drizzle-orm";
var partsRouter = router({
  // === PEÇAS ===
  listParts: protectedProcedure.input(z9.object({ search: z9.string().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(parts).orderBy(desc6(parts.createdAt));
    if (input?.search) {
      const s = input.search.toLowerCase();
      return results.filter(
        (p) => p.name.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s)
      );
    }
    return results;
  }),
  createPart: protectedProcedure.input(z9.object({
    code: z9.string().optional(),
    name: z9.string().min(2),
    category: z9.string().optional(),
    unit: z9.string().optional(),
    stockQuantity: z9.number().optional(),
    minStock: z9.number().optional(),
    unitCost: z9.string().optional(),
    supplier: z9.string().optional(),
    photoBase64: z9.string().optional(),
    notes: z9.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let photoUrl;
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, "btree/parts");
      photoUrl = result.url;
    }
    const { photoBase64, ...rest } = input;
    await db.insert(parts).values({ ...rest, photoUrl, createdBy: ctx.user.id });
    return { success: true };
  }),
  updatePart: protectedProcedure.input(z9.object({
    id: z9.number(),
    code: z9.string().optional(),
    name: z9.string().optional(),
    category: z9.string().optional(),
    unit: z9.string().optional(),
    stockQuantity: z9.number().optional(),
    minStock: z9.number().optional(),
    unitCost: z9.string().optional(),
    supplier: z9.string().optional(),
    photoBase64: z9.string().optional(),
    notes: z9.string().optional(),
    active: z9.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, photoBase64, ...rest } = input;
    const updateData = { ...rest, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (photoBase64) {
      const result = await cloudinaryUpload(photoBase64, "btree/parts");
      updateData.photoUrl = result.url;
    }
    await db.update(parts).set(updateData).where(eq9(parts.id, id));
    return { success: true };
  }),
  deletePart: protectedProcedure.input(z9.object({ id: z9.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError7({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(parts).where(eq9(parts.id, input.id));
    return { success: true };
  }),
  // === SOLICITAÇÕES ===
  listRequests: protectedProcedure.input(z9.object({
    status: z9.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]).optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(partsRequests).orderBy(desc6(partsRequests.createdAt));
    if (input?.status) return results.filter((r) => r.status === input.status);
    return results;
  }),
  createRequest: protectedProcedure.input(z9.object({
    partId: z9.number().optional(),
    partName: z9.string(),
    quantity: z9.number().min(1),
    urgency: z9.enum(["baixa", "media", "alta"]),
    equipmentId: z9.number().optional(),
    equipmentName: z9.string().optional(),
    reason: z9.string().optional(),
    estimatedCost: z9.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(partsRequests).values({
      ...input,
      status: "pendente",
      requestedBy: ctx.user.id
    });
    const urgencyLabels = { baixa: "Baixa", media: "M\xE9dia", alta: "Alta \u26A0\uFE0F" };
    notifyTeam({
      event: "pedido_pecas_criado",
      title: `Nova solicita\xE7\xE3o de pe\xE7a/acess\xF3rio: ${input.partName}.`,
      details: {
        "Pe\xE7a / Acess\xF3rio": input.partName,
        "Quantidade": input.quantity,
        "Urg\xEAncia": urgencyLabels[input.urgency] || input.urgency,
        "Equipamento": input.equipmentName || "\u2014",
        "Motivo": input.reason || "\u2014",
        "Custo Estimado": input.estimatedCost ? `R$ ${input.estimatedCost}` : "\u2014"
      },
      registeredBy: ctx.user.name
    }).catch(() => {
    });
    return { success: true };
  }),
  updateRequestStatus: protectedProcedure.input(z9.object({
    id: z9.number(),
    status: z9.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]),
    rejectionReason: z9.string().optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin" && input.status !== "comprado" && input.status !== "entregue") {
      throw new TRPCError7({ code: "FORBIDDEN", message: "Apenas admins podem aprovar/rejeitar" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const updateData = {
      status: input.status,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (input.status === "aprovado") {
      updateData.approvedBy = ctx.user.id;
      updateData.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (input.rejectionReason) updateData.rejectionReason = input.rejectionReason;
    await db.update(partsRequests).set(updateData).where(eq9(partsRequests.id, input.id));
    return { success: true };
  }),
  deleteRequest: protectedProcedure.input(z9.object({ id: z9.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError7({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(partsRequests).where(eq9(partsRequests.id, input.id));
    return { success: true };
  })
});

// server/routers/clientsRouter.ts
init_trpc();
init_db();
init_schema();
import { z as z10 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
import { eq as eq10, desc as desc7 } from "drizzle-orm";
var clientsRouter = router({
  list: protectedProcedure.input(z10.object({ search: z10.string().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(clients).orderBy(desc7(clients.createdAt));
    if (input?.search) {
      const s = input.search.toLowerCase();
      return results.filter(
        (c) => c.name.toLowerCase().includes(s) || c.document?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s)
      );
    }
    return results.filter((c) => c.active === null || c.active === void 0 || c.active === 1);
  }),
  create: protectedProcedure.input(z10.object({
    name: z10.string().min(2),
    document: z10.string().optional(),
    email: z10.string().email().optional(),
    phone: z10.string().optional(),
    address: z10.string().optional(),
    city: z10.string().optional(),
    state: z10.string().optional(),
    notes: z10.string().optional(),
    pricePerTon: z10.string().optional(),
    paymentTermDays: z10.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(clients).values({ ...input, createdBy: ctx.user.id });
    return { success: true };
  }),
  update: protectedProcedure.input(z10.object({
    id: z10.number(),
    name: z10.string().optional(),
    document: z10.string().optional(),
    email: z10.string().email().optional(),
    phone: z10.string().optional(),
    address: z10.string().optional(),
    city: z10.string().optional(),
    state: z10.string().optional(),
    notes: z10.string().optional(),
    active: z10.number().optional(),
    pricePerTon: z10.string().optional(),
    paymentTermDays: z10.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(clients).set({ ...rest, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq10(clients.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError8({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(clients).set({ active: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq10(clients.id, input.id));
    return { success: true };
  })
});

// server/routers/clientPortal.ts
init_trpc();
init_db();
init_schema();
import { z as z11 } from "zod";
import { eq as eq11, and as and4, desc as desc8 } from "drizzle-orm";
import bcrypt3 from "bcryptjs";
var clientPortalRouter = router({
  // ── LOGIN DO CLIENTE (público) ──
  login: publicProcedure.input(z11.object({
    email: z11.string().email(),
    password: z11.string().min(1)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [client] = await db.select().from(clients).where(
      and4(
        eq11(clients.email, input.email.trim().toLowerCase())
        // active pode ser NULL em registros antigos
      )
    ).limit(1);
    if (!client) throw new Error("E-mail ou senha incorretos.");
    if (!client.password) throw new Error("Acesso n\xE3o configurado. Entre em contato com a BTREE Ambiental.");
    const valid = await bcrypt3.compare(input.password, client.password);
    if (!valid) throw new Error("E-mail ou senha incorretos.");
    return {
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
      clientCity: client.city
    };
  }),
  // ── DADOS DO PORTAL (público — requer clientId validado no frontend) ──
  getPortalData: publicProcedure.input(z11.object({ clientId: z11.number(), email: z11.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [client] = await db.select().from(clients).where(
      and4(
        eq11(clients.id, input.clientId),
        eq11(clients.email, input.email.trim().toLowerCase())
        // active pode ser NULL em registros antigos
      )
    ).limit(1);
    if (!client) throw new Error("Acesso n\xE3o autorizado.");
    let destIds = [];
    let loads = [];
    try {
      const allLoads = await db.select().from(cargoLoads).orderBy(desc8(cargoLoads.date)).limit(200);
      console.log(`[Portal] Total cargas no banco: ${allLoads.length}, clientId buscado: ${input.clientId}, clientName: ${client.name}`);
      const clientNameLower = client.name.toLowerCase();
      loads = allLoads.filter((l) => {
        const matchClientId = l.clientId === input.clientId;
        const matchClientName = l.clientName && l.clientName.toLowerCase().includes(clientNameLower);
        const matchDestination = l.destination && l.destination.toLowerCase().includes(clientNameLower);
        const matchDestId = l.destinationId && destIds.includes(l.destinationId);
        return matchClientId || matchClientName || matchDestination || matchDestId;
      }).slice(0, 200);
      console.log(`[Portal] Cargas filtradas para cliente: ${loads.length}`);
      if (allLoads.length > 0) {
        console.log(`[Portal] Amostra carga[0]: clientId=${allLoads[0].clientId} (tipo: ${typeof allLoads[0].clientId}), clientName=${allLoads[0].clientName}, destination=${allLoads[0].destination}`);
      }
    } catch (e) {
      console.error("[Portal] Erro ao buscar cargas:", e);
      try {
        const [rawLoads] = await db.execute(`SELECT * FROM cargo_loads WHERE client_id = ${input.clientId} OR client_name LIKE '%${client.name}%' ORDER BY date DESC LIMIT 50`);
        loads = Array.isArray(rawLoads) ? rawLoads : [];
        console.log(`[Portal] Fallback SQL raw: ${loads.length} cargas encontradas`);
      } catch (e2) {
        console.error("[Portal] Erro no fallback SQL:", e2);
      }
    }
    let replanting = [];
    try {
      replanting = await db.select().from(replantingRecords).where(eq11(replantingRecords.clientId, input.clientId)).orderBy(desc8(replantingRecords.date)).limit(50);
    } catch (e) {
      console.error("[Portal] Erro ao buscar replantios:", e);
    }
    let payments = [];
    try {
      const paidClosings = await db.select().from(cargoWeeklyClosings).where(
        and4(
          eq11(cargoWeeklyClosings.clientId, input.clientId),
          eq11(cargoWeeklyClosings.status, "pago")
        )
      ).orderBy(desc8(cargoWeeklyClosings.paidAt)).limit(50);
      payments = paidClosings.map((c) => ({
        id: c.id,
        clientId: c.clientId,
        referenceDate: c.weekEnd,
        description: `Semana ${c.weekStart ? new Date(c.weekStart).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""} a ${c.weekEnd ? new Date(c.weekEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}`,
        grossAmount: c.totalAmount,
        netAmount: c.totalAmount,
        status: "pago",
        paidAt: c.paidAt,
        dueDate: c.dueDate,
        paymentReceiptUrl: c.receiptUrl,
        loadCount: c.totalLoads,
        totalWeightKg: c.totalWeightKg,
        pricePerTon: c.pricePerTon,
        createdAt: c.createdAt
      }));
    } catch (e) {
      console.error("[Portal] Erro ao buscar pagamentos:", e);
    }
    let weeklyClosings = [];
    try {
      weeklyClosings = await db.select().from(cargoWeeklyClosings).where(eq11(cargoWeeklyClosings.clientId, input.clientId)).orderBy(desc8(cargoWeeklyClosings.weekEnd)).limit(20);
    } catch (e) {
      console.error("[Portal] Erro ao buscar fechamentos:", e);
    }
    let documents = [];
    try {
      documents = await db.select().from(clientDocuments).where(eq11(clientDocuments.clientId, input.clientId)).orderBy(desc8(clientDocuments.createdAt)).limit(50);
    } catch (e) {
      console.error("[Portal] Erro ao buscar documentos:", e);
    }
    let advances = [];
    let totalAdvanceBalance = 0;
    let advanceDeductions = [];
    try {
      advances = await db.select().from(clientAdvances).where(eq11(clientAdvances.clientId, input.clientId)).orderBy(desc8(clientAdvances.date)).limit(50);
      totalAdvanceBalance = advances.filter((a) => a.status === "ativo").reduce((sum, a) => sum + parseFloat(a.balanceRemaining || "0"), 0);
      advanceDeductions = await db.select().from(clientAdvanceDeductions).where(eq11(clientAdvanceDeductions.clientId, input.clientId)).orderBy(desc8(clientAdvanceDeductions.date)).limit(200);
    } catch (e) {
      console.error("[Portal] Erro ao buscar adiantamentos:", e);
    }
    return { client, loads, replanting, payments, weeklyClosings, documents, advances, totalAdvanceBalance, advanceDeductions };
  }),
  // ── LISTAR TODOS OS REPLANTIOS (admin) ──
  listAllReplantings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db.select({
      id: replantingRecords.id,
      clientId: replantingRecords.clientId,
      date: replantingRecords.date,
      area: replantingRecords.area,
      species: replantingRecords.species,
      quantity: replantingRecords.quantity,
      areaHectares: replantingRecords.areaHectares,
      notes: replantingRecords.notes,
      photosJson: replantingRecords.photosJson,
      registeredBy: replantingRecords.registeredBy,
      createdAt: replantingRecords.createdAt,
      clientName: clients.name
    }).from(replantingRecords).leftJoin(clients, eq11(replantingRecords.clientId, clients.id)).orderBy(desc8(replantingRecords.date));
    return records;
  }),
  // ── LISTAR TODOS OS PAGAMENTOS (admin) ──
  listAllPayments: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db.select({
      id: clientPayments.id,
      clientId: clientPayments.clientId,
      dueDate: clientPayments.dueDate,
      paidDate: clientPayments.paidDate,
      description: clientPayments.description,
      amount: clientPayments.amount,
      status: clientPayments.status,
      referenceMonth: clientPayments.referenceMonth,
      loadId: clientPayments.loadId,
      notes: clientPayments.notes,
      invoiceNumber: clientPayments.invoiceNumber,
      paymentMethod: clientPayments.paymentMethod,
      createdAt: clientPayments.createdAt,
      clientName: clients.name
    }).from(clientPayments).leftJoin(clients, eq11(clientPayments.clientId, clients.id)).orderBy(desc8(clientPayments.dueDate));
    return records;
  }),
  // ── ATUALIZAR PAGAMENTO (admin) ──
  updatePayment: protectedProcedure.input(z11.object({
    id: z11.number(),
    status: z11.string().optional(),
    paidAt: z11.string().optional(),
    notes: z11.string().optional(),
    description: z11.string().optional(),
    amount: z11.string().optional(),
    dueDate: z11.string().optional(),
    invoiceNumber: z11.string().optional(),
    paymentMethod: z11.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, paidAt, dueDate, ...rest } = input;
    const updateData = { ...rest };
    if (paidAt) updateData.paidDate = new Date(paidAt).toISOString().slice(0, 19).replace("T", " ");
    if (dueDate) updateData.dueDate = new Date(dueDate).toISOString().slice(0, 19).replace("T", " ");
    await db.update(clientPayments).set(updateData).where(eq11(clientPayments.id, id));
    return { success: true };
  }),
  // ── EXCLUIR REPLANTIO (admin) ──
  deleteReplanting: protectedProcedure.input(z11.object({ id: z11.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(replantingRecords).where(eq11(replantingRecords.id, input.id));
    return { success: true };
  }),
  // ── EXCLUIR PAGAMENTO (admin) ──
  deletePayment: protectedProcedure.input(z11.object({ id: z11.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(clientPayments).where(eq11(clientPayments.id, input.id));
    return { success: true };
  }),
  // ── DEFINIR/ALTERAR SENHA DO CLIENTE (admin) ──
  setClientPassword: protectedProcedure.input(z11.object({
    clientId: z11.number(),
    password: z11.string().min(4)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const hash = await bcrypt3.hash(input.password, 10);
    await db.update(clients).set({ password: hash }).where(eq11(clients.id, input.clientId));
    return { success: true };
  }),
  // ── REGISTRAR REPLANTIO (admin) ──
  addReplanting: protectedProcedure.input(z11.object({
    clientId: z11.number(),
    date: z11.string(),
    area: z11.string().optional(),
    species: z11.string().optional(),
    quantity: z11.number().optional(),
    areaHectares: z11.string().optional(),
    notes: z11.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(replantingRecords).values({
      clientId: input.clientId,
      date: new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
      area: input.area,
      species: input.species || "Eucalipto",
      quantity: input.quantity,
      areaHectares: input.areaHectares,
      notes: input.notes,
      registeredBy: ctx.user.id
    });
    return { success: true };
  }),
  // ── REGISTRAR PAGAMENTO (admin) ──
  addPayment: protectedProcedure.input(z11.object({
    clientId: z11.number(),
    referenceDate: z11.string().optional(),
    description: z11.string().optional(),
    grossAmount: z11.string().optional(),
    netAmount: z11.string().optional(),
    status: z11.string().default("pending"),
    dueDate: z11.string().optional(),
    paidAt: z11.string().optional(),
    notes: z11.string().optional(),
    invoiceNumber: z11.string().optional(),
    paymentMethod: z11.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const amount = input.netAmount || input.grossAmount || "0";
    await db.insert(clientPayments).values({
      clientId: input.clientId,
      amount,
      description: input.description,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 19).replace("T", " ") : void 0,
      paidDate: input.paidAt ? new Date(input.paidAt).toISOString().slice(0, 19).replace("T", " ") : void 0,
      notes: input.notes,
      invoiceNumber: input.invoiceNumber,
      paymentMethod: input.paymentMethod,
      createdBy: ctx.user.id
    });
    return { success: true };
  })
});

// server/routers/collaboratorDocuments.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z12 } from "zod";
import { eq as eq12, desc as desc9 } from "drizzle-orm";
var DOC_TYPES = ["cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"];
var collaboratorDocumentsRouter = router({
  // Listar documentos de um colaborador
  list: protectedProcedure.input(z12.object({ collaboratorId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.select().from(collaboratorDocuments).where(eq12(collaboratorDocuments.collaboratorId, input.collaboratorId)).orderBy(desc9(collaboratorDocuments.createdAt));
  }),
  // Adicionar documento (imagem ou PDF) — usa S3 via cloudinaryUpload helper
  add: protectedProcedure.input(z12.object({
    collaboratorId: z12.number(),
    type: z12.enum(DOC_TYPES),
    title: z12.string().min(2),
    fileBase64: z12.string(),
    // base64 da imagem ou PDF (pode ter prefixo data:...)
    fileType: z12.string().optional(),
    // "image/jpeg", "application/pdf"
    issueDate: z12.string().optional(),
    expiryDate: z12.string().optional(),
    notes: z12.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await cloudinaryUpload(input.fileBase64, "btree/documents");
    const fileUrl = result.url;
    const [inserted] = await db.insert(collaboratorDocuments).values({
      collaboratorId: input.collaboratorId,
      type: input.type,
      title: input.title,
      fileUrl,
      fileType: input.fileType,
      issueDate: input.issueDate ? new Date(input.issueDate) : void 0,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : void 0,
      notes: input.notes,
      uploadedBy: ctx.user.id
    });
    const newId = inserted.insertId;
    const created = await db.select().from(collaboratorDocuments).where(eq12(collaboratorDocuments.id, newId)).limit(1);
    return created[0];
  }),
  // Remover documento
  remove: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(collaboratorDocuments).where(eq12(collaboratorDocuments.id, input.id));
    return { success: true };
  }),
  // Buscar colaborador com todos os dados para gerar PDF
  getForPdf: protectedProcedure.input(z12.object({ collaboratorId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [collab] = await db.select().from(collaborators).where(eq12(collaborators.id, input.collaboratorId)).limit(1);
    if (!collab) throw new Error("Colaborador n\xE3o encontrado");
    const docs = await db.select().from(collaboratorDocuments).where(eq12(collaboratorDocuments.collaboratorId, input.collaboratorId)).orderBy(desc9(collaboratorDocuments.createdAt));
    return { collaborator: collab, documents: docs };
  })
});

// server/routers/equipmentDetail.ts
init_trpc();
init_db();
init_schema();
init_cloudinary();
import { z as z13 } from "zod";
import { eq as eq13, desc as desc10, and as and5 } from "drizzle-orm";
import { alias as alias2 } from "drizzle-orm/mysql-core";
var driverAlias2 = alias2(collaborators, "driver");
var equipmentDetailRouter = router({
  // ─── Equipamento ────────────────────────────────────────────────────────────
  getById: protectedProcedure.input(z13.object({ id: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      model: equipment.model,
      year: equipment.year,
      serialNumber: equipment.serialNumber,
      licensePlate: equipment.licensePlate,
      imageUrl: equipment.imageUrl,
      status: equipment.status,
      typeId: equipment.typeId,
      sectorId: equipment.sectorId,
      clientId: equipment.clientId,
      category: equipment.category,
      invoiceUrl: equipment.invoiceUrl,
      documentUrl: equipment.documentUrl,
      insuranceUrl: equipment.insuranceUrl,
      responsibleDriverId: equipment.responsibleDriverId,
      responsibleDriverName: driverAlias2.name,
      createdAt: equipment.createdAt,
      defaultHeightM: equipment.defaultHeightM,
      defaultWidthM: equipment.defaultWidthM,
      defaultLengthM: equipment.defaultLengthM
    }).from(equipment).leftJoin(driverAlias2, eq13(equipment.responsibleDriverId, driverAlias2.id)).where(eq13(equipment.id, input.id)).limit(1);
    return result[0] || null;
  }),
  // ─── Fotos ──────────────────────────────────────────────────────────────────
  listPhotos: protectedProcedure.input(z13.object({ equipmentId: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(equipmentPhotos).where(eq13(equipmentPhotos.equipmentId, input.equipmentId)).orderBy(desc10(equipmentPhotos.createdAt));
  }),
  addPhoto: protectedProcedure.input(z13.object({
    equipmentId: z13.number(),
    photoBase64: z13.string(),
    caption: z13.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/${input.equipmentId}`);
    const [ins] = await db.insert(equipmentPhotos).values({
      equipmentId: input.equipmentId,
      photoUrl: result.url,
      caption: input.caption,
      uploadedBy: ctx.user.id
    });
    return { id: ins.insertId, url: result.url };
  }),
  removePhoto: protectedProcedure.input(z13.object({ id: z13.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentPhotos).where(eq13(equipmentPhotos.id, input.id));
    return { success: true };
  }),
  updateMainPhoto: protectedProcedure.input(z13.object({ id: z13.number(), photoBase64: z13.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/main`);
    await db.update(equipment).set({ imageUrl: result.url }).where(eq13(equipment.id, input.id));
    return { url: result.url };
  }),
  // ─── Templates de Manutenção ────────────────────────────────────────────────
  listTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const templates = await db.select().from(maintenanceTemplates).where(eq13(maintenanceTemplates.active, 1)).orderBy(maintenanceTemplates.name);
    return templates;
  }),
  getTemplateWithParts: protectedProcedure.input(z13.object({ templateId: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [template] = await db.select().from(maintenanceTemplates).where(eq13(maintenanceTemplates.id, input.templateId)).limit(1);
    if (!template) return null;
    const templateParts = await db.select().from(maintenanceTemplateParts).where(eq13(maintenanceTemplateParts.templateId, input.templateId));
    const partsWithStock = await Promise.all(templateParts.map(async (tp) => {
      if (!tp.partId) return { ...tp, stockQuantity: 0, unitCost: null, photoUrl: null };
      const [part] = await db.select().from(parts).where(eq13(parts.id, tp.partId)).limit(1);
      return {
        ...tp,
        stockQuantity: part?.stockQuantity ?? 0,
        unitCost: part?.unitCost ?? null,
        photoUrl: part?.photoUrl ?? null,
        minStock: part?.minStock ?? 0
      };
    }));
    return { ...template, parts: partsWithStock };
  }),
  createTemplate: protectedProcedure.input(z13.object({
    name: z13.string().min(2),
    type: z13.enum(["preventiva", "corretiva", "revisao"]),
    description: z13.string().optional(),
    estimatedCost: z13.string().optional(),
    parts: z13.array(z13.object({
      partId: z13.number().optional(),
      partCode: z13.string().optional(),
      partName: z13.string(),
      quantity: z13.number().min(1),
      unit: z13.string().optional(),
      notes: z13.string().optional()
    }))
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [ins] = await db.insert(maintenanceTemplates).values({
      name: input.name,
      type: input.type,
      description: input.description,
      estimatedCost: input.estimatedCost,
      createdBy: ctx.user.id
    });
    const templateId = ins.insertId;
    if (input.parts.length > 0) {
      await db.insert(maintenanceTemplateParts).values(
        input.parts.map((p) => ({ templateId, ...p }))
      );
    }
    return { id: templateId };
  }),
  deleteTemplate: protectedProcedure.input(z13.object({ id: z13.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(maintenanceTemplates).where(eq13(maintenanceTemplates.id, input.id));
    return { success: true };
  }),
  // ─── Busca de Peça por Código ────────────────────────────────────────────────
  searchPartByCode: protectedProcedure.input(z13.object({ code: z13.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const results = await db.select().from(parts).where(and5(eq13(parts.active, 1)));
    const code = input.code.toLowerCase();
    return results.filter(
      (p) => p.code?.toLowerCase().includes(code) || p.name.toLowerCase().includes(code)
    ).slice(0, 10);
  }),
  // ─── Manutenções ────────────────────────────────────────────────────────────
  listMaintenance: protectedProcedure.input(z13.object({ equipmentId: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const maintenances = await db.select().from(equipmentMaintenance).where(eq13(equipmentMaintenance.equipmentId, input.equipmentId)).orderBy(desc10(equipmentMaintenance.performedAt));
    const result = await Promise.all(maintenances.map(async (m) => {
      const usedParts = await db.select().from(maintenanceParts).where(eq13(maintenanceParts.maintenanceId, m.id));
      return { ...m, parts: usedParts };
    }));
    return result;
  }),
  addMaintenance: protectedProcedure.input(z13.object({
    equipmentId: z13.number(),
    type: z13.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
    description: z13.string().min(3),
    performedBy: z13.string().optional(),
    cost: z13.string().optional(),
    nextMaintenanceDate: z13.string().optional(),
    performedAt: z13.string(),
    photoBase64: z13.string().optional(),
    templateId: z13.number().optional(),
    // Peças utilizadas
    parts: z13.array(z13.object({
      partId: z13.number().optional(),
      partCode: z13.string().optional(),
      partName: z13.string(),
      partPhotoUrl: z13.string().optional(),
      quantity: z13.number().min(1),
      unit: z13.string().optional(),
      unitCost: z13.string().optional(),
      fromStock: z13.number().optional()
      // 1 = baixou estoque, 0 = avulso
    })).optional(),
    // Serviços externos
    laborCost: z13.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let photosJson;
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, `btree/maintenance/${input.equipmentId}`);
      photosJson = JSON.stringify([result.url]);
    }
    let totalParts = 0;
    const usedParts = input.parts || [];
    for (const p of usedParts) {
      if (p.unitCost) {
        totalParts += parseFloat(p.unitCost.replace(",", ".")) * p.quantity;
      }
    }
    const laborCostNum = input.laborCost ? parseFloat(input.laborCost.replace(",", ".")) : 0;
    const totalCost = (totalParts + laborCostNum).toFixed(2);
    const [ins] = await db.insert(equipmentMaintenance).values({
      equipmentId: input.equipmentId,
      type: input.type,
      description: input.description,
      performedBy: input.performedBy,
      cost: totalCost,
      nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate).toISOString().slice(0, 19).replace("T", " ") : void 0,
      performedAt: new Date(input.performedAt).toISOString().slice(0, 19).replace("T", " "),
      photosJson,
      registeredBy: ctx.user.id
    });
    const maintenanceId = ins.insertId;
    if (usedParts.length > 0) {
      for (const p of usedParts) {
        const totalCostPart = p.unitCost ? (parseFloat(p.unitCost.replace(",", ".")) * p.quantity).toFixed(2) : void 0;
        await db.insert(maintenanceParts).values({
          maintenanceId,
          partId: p.partId,
          partCode: p.partCode,
          partName: p.partName,
          partPhotoUrl: p.partPhotoUrl,
          quantity: p.quantity,
          unit: p.unit || "un",
          unitCost: p.unitCost,
          totalCost: totalCostPart,
          fromStock: p.fromStock ?? 1
        });
        if (p.partId && (p.fromStock ?? 1) === 1) {
          const [part] = await db.select().from(parts).where(eq13(parts.id, p.partId)).limit(1);
          if (part) {
            const newQty = Math.max(0, (part.stockQuantity ?? 0) - p.quantity);
            await db.update(parts).set({ stockQuantity: newQty }).where(eq13(parts.id, p.partId));
            await db.insert(partsStockMovements).values({
              partId: p.partId,
              type: "saida",
              quantity: p.quantity,
              reason: `Uso em manuten\xE7\xE3o #${maintenanceId} - ${input.equipmentId}`,
              referenceId: maintenanceId,
              referenceType: "maintenance",
              unitCost: p.unitCost,
              registeredBy: ctx.user.id
            });
          }
        }
      }
    }
    return { id: maintenanceId };
  }),
  removeMaintenance: protectedProcedure.input(z13.object({ id: z13.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentMaintenance).where(eq13(equipmentMaintenance.id, input.id));
    return { success: true };
  }),
  updateMaintenance: protectedProcedure.input(z13.object({
    id: z13.number(),
    type: z13.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
    description: z13.string().min(3),
    performedBy: z13.string().optional(),
    nextMaintenanceDate: z13.string().optional(),
    performedAt: z13.string(),
    laborCost: z13.string().optional(),
    parts: z13.array(z13.object({
      partId: z13.number().optional(),
      partCode: z13.string().optional(),
      partName: z13.string(),
      partPhotoUrl: z13.string().optional(),
      quantity: z13.number().min(1),
      unit: z13.string().optional(),
      unitCost: z13.string().optional(),
      fromStock: z13.number().optional()
    })).optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const usedParts = input.parts || [];
    let totalParts = 0;
    for (const p of usedParts) {
      if (p.unitCost) totalParts += parseFloat(p.unitCost.replace(",", ".")) * p.quantity;
    }
    const laborCostNum = input.laborCost ? parseFloat(input.laborCost.replace(",", ".")) : 0;
    const totalCost = (totalParts + laborCostNum).toFixed(2);
    await db.update(equipmentMaintenance).set({
      type: input.type,
      description: input.description,
      performedBy: input.performedBy,
      cost: totalCost,
      nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate).toISOString().slice(0, 19).replace("T", " ") : null,
      performedAt: new Date(input.performedAt).toISOString().slice(0, 19).replace("T", " ")
    }).where(eq13(equipmentMaintenance.id, input.id));
    await db.delete(maintenanceParts).where(eq13(maintenanceParts.maintenanceId, input.id));
    if (usedParts.length > 0) {
      for (const p of usedParts) {
        const totalCostPart = p.unitCost ? (parseFloat(p.unitCost.replace(",", ".")) * p.quantity).toFixed(2) : void 0;
        await db.insert(maintenanceParts).values({
          maintenanceId: input.id,
          partId: p.partId,
          partCode: p.partCode,
          partName: p.partName,
          partPhotoUrl: p.partPhotoUrl,
          quantity: p.quantity,
          unit: p.unit || "un",
          unitCost: p.unitCost,
          totalCost: totalCostPart,
          fromStock: p.fromStock ?? 0
        });
      }
    }
    return { success: true };
  }),
  // ─── Estoque de Peças ────────────────────────────────────────────────────────
  addStockEntry: protectedProcedure.input(z13.object({
    partId: z13.number(),
    quantity: z13.number().min(1),
    unitCost: z13.string().optional(),
    notes: z13.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [part] = await db.select().from(parts).where(eq13(parts.id, input.partId)).limit(1);
    if (!part) throw new Error("Pe\xE7a n\xE3o encontrada");
    const newQty = (part.stockQuantity ?? 0) + input.quantity;
    await db.update(parts).set({ stockQuantity: newQty }).where(eq13(parts.id, input.partId));
    await db.insert(partsStockMovements).values({
      partId: input.partId,
      type: "entrada",
      quantity: input.quantity,
      reason: "Entrada de estoque (compra)",
      unitCost: input.unitCost,
      notes: input.notes,
      registeredBy: ctx.user.id
    });
    return { success: true, newStock: newQty };
  }),
  listStockMovements: protectedProcedure.input(z13.object({ partId: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(partsStockMovements).where(eq13(partsStockMovements.partId, input.partId)).orderBy(desc10(partsStockMovements.createdAt)).limit(50);
  })
});

// server/routers/purchaseOrders.ts
init_trpc();
init_db();
init_schema();
import { z as z14 } from "zod";
import { TRPCError as TRPCError9 } from "@trpc/server";
import { eq as eq14, desc as desc11 } from "drizzle-orm";
var purchaseOrdersRouter = router({
  // Listar todos os pedidos
  listOrders: protectedProcedure.input(z14.object({ status: z14.string().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const orders = await db.select().from(purchaseOrders).orderBy(desc11(purchaseOrders.createdAt));
    if (input?.status) return orders.filter((o) => o.status === input.status);
    return orders;
  }),
  // Buscar pedido com itens
  getOrder: protectedProcedure.input(z14.object({ id: z14.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [order] = await db.select().from(purchaseOrders).where(eq14(purchaseOrders.id, input.id));
    if (!order) throw new TRPCError9({ code: "NOT_FOUND" });
    const items = await db.select().from(purchaseOrderItems).where(eq14(purchaseOrderItems.orderId, input.id));
    return { ...order, items };
  }),
  // Criar pedido com itens
  createOrder: protectedProcedure.input(z14.object({
    title: z14.string().min(2),
    notes: z14.string().optional(),
    items: z14.array(z14.object({
      partId: z14.number().optional(),
      partName: z14.string(),
      partCode: z14.string().optional(),
      partCategory: z14.string().optional(),
      supplier: z14.string().optional(),
      unit: z14.string().optional(),
      quantity: z14.number().min(1),
      unitCost: z14.string().optional(),
      notes: z14.string().optional()
    })).min(1)
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [result] = await db.insert(purchaseOrders).values({
      title: input.title,
      notes: input.notes,
      status: "rascunho",
      createdBy: ctx.user.id
    });
    const orderId = result.insertId;
    if (input.items.length > 0) {
      await db.insert(purchaseOrderItems).values(
        input.items.map((item) => ({ ...item, orderId }))
      );
    }
    const itemsList = input.items.map((i) => `${i.quantity}x ${i.partName}${i.supplier ? " (" + i.supplier + ")" : ""}`).join(", ");
    notifyTeam({
      event: "pedido_compra_criado",
      title: `Novo pedido de compra criado: ${input.title}.`,
      details: {
        "T\xEDtulo do Pedido": input.title,
        "Itens": itemsList,
        "Qtd. de Itens": input.items.length,
        "Observa\xE7\xF5es": input.notes || "\u2014"
      },
      registeredBy: ctx.user.name
    }).catch(() => {
    });
    try {
      const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      await notifyFinanceiro2({
        type: "solicitacao_peca",
        title: `Nova solicita\xE7\xE3o de pe\xE7as: ${input.title}`,
        message: `${input.items.length} itens solicitados por ${ctx.user.name}. Itens: ${itemsList}`,
        relatedId: orderId,
        relatedType: "purchase_order"
      });
    } catch (e) {
    }
    return { success: true, orderId };
  }),
  // Atualizar status do pedido
  updateOrderStatus: protectedProcedure.input(z14.object({
    id: z14.number(),
    status: z14.enum(["rascunho", "enviado", "aprovado", "rejeitado", "comprado"])
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const updateData = { status: input.status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (input.status === "aprovado") {
      updateData.approvedBy = ctx.user.id;
      updateData.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    await db.update(purchaseOrders).set(updateData).where(eq14(purchaseOrders.id, input.id));
    if (input.status === "enviado") {
      const [order] = await db.select({ title: purchaseOrders.title }).from(purchaseOrders).where(eq14(purchaseOrders.id, input.id));
      notifyTeam({
        event: "pedido_compra_enviado",
        title: `Pedido de compra enviado para aprova\xE7\xE3o: ${order?.title || `#${input.id}`}.`,
        details: {
          "Pedido": order?.title || `#${input.id}`,
          "Status": "Enviado para aprova\xE7\xE3o"
        },
        registeredBy: ctx.user.name
      }).catch(() => {
      });
    }
    return { success: true };
  }),
  // Deletar pedido
  deleteOrder: protectedProcedure.input(z14.object({ id: z14.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError9({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(purchaseOrders).where(eq14(purchaseOrders.id, input.id));
    return { success: true };
  })
});

// server/routers/attendance.ts
init_trpc();
init_db();
init_schema();
init_notification();
import { z as z15 } from "zod";
import { TRPCError as TRPCError10 } from "@trpc/server";
import { eq as eq15, desc as desc12, and as and6, inArray as inArray4, lt, sql as sql5 } from "drizzle-orm";
var attendanceRouter = router({
  // Listar presenças com filtros
  list: protectedProcedure.input(z15.object({
    dateFrom: z15.string().optional(),
    // YYYY-MM-DD
    dateTo: z15.string().optional(),
    collaboratorId: z15.number().optional(),
    paymentStatus: z15.enum(["pendente", "pago"]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    try {
      let allowedClientIds = null;
      if (ctx.user.role !== "admin") {
        try {
          const [perm] = await db.select().from(userPermissions).where(eq15(userPermissions.userId, ctx.user.id));
          if (perm?.allowedClientIds) {
            allowedClientIds = JSON.parse(perm.allowedClientIds);
          }
        } catch {
          try {
            const [rows] = await db.execute(sql5`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
            const row = rows?.[0];
            if (row?.allowed_client_ids) {
              allowedClientIds = JSON.parse(row.allowed_client_ids);
            }
          } catch {
          }
        }
        if (!allowedClientIds) {
          try {
            const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq15(collaborators.userId, ctx.user.id));
            if (collab?.clientId) {
              allowedClientIds = [collab.clientId];
            }
          } catch {
          }
        }
      }
      let allowedLocationIds = null;
      if (allowedClientIds && allowedClientIds.length > 0) {
        const locs = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(inArray4(gpsLocations.clientId, allowedClientIds));
        allowedLocationIds = locs.map((l) => l.id);
      }
      const records = await db.select({
        id: collaboratorAttendance.id,
        collaboratorId: collaboratorAttendance.collaboratorId,
        collaboratorName: collaborators.name,
        collaboratorRole: collaborators.role,
        collaboratorPhoto: collaborators.photoUrl,
        collaboratorClientId: collaborators.clientId,
        date: collaboratorAttendance.date,
        employmentType: collaboratorAttendance.employmentTypeCa,
        dailyValue: collaboratorAttendance.dailyValue,
        pixKey: collaboratorAttendance.pixKey,
        activity: collaboratorAttendance.activity,
        observations: collaboratorAttendance.observations,
        paymentStatus: collaboratorAttendance.paymentStatusCa,
        paidAt: collaboratorAttendance.paidAt,
        registeredBy: collaboratorAttendance.registeredBy,
        createdAt: collaboratorAttendance.createdAt,
        latitude: collaboratorAttendance.latitude,
        longitude: collaboratorAttendance.longitude,
        locationName: collaboratorAttendance.locationName,
        workLocationId: collaboratorAttendance.workLocationId,
        collaboratorPixKey: collaborators.pixKey
      }).from(collaboratorAttendance).innerJoin(collaborators, eq15(collaboratorAttendance.collaboratorId, collaborators.id)).orderBy(desc12(collaboratorAttendance.date));
      let filtered = records;
      if (input?.collaboratorId) {
        filtered = filtered.filter((r) => r.collaboratorId === input.collaboratorId);
      }
      if (input?.paymentStatus) {
        filtered = filtered.filter((r) => r.paymentStatus === input.paymentStatus);
      }
      if (input?.dateFrom) {
        const from = /* @__PURE__ */ new Date(input.dateFrom + "T00:00:00");
        filtered = filtered.filter((r) => {
          try {
            return new Date(r.date) >= from;
          } catch {
            return true;
          }
        });
      }
      if (input?.dateTo) {
        const to = /* @__PURE__ */ new Date(input.dateTo + "T23:59:59");
        filtered = filtered.filter((r) => {
          try {
            return new Date(r.date) <= to;
          } catch {
            return true;
          }
        });
      }
      if (allowedClientIds && allowedClientIds.length > 0) {
        filtered = filtered.filter((r) => {
          if (r.workLocationId && allowedLocationIds && allowedLocationIds.includes(r.workLocationId)) {
            return true;
          }
          if (r.collaboratorClientId && allowedClientIds.includes(r.collaboratorClientId)) {
            return true;
          }
          return false;
        });
      }
      const userIdsRaw = filtered.map((r) => r.registeredBy).filter((id) => id !== null && id !== void 0);
      const userIds = Array.from(new Set(userIdsRaw));
      let userMap = {};
      if (userIds.length > 0) {
        try {
          const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray4(users.id, userIds));
          userMap = Object.fromEntries(usersData.map((u) => [u.id, u.name]));
        } catch (userErr) {
          console.error("[attendance.list] Erro ao buscar nomes de usu\xE1rios:", userErr);
        }
      }
      return filtered.map((r) => ({
        ...r,
        // Usar PIX do cadastro do colaborador como fallback quando o registro de presença não tem
        pixKey: r.pixKey || r.collaboratorPixKey || null,
        registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null
      }));
    } catch (err) {
      console.error("[attendance.list] ERRO DETALHADO:", err.message, err.stack);
      throw new TRPCError10({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed query: ${err.message}`
      });
    }
  }),
  // Criar presença
  create: protectedProcedure.input(z15.object({
    collaboratorId: z15.number(),
    date: z15.string(),
    // YYYY-MM-DD
    employmentType: z15.enum(["clt", "terceirizado", "diarista"]),
    dailyValue: z15.string(),
    pixKey: z15.string().optional(),
    activity: z15.string().optional(),
    observations: z15.string().optional(),
    // GPS
    latitude: z15.string().optional(),
    longitude: z15.string().optional(),
    locationName: z15.string().optional(),
    workLocationId: z15.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [collaborator] = await db.select({ name: collaborators.name }).from(collaborators).where(eq15(collaborators.id, input.collaboratorId));
    const collaboratorName = collaborator?.name || `ID ${input.collaboratorId}`;
    let resolvedWorkLocationId = input.workLocationId || null;
    let resolvedLocationName = input.locationName || null;
    if (resolvedLocationName && !resolvedWorkLocationId) {
      const [loc] = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(eq15(gpsLocations.name, resolvedLocationName));
      if (loc) resolvedWorkLocationId = loc.id;
    }
    if (resolvedWorkLocationId && !resolvedLocationName) {
      const [loc] = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq15(gpsLocations.id, resolvedWorkLocationId));
      if (loc) resolvedLocationName = loc.name;
    }
    await db.insert(collaboratorAttendance).values({
      collaboratorId: input.collaboratorId,
      date: (/* @__PURE__ */ new Date(input.date + "T12:00:00")).toISOString().slice(0, 19).replace("T", " "),
      employmentTypeCa: input.employmentType,
      dailyValue: input.dailyValue,
      pixKey: input.pixKey || null,
      activity: input.activity || null,
      observations: input.observations || null,
      registeredBy: ctx.user.id,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      locationName: resolvedLocationName,
      workLocationId: resolvedWorkLocationId
    });
    const dateFormatted = (/* @__PURE__ */ new Date(input.date + "T12:00:00")).toLocaleDateString("pt-BR");
    const activityInfo = input.activity ? ` (${input.activity})` : "";
    const employmentLabel = input.employmentType === "clt" ? "CLT" : input.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
    await notifyOwner({
      title: `\u2705 Presen\xE7a registrada \u2014 ${collaboratorName}`,
      content: `${collaboratorName}${activityInfo} teve presen\xE7a registrada em ${dateFormatted}.
V\xEDnculo: ${employmentLabel} | Di\xE1ria: R$ ${input.dailyValue}${input.pixKey ? " | PIX: " + input.pixKey : ""}
Local: ${input.locationName || "N\xE3o informado"}
Registrado por: ${ctx.user.name}`
    }).catch(() => {
    });
    notifyTeam({
      event: "presenca_registrada",
      title: `Presen\xE7a de ${collaboratorName} registrada em ${dateFormatted}.`,
      details: {
        "Colaborador": collaboratorName,
        "Data": dateFormatted,
        "V\xEDnculo": employmentLabel,
        "Fun\xE7\xE3o / Atividade": input.activity || "\u2014",
        "Valor da Di\xE1ria": `R$ ${input.dailyValue}`,
        "Chave PIX": input.pixKey || "\u2014"
      },
      registeredBy: ctx.user.name
    }).catch(() => {
    });
    try {
      const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      await notifyFinanceiro2({
        type: "pagamento_diaria",
        title: `Di\xE1ria registrada: ${collaboratorName}`,
        message: `${collaboratorName} - ${dateFormatted} - R$ ${input.dailyValue} (${employmentLabel})`,
        relatedType: "attendance"
      });
    } catch (e) {
    }
    return { success: true };
  }),
  // Atualizar status de pagamento
  markPaid: protectedProcedure.input(z15.object({
    id: z15.number(),
    paid: z15.boolean()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(collaboratorAttendance).set({
      paymentStatusCa: input.paid ? "pago" : "pendente",
      paidAt: input.paid ? (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") : null
    }).where(eq15(collaboratorAttendance.id, input.id));
    return { success: true };
  }),
  // Deletar presença
  delete: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(collaboratorAttendance).where(eq15(collaboratorAttendance.id, input.id));
    return { success: true };
  }),
  // Verificar e notificar pagamentos pendentes há mais de 7 dias
  checkPendingPayments: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const sevenDaysAgoDate = /* @__PURE__ */ new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate.toISOString().slice(0, 19).replace("T", " ");
    const pendingRecords = await db.select({
      id: collaboratorAttendance.id,
      collaboratorName: collaborators.name,
      date: collaboratorAttendance.date,
      dailyValue: collaboratorAttendance.dailyValue,
      pixKey: collaboratorAttendance.pixKey,
      activity: collaboratorAttendance.activity
    }).from(collaboratorAttendance).innerJoin(collaborators, eq15(collaboratorAttendance.collaboratorId, collaborators.id)).where(
      and6(
        eq15(collaboratorAttendance.paymentStatusCa, "pendente"),
        lt(collaboratorAttendance.date, sevenDaysAgo)
      )
    ).orderBy(collaboratorAttendance.date);
    if (pendingRecords.length === 0) {
      return { success: true, count: 0, message: "Nenhum pagamento pendente h\xE1 mais de 7 dias." };
    }
    const byCollaborator = {};
    for (const r of pendingRecords) {
      const name = r.collaboratorName;
      if (!byCollaborator[name]) {
        byCollaborator[name] = { count: 0, total: 0, oldest: new Date(r.date).toLocaleDateString("pt-BR") };
      }
      byCollaborator[name].count++;
      byCollaborator[name].total += parseFloat(r.dailyValue || "0");
    }
    const lines = Object.entries(byCollaborator).map(([name, data]) => `\u2022 ${name}: ${data.count} dia(s) \u2014 R$ ${data.total.toFixed(2)} (desde ${data.oldest})`).join("\n");
    const totalGeral = pendingRecords.reduce((sum, r) => sum + parseFloat(r.dailyValue || "0"), 0);
    await notifyOwner({
      title: `\u26A0\uFE0F ${pendingRecords.length} pagamento(s) pendente(s) h\xE1 mais de 7 dias`,
      content: `Existem ${pendingRecords.length} presen\xE7a(s) com pagamento pendente h\xE1 mais de 7 dias.

Total a pagar: R$ ${totalGeral.toFixed(2)}

${lines}`
    }).catch(() => {
    });
    return { success: true, count: pendingRecords.length, message: `${pendingRecords.length} pagamento(s) pendente(s) notificados.` };
  }),
  // Atualizar local de uma presença já registrada
  updateLocation: protectedProcedure.input(z15.object({
    id: z15.number(),
    workLocationId: z15.number().nullable().optional(),
    locationName: z15.string().nullable().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let resolvedWorkLocationId = input.workLocationId || null;
    let resolvedLocationName = input.locationName || null;
    if (resolvedLocationName && !resolvedWorkLocationId) {
      const [loc] = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(eq15(gpsLocations.name, resolvedLocationName));
      if (loc) resolvedWorkLocationId = loc.id;
    }
    if (resolvedWorkLocationId && !resolvedLocationName) {
      const [loc] = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq15(gpsLocations.id, resolvedWorkLocationId));
      if (loc) resolvedLocationName = loc.name;
    }
    await db.update(collaboratorAttendance).set({
      workLocationId: resolvedWorkLocationId,
      locationName: resolvedLocationName
    }).where(eq15(collaboratorAttendance.id, input.id));
    return { success: true };
  })
});

// server/routers/traccar.ts
init_trpc();
init_db();
init_schema();
import { z as z16 } from "zod";
import { TRPCError as TRPCError11 } from "@trpc/server";
import { eq as eq16, and as and7, desc as desc13, gte as gte2, lte as lte2, sql as sql6 } from "drizzle-orm";
var TRACCAR_URL = process.env.TRACCAR_URL || "";
var TRACCAR_TOKEN = process.env.TRACCAR_TOKEN || "";
function traccarAuth() {
  if (TRACCAR_TOKEN) {
    return {
      Authorization: `Bearer ${TRACCAR_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}
async function traccarFetch(path3, options) {
  if (!TRACCAR_URL) {
    throw new Error("Traccar nao configurado. Configure TRACCAR_URL e TRACCAR_TOKEN.");
  }
  const url = `${TRACCAR_URL}/api${path3}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...traccarAuth(), ...options?.headers || {} }
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    throw new Error(`Traccar API error ${res.status}: ${text2}`);
  }
  return res.json();
}
async function calcIgnitionHours(deviceId, from, to) {
  try {
    const params = new URLSearchParams({ deviceId: String(deviceId), from, to });
    const summary = await traccarFetch(`/reports/summary?${params}`);
    if (Array.isArray(summary) && summary.length > 0) {
      const engineMs = summary[0].engineHours || 0;
      return Math.round(engineMs / 36e5 * 10) / 10;
    }
  } catch {
  }
  return 0;
}
async function checkAndGenerateAlerts(equipmentId, currentHourMeter) {
  const db = await getDb();
  if (!db) return;
  const plans = await db.select().from(preventiveMaintenancePlans).where(and7(
    eq16(preventiveMaintenancePlans.equipmentId, equipmentId),
    eq16(preventiveMaintenancePlans.active, 1)
  ));
  for (const plan of plans) {
    const lastDone = parseFloat(plan.lastDoneHours || "0");
    const dueAt = lastDone + plan.intervalHours;
    const alertAt = dueAt - (plan.alertThresholdHours || 10);
    const existingAlert = await db.select().from(preventiveMaintenanceAlerts).where(and7(
      eq16(preventiveMaintenanceAlerts.planId, plan.id),
      eq16(preventiveMaintenanceAlerts.status, "pendente")
    )).limit(1);
    if (existingAlert.length > 0) continue;
    if (currentHourMeter >= alertAt) {
      await db.insert(preventiveMaintenanceAlerts).values({
        equipmentId,
        planId: plan.id,
        status: "pendente",
        currentHours: String(currentHourMeter),
        dueHours: String(dueAt)
      });
    }
  }
}
var traccarRouter = router({
  /** Verifica se o Traccar esta configurado e acessivel */
  status: protectedProcedure.query(async () => {
    if (!TRACCAR_URL) {
      return { configured: false, message: "Traccar nao configurado" };
    }
    try {
      await traccarFetch("/server");
      return { configured: true, message: "Conectado" };
    } catch (e) {
      return { configured: true, message: `Erro de conexao: ${e instanceof Error ? e.message : "desconhecido"}` };
    }
  }),
  /** Lista todos os dispositivos cadastrados no Traccar */
  devices: protectedProcedure.query(async () => {
    return traccarFetch("/devices");
  }),
  /** Posicao mais recente de todos os dispositivos */
  positions: protectedProcedure.input(z16.object({ deviceId: z16.number().optional() }).optional()).query(async ({ input }) => {
    const params = input?.deviceId ? `?deviceId=${input.deviceId}` : "";
    return traccarFetch(`/positions${params}`);
  }),
  /** Historico de posicoes de um dispositivo em um periodo */
  history: protectedProcedure.input(z16.object({ deviceId: z16.number(), from: z16.string(), to: z16.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    return traccarFetch(`/reports/route?${params}`);
  }),
  /** Resumo de viagens de um dispositivo - enriquecido com endereços e distância real */
  trips: protectedProcedure.input(z16.object({ deviceId: z16.number(), from: z16.string(), to: z16.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    const trips = await traccarFetch(`/reports/trips?${params}`);
    const enriched = await Promise.all(
      trips.map(async (trip) => {
        let realDistance = trip.distance || 0;
        if (realDistance === 0 && trip.endOdometer && trip.startOdometer) {
          realDistance = trip.endOdometer - trip.startOdometer;
        }
        let endAddress = trip.endAddress;
        if (!endAddress && trip.endLat && trip.endLon) {
          try {
            const geoRes = await fetch(
              `${TRACCAR_URL}/api/server/geocode?latitude=${trip.endLat}&longitude=${trip.endLon}`,
              { headers: traccarAuth() }
            );
            if (geoRes.ok) {
              endAddress = await geoRes.text();
            }
          } catch {
          }
        }
        let startAddress = trip.startAddress;
        if (!startAddress && trip.startLat && trip.startLon) {
          try {
            const geoRes = await fetch(
              `${TRACCAR_URL}/api/server/geocode?latitude=${trip.startLat}&longitude=${trip.startLon}`,
              { headers: traccarAuth() }
            );
            if (geoRes.ok) {
              startAddress = await geoRes.text();
            }
          } catch {
          }
        }
        return {
          ...trip,
          startAddress,
          endAddress,
          realDistance
          // distância corrigida em km
        };
      })
    );
    return enriched;
  }),
  /** Resumo de paradas de um dispositivo */
  stops: protectedProcedure.input(z16.object({ deviceId: z16.number(), from: z16.string(), to: z16.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    return traccarFetch(`/reports/stops?${params}`);
  }),
  /** Resumo de km e horas por dispositivo no periodo */
  summary: protectedProcedure.input(z16.object({ deviceId: z16.number().optional(), from: z16.string(), to: z16.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ from: input.from, to: input.to });
    if (input.deviceId) params.set("deviceId", String(input.deviceId));
    return traccarFetch(`/reports/summary?${params}`);
  }),
  /** Geofences (cercas virtuais) */
  geofences: protectedProcedure.query(async () => {
    return traccarFetch("/geofences");
  }),
  /** Eventos recentes (alertas de velocidade, ignicao, geofence) */
  events: protectedProcedure.input(z16.object({ deviceId: z16.number(), from: z16.string(), to: z16.string(), type: z16.string().optional() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    if (input.type) params.set("type", input.type);
    return traccarFetch(`/reports/events?${params}`);
  }),
  // ─── VINCULACAO GPS <-> EQUIPAMENTO ─────────────────────────────────────────
  /** Lista todos os vinculos GPS-equipamento */
  listDeviceLinks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db.select({
      id: gpsDeviceLinks.id,
      equipmentId: gpsDeviceLinks.equipmentId,
      equipmentName: equipment.name,
      traccarDeviceId: gpsDeviceLinks.traccarDeviceId,
      traccarDeviceName: gpsDeviceLinks.traccarDeviceName,
      traccarUniqueId: gpsDeviceLinks.traccarUniqueId,
      active: gpsDeviceLinks.active,
      createdAt: gpsDeviceLinks.createdAt
    }).from(gpsDeviceLinks).innerJoin(equipment, eq16(gpsDeviceLinks.equipmentId, equipment.id)).where(eq16(gpsDeviceLinks.active, 1)).orderBy(equipment.name);
  }),
  /** Vincula um dispositivo GPS a um equipamento */
  linkDevice: protectedProcedure.input(z16.object({
    equipmentId: z16.number(),
    traccarDeviceId: z16.number(),
    traccarDeviceName: z16.string().optional(),
    traccarUniqueId: z16.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(gpsDeviceLinks).set({ active: 0 }).where(eq16(gpsDeviceLinks.equipmentId, input.equipmentId));
    const [result] = await db.insert(gpsDeviceLinks).values({
      equipmentId: input.equipmentId,
      traccarDeviceId: input.traccarDeviceId,
      traccarDeviceName: input.traccarDeviceName,
      traccarUniqueId: input.traccarUniqueId,
      active: 1,
      createdBy: ctx.user.id
    });
    return { id: result.insertId };
  }),
  /** Remove vinculo GPS de um equipamento */
  unlinkDevice: protectedProcedure.input(z16.object({ linkId: z16.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(gpsDeviceLinks).set({ active: 0 }).where(eq16(gpsDeviceLinks.id, input.linkId));
    return { ok: true };
  }),
  // ─── HORAS AUTOMATICAS VIA GPS ───────────────────────────────────────────────
  /**
   * Sincroniza as horas de ignicao do dia anterior para todos os equipamentos vinculados.
   * Deve ser chamado diariamente (cron) ou manualmente pelo admin.
   */
  syncDailyHours: protectedProcedure.input(z16.object({ date: z16.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 864e5);
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);
    const links = await db.select().from(gpsDeviceLinks).where(eq16(gpsDeviceLinks.active, 1));
    const results = [];
    for (const link of links) {
      try {
        const hours = await calcIgnitionHours(
          link.traccarDeviceId,
          from.toISOString(),
          to.toISOString()
        );
        if (hours > 0) {
          const existing = await db.select().from(gpsHoursLog).where(and7(
            eq16(gpsHoursLog.equipmentId, link.equipmentId),
            gte2(gpsHoursLog.date, from.toISOString()),
            lte2(gpsHoursLog.date, to.toISOString())
          )).limit(1);
          if (existing.length === 0) {
            const prevTotalResult = await db.select({ total: sql6`SUM(CAST(hours_worked AS DECIMAL(10,2)))` }).from(gpsHoursLog).where(eq16(gpsHoursLog.equipmentId, link.equipmentId));
            const prevTotal = parseFloat(prevTotalResult[0]?.total || "0");
            const newTotal = prevTotal + hours;
            const startMeter = String(Math.round(prevTotal * 10) / 10);
            const endMeter = String(Math.round(newTotal * 10) / 10);
            await db.insert(gpsHoursLog).values({
              equipmentId: link.equipmentId,
              gpsDeviceLinkId: link.id,
              date: from.toISOString(),
              hoursWorked: String(hours),
              hourMeterStart: startMeter,
              hourMeterEnd: endMeter,
              source: "gps_auto"
            });
            const dateStr = from.toISOString().slice(0, 10);
            await db.insert(machineHours).values({
              equipmentId: link.equipmentId,
              date: from.toISOString().slice(0, 19).replace("T", " "),
              startHourMeter: startMeter,
              endHourMeter: endMeter,
              hoursWorked: String(hours),
              activity: "GPS Autom\xE1tico",
              notes: `Sincronizado automaticamente via GPS em ${dateStr}`,
              source: "gps"
            });
            await db.update(equipment).set({ accumulatedHours: endMeter }).where(eq16(equipment.id, link.equipmentId));
          }
          const totalResult = await db.select({ total: sql6`SUM(CAST(hours_worked AS DECIMAL(10,2)))` }).from(gpsHoursLog).where(eq16(gpsHoursLog.equipmentId, link.equipmentId));
          const totalHours = parseFloat(totalResult[0]?.total || "0");
          await checkAndGenerateAlerts(link.equipmentId, totalHours);
          results.push({ equipmentId: link.equipmentId, hours });
        }
      } catch {
      }
    }
    return { synced: results.length, results };
  }),
  /** Horas acumuladas por equipamento (GPS + manual) */
  equipmentHoursSummary: protectedProcedure.input(z16.object({ equipmentId: z16.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const baseQuery = db.select({
      equipmentId: gpsHoursLog.equipmentId,
      equipmentName: equipment.name,
      totalHours: sql6`SUM(CAST(hours_worked AS DECIMAL(10,2)))`,
      lastDate: sql6`MAX(date)`,
      recordCount: sql6`COUNT(*)`
    }).from(gpsHoursLog).innerJoin(equipment, eq16(gpsHoursLog.equipmentId, equipment.id)).groupBy(gpsHoursLog.equipmentId, equipment.name).orderBy(equipment.name);
    if (input?.equipmentId) {
      return baseQuery.where(eq16(gpsHoursLog.equipmentId, input.equipmentId));
    }
    return baseQuery;
  }),
  /** Log de horas de um equipamento especifico */
  hoursLog: protectedProcedure.input(z16.object({ equipmentId: z16.number(), limit: z16.number().default(30) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db.select().from(gpsHoursLog).where(eq16(gpsHoursLog.equipmentId, input.equipmentId)).orderBy(desc13(gpsHoursLog.date)).limit(input.limit);
  }),
  // ─── PLANOS DE MANUTENCAO PREVENTIVA ────────────────────────────────────────
  /** Lista planos de manutencao de um equipamento */
  listMaintenancePlans: protectedProcedure.input(z16.object({ equipmentId: z16.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db.select().from(preventiveMaintenancePlans).where(and7(
      eq16(preventiveMaintenancePlans.equipmentId, input.equipmentId),
      eq16(preventiveMaintenancePlans.active, 1)
    )).orderBy(preventiveMaintenancePlans.name);
  }),
  /** Cria ou atualiza um plano de manutencao preventiva */
  upsertMaintenancePlan: protectedProcedure.input(z16.object({
    id: z16.number().optional(),
    equipmentId: z16.number(),
    name: z16.string(),
    type: z16.enum(["troca_oleo", "engraxamento", "filtro_ar", "filtro_combustivel", "correia", "revisao_geral", "abastecimento", "outros"]),
    intervalHours: z16.number().min(1),
    lastDoneHours: z16.string().optional(),
    alertThresholdHours: z16.number().default(10),
    notes: z16.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    if (input.id) {
      await db.update(preventiveMaintenancePlans).set({
        name: input.name,
        type: input.type,
        intervalHours: input.intervalHours,
        lastDoneHours: input.lastDoneHours,
        alertThresholdHours: input.alertThresholdHours,
        notes: input.notes
      }).where(eq16(preventiveMaintenancePlans.id, input.id));
      return { id: input.id };
    }
    const [result] = await db.insert(preventiveMaintenancePlans).values({
      equipmentId: input.equipmentId,
      name: input.name,
      type: input.type,
      intervalHours: input.intervalHours,
      lastDoneHours: input.lastDoneHours || "0",
      alertThresholdHours: input.alertThresholdHours,
      notes: input.notes,
      active: 1,
      createdBy: ctx.user.id
    });
    return { id: result.insertId };
  }),
  /** Remove um plano de manutencao */
  deleteMaintenancePlan: protectedProcedure.input(z16.object({ id: z16.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(preventiveMaintenancePlans).set({ active: 0 }).where(eq16(preventiveMaintenancePlans.id, input.id));
    return { ok: true };
  }),
  // ─── ALERTAS DE MANUTENCAO PREVENTIVA ───────────────────────────────────────
  /** Lista alertas pendentes (todos ou por equipamento) */
  listAlerts: protectedProcedure.input(z16.object({ equipmentId: z16.number().optional(), status: z16.string().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const conditions = [];
    if (input.equipmentId) conditions.push(eq16(preventiveMaintenanceAlerts.equipmentId, input.equipmentId));
    if (input.status) conditions.push(eq16(preventiveMaintenanceAlerts.status, input.status));
    return db.select({
      id: preventiveMaintenanceAlerts.id,
      equipmentId: preventiveMaintenanceAlerts.equipmentId,
      equipmentName: equipment.name,
      planId: preventiveMaintenanceAlerts.planId,
      planName: preventiveMaintenancePlans.name,
      planType: preventiveMaintenancePlans.type,
      status: preventiveMaintenanceAlerts.status,
      currentHours: preventiveMaintenanceAlerts.currentHours,
      dueHours: preventiveMaintenanceAlerts.dueHours,
      generatedAt: preventiveMaintenanceAlerts.generatedAt,
      resolvedAt: preventiveMaintenanceAlerts.resolvedAt,
      notes: preventiveMaintenanceAlerts.notes
    }).from(preventiveMaintenanceAlerts).innerJoin(equipment, eq16(preventiveMaintenanceAlerts.equipmentId, equipment.id)).innerJoin(preventiveMaintenancePlans, eq16(preventiveMaintenanceAlerts.planId, preventiveMaintenancePlans.id)).where(conditions.length > 0 ? and7(...conditions) : void 0).orderBy(desc13(preventiveMaintenanceAlerts.generatedAt));
  }),
  /** Resolve (conclui) um alerta e atualiza o horimetro do plano */
  resolveAlert: protectedProcedure.input(z16.object({
    alertId: z16.number(),
    status: z16.enum(["concluido", "ignorado"]),
    notes: z16.string().optional(),
    resolvedHourMeter: z16.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.update(preventiveMaintenanceAlerts).set({
      status: input.status,
      resolvedAt: now,
      resolvedBy: ctx.user.id,
      notes: input.notes
    }).where(eq16(preventiveMaintenanceAlerts.id, input.alertId));
    if (input.status === "concluido") {
      const alert = await db.select().from(preventiveMaintenanceAlerts).where(eq16(preventiveMaintenanceAlerts.id, input.alertId)).limit(1);
      if (alert.length > 0) {
        await db.update(preventiveMaintenancePlans).set({
          lastDoneHours: input.resolvedHourMeter || alert[0].currentHours,
          lastDoneAt: now
        }).where(eq16(preventiveMaintenancePlans.id, alert[0].planId));
      }
    }
    return { ok: true };
  }),
  /**
   * Sincroniza km percorrido do dia para veiculos/caminhoes com GPS.
   * Atualiza accumulated_km no equipment e registra em gps_hours_log.
   */
  syncDailyOdometer: protectedProcedure.input(z16.object({ date: z16.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 864e5);
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);
    const links = await db.select().from(gpsDeviceLinks).where(eq16(gpsDeviceLinks.active, 1));
    const results = [];
    for (const link of links) {
      try {
        const params = new URLSearchParams({
          deviceId: String(link.traccarDeviceId),
          from: from.toISOString(),
          to: to.toISOString()
        });
        const summary = await traccarFetch(`/reports/summary?${params}`);
        if (!Array.isArray(summary) || summary.length === 0) continue;
        const rawDist = summary[0]?.distance || 0;
        const distKm = rawDist > 1e3 ? Math.round(rawDist / 1e3 * 10) / 10 : Math.round(rawDist * 10) / 10;
        if (distKm <= 0) continue;
        const prevKmResult = await db.select({ total: sql6`COALESCE(SUM(CAST(distance_km AS DECIMAL(10,1))), 0)` }).from(gpsHoursLog).where(eq16(gpsHoursLog.equipmentId, link.equipmentId));
        const prevKm = parseFloat(prevKmResult[0]?.total || "0");
        const newKm = Math.round((prevKm + distKm) * 10) / 10;
        await db.update(equipment).set({ accumulatedKm: String(newKm) }).where(eq16(equipment.id, link.equipmentId));
        results.push({ equipmentId: link.equipmentId, distanceKm: distKm });
      } catch {
      }
    }
    return { synced: results.length, results };
  }),
  /**
   * Detecta viagens longas (>50km) do dia e cria auto_freight_trips automaticamente.
   * Vincula combustivel e manutencoes do mesmo dia ao frete.
   */
  detectFreightTrips: protectedProcedure.input(z16.object({ date: z16.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 864e5);
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);
    const dateStr = from.toISOString().slice(0, 10);
    const links = await db.select().from(gpsDeviceLinks).where(eq16(gpsDeviceLinks.active, 1));
    const detected = [];
    for (const link of links) {
      try {
        const params = new URLSearchParams({
          deviceId: String(link.traccarDeviceId),
          from: from.toISOString(),
          to: to.toISOString()
        });
        const trips = await traccarFetch(`/reports/trips?${params}`);
        if (!Array.isArray(trips)) continue;
        const longTrips = trips.filter((t2) => {
          const raw = t2.distance || 0;
          const km = raw > 1e3 ? raw / 1e3 : raw;
          return km >= 50;
        });
        if (longTrips.length === 0) continue;
        const eqRow = await db.select().from(equipment).where(eq16(equipment.id, link.equipmentId)).limit(1);
        const eqName = eqRow[0]?.name || `Equipamento #${link.equipmentId}`;
        const existingFreight = await db.select().from(autoFreightTrips).where(and7(
          eq16(autoFreightTrips.equipmentId, link.equipmentId),
          eq16(autoFreightTrips.tripDate, dateStr)
        )).limit(1);
        if (existingFreight.length > 0) continue;
        const totalDistKm = longTrips.reduce((s, t2) => {
          const raw = t2.distance || 0;
          return s + (raw > 1e3 ? raw / 1e3 : raw);
        }, 0);
        const totalDurationMs = longTrips.reduce((s, t2) => s + (t2.duration || 0), 0);
        const totalDurationMin = Math.round(totalDurationMs / 6e4);
        const fuelRows = await db.select().from(machineFuel).where(and7(
          eq16(machineFuel.equipmentId, link.equipmentId),
          gte2(machineFuel.date, from.toISOString().slice(0, 19).replace("T", " ")),
          lte2(machineFuel.date, to.toISOString().slice(0, 19).replace("T", " "))
        ));
        const fuelCost = fuelRows.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
        const maintRows = await db.select().from(machineMaintenance).where(and7(
          eq16(machineMaintenance.equipmentId, link.equipmentId),
          gte2(machineMaintenance.date, from.toISOString().slice(0, 19).replace("T", " ")),
          lte2(machineMaintenance.date, to.toISOString().slice(0, 19).replace("T", " "))
        ));
        const maintCost = maintRows.reduce((s, r) => s + parseFloat(r.totalCost || "0"), 0);
        const totalCost = fuelCost + maintCost;
        await db.insert(autoFreightTrips).values({
          equipmentId: link.equipmentId,
          equipmentName: eqName,
          traccarDeviceId: link.traccarDeviceId,
          tripDate: dateStr,
          startTime: longTrips[0]?.startTime || null,
          endTime: longTrips[longTrips.length - 1]?.endTime || null,
          distanceKm: String(Math.round(totalDistKm * 10) / 10),
          durationMinutes: totalDurationMin,
          startAddress: longTrips[0]?.startAddress || null,
          endAddress: longTrips[longTrips.length - 1]?.endAddress || null,
          fuelCost: String(fuelCost.toFixed(2)),
          maintenanceCost: String(maintCost.toFixed(2)),
          totalCost: String(totalCost.toFixed(2)),
          status: "detectado"
        });
        if (totalCost > 0) {
          await db.insert(financialEntries).values({
            date: new Date(dateStr).toISOString().slice(0, 19).replace("T", " "),
            type: "despesa",
            category: "transporte",
            description: `Frete GPS autom\xE1tico \u2014 ${eqName} \u2014 ${Math.round(totalDistKm)}km em ${dateStr}`,
            amount: String(totalCost.toFixed(2)),
            equipmentId: link.equipmentId,
            equipmentName: eqName,
            autoGenerated: 1,
            registeredBy: 1
          });
        }
        detected.push(link.equipmentId);
      } catch {
      }
    }
    return { detected: detected.length, equipmentIds: detected };
  }),
  /** Lista fretes automaticos detectados pelo GPS */
  listAutoFreights: protectedProcedure.input(z16.object({
    equipmentId: z16.number().optional(),
    dateFrom: z16.string().optional(),
    dateTo: z16.string().optional(),
    status: z16.enum(["detectado", "confirmado", "ignorado"]).optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.equipmentId) conditions.push(eq16(autoFreightTrips.equipmentId, input.equipmentId));
    if (input.dateFrom) conditions.push(gte2(autoFreightTrips.tripDate, input.dateFrom));
    if (input.dateTo) conditions.push(lte2(autoFreightTrips.tripDate, input.dateTo));
    if (input.status) conditions.push(eq16(autoFreightTrips.status, input.status));
    return db.select().from(autoFreightTrips).where(conditions.length > 0 ? and7(...conditions) : void 0).orderBy(desc13(autoFreightTrips.tripDate));
  }),
  /** Confirma ou ignora um frete automatico */
  updateAutoFreightStatus: protectedProcedure.input(z16.object({
    id: z16.number(),
    status: z16.enum(["confirmado", "ignorado"]),
    notes: z16.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(autoFreightTrips).set({ status: input.status, notes: input.notes }).where(eq16(autoFreightTrips.id, input.id));
    return { ok: true };
  }),
  /** Contagem de alertas pendentes (para badge na sidebar) */
  alertCount: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const result = await db.select({ count: sql6`COUNT(*)` }).from(preventiveMaintenanceAlerts).where(eq16(preventiveMaintenanceAlerts.status, "pendente"));
    return { count: Number(result[0]?.count || 0) };
  })
});

// server/routers/permissions.ts
init_trpc();
init_db();
init_schema();
import { z as z17 } from "zod";
import { TRPCError as TRPCError12 } from "@trpc/server";
import { eq as eq17, sql as sql7 } from "drizzle-orm";
var SYSTEM_MODULES = [
  // Maquinário
  { slug: "equipamentos", label: "Equipamentos", group: "Maquin\xE1rio" },
  { slug: "pecas", label: "Pe\xE7as / Estoque", group: "Maquin\xE1rio" },
  { slug: "manutencao", label: "Manuten\xE7\xE3o", group: "Maquin\xE1rio" },
  { slug: "horas-maquina", label: "Horas de M\xE1quina", group: "Maquin\xE1rio" },
  { slug: "motosserras", label: "Motosserras", group: "Maquin\xE1rio" },
  // Pessoas
  { slug: "colaboradores", label: "Colaboradores", group: "Pessoas" },
  { slug: "presencas", label: "Presen\xE7as", group: "Pessoas" },
  // Operações
  { slug: "cargas", label: "Controle de Cargas", group: "Opera\xE7\xF5es" },
  { slug: "minha-carga", label: "Minha Carga", group: "Opera\xE7\xF5es" },
  { slug: "abastecimento", label: "Abastecimento", group: "Opera\xE7\xF5es" },
  { slug: "gastos-extras", label: "Gastos Extras", group: "Opera\xE7\xF5es" },
  { slug: "reflorestamento", label: "Reflorestamento", group: "Opera\xE7\xF5es" },
  { slug: "replantios", label: "Replantios", group: "Opera\xE7\xF5es" },
  { slug: "gps", label: "Rastreamento GPS", group: "Opera\xE7\xF5es" },
  { slug: "locais-gps", label: "Locais GPS", group: "Opera\xE7\xF5es" },
  // Comercial
  { slug: "clientes", label: "Clientes", group: "Comercial" },
  { slug: "portal-cliente", label: "Portal do Cliente", group: "Comercial" },
  { slug: "pagamentos-clientes", label: "Pagamentos Clientes", group: "Comercial" },
  { slug: "compradores", label: "Compradores", group: "Comercial" },
  { slug: "relatorio-destinos", label: "Relat\xF3rio Destinos", group: "Comercial" },
  // Administrativo (valores financeiros)
  { slug: "financeiro", label: "M\xF3dulo Financeiro", group: "Administrativo" },
  { slug: "relatorios", label: "Relat\xF3rios", group: "Administrativo" },
  { slug: "dashboard-exec", label: "Dashboard Executivo", group: "Administrativo" },
  { slug: "acesso", label: "Controle de Acesso", group: "Administrativo" },
  { slug: "corte-terceirizado", label: "Corte Terceirizado", group: "Administrativo" },
  { slug: "terceirizados", label: "Terceirizados de Corte", group: "Administrativo" },
  { slug: "dashboard-financeiro", label: "Dashboard Financeiro", group: "Administrativo" },
  { slug: "fretes", label: "C\xE1lculo de Fretes", group: "Administrativo" },
  { slug: "fornecedores-combustivel", label: "Fornecedores Combust\xEDvel", group: "Administrativo" },
  { slug: "relatorios-combustivel", label: "Relat\xF3rios Combust\xEDvel", group: "Administrativo" },
  { slug: "contas-pagar-combustivel", label: "Contas a Pagar (Combust\xEDvel)", group: "Administrativo" },
  // Compras
  { slug: "compras", label: "Solicita\xE7\xF5es de Compras", group: "Compras" },
  { slug: "fornecedores", label: "Fornecedores", group: "Compras" },
  { slug: "orcamentos", label: "Or\xE7amentos", group: "Compras" },
  // Transporte
  { slug: "ciclos-frete", label: "Ciclos de Frete (Geofence)", group: "Transporte" },
  // Notas
  { slug: "controle-notas", label: "Controle de Notas Fiscais", group: "Notas" }
];
var PROFILES = {
  admin: {
    label: "Administrador",
    modules: SYSTEM_MODULES.map((m) => m.slug)
  },
  mecanico: {
    label: "Mec\xE2nico",
    modules: ["equipamentos", "pecas", "manutencao", "horas-maquina", "motosserras"]
  },
  operador: {
    label: "Operador",
    modules: ["equipamentos", "horas-maquina", "presencas"]
  },
  motorista: {
    label: "Motorista",
    modules: ["equipamentos", "minha-carga", "abastecimento"]
  },
  motosserrista: {
    label: "Motosserrista",
    modules: ["equipamentos", "manutencao", "motosserras"]
  },
  encarregado: {
    label: "Encarregado de Ro\xE7a",
    modules: ["cargas", "minha-carga", "gastos-extras", "abastecimento", "equipamentos", "colaboradores", "presencas", "manutencao"]
  },
  lider: {
    label: "L\xEDder de Equipe",
    modules: ["presencas", "colaboradores", "equipamentos", "cargas", "minha-carga", "gastos-extras", "horas-maquina", "motosserras", "abastecimento", "locais-gps"]
  },
  equipe: {
    label: "Equipe de Campo",
    modules: ["presencas", "equipamentos", "minha-carga", "gastos-extras", "horas-maquina", "motosserras", "abastecimento", "locais-gps"]
  },
  custom: {
    label: "Personalizado",
    modules: []
  }
};
var permissionsRouter = router({
  // Listar módulos disponíveis
  listModules: protectedProcedure.query(() => {
    return SYSTEM_MODULES;
  }),
  // Listar perfis pré-definidos
  listProfiles: protectedProcedure.query(() => {
    return Object.entries(PROFILES).map(([key, val]) => ({
      key,
      label: val.label,
      modules: val.modules
    }));
  }),
  // Listar clientes (para seletor de clientes permitidos)
  listClients: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    const allClients = await db.select({ id: clients.id, name: clients.name }).from(clients);
    return allClients;
  }),
  // Listar todos os usuários E colaboradores com suas permissões
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).orderBy(users.name);
    const allCollabs = await db.select({
      id: collaborators.id,
      name: collaborators.name,
      email: collaborators.email,
      phone: collaborators.phone,
      userId: collaborators.userId,
      role: collaborators.role,
      clientId: collaborators.clientId,
      active: collaborators.active
    }).from(collaborators).where(eq17(collaborators.active, 1)).orderBy(collaborators.name);
    let allPerms = [];
    try {
      allPerms = await db.select().from(userPermissions);
    } catch {
      try {
        const [rows] = await db.execute(sql7`SELECT * FROM user_permissions`);
        allPerms = rows;
      } catch {
        allPerms = [];
      }
    }
    const permMap = Object.fromEntries(allPerms.map((p) => [p.userId || p.user_id, p]));
    const result = [];
    const userIdsFromUsers = new Set(allUsers.map((u) => u.id));
    for (const u of allUsers) {
      const collab = allCollabs.find((c) => c.userId === u.id);
      result.push({
        id: u.id,
        name: collab?.name || u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        isCollaborator: !!collab,
        collaboratorId: collab?.id || null,
        collaboratorRole: collab?.role || null,
        collaboratorClientId: collab?.clientId || null,
        hasLoggedIn: true,
        phone: collab?.phone || null,
        modules: u.role === "admin" ? null : permMap[u.id]?.modules ? typeof permMap[u.id].modules === "string" ? JSON.parse(permMap[u.id].modules) : permMap[u.id].modules : [],
        profile: permMap[u.id]?.profile || "custom",
        allowedClientIds: permMap[u.id]?.allowedClientIds || permMap[u.id]?.allowed_client_ids ? JSON.parse(permMap[u.id].allowedClientIds || permMap[u.id].allowed_client_ids) : null,
        allowedWorkLocationIds: permMap[u.id]?.allowedWorkLocationIds || permMap[u.id]?.allowed_work_location_ids ? JSON.parse(permMap[u.id].allowedWorkLocationIds || permMap[u.id].allowed_work_location_ids) : null
      });
    }
    for (const c of allCollabs) {
      if (c.userId && userIdsFromUsers.has(c.userId)) continue;
      result.push({
        id: -c.id,
        // ID negativo para diferenciar de users (colaborador sem login)
        name: c.name,
        email: c.email,
        role: null,
        createdAt: null,
        isCollaborator: true,
        collaboratorId: c.id,
        collaboratorRole: c.role,
        collaboratorClientId: c.clientId,
        hasLoggedIn: false,
        phone: c.phone,
        modules: [],
        profile: "custom",
        allowedClientIds: c.clientId ? [c.clientId] : null,
        allowedWorkLocationIds: null
      });
    }
    return result;
  }),
  // Buscar permissões do usuário atual
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { modules: null, profile: "admin", allowedClientIds: null, allowedWorkLocationIds: null };
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    let perm = null;
    try {
      const [permRow] = await db.select().from(userPermissions).where(eq17(userPermissions.userId, ctx.user.id));
      perm = permRow || null;
    } catch (e) {
      try {
        const [rows] = await db.execute(sql7`SELECT * FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
        perm = rows?.[0] || null;
      } catch {
        perm = null;
      }
    }
    if (!perm) {
      let collab = null;
      try {
        const [collabRow] = await db.select({
          clientId: collaborators.clientId,
          role: collaborators.role
        }).from(collaborators).where(eq17(collaborators.userId, ctx.user.id));
        collab = collabRow || null;
      } catch {
        try {
          const [rows] = await db.execute(sql7`SELECT client_id as clientId, role FROM collaborators WHERE user_id = ${ctx.user.id} LIMIT 1`);
          collab = rows?.[0] || null;
        } catch {
          collab = null;
        }
      }
      if (collab?.clientId) {
        const collabRole = collab.role || "custom";
        const profileModules = PROFILES[collabRole]?.modules || [];
        return {
          modules: profileModules.length > 0 ? profileModules : [],
          profile: collabRole,
          allowedClientIds: [collab.clientId],
          allowedWorkLocationIds: null
        };
      }
      return { modules: null, profile: "custom", allowedClientIds: null, allowedWorkLocationIds: null };
    }
    return {
      modules: perm.modules ? typeof perm.modules === "string" ? JSON.parse(perm.modules) : perm.modules : [],
      profile: perm.profile || "custom",
      allowedClientIds: perm.allowedClientIds || perm.allowed_client_ids ? JSON.parse(perm.allowedClientIds || perm.allowed_client_ids) : null,
      allowedWorkLocationIds: perm.allowedWorkLocationIds || perm.allowed_work_location_ids ? JSON.parse(perm.allowedWorkLocationIds || perm.allowed_work_location_ids) : null
    };
  }),
  // Definir permissões de um usuário (apenas admin)
  setPermissions: protectedProcedure.input(z17.object({
    userId: z17.number(),
    modules: z17.array(z17.string()).nullable(),
    profile: z17.string().default("custom"),
    allowedClientIds: z17.array(z17.number()).nullable().optional(),
    allowedWorkLocationIds: z17.array(z17.number()).nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    const modulesJson = input.modules === null ? null : JSON.stringify(input.modules);
    const allowedClientIdsJson = input.allowedClientIds === null || input.allowedClientIds === void 0 ? null : JSON.stringify(input.allowedClientIds);
    const allowedWorkLocationIdsJson = input.allowedWorkLocationIds === null || input.allowedWorkLocationIds === void 0 ? null : JSON.stringify(input.allowedWorkLocationIds);
    if (input.userId < 0) {
      const collabId = Math.abs(input.userId);
      const clientId = input.allowedClientIds && input.allowedClientIds.length > 0 ? input.allowedClientIds[0] : null;
      await db.update(collaborators).set({ clientId }).where(eq17(collaborators.id, collabId));
      return { success: true };
    }
    try {
      const [existing] = await db.select().from(userPermissions).where(eq17(userPermissions.userId, input.userId));
      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profile,
          allowedClientIds: allowedClientIdsJson,
          allowedWorkLocationIds: allowedWorkLocationIdsJson,
          updatedBy: ctx.user.id
        }).where(eq17(userPermissions.userId, input.userId));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          modules: modulesJson,
          profile: input.profile,
          allowedClientIds: allowedClientIdsJson,
          allowedWorkLocationIds: allowedWorkLocationIdsJson,
          updatedBy: ctx.user.id
        });
      }
    } catch {
      await db.execute(sql7`INSERT INTO user_permissions (user_id, modules, profile, allowed_client_ids, allowed_work_location_ids, updated_by)
          VALUES (${input.userId}, ${modulesJson}, ${input.profile}, ${allowedClientIdsJson}, ${allowedWorkLocationIdsJson}, ${ctx.user.id})
          ON DUPLICATE KEY UPDATE modules = ${modulesJson}, profile = ${input.profile}, allowed_client_ids = ${allowedClientIdsJson}, allowed_work_location_ids = ${allowedWorkLocationIdsJson}, updated_by = ${ctx.user.id}`);
    }
    const [collab] = await db.select({ id: collaborators.id }).from(collaborators).where(eq17(collaborators.userId, input.userId));
    if (collab && input.allowedClientIds && input.allowedClientIds.length > 0) {
      await db.update(collaborators).set({ clientId: input.allowedClientIds[0] }).where(eq17(collaborators.id, collab.id));
    }
    return { success: true };
  }),
  // Aplicar perfil pré-definido a um usuário
  applyProfile: protectedProcedure.input(z17.object({
    userId: z17.number(),
    profileKey: z17.string()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const profile = PROFILES[input.profileKey];
    if (!profile) throw new TRPCError12({ code: "BAD_REQUEST", message: "Perfil inv\xE1lido" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    if (input.userId < 0) {
      throw new TRPCError12({ code: "BAD_REQUEST", message: "Colaborador precisa fazer login para receber perfil completo" });
    }
    const modulesJson = input.profileKey === "admin" ? null : JSON.stringify(profile.modules);
    try {
      const [existing] = await db.select().from(userPermissions).where(eq17(userPermissions.userId, input.userId));
      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profileKey,
          updatedBy: ctx.user.id
        }).where(eq17(userPermissions.userId, input.userId));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          modules: modulesJson,
          profile: input.profileKey,
          updatedBy: ctx.user.id
        });
      }
    } catch {
      await db.execute(sql7`INSERT INTO user_permissions (user_id, modules, profile, updated_by)
          VALUES (${input.userId}, ${modulesJson}, ${input.profileKey}, ${ctx.user.id})
          ON DUPLICATE KEY UPDATE modules = ${modulesJson}, profile = ${input.profileKey}, updated_by = ${ctx.user.id}`);
    }
    return { success: true };
  }),
  // Atualizar client_id de um colaborador
  setCollaboratorClient: protectedProcedure.input(z17.object({
    collaboratorId: z17.number(),
    clientId: z17.number().nullable()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(collaborators).set({ clientId: input.clientId }).where(eq17(collaborators.id, input.collaboratorId));
    return { success: true };
  })
});

// server/routers/chainsaws.ts
init_trpc();
init_db();
init_schema();
import { z as z18 } from "zod";
import { eq as eq18, desc as desc14, and as and8, sql as sql8 } from "drizzle-orm";
var chainsawsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsaws).orderBy(chainsaws.name);
  }),
  create: protectedProcedure.input(z18.object({
    name: z18.string().min(1),
    brand: z18.string().optional(),
    model: z18.string().optional(),
    serialNumber: z18.string().optional(),
    chainType: z18.string().default("30"),
    imageUrl: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
    let imageUrl = input.imageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const result = await cloudinaryUpload2(imageUrl, "btree/chainsaws");
      imageUrl = result.url;
    }
    await db.insert(chainsaws).values({
      name: input.name,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      chainType: input.chainType,
      imageUrl,
      notes: input.notes,
      createdBy: ctx.user.id
    });
    return { success: true };
  }),
  update: protectedProcedure.input(z18.object({
    id: z18.number(),
    name: z18.string().min(1).optional(),
    brand: z18.string().optional(),
    model: z18.string().optional(),
    serialNumber: z18.string().optional(),
    chainType: z18.string().optional(),
    status: z18.enum(["ativa", "oficina", "inativa"]).optional(),
    imageUrl: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, imageUrl: rawImageUrl, ...data } = input;
    let imageUrl = rawImageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(imageUrl, "btree/chainsaws");
      imageUrl = result.url;
    }
    await db.update(chainsaws).set({ ...data, ...imageUrl !== void 0 ? { imageUrl } : {} }).where(eq18(chainsaws.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z18.object({ id: z18.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(chainsaws).where(eq18(chainsaws.id, input.id));
    return { success: true };
  })
});
var fuelRouter = router({
  listContainers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(fuelContainers).where(eq18(fuelContainers.isActive, 1)).orderBy(fuelContainers.name);
  }),
  createContainer: protectedProcedure.input(z18.object({
    name: z18.string().min(1),
    color: z18.string().default("vermelho"),
    type: z18.enum(["puro", "mistura"]),
    capacityLiters: z18.string().default("20"),
    notes: z18.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(fuelContainers).values({
      name: input.name,
      color: input.color,
      type: input.type,
      capacityLiters: input.capacityLiters,
      currentVolumeLiters: "0",
      notes: input.notes
    });
    return { success: true };
  }),
  // Abastecer galão (compra de combustível)
  supplyContainer: protectedProcedure.input(z18.object({
    containerId: z18.number(),
    volumeLiters: z18.string(),
    costPerLiter: z18.string().optional(),
    totalCost: z18.string().optional(),
    notes: z18.string().optional(),
    workLocationId: z18.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [container] = await db.select().from(fuelContainers).where(eq18(fuelContainers.id, input.containerId));
    if (!container) throw new Error("Gal\xE3o n\xE3o encontrado");
    const newVolume = (parseFloat(container.currentVolumeLiters || "0") + parseFloat(input.volumeLiters)).toFixed(2);
    await db.update(fuelContainers).set({ currentVolumeLiters: newVolume }).where(eq18(fuelContainers.id, input.containerId));
    let oil2tMl;
    if (container.type === "mistura") {
      const oil2t = (parseFloat(input.volumeLiters) * 20).toFixed(0);
      oil2tMl = oil2t;
      const oil2tParts = await db.select().from(chainsawParts).where(and8(
        eq18(chainsawParts.isActive, 1),
        sql8`(LOWER(${chainsawParts.name}) LIKE '%2t%' OR LOWER(${chainsawParts.name}) LIKE '%dois tempos%')`
      )).limit(1);
      const oil2tPart = oil2tParts[0];
      if (oil2tPart) {
        const currentStock = parseFloat(oil2tPart.currentStock || "0");
        const usedMl = parseFloat(oil2t);
        const newStock = Math.max(0, currentStock - usedMl).toFixed(0);
        await db.update(chainsawParts).set({ currentStock: newStock }).where(eq18(chainsawParts.id, oil2tPart.id));
        await db.insert(chainsawPartMovements).values({
          partId: oil2tPart.id,
          type: "saida",
          quantity: oil2t,
          reason: `Mistura gal\xE3o ${container.name}`,
          registeredBy: ctx.user.id
        });
      }
    }
    await db.insert(fuelContainerEvents).values({
      containerId: input.containerId,
      eventType: "abastecimento",
      volumeLiters: input.volumeLiters,
      costPerLiter: input.costPerLiter,
      totalCost: input.totalCost,
      oil2TMl: oil2tMl,
      registeredBy: ctx.user.id,
      notes: input.notes,
      workLocationId: input.workLocationId
    });
    return { success: true, oil2tMl };
  }),
  // Registrar uso de combustível no campo (baixa no galão)
  useFuel: protectedProcedure.input(z18.object({
    containerId: z18.number(),
    volumeLiters: z18.string(),
    chainsawId: z18.number().optional(),
    notes: z18.string().optional(),
    workLocationId: z18.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [container] = await db.select().from(fuelContainers).where(eq18(fuelContainers.id, input.containerId));
    if (!container) throw new Error("Gal\xE3o n\xE3o encontrado");
    const currentVol = parseFloat(container.currentVolumeLiters || "0");
    const usedVol = parseFloat(input.volumeLiters);
    if (usedVol > currentVol) throw new Error("Volume insuficiente no gal\xE3o");
    const newVolume = (currentVol - usedVol).toFixed(2);
    await db.update(fuelContainers).set({ currentVolumeLiters: newVolume }).where(eq18(fuelContainers.id, input.containerId));
    await db.insert(fuelContainerEvents).values({
      containerId: input.containerId,
      eventType: "uso",
      volumeLiters: input.volumeLiters,
      chainsawId: input.chainsawId,
      registeredBy: ctx.user.id,
      notes: input.notes,
      workLocationId: input.workLocationId
    });
    return { success: true };
  }),
  // Transferir combustível entre galões (vermelho → verde)
  transferFuel: protectedProcedure.input(z18.object({
    sourceContainerId: z18.number(),
    targetContainerId: z18.number(),
    volumeLiters: z18.string(),
    notes: z18.string().optional(),
    workLocationId: z18.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [source] = await db.select().from(fuelContainers).where(eq18(fuelContainers.id, input.sourceContainerId));
    const [target] = await db.select().from(fuelContainers).where(eq18(fuelContainers.id, input.targetContainerId));
    if (!source || !target) throw new Error("Gal\xE3o n\xE3o encontrado");
    const sourceVol = parseFloat(source.currentVolumeLiters || "0");
    const transferVol = parseFloat(input.volumeLiters);
    if (transferVol > sourceVol) throw new Error("Volume insuficiente no gal\xE3o de origem");
    const targetVol = parseFloat(target.currentVolumeLiters || "0");
    await db.update(fuelContainers).set({ currentVolumeLiters: (sourceVol - transferVol).toFixed(2) }).where(eq18(fuelContainers.id, input.sourceContainerId));
    await db.update(fuelContainers).set({ currentVolumeLiters: (targetVol + transferVol).toFixed(2) }).where(eq18(fuelContainers.id, input.targetContainerId));
    await db.insert(fuelContainerEvents).values({
      containerId: input.targetContainerId,
      eventType: "transferencia",
      volumeLiters: input.volumeLiters,
      sourceContainerId: input.sourceContainerId,
      registeredBy: ctx.user.id,
      notes: input.notes,
      workLocationId: input.workLocationId
    });
    return { success: true };
  }),
  listEvents: protectedProcedure.input(z18.object({ containerId: z18.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.containerId) {
      return db.select().from(fuelContainerEvents).where(eq18(fuelContainerEvents.containerId, input.containerId)).orderBy(desc14(fuelContainerEvents.eventDate)).limit(50);
    }
    return db.select().from(fuelContainerEvents).orderBy(desc14(fuelContainerEvents.eventDate)).limit(100);
  })
});
var chainsChainRouter = router({
  listStock: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(chainsawChainStock).orderBy(chainsawChainStock.chainType);
    if (rows.length === 0) {
      await db.insert(chainsawChainStock).values([
        { chainType: "30", sharpenedInBox: 0, inField: 0, inWorkshop: 0, totalStock: 0 },
        { chainType: "34", sharpenedInBox: 0, inField: 0, inWorkshop: 0, totalStock: 0 }
      ]);
      return db.select().from(chainsawChainStock).orderBy(chainsawChainStock.chainType);
    }
    return rows;
  }),
  upsertStock: protectedProcedure.input(z18.object({
    chainType: z18.string(),
    sharpenedInBox: z18.number().optional(),
    inField: z18.number().optional(),
    inWorkshop: z18.number().optional(),
    totalStock: z18.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select().from(chainsawChainStock).where(eq18(chainsawChainStock.chainType, input.chainType));
    if (existing.length > 0) {
      const e = existing[0];
      await db.update(chainsawChainStock).set({
        sharpenedInBox: input.sharpenedInBox ?? e.sharpenedInBox,
        inField: input.inField ?? e.inField,
        inWorkshop: input.inWorkshop ?? e.inWorkshop,
        totalStock: input.totalStock ?? e.totalStock
      }).where(eq18(chainsawChainStock.chainType, input.chainType));
    } else {
      await db.insert(chainsawChainStock).values({
        chainType: input.chainType,
        sharpenedInBox: input.sharpenedInBox ?? 0,
        inField: input.inField ?? 0,
        inWorkshop: input.inWorkshop ?? 0,
        totalStock: input.totalStock ?? 0
      });
    }
    return { success: true };
  }),
  registerEvent: protectedProcedure.input(z18.object({
    chainType: z18.string(),
    eventType: z18.enum(["envio_campo", "retorno_oficina", "afiacao_concluida", "baixa_estoque", "entrada_estoque"]),
    quantity: z18.number().min(1),
    chainsawId: z18.number().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const stockRows = await db.select().from(chainsawChainStock).where(eq18(chainsawChainStock.chainType, input.chainType));
    if (stockRows.length === 0) throw new Error(`Tipo de corrente '${input.chainType}' n\xE3o encontrado. Inicialize o estoque primeiro.`);
    const stock = stockRows[0];
    let updates = {};
    switch (input.eventType) {
      case "envio_campo": {
        const allocated = stock.inField + stock.inWorkshop + stock.sharpenedInBox;
        const unallocated = Math.max(0, stock.totalStock - allocated);
        const availableToSend = stock.sharpenedInBox + unallocated;
        if (availableToSend < input.quantity) throw new Error(`Correntes insuficientes dispon\xEDveis. Dispon\xEDvel: ${availableToSend}`);
        const fromSharpened = Math.min(stock.sharpenedInBox, input.quantity);
        const fromUnallocated = input.quantity - fromSharpened;
        updates = {
          sharpenedInBox: stock.sharpenedInBox - fromSharpened,
          totalStock: stock.totalStock - fromUnallocated,
          inField: stock.inField + input.quantity
        };
        break;
      }
      case "retorno_oficina":
        if (stock.inField < input.quantity) throw new Error("Quantidade em campo insuficiente");
        updates = { inField: stock.inField - input.quantity, inWorkshop: stock.inWorkshop + input.quantity };
        break;
      case "afiacao_concluida":
        if (stock.inWorkshop < input.quantity) throw new Error("Quantidade na oficina insuficiente");
        updates = { inWorkshop: stock.inWorkshop - input.quantity, sharpenedInBox: stock.sharpenedInBox + input.quantity };
        break;
      case "baixa_estoque":
        updates = { totalStock: Math.max(0, stock.totalStock - input.quantity) };
        break;
      case "entrada_estoque":
        updates = {
          totalStock: stock.totalStock + input.quantity,
          sharpenedInBox: stock.sharpenedInBox + input.quantity
        };
        break;
    }
    await db.update(chainsawChainStock).set(updates).where(eq18(chainsawChainStock.chainType, input.chainType));
    await db.insert(chainsawChainEvents).values({
      chainType: input.chainType,
      eventType: input.eventType,
      quantity: input.quantity,
      chainsawId: input.chainsawId,
      registeredBy: ctx.user.id,
      notes: input.notes
    });
    return { success: true };
  }),
  listEvents: protectedProcedure.input(z18.object({ chainType: z18.string().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.chainType) {
      return db.select().from(chainsawChainEvents).where(eq18(chainsawChainEvents.chainType, input.chainType)).orderBy(desc14(chainsawChainEvents.eventDate)).limit(50);
    }
    return db.select().from(chainsawChainEvents).orderBy(desc14(chainsawChainEvents.eventDate)).limit(100);
  })
});
var chainsawPartsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsawParts).where(eq18(chainsawParts.isActive, 1)).orderBy(chainsawParts.category, chainsawParts.name);
  }),
  create: protectedProcedure.input(z18.object({
    code: z18.string().optional(),
    name: z18.string().min(1),
    category: z18.string().optional(),
    unit: z18.string().default("un"),
    currentStock: z18.string().default("0"),
    minStock: z18.string().default("0"),
    unitCost: z18.string().optional(),
    imageUrl: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    let imageUrl = input.imageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(imageUrl, "btree/chainsaw-parts");
      imageUrl = result.url;
    }
    await db.insert(chainsawParts).values({ ...input, imageUrl, createdBy: ctx.user.id });
    return { success: true };
  }),
  update: protectedProcedure.input(z18.object({
    id: z18.number(),
    code: z18.string().optional(),
    name: z18.string().optional(),
    category: z18.string().optional(),
    unit: z18.string().optional(),
    currentStock: z18.string().optional(),
    minStock: z18.string().optional(),
    unitCost: z18.string().optional(),
    imageUrl: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, imageUrl: rawImageUrl, ...data } = input;
    let imageUrl = rawImageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(imageUrl, "btree/chainsaw-parts");
      imageUrl = result.url;
    }
    const updateData = { ...data, ...imageUrl !== void 0 ? { imageUrl } : {} };
    await db.update(chainsawParts).set(updateData).where(eq18(chainsawParts.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z18.object({ id: z18.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(chainsawParts).set({ isActive: 0 }).where(eq18(chainsawParts.id, input.id));
    return { success: true };
  }),
  stockEntry: protectedProcedure.input(z18.object({
    partId: z18.number(),
    quantity: z18.string(),
    unitCost: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const parts3 = await db.select().from(chainsawParts).where(eq18(chainsawParts.id, input.partId));
    if (parts3.length === 0) throw new Error("Pe\xE7a n\xE3o encontrada");
    const part = parts3[0];
    const newStock = (parseFloat(part.currentStock || "0") + parseFloat(input.quantity)).toFixed(2);
    await db.update(chainsawParts).set({ currentStock: newStock }).where(eq18(chainsawParts.id, input.partId));
    await db.insert(chainsawPartMovements).values({
      partId: input.partId,
      type: "entrada",
      quantity: input.quantity,
      reason: "Compra/entrada manual",
      unitCost: input.unitCost,
      registeredBy: ctx.user.id,
      notes: input.notes
    });
    return { success: true };
  }),
  listMovements: protectedProcedure.input(z18.object({ partId: z18.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.partId) {
      return db.select().from(chainsawPartMovements).where(eq18(chainsawPartMovements.partId, input.partId)).orderBy(desc14(chainsawPartMovements.createdAt)).limit(50);
    }
    return db.select().from(chainsawPartMovements).orderBy(desc14(chainsawPartMovements.createdAt)).limit(100);
  })
});
var chainsawOSRouter = router({
  list: protectedProcedure.input(z18.object({
    status: z18.enum(["aberta", "em_andamento", "concluida", "cancelada", "todas"]).default("todas")
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: chainsawServiceOrders.id,
      chainsawId: chainsawServiceOrders.chainsawId,
      problemType: chainsawServiceOrders.problemType,
      problemDescription: chainsawServiceOrders.problemDescription,
      priority: chainsawServiceOrders.priority,
      status: chainsawServiceOrders.status,
      mechanicId: chainsawServiceOrders.mechanicId,
      serviceDescription: chainsawServiceOrders.serviceDescription,
      completedAt: chainsawServiceOrders.completedAt,
      openedBy: chainsawServiceOrders.openedBy,
      openedAt: chainsawServiceOrders.openedAt,
      chainsawName: chainsaws.name
    }).from(chainsawServiceOrders).leftJoin(chainsaws, eq18(chainsawServiceOrders.chainsawId, chainsaws.id)).where(
      input.status === "todas" ? void 0 : eq18(chainsawServiceOrders.status, input.status)
    ).orderBy(desc14(chainsawServiceOrders.openedAt));
    return rows;
  }),
  getById: protectedProcedure.input(z18.object({ id: z18.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(chainsawServiceOrders).where(eq18(chainsawServiceOrders.id, input.id));
    if (rows.length === 0) throw new Error("OS n\xE3o encontrada");
    const parts3 = await db.select().from(chainsawServiceParts).where(eq18(chainsawServiceParts.serviceOrderId, input.id));
    return { ...rows[0], parts: parts3 };
  }),
  open: protectedProcedure.input(z18.object({
    chainsawId: z18.number(),
    problemType: z18.enum(["motor_falhando", "nao_liga", "superaquecimento", "vazamento", "corrente_problema", "sabre_problema", "manutencao_preventiva", "outro"]),
    problemDescription: z18.string().optional(),
    priority: z18.enum(["baixa", "media", "alta", "urgente"]).default("media"),
    imageUrl: z18.string().optional()
    // foto do problema tirada no campo
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    let imageUrl = input.imageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(imageUrl, "btree/chainsaw-os");
      imageUrl = result.url;
    }
    await db.update(chainsaws).set({ status: "oficina" }).where(eq18(chainsaws.id, input.chainsawId));
    await db.insert(chainsawServiceOrders).values({
      chainsawId: input.chainsawId,
      problemType: input.problemType,
      problemDescription: input.problemDescription,
      priority: input.priority,
      status: "aberta",
      imageUrl,
      openedBy: ctx.user.id
    });
    return { success: true };
  }),
  startService: protectedProcedure.input(z18.object({ id: z18.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(chainsawServiceOrders).set({ status: "em_andamento", mechanicId: ctx.user.id }).where(eq18(chainsawServiceOrders.id, input.id));
    return { success: true };
  }),
  complete: protectedProcedure.input(z18.object({
    id: z18.number(),
    serviceDescription: z18.string().min(1),
    parts: z18.array(z18.object({
      partId: z18.number().optional(),
      partName: z18.string(),
      quantity: z18.string(),
      unit: z18.string().default("un"),
      unitCost: z18.string().optional(),
      fromStock: z18.number().default(1)
    })).default([])
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const osRows = await db.select().from(chainsawServiceOrders).where(eq18(chainsawServiceOrders.id, input.id));
    if (osRows.length === 0) throw new Error("OS n\xE3o encontrada");
    const os = osRows[0];
    for (const part of input.parts) {
      await db.insert(chainsawServiceParts).values({
        serviceOrderId: input.id,
        partId: part.partId,
        partName: part.partName,
        quantity: part.quantity,
        unit: part.unit,
        unitCost: part.unitCost,
        fromStock: part.fromStock
      });
      if (part.fromStock === 1 && part.partId) {
        const pRows = await db.select().from(chainsawParts).where(eq18(chainsawParts.id, part.partId));
        if (pRows.length > 0) {
          const p = pRows[0];
          const newStock = Math.max(0, parseFloat(p.currentStock || "0") - parseFloat(part.quantity)).toFixed(2);
          await db.update(chainsawParts).set({ currentStock: newStock }).where(eq18(chainsawParts.id, part.partId));
          await db.insert(chainsawPartMovements).values({
            partId: part.partId,
            type: "saida",
            quantity: part.quantity,
            reason: `OS #${input.id}`,
            serviceOrderId: input.id,
            unitCost: part.unitCost,
            registeredBy: ctx.user.id
          });
        }
      }
    }
    await db.update(chainsawServiceOrders).set({
      status: "concluida",
      serviceDescription: input.serviceDescription,
      completedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      mechanicId: ctx.user.id
    }).where(eq18(chainsawServiceOrders.id, input.id));
    await db.update(chainsaws).set({ status: "ativa" }).where(eq18(chainsaws.id, os.chainsawId));
    return { success: true };
  }),
  cancel: protectedProcedure.input(z18.object({ id: z18.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const osRows = await db.select().from(chainsawServiceOrders).where(eq18(chainsawServiceOrders.id, input.id));
    if (osRows.length === 0) throw new Error("OS n\xE3o encontrada");
    const os = osRows[0];
    await db.update(chainsawServiceOrders).set({ status: "cancelada" }).where(eq18(chainsawServiceOrders.id, input.id));
    await db.update(chainsaws).set({ status: "ativa" }).where(eq18(chainsaws.id, os.chainsawId));
    return { success: true };
  })
});
var chainsawModuleRouter = router({
  chainsaws: chainsawsRouter,
  fuel: fuelRouter,
  chains: chainsChainRouter,
  parts: chainsawPartsRouter,
  os: chainsawOSRouter
});

// server/routers/extraExpenses.ts
init_trpc();
init_db();
init_schema();
import { z as z19 } from "zod";
import { desc as desc15, eq as eq19, and as and9, gte as gte3, lte as lte3, sql as sql9 } from "drizzle-orm";
var extraExpensesRouter = router({
  list: protectedProcedure.input(z19.object({
    dateFrom: z19.string().optional(),
    dateTo: z19.string().optional(),
    category: z19.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.dateFrom) {
      conditions.push(gte3(extraExpenses.date, input.dateFrom));
    }
    if (input.dateTo) {
      conditions.push(lte3(extraExpenses.date, input.dateTo + " 23:59:59"));
    }
    if (input.category) {
      conditions.push(eq19(extraExpenses.category, input.category));
    }
    let allowedClientIds = null;
    if (ctx.user.role !== "admin") {
      try {
        const [perm] = await db.select().from(userPermissions).where(eq19(userPermissions.userId, ctx.user.id));
        if (perm?.allowedClientIds) {
          allowedClientIds = JSON.parse(perm.allowedClientIds);
        }
      } catch {
        try {
          const [rows2] = await db.execute(sql9`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
          const row = rows2?.[0];
          if (row?.allowed_client_ids) {
            allowedClientIds = JSON.parse(row.allowed_client_ids);
          }
        } catch {
        }
      }
      if (!allowedClientIds) {
        try {
          const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq19(collaborators.userId, ctx.user.id));
          if (collab?.clientId) {
            allowedClientIds = [collab.clientId];
          }
        } catch {
        }
      }
    }
    const rows = await db.select({
      id: extraExpenses.id,
      date: extraExpenses.date,
      category: extraExpenses.category,
      description: extraExpenses.description,
      amount: extraExpenses.amount,
      paymentMethod: extraExpenses.paymentMethod,
      receiptImageUrl: extraExpenses.receiptImageUrl,
      notes: extraExpenses.notes,
      registeredBy: extraExpenses.registeredBy,
      registeredByName: extraExpenses.registeredByName,
      createdAt: extraExpenses.createdAt,
      workLocationId: extraExpenses.workLocationId,
      clientId: extraExpenses.clientId,
      equipmentId: extraExpenses.equipmentId,
      locationName: gpsLocations.name,
      locationClientId: gpsLocations.clientId
    }).from(extraExpenses).leftJoin(gpsLocations, eq19(extraExpenses.workLocationId, gpsLocations.id)).where(conditions.length > 0 ? and9(...conditions) : void 0).orderBy(desc15(extraExpenses.date));
    if (allowedClientIds && allowedClientIds.length > 0) {
      return rows.filter((r) => {
        const cId = r.clientId || r.locationClientId;
        return cId && allowedClientIds.includes(cId);
      });
    }
    return rows;
  }),
  create: protectedProcedure.input(z19.object({
    date: z19.string(),
    category: z19.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]),
    description: z19.string().min(1),
    amount: z19.string().min(1),
    paymentMethod: z19.enum(["dinheiro", "pix", "cartao", "debito", "transferencia"]).default("dinheiro"),
    receiptImageUrl: z19.string().optional(),
    notes: z19.string().optional(),
    workLocationId: z19.number().optional(),
    clientId: z19.number().optional(),
    equipmentId: z19.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(extraExpenses).values({
      date: input.date,
      category: input.category,
      description: input.description,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      receiptImageUrl: input.receiptImageUrl,
      notes: input.notes,
      registeredBy: ctx.user.id,
      registeredByName: ctx.user.name,
      workLocationId: input.workLocationId || null,
      clientId: input.clientId || null,
      equipmentId: input.equipmentId || null
    });
    if (input.equipmentId && parseFloat(input.amount.replace(",", ".")) > 0) {
      try {
        const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq19(equipment.id, input.equipmentId));
        const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
        const dateObj = new Date(input.date);
        const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        const catLabels = { abastecimento: "combustivel", refeicao: "alimentacao", compra_material: "material", servico_terceiro: "servico_terceiro", pedagio: "transporte", outro: "outro_despesa" };
        await db.insert(financialEntries).values({
          type: "despesa",
          category: catLabels[input.category] || "outro_despesa",
          description: `${input.description} - ${eqName}`,
          amount: input.amount.replace(",", "."),
          date: dateObj.toISOString().slice(0, 10),
          referenceMonth: refMonth,
          paymentMethod: input.paymentMethod,
          status: "confirmado",
          autoGenerated: 1,
          equipmentId: input.equipmentId,
          equipmentName: eqName,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name + " (auto)"
        });
      } catch {
      }
    }
    return { id: result.insertId };
  }),
  updateLocation: protectedProcedure.input(z19.object({
    id: z19.number(),
    workLocationId: z19.number().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(extraExpenses).set({
      workLocationId: input.workLocationId
    }).where(eq19(extraExpenses.id, input.id));
    return { success: true };
  }),
  update: protectedProcedure.input(z19.object({
    id: z19.number(),
    date: z19.string().optional(),
    category: z19.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]).optional(),
    description: z19.string().min(1).optional(),
    amount: z19.string().optional(),
    paymentMethod: z19.enum(["dinheiro", "pix", "cartao", "debito", "transferencia"]).optional(),
    receiptImageUrl: z19.string().optional(),
    notes: z19.string().optional(),
    workLocationId: z19.number().optional(),
    equipmentId: z19.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, ...fields } = input;
    await db.update(extraExpenses).set({
      ...fields.date !== void 0 && { date: fields.date },
      ...fields.category !== void 0 && { category: fields.category },
      ...fields.description !== void 0 && { description: fields.description },
      ...fields.amount !== void 0 && { amount: fields.amount },
      ...fields.paymentMethod !== void 0 && { paymentMethod: fields.paymentMethod },
      ...fields.receiptImageUrl !== void 0 && { receiptImageUrl: fields.receiptImageUrl },
      ...fields.notes !== void 0 && { notes: fields.notes },
      ...fields.workLocationId !== void 0 && { workLocationId: fields.workLocationId || null },
      ...fields.equipmentId !== void 0 && { equipmentId: fields.equipmentId || null }
    }).where(eq19(extraExpenses.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z19.object({ id: z19.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(extraExpenses).where(eq19(extraExpenses.id, input.id));
    return { success: true };
  })
});

// server/routers/dashboard.ts
init_trpc();
init_db();
init_schema();
import { sql as sql10, gte as gte4, lte as lte4, and as and10 } from "drizzle-orm";
import { z as z20 } from "zod";
var dashboardRouter = router({
  stats: protectedProcedure.input(z20.object({
    month: z20.number().min(0).max(11).optional(),
    // 0-indexed
    year: z20.number().min(2020).max(2100).optional()
  }).optional()).query(async ({ input }) => {
    const now = /* @__PURE__ */ new Date();
    const targetMonth = input?.month ?? now.getMonth();
    const targetYear = input?.year ?? now.getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth, 1).toISOString();
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const db = await getDb();
    if (!db) throw new Error("Banco indispon\xEDvel");
    const [{ count: totalCollaborators }] = await db.select({ count: sql10`count(*)` }).from(collaborators);
    const [{ count: totalClients }] = await db.select({ count: sql10`count(*)` }).from(clients);
    const [{ count: cargoThisMonth }] = await db.select({ count: sql10`count(*)` }).from(cargoLoads).where(and10(
      gte4(cargoLoads.createdAt, startOfMonth),
      lte4(cargoLoads.createdAt, endOfMonth)
    ));
    const [{ total: cargoVolumeThisMonth }] = await db.select({ total: sql10`coalesce(sum(volume_m3), 0)` }).from(cargoLoads).where(and10(
      gte4(cargoLoads.createdAt, startOfMonth),
      lte4(cargoLoads.createdAt, endOfMonth)
    ));
    const [{ count: fuelThisMonth }] = await db.select({ count: sql10`count(*)` }).from(vehicleRecords).where(
      and10(
        gte4(vehicleRecords.createdAt, startOfMonth),
        lte4(vehicleRecords.createdAt, endOfMonth),
        sql10`record_type = 'abastecimento'`
      )
    );
    const [{ total: fuelCostThisMonth }] = await db.select({ total: sql10`coalesce(sum(fuel_cost), 0)` }).from(vehicleRecords).where(
      and10(
        gte4(vehicleRecords.createdAt, startOfMonth),
        lte4(vehicleRecords.createdAt, endOfMonth),
        sql10`record_type = 'abastecimento'`
      )
    );
    const [{ count: attendanceToday }] = await db.select({ count: sql10`count(*)` }).from(collaboratorAttendance).where(gte4(collaboratorAttendance.date, startOfDay));
    const [{ count: attendanceThisMonth }] = await db.select({ count: sql10`count(*)` }).from(collaboratorAttendance).where(and10(
      gte4(collaboratorAttendance.date, startOfMonth),
      lte4(collaboratorAttendance.date, endOfMonth)
    ));
    const [{ total: pendingPaymentThisMonth }] = await db.select({ total: sql10`coalesce(sum(cast(daily_value as decimal(10,2))), 0)` }).from(collaboratorAttendance).where(
      and10(
        gte4(collaboratorAttendance.date, startOfMonth),
        lte4(collaboratorAttendance.date, endOfMonth),
        sql10`payment_status_ca = 'pendente'`
      )
    );
    const [{ count: totalEquipment }] = await db.select({ count: sql10`count(*)` }).from(equipment);
    const [{ count: lowStockParts }] = await db.select({ count: sql10`count(*)` }).from(parts).where(sql10`stock_quantity < 5`);
    const recentCargos = await db.select({
      id: cargoLoads.id,
      vehiclePlate: cargoLoads.vehiclePlate,
      destination: cargoLoads.destination,
      volumeM3: cargoLoads.volumeM3,
      createdAt: cargoLoads.createdAt,
      status: cargoLoads.status
    }).from(cargoLoads).orderBy(sql10`created_at desc`).limit(5);
    const recentAttendance = await db.select({
      id: collaboratorAttendance.id,
      collaboratorId: collaboratorAttendance.collaboratorId,
      date: collaboratorAttendance.date,
      dailyValue: collaboratorAttendance.dailyValue,
      paymentStatus: collaboratorAttendance.paymentStatusCa,
      activity: collaboratorAttendance.activity
    }).from(collaboratorAttendance).orderBy(sql10`created_at desc`).limit(5);
    const [{ count: pendingOrders }] = await db.select({ count: sql10`count(*)` }).from(purchaseOrders).where(sql10`status = 'pending'`);
    const MONTHS_PT = [
      "janeiro",
      "fevereiro",
      "mar\xE7o",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro"
    ];
    return {
      totalCollaborators: Number(totalCollaborators),
      totalClients: Number(totalClients),
      cargoThisMonth: Number(cargoThisMonth),
      cargoVolumeThisMonth: Number(cargoVolumeThisMonth),
      fuelThisMonth: Number(fuelThisMonth),
      fuelCostThisMonth: Number(fuelCostThisMonth),
      attendanceToday: Number(attendanceToday),
      attendanceThisMonth: Number(attendanceThisMonth),
      pendingPaymentThisMonth: Number(pendingPaymentThisMonth),
      totalEquipment: Number(totalEquipment),
      lowStockParts: Number(lowStockParts),
      pendingOrders: Number(pendingOrders),
      recentCargos,
      recentAttendance,
      month: `${MONTHS_PT[targetMonth]} de ${targetYear}`,
      selectedMonth: targetMonth,
      selectedYear: targetYear
    };
  })
});

// server/routers/financial.ts
init_trpc();
init_db();
init_schema();
import { z as z21 } from "zod";
import { desc as desc16, eq as eq20, and as and11, gte as gte5, lte as lte5, sql as sql11 } from "drizzle-orm";
var financialRouter = router({
  // ── Listar lançamentos ──────────────────────────────────────────────────
  list: protectedProcedure.input(z21.object({
    type: z21.enum(["receita", "despesa", "all"]).default("all"),
    dateFrom: z21.string().optional(),
    dateTo: z21.string().optional(),
    referenceMonth: z21.string().optional(),
    // "2026-04"
    status: z21.string().optional(),
    category: z21.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.type !== "all") {
      conditions.push(eq20(financialEntries.type, input.type));
    }
    if (input.dateFrom) {
      conditions.push(gte5(financialEntries.date, new Date(input.dateFrom).toISOString().slice(0, 10)));
    }
    if (input.dateTo) {
      conditions.push(lte5(financialEntries.date, input.dateTo + " 23:59:59"));
    }
    if (input.referenceMonth) {
      conditions.push(eq20(financialEntries.referenceMonth, input.referenceMonth));
    }
    if (input.status) {
      conditions.push(eq20(financialEntries.status, input.status));
    }
    if (input.category) {
      conditions.push(eq20(financialEntries.category, input.category));
    }
    return db.select().from(financialEntries).where(conditions.length > 0 ? and11(...conditions) : void 0).orderBy(desc16(financialEntries.date));
  }),
  // ── Resumo mensal ────────────────────────────────────────────────────────
  monthlySummary: protectedProcedure.input(z21.object({
    referenceMonth: z21.string()
    // "2026-04"
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { totalReceitas: 0, totalDespesas: 0, saldo: 0, entries: [] };
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31 23:59:59`;
    const entries = await db.select().from(financialEntries).where(and11(
      gte5(financialEntries.date, startDate),
      lte5(financialEntries.date, endDate),
      eq20(financialEntries.status, "confirmado")
    )).orderBy(desc16(financialEntries.date));
    const totalReceitas = entries.filter((e) => e.type === "receita").reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
    const totalDespesas = entries.filter((e) => e.type === "despesa").reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      entries
    };
  }),
  // ── Resumo por categoria ─────────────────────────────────────────────────
  categoryBreakdown: protectedProcedure.input(z21.object({
    referenceMonth: z21.string(),
    type: z21.enum(["receita", "despesa"])
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31 23:59:59`;
    const rows = await db.select({
      category: financialEntries.category,
      total: sql11`coalesce(sum(cast(amount as decimal(10,2))), 0)`,
      count: sql11`count(*)`
    }).from(financialEntries).where(and11(
      eq20(financialEntries.type, input.type),
      gte5(financialEntries.date, startDate),
      lte5(financialEntries.date, endDate),
      eq20(financialEntries.status, "confirmado")
    )).groupBy(financialEntries.category).orderBy(sql11`total desc`);
    return rows.map((r) => ({
      category: r.category,
      total: Number(r.total),
      count: Number(r.count)
    }));
  }),
  // ── Histórico mensal (últimos 12 meses) ──────────────────────────────────
  monthlyHistory: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      referenceMonth: financialEntries.referenceMonth,
      type: financialEntries.type,
      total: sql11`coalesce(sum(cast(amount as decimal(10,2))), 0)`
    }).from(financialEntries).where(and11(
      eq20(financialEntries.status, "confirmado"),
      sql11`reference_month >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 11 MONTH), '%Y-%m')`
    )).groupBy(financialEntries.referenceMonth, financialEntries.type).orderBy(financialEntries.referenceMonth);
    const byMonth = {};
    for (const r of rows) {
      const m = r.referenceMonth || "desconhecido";
      if (!byMonth[m]) byMonth[m] = { month: m, receitas: 0, despesas: 0, saldo: 0 };
      if (r.type === "receita") byMonth[m].receitas += Number(r.total);
      else byMonth[m].despesas += Number(r.total);
      byMonth[m].saldo = byMonth[m].receitas - byMonth[m].despesas;
    }
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }),
  // ── Criar lançamento ─────────────────────────────────────────────────────
  create: protectedProcedure.input(z21.object({
    type: z21.enum(["receita", "despesa"]),
    category: z21.string().min(1),
    description: z21.string().min(1),
    amount: z21.string().min(1),
    date: z21.string(),
    paymentMethod: z21.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).default("pix"),
    status: z21.enum(["pendente", "confirmado", "cancelado"]).default("confirmado"),
    clientId: z21.number().optional(),
    clientName: z21.string().optional(),
    receiptImageUrl: z21.string().optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const dateObj = new Date(input.date);
    const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    const [result] = await db.insert(financialEntries).values({
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: dateObj.toISOString().slice(0, 10),
      referenceMonth: refMonth,
      paymentMethod: input.paymentMethod,
      status: input.status,
      clientId: input.clientId,
      clientName: input.clientName,
      receiptImageUrl: input.receiptImageUrl,
      notes: input.notes,
      registeredBy: ctx.user.id,
      registeredByName: ctx.user.name
    });
    return { id: result.insertId };
  }),
  // ── Atualizar lançamento ─────────────────────────────────────────────────
  update: protectedProcedure.input(z21.object({
    id: z21.number(),
    type: z21.enum(["receita", "despesa"]).optional(),
    category: z21.string().optional(),
    description: z21.string().optional(),
    amount: z21.string().optional(),
    date: z21.string().optional(),
    paymentMethod: z21.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).optional(),
    status: z21.enum(["pendente", "confirmado", "cancelado"]).optional(),
    clientName: z21.string().optional(),
    notes: z21.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, date, ...rest } = input;
    const updateData = { ...rest };
    if (date) {
      const dateObj = new Date(date);
      updateData.date = dateObj.toISOString().slice(0, 10);
      updateData.referenceMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    }
    await db.update(financialEntries).set(updateData).where(eq20(financialEntries.id, id));
    return { success: true };
  }),
  // ──   // ── Excluir lançamento ───────────────────────────────────────────
  delete: protectedProcedure.input(z21.object({ id: z21.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(financialEntries).where(eq20(financialEntries.id, input.id));
    return { success: true };
  }),
  // ── Lançar folha de pagamento automaticamente ──────────────────────
  launchPayroll: protectedProcedure.input(z21.object({
    referenceMonth: z21.string()
    // "YYYY-MM"
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select({ id: financialEntries.id }).from(financialEntries).where(and11(
      eq20(financialEntries.referenceMonth, input.referenceMonth),
      eq20(financialEntries.category, "folha_pagamento"),
      eq20(financialEntries.type, "despesa")
    )).limit(1);
    if (existing.length > 0) {
      return { success: false, alreadyExists: true, message: "Folha de pagamento j\xE1 foi lan\xE7ada para este m\xEAs." };
    }
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31 23:59:59`;
    const attendances = await db.select().from(collaboratorAttendance).where(and11(
      gte5(collaboratorAttendance.date, startDate),
      lte5(collaboratorAttendance.date, endDate)
    ));
    if (attendances.length === 0) {
      return { success: false, alreadyExists: false, message: "Nenhuma presen\xE7a registrada neste m\xEAs." };
    }
    const totalAmount = attendances.reduce((sum, a) => {
      return sum + parseFloat(a.dailyValue || "0");
    }, 0);
    const totalDays = attendances.length;
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Mar\xE7o",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;
    await db.insert(financialEntries).values({
      type: "despesa",
      category: "folha_pagamento",
      description: `Folha de Pagamento \u2014 ${monthLabel} (${totalDays} di\xE1rias)`,
      amount: totalAmount.toFixed(2),
      date: endDate,
      referenceMonth: input.referenceMonth,
      paymentMethod: "pix",
      status: "confirmado",
      notes: `Lan\xE7amento autom\xE1tico gerado a partir de ${totalDays} registros de presen\xE7a em ${monthLabel}.`,
      registeredBy: ctx.user.id,
      registeredByName: ctx.user.name
    });
    return {
      success: true,
      alreadyExists: false,
      totalAmount: totalAmount.toFixed(2),
      totalDays,
      message: `Folha de ${monthLabel} lan\xE7ada com sucesso: ${totalDays} di\xE1rias totalizando R$ ${totalAmount.toFixed(2)}.`
    };
  }),
  // ── Verificar se folha já foi lançada ──────────────────────────────
  checkPayrollStatus: protectedProcedure.input(z21.object({ referenceMonth: z21.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select({ id: financialEntries.id, amount: financialEntries.amount, description: financialEntries.description }).from(financialEntries).where(and11(
      eq20(financialEntries.referenceMonth, input.referenceMonth),
      eq20(financialEntries.category, "folha_pagamento"),
      eq20(financialEntries.type, "despesa")
    )).limit(1);
    return { launched: existing.length > 0, entry: existing[0] || null };
  })
});

// server/routers/gpsLocations.ts
init_trpc();
init_db();
init_schema();
import { z as z22 } from "zod";
import { eq as eq21, desc as desc17 } from "drizzle-orm";
var gpsLocationsRouter = router({
  // ── Listar todos os locais ativos ────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(gpsLocations).orderBy(desc17(gpsLocations.createdAt));
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq21(userPermissions.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        const allowedIds = JSON.parse(perm.allowedClientIds);
        if (allowedIds.length > 0) {
          return rows.filter((r) => r.clientId && allowedIds.includes(r.clientId));
        }
      }
    }
    return rows;
  }),
  // ── Listar apenas ativos (para uso na detecção de presença) ──────────────
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(gpsLocations).where(eq21(gpsLocations.isActive, 1)).orderBy(gpsLocations.name);
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq21(userPermissions.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        const allowedIds = JSON.parse(perm.allowedClientIds);
        if (allowedIds.length > 0) {
          return rows.filter((r) => r.clientId && allowedIds.includes(r.clientId));
        }
      }
    }
    return rows;
  }),
  // ── Criar local ──────────────────────────────────────────────────────────
  create: protectedProcedure.input(z22.object({
    name: z22.string().min(1, "Nome \xE9 obrigat\xF3rio"),
    latitude: z22.string().min(1, "Latitude \xE9 obrigat\xF3ria"),
    longitude: z22.string().min(1, "Longitude \xE9 obrigat\xF3ria"),
    radiusMeters: z22.number().min(100).max(5e4).default(2e3),
    clientId: z22.number().optional(),
    notes: z22.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(gpsLocations).values({
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      clientId: input.clientId || null,
      notes: input.notes || null,
      isActive: 1,
      createdBy: ctx.user.id,
      createdByName: ctx.user.name
    });
    return { success: true };
  }),
  // ── Atualizar local ──────────────────────────────────────────────────────
  update: protectedProcedure.input(z22.object({
    id: z22.number(),
    name: z22.string().min(1).optional(),
    latitude: z22.string().optional(),
    longitude: z22.string().optional(),
    radiusMeters: z22.number().min(100).max(5e4).optional(),
    clientId: z22.number().nullable().optional(),
    notes: z22.string().optional(),
    isActive: z22.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, ...rest } = input;
    const updateData = {};
    if (rest.name !== void 0) updateData.name = rest.name;
    if (rest.latitude !== void 0) updateData.latitude = rest.latitude;
    if (rest.longitude !== void 0) updateData.longitude = rest.longitude;
    if (rest.radiusMeters !== void 0) updateData.radiusMeters = rest.radiusMeters;
    if (rest.clientId !== void 0) updateData.clientId = rest.clientId;
    if (rest.notes !== void 0) updateData.notes = rest.notes;
    if (rest.isActive !== void 0) updateData.isActive = rest.isActive;
    await db.update(gpsLocations).set(updateData).where(eq21(gpsLocations.id, id));
    return { success: true };
  }),
  // ── Excluir local ────────────────────────────────────────────────────────
  delete: protectedProcedure.input(z22.object({ id: z22.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(gpsLocations).where(eq21(gpsLocations.id, input.id));
    return { success: true };
  })
});

// server/routers/reports.ts
init_trpc();
init_db();
init_schema();
import { z as z23 } from "zod";
import { TRPCError as TRPCError13 } from "@trpc/server";
import { eq as eq22, desc as desc18, and as and13, gte as gte6, lte as lte6, sql as sql12, inArray as inArray6 } from "drizzle-orm";
var reportsRouter = router({
  // ── Listar todos os locais de trabalho (para filtro) ──────────────────────
  locations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    return db.select({ id: gpsLocations.id, name: gpsLocations.name, isActive: gpsLocations.isActive }).from(gpsLocations).orderBy(gpsLocations.name);
  }),
  // ── Padronizar nomes de locais (atualizar locationName em registros antigos) ──
  standardizeLocationNames: protectedProcedure.input(z23.object({
    oldName: z23.string(),
    newLocationId: z23.number(),
    newLocationName: z23.string()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    await db.execute(sql12`
        UPDATE collaborator_attendance 
        SET location_name = ${input.newLocationName}, work_location_id = ${input.newLocationId}
        WHERE location_name = ${input.oldName}
      `);
    return { success: true };
  }),
  // ── Listar nomes de locais únicos (para padronização) ──────────────────────
  uniqueLocationNames: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const results = await db.execute(sql12`
      SELECT DISTINCT location_name FROM collaborator_attendance 
      WHERE location_name IS NOT NULL AND location_name != ''
      ORDER BY location_name
    `);
    return results[0]?.map((r) => r.location_name) || [];
  }),
  // ── Relatório completo por local e período ─────────────────────────────────
  fullReport: protectedProcedure.input(z23.object({
    locationId: z23.number().optional(),
    dateFrom: z23.string(),
    dateTo: z23.string(),
    includeMaoDeObra: z23.boolean().default(true),
    includeConsumo: z23.boolean().default(true),
    includeCargas: z23.boolean().default(true)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    let maoDeObra = [];
    if (input.includeMaoDeObra) {
      maoDeObra = await db.select({
        id: collaboratorAttendance.id,
        collaboratorName: collaborators.name,
        collaboratorRole: collaborators.role,
        date: collaboratorAttendance.date,
        employmentType: collaboratorAttendance.employmentTypeCa,
        dailyValue: collaboratorAttendance.dailyValue,
        activity: collaboratorAttendance.activity,
        paymentStatus: collaboratorAttendance.paymentStatusCa,
        locationName: collaboratorAttendance.locationName,
        workLocationId: collaboratorAttendance.workLocationId
      }).from(collaboratorAttendance).innerJoin(collaborators, eq22(collaboratorAttendance.collaboratorId, collaborators.id)).where(
        and13(
          gte6(collaboratorAttendance.date, dateFrom),
          lte6(collaboratorAttendance.date, dateTo),
          ...input.locationId ? [eq22(collaboratorAttendance.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(collaboratorAttendance.date));
    }
    let consumoVeiculos = [];
    if (input.includeConsumo) {
      consumoVeiculos = await db.select({
        id: fuelRecords.id,
        date: fuelRecords.date,
        equipmentName: equipment.name,
        equipmentPlate: equipment.licensePlate,
        fuelType: fuelRecords.fuelType,
        liters: fuelRecords.liters,
        totalValue: fuelRecords.totalValue,
        pricePerLiter: fuelRecords.pricePerLiter,
        station: fuelRecords.station,
        workLocationId: fuelRecords.workLocationId
      }).from(fuelRecords).innerJoin(equipment, eq22(fuelRecords.equipmentId, equipment.id)).where(
        and13(
          gte6(fuelRecords.date, dateFrom),
          lte6(fuelRecords.date, dateTo),
          ...input.locationId ? [eq22(fuelRecords.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(fuelRecords.date));
    }
    let consumoMaquinas = [];
    if (input.includeConsumo) {
      consumoMaquinas = await db.select({
        id: machineFuel.id,
        date: machineFuel.date,
        equipmentName: equipment.name,
        fuelType: machineFuel.fuelType,
        liters: machineFuel.liters,
        totalValue: machineFuel.totalValue,
        pricePerLiter: machineFuel.pricePerLiter,
        supplier: machineFuel.supplier,
        workLocationId: machineFuel.workLocationId
      }).from(machineFuel).innerJoin(equipment, eq22(machineFuel.equipmentId, equipment.id)).where(
        and13(
          gte6(machineFuel.date, dateFrom),
          lte6(machineFuel.date, dateTo),
          ...input.locationId ? [eq22(machineFuel.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(machineFuel.date));
    }
    let despesasExtras = [];
    if (input.includeConsumo) {
      despesasExtras = await db.select({
        id: extraExpenses.id,
        date: extraExpenses.date,
        category: extraExpenses.category,
        description: extraExpenses.description,
        amount: extraExpenses.amount,
        paymentMethod: extraExpenses.paymentMethod,
        workLocationId: extraExpenses.workLocationId
      }).from(extraExpenses).where(
        and13(
          gte6(extraExpenses.date, dateFrom),
          lte6(extraExpenses.date, dateTo),
          ...input.locationId ? [eq22(extraExpenses.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(extraExpenses.date));
    }
    let cargas = [];
    if (input.includeCargas) {
      cargas = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        vehiclePlate: cargoLoads.vehiclePlate,
        driverName: cargoLoads.driverName,
        heightM: cargoLoads.heightM,
        widthM: cargoLoads.widthM,
        lengthM: cargoLoads.lengthM,
        volumeM3: cargoLoads.volumeM3,
        woodType: cargoLoads.woodType,
        destination: cargoLoads.destination,
        status: cargoLoads.status,
        workLocationId: cargoLoads.workLocationId
      }).from(cargoLoads).where(
        and13(
          gte6(cargoLoads.date, dateFrom),
          lte6(cargoLoads.date, dateTo),
          ...input.locationId ? [eq22(cargoLoads.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(cargoLoads.date));
    }
    const totalMaoDeObra = maoDeObra.reduce((sum, r) => sum + parseFloat(r.dailyValue || "0"), 0);
    const totalCombustivelVeiculos = consumoVeiculos.reduce((sum, r) => sum + parseFloat(r.totalValue || "0"), 0);
    const totalCombustivelMaquinas = consumoMaquinas.reduce((sum, r) => sum + parseFloat(r.totalValue || "0"), 0);
    const totalDespesasExtras = despesasExtras.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
    const totalLitrosVeiculos = consumoVeiculos.reduce((sum, r) => sum + parseFloat(r.liters || "0"), 0);
    const totalLitrosMaquinas = consumoMaquinas.reduce((sum, r) => sum + parseFloat(r.liters || "0"), 0);
    const totalVolumeCargas = cargas.reduce((sum, r) => sum + parseFloat(r.volumeM3 || "0"), 0);
    return {
      periodo: { de: input.dateFrom, ate: input.dateTo },
      maoDeObra: {
        registros: maoDeObra,
        totalDias: maoDeObra.length,
        totalValor: totalMaoDeObra,
        colaboradoresUnicos: new Set(maoDeObra.map((r) => r.collaboratorName)).size,
        pendentes: maoDeObra.filter((r) => r.paymentStatus === "pendente").length,
        pagos: maoDeObra.filter((r) => r.paymentStatus === "pago").length
      },
      consumo: {
        veiculos: consumoVeiculos,
        maquinas: consumoMaquinas,
        despesasExtras,
        totalCombustivelValor: totalCombustivelVeiculos + totalCombustivelMaquinas,
        totalCombustivelLitros: totalLitrosVeiculos + totalLitrosMaquinas,
        totalDespesasExtras,
        totalConsumo: totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras
      },
      cargas: {
        registros: cargas,
        totalCargas: cargas.length,
        totalVolumeM3: totalVolumeCargas
      },
      resumo: {
        custoTotal: totalMaoDeObra + totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras,
        totalMaoDeObra,
        totalConsumo: totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras,
        totalCargas: cargas.length,
        totalVolumeM3: totalVolumeCargas
      }
    };
  }),
  // ── Dashboard resumo por local (para a tela executiva) ─────────────────────
  dashboardByLocation: protectedProcedure.input(z23.object({
    dateFrom: z23.string(),
    dateTo: z23.string(),
    locationId: z23.number().optional()
    // filtro por local específico
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    const locations = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(eq22(gpsLocations.isActive, 1)).orderBy(gpsLocations.name);
    const thirdPartyTrucks = await db.select({ id: equipment.id }).from(equipment).where(eq22(equipment.isThirdParty, 1));
    const thirdPartyIds = thirdPartyTrucks.map((t2) => t2.id);
    const allFreightRates = await db.select().from(freightRates);
    const locationRows = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
    const locationMap = new Map(locationRows.map((l) => [l.id, l.name]));
    const fuzzyMatch = (a, b) => {
      const aL = a.toLowerCase().trim();
      const bL = b.toLowerCase().trim();
      if (aL === bL) return true;
      if (aL.includes(bL) || bL.includes(aL)) return true;
      const bWords = bL.split(/\s+/).filter((w) => w.length > 2);
      return bWords.length > 0 && bWords.every((w) => aL.includes(w));
    };
    const destNameMap = /* @__PURE__ */ new Map();
    const allDestinations = await db.select({ id: cargoDestinations.id, name: cargoDestinations.name }).from(cargoDestinations);
    for (const d of allDestinations) destNameMap.set(d.id, d.name);
    const calcFreightCost = (cargo) => {
      if (!cargo.vehicleId || !thirdPartyIds.includes(cargo.vehicleId)) return 0;
      const worksiteName = cargo.workLocationId ? locationMap.get(cargo.workLocationId) ?? "" : "";
      const destName = (cargo.destinationId ? destNameMap.get(cargo.destinationId) : null) ?? cargo.destination ?? "";
      const weightTons = parseFloat(cargo.weightNetKg || "0") / 1e3;
      let rate = allFreightRates.find(
        (r) => r.worksite.toLowerCase() === worksiteName.toLowerCase() && r.destination.toLowerCase() === destName.toLowerCase()
      );
      if (!rate) rate = allFreightRates.find((r) => fuzzyMatch(worksiteName, r.worksite) && fuzzyMatch(destName, r.destination));
      if (!rate) rate = allFreightRates.find((r) => fuzzyMatch(destName, r.destination));
      if (!rate && worksiteName) rate = allFreightRates.find((r) => fuzzyMatch(worksiteName, r.worksite));
      return rate ? parseFloat(rate.ratePerTon) * weightTons : 0;
    };
    const locFilter = input.locationId ? [eq22(collaboratorAttendance.workLocationId, input.locationId)] : [];
    const locCargoFilter = input.locationId ? [eq22(cargoLoads.workLocationId, input.locationId)] : [];
    const locFuelFilter = input.locationId ? [eq22(vehicleRecords.workLocationId, input.locationId)] : [];
    const locMFuelFilter = input.locationId ? [eq22(machineFuel.workLocationId, input.locationId)] : [];
    const locExtrasFilter = input.locationId ? [eq22(extraExpenses.workLocationId, input.locationId)] : [];
    const locVehicleMaintFilter = input.locationId ? [eq22(vehicleRecords.workLocationId, input.locationId)] : [];
    const allAttendance = await db.select({ dailyValue: collaboratorAttendance.dailyValue, workLocationId: collaboratorAttendance.workLocationId }).from(collaboratorAttendance).where(and13(gte6(collaboratorAttendance.date, dateFrom), lte6(collaboratorAttendance.date, dateTo), ...locFilter));
    const allVehicleFuel = await db.select({ fuelCost: vehicleRecords.fuelCost, liters: vehicleRecords.liters, workLocationId: vehicleRecords.workLocationId }).from(vehicleRecords).where(and13(eq22(vehicleRecords.recordType, "abastecimento"), gte6(vehicleRecords.date, dateFrom), lte6(vehicleRecords.date, dateTo), ...locFuelFilter));
    const allVehicleMaints = await db.select({ maintenanceCost: vehicleRecords.maintenanceCost, workLocationId: vehicleRecords.workLocationId }).from(vehicleRecords).where(and13(eq22(vehicleRecords.recordType, "manutencao"), gte6(vehicleRecords.date, dateFrom), lte6(vehicleRecords.date, dateTo), ...locVehicleMaintFilter));
    const allMFuel = await db.select({ totalValue: machineFuel.totalValue, liters: machineFuel.liters, workLocationId: machineFuel.workLocationId }).from(machineFuel).where(and13(gte6(machineFuel.date, dateFrom), lte6(machineFuel.date, dateTo), ...locMFuelFilter));
    const allExtras = await db.select({ amount: extraExpenses.amount, workLocationId: extraExpenses.workLocationId }).from(extraExpenses).where(and13(gte6(extraExpenses.date, dateFrom), lte6(extraExpenses.date, dateTo), ...locExtrasFilter));
    const allEquipMaints = await db.select({ cost: equipmentMaintenance.cost }).from(equipmentMaintenance).where(and13(gte6(equipmentMaintenance.performedAt, dateFrom), lte6(equipmentMaintenance.performedAt, dateTo)));
    const allEquipMaintsIds = await db.select({ id: equipmentMaintenance.id }).from(equipmentMaintenance).where(and13(gte6(equipmentMaintenance.performedAt, dateFrom), lte6(equipmentMaintenance.performedAt, dateTo)));
    const maintIds = allEquipMaintsIds.map((m) => m.id);
    const allParts = maintIds.length > 0 ? await db.select({ totalCost: maintenanceParts.totalCost }).from(maintenanceParts).where(inArray6(maintenanceParts.maintenanceId, maintIds)) : [];
    const allMachMaints = await db.select({ totalCost: machineMaintenance.totalCost }).from(machineMaintenance).where(and13(gte6(machineMaintenance.date, dateFrom), lte6(machineMaintenance.date, dateTo)));
    const allOilRecords = await db.select({ totalValue: equipmentOilRecords.totalValue }).from(equipmentOilRecords).where(and13(gte6(equipmentOilRecords.date, dateFrom), lte6(equipmentOilRecords.date, dateTo)));
    const allTPFuel = await db.select({ total: thirdPartyFuel.total }).from(thirdPartyFuel).where(and13(gte6(thirdPartyFuel.date, dateFrom), lte6(thirdPartyFuel.date, dateTo)));
    const allCargos = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      deliveryDate: cargoLoads.deliveryDate,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      volumeM3: cargoLoads.volumeM3,
      weightNetKg: cargoLoads.weightNetKg,
      workLocationId: cargoLoads.workLocationId,
      thirdPartyCost: cargoLoads.thirdPartyCost,
      thirdPartyContractor: cargoLoads.thirdPartyContractor,
      destinationId: cargoLoads.destinationId,
      destination: cargoLoads.destination,
      clientId: cargoLoads.clientId,
      clientName: cargoLoads.clientName,
      paymentStatus: cargoLoads.paymentStatus,
      invoiceNumber: cargoLoads.invoiceNumber,
      status: cargoLoads.status
    }).from(cargoLoads).where(and13(gte6(cargoLoads.date, dateFrom), lte6(cargoLoads.date, dateTo), ...locCargoFilter));
    const destIds = Array.from(new Set(allCargos.map((c) => c.destinationId).filter(Boolean)));
    const destMap = /* @__PURE__ */ new Map();
    if (destIds.length > 0) {
      const dests = await db.select({ id: cargoDestinations.id, pricePerTon: cargoDestinations.pricePerTon, pricePerM3: cargoDestinations.pricePerM3, priceType: cargoDestinations.priceType }).from(cargoDestinations).where(inArray6(cargoDestinations.id, destIds));
      for (const d of dests) destMap.set(d.id, d);
    }
    const calcEstimatedRevenue = (cargo) => {
      if (!cargo.destinationId) return 0;
      const dest = destMap.get(cargo.destinationId);
      if (!dest) return 0;
      const priceType = dest.priceType ?? "ton";
      if (priceType === "ton" || priceType === "peso") {
        const price = parseFloat(dest.pricePerTon || "0");
        const weightTons = parseFloat(cargo.weightNetKg || "0") / 1e3;
        return price * weightTons;
      } else {
        const price = parseFloat(dest.pricePerM3 || "0");
        const vol = parseFloat(cargo.volumeM3 || "0");
        return price * vol;
      }
    };
    const clientIds = Array.from(new Set(allCargos.map((c) => c.clientId).filter(Boolean)));
    const clientPriceMap = /* @__PURE__ */ new Map();
    if (clientIds.length > 0) {
      const clientRows = await db.select({ id: clients.id, pricePerTon: clients.pricePerTon }).from(clients).where(inArray6(clients.id, clientIds));
      for (const r of clientRows) clientPriceMap.set(r.id, r.pricePerTon);
    }
    const calcClientPayment = (cargo) => {
      if (!cargo.clientId) return 0;
      const pricePerTon = parseFloat(clientPriceMap.get(cargo.clientId) || "0");
      if (!pricePerTon) return 0;
      const weightTons = parseFloat(cargo.weightNetKg || "0") / 1e3;
      return pricePerTon * weightTons;
    };
    const clientPaymentsData = await db.select({
      id: clientPayments.id,
      clientId: clientPayments.clientId,
      clientName: clients.name,
      amount: clientPayments.amount,
      status: clientPayments.status,
      dueDate: clientPayments.dueDate
    }).from(clientPayments).leftJoin(clients, eq22(clientPayments.clientId, clients.id)).where(and13(
      gte6(clientPayments.dueDate, dateFrom),
      lte6(clientPayments.dueDate, dateTo)
    ));
    const allBuyerPayments = await db.select({
      amount: buyerPayments.amount,
      paymentDate: buyerPayments.paymentDate,
      buyerId: buyerPayments.buyerId,
      buyerName: buyerClients.name,
      invoiceNumber: buyerPayments.invoiceNumber,
      notes: buyerPayments.notes
    }).from(buyerPayments).leftJoin(buyerClients, eq22(buyerPayments.buyerId, buyerClients.id)).where(and13(
      eq22(buyerPayments.status, "pago"),
      gte6(buyerPayments.paymentDate, input.dateFrom),
      lte6(buyerPayments.paymentDate, input.dateTo)
    )).orderBy(desc18(buyerPayments.paymentDate));
    const allFinReceitas = await db.select({
      amount: financialEntries.amount,
      description: financialEntries.description,
      clientName: financialEntries.clientName,
      date: financialEntries.date
    }).from(financialEntries).where(and13(
      eq22(financialEntries.type, "receita"),
      eq22(financialEntries.autoGenerated, 0),
      gte6(financialEntries.date, dateFrom),
      lte6(financialEntries.date, dateTo)
    )).orderBy(desc18(financialEntries.date));
    const totalMaoDeObraGlobal = allAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
    const totalVehicleFuelGlobal = allVehicleFuel.reduce((s, r) => s + parseFloat(r.fuelCost || "0"), 0);
    const totalMFuelGlobal = allMFuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
    const totalExtrasGlobal = allExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    const totalEquipMaintCost = allEquipMaints.reduce((s, r) => s + parseFloat(r.cost || "0"), 0);
    const totalPartsCost = allParts.reduce((s, r) => s + parseFloat(r.totalCost || "0"), 0);
    const totalMachMaintGlobal = allMachMaints.reduce((s, r) => s + parseFloat(r.totalCost || "0"), 0);
    const totalOilGlobal = allOilRecords.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
    const totalVehicleMaintGlobal = allVehicleMaints.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);
    const totalManutencaoGlobal = totalEquipMaintCost + totalPartsCost + totalMachMaintGlobal + totalOilGlobal + totalVehicleMaintGlobal;
    const totalTPFuelGlobal = allTPFuel.reduce((s, r) => s + parseFloat(r.total || "0"), 0);
    const corteTerceirizadoCargos = allCargos.filter(
      (c) => c.thirdPartyContractor && c.thirdPartyContractor.trim() !== ""
    );
    const totalCorteTerceirizadoGlobal = corteTerceirizadoCargos.reduce((s, r) => s + parseFloat(r.thirdPartyCost || "0"), 0);
    const freteTercCargos = thirdPartyIds.length > 0 ? allCargos.filter((c) => c.vehicleId && thirdPartyIds.includes(c.vehicleId)) : [];
    const totalFreteTerceirizadoGlobal = freteTercCargos.reduce((s, c) => s + calcFreightCost(c), 0);
    const totalPagamentoClientesGlobal = allCargos.reduce((s, c) => s + calcClientPayment(c), 0);
    const totalReceitaEstimadaGlobal = allCargos.reduce((s, c) => s + calcEstimatedRevenue(c), 0);
    const buyerPaymentsTotal = allBuyerPayments.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    const finReceitasManualTotal = allFinReceitas.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    const totalReceitaReal = buyerPaymentsTotal + finReceitasManualTotal;
    const totalCustoGlobal = totalMaoDeObraGlobal + totalVehicleFuelGlobal + totalMFuelGlobal + totalExtrasGlobal + totalManutencaoGlobal + totalCorteTerceirizadoGlobal + totalFreteTerceirizadoGlobal + totalTPFuelGlobal + totalPagamentoClientesGlobal;
    const lucroEstimadoGlobal = totalReceitaEstimadaGlobal - totalCustoGlobal;
    const lucroRealGlobal = totalReceitaReal - totalCustoGlobal;
    const dailyMapGlobal = /* @__PURE__ */ new Map();
    for (const c of allCargos) {
      const day = (c.date || "").slice(0, 10);
      if (!day) continue;
      const prev = dailyMapGlobal.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0, receitaReal: 0, custo: 0 };
      const recEst = calcEstimatedRevenue(c);
      const cargoCusto = parseFloat(c.thirdPartyCost || "0") * (c.thirdPartyContractor ? 1 : 0) + calcFreightCost(c);
      dailyMapGlobal.set(day, {
        cargas: prev.cargas + 1,
        volumeM3: prev.volumeM3 + parseFloat(c.volumeM3 || "0"),
        receitaEstimada: prev.receitaEstimada + recEst,
        receitaReal: prev.receitaReal,
        custo: prev.custo + cargoCusto
      });
    }
    for (const p of allBuyerPayments) {
      const day = p.paymentDate?.slice(0, 10) ?? "";
      if (!day) continue;
      const prev = dailyMapGlobal.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0, receitaReal: 0, custo: 0 };
      dailyMapGlobal.set(day, { ...prev, receitaReal: prev.receitaReal + parseFloat(p.amount || "0") });
    }
    const dailyBreakdownGlobal = Array.from(dailyMapGlobal.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v, receita: v.receitaEstimada }));
    const locationData = locations.map((loc) => {
      const locAttendance = allAttendance.filter((r) => r.workLocationId === loc.id);
      const locVehicleFuel = allVehicleFuel.filter((r) => r.workLocationId === loc.id);
      const locVehicleMaints = allVehicleMaints.filter((r) => r.workLocationId === loc.id);
      const locMFuel = allMFuel.filter((r) => r.workLocationId === loc.id);
      const locExtras = allExtras.filter((r) => r.workLocationId === loc.id);
      const locCargos = allCargos.filter((r) => r.workLocationId === loc.id);
      const locClientPayments = clientPaymentsData.filter((r) => {
        const clientIds2 = locCargos.map((c) => c.clientId).filter(Boolean);
        return clientIds2.includes(r.clientId);
      });
      const totalMO = locAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
      const totalVehicleMaintLoc = locVehicleMaints.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);
      const totalComb = locVehicleFuel.reduce((s, r) => s + parseFloat(r.fuelCost || "0"), 0) + locMFuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalExt = locExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const totalVol = locCargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);
      const locCorte = locCargos.filter((c) => c.thirdPartyContractor && c.thirdPartyContractor.trim() !== "");
      const totalLocCorte = locCorte.reduce((s, r) => s + parseFloat(r.thirdPartyCost || "0"), 0);
      const locFreteTer = thirdPartyIds.length > 0 ? locCargos.filter((c) => c.vehicleId && thirdPartyIds.includes(c.vehicleId)) : [];
      const totalLocFrete = locFreteTer.reduce((s, c) => s + calcFreightCost(c), 0);
      const totalLocClientPayments = locCargos.reduce((s, c) => s + calcClientPayment(c), 0);
      const totalLocReceitaEstimada = locCargos.reduce((s, c) => s + calcEstimatedRevenue(c), 0);
      const custo = totalMO + totalComb + totalExt + totalLocCorte + totalLocFrete + totalVehicleMaintLoc + totalLocClientPayments;
      const dailyMap = /* @__PURE__ */ new Map();
      for (const c of locCargos) {
        const day = (c.date || "").slice(0, 10);
        if (!day) continue;
        const prev = dailyMap.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0 };
        dailyMap.set(day, {
          cargas: prev.cargas + 1,
          volumeM3: prev.volumeM3 + parseFloat(c.volumeM3 || "0"),
          receitaEstimada: prev.receitaEstimada + calcEstimatedRevenue(c)
        });
      }
      const dailyBreakdown = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v, receita: v.receitaEstimada }));
      const cargasDetalhadas = locCargos.map((c) => ({
        id: c.id,
        date: (c.date || "").slice(0, 10),
        deliveryDate: c.deliveryDate ? (c.deliveryDate || "").slice(0, 10) : null,
        vehiclePlate: c.vehiclePlate,
        driverName: c.driverName,
        destination: c.destination,
        volumeM3: parseFloat(c.volumeM3 || "0"),
        weightNetKg: parseFloat(c.weightNetKg || "0"),
        invoiceNumber: c.invoiceNumber,
        paymentStatus: c.paymentStatus,
        status: c.status,
        receitaEstimada: calcEstimatedRevenue(c),
        custoCorteTerceirizado: c.thirdPartyContractor ? parseFloat(c.thirdPartyCost || "0") : 0,
        custoFreteTerceirizado: calcFreightCost(c)
      }));
      return {
        locationId: loc.id,
        locationName: loc.name,
        maoDeObra: { total: totalMO, dias: locAttendance.length },
        combustivel: {
          total: totalComb,
          litros: locVehicleFuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0) + locMFuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0)
        },
        despesasExtras: { total: totalExt, qtd: locExtras.length },
        manutencao: { total: totalVehicleMaintLoc, qtd: locVehicleMaints.length },
        freteTerceirizado: { total: totalLocFrete, qtd: locFreteTer.length },
        corteTerceirizado: { total: totalLocCorte, qtd: locCorte.length },
        pagamentoClientes: { total: totalLocClientPayments, qtd: locClientPayments.length },
        cargas: { total: locCargos.length, volumeM3: totalVol },
        receitaEstimada: totalLocReceitaEstimada,
        receita: totalLocReceitaEstimada,
        custoTotal: custo,
        lucro: totalLocReceitaEstimada - custo,
        dailyBreakdown,
        cargasDetalhadas
      };
    });
    return {
      locations: locationData,
      unassigned: {
        maoDeObra: {
          total: allAttendance.filter((r) => !r.workLocationId).reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0),
          dias: allAttendance.filter((r) => !r.workLocationId).length
        }
      },
      totals: {
        custoTotal: totalCustoGlobal,
        totalMaoDeObra: totalMaoDeObraGlobal,
        totalCombustivel: totalVehicleFuelGlobal + totalMFuelGlobal,
        totalDespesas: totalExtrasGlobal,
        totalManutencao: totalManutencaoGlobal,
        totalCorteTerceirizado: totalCorteTerceirizadoGlobal,
        totalFreteTerceirizado: totalFreteTerceirizadoGlobal + totalTPFuelGlobal,
        totalPagamentoClientes: totalPagamentoClientesGlobal,
        totalCargas: allCargos.length,
        totalVolumeM3: allCargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0),
        totalReceita: totalReceitaReal,
        totalReceitaEstimada: totalReceitaEstimadaGlobal,
        lucroTotal: lucroRealGlobal,
        lucroEstimado: lucroEstimadoGlobal,
        dailyBreakdown: dailyBreakdownGlobal,
        receitaBreakdown: {
          byBuyer: (() => {
            const map = {};
            for (const p of allBuyerPayments) {
              const key = String(p.buyerId);
              const name = p.buyerName || `Comprador #${p.buyerId}`;
              if (!map[key]) map[key] = { buyerId: p.buyerId, buyerName: name, total: 0, payments: [] };
              const val = parseFloat(p.amount || "0");
              map[key].total += val;
              map[key].payments.push({ amount: val, paymentDate: p.paymentDate, invoiceNumber: p.invoiceNumber ?? null, notes: p.notes ?? null });
            }
            return Object.values(map).sort((a, b) => b.total - a.total);
          })(),
          manualEntries: allFinReceitas.map((r) => ({
            amount: parseFloat(r.amount || "0"),
            description: r.description,
            clientName: r.clientName ?? null,
            date: r.date
          })),
          totalBuyerPayments: buyerPaymentsTotal,
          totalManual: finReceitasManualTotal
        }
      }
    };
  })
});

// server/routers/auditData.ts
init_trpc();
init_db();
init_schema();
import { z as z24 } from "zod";
import { TRPCError as TRPCError14 } from "@trpc/server";
import { eq as eq23, and as and14, gte as gte7, lte as lte7, isNotNull as isNotNull2 } from "drizzle-orm";
var auditDataRouter = router({
  list: protectedProcedure.input(z24.object({
    dateFrom: z24.string(),
    // YYYY-MM-DD
    dateTo: z24.string(),
    tipo: z24.enum(["todos", "custo", "receita"]).default("todos"),
    categoria: z24.string().optional(),
    localId: z24.number().optional()
  })).query(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError14({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
    }
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    const rows = [];
    const allLocations = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
    const locMap = {};
    for (const l of allLocations) locMap[l.id] = l.name;
    const locName = (id) => id ? locMap[id] ?? `Local #${id}` : null;
    const matchLocal = (locId) => !input.localId || locId === input.localId;
    const matchCat = (cat) => !input.categoria || input.categoria === cat;
    if (input.tipo === "todos" || input.tipo === "custo") {
      const att = await db.select({
        id: collaboratorAttendance.id,
        date: collaboratorAttendance.date,
        dailyValue: collaboratorAttendance.dailyValue,
        workLocationId: collaboratorAttendance.workLocationId,
        employmentTypeCa: collaboratorAttendance.employmentTypeCa,
        observations: collaboratorAttendance.observations,
        activity: collaboratorAttendance.activity,
        collaboratorName: collaborators.name
      }).from(collaboratorAttendance).leftJoin(collaborators, eq23(collaboratorAttendance.collaboratorId, collaborators.id)).where(and14(gte7(collaboratorAttendance.date, dateFrom), lte7(collaboratorAttendance.date, dateTo)));
      for (const r of att) {
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "M\xE3o de Obra";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `att-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: r.employmentTypeCa === "terceirizado" ? "Terceirizado" : r.employmentTypeCa === "diarista" ? "Diarista" : "CLT",
          descricao: `Di\xE1ria \u2014 ${r.collaboratorName ?? "Colaborador"}${r.activity ? ` | ${r.activity}` : ""}`,
          valor: parseFloat(r.dailyValue || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "collaborator_attendance",
          origem_campo: "daily_value",
          origem_id: r.id,
          registradoPor: null,
          observacoes: r.observations ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const vf = await db.select({
        id: vehicleRecords.id,
        date: vehicleRecords.date,
        fuelCost: vehicleRecords.fuelCost,
        liters: vehicleRecords.liters,
        supplier: vehicleRecords.supplier,
        workLocationId: vehicleRecords.workLocationId,
        serviceType: vehicleRecords.serviceType,
        equipName: equipment.name,
        notes: vehicleRecords.notes
      }).from(vehicleRecords).leftJoin(equipment, eq23(vehicleRecords.equipmentId, equipment.id)).where(and14(
        eq23(vehicleRecords.recordType, "abastecimento"),
        gte7(vehicleRecords.date, dateFrom),
        lte7(vehicleRecords.date, dateTo)
      ));
      for (const r of vf) {
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "Combust\xEDvel";
        if (!matchCat(cat)) continue;
        const sub = r.serviceType === "terceirizado" ? "Ve\xEDculo Terceirizado" : "Ve\xEDculo Pr\xF3prio";
        rows.push({
          id: `vf-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: sub,
          descricao: `Abastecimento \u2014 ${r.equipName ?? "Ve\xEDculo"} | ${r.liters ?? "?"}L${r.supplier ? ` @ ${r.supplier}` : ""}`,
          valor: parseFloat(r.fuelCost || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "vehicle_records",
          origem_campo: "fuel_cost [recordType=abastecimento]",
          origem_id: r.id,
          registradoPor: null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const vm = await db.select({
        id: vehicleRecords.id,
        date: vehicleRecords.date,
        maintenanceCost: vehicleRecords.maintenanceCost,
        maintenanceType: vehicleRecords.maintenanceType,
        workLocationId: vehicleRecords.workLocationId,
        equipName: equipment.name,
        notes: vehicleRecords.notes
      }).from(vehicleRecords).leftJoin(equipment, eq23(vehicleRecords.equipmentId, equipment.id)).where(and14(
        eq23(vehicleRecords.recordType, "manutencao"),
        gte7(vehicleRecords.date, dateFrom),
        lte7(vehicleRecords.date, dateTo)
      ));
      for (const r of vm) {
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "Manuten\xE7\xE3o";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `vm-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: "Ve\xEDculo",
          descricao: `Manuten\xE7\xE3o \u2014 ${r.equipName ?? "Ve\xEDculo"} | ${r.maintenanceType ?? "Tipo n\xE3o informado"}`,
          valor: parseFloat(r.maintenanceCost || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "vehicle_records",
          origem_campo: "maintenance_cost [recordType=manutencao]",
          origem_id: r.id,
          registradoPor: null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const mf = await db.select({
        id: fuelRecords.id,
        date: fuelRecords.date,
        totalValue: fuelRecords.totalValue,
        liters: fuelRecords.liters,
        station: fuelRecords.station,
        workLocationId: fuelRecords.workLocationId,
        equipName: equipment.name
      }).from(fuelRecords).leftJoin(equipment, eq23(fuelRecords.equipmentId, equipment.id)).where(and14(gte7(fuelRecords.date, dateFrom), lte7(fuelRecords.date, dateTo)));
      for (const r of mf) {
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "Combust\xEDvel";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `mf-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: "M\xE1quina/Motosserra",
          descricao: `Abastecimento \u2014 ${r.equipName ?? "M\xE1quina"} | ${r.liters ?? "?"}L${r.station ? ` @ ${r.station}` : ""}`,
          valor: parseFloat(r.totalValue || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "fuel_records",
          origem_campo: "total_value",
          origem_id: r.id,
          registradoPor: null,
          observacoes: null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const mm = await db.select({
        id: machineMaintenance.id,
        date: machineMaintenance.date,
        totalCost: machineMaintenance.totalCost,
        type: machineMaintenance.type,
        serviceType: machineMaintenance.serviceType,
        description: machineMaintenance.description,
        equipName: equipment.name
      }).from(machineMaintenance).leftJoin(equipment, eq23(machineMaintenance.equipmentId, equipment.id)).where(and14(gte7(machineMaintenance.date, dateFrom), lte7(machineMaintenance.date, dateTo)));
      for (const r of mm) {
        const cat = "Manuten\xE7\xE3o";
        if (!matchLocal(null)) continue;
        if (!matchCat(cat)) continue;
        rows.push({
          id: `mm-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: `M\xE1quina (${r.serviceType === "terceirizado" ? "Terceirizado" : "Pr\xF3prio"})`,
          descricao: `Manuten\xE7\xE3o ${r.type ?? ""} \u2014 ${r.equipName ?? "M\xE1quina"}${r.description ? ` | ${r.description}` : ""}`,
          valor: parseFloat(r.totalCost || "0"),
          localId: null,
          localNome: null,
          origem_tabela: "machine_maintenance",
          origem_campo: "total_cost",
          origem_id: r.id,
          registradoPor: null,
          observacoes: null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const ee = await db.select({
        id: extraExpenses.id,
        date: extraExpenses.date,
        amount: extraExpenses.amount,
        category: extraExpenses.category,
        description: extraExpenses.description,
        workLocationId: extraExpenses.workLocationId,
        registeredByName: extraExpenses.registeredByName,
        notes: extraExpenses.notes
      }).from(extraExpenses).where(and14(gte7(extraExpenses.date, dateFrom), lte7(extraExpenses.date, dateTo)));
      const catLabels = {
        abastecimento: "Combust\xEDvel",
        refeicao: "Alimenta\xE7\xE3o",
        compra_material: "Material",
        servico_terceiro: "Servi\xE7o Terceiro",
        pedagio: "Ped\xE1gio/Transporte",
        outro: "Outro"
      };
      for (const r of ee) {
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "Despesa Extra";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `ee-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: catLabels[r.category ?? "outro"] ?? r.category ?? "Outro",
          descricao: r.description ?? "Despesa extra",
          valor: parseFloat(r.amount || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "extra_expenses",
          origem_campo: "amount",
          origem_id: r.id,
          registradoPor: r.registeredByName ?? null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const tpf = await db.select({
        id: thirdPartyFuel.id,
        date: thirdPartyFuel.date,
        total: thirdPartyFuel.total,
        liters: thirdPartyFuel.liters,
        location: thirdPartyFuel.location,
        notes: thirdPartyFuel.notes,
        equipName: equipment.name
      }).from(thirdPartyFuel).leftJoin(equipment, eq23(thirdPartyFuel.equipmentId, equipment.id)).where(and14(gte7(thirdPartyFuel.date, dateFrom), lte7(thirdPartyFuel.date, dateTo)));
      for (const r of tpf) {
        if (input.localId) continue;
        const cat = "Combust\xEDvel";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `tpf-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: "Caminh\xE3o Terceirizado",
          descricao: `Abastecimento terceirizado \u2014 ${r.equipName ?? "Caminh\xE3o"} | ${r.liters ?? "?"}L${r.location ? ` @ ${r.location}` : ""}`,
          valor: parseFloat(r.total || "0"),
          localId: null,
          localNome: null,
          origem_tabela: "third_party_fuel",
          origem_campo: "total",
          origem_id: r.id,
          registradoPor: null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const ct = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        thirdPartyCost: cargoLoads.thirdPartyCost,
        thirdPartyContractor: cargoLoads.thirdPartyContractor,
        workLocationId: cargoLoads.workLocationId,
        destination: cargoLoads.destination
      }).from(cargoLoads).where(and14(
        gte7(cargoLoads.date, dateFrom),
        lte7(cargoLoads.date, dateTo),
        isNotNull2(cargoLoads.thirdPartyContractor)
      ));
      for (const r of ct) {
        if (!r.thirdPartyContractor || r.thirdPartyContractor.trim() === "") continue;
        const locId = r.workLocationId ?? null;
        if (!matchLocal(locId)) continue;
        const cat = "Corte Terceirizado";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `ct-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: r.thirdPartyContractor,
          descricao: `Corte terceirizado \u2014 Carga #${r.id} | Destino: ${r.destination ?? "N/A"}`,
          valor: parseFloat(r.thirdPartyCost || "0"),
          localId: locId,
          localNome: locName(locId),
          origem_tabela: "cargo_loads",
          origem_campo: "third_party_cost",
          origem_id: r.id,
          registradoPor: null,
          observacoes: null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "custo") {
      const ft = await db.select({
        id: financialEntries.id,
        date: financialEntries.date,
        amount: financialEntries.amount,
        description: financialEntries.description,
        category: financialEntries.category,
        registeredByName: financialEntries.registeredByName,
        notes: financialEntries.notes
      }).from(financialEntries).where(and14(
        eq23(financialEntries.type, "despesa"),
        gte7(financialEntries.date, dateFrom),
        lte7(financialEntries.date, dateTo)
      ));
      const catMap = {
        folha_pagamento: "M\xE3o de Obra",
        combustivel: "Combust\xEDvel",
        manutencao: "Manuten\xE7\xE3o",
        material: "Material",
        alimentacao: "Alimenta\xE7\xE3o",
        transporte: "Transporte",
        impostos: "Impostos",
        aluguel: "Aluguel",
        servico_terceiro: "Servi\xE7o Terceiro",
        outro_despesa: "Outro",
        frete_terceirizado: "Frete Terceirizado",
        servico_corte: "Corte Terceirizado"
      };
      for (const r of ft) {
        if (input.localId) continue;
        const cat = catMap[r.category] ?? r.category ?? "Despesa";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `fe-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "custo",
          categoria: cat,
          subcategoria: `financial_entries.category = '${r.category}'`,
          descricao: r.description ?? "Despesa financeira",
          valor: parseFloat(r.amount || "0"),
          localId: null,
          localNome: null,
          origem_tabela: "financial_entries",
          origem_campo: "amount [type=despesa]",
          origem_id: r.id,
          registradoPor: r.registeredByName ?? null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "receita") {
      const bp = await db.select({
        id: buyerPayments.id,
        paymentDate: buyerPayments.paymentDate,
        amount: buyerPayments.amount,
        buyerName: buyerClients.name,
        invoiceNumber: buyerPayments.invoiceNumber,
        notes: buyerPayments.notes
      }).from(buyerPayments).leftJoin(buyerClients, eq23(buyerPayments.buyerId, buyerClients.id)).where(and14(
        eq23(buyerPayments.status, "pago"),
        gte7(buyerPayments.paymentDate, input.dateFrom),
        lte7(buyerPayments.paymentDate, input.dateTo)
      ));
      for (const r of bp) {
        if (input.localId) continue;
        const cat = "Receita \u2014 Venda de Madeira";
        if (!matchCat(cat)) continue;
        rows.push({
          id: `bp-${r.id}`,
          date: r.paymentDate?.slice(0, 10) ?? "",
          tipo: "receita",
          categoria: cat,
          subcategoria: r.buyerName ?? "Comprador",
          descricao: `Pagamento \u2014 ${r.buyerName ?? "Comprador"}${r.invoiceNumber ? ` | NF: ${r.invoiceNumber}` : ""}`,
          valor: parseFloat(r.amount || "0"),
          localId: null,
          localNome: null,
          origem_tabela: "buyer_payments",
          origem_campo: "amount [status=pago]",
          origem_id: r.id,
          registradoPor: null,
          observacoes: r.notes ?? null
        });
      }
    }
    if (input.tipo === "todos" || input.tipo === "receita") {
      const fr = await db.select({
        id: financialEntries.id,
        date: financialEntries.date,
        amount: financialEntries.amount,
        description: financialEntries.description,
        category: financialEntries.category,
        clientName: financialEntries.clientName,
        autoGenerated: financialEntries.autoGenerated,
        registeredByName: financialEntries.registeredByName,
        notes: financialEntries.notes
      }).from(financialEntries).where(and14(
        eq23(financialEntries.type, "receita"),
        gte7(financialEntries.date, dateFrom),
        lte7(financialEntries.date, dateTo)
      ));
      const catMap = {
        venda_madeira: "Receita \u2014 Venda de Madeira",
        servico_corte: "Receita \u2014 Servi\xE7o de Corte",
        servico_plantio: "Receita \u2014 Servi\xE7o de Plantio",
        servico_transporte: "Receita \u2014 Servi\xE7o de Transporte",
        servico_consultoria: "Receita \u2014 Consultoria",
        outro_receita: "Receita \u2014 Outro"
      };
      for (const r of fr) {
        if (input.localId) continue;
        const cat = catMap[r.category] ?? `Receita \u2014 ${r.category ?? "Outro"}`;
        if (!matchCat(cat)) continue;
        rows.push({
          id: `fr-${r.id}`,
          date: r.date.slice(0, 10),
          tipo: "receita",
          categoria: cat,
          subcategoria: r.autoGenerated ? `Auto-gerado | ${r.clientName ?? ""}` : `Manual | ${r.clientName ?? ""}`,
          descricao: r.description ?? "Receita financeira",
          valor: parseFloat(r.amount || "0"),
          localId: null,
          localNome: null,
          origem_tabela: "financial_entries",
          origem_campo: `amount [type=receita, auto_generated=${r.autoGenerated ?? 0}]`,
          origem_id: r.id,
          registradoPor: r.registeredByName ?? null,
          observacoes: r.notes ?? null
        });
      }
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    const totalCusto = rows.filter((r) => r.tipo === "custo").reduce((s, r) => s + r.valor, 0);
    const totalReceita = rows.filter((r) => r.tipo === "receita").reduce((s, r) => s + r.valor, 0);
    const byCat = {};
    for (const r of rows) {
      if (!byCat[r.categoria]) byCat[r.categoria] = { tipo: r.tipo, total: 0, qtd: 0 };
      byCat[r.categoria].total += r.valor;
      byCat[r.categoria].qtd += 1;
    }
    return {
      rows,
      summary: {
        totalCusto,
        totalReceita,
        lucro: totalReceita - totalCusto,
        totalRegistros: rows.length,
        byCat: Object.entries(byCat).map(([cat, v]) => ({ categoria: cat, ...v })).sort((a, b) => b.total - a.total)
      }
    };
  })
});

// server/routers/reportPdf.ts
init_trpc();
init_db();
init_schema();
import { z as z25 } from "zod";
import { TRPCError as TRPCError15 } from "@trpc/server";
import { eq as eq24, desc as desc19, and as and15, gte as gte8, lte as lte8 } from "drizzle-orm";
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(d) {
  return new Date(d).toLocaleDateString("pt-BR");
}
var BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
var KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
var BTREE_SITE = "btreeambiental.com";
var BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";
function generatePdfHtml(data, locationName, periodo, sections) {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; font-size: 11px; }
      .page { padding: 20px 30px; }
      .header { background: linear-gradient(135deg, #0d4f2e, #1a7a47); color: white; padding: 20px 25px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 18px; }
      .header img { height: 50px; }
      .header-content { flex: 1; }
      .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .header p { font-size: 12px; opacity: 0.9; }
      .header .meta { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; opacity: 0.85; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .summary-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; text-align: center; }
      .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
      .summary-card .value.red { color: #dc3545; }
      .summary-card .value.blue { color: #0d6efd; }
      .summary-card .value.amber { color: #d97706; }
      .summary-card .value.green { color: #198754; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 13px; font-weight: 700; color: #0d4f2e; border-bottom: 2px solid #0d4f2e; padding-bottom: 4px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #f1f3f5; color: #495057; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #dee2e6; }
      td { padding: 5px 8px; border-bottom: 1px solid #e9ecef; }
      tr:nth-child(even) { background: #f8f9fa; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: 700; }
      .total-row { background: #e8f5e9 !important; font-weight: 700; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
      .badge-clt { background: #dbeafe; color: #1d4ed8; }
      .badge-terceirizado { background: #ede9fe; color: #7c3aed; }
      .badge-diarista { background: #fef3c7; color: #d97706; }
      .badge-pago { background: #d1fae5; color: #059669; }
      .badge-pendente { background: #fee2e2; color: #dc2626; }
      .footer { margin-top: 24px; padding: 14px 24px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
      .footer-left { display: flex; align-items: center; gap: 10px; }
      .footer-left img.kobayashi { height: 28px; }
      .footer-text { font-size: 10px; color: #555; }
      .footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
      .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .footer-right img { width: 60px; height: 60px; }
      .footer-right span { font-size: 9px; color: #555; }
      @media print { .page { padding: 10px; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  `;
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body><div class="page">`;
  html += `
    <div class="header">
      <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
      <div class="header-content">
        <h1>BTREE Ambiental \u2014 Relat\xF3rio de Opera\xE7\xE3o</h1>
        <p>${locationName}</p>
        <div class="meta">
          <span>Per\xEDodo: ${periodo}</span>
          <span>Gerado em: ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")} ${(/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>
    </div>
  `;
  html += `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Custo Total</div>
        <div class="value red">${formatCurrency(data.resumo.custoTotal)}</div>
      </div>
      <div class="summary-card">
        <div class="label">M\xE3o de Obra</div>
        <div class="value blue">${formatCurrency(data.resumo.totalMaoDeObra)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Consumo</div>
        <div class="value amber">${formatCurrency(data.resumo.totalConsumo)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Cargas</div>
        <div class="value green">${data.resumo.totalCargas} (${data.resumo.totalVolumeM3.toFixed(1)}m\xB3)</div>
      </div>
    </div>
  `;
  if (sections.maoDeObra && data.maoDeObra.registros.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">M\xE3o de Obra \u2014 ${data.maoDeObra.totalDias} registros</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Colaborador</th>
              <th>Atividade</th>
              <th>V\xEDnculo</th>
              <th class="text-right">Valor</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.maoDeObra.registros) {
      const empBadge = r.employmentType === "clt" ? "badge-clt" : r.employmentType === "terceirizado" ? "badge-terceirizado" : "badge-diarista";
      const empLabel = r.employmentType === "clt" ? "CLT" : r.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
      const payBadge = r.paymentStatus === "pago" ? "badge-pago" : "badge-pendente";
      const payLabel = r.paymentStatus === "pago" ? "Pago" : "Pendente";
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.collaboratorName}</td>
          <td>${r.activity || "\u2014"}</td>
          <td><span class="badge ${empBadge}">${empLabel}</span></td>
          <td class="text-right">${formatCurrency(parseFloat(r.dailyValue || "0"))}</td>
          <td class="text-center"><span class="badge ${payBadge}">${payLabel}</span></td>
        </tr>
      `;
    }
    html += `
        <tr class="total-row">
          <td colspan="4">Total M\xE3o de Obra</td>
          <td class="text-right">${formatCurrency(data.maoDeObra.totalValor)}</td>
          <td class="text-center">${data.maoDeObra.pendentes} pend. / ${data.maoDeObra.pagos} pagos</td>
        </tr>
      </tbody></table></div>
    `;
  }
  if (sections.consumo && data.consumo.veiculos.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Combust\xEDvel \u2014 Ve\xEDculos (${data.consumo.veiculos.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ve\xEDculo</th>
              <th>Tipo</th>
              <th class="text-right">Litros</th>
              <th class="text-right">R$/L</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.veiculos) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.equipmentName} ${r.equipmentPlate ? `(${r.equipmentPlate})` : ""}</td>
          <td style="text-transform:capitalize">${r.fuelType}</td>
          <td class="text-right">${parseFloat(r.liters || "0").toFixed(1)}L</td>
          <td class="text-right">${formatCurrency(parseFloat(r.pricePerLiter || "0"))}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.totalValue || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }
  if (sections.consumo && data.consumo.maquinas.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Combust\xEDvel \u2014 M\xE1quinas (${data.consumo.maquinas.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>M\xE1quina</th>
              <th>Tipo</th>
              <th class="text-right">Litros</th>
              <th class="text-right">R$/L</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.maquinas) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.equipmentName}</td>
          <td style="text-transform:capitalize">${r.fuelType}</td>
          <td class="text-right">${parseFloat(r.liters || "0").toFixed(1)}L</td>
          <td class="text-right">${formatCurrency(parseFloat(r.pricePerLiter || "0"))}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.totalValue || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }
  if (sections.consumo && data.consumo.despesasExtras.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Despesas Extras (${data.consumo.despesasExtras.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descri\xE7\xE3o</th>
              <th>Pagamento</th>
              <th class="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.despesasExtras) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td style="text-transform:capitalize">${r.category || "\u2014"}</td>
          <td>${r.description || "\u2014"}</td>
          <td style="text-transform:capitalize">${r.paymentMethod || "\u2014"}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.amount || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }
  if (sections.cargas && data.cargas.registros.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Cargas (${data.cargas.totalCargas} registros \u2014 ${data.cargas.totalVolumeM3.toFixed(1)}m\xB3)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Motorista</th>
              <th>Placa</th>
              <th>Madeira</th>
              <th class="text-right">Volume (m\xB3)</th>
              <th>Destino</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.cargas.registros) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.driverName || "\u2014"}</td>
          <td>${r.vehiclePlate || "\u2014"}</td>
          <td style="text-transform:capitalize">${r.woodType || "\u2014"}</td>
          <td class="text-right">${parseFloat(r.volumeM3 || "0").toFixed(2)}</td>
          <td>${r.destination || "\u2014"}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }
  html += `
    <div class="footer">
      <div class="footer-left">
        <img class="kobayashi" src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
        <div class="footer-text">
          Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
          <a href="https://${BTREE_SITE}">${BTREE_SITE}</a>
        </div>
      </div>
      <div class="footer-right">
        <img src="${BTREE_QR}" alt="QR Code" />
        <span>Acesse nosso site</span>
      </div>
    </div>
    <script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
  </div></body></html>`;
  return html;
}
var reportPdfRouter = router({
  generatePdfHtml: protectedProcedure.input(z25.object({
    locationId: z25.number().optional(),
    dateFrom: z25.string(),
    dateTo: z25.string(),
    includeMaoDeObra: z25.boolean().default(true),
    includeConsumo: z25.boolean().default(true),
    includeCargas: z25.boolean().default(true)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError15({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    let locationName = "Todos os Locais";
    if (input.locationId) {
      const loc = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq24(gpsLocations.id, input.locationId));
      if (loc.length > 0) locationName = loc[0].name;
    }
    let maoDeObra = [];
    if (input.includeMaoDeObra) {
      maoDeObra = await db.select({
        id: collaboratorAttendance.id,
        collaboratorName: collaborators.name,
        date: collaboratorAttendance.date,
        employmentType: collaboratorAttendance.employmentTypeCa,
        dailyValue: collaboratorAttendance.dailyValue,
        activity: collaboratorAttendance.activity,
        paymentStatus: collaboratorAttendance.paymentStatusCa
      }).from(collaboratorAttendance).innerJoin(collaborators, eq24(collaboratorAttendance.collaboratorId, collaborators.id)).where(and15(
        gte8(collaboratorAttendance.date, dateFrom),
        lte8(collaboratorAttendance.date, dateTo),
        ...input.locationId ? [eq24(collaboratorAttendance.workLocationId, input.locationId)] : []
      )).orderBy(desc19(collaboratorAttendance.date));
    }
    let consumoVeiculos = [];
    if (input.includeConsumo) {
      consumoVeiculos = await db.select({
        id: fuelRecords.id,
        date: fuelRecords.date,
        equipmentName: equipment.name,
        equipmentPlate: equipment.licensePlate,
        fuelType: fuelRecords.fuelType,
        liters: fuelRecords.liters,
        totalValue: fuelRecords.totalValue,
        pricePerLiter: fuelRecords.pricePerLiter
      }).from(fuelRecords).innerJoin(equipment, eq24(fuelRecords.equipmentId, equipment.id)).where(and15(
        gte8(fuelRecords.date, dateFrom),
        lte8(fuelRecords.date, dateTo),
        ...input.locationId ? [eq24(fuelRecords.workLocationId, input.locationId)] : []
      )).orderBy(desc19(fuelRecords.date));
    }
    let consumoMaquinas = [];
    if (input.includeConsumo) {
      consumoMaquinas = await db.select({
        id: machineFuel.id,
        date: machineFuel.date,
        equipmentName: equipment.name,
        fuelType: machineFuel.fuelType,
        liters: machineFuel.liters,
        totalValue: machineFuel.totalValue,
        pricePerLiter: machineFuel.pricePerLiter
      }).from(machineFuel).innerJoin(equipment, eq24(machineFuel.equipmentId, equipment.id)).where(and15(
        gte8(machineFuel.date, dateFrom),
        lte8(machineFuel.date, dateTo),
        ...input.locationId ? [eq24(machineFuel.workLocationId, input.locationId)] : []
      )).orderBy(desc19(machineFuel.date));
    }
    let despesasExtras = [];
    if (input.includeConsumo) {
      despesasExtras = await db.select({
        id: extraExpenses.id,
        date: extraExpenses.date,
        category: extraExpenses.category,
        description: extraExpenses.description,
        amount: extraExpenses.amount,
        paymentMethod: extraExpenses.paymentMethod
      }).from(extraExpenses).where(and15(
        gte8(extraExpenses.date, dateFrom),
        lte8(extraExpenses.date, dateTo),
        ...input.locationId ? [eq24(extraExpenses.workLocationId, input.locationId)] : []
      )).orderBy(desc19(extraExpenses.date));
    }
    let cargas = [];
    if (input.includeCargas) {
      cargas = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        vehiclePlate: cargoLoads.vehiclePlate,
        driverName: cargoLoads.driverName,
        volumeM3: cargoLoads.volumeM3,
        woodType: cargoLoads.woodType,
        destination: cargoLoads.destination
      }).from(cargoLoads).where(and15(
        gte8(cargoLoads.date, dateFrom),
        lte8(cargoLoads.date, dateTo),
        ...input.locationId ? [eq24(cargoLoads.workLocationId, input.locationId)] : []
      )).orderBy(desc19(cargoLoads.date));
    }
    const totalMaoDeObra = maoDeObra.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
    const totalCombV = consumoVeiculos.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
    const totalCombM = consumoMaquinas.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
    const totalDespesas = despesasExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    const totalVolume = cargas.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);
    const reportData = {
      maoDeObra: {
        registros: maoDeObra,
        totalDias: maoDeObra.length,
        totalValor: totalMaoDeObra,
        pendentes: maoDeObra.filter((r) => r.paymentStatus === "pendente").length,
        pagos: maoDeObra.filter((r) => r.paymentStatus === "pago").length
      },
      consumo: {
        veiculos: consumoVeiculos,
        maquinas: consumoMaquinas,
        despesasExtras,
        totalConsumo: totalCombV + totalCombM + totalDespesas
      },
      cargas: {
        registros: cargas,
        totalCargas: cargas.length,
        totalVolumeM3: totalVolume
      },
      resumo: {
        custoTotal: totalMaoDeObra + totalCombV + totalCombM + totalDespesas,
        totalMaoDeObra,
        totalConsumo: totalCombV + totalCombM + totalDespesas,
        totalCargas: cargas.length,
        totalVolumeM3: totalVolume
      }
    };
    const periodo = `${new Date(input.dateFrom).toLocaleDateString("pt-BR")} a ${new Date(input.dateTo).toLocaleDateString("pt-BR")}`;
    const htmlContent = generatePdfHtml(reportData, locationName, periodo, {
      maoDeObra: input.includeMaoDeObra,
      consumo: input.includeConsumo,
      cargas: input.includeCargas
    });
    return { html: htmlContent };
  })
});

// server/routers/buyerClients.ts
init_trpc();
init_db();
init_schema();
import { z as z26 } from "zod";
import { TRPCError as TRPCError16 } from "@trpc/server";
import { eq as eq25, desc as desc20, sql as sql14, and as and16 } from "drizzle-orm";
function destToBuyer(d) {
  return {
    id: d.id,
    name: d.name,
    cnpjCpf: d.cnpjCpf,
    inscricaoEstadual: d.inscricaoEstadual,
    phone: d.phone,
    email: d.email,
    address: d.address,
    city: d.city,
    state: d.state,
    cep: d.cep,
    contactPerson: d.contactPerson,
    product: d.product,
    paymentMethod: d.paymentMethod,
    // pricePerUnit: use price_per_unit if set, otherwise derive from price_per_ton/m3
    pricePerUnit: d.pricePerUnit ?? (d.priceType === "m3" ? d.pricePerM3 : d.pricePerTon),
    unit: d.unit ?? (d.priceType === "m3" ? "m3" : "ton"),
    notes: d.notes,
    active: d.active,
    isBuyer: d.isBuyer,
    // 0 = destino normal, 1 = comprador
    // Extra destination fields
    pricePerTon: d.pricePerTon,
    pricePerM3: d.pricePerM3,
    priceType: d.priceType
  };
}
var buyerClientsRouter = router({
  // list: retorna TODOS os destinos (is_buyer ou não) — tela unificada
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(cargoDestinations).orderBy(desc20(cargoDestinations.id));
    return rows.map(destToBuyer);
  }),
  // listActive: retorna todos os destinos ativos (para seleção em cargas, relatórios, etc.)
  listActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(cargoDestinations).where(eq25(cargoDestinations.active, 1)).orderBy(cargoDestinations.name);
    return rows.map(destToBuyer);
  }),
  getById: protectedProcedure.input(z26.object({ id: z26.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const [dest] = await db.select().from(cargoDestinations).where(eq25(cargoDestinations.id, input.id));
    if (!dest) throw new TRPCError16({ code: "NOT_FOUND" });
    const prices = await db.select().from(buyerPriceHistory).where(eq25(buyerPriceHistory.buyerId, input.id)).orderBy(desc20(buyerPriceHistory.id));
    const payments = await db.select().from(buyerPayments).where(eq25(buyerPayments.buyerId, input.id)).orderBy(desc20(buyerPayments.id));
    return { ...destToBuyer(dest), prices, payments };
  }),
  create: protectedProcedure.input(z26.object({
    name: z26.string().min(1),
    cnpjCpf: z26.string().optional(),
    inscricaoEstadual: z26.string().optional(),
    phone: z26.string().optional(),
    email: z26.string().optional(),
    address: z26.string().optional(),
    city: z26.string().optional(),
    state: z26.string().optional(),
    cep: z26.string().optional(),
    contactPerson: z26.string().optional(),
    product: z26.string().optional(),
    paymentMethod: z26.string().optional(),
    pricePerUnit: z26.string().optional(),
    unit: z26.string().optional(),
    notes: z26.string().optional(),
    isBuyer: z26.number().optional()
    // 0 = destino normal, 1 = comprador
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const unit = input.unit || "ton";
    const pricePerTon = unit === "ton" ? input.pricePerUnit || null : null;
    const pricePerM3 = unit === "m3" ? input.pricePerUnit || null : null;
    const priceType = unit === "m3" ? "m3" : "ton";
    const isBuyer = input.isBuyer ?? 0;
    await db.execute(sql14`
        INSERT INTO cargo_destinations 
          (name, address, city, state, notes, is_buyer, cnpj_cpf, inscricao_estadual, phone, email, cep, contact_person, product, payment_method, price_per_unit, unit, price_per_ton, price_per_m3, price_type, created_by, created_at)
        VALUES 
          (${input.name}, ${input.address || null}, ${input.city || null}, ${input.state || null}, ${input.notes || null},
           ${isBuyer}, ${input.cnpjCpf || null}, ${input.inscricaoEstadual || null}, ${input.phone || null}, ${input.email || null},
           ${input.cep || null}, ${input.contactPerson || null}, ${input.product || null}, ${input.paymentMethod || null},
           ${input.pricePerUnit || null}, ${unit}, ${pricePerTon}, ${pricePerM3}, ${priceType}, ${ctx.user.id}, ${now})
      `);
    return { success: true };
  }),
  update: protectedProcedure.input(z26.object({
    id: z26.number(),
    name: z26.string().min(1),
    cnpjCpf: z26.string().optional(),
    inscricaoEstadual: z26.string().optional(),
    phone: z26.string().optional(),
    email: z26.string().optional(),
    address: z26.string().optional(),
    city: z26.string().optional(),
    state: z26.string().optional(),
    cep: z26.string().optional(),
    contactPerson: z26.string().optional(),
    product: z26.string().optional(),
    paymentMethod: z26.string().optional(),
    pricePerUnit: z26.string().optional(),
    unit: z26.string().optional(),
    notes: z26.string().optional(),
    active: z26.number().optional(),
    isBuyer: z26.number().optional()
    // 0 = destino normal, 1 = comprador
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const unit = input.unit || "ton";
    const pricePerTon = unit === "ton" ? input.pricePerUnit || null : null;
    const pricePerM3 = unit === "m3" ? input.pricePerUnit || null : null;
    const priceType = unit === "m3" ? "m3" : "ton";
    await db.update(cargoDestinations).set({
      name: input.name,
      cnpjCpf: input.cnpjCpf || null,
      inscricaoEstadual: input.inscricaoEstadual || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      cep: input.cep || null,
      contactPerson: input.contactPerson || null,
      product: input.product || null,
      paymentMethod: input.paymentMethod || null,
      pricePerUnit: input.pricePerUnit || null,
      unit,
      pricePerTon,
      pricePerM3,
      priceType,
      notes: input.notes || null,
      active: input.active ?? 1,
      ...input.isBuyer !== void 0 ? { isBuyer: input.isBuyer } : {}
    }).where(eq25(cargoDestinations.id, input.id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z26.object({ id: z26.number(), force: z26.boolean().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const loads = await db.execute(sql14`SELECT COUNT(*) as cnt FROM cargo_loads WHERE destination_id = ${input.id}`);
    const loadCount = loads[0]?.[0]?.cnt ?? 0;
    if (loadCount > 0 && !input.force) {
      throw new TRPCError16({
        code: "PRECONDITION_FAILED",
        message: `Este destino possui ${loadCount} carga(s) vinculada(s). Use force=true para excluir mesmo assim (as cargas n\xE3o ser\xE3o apagadas).`
      });
    }
    const payments = await db.execute(sql14`SELECT COUNT(*) as cnt FROM buyer_payments WHERE buyer_id = ${input.id}`);
    const payCount = payments[0]?.[0]?.cnt ?? 0;
    if (payCount > 0 && !input.force) {
      throw new TRPCError16({
        code: "PRECONDITION_FAILED",
        message: `Este comprador possui ${payCount} pagamento(s) vinculado(s). Use force=true para excluir mesmo assim.`
      });
    }
    await db.execute(sql14`DELETE FROM cargo_destinations WHERE id = ${input.id}`);
    return { success: true, loadCount, payCount };
  }),
  // === PREÇOS ===
  addPrice: protectedProcedure.input(z26.object({
    buyerId: z26.number(),
    product: z26.string().min(1),
    pricePerUnit: z26.string().min(1),
    unit: z26.string().optional(),
    validFrom: z26.string().optional(),
    validUntil: z26.string().optional(),
    notes: z26.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(sql14`
        INSERT INTO buyer_price_history (buyer_id, product, price_per_unit, unit, valid_from, valid_until, notes, created_at)
        VALUES (${input.buyerId}, ${input.product}, ${input.pricePerUnit}, ${input.unit || "ton"}, ${input.validFrom || null}, ${input.validUntil || null}, ${input.notes || null}, ${now})
      `);
    return { success: true };
  }),
  deletePrice: protectedProcedure.input(z26.object({ id: z26.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(buyerPriceHistory).where(eq25(buyerPriceHistory.id, input.id));
    return { success: true };
  }),
  // === PAGAMENTOS ===
  addPayment: protectedProcedure.input(z26.object({
    buyerId: z26.number(),
    amount: z26.string().min(1),
    paymentDate: z26.string().min(1),
    paymentMethod: z26.string().optional(),
    invoiceNumber: z26.string().optional(),
    notes: z26.string().optional(),
    status: z26.enum(["pendente", "pago", "atrasado"]).optional(),
    // Campos extras para integração com financeiro
    destinationName: z26.string().optional(),
    createFinancialEntry: z26.boolean().optional(),
    // se true, cria receita no financeiro
    periodDescription: z26.string().optional()
    // ex: "Mai/2026"
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(sql14`
        INSERT INTO buyer_payments (buyer_id, amount, payment_date, payment_method, invoice_number, notes, status, created_at)
        VALUES (${input.buyerId}, ${input.amount}, ${input.paymentDate}, ${input.paymentMethod || null}, ${input.invoiceNumber || null}, ${input.notes || null}, ${input.status || "pendente"}, ${now})
      `);
    if (input.createFinancialEntry && input.status === "pago") {
      const dateObj = new Date(input.paymentDate);
      const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const destName = input.destinationName || "Destino";
      const period = input.periodDescription || "";
      const description = `Recebimento \u2014 ${destName}${period ? ` (${period})` : ""}`;
      const pmMap = {
        pix: "pix",
        transferencia: "transferencia",
        boleto: "boleto",
        dinheiro: "dinheiro",
        cartao: "cartao",
        cheque: "cheque"
      };
      const pm = pmMap[input.paymentMethod || ""] || "pix";
      await db.insert(financialEntries).values({
        type: "receita",
        category: "venda_madeira",
        description,
        amount: input.amount,
        date: dateObj.toISOString().slice(0, 10).replace("T", " "),
        referenceMonth: refMonth,
        paymentMethod: pm,
        status: "confirmado",
        clientName: destName,
        notes: input.notes || null,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
        autoGenerated: 1
      });
    }
    return { success: true };
  }),
  updatePaymentStatus: protectedProcedure.input(z26.object({
    id: z26.number(),
    status: z26.enum(["pendente", "pago", "atrasado"])
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(buyerPayments).set({ status: input.status }).where(eq25(buyerPayments.id, input.id));
    return { success: true };
  }),
  deletePayment: protectedProcedure.input(z26.object({ id: z26.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(buyerPayments).where(eq25(buyerPayments.id, input.id));
    return { success: true };
  }),
  // === DASHBOARD FINANCEIRO ===
  financialDashboard: protectedProcedure.input(z26.object({
    startDate: z26.string().optional(),
    endDate: z26.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const buyers = await db.select().from(cargoDestinations).where(and16(eq25(cargoDestinations.isBuyer, 1), eq25(cargoDestinations.active, 1))).orderBy(cargoDestinations.name);
    const results = await Promise.all(buyers.map(async (buyer) => {
      const buyerMapped = destToBuyer(buyer);
      const [loadsResult] = await db.execute(sql14`
          SELECT 
            COUNT(*) as total_loads,
            SUM(CAST(REPLACE(COALESCE(cl.weight_net_kg, cl.weight_kg, '0'), ',', '.') AS DECIMAL(15,3))) as total_weight_kg,
            SUM(CAST(REPLACE(COALESCE(cl.volume_m3, '0'), ',', '.') AS DECIMAL(15,3))) as total_volume_m3
          FROM cargo_loads cl
          WHERE (cl.destination_id = ${buyer.id} OR cl.destination = ${buyer.name})
          ${input.startDate ? sql14`AND cl.date >= ${input.startDate}` : sql14``}
          ${input.endDate ? sql14`AND cl.date <= ${input.endDate + " 23:59:59"}` : sql14``}
        `);
      const loads = Array.isArray(loadsResult) ? loadsResult[0] : loadsResult;
      const totalWeightKg = parseFloat(String(loads?.total_weight_kg || 0)) || 0;
      const totalVolumeM3 = parseFloat(String(loads?.total_volume_m3 || 0)) || 0;
      const totalLoads = parseInt(String(loads?.total_loads || 0)) || 0;
      const pricePerUnit = parseFloat(String(buyerMapped.pricePerUnit || 0).replace(",", ".")) || 0;
      const unit = buyerMapped.unit || "ton";
      const totalQuantity = unit === "ton" ? totalWeightKg / 1e3 : totalVolumeM3;
      const totalReceivable = pricePerUnit * totalQuantity;
      const paymentsResult = await db.execute(sql14`
          SELECT 
            SUM(CAST(REPLACE(amount, ',', '.') AS DECIMAL(15,2))) as total_paid,
            COUNT(*) as payment_count
          FROM buyer_payments
          WHERE buyer_id = ${buyer.id} AND status = 'pago'
          ${input.startDate ? sql14`AND payment_date >= ${input.startDate}` : sql14``}
          ${input.endDate ? sql14`AND payment_date <= ${input.endDate}` : sql14``}
        `);
      const paymentsData = Array.isArray(paymentsResult) ? paymentsResult[0] : paymentsResult;
      const totalPaid = parseFloat(String(paymentsData?.total_paid || 0)) || 0;
      const paymentCount = parseInt(String(paymentsData?.payment_count || 0)) || 0;
      return {
        id: buyer.id,
        name: buyer.name,
        city: buyer.city,
        state: buyer.state,
        phone: buyerMapped.phone,
        email: buyerMapped.email,
        pricePerUnit: buyerMapped.pricePerUnit,
        unit,
        totalLoads,
        totalWeightKg,
        totalVolumeM3,
        totalQuantity,
        totalReceivable,
        totalPaid,
        balance: totalReceivable - totalPaid,
        paymentCount
      };
    }));
    const grandTotalReceivable = results.reduce((s, r) => s + r.totalReceivable, 0);
    const grandTotalPaid = results.reduce((s, r) => s + r.totalPaid, 0);
    const grandBalance = grandTotalReceivable - grandTotalPaid;
    return {
      buyers: results,
      totals: { grandTotalReceivable, grandTotalPaid, grandBalance }
    };
  }),
  getPayments: protectedProcedure.input(z26.object({ buyerId: z26.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError16({ code: "INTERNAL_SERVER_ERROR" });
    const payments = await db.select().from(buyerPayments).where(eq25(buyerPayments.buyerId, input.buyerId)).orderBy(desc20(buyerPayments.id));
    return payments;
  })
});

// server/routers/freight.ts
init_trpc();
init_db();
init_schema();
import { z as z27 } from "zod";
import { TRPCError as TRPCError17 } from "@trpc/server";
import { eq as eq26, sql as sql15 } from "drizzle-orm";
var freightRouter = router({
  list: protectedProcedure.input(z27.object({
    startDate: z27.string().optional(),
    endDate: z27.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    let query = `SELECT * FROM freight_calculations ORDER BY id DESC`;
    if (input?.startDate && input?.endDate) {
      query = `SELECT * FROM freight_calculations WHERE date >= '${input.startDate}' AND date <= '${input.endDate}' ORDER BY id DESC`;
    }
    const [rows] = await db.execute(sql15.raw(query));
    return rows || [];
  }),
  getById: protectedProcedure.input(z27.object({ id: z27.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    const [rows] = await db.execute(sql15`SELECT * FROM freight_calculations WHERE id = ${input.id}`);
    if (!rows || rows.length === 0) throw new TRPCError17({ code: "NOT_FOUND" });
    return rows[0];
  }),
  create: protectedProcedure.input(z27.object({
    cargoLoadId: z27.number().optional(),
    date: z27.string().min(1),
    vehiclePlate: z27.string().optional(),
    driverName: z27.string().optional(),
    driverType: z27.enum(["proprio", "terceirizado"]).optional(),
    origin: z27.string().optional(),
    destination: z27.string().optional(),
    distanceKm: z27.string().optional(),
    fuelLiters: z27.string().optional(),
    fuelCostPerLiter: z27.string().optional(),
    fuelTotalCost: z27.string().optional(),
    driverCost: z27.string().optional(),
    tollCost: z27.string().optional(),
    maintenanceCost: z27.string().optional(),
    otherCosts: z27.string().optional(),
    otherCostsDescription: z27.string().optional(),
    totalCost: z27.string().optional(),
    costPerKm: z27.string().optional(),
    costPerTon: z27.string().optional(),
    weightTon: z27.string().optional(),
    revenuePerTon: z27.string().optional(),
    totalRevenue: z27.string().optional(),
    profit: z27.string().optional(),
    notes: z27.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.execute(sql15`
        INSERT INTO freight_calculations (cargo_load_id, date, vehicle_plate, driver_name, driver_type, origin, destination, distance_km, fuel_liters, fuel_cost_per_liter, fuel_total_cost, driver_cost, toll_cost, maintenance_cost, other_costs, other_costs_description, total_cost, cost_per_km, cost_per_ton, weight_ton, revenue_per_ton, total_revenue, profit, notes, created_by, created_at)
        VALUES (${input.cargoLoadId || null}, ${input.date}, ${input.vehiclePlate || null}, ${input.driverName || null}, ${input.driverType || "proprio"}, ${input.origin || null}, ${input.destination || null}, ${input.distanceKm || null}, ${input.fuelLiters || null}, ${input.fuelCostPerLiter || null}, ${input.fuelTotalCost || null}, ${input.driverCost || null}, ${input.tollCost || null}, ${input.maintenanceCost || null}, ${input.otherCosts || null}, ${input.otherCostsDescription || null}, ${input.totalCost || null}, ${input.costPerKm || null}, ${input.costPerTon || null}, ${input.weightTon || null}, ${input.revenuePerTon || null}, ${input.totalRevenue || null}, ${input.profit || null}, ${input.notes || null}, ${ctx.user.id}, ${now})
      `);
    if (input.totalCost && parseFloat(input.totalCost) > 0) {
      const dateObj = new Date(input.date);
      const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      await db.insert(financialEntries).values({
        type: "despesa",
        category: "Frete",
        description: `Frete ${input.date} - ${input.vehiclePlate || "S/P"} - ${input.origin || ""} \u2192 ${input.destination || ""} - ${input.driverName || ""}`,
        amount: input.totalCost,
        date: dateObj.toISOString().slice(0, 19).replace("T", " "),
        referenceMonth: refMonth,
        paymentMethod: "transferencia",
        status: "pendente",
        cargoLoadId: input.cargoLoadId || null,
        autoGenerated: 1,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name + " (auto)"
      });
    }
    return { success: true };
  }),
  update: protectedProcedure.input(z27.object({
    id: z27.number(),
    cargoLoadId: z27.number().optional(),
    date: z27.string().optional(),
    vehiclePlate: z27.string().optional(),
    driverName: z27.string().optional(),
    driverType: z27.enum(["proprio", "terceirizado"]).optional(),
    origin: z27.string().optional(),
    destination: z27.string().optional(),
    distanceKm: z27.string().optional(),
    fuelLiters: z27.string().optional(),
    fuelCostPerLiter: z27.string().optional(),
    fuelTotalCost: z27.string().optional(),
    driverCost: z27.string().optional(),
    tollCost: z27.string().optional(),
    maintenanceCost: z27.string().optional(),
    otherCosts: z27.string().optional(),
    otherCostsDescription: z27.string().optional(),
    totalCost: z27.string().optional(),
    costPerKm: z27.string().optional(),
    costPerTon: z27.string().optional(),
    weightTon: z27.string().optional(),
    revenuePerTon: z27.string().optional(),
    totalRevenue: z27.string().optional(),
    profit: z27.string().optional(),
    notes: z27.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    await db.update(freightCalculations).set({
      cargoLoadId: data.cargoLoadId || null,
      date: data.date || void 0,
      vehiclePlate: data.vehiclePlate || null,
      driverName: data.driverName || null,
      driverType: data.driverType || "proprio",
      origin: data.origin || null,
      destination: data.destination || null,
      distanceKm: data.distanceKm || null,
      fuelLiters: data.fuelLiters || null,
      fuelCostPerLiter: data.fuelCostPerLiter || null,
      fuelTotalCost: data.fuelTotalCost || null,
      driverCost: data.driverCost || null,
      tollCost: data.tollCost || null,
      maintenanceCost: data.maintenanceCost || null,
      otherCosts: data.otherCosts || null,
      otherCostsDescription: data.otherCostsDescription || null,
      totalCost: data.totalCost || null,
      costPerKm: data.costPerKm || null,
      costPerTon: data.costPerTon || null,
      weightTon: data.weightTon || null,
      revenuePerTon: data.revenuePerTon || null,
      totalRevenue: data.totalRevenue || null,
      profit: data.profit || null,
      notes: data.notes || null
    }).where(eq26(freightCalculations.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z27.object({ id: z27.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(freightCalculations).where(eq26(freightCalculations.id, input.id));
    return { success: true };
  }),
  // Resumo de fretes por período
  summary: protectedProcedure.input(z27.object({
    startDate: z27.string().optional(),
    endDate: z27.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError17({ code: "INTERNAL_SERVER_ERROR" });
    let whereClause = "";
    if (input?.startDate && input?.endDate) {
      whereClause = `WHERE date >= '${input.startDate}' AND date <= '${input.endDate}'`;
    }
    const [rows] = await db.execute(sql15.raw(`
        SELECT 
          COUNT(*) as totalTrips,
          COALESCE(SUM(CAST(total_cost AS DECIMAL(10,2))), 0) as totalCost,
          COALESCE(SUM(CAST(total_revenue AS DECIMAL(10,2))), 0) as totalRevenue,
          COALESCE(SUM(CAST(profit AS DECIMAL(10,2))), 0) as totalProfit,
          COALESCE(SUM(CAST(distance_km AS DECIMAL(10,2))), 0) as totalKm,
          COALESCE(SUM(CAST(fuel_liters AS DECIMAL(10,2))), 0) as totalFuel
        FROM freight_calculations ${whereClause}
      `));
    return rows?.[0] || { totalTrips: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0, totalKm: 0, totalFuel: 0 };
  })
});

// server/routers.ts
init_notifications();

// server/routers/fuelSuppliers.ts
init_trpc();
init_db();
init_schema();
import { z as z28 } from "zod";
import { TRPCError as TRPCError18 } from "@trpc/server";
import { eq as eq27, desc as desc22, and as and17 } from "drizzle-orm";

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/storage.ts
init_env();
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers/fuelSuppliers.ts
var fuelSuppliersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).orderBy(desc22(fuelSuppliers.id));
  }),
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).where(eq27(fuelSuppliers.isActive, 1)).orderBy(fuelSuppliers.name);
  }),
  listActiveByLocation: protectedProcedure.input(z28.object({ locationType: z28.enum(["simflor", "astorga", "postos"]) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).where(and17(
      eq27(fuelSuppliers.isActive, 1),
      eq27(fuelSuppliers.locationType, input.locationType)
    )).orderBy(fuelSuppliers.name);
  }),
  create: protectedProcedure.input(z28.object({
    name: z28.string().min(1),
    tradeName: z28.string().optional(),
    cnpj: z28.string().optional(),
    phone: z28.string().optional(),
    email: z28.string().optional(),
    contactName: z28.string().optional(),
    address: z28.string().optional(),
    city: z28.string().optional(),
    state: z28.string().optional(),
    fuelType: z28.enum(["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
    pricePerLiter: z28.string().min(1),
    locationType: z28.enum(["simflor", "astorga", "postos"]).default("simflor"),
    location: z28.string().optional(),
    workLocationId: z28.number().optional(),
    notes: z28.string().optional(),
    tankCapacity: z28.string().optional(),
    tankAlertThreshold: z28.string().optional(),
    vendorName: z28.string().optional(),
    managerName: z28.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
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
      tankAlertThreshold: input.tankAlertThreshold || "20",
      vendorName: input.vendorName || null,
      managerName: input.managerName || null
    });
    return { success: true };
  }),
  update: protectedProcedure.input(z28.object({
    id: z28.number(),
    name: z28.string().min(1).optional(),
    tradeName: z28.string().nullable().optional(),
    cnpj: z28.string().nullable().optional(),
    phone: z28.string().nullable().optional(),
    email: z28.string().nullable().optional(),
    contactName: z28.string().nullable().optional(),
    address: z28.string().nullable().optional(),
    city: z28.string().nullable().optional(),
    state: z28.string().nullable().optional(),
    fuelType: z28.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
    pricePerLiter: z28.string().optional(),
    locationType: z28.enum(["simflor", "astorga", "postos"]).optional(),
    location: z28.string().nullable().optional(),
    workLocationId: z28.number().nullable().optional(),
    isActive: z28.number().optional(),
    notes: z28.string().nullable().optional(),
    tankCapacity: z28.string().nullable().optional(),
    tankAlertThreshold: z28.string().nullable().optional(),
    vendorName: z28.string().nullable().optional(),
    managerName: z28.string().nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    const updateData = {};
    if (data.name !== void 0) updateData.name = data.name;
    if (data.tradeName !== void 0) updateData.tradeName = data.tradeName;
    if (data.cnpj !== void 0) updateData.cnpj = data.cnpj;
    if (data.phone !== void 0) updateData.phone = data.phone;
    if (data.email !== void 0) updateData.email = data.email;
    if (data.contactName !== void 0) updateData.contactName = data.contactName;
    if (data.address !== void 0) updateData.address = data.address;
    if (data.city !== void 0) updateData.city = data.city;
    if (data.state !== void 0) updateData.state = data.state;
    if (data.fuelType !== void 0) updateData.fuelType = data.fuelType;
    if (data.pricePerLiter !== void 0) updateData.pricePerLiter = data.pricePerLiter;
    if (data.locationType !== void 0) updateData.locationType = data.locationType;
    if (data.location !== void 0) updateData.location = data.location;
    if (data.workLocationId !== void 0) updateData.workLocationId = data.workLocationId;
    if (data.isActive !== void 0) updateData.isActive = data.isActive;
    if (data.notes !== void 0) updateData.notes = data.notes;
    if (data.tankCapacity !== void 0) updateData.tankCapacity = data.tankCapacity;
    if (data.tankAlertThreshold !== void 0) updateData.tankAlertThreshold = data.tankAlertThreshold;
    if (data.vendorName !== void 0) updateData.vendorName = data.vendorName;
    if (data.managerName !== void 0) updateData.managerName = data.managerName;
    if (data.pricePerLiter !== void 0) {
      const [existing] = await db.select({ pricePerLiter: fuelSuppliers.pricePerLiter }).from(fuelSuppliers).where(eq27(fuelSuppliers.id, id));
      if (existing && existing.pricePerLiter !== data.pricePerLiter) {
        await db.insert(fuelPriceHistory).values({
          supplierId: id,
          oldPrice: existing.pricePerLiter,
          newPrice: data.pricePerLiter,
          changedBy: ctx.user?.id || null
        });
      }
    }
    await db.update(fuelSuppliers).set(updateData).where(eq27(fuelSuppliers.id, id));
    return { success: true };
  }),
  priceHistory: protectedProcedure.input(z28.object({ supplierId: z28.number().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    if (input.supplierId) {
      return db.select().from(fuelPriceHistory).where(eq27(fuelPriceHistory.supplierId, input.supplierId)).orderBy(desc22(fuelPriceHistory.changedAt));
    }
    return db.select().from(fuelPriceHistory).orderBy(desc22(fuelPriceHistory.changedAt));
  }),
  fuelReport: protectedProcedure.input(z28.object({
    startDate: z28.string().optional(),
    endDate: z28.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    const { vehicleRecords: vehicleRecords2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { gte: gte11, lte: lte11 } = await import("drizzle-orm");
    let conditions = [eq27(vehicleRecords2.recordType, "abastecimento")];
    if (input.startDate) {
      conditions.push(gte11(vehicleRecords2.date, input.startDate));
    }
    if (input.endDate) {
      conditions.push(lte11(vehicleRecords2.date, input.endDate));
    }
    const records = await db.select().from(vehicleRecords2).where(and17(...conditions)).orderBy(desc22(vehicleRecords2.date));
    return records;
  }),
  delete: protectedProcedure.input(z28.object({ id: z28.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(fuelSuppliers).where(eq27(fuelSuppliers.id, input.id));
    return { success: true };
  }),
  // ===== OCR - LEITURA AUTOMÁTICA DE NF POR FOTO =====
  extractInvoiceFromPhoto: protectedProcedure.input(z28.object({
    photos: z28.array(z28.object({
      base64: z28.string().min(1),
      mimeType: z28.string().default("image/jpeg"),
      label: z28.string().default("nf")
      // "nf" or "boleto"
    })).max(3).default([]),
    photoUrls: z28.array(z28.object({
      url: z28.string().url(),
      label: z28.string().default("nf")
    })).max(3).optional()
  })).mutation(async ({ ctx, input }) => {
    const uploadedPhotos = [];
    if (input.photoUrls && input.photoUrls.length > 0) {
      for (const p of input.photoUrls) {
        uploadedPhotos.push({ label: p.label, url: p.url });
      }
      console.log("[OCR] Using pre-uploaded URLs:", uploadedPhotos.map((p) => p.label).join(", "));
    }
    if (uploadedPhotos.length === 0) {
      for (const photo of input.photos) {
        try {
          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/djob7pxme/image/upload`;
          const cloudRes = await fetch(cloudinaryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: `data:${photo.mimeType};base64,${photo.base64}`,
              upload_preset: "azaconnect",
              folder: "btree-invoices"
            })
          });
          if (cloudRes.ok) {
            const cloudData = await cloudRes.json();
            uploadedPhotos.push({ label: photo.label, url: cloudData.secure_url });
            console.log("[OCR] Cloudinary upload OK for", photo.label, cloudData.secure_url);
          } else {
            const errText = await cloudRes.text().catch(() => "unknown");
            console.warn("[OCR] Cloudinary failed for", photo.label, "status:", cloudRes.status, "body:", errText.substring(0, 200));
            try {
              const buffer = Buffer.from(photo.base64, "base64");
              const ext = photo.mimeType.includes("png") ? "png" : "jpg";
              const randomSuffix = Math.random().toString(36).substring(2, 10);
              const fileKey = `invoices/${photo.label}-${Date.now()}-${randomSuffix}.${ext}`;
              const { url } = await storagePut(fileKey, buffer, photo.mimeType);
              uploadedPhotos.push({ label: photo.label, url });
              console.log("[OCR] S3 fallback OK for", photo.label);
            } catch (s3Err) {
              console.warn("[OCR] Both Cloudinary and S3 upload failed for", photo.label, s3Err?.message);
            }
          }
        } catch (err) {
          console.warn("[OCR] Cloudinary fetch error for", photo.label, err?.message);
          try {
            const buffer = Buffer.from(photo.base64, "base64");
            const ext = photo.mimeType.includes("png") ? "png" : "jpg";
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            const fileKey = `invoices/${photo.label}-${Date.now()}-${randomSuffix}.${ext}`;
            const { url } = await storagePut(fileKey, buffer, photo.mimeType);
            uploadedPhotos.push({ label: photo.label, url });
            console.log("[OCR] S3 fallback OK for", photo.label);
          } catch (s3Err) {
            console.warn("[OCR] Both Cloudinary and S3 upload failed for", photo.label, s3Err?.message);
          }
        }
      }
    }
    if (uploadedPhotos.length === 0) {
      throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR", message: "N\xE3o foi poss\xEDvel fazer upload das fotos. Tente novamente." });
    }
    const imageContents = uploadedPhotos.map((p) => ({
      type: "image_url",
      image_url: { url: p.url, detail: "high" }
    }));
    const photoLabels = uploadedPhotos.map((p) => p.label === "boleto" ? "boleto banc\xE1rio" : "nota fiscal").join(" e ");
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Voc\xEA \xE9 um assistente especializado em extrair dados de notas fiscais e boletos brasileiros.
Analise TODAS as imagens enviadas (pode ser nota fiscal, boleto ou ambos) e extraia os seguintes dados em formato JSON:
- invoiceNumber: n\xFAmero da nota fiscal (apenas n\xFAmeros)
- invoiceDate: data de emiss\xE3o no formato YYYY-MM-DD
- dueDate: data de vencimento no formato YYYY-MM-DD
- totalAmount: valor total (apenas n\xFAmeros com ponto decimal, ex: 17100.00)
- liters: quantidade em litros (apenas n\xFAmeros, se houver)
- pricePerLiter: pre\xE7o por litro (apenas n\xFAmeros com ponto decimal, se houver)
- fuelType: tipo de combust\xEDvel (diesel, gasolina, etanol ou gnv)
- bankName: nome do banco (se for boleto)
- barcodeNumber: linha digit\xE1vel COMPLETA do boleto (todos os n\xFAmeros incluindo pontos e espa\xE7os, se vis\xEDvel)
- transporterName: nome da transportadora (se houver)
- transporterPlate: placa do ve\xEDculo (se houver)
- supplierName: raz\xE3o social do fornecedor/emitente
- supplierCnpj: CNPJ do fornecedor/emitente
- deliveryLocation: local de entrega (se houver)
- paymentMethod: forma de pagamento (boleto, pix, transferencia, cheque, dinheiro)
Combine informa\xE7\xF5es de TODAS as imagens. Se a NF tem dados do produto e o boleto tem dados de pagamento, combine ambos.
Retorne APENAS o JSON, sem texto adicional. Se um campo n\xE3o for encontrado, use null.`
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
              paymentMethod: { type: ["string", "null"] }
            },
            required: ["invoiceNumber", "invoiceDate", "dueDate", "totalAmount", "liters", "pricePerLiter", "fuelType", "bankName", "barcodeNumber", "transporterName", "transporterPlate", "supplierName", "supplierCnpj", "deliveryLocation", "paymentMethod"],
            additionalProperties: false
          }
        }
      }
    });
    const content = result.choices?.[0]?.message?.content;
    let extracted = {};
    try {
      extracted = typeof content === "string" ? JSON.parse(content) : {};
    } catch {
      const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch {
        }
      }
    }
    const nfPhoto = uploadedPhotos.find((p) => p.label === "nf");
    const boletoPhoto = uploadedPhotos.find((p) => p.label === "boleto");
    return {
      invoicePhotoUrl: nfPhoto?.url || uploadedPhotos[0]?.url || null,
      boletoPhotoUrl: boletoPhoto?.url || null,
      extracted
    };
  }),
  // ===== CONTAS A PAGAR (NOTAS FISCAIS / BOLETOS) =====
  listInvoices: protectedProcedure.input(z28.object({
    supplierId: z28.number().optional(),
    status: z28.enum(["pendente", "pago", "vencido", "cancelado"]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    let conditions = [];
    if (input?.supplierId) conditions.push(eq27(fuelInvoices.supplierId, input.supplierId));
    if (input?.status) conditions.push(eq27(fuelInvoices.status, input.status));
    const invoices = conditions.length > 0 ? await db.select().from(fuelInvoices).where(and17(...conditions)).orderBy(desc22(fuelInvoices.id)) : await db.select().from(fuelInvoices).orderBy(desc22(fuelInvoices.id));
    const suppliers2 = await db.select().from(fuelSuppliers);
    const supplierMap = Object.fromEntries(suppliers2.map((s) => [s.id, s]));
    return invoices.map((inv) => ({
      ...inv,
      supplierName: supplierMap[inv.supplierId]?.name || `Fornecedor #${inv.supplierId}`,
      supplierTradeName: supplierMap[inv.supplierId]?.tradeName || null
    }));
  }),
  createInvoice: protectedProcedure.input(z28.object({
    supplierId: z28.number(),
    invoiceNumber: z28.string().min(1),
    invoiceDate: z28.string().min(1),
    dueDate: z28.string().min(1),
    totalAmount: z28.string().min(1),
    liters: z28.string().optional(),
    pricePerLiter: z28.string().optional(),
    fuelType: z28.enum(["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
    paymentMethod: z28.string().optional(),
    bankName: z28.string().optional(),
    barcodeNumber: z28.string().optional(),
    transporterName: z28.string().optional(),
    transporterPlate: z28.string().optional(),
    deliveryLocation: z28.string().optional(),
    notes: z28.string().optional(),
    invoicePhotoUrl: z28.string().optional(),
    boletoPhotoUrl: z28.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
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
      registeredBy: ctx.user?.id || null
    });
    try {
      const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const supplier = await db.select().from(fuelSuppliers).where(eq27(fuelSuppliers.id, input.supplierId));
      const supplierName = supplier[0]?.name || `Fornecedor #${input.supplierId}`;
      const dueDateFmt = input.dueDate.split("-").reverse().join("/");
      await notifyFinanceiro2({
        type: "pagamento_boleto",
        title: `Nova NF combust\xEDvel: ${supplierName}`,
        message: `NF ${input.invoiceNumber} | Valor: R$ ${input.totalAmount} | Vencimento: ${dueDateFmt}`
      });
    } catch (e) {
      console.warn("[Notification] Error notifying financeiro:", e);
    }
    return { success: true };
  }),
  updateInvoice: protectedProcedure.input(z28.object({
    id: z28.number(),
    supplierId: z28.number().optional(),
    invoiceNumber: z28.string().optional(),
    invoiceDate: z28.string().optional(),
    dueDate: z28.string().optional(),
    totalAmount: z28.string().optional(),
    liters: z28.string().nullable().optional(),
    pricePerLiter: z28.string().nullable().optional(),
    fuelType: z28.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
    paymentMethod: z28.string().nullable().optional(),
    bankName: z28.string().nullable().optional(),
    barcodeNumber: z28.string().nullable().optional(),
    status: z28.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
    paidAt: z28.string().nullable().optional(),
    paidAmount: z28.string().nullable().optional(),
    transporterName: z28.string().nullable().optional(),
    transporterPlate: z28.string().nullable().optional(),
    deliveryLocation: z28.string().nullable().optional(),
    notes: z28.string().nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    const updateData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== void 0) updateData[key] = val;
    }
    await db.update(fuelInvoices).set(updateData).where(eq27(fuelInvoices.id, id));
    return { success: true };
  }),
  markInvoicePaid: protectedProcedure.input(z28.object({
    id: z28.number(),
    paidAt: z28.string().min(1),
    paidAmount: z28.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(fuelInvoices).set({
      status: "pago",
      paidAt: input.paidAt,
      paidAmount: input.paidAmount || null
    }).where(eq27(fuelInvoices.id, input.id));
    return { success: true };
  }),
  deleteInvoice: protectedProcedure.input(z28.object({ id: z28.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(fuelInvoices).where(eq27(fuelInvoices.id, input.id));
    return { success: true };
  }),
  // ===== SALDO DO TANQUE POR LOCAL =====
  tankStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    const { vehicleRecords: vehicleRecords2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const suppliers2 = await db.select().from(fuelSuppliers).where(and17(eq27(fuelSuppliers.isActive, 1)));
    const tanksWithCapacity = suppliers2.filter((s) => s.tankCapacity && parseFloat(s.tankCapacity) > 0);
    const results = [];
    for (const supplier of tanksWithCapacity) {
      const latestInvoices = await db.select().from(fuelInvoices).where(eq27(fuelInvoices.supplierId, supplier.id)).orderBy(desc22(fuelInvoices.id));
      const totalDelivered = latestInvoices.reduce((sum, inv) => sum + parseFloat(inv.liters || "0"), 0);
      const invoiceIds = latestInvoices.map((inv) => inv.id);
      let totalUsed = 0;
      if (invoiceIds.length > 0) {
        totalUsed = latestInvoices.reduce((sum, inv) => sum + parseFloat(inv.litersUsed || "0"), 0);
      }
      const unlinkedRecords = await db.select().from(vehicleRecords2).where(and17(
        eq27(vehicleRecords2.recordType, "abastecimento"),
        eq27(vehicleRecords2.supplier, supplier.name)
      ));
      const unlinkedLiters = unlinkedRecords.filter((r) => !r.fuelInvoiceId).reduce((sum, r) => sum + parseFloat(r.liters || "0"), 0);
      const capacity = parseFloat(supplier.tankCapacity);
      const currentLevel = Math.max(0, totalDelivered - totalUsed - unlinkedLiters);
      const percentage = capacity > 0 ? Math.round(currentLevel / capacity * 100) : 0;
      const threshold = parseInt(supplier.tankAlertThreshold || "20");
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
        totalUsed: totalUsed + unlinkedLiters
      });
    }
    return results;
  }),
  // ===== LISTAR NFs ATIVAS (com saldo) PARA VINCULAR NO ABASTECIMENTO =====
  activeInvoices: protectedProcedure.input(z28.object({ supplierId: z28.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    let conditions = [eq27(fuelInvoices.status, "pendente")];
    if (input?.supplierId) conditions.push(eq27(fuelInvoices.supplierId, input.supplierId));
    const invoices = await db.select().from(fuelInvoices).where(and17(...conditions)).orderBy(desc22(fuelInvoices.id));
    const suppliers2 = await db.select().from(fuelSuppliers);
    const supplierMap = Object.fromEntries(suppliers2.map((s) => [s.id, s]));
    return invoices.map((inv) => {
      const totalLiters = parseFloat(inv.liters || "0");
      const usedLiters = parseFloat(inv.litersUsed || "0");
      const remainingLiters = Math.max(0, totalLiters - usedLiters);
      return {
        ...inv,
        supplierName: supplierMap[inv.supplierId]?.name || "",
        remainingLiters,
        percentUsed: totalLiters > 0 ? Math.round(usedLiters / totalLiters * 100) : 0
      };
    }).filter((inv) => {
      const totalLiters = parseFloat(inv.liters || "0");
      const usedLiters = parseFloat(inv.litersUsed || "0");
      return totalLiters === 0 || usedLiters < totalLiters;
    });
  }),
  // ===== VINCULAR ABASTECIMENTO A UMA NF (atualizar liters_used) =====
  linkFuelingToInvoice: protectedProcedure.input(z28.object({
    invoiceId: z28.number(),
    liters: z28.number(),
    vehicleRecordId: z28.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError18({ code: "INTERNAL_SERVER_ERROR" });
    const [invoice] = await db.select().from(fuelInvoices).where(eq27(fuelInvoices.id, input.invoiceId));
    if (!invoice) throw new TRPCError18({ code: "NOT_FOUND", message: "NF n\xE3o encontrada" });
    const currentUsed = parseFloat(invoice.litersUsed || "0");
    const newUsed = currentUsed + input.liters;
    await db.update(fuelInvoices).set({
      litersUsed: newUsed.toFixed(1)
    }).where(eq27(fuelInvoices.id, input.invoiceId));
    if (input.vehicleRecordId) {
      const { vehicleRecords: vehicleRecords2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await db.update(vehicleRecords2).set({
        fuelInvoiceId: input.invoiceId
      }).where(eq27(vehicleRecords2.id, input.vehicleRecordId));
    }
    const [supplier] = await db.select().from(fuelSuppliers).where(eq27(fuelSuppliers.id, invoice.supplierId));
    if (supplier?.tankCapacity) {
      const capacity = parseFloat(supplier.tankCapacity);
      const threshold = parseInt(supplier.tankAlertThreshold || "20");
      const allInvoices = await db.select().from(fuelInvoices).where(eq27(fuelInvoices.supplierId, supplier.id));
      const totalDelivered = allInvoices.reduce((s, i) => s + parseFloat(i.liters || "0"), 0);
      const totalUsedAll = allInvoices.reduce((s, i) => s + parseFloat(i.litersUsed || "0"), 0) - currentUsed + newUsed;
      const currentLevel = Math.max(0, totalDelivered - totalUsedAll);
      const percentage = capacity > 0 ? Math.round(currentLevel / capacity * 100) : 100;
      if (percentage <= threshold) {
        try {
          const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
          const locationLabel = supplier.locationType === "simflor" ? "SIMFLOR" : supplier.locationType === "astorga" ? "Sede Astorga" : "Postos";
          await notifyFinanceiro2({
            type: "pagamento_boleto",
            title: `\u{1F6E2}\uFE0F Tanque BAIXO: ${locationLabel}`,
            message: `O tanque de ${locationLabel} (${supplier.name}) est\xE1 com apenas ${percentage}% \u2014 aproximadamente ${Math.round(currentLevel)}L de ${capacity}L.
\xC9 necess\xE1rio solicitar nova entrega de combust\xEDvel.`
          });
        } catch (e) {
          console.warn("[TankAlert] Error notifying:", e);
        }
        try {
          const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          const locationLabel = supplier.locationType === "simflor" ? "SIMFLOR" : supplier.locationType === "astorga" ? "Sede Astorga" : "Postos";
          await notifyOwner2({
            title: `\u{1F6E2}\uFE0F Tanque BAIXO: ${locationLabel} \u2014 ${percentage}%`,
            content: `O tanque de ${locationLabel} (${supplier.name}) est\xE1 com apenas ${Math.round(currentLevel)}L de ${capacity}L (${percentage}%).
Solicite nova entrega de combust\xEDvel.`
          });
        } catch (e) {
          console.warn("[TankAlert] Error notifying owner:", e);
        }
      }
    }
    return { success: true, newUsed };
  })
});

// server/routers/thirdPartyContractors.ts
init_trpc();
init_db();
init_schema();
import { z as z29 } from "zod";
import { TRPCError as TRPCError19 } from "@trpc/server";
import { eq as eq28, asc as asc2 } from "drizzle-orm";
var thirdPartyContractorsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const rows = await db.select().from(thirdPartyContractors).orderBy(asc2(thirdPartyContractors.name));
    return rows;
  }),
  listActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const rows = await db.select().from(thirdPartyContractors).where(eq28(thirdPartyContractors.isActive, 1)).orderBy(asc2(thirdPartyContractors.name));
    return rows;
  }),
  create: protectedProcedure.input(z29.object({
    name: z29.string().min(1, "Nome obrigat\xF3rio"),
    ratePerM3: z29.string().default("0"),
    phone: z29.string().optional(),
    notes: z29.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(thirdPartyContractors).values({
      name: input.name.trim(),
      ratePerM3: input.ratePerM3.replace(",", "."),
      phone: input.phone || null,
      notes: input.notes || null,
      isActive: 1,
      createdBy: ctx.user.id
    });
    return { success: true };
  }),
  update: protectedProcedure.input(z29.object({
    id: z29.number(),
    name: z29.string().min(1).optional(),
    ratePerM3: z29.string().optional(),
    phone: z29.string().optional(),
    notes: z29.string().optional(),
    isActive: z29.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    const updateData = {};
    if (rest.name !== void 0) updateData.name = rest.name.trim();
    if (rest.ratePerM3 !== void 0) updateData.ratePerM3 = rest.ratePerM3.replace(",", ".");
    if (rest.phone !== void 0) updateData.phone = rest.phone || null;
    if (rest.notes !== void 0) updateData.notes = rest.notes || null;
    if (rest.isActive !== void 0) updateData.isActive = rest.isActive;
    await db.update(thirdPartyContractors).set(updateData).where(eq28(thirdPartyContractors.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z29.object({ id: z29.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError19({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(thirdPartyContractors).where(eq28(thirdPartyContractors.id, input.id));
    return { success: true };
  })
});

// server/routers/purchaseCategories.ts
init_trpc();
init_db();
init_schema();
import { z as z30 } from "zod";
import { TRPCError as TRPCError20 } from "@trpc/server";
import { eq as eq29 } from "drizzle-orm";
var purchaseCategoriesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    return await db.select().from(purchaseCategories).orderBy(purchaseCategories.name);
  }),
  create: protectedProcedure.input(z30.object({
    name: z30.string().min(1).max(100),
    color: z30.string().optional().default("#6B7280")
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(purchaseCategories).values({
      name: input.name,
      color: input.color,
      createdBy: ctx.user.id
    });
    return { id: result.insertId, name: input.name, color: input.color };
  }),
  update: protectedProcedure.input(z30.object({
    id: z30.number(),
    name: z30.string().min(1).max(100),
    color: z30.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(purchaseCategories).set({ name: input.name, color: input.color }).where(eq29(purchaseCategories.id, input.id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z30.object({ id: z30.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError20({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(purchaseCategories).where(eq29(purchaseCategories.id, input.id));
    return { success: true };
  })
});

// server/routers/freightCycles.ts
init_trpc();
init_db();
init_schema();
import { z as z31 } from "zod";
import { TRPCError as TRPCError21 } from "@trpc/server";
import { eq as eq30, and as and18, desc as desc24, gte as gte9, lte as lte9, sql as sql17 } from "drizzle-orm";
var TRACCAR_URL2 = process.env.TRACCAR_URL || "";
var TRACCAR_TOKEN2 = process.env.TRACCAR_TOKEN || "";
function traccarHeaders() {
  if (TRACCAR_TOKEN2) {
    return {
      Authorization: `Bearer ${TRACCAR_TOKEN2}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}
async function traccarGet(path3) {
  if (!TRACCAR_URL2) return null;
  try {
    const res = await fetch(`${TRACCAR_URL2}/api${path3}`, {
      headers: traccarHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isInsideGeofence(lat, lng, geoLat, geoLng, radiusMeters) {
  const distKm = haversineKm(lat, lng, geoLat, geoLng);
  return distKm * 1e3 <= radiusMeters;
}
async function getDevicePosition(traccarDeviceId) {
  const positions = await traccarGet(`/positions?deviceId=${traccarDeviceId}`);
  if (!Array.isArray(positions) || positions.length === 0) return null;
  const pos = positions[0];
  return {
    lat: pos.latitude,
    lng: pos.longitude,
    speed: pos.speed || 0
  };
}
async function calcCyclesCosts(db, equipmentId, fromStr, toStr) {
  if (!db) return { fuelCost: 0, maintenanceCost: 0 };
  const fuelRows = await db.select({ totalValue: fuelRecords.totalValue }).from(fuelRecords).where(
    and18(
      eq30(fuelRecords.equipmentId, equipmentId),
      gte9(fuelRecords.date, fromStr),
      lte9(fuelRecords.date, toStr)
    )
  );
  const fuelCost = fuelRows.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
  const maintRows = await db.select({ maintenanceCost: vehicleRecords.maintenanceCost }).from(vehicleRecords).where(
    and18(
      eq30(vehicleRecords.equipmentId, equipmentId),
      eq30(vehicleRecords.recordType, "manutencao"),
      gte9(vehicleRecords.date, fromStr),
      lte9(vehicleRecords.date, toStr)
    )
  );
  const maintenanceCost = maintRows.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);
  return { fuelCost, maintenanceCost };
}
var freightCyclesRouter = router({
  // ─── GEOFENCES ──────────────────────────────────────────────────────────────
  /** Lista todas as geofences */
  listGeofences: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(farmGeofences).orderBy(desc24(farmGeofences.createdAt));
  }),
  /** Cria nova geofence */
  createGeofence: protectedProcedure.input(
    z31.object({
      name: z31.string().min(1),
      latitude: z31.string(),
      longitude: z31.string(),
      radiusMeters: z31.number().default(500),
      equipmentId: z31.number().optional(),
      notes: z31.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(farmGeofences).values({
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      equipmentId: input.equipmentId ?? null,
      notes: input.notes ?? null,
      createdBy: ctx.user.id
    });
    return { ok: true };
  }),
  /** Atualiza geofence */
  updateGeofence: protectedProcedure.input(
    z31.object({
      id: z31.number(),
      name: z31.string().min(1).optional(),
      latitude: z31.string().optional(),
      longitude: z31.string().optional(),
      radiusMeters: z31.number().optional(),
      equipmentId: z31.number().nullable().optional(),
      active: z31.number().optional(),
      notes: z31.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...rest } = input;
    await db.update(farmGeofences).set(rest).where(eq30(farmGeofences.id, id));
    return { ok: true };
  }),
  /** Remove geofence */
  deleteGeofence: protectedProcedure.input(z31.object({ id: z31.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(farmGeofences).where(eq30(farmGeofences.id, input.id));
    return { ok: true };
  }),
  // ─── CICLOS DE FRETE ────────────────────────────────────────────────────────
  /** Lista ciclos de frete com filtros */
  listCycles: protectedProcedure.input(
    z31.object({
      equipmentId: z31.number().optional(),
      status: z31.enum(["em_fazenda", "em_transito", "concluido", "cancelado"]).optional(),
      dateFrom: z31.string().optional(),
      dateTo: z31.string().optional(),
      limit: z31.number().default(50)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.equipmentId) conditions.push(eq30(freightCycles.equipmentId, input.equipmentId));
    if (input.status) conditions.push(eq30(freightCycles.status, input.status));
    if (input.dateFrom) conditions.push(gte9(freightCycles.arrivedFarmAt, input.dateFrom));
    if (input.dateTo) conditions.push(lte9(freightCycles.arrivedFarmAt, input.dateTo));
    return db.select().from(freightCycles).where(conditions.length > 0 ? and18(...conditions) : void 0).orderBy(desc24(freightCycles.createdAt)).limit(input.limit);
  }),
  /** Detalhe de um ciclo */
  getCycle: protectedProcedure.input(z31.object({ id: z31.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    const [cycle] = await db.select().from(freightCycles).where(eq30(freightCycles.id, input.id));
    if (!cycle) throw new TRPCError21({ code: "NOT_FOUND" });
    return cycle;
  }),
  /** Ciclos ativos (em_fazenda ou em_transito) */
  activeCycles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(freightCycles).where(
      sql17`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
    ).orderBy(desc24(freightCycles.createdAt));
  }),
  /** Vincula uma carga ao ciclo */
  linkCargoLoad: protectedProcedure.input(z31.object({ cycleId: z31.number(), cargoLoadId: z31.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    const [cargo] = await db.select({ destination: cargoLoads.destination }).from(cargoLoads).where(eq30(cargoLoads.id, input.cargoLoadId));
    await db.update(freightCycles).set({
      cargoLoadId: input.cargoLoadId,
      destination: cargo?.destination ?? null
    }).where(eq30(freightCycles.id, input.cycleId));
    return { ok: true };
  }),
  /** Atualiza motorista do ciclo */
  updateDriver: protectedProcedure.input(
    z31.object({
      cycleId: z31.number(),
      driverCollaboratorId: z31.number().optional(),
      driverName: z31.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(freightCycles).set({
      driverCollaboratorId: input.driverCollaboratorId ?? null,
      driverName: input.driverName ?? null
    }).where(eq30(freightCycles.id, input.cycleId));
    return { ok: true };
  }),
  /** Fecha manualmente um ciclo em andamento */
  closeCycleManually: protectedProcedure.input(
    z31.object({
      cycleId: z31.number(),
      notes: z31.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    const [cycle] = await db.select().from(freightCycles).where(eq30(freightCycles.id, input.cycleId));
    if (!cycle) throw new TRPCError21({ code: "NOT_FOUND" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const fromStr = cycle.leftFarmAt || cycle.arrivedFarmAt || now;
    let fuelCost = 0;
    let maintenanceCost = 0;
    if (cycle.equipmentId) {
      const costs = await calcCyclesCosts(db, cycle.equipmentId, fromStr, now);
      fuelCost = costs.fuelCost;
      maintenanceCost = costs.maintenanceCost;
    }
    const totalCost = fuelCost + maintenanceCost;
    await db.update(freightCycles).set({
      status: "concluido",
      returnedFarmAt: now,
      totalFuelCost: String(fuelCost.toFixed(2)),
      totalMaintenanceCost: String(maintenanceCost.toFixed(2)),
      totalCost: String(totalCost.toFixed(2)),
      notes: input.notes ?? cycle.notes
    }).where(eq30(freightCycles.id, input.cycleId));
    return { ok: true };
  }),
  /** Cancela um ciclo */
  cancelCycle: protectedProcedure.input(z31.object({ cycleId: z31.number(), notes: z31.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(freightCycles).set({ status: "cancelado", notes: input.notes ?? null }).where(eq30(freightCycles.id, input.cycleId));
    return { ok: true };
  }),
  // ─── POLLING TRACCAR ────────────────────────────────────────────────────────
  /**
   * Job de polling: verifica posição atual de todos os veículos com geofence ativa
   * e abre/fecha ciclos automaticamente.
   * Deve ser chamado a cada 2 minutos pelo heartbeat ou manualmente.
   */
  pollGeofences: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError21({ code: "INTERNAL_SERVER_ERROR" });
    if (!TRACCAR_URL2) return { processed: 0, message: "Traccar n\xE3o configurado" };
    const geofences = await db.select().from(farmGeofences).where(eq30(farmGeofences.active, 1));
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    let processed = 0;
    const log = [];
    for (const geo of geofences) {
      if (!geo.equipmentId) continue;
      const [link] = await db.select().from(gpsDeviceLinks).where(
        and18(
          eq30(gpsDeviceLinks.equipmentId, geo.equipmentId),
          eq30(gpsDeviceLinks.active, 1)
        )
      );
      if (!link) continue;
      const pos = await getDevicePosition(link.traccarDeviceId);
      if (!pos) continue;
      const inside = isInsideGeofence(
        pos.lat,
        pos.lng,
        parseFloat(geo.latitude),
        parseFloat(geo.longitude),
        geo.radiusMeters
      );
      const [activeCycle] = await db.select().from(freightCycles).where(
        and18(
          eq30(freightCycles.equipmentId, geo.equipmentId),
          sql17`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
        )
      );
      if (inside) {
        if (!activeCycle) {
          await db.insert(freightCycles).values({
            equipmentId: geo.equipmentId,
            geofenceId: geo.id,
            status: "em_fazenda",
            arrivedFarmAt: now,
            startLat: String(pos.lat),
            startLng: String(pos.lng)
          });
          log.push(`[Geofence] Novo ciclo aberto para equipamento ${geo.equipmentId} (chegou na fazenda)`);
        } else if (activeCycle.status === "em_transito") {
          const fromStr = activeCycle.leftFarmAt || activeCycle.arrivedFarmAt || now;
          const costs = await calcCyclesCosts(db, geo.equipmentId, fromStr, now);
          const totalCost = costs.fuelCost + costs.maintenanceCost;
          let distanceKm = "0";
          if (activeCycle.trajectoryJson) {
            try {
              const traj = JSON.parse(activeCycle.trajectoryJson);
              let dist = 0;
              for (let i = 1; i < traj.length; i++) {
                dist += haversineKm(traj[i - 1].lat, traj[i - 1].lng, traj[i].lat, traj[i].lng);
              }
              distanceKm = String(Math.round(dist * 10) / 10);
            } catch {
              distanceKm = "0";
            }
          }
          await db.update(freightCycles).set({
            status: "concluido",
            returnedFarmAt: now,
            endLat: String(pos.lat),
            endLng: String(pos.lng),
            distanceKm,
            totalFuelCost: String(costs.fuelCost.toFixed(2)),
            totalMaintenanceCost: String(costs.maintenanceCost.toFixed(2)),
            totalCost: String(totalCost.toFixed(2))
          }).where(eq30(freightCycles.id, activeCycle.id));
          await db.insert(freightCycles).values({
            equipmentId: geo.equipmentId,
            geofenceId: geo.id,
            status: "em_fazenda",
            arrivedFarmAt: now,
            startLat: String(pos.lat),
            startLng: String(pos.lng)
          });
          log.push(`[Geofence] Ciclo ${activeCycle.id} conclu\xEDdo (${distanceKm}km, R$${totalCost.toFixed(2)}). Novo ciclo aberto.`);
        }
      } else {
        if (activeCycle?.status === "em_fazenda") {
          await db.update(freightCycles).set({
            status: "em_transito",
            leftFarmAt: now
          }).where(eq30(freightCycles.id, activeCycle.id));
          log.push(`[Geofence] Ciclo ${activeCycle.id} \u2192 em_transito (saiu da fazenda)`);
        } else if (activeCycle?.status === "em_transito") {
          const newPoint = { lat: pos.lat, lng: pos.lng, ts: now };
          let traj = [];
          if (activeCycle.trajectoryJson) {
            try {
              traj = JSON.parse(activeCycle.trajectoryJson);
            } catch {
              traj = [];
            }
          }
          traj.push(newPoint);
          if (traj.length > 500) traj = traj.slice(-500);
          await db.update(freightCycles).set({ trajectoryJson: JSON.stringify(traj) }).where(eq30(freightCycles.id, activeCycle.id));
        }
      }
      processed++;
    }
    if (log.length > 0) {
      console.log("[FreightCycles]", log.join(" | "));
    }
    return { processed, log };
  }),
  /** Status em tempo real de todos os veículos monitorados */
  realtimeStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const geofences = await db.select().from(farmGeofences).where(eq30(farmGeofences.active, 1));
    const result = [];
    for (const geo of geofences) {
      if (!geo.equipmentId) continue;
      const [eq_row] = await db.select({ name: equipment.name, licensePlate: equipment.licensePlate }).from(equipment).where(eq30(equipment.id, geo.equipmentId));
      const [link] = await db.select().from(gpsDeviceLinks).where(
        and18(
          eq30(gpsDeviceLinks.equipmentId, geo.equipmentId),
          eq30(gpsDeviceLinks.active, 1)
        )
      );
      const [activeCycle] = await db.select().from(freightCycles).where(
        and18(
          eq30(freightCycles.equipmentId, geo.equipmentId),
          sql17`${freightCycles.status} IN ('em_fazenda', 'em_transito')`
        )
      );
      let currentPos = null;
      if (link) {
        currentPos = await getDevicePosition(link.traccarDeviceId);
      }
      let insideGeofence = false;
      if (currentPos) {
        insideGeofence = isInsideGeofence(
          currentPos.lat,
          currentPos.lng,
          parseFloat(geo.latitude),
          parseFloat(geo.longitude),
          geo.radiusMeters
        );
      }
      result.push({
        geofence: geo,
        equipment: eq_row ?? null,
        activeCycle: activeCycle ?? null,
        currentPosition: currentPos,
        insideGeofence,
        traccarLinked: !!link
      });
    }
    return result;
  })
});

// server/routers/suppliers.ts
init_trpc();
init_db();
init_schema();
import { z as z32 } from "zod";
import { TRPCError as TRPCError22 } from "@trpc/server";
import { eq as eq31, desc as desc25, sql as sql18 } from "drizzle-orm";
var suppliersRouter = router({
  list: protectedProcedure.input(z32.object({ activeOnly: z32.boolean().optional().default(true) }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    const query = db.select().from(suppliers);
    if (input?.activeOnly !== false) {
      return await query.where(eq31(suppliers.isActive, 1)).orderBy(suppliers.companyName);
    }
    return await query.orderBy(suppliers.companyName);
  }),
  getById: protectedProcedure.input(z32.object({ id: z32.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    const [supplier] = await db.select().from(suppliers).where(eq31(suppliers.id, input.id));
    if (!supplier) throw new TRPCError22({ code: "NOT_FOUND" });
    const recentQuotations = await db.select({
      id: quotations.id,
      productName: quotations.productName,
      unitPrice: quotations.unitPrice,
      unit: quotations.unit,
      quotedAt: quotations.quotedAt,
      categoryId: quotations.categoryId,
      notes: quotations.notes
    }).from(quotations).where(eq31(quotations.supplierId, input.id)).orderBy(desc25(quotations.quotedAt)).limit(20);
    return { ...supplier, recentQuotations };
  }),
  create: protectedProcedure.input(z32.object({
    name: z32.string().min(1).max(255),
    tradeName: z32.string().optional(),
    cnpj: z32.string().optional(),
    address: z32.string().optional(),
    city: z32.string().optional(),
    state: z32.string().max(2).optional(),
    zipCode: z32.string().optional(),
    phone: z32.string().optional(),
    whatsapp: z32.string().optional(),
    email: z32.string().email().optional().or(z32.literal("")),
    contactName: z32.string().optional(),
    website: z32.string().optional(),
    notes: z32.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(suppliers).values({
      companyName: input.name,
      tradeName: input.tradeName,
      cnpj: input.cnpj,
      address: input.address,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email || void 0,
      contactName: input.contactName,
      website: input.website,
      notes: input.notes,
      isActive: 1,
      createdBy: ctx.user.id
    });
    return { id: result.insertId, ...input };
  }),
  update: protectedProcedure.input(z32.object({
    id: z32.number(),
    name: z32.string().min(1).max(255),
    tradeName: z32.string().optional(),
    cnpj: z32.string().optional(),
    address: z32.string().optional(),
    city: z32.string().optional(),
    state: z32.string().max(2).optional(),
    zipCode: z32.string().optional(),
    phone: z32.string().optional(),
    whatsapp: z32.string().optional(),
    email: z32.string().email().optional().or(z32.literal("")),
    contactName: z32.string().optional(),
    website: z32.string().optional(),
    notes: z32.string().optional(),
    active: z32.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    const { id, name, active, ...rest } = input;
    await db.update(suppliers).set({
      companyName: name,
      ...rest,
      email: rest.email || void 0,
      isActive: active !== void 0 ? active : void 0
    }).where(eq31(suppliers.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z32.object({ id: z32.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(suppliers).set({ isActive: 0 }).where(eq31(suppliers.id, input.id));
    return { success: true };
  }),
  syncFromQuotationResponses: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError22({ code: "INTERNAL_SERVER_ERROR" });
    const responses = await db.select().from(quotationResponses);
    let created = 0;
    let skipped = 0;
    for (const resp of responses) {
      if (!resp.supplierName?.trim()) continue;
      const trimmedName = resp.supplierName.trim();
      const rows = await db.execute(
        sql18`SELECT id FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`
      );
      const existing = rows[0];
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await db.insert(suppliers).values({
        companyName: trimmedName,
        cnpj: resp.cnpj ?? null,
        address: resp.address ?? null,
        phone: resp.sellerPhone ?? null,
        whatsapp: resp.sellerPhone ?? null,
        email: resp.sellerEmail ?? null,
        contactName: resp.sellerName ?? null,
        isActive: 1,
        createdBy: ctx.user.id
      });
      created++;
    }
    return { created, skipped };
  })
});

// server/routers/quotations.ts
init_trpc();
init_db();
init_schema();
import { z as z33 } from "zod";
import { TRPCError as TRPCError23 } from "@trpc/server";
import { eq as eq32, desc as desc26, asc as asc3, sql as sql19 } from "drizzle-orm";
var quotationsRouter = router({
  // List all quotations, optionally filtered by category or supplier
  list: protectedProcedure.input(z33.object({
    categoryId: z33.number().optional(),
    supplierId: z33.number().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      id: quotations.id,
      supplierId: quotations.supplierId,
      supplierName: suppliers.companyName,
      supplierPhone: suppliers.phone,
      supplierWhatsapp: suppliers.whatsapp,
      categoryId: quotations.categoryId,
      categoryName: purchaseCategories.name,
      categoryColor: purchaseCategories.color,
      productName: quotations.productName,
      unit: quotations.unit,
      quantity: quotations.quantity,
      unitPrice: quotations.unitPrice,
      totalPrice: quotations.totalPrice,
      currency: quotations.currency,
      quotedAt: quotations.quotedAt,
      notes: quotations.notes,
      createdAt: quotations.createdAt
    }).from(quotations).leftJoin(suppliers, eq32(quotations.supplierId, suppliers.id)).leftJoin(purchaseCategories, eq32(quotations.categoryId, purchaseCategories.id)).orderBy(desc26(quotations.quotedAt));
    return rows;
  }),
  // List by product name — price history across suppliers, lowest price first
  listByProduct: protectedProcedure.input(z33.object({ productName: z33.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      id: quotations.id,
      supplierId: quotations.supplierId,
      supplierName: suppliers.companyName,
      supplierPhone: suppliers.phone,
      supplierWhatsapp: suppliers.whatsapp,
      categoryId: quotations.categoryId,
      productName: quotations.productName,
      unit: quotations.unit,
      quantity: quotations.quantity,
      unitPrice: quotations.unitPrice,
      totalPrice: quotations.totalPrice,
      quotedAt: quotations.quotedAt,
      notes: quotations.notes
    }).from(quotations).leftJoin(suppliers, eq32(quotations.supplierId, suppliers.id)).where(eq32(quotations.productName, input.productName)).orderBy(asc3(sql19`CAST(${quotations.unitPrice} AS DECIMAL(10,2))`), desc26(quotations.quotedAt));
    return rows;
  }),
  // List grouped by category — returns categories with their products and price history
  listByCategory: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      id: quotations.id,
      supplierId: quotations.supplierId,
      supplierName: suppliers.companyName,
      supplierPhone: suppliers.phone,
      supplierWhatsapp: suppliers.whatsapp,
      categoryId: quotations.categoryId,
      categoryName: purchaseCategories.name,
      categoryColor: purchaseCategories.color,
      productName: quotations.productName,
      unit: quotations.unit,
      quantity: quotations.quantity,
      unitPrice: quotations.unitPrice,
      totalPrice: quotations.totalPrice,
      quotedAt: quotations.quotedAt,
      notes: quotations.notes
    }).from(quotations).leftJoin(suppliers, eq32(quotations.supplierId, suppliers.id)).leftJoin(purchaseCategories, eq32(quotations.categoryId, purchaseCategories.id)).orderBy(
      purchaseCategories.name,
      quotations.productName,
      asc3(sql19`CAST(${quotations.unitPrice} AS DECIMAL(10,2))`)
    );
    const grouped = {};
    for (const row of rows) {
      const catKey = row.categoryId?.toString() ?? "sem_categoria";
      const catName = row.categoryName ?? "Sem Categoria";
      const catColor = row.categoryColor ?? "#6B7280";
      if (!grouped[catKey]) {
        grouped[catKey] = {
          categoryId: row.categoryId,
          categoryName: catName,
          categoryColor: catColor,
          products: {}
        };
      }
      const prodKey = row.productName;
      if (!grouped[catKey].products[prodKey]) {
        grouped[catKey].products[prodKey] = {
          productName: row.productName,
          unit: row.unit,
          lowestPrice: row.unitPrice,
          latestDate: row.quotedAt,
          quotes: []
        };
      }
      const prod = grouped[catKey].products[prodKey];
      prod.quotes.push(row);
      const currentPrice = parseFloat(row.unitPrice);
      const lowestPrice = parseFloat(prod.lowestPrice);
      if (currentPrice < lowestPrice) {
        prod.lowestPrice = row.unitPrice;
      }
      if (row.quotedAt > prod.latestDate) {
        prod.latestDate = row.quotedAt;
      }
    }
    return Object.values(grouped).map((cat) => ({
      ...cat,
      products: Object.values(cat.products).sort(
        (a, b) => parseFloat(a.lowestPrice) - parseFloat(b.lowestPrice)
      )
    }));
  }),
  create: protectedProcedure.input(z33.object({
    supplierId: z33.number(),
    categoryId: z33.number().optional(),
    productName: z33.string().min(1).max(255),
    unit: z33.string().optional(),
    quantity: z33.string().optional(),
    unitPrice: z33.string().min(1),
    totalPrice: z33.string().optional(),
    notes: z33.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    const now = Date.now();
    const [result] = await db.insert(quotations).values({
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      productName: input.productName,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalPrice: input.totalPrice,
      currency: "BRL",
      quotedAt: now,
      notes: input.notes,
      createdBy: ctx.user.id
    });
    return { id: result.insertId, ...input };
  }),
  update: protectedProcedure.input(z33.object({
    id: z33.number(),
    supplierId: z33.number().optional(),
    categoryId: z33.number().optional(),
    productName: z33.string().optional(),
    unit: z33.string().optional(),
    quantity: z33.string().optional(),
    unitPrice: z33.string().optional(),
    totalPrice: z33.string().optional(),
    notes: z33.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    await db.update(quotations).set(data).where(eq32(quotations.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z33.object({ id: z33.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError23({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(quotations).where(eq32(quotations.id, input.id));
    return { success: true };
  })
});

// server/routers/purchaseRequests.ts
init_trpc();
init_db();
init_schema();
import { z as z34 } from "zod";
import { TRPCError as TRPCError24 } from "@trpc/server";
import { eq as eq33 } from "drizzle-orm";
var statusEnum = z34.enum(["pendente", "lida", "aprovada", "comprada", "recebida", "cancelada"]);
var urgencyEnum = z34.enum(["baixa", "media", "alta", "critica"]);
var purchaseRequestsRouter = router({
  list: protectedProcedure.input(z34.object({
    status: statusEnum.optional(),
    urgency: urgencyEnum.optional(),
    categoryId: z34.number().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const [rows] = await db.execute(`
        SELECT
          pr.id, pr.title, pr.description, pr.images,
          COALESCE(pr.link_url, pr.link) AS linkUrl,
          pr.category_id AS categoryId,
          pc.name AS categoryName, pc.color AS categoryColor,
          pr.status, pr.urgency,
          COALESCE(pr.request_date, FROM_UNIXTIME(pr.requested_at / 1000)) AS requestDate,
          pr.read_date AS readDate,
          pr.purchase_date AS purchaseDate,
          pr.expected_arrival AS expectedArrival,
          pr.received_date AS receivedDate,
          pr.items_confirmed_date AS itemsConfirmedDate,
          pr.requested_by AS requestedBy,
          pr.notes,
          pr.created_at AS createdAt,
          pr.updated_at AS updatedAt
        FROM purchase_requests pr
        LEFT JOIN purchase_categories pc ON pr.category_id = pc.id
        ORDER BY pr.created_at DESC
      `);
    console.log("[purchaseRequests.list] rows retornados:", rows.length);
    const statusMap = {
      pending: "pendente",
      read: "lida",
      approved: "aprovada",
      purchased: "comprada",
      received: "recebida",
      cancelled: "cancelada",
      canceled: "cancelada",
      pendente: "pendente",
      lida: "lida",
      aprovada: "aprovada",
      comprada: "comprada",
      recebida: "recebida",
      cancelada: "cancelada"
    };
    const urgencyMap = {
      low: "baixa",
      medium: "media",
      high: "alta",
      critical: "critica",
      baixa: "baixa",
      media: "media",
      alta: "alta",
      critica: "critica"
    };
    const normalized = rows.map((r) => ({
      ...r,
      status: statusMap[r.status] || r.status,
      urgency: urgencyMap[r.urgency] || r.urgency
    }));
    let filtered = normalized;
    if (input?.status) filtered = filtered.filter((r) => r.status === input.status);
    if (input?.urgency) filtered = filtered.filter((r) => r.urgency === input.urgency);
    if (input?.categoryId) filtered = filtered.filter((r) => r.categoryId === input.categoryId);
    return filtered;
  }),
  getById: protectedProcedure.input(z34.object({ id: z34.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select({
      id: purchaseRequests.id,
      title: purchaseRequests.title,
      description: purchaseRequests.description,
      images: purchaseRequests.images,
      linkUrl: purchaseRequests.linkUrl,
      categoryId: purchaseRequests.categoryId,
      categoryName: purchaseCategories.name,
      categoryColor: purchaseCategories.color,
      status: purchaseRequests.status,
      urgency: purchaseRequests.urgency,
      requestDate: purchaseRequests.requestDate,
      readDate: purchaseRequests.readDate,
      purchaseDate: purchaseRequests.purchaseDate,
      expectedArrival: purchaseRequests.expectedArrival,
      receivedDate: purchaseRequests.receivedDate,
      itemsConfirmedDate: purchaseRequests.itemsConfirmedDate,
      requestedBy: purchaseRequests.requestedBy,
      approvedBy: purchaseRequests.approvedBy,
      notes: purchaseRequests.notes,
      createdAt: purchaseRequests.createdAt,
      updatedAt: purchaseRequests.updatedAt
    }).from(purchaseRequests).leftJoin(purchaseCategories, eq33(purchaseRequests.categoryId, purchaseCategories.id)).where(eq33(purchaseRequests.id, input.id));
    if (!req) throw new TRPCError24({ code: "NOT_FOUND" });
    const items = await db.select().from(purchaseRequestItems).where(eq33(purchaseRequestItems.requestId, input.id)).orderBy(purchaseRequestItems.id);
    return { ...req, items };
  }),
  create: protectedProcedure.input(z34.object({
    title: z34.string().min(1).max(255),
    description: z34.string().optional(),
    linkUrl: z34.string().optional(),
    categoryId: z34.number().optional(),
    urgency: urgencyEnum.optional().default("media"),
    notes: z34.string().optional(),
    items: z34.array(z34.object({
      name: z34.string().min(1),
      quantity: z34.string(),
      unit: z34.string().optional(),
      notes: z34.string().optional()
    })).optional().default([])
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const [result] = await db.insert(purchaseRequests).values({
      title: input.title,
      description: input.description,
      linkUrl: input.linkUrl,
      categoryId: input.categoryId,
      urgency: input.urgency,
      status: "pendente",
      requestDate: now,
      requestedBy: ctx.user.id,
      notes: input.notes
    });
    const requestId = result.insertId;
    if (input.items.length > 0) {
      await db.insert(purchaseRequestItems).values(
        input.items.map((item) => ({
          requestId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes
        }))
      );
    }
    return { id: requestId };
  }),
  update: protectedProcedure.input(z34.object({
    id: z34.number(),
    title: z34.string().optional(),
    description: z34.string().optional(),
    linkUrl: z34.string().optional(),
    categoryId: z34.number().optional(),
    urgency: urgencyEnum.optional(),
    notes: z34.string().optional(),
    expectedArrival: z34.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    await db.update(purchaseRequests).set(data).where(eq33(purchaseRequests.id, id));
    return { success: true };
  }),
  // Mark as read by responsible
  markRead: protectedProcedure.input(z34.object({ id: z34.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(purchaseRequests).set({ readDate: now, status: "lida" }).where(eq33(purchaseRequests.id, input.id));
    return { success: true };
  }),
  // Mark as purchased
  markPurchased: protectedProcedure.input(z34.object({
    id: z34.number(),
    purchaseDate: z34.string().optional(),
    expectedArrival: z34.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(purchaseRequests).set({
      purchaseDate: input.purchaseDate || now,
      expectedArrival: input.expectedArrival,
      status: "comprada"
    }).where(eq33(purchaseRequests.id, input.id));
    return { success: true };
  }),
  // Mark as received
  markReceived: protectedProcedure.input(z34.object({ id: z34.number(), receivedDate: z34.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(purchaseRequests).set({ receivedDate: input.receivedDate || now, status: "recebida" }).where(eq33(purchaseRequests.id, input.id));
    return { success: true };
  }),
  // Confirm items separately (after received)
  confirmItems: protectedProcedure.input(z34.object({ id: z34.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(purchaseRequests).set({ itemsConfirmedDate: now }).where(eq33(purchaseRequests.id, input.id));
    await db.update(purchaseRequestItems).set({ confirmed: 1 }).where(eq33(purchaseRequestItems.requestId, input.id));
    return { success: true };
  }),
  // Toggle single item confirmation
  toggleItemConfirm: protectedProcedure.input(z34.object({ itemId: z34.number(), confirmed: z34.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(purchaseRequestItems).set({ confirmed: input.confirmed ? 1 : 0 }).where(eq33(purchaseRequestItems.id, input.itemId));
    return { success: true };
  }),
  // Upload image for a request
  uploadImage: protectedProcedure.input(z34.object({
    id: z34.number(),
    imageBase64: z34.string(),
    mimeType: z34.string().default("image/jpeg")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const buffer = Buffer.from(input.imageBase64, "base64");
    const ext = input.mimeType.split("/")[1] || "jpg";
    const key = `purchase-requests/${input.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    const [req] = await db.select({ images: purchaseRequests.images }).from(purchaseRequests).where(eq33(purchaseRequests.id, input.id));
    const currentImages = req?.images ? JSON.parse(req.images) : [];
    currentImages.push(url);
    await db.update(purchaseRequests).set({ images: JSON.stringify(currentImages) }).where(eq33(purchaseRequests.id, input.id));
    return { url, images: currentImages };
  }),
  // Remove image from a request
  removeImage: protectedProcedure.input(z34.object({ id: z34.number(), imageUrl: z34.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select({ images: purchaseRequests.images }).from(purchaseRequests).where(eq33(purchaseRequests.id, input.id));
    const currentImages = req?.images ? JSON.parse(req.images) : [];
    const newImages = currentImages.filter((img) => img !== input.imageUrl);
    await db.update(purchaseRequests).set({ images: JSON.stringify(newImages) }).where(eq33(purchaseRequests.id, input.id));
    return { images: newImages };
  }),
  delete: protectedProcedure.input(z34.object({ id: z34.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError24({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(purchaseRequestItems).where(eq33(purchaseRequestItems.requestId, input.id));
    await db.delete(purchaseRequests).where(eq33(purchaseRequests.id, input.id));
    return { success: true };
  })
});

// server/routers/invoiceControl.ts
init_trpc();
init_db();
init_schema();
import { z as z35 } from "zod";
import { TRPCError as TRPCError25 } from "@trpc/server";
import { eq as eq34, desc as desc28 } from "drizzle-orm";
var invoiceControlRouter = router({
  // Listar notas com filtros — mostra todas as cargas (sem filtro de status)
  list: protectedProcedure.input(z35.object({
    search: z35.string().optional(),
    destinationId: z35.number().optional(),
    clientId: z35.number().optional(),
    checked: z35.boolean().optional(),
    // undefined = todos, true = conferidos, false = não conferidos
    dateFrom: z35.string().optional(),
    dateTo: z35.string().optional(),
    limit: z35.number().optional().default(200)
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError25({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      deliveryDate: cargoLoads.deliveryDate,
      invoiceNumber: cargoLoads.invoiceNumber,
      invoiceUrl: cargoLoads.invoiceUrl,
      clientId: cargoLoads.clientId,
      clientName: cargoLoads.clientName,
      destinationId: cargoLoads.destinationId,
      destination: cargoLoads.destination,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      weightNetKg: cargoLoads.weightNetKg,
      weightKg: cargoLoads.weightKg,
      volumeM3: cargoLoads.volumeM3,
      status: cargoLoads.status,
      receivedByBuyer: cargoLoads.receivedByBuyer,
      invoiceChecked: cargoLoads.invoiceChecked,
      invoiceCheckedAt: cargoLoads.invoiceCheckedAt,
      // Joins
      destinationName: cargoDestinations.name,
      clientNameJoined: clients.name
    }).from(cargoLoads).leftJoin(cargoDestinations, eq34(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(clients, eq34(cargoLoads.clientId, clients.id)).orderBy(desc28(cargoLoads.date)).limit(input?.limit ?? 200);
    let filtered = results.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destinationName: r.destinationName || r.destination
    }));
    if (input?.search) {
      const s = input.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.invoiceNumber?.toLowerCase().includes(s) || r.clientName?.toLowerCase().includes(s) || r.destinationName?.toLowerCase().includes(s) || r.vehiclePlate?.toLowerCase().includes(s) || r.driverName?.toLowerCase().includes(s)
      );
    }
    if (input?.destinationId) filtered = filtered.filter((r) => r.destinationId === input.destinationId);
    if (input?.clientId) filtered = filtered.filter((r) => r.clientId === input.clientId);
    if (input?.checked !== void 0) {
      filtered = filtered.filter((r) => r.invoiceChecked === 1 === input.checked);
    }
    if (input?.dateFrom) filtered = filtered.filter((r) => r.date && r.date >= input.dateFrom);
    if (input?.dateTo) filtered = filtered.filter((r) => r.date && r.date <= input.dateTo);
    return filtered;
  }),
  // Marcar/desmarcar nota como conferida (sem colunas extras que podem não existir)
  toggleChecked: protectedProcedure.input(z35.object({ id: z35.number(), checked: z35.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError25({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(cargoLoads).set({
      invoiceChecked: input.checked ? 1 : 0,
      invoiceCheckedAt: input.checked ? Date.now() : 0
    }).where(eq34(cargoLoads.id, input.id));
    return { success: true };
  }),
  // Estatísticas resumidas — todas as cargas
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError25({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const all = await db.select({
      invoiceChecked: cargoLoads.invoiceChecked,
      invoiceNumber: cargoLoads.invoiceNumber
    }).from(cargoLoads);
    const total = all.length;
    const checked = all.filter((r) => r.invoiceChecked === 1).length;
    const withInvoice = all.filter((r) => r.invoiceNumber && r.invoiceNumber.trim() !== "").length;
    return {
      total,
      checked,
      pending: total - checked,
      withInvoice,
      withoutInvoice: total - withInvoice
    };
  })
});

// server/routers/quotationRequests.ts
init_trpc();
init_db();
init_schema();
init_notification();
import { z as z36 } from "zod";
import { eq as eq35, desc as desc29, sql as sql21 } from "drizzle-orm";
import { TRPCError as TRPCError26 } from "@trpc/server";
import crypto from "crypto";
var quotationRequestsRouter = router({
  // Listar todas as solicitações (protegido)
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(quotationRequests).orderBy(desc29(quotationRequests.createdAt));
    return rows.map((r) => ({
      ...r,
      items: JSON.parse(r.itemsJson || "[]"),
      isExpired: Date.now() > r.expiresAt
    }));
  }),
  // Buscar por ID com respostas (protegido)
  getById: protectedProcedure.input(z36.object({ id: z36.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.id, input.id));
    if (!req) throw new TRPCError26({ code: "NOT_FOUND", message: "Solicita\xE7\xE3o n\xE3o encontrada" });
    const responses = await db.select().from(quotationResponses).where(eq35(quotationResponses.quotationRequestId, input.id)).orderBy(desc29(quotationResponses.createdAt));
    return {
      ...req,
      items: JSON.parse(req.itemsJson || "[]"),
      isExpired: Date.now() > req.expiresAt,
      responses: responses.map((r) => ({
        ...r,
        items: JSON.parse(r.itemsJson || "[]")
      }))
    };
  }),
  // Criar nova solicitação (protegido)
  create: protectedProcedure.input(
    z36.object({
      title: z36.string().min(1),
      requesterId: z36.number().optional(),
      requesterName: z36.string().optional(),
      requesterPhone: z36.string().optional(),
      requesterEmail: z36.string().optional(),
      items: z36.array(z36.object({
        name: z36.string().min(1),
        quantity: z36.string().min(1),
        unit: z36.string().optional().default("un")
      })).min(1),
      notes: z36.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1e3;
    const [result] = await db.insert(quotationRequests).values({
      title: input.title,
      requesterId: input.requesterId,
      requesterName: input.requesterName,
      requesterPhone: input.requesterPhone,
      requesterEmail: input.requesterEmail,
      itemsJson: JSON.stringify(input.items),
      token,
      expiresAt,
      status: "ativa",
      notes: input.notes,
      createdBy: ctx.user.id
    });
    const id = result.insertId;
    return { id, token };
  }),
  // Cancelar solicitação (protegido)
  cancel: protectedProcedure.input(z36.object({ id: z36.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(quotationRequests).set({ status: "cancelada" }).where(eq35(quotationRequests.id, input.id));
    return { success: true };
  }),
  // ===== AUTOMAÇÃO COMPLETA =====
  // Processa uma solicitação respondida:
  // 1. Cria/atualiza fornecedores de todas as respostas
  // 2. Cria/encontra categoria com o título do orçamento
  // 3. Popula catálogo de preços com todos os itens de todas as respostas
  // 4. Retorna resumo estruturado para mensagem WhatsApp (NÃO cria solicitação de compra)
  autoProcess: protectedProcedure.input(z36.object({
    quotationRequestId: z36.number()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.id, input.quotationRequestId));
    if (!req) throw new TRPCError26({ code: "NOT_FOUND", message: "Solicita\xE7\xE3o n\xE3o encontrada" });
    const responses = await db.select().from(quotationResponses).where(eq35(quotationResponses.quotationRequestId, input.quotationRequestId));
    if (responses.length === 0) {
      throw new TRPCError26({ code: "BAD_REQUEST", message: "Nenhuma resposta recebida para esta solicita\xE7\xE3o" });
    }
    const requestItems = JSON.parse(req.itemsJson || "[]");
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const result = {
      suppliersCreated: 0,
      suppliersUpdated: 0,
      categoryId: 0,
      categoryName: req.title,
      catalogEntriesCreated: 0
    };
    const supplierIdByResponse = /* @__PURE__ */ new Map();
    for (const resp of responses) {
      if (!resp.supplierName?.trim()) continue;
      const trimmedName = resp.supplierName.trim();
      const existingRows = await db.execute(
        sql21`SELECT id, company_name, phone, whatsapp, email FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`
      );
      const existing = existingRows[0];
      if (existing.length === 0) {
        const [ins] = await db.insert(suppliers).values({
          companyName: resp.supplierName.trim(),
          cnpj: resp.cnpj ?? null,
          address: resp.address ?? null,
          phone: resp.sellerPhone ?? null,
          whatsapp: resp.sellerPhone ?? null,
          email: resp.sellerEmail ?? null,
          contactName: resp.sellerName ?? null,
          notes: resp.notes ?? null,
          isActive: 1
        });
        const newId = ins.insertId;
        supplierIdByResponse.set(resp.id, newId);
        result.suppliersCreated++;
      } else {
        const s = existing[0];
        const updates = {};
        if (!s.phone && resp.sellerPhone) updates.phone = resp.sellerPhone;
        if (!s.whatsapp && resp.sellerPhone) updates.whatsapp = resp.sellerPhone;
        if (!s.email && resp.sellerEmail) updates.email = resp.sellerEmail;
        if (Object.keys(updates).length > 0) {
          await db.update(suppliers).set(updates).where(eq35(suppliers.id, s.id));
          result.suppliersUpdated++;
        }
        supplierIdByResponse.set(resp.id, s.id);
      }
    }
    const catTitle = req.title.trim();
    const existingCatRows = await db.execute(
      sql21`SELECT id, name FROM purchase_categories WHERE name = ${catTitle} LIMIT 1`
    );
    const existingCat = existingCatRows[0];
    let categoryId;
    if (existingCat.length > 0) {
      categoryId = existingCat[0].id;
    } else {
      const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16"];
      const colorIndex = req.title.charCodeAt(0) % colors.length;
      const catColor = colors[colorIndex];
      const catName = req.title.trim();
      const createdById = ctx.user.id;
      const catInsResult = await db.execute(
        sql21`INSERT INTO purchase_categories (name, color, created_by, created_at) VALUES (${catName}, ${catColor}, ${createdById}, NOW())`
      );
      categoryId = catInsResult[0]?.insertId ?? catInsResult?.insertId ?? 0;
      if (!categoryId) {
        const fallbackRows = await db.execute(
          sql21`SELECT id FROM purchase_categories WHERE name = ${catName} LIMIT 1`
        );
        categoryId = fallbackRows[0][0]?.id ?? 0;
      }
    }
    result.categoryId = categoryId;
    for (const resp of responses) {
      const supplierId = supplierIdByResponse.get(resp.id);
      if (!supplierId) continue;
      const respItems = JSON.parse(resp.itemsJson || "[]");
      for (const item of respItems) {
        if (!item.price || parseFloat(item.price) <= 0) continue;
        const qNotes = item.brand ? `Marca: ${item.brand}${item.notes ? ` | ${item.notes}` : ""}` : item.notes || null;
        const qUnit = item.unit || "un";
        const qUnitPrice = item.price;
        const qTotalPrice = (parseFloat(item.price) * parseFloat(item.quantity || "1")).toFixed(2);
        const qQuotedAt = Date.now();
        const qCreatedBy = ctx.user.id;
        await db.execute(
          sql21`INSERT INTO quotations (supplier_id, category_id, product_name, unit, quantity, unit_price, total_price, currency, quoted_at, notes, created_by, created_at) VALUES (${supplierId}, ${categoryId}, ${item.name}, ${qUnit}, ${item.quantity || "1"}, ${qUnitPrice}, ${qTotalPrice}, 'BRL', ${qQuotedAt}, ${qNotes}, ${qCreatedBy}, NOW())`
        );
        result.catalogEntriesCreated++;
      }
    }
    const summaryItems = [];
    for (const reqItem of requestItems) {
      const key = reqItem.name.toLowerCase().trim();
      let bestPrice = Infinity;
      let bestSupplierName = "";
      let bestSupplierPhone = null;
      let found = false;
      for (const resp of responses) {
        const respItems = JSON.parse(resp.itemsJson || "[]");
        const match = respItems.find((it) => it.name.toLowerCase().trim() === key);
        if (match) {
          const price = parseFloat(match.price);
          if (!isNaN(price) && price > 0 && price < bestPrice) {
            bestPrice = price;
            bestSupplierName = resp.supplierName || "";
            bestSupplierPhone = resp.sellerPhone || null;
            found = true;
          }
        }
      }
      const qty = parseFloat(reqItem.quantity) || 1;
      summaryItems.push({
        name: reqItem.name,
        quantity: reqItem.quantity,
        unit: reqItem.unit || "un",
        bestPrice: found ? bestPrice : 0,
        bestSupplierName,
        bestSupplierPhone,
        subtotal: found ? bestPrice * qty : 0,
        found
      });
    }
    const grandTotal = summaryItems.reduce((sum, item) => sum + item.subtotal, 0);
    try {
      await notifyOwner({
        title: `\u2705 Or\xE7amento processado: ${req.title}`,
        content: `O or\xE7amento "${req.title}" foi processado.

\u2022 ${result.suppliersCreated} fornecedor(es) criado(s)
\u2022 ${result.catalogEntriesCreated} entradas no cat\xE1logo
\u2022 Total estimado: R$ ${grandTotal.toFixed(2).replace(".", ",")}`
      });
    } catch (_) {
    }
    return {
      ...result,
      quotationRequestId: input.quotationRequestId,
      quotationTitle: req.title,
      requesterName: req.requesterName ?? null,
      summaryItems,
      grandTotal,
      responseCount: responses.length
    };
  }),
  // ===== ROTAS PÚBLICAS (sem auth) =====
  // Fornecedor busca sua resposta existente pelo token + nome da empresa
  getMyResponse: publicProcedure.input(z36.object({ token: z36.string(), supplierName: z36.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { found: false };
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.token, input.token));
    if (!req) return { found: false };
    const responses = await db.select().from(quotationResponses).where(eq35(quotationResponses.quotationRequestId, req.id));
    const match = responses.find(
      (r) => r.supplierName?.toLowerCase().trim() === input.supplierName.toLowerCase().trim()
    );
    if (!match) return { found: false };
    return {
      found: true,
      response: {
        id: match.id,
        supplierName: match.supplierName,
        cnpj: match.cnpj,
        address: match.address,
        sellerName: match.sellerName,
        sellerPhone: match.sellerPhone,
        sellerEmail: match.sellerEmail,
        notes: match.notes,
        items: JSON.parse(match.itemsJson || "[]")
      }
    };
  }),
  // Fornecedor atualiza sua resposta existente (público)
  updateResponse: publicProcedure.input(z36.object({
    token: z36.string(),
    responseId: z36.number(),
    supplierName: z36.string().min(1),
    cnpj: z36.string().optional(),
    address: z36.string().optional(),
    sellerName: z36.string().optional(),
    sellerPhone: z36.string().optional(),
    sellerEmail: z36.string().optional(),
    items: z36.array(z36.object({
      name: z36.string(),
      quantity: z36.string(),
      unit: z36.string().optional(),
      price: z36.string(),
      brand: z36.string().optional(),
      notes: z36.string().optional()
    })).min(1),
    notes: z36.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.token, input.token));
    if (!req) throw new TRPCError26({ code: "NOT_FOUND", message: "Solicita\xE7\xE3o n\xE3o encontrada" });
    if (req.status === "cancelada") throw new TRPCError26({ code: "BAD_REQUEST", message: "Solicita\xE7\xE3o cancelada" });
    const [existing] = await db.select().from(quotationResponses).where(eq35(quotationResponses.id, input.responseId));
    if (!existing || existing.quotationRequestId !== req.id) {
      throw new TRPCError26({ code: "FORBIDDEN", message: "Resposta n\xE3o encontrada" });
    }
    await db.update(quotationResponses).set({
      supplierName: input.supplierName,
      cnpj: input.cnpj ?? null,
      address: input.address ?? null,
      sellerName: input.sellerName ?? null,
      sellerPhone: input.sellerPhone ?? null,
      sellerEmail: input.sellerEmail ?? null,
      itemsJson: JSON.stringify(input.items),
      notes: input.notes ?? null
    }).where(eq35(quotationResponses.id, input.responseId));
    try {
      await notifyOwner({
        title: `\u270F\uFE0F Or\xE7amento revisado: ${req.title}`,
        content: `O fornecedor "${input.supplierName}" atualizou sua resposta ao or\xE7amento "${req.title}".`
      });
    } catch (_) {
    }
    return { success: true };
  }),
  // Buscar solicitação por token (fornecedor acessa)
  getByToken: publicProcedure.input(z36.object({ token: z36.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { found: false };
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.token, input.token));
    if (!req) return { found: false };
    const isCancelled = req.status === "cancelada";
    return {
      found: true,
      isExpired: false,
      isCancelled,
      request: isCancelled ? null : {
        id: req.id,
        title: req.title,
        requesterName: req.requesterName,
        requesterPhone: req.requesterPhone,
        requesterEmail: req.requesterEmail,
        items: JSON.parse(req.itemsJson || "[]"),
        notes: req.notes,
        expiresAt: req.expiresAt
      }
    };
  }),
  // Fornecedor envia resposta (público)
  submitResponse: publicProcedure.input(
    z36.object({
      token: z36.string(),
      supplierName: z36.string().min(1),
      cnpj: z36.string().optional(),
      address: z36.string().optional(),
      sellerName: z36.string().optional(),
      sellerPhone: z36.string().optional(),
      sellerEmail: z36.string().optional(),
      items: z36.array(
        z36.object({
          name: z36.string(),
          quantity: z36.string(),
          unit: z36.string().optional(),
          price: z36.string(),
          brand: z36.string().optional(),
          notes: z36.string().optional()
        })
      ).min(1),
      notes: z36.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.token, input.token));
    if (!req) throw new TRPCError26({ code: "NOT_FOUND", message: "Solicita\xE7\xE3o n\xE3o encontrada" });
    if (req.status === "cancelada") throw new TRPCError26({ code: "BAD_REQUEST", message: "Solicita\xE7\xE3o cancelada" });
    const responseToken = crypto.randomBytes(32).toString("hex");
    const [insertResult] = await db.insert(quotationResponses).values({
      quotationRequestId: req.id,
      supplierName: input.supplierName,
      cnpj: input.cnpj,
      address: input.address,
      sellerName: input.sellerName,
      sellerPhone: input.sellerPhone,
      sellerEmail: input.sellerEmail,
      itemsJson: JSON.stringify(input.items),
      notes: input.notes,
      responseToken
    });
    const responseId = insertResult.insertId;
    await db.update(quotationRequests).set({ status: "respondida" }).where(eq35(quotationRequests.id, req.id));
    try {
      await notifyOwner({
        title: `\u{1F4EC} Nova resposta de or\xE7amento: ${req.title}`,
        content: `O fornecedor "${input.supplierName}" respondeu ao or\xE7amento "${req.title}" com ${input.items.length} item(s).`
      });
    } catch (_) {
    }
    return { success: true, responseToken, responseId };
  }),
  // Buscar resposta pelo responseToken (fornecedor acessa para revisar)
  getByResponseToken: publicProcedure.input(z36.object({ responseToken: z36.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { found: false };
    const [resp] = await db.select().from(quotationResponses).where(eq35(quotationResponses.responseToken, input.responseToken));
    if (!resp) return { found: false };
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.id, resp.quotationRequestId));
    if (!req) return { found: false };
    return {
      found: true,
      isCancelled: req.status === "cancelada",
      response: {
        id: resp.id,
        supplierName: resp.supplierName,
        cnpj: resp.cnpj,
        address: resp.address,
        sellerName: resp.sellerName,
        sellerPhone: resp.sellerPhone,
        sellerEmail: resp.sellerEmail,
        notes: resp.notes,
        createdAt: resp.createdAt,
        updatedAt: resp.updatedAt,
        items: JSON.parse(resp.itemsJson || "[]")
      },
      request: {
        id: req.id,
        title: req.title,
        requesterName: req.requesterName,
        items: JSON.parse(req.itemsJson || "[]"),
        notes: req.notes
      }
    };
  }),
  // Atualizar resposta pelo responseToken (fornecedor revisa)
  updateResponseByToken: publicProcedure.input(z36.object({
    responseToken: z36.string(),
    supplierName: z36.string().min(1),
    cnpj: z36.string().optional(),
    address: z36.string().optional(),
    sellerName: z36.string().optional(),
    sellerPhone: z36.string().optional(),
    sellerEmail: z36.string().optional(),
    items: z36.array(z36.object({
      name: z36.string(),
      quantity: z36.string(),
      unit: z36.string().optional(),
      price: z36.string(),
      brand: z36.string().optional(),
      notes: z36.string().optional()
    })).min(1),
    notes: z36.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError26({ code: "INTERNAL_SERVER_ERROR" });
    const [resp] = await db.select().from(quotationResponses).where(eq35(quotationResponses.responseToken, input.responseToken));
    if (!resp) throw new TRPCError26({ code: "NOT_FOUND", message: "Resposta n\xE3o encontrada" });
    const [req] = await db.select().from(quotationRequests).where(eq35(quotationRequests.id, resp.quotationRequestId));
    if (!req) throw new TRPCError26({ code: "NOT_FOUND", message: "Solicita\xE7\xE3o n\xE3o encontrada" });
    if (req.status === "cancelada") throw new TRPCError26({ code: "BAD_REQUEST", message: "Solicita\xE7\xE3o cancelada" });
    await db.update(quotationResponses).set({
      supplierName: input.supplierName,
      cnpj: input.cnpj ?? null,
      address: input.address ?? null,
      sellerName: input.sellerName ?? null,
      sellerPhone: input.sellerPhone ?? null,
      sellerEmail: input.sellerEmail ?? null,
      itemsJson: JSON.stringify(input.items),
      notes: input.notes ?? null
    }).where(eq35(quotationResponses.id, resp.id));
    try {
      await notifyOwner({
        title: `\u270F\uFE0F Or\xE7amento revisado: ${req.title}`,
        content: `O fornecedor "${input.supplierName}" atualizou sua resposta ao or\xE7amento "${req.title}".`
      });
    } catch (_) {
    }
    return { success: true };
  })
});

// server/routers/clientAdvances.ts
init_trpc();
init_db();
init_schema();
import { z as z37 } from "zod";
import { TRPCError as TRPCError27 } from "@trpc/server";
import { eq as eq36, desc as desc30, and as and21 } from "drizzle-orm";
var clientAdvancesRouter = router({
  // Listar adiantamentos de um cliente
  list: protectedProcedure.input(z37.object({ clientId: z37.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(clientAdvances).where(eq36(clientAdvances.clientId, input.clientId)).orderBy(desc30(clientAdvances.date));
  }),
  // Listar adiantamentos de um cliente (alias para uso no CargoControl)
  listByClient: protectedProcedure.input(z37.object({ clientId: z37.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(clientAdvances).where(eq36(clientAdvances.clientId, input.clientId)).orderBy(desc30(clientAdvances.date));
  }),
  // Listar todos os adiantamentos (para uso no PDF do CargoControl)
  listAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(clientAdvances).orderBy(desc30(clientAdvances.date));
  }),
  // Criar novo adiantamento
  create: protectedProcedure.input(z37.object({
    clientId: z37.number(),
    amount: z37.number().positive(),
    description: z37.string().optional(),
    receiptUrl: z37.string().optional(),
    date: z37.string(),
    startDate: z37.string().optional()
    // data de início dos abatimentos
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [client] = await db.select({ name: clients.name }).from(clients).where(eq36(clients.id, input.clientId));
    const clientName = client?.name || `Cliente #${input.clientId}`;
    const [result] = await db.insert(clientAdvances).values({
      clientId: input.clientId,
      amount: String(input.amount),
      balanceRemaining: String(input.amount),
      description: input.description,
      receiptUrl: input.receiptUrl,
      date: input.date,
      startDate: input.startDate || null,
      status: "ativo",
      createdBy: ctx.user.id
    });
    const advanceId = result.insertId;
    try {
      const refMonth = input.date.slice(0, 7);
      const desc32 = input.description ? `Adiantamento para ${clientName} - ${input.description}` : `Adiantamento para ${clientName}`;
      await db.insert(financialEntries).values({
        type: "despesa",
        category: "adiantamento_cliente",
        description: desc32,
        amount: String(input.amount),
        date: input.date,
        referenceMonth: refMonth,
        paymentMethod: "pix",
        status: "confirmado",
        clientId: input.clientId,
        clientName,
        notes: `Adiantamento ID #${advanceId} registrado automaticamente`,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
        autoGenerated: 1
      });
    } catch (e) {
      console.error("[clientAdvances] Erro ao lan\xE7ar no financeiro:", e);
    }
    return { id: advanceId };
  }),
  // Buscar saldo total de adiantamentos ativos de um cliente
  getBalance: protectedProcedure.input(z37.object({ clientId: z37.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const advances = await db.select().from(clientAdvances).where(and21(
      eq36(clientAdvances.clientId, input.clientId),
      eq36(clientAdvances.status, "ativo")
    ));
    const totalBalance = advances.reduce((sum, a) => sum + parseFloat(a.balanceRemaining || "0"), 0);
    return { totalBalance, advances };
  }),
  // Listar deduções de um adiantamento
  listDeductions: protectedProcedure.input(z37.object({ clientId: z37.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(clientAdvanceDeductions).where(eq36(clientAdvanceDeductions.clientId, input.clientId)).orderBy(desc30(clientAdvanceDeductions.date));
  }),
  // Listar TODAS as deduções (para o controle de cargas sem filtro de cliente)
  listAllDeductions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(clientAdvanceDeductions).orderBy(desc30(clientAdvanceDeductions.date));
  }),
  // Aplicar abatimento manual em um adiantamento (para fechamento semanal)
  applyDeduction: protectedProcedure.input(z37.object({
    advanceId: z37.number(),
    clientId: z37.number(),
    amount: z37.number().positive(),
    description: z37.string().optional(),
    weeklyClosingId: z37.number().optional(),
    cargoLoadId: z37.number().optional(),
    date: z37.string()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [advance] = await db.select().from(clientAdvances).where(eq36(clientAdvances.id, input.advanceId));
    if (!advance) throw new TRPCError27({ code: "NOT_FOUND", message: "Adiantamento n\xE3o encontrado" });
    const balanceBefore = parseFloat(advance.balanceRemaining || "0");
    if (balanceBefore <= 0) throw new TRPCError27({ code: "BAD_REQUEST", message: "Saldo insuficiente" });
    const deductAmount = Math.min(input.amount, balanceBefore);
    const balanceAfter = balanceBefore - deductAmount;
    await db.insert(clientAdvanceDeductions).values({
      advanceId: input.advanceId,
      clientId: input.clientId,
      cargoLoadId: input.cargoLoadId,
      weeklyClosingId: input.weeklyClosingId,
      amount: String(deductAmount),
      balanceBefore: String(balanceBefore),
      balanceAfter: String(balanceAfter),
      description: input.description,
      date: input.date
    });
    if (input.cargoLoadId && deductAmount > 0) {
      try {
        await db.update(cargoLoads).set({ paymentStatus: "pago", paidAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq36(cargoLoads.id, input.cargoLoadId));
      } catch (e) {
        console.error("[clientAdvances] Erro ao marcar carga como paga:", e);
      }
    }
    await db.update(clientAdvances).set({
      balanceRemaining: String(balanceAfter),
      status: balanceAfter <= 0 ? "quitado" : "ativo"
    }).where(eq36(clientAdvances.id, input.advanceId));
    return { deductAmount, balanceAfter };
  }),
  // Abatimento automático: aplica o saldo do adiantamento nas cargas entregues em ordem cronológica
  applyAutoDeductionByLoads: protectedProcedure.input(z37.object({
    clientId: z37.number(),
    advanceId: z37.number(),
    // Cargas a abater: array de { id, date, valueAmount } ordenadas da mais antiga para a mais nova
    loads: z37.array(z37.object({
      id: z37.number(),
      date: z37.string(),
      valueAmount: z37.number(),
      // valor em R$ desta carga
      description: z37.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [advance] = await db.select().from(clientAdvances).where(and21(eq36(clientAdvances.id, input.advanceId), eq36(clientAdvances.clientId, input.clientId)));
    if (!advance) throw new TRPCError27({ code: "NOT_FOUND", message: "Adiantamento n\xE3o encontrado" });
    let balanceRemaining = parseFloat(advance.balanceRemaining || "0");
    if (balanceRemaining <= 0) throw new TRPCError27({ code: "BAD_REQUEST", message: "Saldo do adiantamento j\xE1 esgotado" });
    const results = [];
    const sortedLoads = [...input.loads].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const load of sortedLoads) {
      if (balanceRemaining <= 0) {
        results.push({
          loadId: load.id,
          date: load.date,
          loadValue: load.valueAmount,
          deducted: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          status: "saldo_insuficiente"
        });
        continue;
      }
      const balanceBefore = balanceRemaining;
      const deducted = Math.min(load.valueAmount, balanceRemaining);
      const balanceAfter = balanceRemaining - deducted;
      try {
        await db.update(cargoLoads).set({ paymentStatus: "pago", paidAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq36(cargoLoads.id, load.id));
      } catch (e) {
        console.error("[clientAdvances] Erro ao marcar carga como paga:", e);
      }
      await db.insert(clientAdvanceDeductions).values({
        advanceId: input.advanceId,
        clientId: input.clientId,
        cargoLoadId: load.id,
        amount: String(deducted),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(balanceAfter),
        description: load.description || `Abatimento carga #${load.id} - ${new Date(load.date).toLocaleDateString("pt-BR")}`,
        date: load.date
      });
      balanceRemaining = balanceAfter;
      results.push({
        loadId: load.id,
        date: load.date,
        loadValue: load.valueAmount,
        deducted,
        balanceBefore,
        balanceAfter,
        status: deducted >= load.valueAmount ? "abatido_total" : "abatido_parcial"
      });
    }
    await db.update(clientAdvances).set({
      balanceRemaining: String(balanceRemaining),
      status: balanceRemaining <= 0 ? "quitado" : "ativo"
    }).where(eq36(clientAdvances.id, input.advanceId));
    return {
      results,
      finalBalance: balanceRemaining,
      totalDeducted: parseFloat(advance.balanceRemaining || "0") - balanceRemaining
    };
  }),
  // Upload de comprovante para um adiantamento
  uploadReceipt: protectedProcedure.input(z37.object({
    advanceId: z37.number(),
    fileBase64: z37.string(),
    mimeType: z37.string().default("image/jpeg")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const buffer = Buffer.from(input.fileBase64, "base64");
    const ext = input.mimeType.includes("pdf") ? "pdf" : input.mimeType.split("/")[1] || "jpg";
    const key = `client-advances/${input.advanceId}/comprovante-${Date.now()}.${ext}`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    await db.update(clientAdvances).set({ receiptUrl: url }).where(eq36(clientAdvances.id, input.advanceId));
    return { url };
  }),
  // Atualizar adiantamento (amount, description, date, receiptUrl)
  update: protectedProcedure.input(z37.object({
    id: z37.number(),
    amount: z37.number().positive().optional(),
    description: z37.string().optional().nullable(),
    date: z37.string().optional(),
    receiptUrl: z37.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [advance] = await db.select().from(clientAdvances).where(eq36(clientAdvances.id, input.id));
    if (!advance) throw new TRPCError27({ code: "NOT_FOUND", message: "Adiantamento n\xE3o encontrado" });
    const updateData = {};
    if (input.description !== void 0) updateData.description = input.description;
    if (input.date !== void 0) updateData.date = input.date;
    if (input.receiptUrl !== void 0) updateData.receiptUrl = input.receiptUrl;
    if (input.amount !== void 0) {
      const originalAmount = parseFloat(advance.amount || "0");
      const currentBalance = parseFloat(advance.balanceRemaining || "0");
      const deducted = originalAmount - currentBalance;
      const newBalance = Math.max(0, input.amount - deducted);
      updateData.amount = String(input.amount);
      updateData.balanceRemaining = String(newBalance);
      updateData.status = newBalance <= 0 ? "quitado" : "ativo";
    }
    await db.update(clientAdvances).set(updateData).where(eq36(clientAdvances.id, input.id));
    return { success: true };
  }),
  // Deletar adiantamento
  // Se force=true, remove deduções e reverte paymentStatus das cargas abatidas
  delete: protectedProcedure.input(z37.object({ id: z37.number(), force: z37.boolean().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError27({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const deductions = await db.select().from(clientAdvanceDeductions).where(eq36(clientAdvanceDeductions.advanceId, input.id));
    if (deductions.length > 0 && !input.force) {
      throw new TRPCError27({ code: "BAD_REQUEST", message: `Este adiantamento possui ${deductions.length} abatimento(s). Use a op\xE7\xE3o 'For\xE7ar exclus\xE3o' para remover tudo.` });
    }
    if (deductions.length > 0 && input.force) {
      const loadIds = deductions.map((d) => d.cargoLoadId).filter(Boolean);
      for (const loadId of loadIds) {
        try {
          const allCargoDeductions = await db.select().from(clientAdvanceDeductions).where(eq36(clientAdvanceDeductions.cargoLoadId, loadId));
          const otherDeductions = allCargoDeductions.filter((d) => d.advanceId !== input.id);
          const [cargo] = await db.select({ paymentStatus: cargoLoads.paymentStatus }).from(cargoLoads).where(eq36(cargoLoads.id, loadId));
          if (cargo?.paymentStatus === "pago" && otherDeductions.length === 0) {
            const thisAdvanceDeductions = allCargoDeductions.filter((d) => d.advanceId === input.id);
            const totalThisAdvance = thisAdvanceDeductions.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
            if (totalThisAdvance > 0) {
              await db.update(cargoLoads).set({ paymentStatus: "sem_boleto", paidAt: null }).where(eq36(cargoLoads.id, loadId));
            }
          }
        } catch (e) {
          console.error("[clientAdvances] Erro ao reverter carga:", e);
        }
      }
      await db.delete(clientAdvanceDeductions).where(eq36(clientAdvanceDeductions.advanceId, input.id));
    }
    await db.delete(clientAdvances).where(eq36(clientAdvances.id, input.id));
    return { success: true };
  })
});

// server/routers/thirdParty.ts
init_trpc();
init_db();
init_schema();
import { z as z38 } from "zod";
import { eq as eq37, desc as desc31, and as and22, gte as gte10, lte as lte10, inArray as inArray8 } from "drizzle-orm";
import { TRPCError as TRPCError28 } from "@trpc/server";
var thirdPartyRouter = router({
  // ===== TARIFAS DE FRETE =====
  listRates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(freightRates).orderBy(freightRates.worksite, freightRates.destination);
  }),
  createRate: protectedProcedure.input(z38.object({
    worksite: z38.string().min(1),
    destination: z38.string().min(1),
    ratePerTon: z38.string().min(1),
    notes: z38.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(freightRates).values({
      worksite: input.worksite,
      destination: input.destination,
      ratePerTon: input.ratePerTon,
      notes: input.notes
    });
    return { id: result.insertId };
  }),
  updateRate: protectedProcedure.input(z38.object({
    id: z38.number(),
    worksite: z38.string().min(1),
    destination: z38.string().min(1),
    ratePerTon: z38.string().min(1),
    notes: z38.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(freightRates).set({
      worksite: input.worksite,
      destination: input.destination,
      ratePerTon: input.ratePerTon,
      notes: input.notes ?? null
    }).where(eq37(freightRates.id, input.id));
    return { success: true };
  }),
  deleteRate: protectedProcedure.input(z38.object({ id: z38.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(freightRates).where(eq37(freightRates.id, input.id));
    return { success: true };
  }),
  // ===== ABASTECIMENTOS DE TERCEIRIZADOS =====
  // Retorna TANTO os registros de third_party_fuel QUANTO os fuel_records de caminhões terceirizados
  listFuel: protectedProcedure.input(z38.object({
    equipmentId: z38.number().optional(),
    startDate: z38.string().optional(),
    endDate: z38.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    const thirdPartyTrucks = await db.select({ id: equipment.id, name: equipment.name, thirdPartyOwner: equipment.thirdPartyOwner }).from(equipment).where(eq37(equipment.isThirdParty, 1));
    const thirdPartyIds = thirdPartyTrucks.map((t2) => t2.id);
    const ownerMap = new Map(thirdPartyTrucks.map((t2) => [t2.id, t2.thirdPartyOwner ?? null]));
    const startDate = input?.startDate;
    const endDate = input?.endDate;
    const filterEquipId = input?.equipmentId;
    const tpConditions = [];
    if (startDate) tpConditions.push(gte10(thirdPartyFuel.date, startDate + " 00:00:00"));
    if (endDate) tpConditions.push(lte10(thirdPartyFuel.date, endDate + " 23:59:59"));
    if (filterEquipId) tpConditions.push(eq37(thirdPartyFuel.equipmentId, filterEquipId));
    const tpFuelRows = await db.select({
      id: thirdPartyFuel.id,
      equipmentId: thirdPartyFuel.equipmentId,
      equipmentName: equipment.name,
      date: thirdPartyFuel.date,
      liters: thirdPartyFuel.liters,
      pricePerLiter: thirdPartyFuel.pricePerLiter,
      total: thirdPartyFuel.total,
      location: thirdPartyFuel.location,
      notes: thirdPartyFuel.notes,
      createdAt: thirdPartyFuel.createdAt
    }).from(thirdPartyFuel).leftJoin(equipment, eq37(thirdPartyFuel.equipmentId, equipment.id)).where(tpConditions.length > 0 ? and22(...tpConditions) : void 0).orderBy(desc31(thirdPartyFuel.date));
    let vehicleRecordsRows = [];
    if (thirdPartyIds.length > 0) {
      const vrConditions = [
        eq37(vehicleRecords.recordType, "abastecimento"),
        inArray8(vehicleRecords.equipmentId, thirdPartyIds)
      ];
      if (startDate) vrConditions.push(gte10(vehicleRecords.date, startDate + " 00:00:00"));
      if (endDate) vrConditions.push(lte10(vehicleRecords.date, endDate + " 23:59:59"));
      if (filterEquipId) vrConditions.push(eq37(vehicleRecords.equipmentId, filterEquipId));
      const vrRows = await db.select({
        id: vehicleRecords.id,
        equipmentId: vehicleRecords.equipmentId,
        equipmentName: equipment.name,
        date: vehicleRecords.date,
        liters: vehicleRecords.liters,
        pricePerLiter: vehicleRecords.pricePerLiter,
        total: vehicleRecords.fuelCost,
        location: vehicleRecords.supplier,
        notes: vehicleRecords.odometer,
        createdAt: vehicleRecords.createdAt
      }).from(vehicleRecords).leftJoin(equipment, eq37(vehicleRecords.equipmentId, equipment.id)).where(and22(...vrConditions)).orderBy(desc31(vehicleRecords.date));
      vehicleRecordsRows = vrRows.map((r) => ({
        ...r,
        fromVehicleRecords: true,
        notes: r.notes ? `Hod\xF4metro: ${r.notes}` : null
      }));
    }
    const combined = [
      ...tpFuelRows.map((r) => ({ ...r, fromVehicleRecords: false })),
      ...vehicleRecordsRows
    ].map((r) => ({ ...r, ownerName: ownerMap.get(r.equipmentId) ?? null })).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return combined;
  }),
  createFuel: protectedProcedure.input(z38.object({
    equipmentId: z38.number(),
    date: z38.string(),
    liters: z38.string(),
    pricePerLiter: z38.string(),
    total: z38.string(),
    location: z38.string().optional(),
    notes: z38.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(thirdPartyFuel).values({
      equipmentId: input.equipmentId,
      date: input.date,
      liters: input.liters,
      pricePerLiter: input.pricePerLiter,
      total: input.total,
      location: input.location,
      notes: input.notes,
      createdBy: ctx.user.id
    });
    const id = result.insertId;
    try {
      const eq210 = await db.select({ name: equipment.name }).from(equipment).where(eq37(equipment.id, input.equipmentId));
      const equipName = eq210[0]?.name ?? `Equipamento #${input.equipmentId}`;
      await db.insert(financialEntries).values({
        type: "despesa",
        category: "combustivel",
        description: `Combust\xEDvel terceirizado \u2014 ${equipName} (${input.liters}L @ R$${input.pricePerLiter}/L)`,
        amount: input.total,
        date: input.date.slice(0, 10),
        status: "confirmado",
        paymentMethod: "dinheiro",
        notes: input.notes ?? null,
        registeredBy: ctx.user.id
      });
    } catch (_) {
    }
    return { id };
  }),
  updateFuel: protectedProcedure.input(z38.object({
    id: z38.number(),
    equipmentId: z38.number(),
    date: z38.string(),
    liters: z38.string(),
    pricePerLiter: z38.string(),
    total: z38.string(),
    location: z38.string().optional(),
    notes: z38.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(thirdPartyFuel).set({
      equipmentId: input.equipmentId,
      date: input.date,
      liters: input.liters,
      pricePerLiter: input.pricePerLiter,
      total: input.total,
      location: input.location ?? null,
      notes: input.notes ?? null
    }).where(eq37(thirdPartyFuel.id, input.id));
    return { success: true };
  }),
  deleteFuel: protectedProcedure.input(z38.object({ id: z38.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(thirdPartyFuel).where(eq37(thirdPartyFuel.id, input.id));
    return { success: true };
  }),
  // ===== CAMINHÕES TERCEIRIZADOS =====
  listThirdPartyTrucks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(equipment).where(eq37(equipment.isThirdParty, 1));
  }),
  setThirdParty: protectedProcedure.input(z38.object({
    id: z38.number(),
    isThirdParty: z38.boolean(),
    thirdPartyOwner: z38.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(equipment).set({
      isThirdParty: input.isThirdParty ? 1 : 0,
      thirdPartyOwner: input.thirdPartyOwner ?? null
    }).where(eq37(equipment.id, input.id));
    return { success: true };
  }),
  // ===== LISTAGEM DE FRETES DE TERCEIRIZADOS =====
  // Lista cargas onde o veículo é terceirizado, com cálculo de valor de frete
  // Busca tarifa por: (1) worksite+destination exato, (2) worksite parcial + destination parcial
  listFreights: protectedProcedure.input(z38.object({
    startDate: z38.string().optional(),
    endDate: z38.string().optional(),
    equipmentId: z38.number().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    const thirdPartyTrucks = await db.select({ id: equipment.id, name: equipment.name, thirdPartyOwner: equipment.thirdPartyOwner }).from(equipment).where(eq37(equipment.isThirdParty, 1));
    if (thirdPartyTrucks.length === 0) return [];
    const truckIds = thirdPartyTrucks.map((t2) => t2.id);
    const truckMap = new Map(thirdPartyTrucks.map((t2) => [t2.id, t2]));
    const conditions = [];
    if (input?.startDate) conditions.push(gte10(cargoLoads.date, input.startDate + " 00:00:00"));
    if (input?.endDate) conditions.push(lte10(cargoLoads.date, input.endDate + " 23:59:59"));
    if (input?.equipmentId) conditions.push(eq37(cargoLoads.vehicleId, input.equipmentId));
    const allCargos = await db.select({
      id: cargoLoads.id,
      date: cargoLoads.date,
      vehicleId: cargoLoads.vehicleId,
      vehiclePlate: cargoLoads.vehiclePlate,
      driverName: cargoLoads.driverName,
      destination: cargoLoads.destination,
      weightNetKg: cargoLoads.weightNetKg,
      workLocationId: cargoLoads.workLocationId,
      thirdPartyPaid: cargoLoads.thirdPartyPaid,
      thirdPartyPaidAt: cargoLoads.thirdPartyPaidAt,
      thirdPartyPaymentNotes: cargoLoads.thirdPartyPaymentNotes,
      status: cargoLoads.status
    }).from(cargoLoads).where(conditions.length > 0 ? and22(...conditions) : void 0).orderBy(desc31(cargoLoads.date));
    const thirdPartyCargos = allCargos.filter((c) => c.vehicleId && truckIds.includes(c.vehicleId));
    const rates = await db.select().from(freightRates);
    const locationRows = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
    const locationMap = new Map(locationRows.map((l) => [l.id, l.name]));
    const result = await Promise.all(thirdPartyCargos.map(async (cargo) => {
      const truck = cargo.vehicleId ? truckMap.get(cargo.vehicleId) : null;
      const weightTons = parseFloat(cargo.weightNetKg || "0") / 1e3;
      const worksiteName = cargo.workLocationId ? locationMap.get(cargo.workLocationId) ?? "" : "";
      const destName = cargo.destination ?? "";
      const fuzzyMatch = (a, b) => {
        const aL = a.toLowerCase().trim();
        const bL = b.toLowerCase().trim();
        if (aL === bL) return true;
        if (aL.includes(bL) || bL.includes(aL)) return true;
        const bWords = bL.split(/\s+/).filter((w) => w.length > 2);
        return bWords.length > 0 && bWords.every((w) => aL.includes(w));
      };
      let matchingRate = rates.find(
        (r) => r.worksite.toLowerCase() === worksiteName.toLowerCase() && r.destination.toLowerCase() === destName.toLowerCase()
      );
      if (!matchingRate) {
        matchingRate = rates.find(
          (r) => fuzzyMatch(worksiteName, r.worksite) && fuzzyMatch(destName, r.destination)
        );
      }
      if (!matchingRate) {
        matchingRate = rates.find((r) => fuzzyMatch(destName, r.destination));
      }
      if (!matchingRate && worksiteName) {
        matchingRate = rates.find((r) => fuzzyMatch(worksiteName, r.worksite));
      }
      const grossFreight = matchingRate ? parseFloat(matchingRate.ratePerTon) * weightTons : 0;
      let fuelCost = 0;
      if (cargo.vehicleId) {
        const fuelConditions = [
          eq37(vehicleRecords.equipmentId, cargo.vehicleId),
          eq37(vehicleRecords.recordType, "abastecimento")
        ];
        if (input?.startDate) fuelConditions.push(gte10(vehicleRecords.date, input.startDate + " 00:00:00"));
        if (input?.endDate) fuelConditions.push(lte10(vehicleRecords.date, input.endDate + " 23:59:59"));
        const vehicleFuel = await db.select({ fuelCost: vehicleRecords.fuelCost }).from(vehicleRecords).where(and22(...fuelConditions));
        fuelCost = vehicleFuel.reduce((acc, f) => acc + parseFloat(f.fuelCost || "0"), 0);
      }
      const netFreight = grossFreight - fuelCost;
      return {
        ...cargo,
        truckName: truck?.name ?? cargo.vehiclePlate ?? "Desconhecido",
        truckOwner: truck?.thirdPartyOwner ?? null,
        worksiteName,
        weightTons,
        ratePerTon: matchingRate ? parseFloat(matchingRate.ratePerTon) : null,
        grossFreight,
        fuelCost,
        netFreight,
        hasRate: !!matchingRate,
        matchedRateWorksite: matchingRate?.worksite ?? null,
        matchedRateDestination: matchingRate?.destination ?? null
      };
    }));
    return result;
  }),
  // ===== MARCAR FRETE COMO PAGO =====
  markFreightPaid: protectedProcedure.input(z38.object({
    cargoLoadId: z38.number(),
    notes: z38.string().optional(),
    netAmount: z38.string(),
    grossAmount: z38.string(),
    fuelCost: z38.string(),
    truckName: z38.string().optional(),
    // Valor manual (quando não há tarifa cadastrada)
    manualAmount: z38.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError28({ code: "INTERNAL_SERVER_ERROR" });
    const now = /* @__PURE__ */ new Date();
    const nowStr = now.toISOString().slice(0, 10);
    const finalAmount = input.manualAmount && parseFloat(input.manualAmount) > 0 ? input.manualAmount : input.netAmount;
    await db.update(cargoLoads).set({
      thirdPartyPaid: 1,
      thirdPartyPaidAt: now,
      thirdPartyPaymentNotes: input.notes ?? null
    }).where(eq37(cargoLoads.id, input.cargoLoadId));
    try {
      const truckLabel = input.truckName ? ` \u2014 ${input.truckName}` : "";
      const isManual = input.manualAmount && parseFloat(input.manualAmount) > 0;
      const desc32 = isManual ? `Frete terceirizado${truckLabel} (Carga #${input.cargoLoadId}) | Valor manual: R$${finalAmount}` : `Frete terceirizado${truckLabel} (Carga #${input.cargoLoadId}) | Bruto: R$${input.grossAmount} - Comb: R$${input.fuelCost} = L\xEDq: R$${finalAmount}`;
      await db.insert(financialEntries).values({
        type: "despesa",
        category: "frete",
        description: desc32,
        amount: finalAmount,
        date: nowStr,
        status: "confirmado",
        paymentMethod: "pix",
        cargoLoadId: input.cargoLoadId,
        notes: input.notes ?? null,
        registeredBy: ctx.user.id
      });
    } catch (_) {
    }
    return { success: true };
  })
});

// server/routers.ts
import { z as z39 } from "zod";
init_db();
import { SignJWT } from "jose";

// server/email.ts
import nodemailer2 from "nodemailer";
async function createTransporter2() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer2.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }
  const testAccount = await nodemailer2.createTestAccount();
  console.log("[Email] Usando conta de teste Ethereal:", testAccount.user);
  return nodemailer2.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}
async function sendPasswordResetEmail(to, name, resetUrl) {
  try {
    const transporter = await createTransporter2();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BTREE Ambiental" <noreply@btreeambiental.com>',
      to,
      subject: "Recupera\xE7\xE3o de Senha - BTREE Ambiental",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo img { height: 60px; }
            h2 { color: #065f46; text-align: center; margin-bottom: 10px; }
            p { color: #4b5563; line-height: 1.6; }
            .btn { display: block; width: fit-content; margin: 30px auto; padding: 14px 32px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
            .warning { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png" alt="BTREE Ambiental" />
            </div>
            <h2>Recupera\xE7\xE3o de Senha</h2>
            <p>Ol\xE1, <strong>${name}</strong>!</p>
            <p>Recebemos uma solicita\xE7\xE3o para redefinir a senha da sua conta no <strong>BTREE Ambiental</strong>.</p>
            <p>Clique no bot\xE3o abaixo para criar uma nova senha. Este link \xE9 v\xE1lido por <strong>1 hora</strong>.</p>
            <a href="${resetUrl}" class="btn">Redefinir Minha Senha</a>
            <p class="warning">Se voc\xEA n\xE3o solicitou a recupera\xE7\xE3o de senha, ignore este email. Sua senha permanecer\xE1 a mesma.</p>
            <div class="footer">
              BTREE Ambiental - Sistema de Gest\xE3o de Reflorestamento<br/>
              Desenvolvido por Kobayashi
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Ol\xE1 ${name},

Clique no link abaixo para redefinir sua senha:
${resetUrl}

Este link expira em 1 hora.

Se n\xE3o solicitou, ignore este email.`
    });
    const previewUrl = nodemailer2.getTestMessageUrl(info) || void 0;
    if (previewUrl) {
      console.log("[Email] Preview URL:", previewUrl);
    }
    return { success: true, previewUrl: previewUrl || void 0 };
  } catch (error) {
    console.error("[Email] Erro ao enviar email:", error);
    return { success: false };
  }
}

// server/routers.ts
import crypto2 from "crypto";
async function createSessionToken(userId, email, name) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "btree-secret-key");
  const expiresAt = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1e3) / 1e3);
  return new SignJWT({ userId: String(userId), email, name }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expiresAt).sign(secret);
}
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  dashboard: dashboardRouter,
  debug: router({
    permissionsDebug: protectedProcedure.query(async ({ ctx }) => {
      try {
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const db = await getDb2();
        if (!db) return { error: "DB null" };
        const { sql: sql22 } = await import("drizzle-orm");
        const [permsRows] = await db.execute(sql22`SELECT * FROM user_permissions WHERE user_id = ${ctx.user.id}`);
        const [collabRows] = await db.execute(sql22`SELECT id, name, email, role, client_id, user_id, active FROM collaborators WHERE user_id = ${ctx.user.id}`);
        const [countRows] = await db.execute(sql22`SELECT COUNT(*) as cnt FROM collaborators WHERE active = 1`);
        const [colsRows] = await db.execute(sql22`SHOW COLUMNS FROM collaborators`);
        const [sampleRows] = await db.execute(sql22`SELECT id, name, user_id, client_id, active FROM collaborators WHERE active = 1 LIMIT 3`);
        let myPermsResult = null;
        try {
          const { collaborators: collabTable, userPermissions: upTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq38 } = await import("drizzle-orm");
          const permResult = await db.select().from(upTable).where(eq38(upTable.userId, ctx.user.id));
          const collabResult = await db.select({
            clientId: collabTable.clientId,
            role: collabTable.role
          }).from(collabTable).where(eq38(collabTable.userId, ctx.user.id));
          myPermsResult = {
            permResultLength: permResult.length,
            permResult: permResult[0] || null,
            collabResultLength: collabResult.length,
            collabResult: collabResult[0] || null,
            userIdType: typeof ctx.user.id,
            userIdValue: ctx.user.id
          };
        } catch (simErr) {
          myPermsResult = { simError: simErr.message };
        }
        return {
          currentUserId: ctx.user.id,
          currentUserRole: ctx.user.role,
          currentUserEmail: ctx.user.email,
          userPermissions: permsRows,
          collaboratorLinked: collabRows,
          totalActiveCollaborators: countRows,
          collaboratorColumns: colsRows,
          sampleCollaborators: sampleRows,
          myPermsSimulation: myPermsResult
        };
      } catch (err) {
        return { error: err.message, stack: err.stack?.slice(0, 500) };
      }
    }),
    attendanceTest: protectedProcedure.query(async () => {
      try {
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const db = await getDb2();
        if (!db) return { error: "DB null" };
        const [cols] = await db.execute(__require("drizzle-orm/sql").sql`SHOW COLUMNS FROM collaborator_attendance`);
        const [countResult] = await db.execute(__require("drizzle-orm/sql").sql`SELECT COUNT(*) as cnt FROM collaborator_attendance`);
        const { collaboratorAttendance: collaboratorAttendance2, collaborators: collaborators4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq38, desc: desc32 } = await import("drizzle-orm");
        try {
          const records = await db.select({
            id: collaboratorAttendance2.id,
            collaboratorId: collaboratorAttendance2.collaboratorId,
            date: collaboratorAttendance2.date,
            employmentType: collaboratorAttendance2.employmentTypeCa,
            paymentStatus: collaboratorAttendance2.paymentStatusCa
          }).from(collaboratorAttendance2).limit(5);
          return { cols, count: countResult, records, success: true };
        } catch (queryErr) {
          return { cols, count: countResult, queryError: queryErr.message, stack: queryErr.stack?.slice(0, 500) };
        }
      } catch (err) {
        return { error: err.message, stack: err.stack?.slice(0, 500) };
      }
    })
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z39.object({
      name: z39.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      email: z39.string().email("Email inv\xE1lido"),
      password: z39.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input, ctx }) => {
      try {
        const user = await registerUser(input);
        const sessionToken = await createSessionToken(user.id, user.email, user.name);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        return {
          success: true,
          user
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Erro ao registrar usu\xE1rio");
      }
    }),
    login: publicProcedure.input(z39.object({
      email: z39.string().email("Email inv\xE1lido"),
      password: z39.string().min(1, "Senha \xE9 obrigat\xF3ria")
    })).mutation(async ({ input, ctx }) => {
      try {
        const user = await loginUser(input.email, input.password);
        const sessionToken = await createSessionToken(user.id, user.email, user.name);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        return {
          success: true,
          user
        };
      } catch (error) {
        const msg = error?.message || "Erro ao fazer login";
        const cause = error?.cause?.message || error?.cause?.sqlMessage || "";
        console.error("[Login Error]", msg, cause ? `| Cause: ${cause}` : "", error?.stack);
        throw new Error(cause ? `${msg} | DB: ${cause}` : msg);
      }
    }),
    // Rota de seed para criar/atualizar admin (apenas para uso interno)
    seedAdmin: publicProcedure.input(z39.object({
      seedKey: z39.string(),
      email: z39.string().email(),
      name: z39.string(),
      password: z39.string().min(4)
    })).mutation(async ({ input }) => {
      if (input.seedKey !== "BTREE_SEED_2026") {
        throw new Error("Chave inv\xE1lida");
      }
      const passwordHash = await hashPassword(input.password);
      const result = await updateUserPasswordByEmail(input.email, passwordHash, "admin");
      return { success: true, message: `Admin ${input.email} ${result.action === "updated" ? "atualizado" : "criado"} com sucesso` };
    }),
    // Solicitar recuperação de senha
    forgotPassword: publicProcedure.input(z39.object({
      email: z39.string().email("Email inv\xE1lido"),
      origin: z39.string().url().optional()
    })).mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        return { success: true };
      }
      const token = crypto2.randomBytes(48).toString("hex");
      await createPasswordResetToken(user.id, token);
      const baseUrl = input.origin || "https://btreeambiental.com";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      return { success: true };
    }),
    // Redefinir senha com token
    resetPassword: publicProcedure.input(z39.object({
      token: z39.string().min(1),
      password: z39.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input }) => {
      const resetToken = await getValidResetToken(input.token);
      if (!resetToken) {
        throw new Error("Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha.");
      }
      const passwordHash = await hashPassword(input.password);
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { users: users4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq38 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.update(users4).set({ passwordHash, loginMethod: "email", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq38(users4.id, resetToken.userId));
      await markTokenAsUsed(resetToken.id);
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  collaborators: collaboratorsRouter,
  sectors: sectorsRouter,
  usersManagement: usersManagementRouter,
  cargoLoads: cargoLoadsRouter,
  machineHours: machineHoursRouter,
  vehicleRecords: vehicleRecordsRouter,
  parts: partsRouter,
  clients: clientsRouter,
  clientPortal: clientPortalRouter,
  clientAdvances: clientAdvancesRouter,
  collaboratorDocuments: collaboratorDocumentsRouter,
  equipmentDetail: equipmentDetailRouter,
  purchaseOrders: purchaseOrdersRouter,
  attendance: attendanceRouter,
  traccar: traccarRouter,
  permissions: permissionsRouter,
  chainsawModule: chainsawModuleRouter,
  extraExpenses: extraExpensesRouter,
  financial: financialRouter,
  gpsLocations: gpsLocationsRouter,
  reports: reportsRouter,
  auditData: auditDataRouter,
  reportPdf: reportPdfRouter,
  buyerClients: buyerClientsRouter,
  freight: freightRouter,
  notifications: notificationsRouter,
  fuelSuppliers: fuelSuppliersRouter,
  thirdPartyContractors: thirdPartyContractorsRouter,
  purchaseCategories: purchaseCategoriesRouter,
  freightCycles: freightCyclesRouter,
  suppliers: suppliersRouter,
  quotations: quotationsRouter,
  purchaseRequests: purchaseRequestsRouter,
  invoiceControl: invoiceControlRouter,
  quotationRequests: quotationRequestsRouter,
  thirdParty: thirdPartyRouter,
  // Procedure de migração para criar tabelas faltantes na produção
  migrations: router({
    run: publicProcedure.input(z39.object({ key: z39.string() })).mutation(async ({ input }) => {
      if (input.key !== "BTREE_SEED_2026") throw new Error("Chave inv\xE1lida");
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await getDb2();
      if (!db) throw new Error("Banco de dados n\xE3o dispon\xEDvel");
      const results = [];
      try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS financial_entries (
              id INT AUTO_INCREMENT PRIMARY KEY,
              type ENUM('receita','despesa') NOT NULL,
              category VARCHAR(100) NOT NULL,
              description VARCHAR(500) NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              date DATE NOT NULL,
              reference_month VARCHAR(7) NOT NULL,
              payment_method VARCHAR(50),
              notes TEXT,
              created_by INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        results.push("financial_entries: OK");
      } catch (e) {
        results.push("financial_entries: " + e.message);
      }
      try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS gps_locations (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(200) NOT NULL,
              latitude DECIMAL(10,8) NOT NULL,
              longitude DECIMAL(11,8) NOT NULL,
              radius_meters INT NOT NULL DEFAULT 500,
              is_active TINYINT(1) NOT NULL DEFAULT 1,
              notes TEXT,
              created_by INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        results.push("gps_locations: OK");
      } catch (e) {
        results.push("gps_locations: " + e.message);
      }
      return { success: true, results };
    })
  })
  // TODO: add feature routers heree, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
init_const();
init_db();
import { jwtVerify } from "jose";
function parseCookies(cookieHeader) {
  if (!cookieHeader) return /* @__PURE__ */ new Map();
  const map = /* @__PURE__ */ new Map();
  cookieHeader.split(";").forEach((part) => {
    const [key, ...val] = part.trim().split("=");
    if (key) map.set(key.trim(), decodeURIComponent(val.join("=")));
  });
  return map;
}
async function createContext(opts) {
  let user = null;
  try {
    const cookies = parseCookies(opts.req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    if (sessionCookie) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "btree-secret-key");
      const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ["HS256"] });
      const userId = payload.userId;
      const email = payload.email;
      if (userId) {
        user = await getUserById(parseInt(userId)) ?? null;
      } else if (email) {
        user = await getUserByEmail(email) ?? null;
      }
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
async function setupVite(app, server) {
  const { createServer: createViteServer } = await import("vite");
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    configFile: void 0,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist", "public") : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.path.replace("/manus-storage/", "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/index.ts
try {
  const envPath = path2.resolve(process.cwd(), ".env");
  dotenv.config({ path: envPath, override: true });
  console.log("[ENV] Loaded .env with override from:", envPath);
} catch (e) {
  console.log("[ENV] No .env override:", e);
}
async function runAutoMigrations() {
  try {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const db = await getDb2();
    if (!db) return;
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS buyer_clients (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        cnpj_cpf varchar(30),
        inscricao_estadual varchar(30),
        phone varchar(30),
        email varchar(255),
        address text,
        city varchar(100),
        state varchar(2),
        cep varchar(10),
        contact_person varchar(255),
        product varchar(255),
        payment_method varchar(100),
        price_per_unit varchar(20),
        unit varchar(20) DEFAULT 'ton',
        notes text,
        active tinyint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_clients_id PRIMARY KEY(id)
      )
    `
    );
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS buyer_price_history (
        id int AUTO_INCREMENT NOT NULL,
        buyer_id int NOT NULL,
        product varchar(255) NOT NULL,
        price_per_unit varchar(20) NOT NULL,
        unit varchar(20) NOT NULL DEFAULT 'ton',
        valid_from varchar(10),
        valid_until varchar(10),
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_price_history_id PRIMARY KEY(id)
      )
    `
    );
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS buyer_payments (
        id int AUTO_INCREMENT NOT NULL,
        buyer_id int NOT NULL,
        amount varchar(20) NOT NULL,
        payment_date varchar(10) NOT NULL,
        payment_method varchar(50),
        invoice_number varchar(50),
        notes text,
        status enum('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_payments_id PRIMARY KEY(id)
      )
    `
    );
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS freight_calculations (
        id int AUTO_INCREMENT NOT NULL,
        cargo_load_id int,
        date varchar(10) NOT NULL,
        vehicle_plate varchar(20),
        driver_name varchar(255),
        driver_type enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
        origin varchar(255),
        destination varchar(255),
        distance_km varchar(20),
        fuel_liters varchar(20),
        fuel_cost_per_liter varchar(20),
        fuel_total_cost varchar(20),
        driver_cost varchar(20),
        toll_cost varchar(20),
        maintenance_cost varchar(20),
        other_costs varchar(20),
        other_costs_description text,
        total_cost varchar(20),
        cost_per_km varchar(20),
        cost_per_ton varchar(20),
        weight_ton varchar(20),
        revenue_per_ton varchar(20),
        total_revenue varchar(20),
        profit varchar(20),
        notes text,
        created_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT freight_calculations_id PRIMARY KEY(id)
      )
    `
    );
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE buyer_clients ADD COLUMN price_per_unit varchar(20)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE buyer_clients ADD COLUMN unit varchar(20) DEFAULT 'ton'`
      );
    } catch (e) {
    }
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS client_documents (
        id int AUTO_INCREMENT NOT NULL,
        client_id int NOT NULL,
        type enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
        title varchar(255) NOT NULL,
        file_url varchar(1000) NOT NULL,
        file_type varchar(50),
        notes text,
        uploaded_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT client_documents_id PRIMARY KEY(id)
      )
    `
    );
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE client_documents DROP FOREIGN KEY client_documents_ibfk_1`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE client_documents DROP FOREIGN KEY client_documents_uploaded_by_users_id_fk`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE client_documents DROP FOREIGN KEY client_documents_client_id_clients_id_fk`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE users ADD COLUMN password_hash varchar(255)`
      );
      console.log("[AutoMigration] Added password_hash column to users");
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE users ADD COLUMN lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE users ADD COLUMN loginMethod varchar(64) NOT NULL DEFAULT 'email'`
      );
    } catch (e) {
    }
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS fuel_suppliers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        trade_name varchar(255),
        cnpj varchar(20),
        phone varchar(30),
        email varchar(255),
        contact_name varchar(255),
        address text,
        city varchar(100),
        state varchar(2),
        fuel_type enum('diesel','gasolina','etanol','gnv') NOT NULL DEFAULT 'diesel',
        price_per_liter varchar(20) NOT NULL,
        location_type enum('simflor','astorga','postos') NOT NULL DEFAULT 'simflor',
        location varchar(255),
        work_location_id int,
        is_active tinyint NOT NULL DEFAULT 1,
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fuel_suppliers_id PRIMARY KEY(id)
      )
    `
    );
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN trade_name varchar(255)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN cnpj varchar(20)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN phone varchar(30)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN email varchar(255)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN contact_name varchar(255)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN address text`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN city varchar(100)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN state varchar(2)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN location_type enum('simflor','astorga','postos') NOT NULL DEFAULT 'simflor'`
      );
    } catch (e) {
    }
    const cargoColsToAdd = [
      { col: "humidity", def: "varchar(20)" },
      { col: "delivery_date", def: "timestamp NULL" },
      { col: "received_by_buyer", def: "varchar(255)" },
      { col: "received_at", def: "timestamp NULL" },
      { col: "weight_net_kg", def: "varchar(20)" },
      { col: "weight_in_kg", def: "varchar(20)" },
      { col: "weight_out_kg", def: "varchar(20)" },
      { col: "weight_in_photo_url", def: "text" },
      { col: "weight_out_photo_url", def: "text" },
      { col: "tracking_status", def: "varchar(50) DEFAULT 'em_carregamento'" },
      { col: "tracking_notes", def: "text" },
      { col: "tracking_updated_at", def: "timestamp NULL" },
      { col: "photos_json", def: "text" },
      { col: "boleto_amount", def: "varchar(20)" },
      { col: "boleto_due_date", def: "timestamp NULL" },
      { col: "boleto_url", def: "text" },
      { col: "paid_at", def: "timestamp NULL" },
      { col: "payment_status", def: "varchar(30) DEFAULT 'pendente'" },
      { col: "payment_receipt_url", def: "text" },
      { col: "invoice_url", def: "text" },
      { col: "final_height_m", def: "varchar(20)" },
      { col: "final_width_m", def: "varchar(20)" },
      { col: "final_length_m", def: "varchar(20)" },
      { col: "final_volume_m3", def: "varchar(20)" },
      { col: "images_urls", def: "text" },
      { col: "receiver_name", def: "varchar(255)" },
      { col: "third_party_contractor", def: "varchar(255)" },
      { col: "third_party_cost", def: "varchar(20)" }
    ];
    for (const { col, def } of cargoColsToAdd) {
      try {
        await db.execute(
          /*sql*/
          `ALTER TABLE cargo_loads ADD COLUMN ${col} ${def}`
        );
        console.log(`[AutoMigration] Added ${col} column to cargo_loads`);
      } catch (e) {
      }
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE financial_entries ADD COLUMN cargo_load_id int`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE financial_entries ADD COLUMN auto_generated int DEFAULT 0`
      );
    } catch (e) {
    }
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS fuel_price_history (
        id int AUTO_INCREMENT NOT NULL,
        supplier_id int NOT NULL,
        old_price varchar(20) NOT NULL,
        new_price varchar(20) NOT NULL,
        changed_by int,
        changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fuel_price_history_id PRIMARY KEY(id)
      )
    `
    );
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS fuel_invoices (
        id int AUTO_INCREMENT NOT NULL,
        supplier_id int NOT NULL,
        invoice_number varchar(50) NOT NULL,
        invoice_date varchar(10) NOT NULL,
        due_date varchar(10) NOT NULL,
        total_amount varchar(20) NOT NULL,
        liters varchar(20),
        price_per_liter varchar(20),
        fuel_type enum('diesel','gasolina','etanol','gnv') DEFAULT 'diesel',
        payment_method varchar(50),
        bank_name varchar(100),
        barcode_number varchar(100),
        status enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
        paid_at varchar(10),
        paid_amount varchar(20),
        transporter_name varchar(255),
        transporter_plate varchar(20),
        delivery_location varchar(100),
        notes text,
        registered_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fuel_invoices_id PRIMARY KEY(id)
      )
    `
    );
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_invoices ADD COLUMN invoice_photo_url text`
      );
    } catch (e) {
      if (!e.message?.includes("Duplicate")) console.log("[AutoMigration] invoice_photo_url:", e.message);
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_invoices ADD COLUMN boleto_photo_url text`
      );
    } catch (e) {
      if (!e.message?.includes("Duplicate")) console.log("[AutoMigration] boleto_photo_url:", e.message);
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE vehicle_records ADD COLUMN fuel_invoice_id int`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN tank_capacity varchar(20)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN tank_alert_threshold varchar(5) DEFAULT '20'`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_invoices ADD COLUMN liters_used varchar(20) DEFAULT '0'`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_vehicle_id_equipment_id_fk`
      );
      console.log("[AutoMigration] Dropped FK cargo_loads_vehicle_id_equipment_id_fk");
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_driver_collaborator_id_collaborators_id_fk`
      );
      console.log("[AutoMigration] Dropped FK cargo_loads_driver_collaborator_id_collaborators_id_fk");
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_client_id_clients_id_fk`
      );
      console.log("[AutoMigration] Dropped FK cargo_loads_client_id_clients_id_fk");
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_registered_by_users_id_fk`
      );
      console.log("[AutoMigration] Dropped FK cargo_loads_registered_by_users_id_fk");
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_destination_id_cargo_destinations_id_fk`
      );
      console.log("[AutoMigration] Dropped FK cargo_loads_destination_id_cargo_destinations_id_fk");
    } catch (e) {
    }
    try {
      const fks = await db.execute(
        /*sql*/
        `
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `
      );
      const fkList = Array.isArray(fks) ? fks : [];
      for (const fk of fkList) {
        if (fk && fk.CONSTRAINT_NAME) {
          try {
            await db.execute(
              /*sql*/
              `ALTER TABLE cargo_loads DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
            );
            console.log("[AutoMigration] Dropped remaining FK:", fk.CONSTRAINT_NAME);
          } catch (e) {
          }
        }
      }
    } catch (e) {
      console.log("[AutoMigration] Could not query remaining FKs:", e?.message);
    }
    try {
      await db.execute(
        /*sql*/
        `
        CREATE TABLE IF NOT EXISTS third_party_contractors (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(255) NOT NULL,
          rate_per_m3 varchar(20) NOT NULL DEFAULT '0',
          phone varchar(30),
          notes text,
          is_active tinyint NOT NULL DEFAULT 1,
          created_by int,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT third_party_contractors_id PRIMARY KEY(id)
        )
      `
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_destinations ADD COLUMN client_id int NULL`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_destinations ADD COLUMN price_per_ton varchar(20) NULL`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_destinations ADD COLUMN price_per_m3 varchar(20) NULL`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE cargo_destinations ADD COLUMN price_type varchar(10) NULL DEFAULT 'ton'`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN vendor_name varchar(255)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE fuel_suppliers ADD COLUMN manager_name varchar(255)`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE equipment ADD COLUMN invoice_url text`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE equipment ADD COLUMN document_url text`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE equipment ADD COLUMN insurance_url text`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE equipment ADD COLUMN responsible_driver_id int`
      );
    } catch (e) {
    }
    try {
      await db.execute(
        /*sql*/
        `ALTER TABLE extra_expenses MODIFY COLUMN payment_method enum('dinheiro','pix','credito','debito','transferencia','boleto','outros') NOT NULL DEFAULT 'pix'`
      );
    } catch (e) {
    }
    await db.execute(
      /*sql*/
      `
      CREATE TABLE IF NOT EXISTS oil_stock (
        id int AUTO_INCREMENT NOT NULL,
        oil_type enum('hidraulico','motor','transmissao','diferencial','outros') NOT NULL DEFAULT 'hidraulico',
        brand varchar(255) NOT NULL,
        quantity_liters varchar(20) NOT NULL DEFAULT '0',
        purchase_quantity_liters varchar(20),
        price_per_liter varchar(20),
        total_value varchar(20),
        photo_url text,
        supplier varchar(255),
        notes text,
        registered_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT oil_stock_id PRIMARY KEY(id)
      )
    `
    );
    console.log("[AutoMigration] Tables verified/created successfully");
  } catch (err) {
    console.error("[AutoMigration] Error:", err);
  }
}
async function startServer() {
  await runAutoMigrations();
  const app = express2();
  const server = createServer(app);
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = [
        "https://btreeambiental.com",
        "https://www.btreeambiental.com",
        "http://btreeambiental.com",
        "http://www.btreeambiental.com",
        "http://localhost:5173",
        "http://localhost:3000"
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  }));
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.get("/api/db-diagnostic", async (req, res) => {
    try {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await getDb2();
      if (!db) {
        return res.json({ error: "Database not available", DATABASE_URL_SET: !!process.env.DATABASE_URL });
      }
      let columns = null;
      try {
        columns = await db.execute(
          /*sql*/
          `SHOW COLUMNS FROM users`
        );
      } catch (e) {
        columns = { error: e.message, cause: e.cause?.message };
      }
      let rawSelect = null;
      try {
        rawSelect = await db.execute(
          /*sql*/
          `SELECT * FROM users LIMIT 1`
        );
      } catch (e) {
        rawSelect = { error: e.message, cause: e.cause?.message };
      }
      let drizzleSelect = null;
      try {
        drizzleSelect = await db.execute(
          /*sql*/
          `SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, password_hash FROM users LIMIT 1`
        );
      } catch (e) {
        drizzleSelect = { error: e.message, cause: e.cause?.message };
      }
      let backtickSelect = null;
      try {
        backtickSelect = await db.execute(
          /*sql*/
          `SELECT \`id\`, \`openId\`, \`name\`, \`email\`, \`loginMethod\`, \`role\`, \`createdAt\`, \`updatedAt\`, \`lastSignedIn\`, \`password_hash\` FROM \`users\` LIMIT 1`
        );
      } catch (e) {
        backtickSelect = { error: e.message, cause: e.cause?.message };
      }
      return res.json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        node_version: process.version,
        columns,
        rawSelect,
        drizzleSelect,
        backtickSelect
      });
    } catch (e) {
      return res.status(500).json({ error: e.message, stack: e.stack });
    }
  });
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const url = req.query.url;
      if (!url || !url.startsWith("http")) {
        return res.status(400).json({ error: "Invalid URL" });
      }
      const allowed = [
        "d2xsxph8kpxj0f.cloudfront.net",
        "api.qrserver.com",
        "btreeambiental.com",
        "res.cloudinary.com",
        "cloudinary.com",
        "amazonaws.com"
      ];
      const urlObj = new URL(url);
      if (!allowed.some((d) => urlObj.hostname.endsWith(d))) {
        return res.status(403).json({ error: "Domain not allowed" });
      }
      const https = await import("https");
      const http = await import("http");
      const protocol = urlObj.protocol === "https:" ? https : http;
      const chunks = [];
      await new Promise((resolve, reject) => {
        protocol.default.get(url, (imgRes) => {
          imgRes.on("data", (chunk) => chunks.push(chunk));
          imgRes.on("end", () => resolve());
          imgRes.on("error", reject);
        }).on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      let contentType = "image/png";
      if (buffer[0] === 255 && buffer[1] === 216) contentType = "image/jpeg";
      else if (buffer[0] === 71 && buffer[1] === 73) contentType = "image/gif";
      else if (buffer[0] === 82 && buffer[1] === 73) contentType = "image/webp";
      const base64 = buffer.toString("base64");
      res.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}
startServer().catch(console.error);
function schedulePendingPaymentsCheck() {
  const checkAndSchedule = async () => {
    const now = /* @__PURE__ */ new Date();
    const next = new Date(now);
    const dayOfWeek = next.getDay();
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
        const { collaboratorAttendance: collaboratorAttendance2, collaborators: collaborators4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq38, and: and23, lt: lt2 } = await import("drizzle-orm");
        const db = await getDb2();
        if (!db) return;
        const sevenDaysAgo = /* @__PURE__ */ new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const pendingRecords = await db.select({
          id: collaboratorAttendance2.id,
          collaboratorName: collaborators4.name,
          date: collaboratorAttendance2.date,
          dailyValue: collaboratorAttendance2.dailyValue
        }).from(collaboratorAttendance2).innerJoin(collaborators4, eq38(collaboratorAttendance2.collaboratorId, collaborators4.id)).where(and23(
          eq38(collaboratorAttendance2.paymentStatusCa, "pendente"),
          lt2(collaboratorAttendance2.date, sevenDaysAgo)
        ));
        if (pendingRecords.length > 0) {
          const totalGeral = pendingRecords.reduce((sum, r) => sum + parseFloat(r.dailyValue || "0"), 0);
          const byCollab = {};
          for (const r of pendingRecords) {
            if (!byCollab[r.collaboratorName]) byCollab[r.collaboratorName] = { count: 0, total: 0 };
            byCollab[r.collaboratorName].count++;
            byCollab[r.collaboratorName].total += parseFloat(r.dailyValue || "0");
          }
          const lines = Object.entries(byCollab).map(([name, d]) => `\u2022 ${name}: ${d.count} dia(s) \u2014 R$ ${d.total.toFixed(2)}`).join("\n");
          await notifyOwner2({
            title: `\u26A0\uFE0F Alerta semanal: ${pendingRecords.length} pagamento(s) pendente(s)`,
            content: `Relat\xF3rio semanal de pagamentos pendentes h\xE1 mais de 7 dias.

Total: R$ ${totalGeral.toFixed(2)}

${lines}

Acesse o sistema para realizar os pagamentos.`
          }).catch(() => {
          });
          console.log(`[CronJob] Notificou ${pendingRecords.length} pagamentos pendentes.`);
        } else {
          console.log("[CronJob] Nenhum pagamento pendente h\xE1 mais de 7 dias.");
        }
      } catch (err) {
        console.error("[CronJob] Erro ao verificar pagamentos pendentes:", err);
      }
      checkAndSchedule();
    }, msUntilNext);
    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob] Pr\xF3xima verifica\xE7\xE3o de pagamentos pendentes: ${nextDate.toLocaleString("pt-BR")}`);
  };
  checkAndSchedule();
}
schedulePendingPaymentsCheck();
function scheduleFuelInvoiceDueCheck() {
  const checkAndSchedule = async () => {
    const now = /* @__PURE__ */ new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const mysql4 = await import("mysql2/promise");
        const conn = await mysql4.createConnection({
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "3306"),
          user: process.env.DB_USER || "",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || ""
        });
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
        const [rows] = await conn.execute(
          `SELECT fi.*, fs.name as supplier_name, fs.trade_name as supplier_trade_name
           FROM fuel_invoices fi
           LEFT JOIN fuel_suppliers fs ON fi.supplier_id = fs.id
           WHERE fi.status = 'pendente'
           AND fi.due_date <= ?
           ORDER BY fi.due_date ASC`,
          [threeDaysLater]
        );
        await conn.end();
        if (rows.length > 0) {
          const overdue = rows.filter((r) => r.due_date < today);
          const dueSoon = rows.filter((r) => r.due_date >= today && r.due_date <= threeDaysLater);
          let message = "";
          if (overdue.length > 0) {
            const totalOverdue = overdue.reduce((s, r) => s + parseFloat(r.total_amount || "0"), 0);
            message += `\u{1F534} VENCIDOS (${overdue.length}):
`;
            for (const inv of overdue) {
              message += `\u2022 ${inv.supplier_name} \u2014 NF ${inv.invoice_number} \u2014 R$ ${inv.total_amount} \u2014 Venc: ${inv.due_date.split("-").reverse().join("/")}
`;
            }
            message += `Total vencido: R$ ${totalOverdue.toFixed(2)}

`;
          }
          if (dueSoon.length > 0) {
            const totalDueSoon = dueSoon.reduce((s, r) => s + parseFloat(r.total_amount || "0"), 0);
            message += `\u{1F7E1} VENCE EM AT\xC9 3 DIAS (${dueSoon.length}):
`;
            for (const inv of dueSoon) {
              message += `\u2022 ${inv.supplier_name} \u2014 NF ${inv.invoice_number} \u2014 R$ ${inv.total_amount} \u2014 Venc: ${inv.due_date.split("-").reverse().join("/")}
`;
            }
            message += `Total: R$ ${totalDueSoon.toFixed(2)}
`;
          }
          try {
            const { notifyFinanceiro: notifyFinanceiro2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
            await notifyFinanceiro2({
              type: "pagamento_boleto",
              title: `\u26A0\uFE0F Boletos combust\xEDvel: ${overdue.length} vencido(s), ${dueSoon.length} pr\xF3ximo(s)`,
              message
            });
          } catch (e) {
            console.warn("[CronJob-Fuel] Error notifying financeiro:", e);
          }
          try {
            const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
            await notifyOwner2({
              title: `\u26A0\uFE0F Boletos combust\xEDvel: ${overdue.length} vencido(s), ${dueSoon.length} pr\xF3ximo(s)`,
              content: message
            });
          } catch (e) {
            console.warn("[CronJob-Fuel] Error notifying owner:", e);
          }
          console.log(`[CronJob-Fuel] Notificou ${rows.length} boletos (${overdue.length} vencidos, ${dueSoon.length} pr\xF3ximos).`);
        } else {
          console.log("[CronJob-Fuel] Nenhum boleto de combust\xEDvel pendente ou pr\xF3ximo do vencimento.");
        }
      } catch (err) {
        console.error("[CronJob-Fuel] Erro ao verificar boletos:", err);
      }
      checkAndSchedule();
    }, msUntilNext);
    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob-Fuel] Pr\xF3xima verifica\xE7\xE3o de boletos combust\xEDvel: ${nextDate.toLocaleString("pt-BR")}`);
  };
  checkAndSchedule();
}
scheduleFuelInvoiceDueCheck();
function scheduleWeeklyClosingCron() {
  const checkAndSchedule = async () => {
    const now = /* @__PURE__ */ new Date();
    const next = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    if (now.getDay() === 5 && now.getHours() >= 22) {
      next.setDate(now.getDate() + 7);
    } else if (now.getDay() === 5 && now.getHours() < 22) {
      next.setDate(now.getDate());
    } else {
      next.setDate(now.getDate() + daysUntilFriday);
    }
    next.setHours(22, 0, 0, 0);
    const msUntilNext = Math.max(next.getTime() - now.getTime(), 6e4);
    setTimeout(async () => {
      try {
        console.log("[CronJob-WeeklyClosing] Iniciando fechamento semanal autom\xE1tico...");
        const mysql4 = await import("mysql2/promise");
        const conn = await mysql4.createConnection({
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "3306"),
          user: process.env.DB_USER || "",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || ""
        });
        const today = /* @__PURE__ */ new Date();
        const day = today.getDay();
        const diffToSaturday = day >= 6 ? 0 : -(day + 1);
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToSaturday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        const [clientRows] = await conn.execute(
          `SELECT id, name, price_per_ton, payment_term_days, billing_cycle FROM clients WHERE active = 1`
        );
        let closedCount = 0;
        for (const client of clientRows) {
          const [existing] = await conn.execute(
            `SELECT id FROM cargo_weekly_closings WHERE client_id = ? AND DATE(week_start) = ?`,
            [client.id, weekStartStr]
          );
          if (existing.length > 0) {
            console.log(`[CronJob-WeeklyClosing] Cliente ${client.name} j\xE1 tem fechamento para semana ${weekStartStr}. Pulando.`);
            continue;
          }
          const [loadsInWeek] = await conn.execute(
            `SELECT weight_net_kg, weight_out_kg FROM cargo_loads 
             WHERE client_id = ? AND DATE(COALESCE(delivery_date, date)) >= ? AND DATE(COALESCE(delivery_date, date)) <= ?`,
            [client.id, weekStartStr, weekEndStr]
          );
          if (loadsInWeek.length === 0) {
            continue;
          }
          const totalLoads = loadsInWeek.length;
          const totalWeightKg = loadsInWeek.reduce((sum, l) => {
            return sum + parseFloat(l.weight_net_kg || l.weight_out_kg || "0");
          }, 0);
          const pricePerTon = parseFloat(client.price_per_ton || "130");
          const totalWeightTon = totalWeightKg / 1e3;
          const totalAmount = (totalWeightTon * pricePerTon).toFixed(2);
          const paymentTermDays = client.payment_term_days || 21;
          const dueDate = new Date(weekEnd);
          dueDate.setDate(dueDate.getDate() + paymentTermDays);
          const dueDateStr = dueDate.toISOString().slice(0, 10) + " 12:00:00";
          const nowStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
          await conn.execute(
            `INSERT INTO cargo_weekly_closings 
             (client_id, week_start, week_end, total_loads, total_weight_kg, total_amount, price_per_ton, due_date, status, notes, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'fechado', ?, ?)`,
            [
              client.id,
              weekStartStr + " 12:00:00",
              weekEndStr + " 12:00:00",
              totalLoads,
              totalWeightKg.toFixed(2),
              totalAmount,
              pricePerTon.toString(),
              dueDateStr,
              "Fechamento autom\xE1tico (sexta-feira)",
              nowStr
            ]
          );
          closedCount++;
          console.log(`[CronJob-WeeklyClosing] Fechamento criado: ${client.name} \u2014 ${totalLoads} cargas \u2014 ${totalWeightTon.toFixed(2)} ton \u2014 R$ ${totalAmount}`);
        }
        await conn.end();
        if (closedCount > 0) {
          try {
            const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
            await notifyOwner2({
              title: `Fechamento semanal autom\xE1tico: ${closedCount} cliente(s)`,
              content: `Fechamentos da semana ${weekStartStr.split("-").reverse().join("/")} a ${weekEndStr.split("-").reverse().join("/")} foram criados automaticamente para ${closedCount} cliente(s).`
            });
          } catch (e) {
            console.warn("[CronJob-WeeklyClosing] Error notifying owner:", e);
          }
          try {
            const { notifyAdmComercial: notifyAdmComercial2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
            await notifyAdmComercial2({
              type: "fechamento_semanal",
              title: `Fechamento semanal autom\xE1tico: ${closedCount} cliente(s)`,
              message: `Semana ${weekStartStr.split("-").reverse().join("/")} a ${weekEndStr.split("-").reverse().join("/")}: ${closedCount} fechamento(s) criado(s) automaticamente.`
            });
          } catch (e) {
            console.warn("[CronJob-WeeklyClosing] Error notifying adm:", e);
          }
        }
        console.log(`[CronJob-WeeklyClosing] Conclu\xEDdo. ${closedCount} fechamento(s) criado(s).`);
      } catch (err) {
        console.error("[CronJob-WeeklyClosing] Erro:", err);
      }
      checkAndSchedule();
    }, msUntilNext);
    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob-WeeklyClosing] Pr\xF3ximo fechamento autom\xE1tico: ${nextDate.toLocaleString("pt-BR")}`);
  };
  checkAndSchedule();
}
scheduleWeeklyClosingCron();
