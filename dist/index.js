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

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendanceRecords: () => attendanceRecords,
  biometricAttendance: () => biometricAttendance,
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
  equipmentPhotos: () => equipmentPhotos,
  equipmentTypes: () => equipmentTypes,
  extraExpenses: () => extraExpenses,
  financialEntries: () => financialEntries,
  fuelContainerEvents: () => fuelContainerEvents,
  fuelContainers: () => fuelContainers,
  fuelRecords: () => fuelRecords,
  gpsDeviceLinks: () => gpsDeviceLinks,
  gpsHoursLog: () => gpsHoursLog,
  gpsLocations: () => gpsLocations,
  machineFuel: () => machineFuel,
  machineHours: () => machineHours,
  machineMaintenance: () => machineMaintenance,
  maintenanceParts: () => maintenanceParts,
  maintenanceTemplateParts: () => maintenanceTemplateParts,
  maintenanceTemplates: () => maintenanceTemplates,
  parts: () => parts,
  partsRequests: () => partsRequests,
  partsStockMovements: () => partsStockMovements,
  passwordResetTokens: () => passwordResetTokens,
  preventiveMaintenanceAlerts: () => preventiveMaintenanceAlerts,
  preventiveMaintenancePlans: () => preventiveMaintenancePlans,
  purchaseOrderItems: () => purchaseOrderItems,
  purchaseOrders: () => purchaseOrders,
  replantingRecords: () => replantingRecords,
  rolePermissions: () => rolePermissions,
  sectors: () => sectors,
  userPermissions: () => userPermissions,
  userProfiles: () => userProfiles,
  users: () => users,
  vehicleRecords: () => vehicleRecords
});
import { mysqlTable, int, timestamp, mysqlEnum, varchar, text, index, tinyint } from "drizzle-orm/mysql-core";
var attendanceRecords, biometricAttendance, cargoDestinations, cargoLoads, cargoShipments, chainsawChainEvents, chainsawChainStock, chainsawPartMovements, chainsawParts, chainsawServiceOrders, chainsawServiceParts, chainsaws, clientContracts, clientPaymentReceipts, clientPayments, clientPortalAccess, clients, collaboratorAttendance, collaboratorDocuments, collaborators, equipment, equipmentMaintenance, equipmentPhotos, equipmentTypes, extraExpenses, financialEntries, fuelContainerEvents, fuelContainers, fuelRecords, gpsDeviceLinks, gpsHoursLog, gpsLocations, machineFuel, machineHours, machineMaintenance, maintenanceParts, maintenanceTemplateParts, maintenanceTemplates, parts, partsRequests, partsStockMovements, passwordResetTokens, preventiveMaintenanceAlerts, preventiveMaintenancePlans, purchaseOrderItems, purchaseOrders, replantingRecords, rolePermissions, sectors, userPermissions, userProfiles, users, vehicleRecords, cargoTrackingPhotos, cargoWeeklyClosings, clientDocuments;
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
      createdBy: int("created_by")
    });
    cargoLoads = mysqlTable("cargo_loads", {
      id: int().autoincrement().notNull(),
      date: timestamp({ mode: "string" }).notNull(),
      vehicleId: int("vehicle_id").references(() => equipment.id),
      vehiclePlate: varchar("vehicle_plate", { length: 20 }),
      driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
      driverName: varchar("driver_name", { length: 255 }),
      heightM: varchar("height_m", { length: 20 }).notNull(),
      widthM: varchar("width_m", { length: 20 }).notNull(),
      lengthM: varchar("length_m", { length: 20 }).notNull(),
      volumeM3: varchar("volume_m3", { length: 20 }).notNull(),
      woodType: varchar("wood_type", { length: 100 }),
      destination: varchar({ length: 255 }),
      invoiceNumber: varchar("invoice_number", { length: 100 }),
      clientId: int("client_id").references(() => clients.id),
      clientName: varchar("client_name", { length: 255 }),
      photosJson: text("photos_json"),
      notes: text(),
      status: mysqlEnum(["pendente", "entregue", "cancelado"]).default("pendente").notNull(),
      registeredBy: int("registered_by").references(() => users.id),
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
      paidAt: timestamp("paid_at", { mode: "string" })
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
      clientId: int("client_id").notNull().references(() => clients.id),
      referenceDate: timestamp("reference_date", { mode: "string" }).notNull(),
      description: varchar({ length: 500 }),
      volumeM3: varchar("volume_m3", { length: 20 }),
      pricePerM3: varchar("price_per_m3", { length: 20 }),
      grossAmount: varchar("gross_amount", { length: 20 }).notNull(),
      deductions: varchar({ length: 20 }).default("0"),
      netAmount: varchar("net_amount", { length: 20 }).notNull(),
      status: mysqlEnum(["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
      dueDate: timestamp("due_date", { mode: "string" }),
      paidAt: timestamp("paid_at", { mode: "string" }),
      pixKey: varchar("pix_key", { length: 255 }),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull()
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
      defaultLengthM: varchar("default_length_m", { length: 20 })
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
      paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro").notNull(),
      receiptImageUrl: text("receipt_image_url"),
      notes: text(),
      registeredBy: int("registered_by").references(() => users.id),
      registeredByName: varchar("registered_by_name", { length: 255 }),
      createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
      workLocationId: int("work_location_id"),
      clientId: int("client_id")
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
      workLocationId: int("work_location_id")
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
      workLocationId: int("work_location_id")
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
async function getDb() {
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
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
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
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
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
    await db.update(users).set({ passwordHash, loginMethod: "email", role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.email, email));
    return { action: "updated" };
  } else {
    await db.insert(users).values({
      email,
      name: email.split("@")[0],
      passwordHash,
      loginMethod: "email",
      role,
      lastSignedIn: /* @__PURE__ */ new Date()
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
  const now = /* @__PURE__ */ new Date();
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
  await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq(passwordResetTokens.id, tokenId));
}
async function linkCollaboratorToUser(email, openId) {
  if (!email) return;
  const db = await getDb();
  if (!db) return;
  const { collaborators: collaborators2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const user = await getUserByOpenId(openId);
  if (!user) return;
  const [collab] = await db.select({ id: collaborators2.id, userId: collaborators2.userId }).from(collaborators2).where(eq(collaborators2.email, email)).limit(1);
  if (collab && !collab.userId) {
    await db.update(collaborators2).set({ userId: user.id }).where(eq(collaborators2.id, collab.id));
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
async function cloudinaryUpload(data, _folder = "btree") {
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

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

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
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
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
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
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

// server/_core/systemRouter.ts
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

// server/routers/collaborators.ts
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
    const [inserted] = await db.insert(biometricAttendance).values({
      collaboratorId: input.collaboratorId,
      checkIn: checkInTime,
      checkOut: checkOutTime,
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
      checkInTime: biometricAttendance.checkIn,
      checkOutTime: biometricAttendance.checkOut,
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
      const records2 = await baseQuery.where(conditions.length === 1 ? conditions[0] : and2(...conditions)).orderBy(desc(biometricAttendance.checkIn));
      return records2;
    }
    const records = await baseQuery.orderBy(desc(biometricAttendance.checkIn));
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
import { z as z3 } from "zod";
init_db();
init_schema();
init_cloudinary();
import { eq as eq3 } from "drizzle-orm";
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
        const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq3(collaborators.userId, ctx.user.id));
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
      defaultLengthM: equipment.defaultLengthM
    }).from(equipment).leftJoin(equipmentTypes, eq3(equipment.typeId, equipmentTypes.id)).leftJoin(clients, eq3(equipment.clientId, clients.id)).orderBy(equipment.name);
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
    defaultLengthM: z3.string().optional()
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
    defaultLengthM: z3.string().optional().nullable()
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
import { z as z4 } from "zod";
init_db();
init_schema();
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
      lastSignedIn: /* @__PURE__ */ new Date()
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
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
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
import { z as z5 } from "zod";
init_db();
init_schema();
init_cloudinary();
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq5, desc as desc3, and as and3 } from "drizzle-orm";
var cargoLoadsRouter = router({
  // ===== DESTINOS =====
  listDestinations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(cargoDestinations).where(eq5(cargoDestinations.active, 1)).orderBy(cargoDestinations.name);
  }),
  createDestination: protectedProcedure.input(z5.object({
    name: z5.string().min(1),
    address: z5.string().optional(),
    city: z5.string().optional(),
    state: z5.string().optional(),
    notes: z5.string().optional(),
    clientId: z5.number().optional()
    // cliente vinculado ao destino
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const result = await db.insert(cargoDestinations).values({ ...input, createdBy: ctx.user.id });
    return { success: true, id: result.insertId };
  }),
  updateDestination: protectedProcedure.input(z5.object({
    id: z5.number(),
    name: z5.string().min(1).optional(),
    address: z5.string().optional(),
    city: z5.string().optional(),
    state: z5.string().optional(),
    notes: z5.string().optional(),
    clientId: z5.number().nullable().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(cargoDestinations).set(rest).where(eq5(cargoDestinations.id, id));
    return { success: true };
  }),
  deleteDestination: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(cargoDestinations).set({ active: 0 }).where(eq5(cargoDestinations.id, input.id));
    return { success: true };
  }),
  // ===== CARGAS =====
  list: protectedProcedure.input(z5.object({
    search: z5.string().optional(),
    clientId: z5.number().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional(),
    dateFrom: z5.string().optional(),
    dateTo: z5.string().optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let userAllowedClientIds = null;
    if (ctx.user.role !== "admin") {
      const { userPermissions: upTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [perm] = await db.select().from(upTable).where(eq5(upTable.userId, ctx.user.id));
      if (perm?.allowedClientIds) {
        userAllowedClientIds = JSON.parse(perm.allowedClientIds);
      } else {
        const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq5(collaborators.userId, ctx.user.id));
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
      // Joins
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate,
      locationName: gpsLocations.name,
      driverPhotoUrl: collaborators.photoUrl
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq5(cargoLoads.vehicleId, equipment.id)).leftJoin(gpsLocations, eq5(cargoLoads.workLocationId, gpsLocations.id)).leftJoin(collaborators, eq5(cargoLoads.driverCollaboratorId, collaborators.id)).orderBy(desc3(cargoLoads.date), desc3(cargoLoads.createdAt));
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
  getById: protectedProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
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
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate,
      locationName: gpsLocations.name,
      driverPhotoUrl: collaborators.photoUrl
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq5(cargoLoads.vehicleId, equipment.id)).leftJoin(gpsLocations, eq5(cargoLoads.workLocationId, gpsLocations.id)).leftJoin(collaborators, eq5(cargoLoads.driverCollaboratorId, collaborators.id)).where(eq5(cargoLoads.id, input.id)).limit(1);
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
  getByClientToken: publicProcedure.input(z5.object({ clientId: z5.number(), token: z5.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const client = await db.select().from(clients).where(eq5(clients.id, input.clientId)).limit(1);
    if (!client.length) throw new TRPCError4({ code: "NOT_FOUND" });
    const loads = await db.select().from(cargoLoads).where(eq5(cargoLoads.clientId, input.clientId)).orderBy(desc3(cargoLoads.date), desc3(cargoLoads.createdAt));
    return loads;
  }),
  uploadPhoto: protectedProcedure.input(z5.object({
    cargoId: z5.number(),
    photoBase64: z5.string(),
    photoType: z5.enum(["cargo", "weight_out", "weight_in"]).default("cargo")
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const uploaded = await cloudinaryUpload(input.photoBase64, `btree/cargo/${input.cargoId}`);
    if (input.photoType === "weight_out") {
      await db.update(cargoLoads).set({ weightOutPhotoUrl: uploaded.url, updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq5(cargoLoads.id, input.cargoId));
      return { url: uploaded.url };
    } else if (input.photoType === "weight_in") {
      await db.update(cargoLoads).set({ weightInPhotoUrl: uploaded.url, updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq5(cargoLoads.id, input.cargoId));
      return { url: uploaded.url };
    }
    const existing = await db.select({ photosJson: cargoLoads.photosJson }).from(cargoLoads).where(eq5(cargoLoads.id, input.cargoId)).limit(1);
    let photos = [];
    if (existing[0]?.photosJson) {
      try {
        photos = JSON.parse(existing[0].photosJson);
      } catch {
        photos = [];
      }
    }
    photos.push(uploaded.url);
    await db.update(cargoLoads).set({ photosJson: JSON.stringify(photos), updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") }).where(eq5(cargoLoads.id, input.cargoId));
    return { url: uploaded.url, photos };
  }),
  create: protectedProcedure.input(z5.object({
    date: z5.string(),
    vehicleId: z5.number().optional(),
    vehiclePlate: z5.string().optional(),
    driverCollaboratorId: z5.number().optional(),
    driverName: z5.string().optional(),
    heightM: z5.string(),
    widthM: z5.string(),
    lengthM: z5.string(),
    volumeM3: z5.string(),
    weightKg: z5.string().optional(),
    weightNetKg: z5.string().optional(),
    woodType: z5.string().optional(),
    destination: z5.string().optional(),
    destinationId: z5.number().optional(),
    invoiceNumber: z5.string().optional(),
    clientId: z5.number().optional(),
    clientName: z5.string().optional(),
    photosJson: z5.string().optional(),
    notes: z5.string().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional(),
    workLocationId: z5.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(cargoLoads).values({
      ...input,
      date: new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
      status: input.status || "pendente",
      trackingStatus: "aguardando",
      registeredBy: ctx.user.id,
      workLocationId: input.workLocationId || null
    });
    return { success: true };
  }),
  update: protectedProcedure.input(z5.object({
    id: z5.number(),
    date: z5.string().optional(),
    vehicleId: z5.number().optional(),
    vehiclePlate: z5.string().optional(),
    driverCollaboratorId: z5.number().optional(),
    driverName: z5.string().optional(),
    heightM: z5.string().optional(),
    widthM: z5.string().optional(),
    lengthM: z5.string().optional(),
    volumeM3: z5.string().optional(),
    weightKg: z5.string().optional(),
    weightNetKg: z5.string().optional(),
    woodType: z5.string().optional(),
    destination: z5.string().optional(),
    destinationId: z5.number().optional(),
    invoiceNumber: z5.string().optional(),
    clientId: z5.number().optional(),
    clientName: z5.string().optional(),
    photosJson: z5.string().optional(),
    notes: z5.string().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional(),
    trackingStatus: z5.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).optional(),
    trackingNotes: z5.string().optional(),
    weightOutKg: z5.string().optional(),
    weightInKg: z5.string().optional(),
    workLocationId: z5.number().optional(),
    invoiceUrl: z5.string().optional(),
    boletoUrl: z5.string().optional(),
    boletoAmount: z5.string().optional(),
    boletoDueDate: z5.string().optional(),
    paymentReceiptUrl: z5.string().optional(),
    paymentStatus: z5.enum(["sem_boleto", "a_pagar", "pago"]).optional(),
    paidAt: z5.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const updateData = { ...rest, updatedAt: now };
    if (date) updateData.date = new Date(date).toISOString().slice(0, 19).replace("T", " ");
    if (rest.trackingStatus) updateData.trackingUpdatedAt = now;
    await db.update(cargoLoads).set(updateData).where(eq5(cargoLoads.id, id));
    return { success: true };
  }),
  updateTracking: protectedProcedure.input(z5.object({
    id: z5.number(),
    trackingStatus: z5.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
    trackingNotes: z5.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(cargoLoads).set({
      trackingStatus: input.trackingStatus,
      trackingNotes: input.trackingNotes,
      trackingUpdatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      // Finalizar carga quando tracking chega em "finalizado"
      status: input.trackingStatus === "finalizado" ? "entregue" : void 0
    }).where(eq5(cargoLoads.id, input.id));
    return { success: true };
  }),
  // Upload de documento (nota, boleto, comprovante) para uma carga
  uploadDocument: protectedProcedure.input(z5.object({
    cargoId: z5.number(),
    docBase64: z5.string(),
    docType: z5.enum(["invoice", "boleto", "payment_receipt"]),
    boletoAmount: z5.string().optional(),
    boletoDueDate: z5.string().optional()
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
    await db.update(cargoLoads).set(updateData).where(eq5(cargoLoads.id, input.cargoId));
    return { url: uploaded.url, success: true };
  }),
  // Listar cargas com boleto (para integração financeira)
  listBoletos: protectedProcedure.input(z5.object({
    status: z5.enum(["a_pagar", "pago"]).optional()
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
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).orderBy(desc3(cargoLoads.boletoDueDate), desc3(cargoLoads.date));
    let filtered = results.filter((r) => r.boletoUrl);
    if (input?.status) filtered = filtered.filter((r) => r.paymentStatus === input.status);
    return filtered.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination
    }));
  }),
  // Marcar boleto como pago (sem comprovante)
  markAsPaid: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(cargoLoads).set({
      paymentStatus: "pago",
      paidAt: now,
      updatedAt: now
    }).where(eq5(cargoLoads.id, input.id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(cargoLoads).where(eq5(cargoLoads.id, input.id));
    return { success: true };
  }),
  // ===== TRACKING PHOTOS =====
  listTrackingPhotos: protectedProcedure.input(z5.object({ cargoId: z5.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    return db.select().from(cargoTrackingPhotos).where(eq5(cargoTrackingPhotos.cargoId, input.cargoId)).orderBy(cargoTrackingPhotos.createdAt);
  }),
  addTrackingPhoto: protectedProcedure.input(z5.object({
    cargoId: z5.number(),
    stage: z5.string().min(1),
    photoBase64: z5.string(),
    notes: z5.string().optional()
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
  deleteTrackingPhoto: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(cargoTrackingPhotos).where(eq5(cargoTrackingPhotos.id, input.id));
    return { success: true };
  }),
  // Listar fotos de tracking para o portal do cliente (público)
  getTrackingPhotosPublic: publicProcedure.input(z5.object({ cargoId: z5.number(), clientId: z5.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [load] = await db.select({ clientId: cargoLoads.clientId, clientName: cargoLoads.clientName }).from(cargoLoads).where(eq5(cargoLoads.id, input.cargoId)).limit(1);
    if (!load) throw new TRPCError4({ code: "NOT_FOUND" });
    return db.select().from(cargoTrackingPhotos).where(eq5(cargoTrackingPhotos.cargoId, input.cargoId)).orderBy(cargoTrackingPhotos.createdAt);
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
    }).from(collaborators).where(eq5(collaborators.userId, ctx.user.id)).limit(1);
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
      const [lastCargo] = await db.select({ vehicleId: cargoLoads.vehicleId }).from(cargoLoads).where(eq5(cargoLoads.driverCollaboratorId, myCollaborator.id)).orderBy(desc3(cargoLoads.createdAt)).limit(1);
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
    const [myCollaborator] = await db.select({ id: collaborators.id }).from(collaborators).where(eq5(collaborators.userId, ctx.user.id)).limit(1);
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
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq5(cargoLoads.vehicleId, equipment.id)).where(and3(
      eq5(cargoLoads.driverCollaboratorId, myCollaborator.id),
      eq5(cargoLoads.status, "pendente")
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
  updateTruckDefaults: protectedProcedure.input(z5.object({
    equipmentId: z5.number(),
    defaultHeightM: z5.string().optional(),
    defaultWidthM: z5.string().optional(),
    defaultLengthM: z5.string().optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError4({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(equipment).set({
      defaultHeightM: input.defaultHeightM || null,
      defaultWidthM: input.defaultWidthM || null,
      defaultLengthM: input.defaultLengthM || null
    }).where(eq5(equipment.id, input.equipmentId));
    return { success: true };
  }),
  advanceTrackingWithPhoto: protectedProcedure.input(z5.object({
    cargoId: z5.number(),
    stage: z5.enum(["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]),
    photoBase64: z5.string().optional(),
    notes: z5.string().optional(),
    // Campos de peso (pesagem saída e chegada)
    weightKg: z5.string().optional(),
    weightNetKg: z5.string().optional(),
    // Campos de metragem final (ao finalizar)
    finalHeightM: z5.string().optional(),
    finalWidthM: z5.string().optional(),
    finalLengthM: z5.string().optional(),
    finalVolumeM3: z5.string().optional()
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
    await db.update(cargoLoads).set(updateData).where(eq5(cargoLoads.id, input.cargoId));
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
  listWeeklyClosings: protectedProcedure.input(z5.object({ clientId: z5.number() }).optional()).query(async ({ input }) => {
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
      notes: cargoWeeklyClosings.notes,
      createdAt: cargoWeeklyClosings.createdAt
    }).from(cargoWeeklyClosings).leftJoin(clients, eq5(cargoWeeklyClosings.clientId, clients.id)).orderBy(desc3(cargoWeeklyClosings.weekEnd));
    const results = await query;
    if (input?.clientId) return results.filter((r) => r.clientId === input.clientId);
    return results;
  }),
  createWeeklyClosing: protectedProcedure.input(z5.object({
    clientId: z5.number(),
    weekStart: z5.string(),
    weekEnd: z5.string(),
    pricePerTon: z5.string().optional(),
    notes: z5.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    let pricePerTon = input.pricePerTon;
    if (!pricePerTon) {
      const [client2] = await db.select().from(clients).where(eq5(clients.id, input.clientId));
      pricePerTon = client2?.pricePerTon || "130";
    }
    const allLoads = await db.select().from(cargoLoads).where(eq5(cargoLoads.clientId, input.clientId));
    const weekStartDate = new Date(input.weekStart);
    const weekEndDate = new Date(input.weekEnd);
    weekEndDate.setHours(23, 59, 59, 999);
    const loadsInPeriod = allLoads.filter((l) => {
      const loadDate = new Date(l.date);
      return loadDate >= weekStartDate && loadDate <= weekEndDate;
    });
    const totalLoads = loadsInPeriod.length;
    const totalWeightKg = loadsInPeriod.reduce((sum, l) => {
      const weight = parseFloat(l.weightNetKg || l.weightOutKg || "0");
      return sum + weight;
    }, 0);
    const totalWeightTon = totalWeightKg / 1e3;
    const totalAmount = (totalWeightTon * parseFloat(pricePerTon)).toFixed(2);
    const [client] = await db.select().from(clients).where(eq5(clients.id, input.clientId));
    const paymentTermDays = client?.paymentTermDays || 20;
    const dueDate = new Date(input.weekEnd);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);
    const result = await db.insert(cargoWeeklyClosings).values({
      clientId: input.clientId,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      totalLoads,
      totalWeightKg: totalWeightKg.toFixed(2),
      totalAmount,
      pricePerTon,
      dueDate: dueDate.toISOString().slice(0, 19).replace("T", " "),
      status: "fechado",
      closedBy: ctx.user.id,
      notes: input.notes
    });
    return { success: true, id: result.insertId, totalLoads, totalWeightKg: totalWeightKg.toFixed(2), totalAmount };
  }),
  updateWeeklyClosingStatus: protectedProcedure.input(z5.object({
    id: z5.number(),
    status: z5.enum(["aberto", "fechado", "pago", "atrasado"]),
    paidAt: z5.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const updateData = { status: input.status };
    if (input.status === "pago") updateData.paidAt = input.paidAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    await db.update(cargoWeeklyClosings).set(updateData).where(eq5(cargoWeeklyClosings.id, input.id));
    return { success: true };
  }),
  deleteWeeklyClosing: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(cargoWeeklyClosings).where(eq5(cargoWeeklyClosings.id, input.id));
    return { success: true };
  }),
  // ===== DOCUMENTOS DO CLIENTE =====
  listClientDocuments: protectedProcedure.input(z5.object({ clientId: z5.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(clientDocuments).where(eq5(clientDocuments.clientId, input.clientId)).orderBy(desc3(clientDocuments.createdAt));
  }),
  uploadClientDocument: protectedProcedure.input(z5.object({
    clientId: z5.number(),
    type: z5.enum(["proposta", "contrato", "nota_fiscal", "boleto", "recibo", "outros"]),
    title: z5.string().min(1),
    fileBase64: z5.string(),
    fileType: z5.string().optional(),
    notes: z5.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const uploaded = await cloudinaryUpload(input.fileBase64, `btree/client-docs/${input.clientId}`);
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const result = await db.insert(clientDocuments).values({
      clientId: input.clientId,
      type: input.type,
      title: input.title,
      fileUrl: uploaded.url,
      fileType: input.fileType || null,
      notes: input.notes || null,
      uploadedBy: ctx.user.id,
      createdAt: now
    });
    return { success: true, id: result[0]?.insertId, url: uploaded.url };
  }),
  deleteClientDocument: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(clientDocuments).where(eq5(clientDocuments.id, input.id));
    return { success: true };
  }),
  // ===== ATUALIZAR PREÇO DO CLIENTE =====
  updateClientPricing: protectedProcedure.input(z5.object({
    clientId: z5.number(),
    pricePerTon: z5.string().optional(),
    residuePerTon: z5.string().optional(),
    billingCycle: z5.enum(["semanal", "quinzenal", "mensal"]).optional(),
    billingDayOfWeek: z5.number().optional(),
    paymentTermDays: z5.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const { clientId, ...rest } = input;
    await db.update(clients).set(rest).where(eq5(clients.id, clientId));
    return { success: true };
  })
});

// server/routers/machineHours.ts
import { z as z6 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError5 } from "@trpc/server";
import { eq as eq6, desc as desc4, sql as sql3, inArray as inArray2 } from "drizzle-orm";
async function resolveAllowedClientIds2(db, ctx) {
  if (ctx.user.role === "admin") return null;
  let allowedClientIds = null;
  try {
    const [perm] = await db.select().from(userPermissions).where(eq6(userPermissions.userId, ctx.user.id));
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
      const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq6(collaborators.userId, ctx.user.id));
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
  listHours: protectedProcedure.input(z6.object({ equipmentId: z6.number().optional() }).optional()).query(async ({ ctx, input }) => {
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
  createHours: protectedProcedure.input(z6.object({
    equipmentId: z6.number(),
    operatorCollaboratorId: z6.number().optional(),
    date: z6.string(),
    startHourMeter: z6.string(),
    endHourMeter: z6.string(),
    hoursWorked: z6.string(),
    activity: z6.string().optional(),
    location: z6.string().optional(),
    notes: z6.string().optional(),
    workLocationId: z6.number().optional()
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
  updateHours: protectedProcedure.input(z6.object({
    id: z6.number(),
    date: z6.string().optional(),
    startHourMeter: z6.string().optional(),
    endHourMeter: z6.string().optional(),
    hoursWorked: z6.string().optional(),
    activity: z6.string().optional().nullable(),
    location: z6.string().optional().nullable(),
    notes: z6.string().optional().nullable(),
    workLocationId: z6.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    await db.update(machineHours).set({
      ...rest,
      ...date ? { date } : {}
    }).where(eq6(machineHours.id, id));
    return { success: true };
  }),
  deleteHours: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineHours).where(eq6(machineHours.id, input.id));
    return { success: true };
  }),
  // === MANUTENÇÕES ===
  listMaintenance: protectedProcedure.input(z6.object({ equipmentId: z6.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(machineMaintenance).orderBy(desc4(machineMaintenance.createdAt));
    if (input?.equipmentId) return results.filter((r) => r.equipmentId === input.equipmentId);
    return results;
  }),
  createMaintenance: protectedProcedure.input(z6.object({
    equipmentId: z6.number(),
    date: z6.string(),
    hourMeter: z6.string().optional(),
    type: z6.enum(["preventiva", "corretiva", "revisao"]),
    serviceType: z6.enum(["proprio", "terceirizado"]),
    mechanicCollaboratorId: z6.number().optional(),
    mechanicName: z6.string().optional(),
    thirdPartyCompany: z6.string().optional(),
    partsReplaced: z6.string().optional(),
    // JSON string
    laborCost: z6.string().optional(),
    totalCost: z6.string().optional(),
    description: z6.string().optional(),
    nextMaintenanceHours: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(machineMaintenance).values({
      ...input,
      date: input.date,
      registeredBy: ctx.user.id
    });
    return { success: true };
  }),
  updateMaintenance: protectedProcedure.input(z6.object({
    id: z6.number(),
    date: z6.string().optional(),
    hourMeter: z6.string().optional().nullable(),
    type: z6.enum(["preventiva", "corretiva", "revisao"]).optional(),
    serviceType: z6.enum(["proprio", "terceirizado"]).optional(),
    mechanicName: z6.string().optional().nullable(),
    thirdPartyCompany: z6.string().optional().nullable(),
    description: z6.string().optional().nullable(),
    laborCost: z6.string().optional().nullable(),
    totalCost: z6.string().optional().nullable(),
    nextMaintenanceHours: z6.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    await db.update(machineMaintenance).set({
      ...rest,
      ...date ? { date } : {}
    }).where(eq6(machineMaintenance.id, id));
    return { success: true };
  }),
  deleteMaintenance: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineMaintenance).where(eq6(machineMaintenance.id, input.id));
    return { success: true };
  }),
  // === ABASTECIMENTO ===
  listFuel: protectedProcedure.input(z6.object({ equipmentId: z6.number().optional() }).optional()).query(async ({ ctx, input }) => {
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
  createFuel: protectedProcedure.input(z6.object({
    equipmentId: z6.number(),
    date: z6.string(),
    hourMeter: z6.string().optional(),
    fuelType: z6.enum(["diesel", "gasolina", "mistura_2t", "arla"]),
    liters: z6.string(),
    pricePerLiter: z6.string().optional(),
    totalValue: z6.string().optional(),
    supplier: z6.string().optional(),
    notes: z6.string().optional(),
    workLocationId: z6.number().optional()
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
    return { success: true };
  }),
  updateFuel: protectedProcedure.input(z6.object({
    id: z6.number(),
    workLocationId: z6.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(machineFuel).set(rest).where(eq6(machineFuel.id, id));
    return { success: true };
  }),
  deleteFuel: protectedProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(machineFuel).where(eq6(machineFuel.id, input.id));
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
    const fuelRecords2 = await db.select().from(machineFuel).orderBy(desc4(machineFuel.createdAt));
    return equipmentList.map((eq23) => {
      const eqHours = hoursRecords.filter((h) => h.equipmentId === eq23.id);
      const eqMaint = maintenances.filter((m) => m.equipmentId === eq23.id);
      const eqFuel = fuelRecords2.filter((f) => f.equipmentId === eq23.id);
      const totalHours = eqHours.reduce((sum, h) => sum + (parseFloat(h.hoursWorked) || 0), 0);
      const totalFuelLiters = eqFuel.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
      const totalFuelCost = eqFuel.reduce((sum, f) => sum + (parseFloat(f.totalValue || "0") || 0), 0);
      const lastHourMeter = eqHours.length > 0 ? eqHours[0].endHourMeter : null;
      const lastMaintenance = eqMaint.length > 0 ? eqMaint[0] : null;
      return {
        equipmentId: eq23.id,
        equipmentName: eq23.name,
        brand: eq23.brand,
        model: eq23.model,
        status: eq23.status,
        totalHoursWorked: totalHours,
        lastHourMeter,
        totalFuelLiters,
        totalFuelCost,
        maintenanceCount: eqMaint.length,
        lastMaintenanceDate: lastMaintenance?.date || null,
        nextMaintenanceHours: lastMaintenance?.nextMaintenanceHours || null
      };
    });
  })
});

// server/routers/vehicleRecords.ts
import { z as z7 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError6 } from "@trpc/server";
import { eq as eq7, desc as desc5, inArray as inArray3, sql as sql4 } from "drizzle-orm";

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
  list: protectedProcedure.input(z7.object({
    equipmentId: z7.number().optional(),
    recordType: z7.enum(["abastecimento", "manutencao", "km"]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let allowedClientIds = null;
    if (ctx.user.role !== "admin") {
      try {
        const [perm] = await db.select().from(userPermissions).where(eq7(userPermissions.userId, ctx.user.id));
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
          const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq7(collaborators.userId, ctx.user.id));
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
    const results = await db.select().from(vehicleRecords).orderBy(desc5(vehicleRecords.createdAt));
    let filtered = results;
    if (input?.equipmentId) filtered = filtered.filter((r) => r.equipmentId === input.equipmentId);
    if (input?.recordType) filtered = filtered.filter((r) => r.recordType === input.recordType);
    if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
      filtered = filtered.filter((r) => {
        if (r.workLocationId && allowedLocationIds.includes(r.workLocationId)) return true;
        return false;
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
  create: protectedProcedure.input(z7.object({
    equipmentId: z7.number(),
    date: z7.string(),
    recordType: z7.enum(["abastecimento", "manutencao", "km"]),
    fuelType: z7.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
    liters: z7.string().optional(),
    fuelCost: z7.string().optional(),
    pricePerLiter: z7.string().optional(),
    supplier: z7.string().optional(),
    odometer: z7.string().optional(),
    kmDriven: z7.string().optional(),
    maintenanceType: z7.string().optional(),
    maintenanceCost: z7.string().optional(),
    serviceType: z7.enum(["proprio", "terceirizado"]).optional(),
    mechanicName: z7.string().optional(),
    driverCollaboratorId: z7.number().optional(),
    photoBase64: z7.string().optional(),
    notes: z7.string().optional(),
    workLocationId: z7.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let photoUrl;
    if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(input.photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
    }
    const { photoBase64, workLocationId, ...rest } = input;
    await db.insert(vehicleRecords).values({
      ...rest,
      date: new Date(input.date).toISOString().slice(0, 19).replace("T", " "),
      photoUrl,
      registeredBy: ctx.user.id,
      workLocationId: workLocationId || null
    });
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
  update: protectedProcedure.input(z7.object({
    id: z7.number(),
    date: z7.string().optional(),
    recordType: z7.enum(["abastecimento", "manutencao", "km"]).optional(),
    fuelType: z7.enum(["diesel", "gasolina", "etanol", "gnv"]).optional().nullable(),
    liters: z7.string().optional().nullable(),
    fuelCost: z7.string().optional().nullable(),
    pricePerLiter: z7.string().optional().nullable(),
    supplier: z7.string().optional().nullable(),
    odometer: z7.string().optional().nullable(),
    kmDriven: z7.string().optional().nullable(),
    maintenanceType: z7.string().optional().nullable(),
    maintenanceCost: z7.string().optional().nullable(),
    serviceType: z7.enum(["proprio", "terceirizado"]).optional().nullable(),
    mechanicName: z7.string().optional().nullable(),
    driverCollaboratorId: z7.number().optional().nullable(),
    photoBase64: z7.string().optional().nullable(),
    notes: z7.string().optional().nullable(),
    workLocationId: z7.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, photoBase64, date, ...rest } = input;
    let photoUrl;
    if (photoBase64 && photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
    }
    const updateData = { ...rest };
    if (date) updateData.date = new Date(date);
    if (photoUrl) updateData.photoUrl = photoUrl;
    await db.update(vehicleRecords).set(updateData).where(eq7(vehicleRecords.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError6({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(vehicleRecords).where(eq7(vehicleRecords.id, input.id));
    return { success: true };
  })
});

// server/routers/parts.ts
import { z as z8 } from "zod";
init_db();
init_schema();
init_cloudinary();
import { TRPCError as TRPCError7 } from "@trpc/server";
import { eq as eq8, desc as desc6 } from "drizzle-orm";
var partsRouter = router({
  // === PEÇAS ===
  listParts: protectedProcedure.input(z8.object({ search: z8.string().optional() }).optional()).query(async ({ input }) => {
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
  createPart: protectedProcedure.input(z8.object({
    code: z8.string().optional(),
    name: z8.string().min(2),
    category: z8.string().optional(),
    unit: z8.string().optional(),
    stockQuantity: z8.number().optional(),
    minStock: z8.number().optional(),
    unitCost: z8.string().optional(),
    supplier: z8.string().optional(),
    photoBase64: z8.string().optional(),
    notes: z8.string().optional()
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
  updatePart: protectedProcedure.input(z8.object({
    id: z8.number(),
    code: z8.string().optional(),
    name: z8.string().optional(),
    category: z8.string().optional(),
    unit: z8.string().optional(),
    stockQuantity: z8.number().optional(),
    minStock: z8.number().optional(),
    unitCost: z8.string().optional(),
    supplier: z8.string().optional(),
    photoBase64: z8.string().optional(),
    notes: z8.string().optional(),
    active: z8.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, photoBase64, ...rest } = input;
    const updateData = { ...rest, updatedAt: /* @__PURE__ */ new Date() };
    if (photoBase64) {
      const result = await cloudinaryUpload(photoBase64, "btree/parts");
      updateData.photoUrl = result.url;
    }
    await db.update(parts).set(updateData).where(eq8(parts.id, id));
    return { success: true };
  }),
  deletePart: protectedProcedure.input(z8.object({ id: z8.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError7({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(parts).where(eq8(parts.id, input.id));
    return { success: true };
  }),
  // === SOLICITAÇÕES ===
  listRequests: protectedProcedure.input(z8.object({
    status: z8.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]).optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(partsRequests).orderBy(desc6(partsRequests.createdAt));
    if (input?.status) return results.filter((r) => r.status === input.status);
    return results;
  }),
  createRequest: protectedProcedure.input(z8.object({
    partId: z8.number().optional(),
    partName: z8.string(),
    quantity: z8.number().min(1),
    urgency: z8.enum(["baixa", "media", "alta"]),
    equipmentId: z8.number().optional(),
    equipmentName: z8.string().optional(),
    reason: z8.string().optional(),
    estimatedCost: z8.string().optional()
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
  updateRequestStatus: protectedProcedure.input(z8.object({
    id: z8.number(),
    status: z8.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]),
    rejectionReason: z8.string().optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin" && input.status !== "comprado" && input.status !== "entregue") {
      throw new TRPCError7({ code: "FORBIDDEN", message: "Apenas admins podem aprovar/rejeitar" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const updateData = {
      status: input.status,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (input.status === "aprovado") {
      updateData.approvedBy = ctx.user.id;
      updateData.approvedAt = /* @__PURE__ */ new Date();
    }
    if (input.rejectionReason) updateData.rejectionReason = input.rejectionReason;
    await db.update(partsRequests).set(updateData).where(eq8(partsRequests.id, input.id));
    return { success: true };
  }),
  deleteRequest: protectedProcedure.input(z8.object({ id: z8.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError7({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(partsRequests).where(eq8(partsRequests.id, input.id));
    return { success: true };
  })
});

// server/routers/clientsRouter.ts
import { z as z9 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError8 } from "@trpc/server";
import { eq as eq9, desc as desc7 } from "drizzle-orm";
var clientsRouter = router({
  list: protectedProcedure.input(z9.object({ search: z9.string().optional() }).optional()).query(async ({ input }) => {
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
  create: protectedProcedure.input(z9.object({
    name: z9.string().min(2),
    document: z9.string().optional(),
    email: z9.string().email().optional(),
    phone: z9.string().optional(),
    address: z9.string().optional(),
    city: z9.string().optional(),
    state: z9.string().optional(),
    notes: z9.string().optional(),
    pricePerTon: z9.string().optional(),
    paymentTermDays: z9.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(clients).values({ ...input, createdBy: ctx.user.id });
    return { success: true };
  }),
  update: protectedProcedure.input(z9.object({
    id: z9.number(),
    name: z9.string().optional(),
    document: z9.string().optional(),
    email: z9.string().email().optional(),
    phone: z9.string().optional(),
    address: z9.string().optional(),
    city: z9.string().optional(),
    state: z9.string().optional(),
    notes: z9.string().optional(),
    active: z9.number().optional(),
    pricePerTon: z9.string().optional(),
    paymentTermDays: z9.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(clients).set({ ...rest, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(clients.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z9.object({ id: z9.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError8({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(clients).set({ active: 0, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(clients.id, input.id));
    return { success: true };
  })
});

// server/routers/clientPortal.ts
import { z as z10 } from "zod";
init_db();
init_schema();
import { eq as eq10, and as and4, desc as desc8 } from "drizzle-orm";
import bcrypt3 from "bcryptjs";
var clientPortalRouter = router({
  // ── LOGIN DO CLIENTE (público) ──
  login: publicProcedure.input(z10.object({
    email: z10.string().email(),
    password: z10.string().min(1)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [client] = await db.select().from(clients).where(
      and4(
        eq10(clients.email, input.email.trim().toLowerCase())
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
  getPortalData: publicProcedure.input(z10.object({ clientId: z10.number(), email: z10.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [client] = await db.select().from(clients).where(
      and4(
        eq10(clients.id, input.clientId),
        eq10(clients.email, input.email.trim().toLowerCase())
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
      }).slice(0, 50);
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
      replanting = await db.select().from(replantingRecords).where(eq10(replantingRecords.clientId, input.clientId)).orderBy(desc8(replantingRecords.date)).limit(50);
    } catch (e) {
      console.error("[Portal] Erro ao buscar replantios:", e);
    }
    let payments = [];
    try {
      payments = await db.select().from(clientPayments).where(eq10(clientPayments.clientId, input.clientId)).orderBy(desc8(clientPayments.referenceDate)).limit(50);
    } catch (e) {
      console.error("[Portal] Erro ao buscar pagamentos:", e);
    }
    let weeklyClosings = [];
    try {
      weeklyClosings = await db.select().from(cargoWeeklyClosings).where(eq10(cargoWeeklyClosings.clientId, input.clientId)).orderBy(desc8(cargoWeeklyClosings.weekEnd)).limit(20);
    } catch (e) {
      console.error("[Portal] Erro ao buscar fechamentos:", e);
    }
    let documents = [];
    try {
      documents = await db.select().from(clientDocuments).where(eq10(clientDocuments.clientId, input.clientId)).orderBy(desc8(clientDocuments.createdAt)).limit(50);
    } catch (e) {
      console.error("[Portal] Erro ao buscar documentos:", e);
    }
    return { client, loads, replanting, payments, weeklyClosings, documents };
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
    }).from(replantingRecords).leftJoin(clients, eq10(replantingRecords.clientId, clients.id)).orderBy(desc8(replantingRecords.date));
    return records;
  }),
  // ── LISTAR TODOS OS PAGAMENTOS (admin) ──
  listAllPayments: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db.select({
      id: clientPayments.id,
      clientId: clientPayments.clientId,
      referenceDate: clientPayments.referenceDate,
      description: clientPayments.description,
      volumeM3: clientPayments.volumeM3,
      pricePerM3: clientPayments.pricePerM3,
      grossAmount: clientPayments.grossAmount,
      deductions: clientPayments.deductions,
      netAmount: clientPayments.netAmount,
      status: clientPayments.status,
      dueDate: clientPayments.dueDate,
      paidAt: clientPayments.paidAt,
      pixKey: clientPayments.pixKey,
      notes: clientPayments.notes,
      registeredBy: clientPayments.registeredBy,
      createdAt: clientPayments.createdAt,
      clientName: clients.name
    }).from(clientPayments).leftJoin(clients, eq10(clientPayments.clientId, clients.id)).orderBy(desc8(clientPayments.referenceDate));
    return records;
  }),
  // ── ATUALIZAR PAGAMENTO (admin) ──
  updatePayment: protectedProcedure.input(z10.object({
    id: z10.number(),
    status: z10.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
    paidAt: z10.string().optional(),
    notes: z10.string().optional(),
    description: z10.string().optional(),
    grossAmount: z10.string().optional(),
    netAmount: z10.string().optional(),
    deductions: z10.string().optional(),
    dueDate: z10.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, paidAt, dueDate, ...rest } = input;
    const updateData = { ...rest };
    if (paidAt) updateData.paidAt = new Date(paidAt).toISOString().slice(0, 19).replace("T", " ");
    if (dueDate) updateData.dueDate = new Date(dueDate).toISOString().slice(0, 19).replace("T", " ");
    await db.update(clientPayments).set(updateData).where(eq10(clientPayments.id, id));
    return { success: true };
  }),
  // ── EXCLUIR REPLANTIO (admin) ──
  deleteReplanting: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(replantingRecords).where(eq10(replantingRecords.id, input.id));
    return { success: true };
  }),
  // ── EXCLUIR PAGAMENTO (admin) ──
  deletePayment: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(clientPayments).where(eq10(clientPayments.id, input.id));
    return { success: true };
  }),
  // ── DEFINIR/ALTERAR SENHA DO CLIENTE (admin) ──
  setClientPassword: protectedProcedure.input(z10.object({
    clientId: z10.number(),
    password: z10.string().min(4)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const hash = await bcrypt3.hash(input.password, 10);
    await db.update(clients).set({ password: hash }).where(eq10(clients.id, input.clientId));
    return { success: true };
  }),
  // ── REGISTRAR REPLANTIO (admin) ──
  addReplanting: protectedProcedure.input(z10.object({
    clientId: z10.number(),
    date: z10.string(),
    area: z10.string().optional(),
    species: z10.string().optional(),
    quantity: z10.number().optional(),
    areaHectares: z10.string().optional(),
    notes: z10.string().optional()
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
  addPayment: protectedProcedure.input(z10.object({
    clientId: z10.number(),
    referenceDate: z10.string(),
    description: z10.string().optional(),
    volumeM3: z10.string().optional(),
    pricePerM3: z10.string().optional(),
    grossAmount: z10.string(),
    deductions: z10.string().optional(),
    netAmount: z10.string(),
    status: z10.enum(["pendente", "pago", "atrasado", "cancelado"]).default("pendente"),
    dueDate: z10.string().optional(),
    paidAt: z10.string().optional(),
    pixKey: z10.string().optional(),
    notes: z10.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(clientPayments).values({
      clientId: input.clientId,
      referenceDate: new Date(input.referenceDate).toISOString().slice(0, 19).replace("T", " "),
      description: input.description,
      volumeM3: input.volumeM3,
      pricePerM3: input.pricePerM3,
      grossAmount: input.grossAmount,
      deductions: input.deductions || "0",
      netAmount: input.netAmount,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 19).replace("T", " ") : void 0,
      paidAt: input.paidAt ? new Date(input.paidAt).toISOString().slice(0, 19).replace("T", " ") : void 0,
      pixKey: input.pixKey,
      notes: input.notes,
      registeredBy: ctx.user.id
    });
    return { success: true };
  })
});

// server/routers/collaboratorDocuments.ts
init_db();
init_schema();
init_cloudinary();
import { z as z11 } from "zod";
import { eq as eq11, desc as desc9 } from "drizzle-orm";
var DOC_TYPES = ["cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"];
var collaboratorDocumentsRouter = router({
  // Listar documentos de um colaborador
  list: protectedProcedure.input(z11.object({ collaboratorId: z11.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.select().from(collaboratorDocuments).where(eq11(collaboratorDocuments.collaboratorId, input.collaboratorId)).orderBy(desc9(collaboratorDocuments.createdAt));
  }),
  // Adicionar documento (imagem ou PDF) — usa S3 via cloudinaryUpload helper
  add: protectedProcedure.input(z11.object({
    collaboratorId: z11.number(),
    type: z11.enum(DOC_TYPES),
    title: z11.string().min(2),
    fileBase64: z11.string(),
    // base64 da imagem ou PDF (pode ter prefixo data:...)
    fileType: z11.string().optional(),
    // "image/jpeg", "application/pdf"
    issueDate: z11.string().optional(),
    expiryDate: z11.string().optional(),
    notes: z11.string().optional()
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
    const created = await db.select().from(collaboratorDocuments).where(eq11(collaboratorDocuments.id, newId)).limit(1);
    return created[0];
  }),
  // Remover documento
  remove: protectedProcedure.input(z11.object({ id: z11.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(collaboratorDocuments).where(eq11(collaboratorDocuments.id, input.id));
    return { success: true };
  }),
  // Buscar colaborador com todos os dados para gerar PDF
  getForPdf: protectedProcedure.input(z11.object({ collaboratorId: z11.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [collab] = await db.select().from(collaborators).where(eq11(collaborators.id, input.collaboratorId)).limit(1);
    if (!collab) throw new Error("Colaborador n\xE3o encontrado");
    const docs = await db.select().from(collaboratorDocuments).where(eq11(collaboratorDocuments.collaboratorId, input.collaboratorId)).orderBy(desc9(collaboratorDocuments.createdAt));
    return { collaborator: collab, documents: docs };
  })
});

// server/routers/equipmentDetail.ts
import { z as z12 } from "zod";
init_db();
init_schema();
init_cloudinary();
import { eq as eq12, desc as desc10, and as and5 } from "drizzle-orm";
var equipmentDetailRouter = router({
  // ─── Equipamento ────────────────────────────────────────────────────────────
  getById: protectedProcedure.input(z12.object({ id: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select().from(equipment).where(eq12(equipment.id, input.id)).limit(1);
    return result[0] || null;
  }),
  // ─── Fotos ──────────────────────────────────────────────────────────────────
  listPhotos: protectedProcedure.input(z12.object({ equipmentId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(equipmentPhotos).where(eq12(equipmentPhotos.equipmentId, input.equipmentId)).orderBy(desc10(equipmentPhotos.createdAt));
  }),
  addPhoto: protectedProcedure.input(z12.object({
    equipmentId: z12.number(),
    photoBase64: z12.string(),
    caption: z12.string().optional()
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
  removePhoto: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentPhotos).where(eq12(equipmentPhotos.id, input.id));
    return { success: true };
  }),
  updateMainPhoto: protectedProcedure.input(z12.object({ id: z12.number(), photoBase64: z12.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/main`);
    await db.update(equipment).set({ imageUrl: result.url }).where(eq12(equipment.id, input.id));
    return { url: result.url };
  }),
  // ─── Templates de Manutenção ────────────────────────────────────────────────
  listTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const templates = await db.select().from(maintenanceTemplates).where(eq12(maintenanceTemplates.active, 1)).orderBy(maintenanceTemplates.name);
    return templates;
  }),
  getTemplateWithParts: protectedProcedure.input(z12.object({ templateId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [template] = await db.select().from(maintenanceTemplates).where(eq12(maintenanceTemplates.id, input.templateId)).limit(1);
    if (!template) return null;
    const templateParts = await db.select().from(maintenanceTemplateParts).where(eq12(maintenanceTemplateParts.templateId, input.templateId));
    const partsWithStock = await Promise.all(templateParts.map(async (tp) => {
      if (!tp.partId) return { ...tp, stockQuantity: 0, unitCost: null, photoUrl: null };
      const [part] = await db.select().from(parts).where(eq12(parts.id, tp.partId)).limit(1);
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
  createTemplate: protectedProcedure.input(z12.object({
    name: z12.string().min(2),
    type: z12.enum(["preventiva", "corretiva", "revisao"]),
    description: z12.string().optional(),
    estimatedCost: z12.string().optional(),
    parts: z12.array(z12.object({
      partId: z12.number().optional(),
      partCode: z12.string().optional(),
      partName: z12.string(),
      quantity: z12.number().min(1),
      unit: z12.string().optional(),
      notes: z12.string().optional()
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
  deleteTemplate: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(maintenanceTemplates).where(eq12(maintenanceTemplates.id, input.id));
    return { success: true };
  }),
  // ─── Busca de Peça por Código ────────────────────────────────────────────────
  searchPartByCode: protectedProcedure.input(z12.object({ code: z12.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const results = await db.select().from(parts).where(and5(eq12(parts.active, 1)));
    const code = input.code.toLowerCase();
    return results.filter(
      (p) => p.code?.toLowerCase().includes(code) || p.name.toLowerCase().includes(code)
    ).slice(0, 10);
  }),
  // ─── Manutenções ────────────────────────────────────────────────────────────
  listMaintenance: protectedProcedure.input(z12.object({ equipmentId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const maintenances = await db.select().from(equipmentMaintenance).where(eq12(equipmentMaintenance.equipmentId, input.equipmentId)).orderBy(desc10(equipmentMaintenance.performedAt));
    const result = await Promise.all(maintenances.map(async (m) => {
      const usedParts = await db.select().from(maintenanceParts).where(eq12(maintenanceParts.maintenanceId, m.id));
      return { ...m, parts: usedParts };
    }));
    return result;
  }),
  addMaintenance: protectedProcedure.input(z12.object({
    equipmentId: z12.number(),
    type: z12.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
    description: z12.string().min(3),
    performedBy: z12.string().optional(),
    cost: z12.string().optional(),
    nextMaintenanceDate: z12.string().optional(),
    performedAt: z12.string(),
    photoBase64: z12.string().optional(),
    templateId: z12.number().optional(),
    // Peças utilizadas
    parts: z12.array(z12.object({
      partId: z12.number().optional(),
      partCode: z12.string().optional(),
      partName: z12.string(),
      partPhotoUrl: z12.string().optional(),
      quantity: z12.number().min(1),
      unit: z12.string().optional(),
      unitCost: z12.string().optional(),
      fromStock: z12.number().optional()
      // 1 = baixou estoque, 0 = avulso
    })).optional(),
    // Serviços externos
    laborCost: z12.string().optional()
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
      nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate) : void 0,
      performedAt: new Date(input.performedAt),
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
          const [part] = await db.select().from(parts).where(eq12(parts.id, p.partId)).limit(1);
          if (part) {
            const newQty = Math.max(0, (part.stockQuantity ?? 0) - p.quantity);
            await db.update(parts).set({ stockQuantity: newQty }).where(eq12(parts.id, p.partId));
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
  removeMaintenance: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentMaintenance).where(eq12(equipmentMaintenance.id, input.id));
    return { success: true };
  }),
  // ─── Estoque de Peças ────────────────────────────────────────────────────────
  addStockEntry: protectedProcedure.input(z12.object({
    partId: z12.number(),
    quantity: z12.number().min(1),
    unitCost: z12.string().optional(),
    notes: z12.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [part] = await db.select().from(parts).where(eq12(parts.id, input.partId)).limit(1);
    if (!part) throw new Error("Pe\xE7a n\xE3o encontrada");
    const newQty = (part.stockQuantity ?? 0) + input.quantity;
    await db.update(parts).set({ stockQuantity: newQty }).where(eq12(parts.id, input.partId));
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
  listStockMovements: protectedProcedure.input(z12.object({ partId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(partsStockMovements).where(eq12(partsStockMovements.partId, input.partId)).orderBy(desc10(partsStockMovements.createdAt)).limit(50);
  })
});

// server/routers/purchaseOrders.ts
import { z as z13 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError9 } from "@trpc/server";
import { eq as eq13, desc as desc11 } from "drizzle-orm";
var purchaseOrdersRouter = router({
  // Listar todos os pedidos
  listOrders: protectedProcedure.input(z13.object({ status: z13.string().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const orders = await db.select().from(purchaseOrders).orderBy(desc11(purchaseOrders.createdAt));
    if (input?.status) return orders.filter((o) => o.status === input.status);
    return orders;
  }),
  // Buscar pedido com itens
  getOrder: protectedProcedure.input(z13.object({ id: z13.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [order] = await db.select().from(purchaseOrders).where(eq13(purchaseOrders.id, input.id));
    if (!order) throw new TRPCError9({ code: "NOT_FOUND" });
    const items = await db.select().from(purchaseOrderItems).where(eq13(purchaseOrderItems.orderId, input.id));
    return { ...order, items };
  }),
  // Criar pedido com itens
  createOrder: protectedProcedure.input(z13.object({
    title: z13.string().min(2),
    notes: z13.string().optional(),
    items: z13.array(z13.object({
      partId: z13.number().optional(),
      partName: z13.string(),
      partCode: z13.string().optional(),
      partCategory: z13.string().optional(),
      supplier: z13.string().optional(),
      unit: z13.string().optional(),
      quantity: z13.number().min(1),
      unitCost: z13.string().optional(),
      notes: z13.string().optional()
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
    return { success: true, orderId };
  }),
  // Atualizar status do pedido
  updateOrderStatus: protectedProcedure.input(z13.object({
    id: z13.number(),
    status: z13.enum(["rascunho", "enviado", "aprovado", "rejeitado", "comprado"])
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const updateData = { status: input.status, updatedAt: /* @__PURE__ */ new Date() };
    if (input.status === "aprovado") {
      updateData.approvedBy = ctx.user.id;
      updateData.approvedAt = /* @__PURE__ */ new Date();
    }
    await db.update(purchaseOrders).set(updateData).where(eq13(purchaseOrders.id, input.id));
    if (input.status === "enviado") {
      const [order] = await db.select({ title: purchaseOrders.title }).from(purchaseOrders).where(eq13(purchaseOrders.id, input.id));
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
  deleteOrder: protectedProcedure.input(z13.object({ id: z13.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError9({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(purchaseOrders).where(eq13(purchaseOrders.id, input.id));
    return { success: true };
  })
});

// server/routers/attendance.ts
import { z as z14 } from "zod";
init_db();
init_schema();
init_notification();
import { TRPCError as TRPCError10 } from "@trpc/server";
import { eq as eq14, desc as desc12, and as and6, inArray as inArray4, lt, sql as sql5 } from "drizzle-orm";
var attendanceRouter = router({
  // Listar presenças com filtros
  list: protectedProcedure.input(z14.object({
    dateFrom: z14.string().optional(),
    // YYYY-MM-DD
    dateTo: z14.string().optional(),
    collaboratorId: z14.number().optional(),
    paymentStatus: z14.enum(["pendente", "pago"]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    try {
      let allowedClientIds = null;
      if (ctx.user.role !== "admin") {
        try {
          const [perm] = await db.select().from(userPermissions).where(eq14(userPermissions.userId, ctx.user.id));
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
            const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq14(collaborators.userId, ctx.user.id));
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
      }).from(collaboratorAttendance).innerJoin(collaborators, eq14(collaboratorAttendance.collaboratorId, collaborators.id)).orderBy(desc12(collaboratorAttendance.date));
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
  create: protectedProcedure.input(z14.object({
    collaboratorId: z14.number(),
    date: z14.string(),
    // YYYY-MM-DD
    employmentType: z14.enum(["clt", "terceirizado", "diarista"]),
    dailyValue: z14.string(),
    pixKey: z14.string().optional(),
    activity: z14.string().optional(),
    observations: z14.string().optional(),
    // GPS
    latitude: z14.string().optional(),
    longitude: z14.string().optional(),
    locationName: z14.string().optional(),
    workLocationId: z14.number().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [collaborator] = await db.select({ name: collaborators.name }).from(collaborators).where(eq14(collaborators.id, input.collaboratorId));
    const collaboratorName = collaborator?.name || `ID ${input.collaboratorId}`;
    let resolvedWorkLocationId = input.workLocationId || null;
    let resolvedLocationName = input.locationName || null;
    if (resolvedLocationName && !resolvedWorkLocationId) {
      const [loc] = await db.select({ id: gpsLocations.id }).from(gpsLocations).where(eq14(gpsLocations.name, resolvedLocationName));
      if (loc) resolvedWorkLocationId = loc.id;
    }
    if (resolvedWorkLocationId && !resolvedLocationName) {
      const [loc] = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq14(gpsLocations.id, resolvedWorkLocationId));
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
    return { success: true };
  }),
  // Atualizar status de pagamento
  markPaid: protectedProcedure.input(z14.object({
    id: z14.number(),
    paid: z14.boolean()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.update(collaboratorAttendance).set({
      paymentStatusCa: input.paid ? "pago" : "pendente",
      paidAt: input.paid ? (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") : null
    }).where(eq14(collaboratorAttendance.id, input.id));
    return { success: true };
  }),
  // Deletar presença
  delete: protectedProcedure.input(z14.object({ id: z14.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError10({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.delete(collaboratorAttendance).where(eq14(collaboratorAttendance.id, input.id));
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
    }).from(collaboratorAttendance).innerJoin(collaborators, eq14(collaboratorAttendance.collaboratorId, collaborators.id)).where(
      and6(
        eq14(collaboratorAttendance.paymentStatusCa, "pendente"),
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
  })
});

// server/routers/traccar.ts
import { z as z15 } from "zod";
import { TRPCError as TRPCError11 } from "@trpc/server";
init_db();
init_schema();
import { eq as eq15, and as and7, desc as desc13, gte as gte2, lte as lte2, sql as sql6 } from "drizzle-orm";
var TRACCAR_URL = process.env.TRACCAR_URL || "";
var TRACCAR_TOKEN = process.env.TRACCAR_TOKEN || "";
function traccarAuth() {
  if (TRACCAR_TOKEN) {
    return {
      Authorization: `Bearer ${TRACCAR_TOKEN}`,
      "Content-Type": "application/json"
    };
  }
  const email = process.env.TRACCAR_EMAIL || "";
  const password = process.env.TRACCAR_PASSWORD || "";
  const credentials = Buffer.from(`${email}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json"
  };
}
async function traccarFetch(path2, options) {
  if (!TRACCAR_URL) {
    throw new Error("Traccar nao configurado. Configure TRACCAR_URL e TRACCAR_TOKEN.");
  }
  const url = `${TRACCAR_URL}/api${path2}`;
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
    eq15(preventiveMaintenancePlans.equipmentId, equipmentId),
    eq15(preventiveMaintenancePlans.active, 1)
  ));
  for (const plan of plans) {
    const lastDone = parseFloat(plan.lastDoneHours || "0");
    const dueAt = lastDone + plan.intervalHours;
    const alertAt = dueAt - (plan.alertThresholdHours || 10);
    const existingAlert = await db.select().from(preventiveMaintenanceAlerts).where(and7(
      eq15(preventiveMaintenanceAlerts.planId, plan.id),
      eq15(preventiveMaintenanceAlerts.status, "pendente")
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
  positions: protectedProcedure.input(z15.object({ deviceId: z15.number().optional() }).optional()).query(async ({ input }) => {
    const params = input?.deviceId ? `?deviceId=${input.deviceId}` : "";
    return traccarFetch(`/positions${params}`);
  }),
  /** Historico de posicoes de um dispositivo em um periodo */
  history: protectedProcedure.input(z15.object({ deviceId: z15.number(), from: z15.string(), to: z15.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    return traccarFetch(`/reports/route?${params}`);
  }),
  /** Resumo de viagens de um dispositivo */
  trips: protectedProcedure.input(z15.object({ deviceId: z15.number(), from: z15.string(), to: z15.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    return traccarFetch(`/reports/trips?${params}`);
  }),
  /** Resumo de paradas de um dispositivo */
  stops: protectedProcedure.input(z15.object({ deviceId: z15.number(), from: z15.string(), to: z15.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ deviceId: String(input.deviceId), from: input.from, to: input.to });
    return traccarFetch(`/reports/stops?${params}`);
  }),
  /** Resumo de km e horas por dispositivo no periodo */
  summary: protectedProcedure.input(z15.object({ deviceId: z15.number().optional(), from: z15.string(), to: z15.string() })).query(async ({ input }) => {
    const params = new URLSearchParams({ from: input.from, to: input.to });
    if (input.deviceId) params.set("deviceId", String(input.deviceId));
    return traccarFetch(`/reports/summary?${params}`);
  }),
  /** Geofences (cercas virtuais) */
  geofences: protectedProcedure.query(async () => {
    return traccarFetch("/geofences");
  }),
  /** Eventos recentes (alertas de velocidade, ignicao, geofence) */
  events: protectedProcedure.input(z15.object({ deviceId: z15.number(), from: z15.string(), to: z15.string(), type: z15.string().optional() })).query(async ({ input }) => {
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
    }).from(gpsDeviceLinks).innerJoin(equipment, eq15(gpsDeviceLinks.equipmentId, equipment.id)).where(eq15(gpsDeviceLinks.active, 1)).orderBy(equipment.name);
  }),
  /** Vincula um dispositivo GPS a um equipamento */
  linkDevice: protectedProcedure.input(z15.object({
    equipmentId: z15.number(),
    traccarDeviceId: z15.number(),
    traccarDeviceName: z15.string().optional(),
    traccarUniqueId: z15.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(gpsDeviceLinks).set({ active: 0 }).where(eq15(gpsDeviceLinks.equipmentId, input.equipmentId));
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
  unlinkDevice: protectedProcedure.input(z15.object({ linkId: z15.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(gpsDeviceLinks).set({ active: 0 }).where(eq15(gpsDeviceLinks.id, input.linkId));
    return { ok: true };
  }),
  // ─── HORAS AUTOMATICAS VIA GPS ───────────────────────────────────────────────
  /**
   * Sincroniza as horas de ignicao do dia anterior para todos os equipamentos vinculados.
   * Deve ser chamado diariamente (cron) ou manualmente pelo admin.
   */
  syncDailyHours: protectedProcedure.input(z15.object({ date: z15.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const targetDate = input.date ? new Date(input.date) : new Date(Date.now() - 864e5);
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);
    const links = await db.select().from(gpsDeviceLinks).where(eq15(gpsDeviceLinks.active, 1));
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
            eq15(gpsHoursLog.equipmentId, link.equipmentId),
            gte2(gpsHoursLog.date, from),
            lte2(gpsHoursLog.date, to)
          )).limit(1);
          if (existing.length === 0) {
            await db.insert(gpsHoursLog).values({
              equipmentId: link.equipmentId,
              gpsDeviceLinkId: link.id,
              date: from,
              hoursWorked: String(hours),
              source: "gps_auto"
            });
          }
          const totalResult = await db.select({ total: sql6`SUM(CAST(hours_worked AS DECIMAL(10,2)))` }).from(gpsHoursLog).where(eq15(gpsHoursLog.equipmentId, link.equipmentId));
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
  equipmentHoursSummary: protectedProcedure.input(z15.object({ equipmentId: z15.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const baseQuery = db.select({
      equipmentId: gpsHoursLog.equipmentId,
      equipmentName: equipment.name,
      totalHours: sql6`SUM(CAST(hours_worked AS DECIMAL(10,2)))`,
      lastDate: sql6`MAX(date)`,
      recordCount: sql6`COUNT(*)`
    }).from(gpsHoursLog).innerJoin(equipment, eq15(gpsHoursLog.equipmentId, equipment.id)).groupBy(gpsHoursLog.equipmentId, equipment.name).orderBy(equipment.name);
    if (input?.equipmentId) {
      return baseQuery.where(eq15(gpsHoursLog.equipmentId, input.equipmentId));
    }
    return baseQuery;
  }),
  /** Log de horas de um equipamento especifico */
  hoursLog: protectedProcedure.input(z15.object({ equipmentId: z15.number(), limit: z15.number().default(30) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db.select().from(gpsHoursLog).where(eq15(gpsHoursLog.equipmentId, input.equipmentId)).orderBy(desc13(gpsHoursLog.date)).limit(input.limit);
  }),
  // ─── PLANOS DE MANUTENCAO PREVENTIVA ────────────────────────────────────────
  /** Lista planos de manutencao de um equipamento */
  listMaintenancePlans: protectedProcedure.input(z15.object({ equipmentId: z15.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    return db.select().from(preventiveMaintenancePlans).where(and7(
      eq15(preventiveMaintenancePlans.equipmentId, input.equipmentId),
      eq15(preventiveMaintenancePlans.active, 1)
    )).orderBy(preventiveMaintenancePlans.name);
  }),
  /** Cria ou atualiza um plano de manutencao preventiva */
  upsertMaintenancePlan: protectedProcedure.input(z15.object({
    id: z15.number().optional(),
    equipmentId: z15.number(),
    name: z15.string(),
    type: z15.enum(["troca_oleo", "engraxamento", "filtro_ar", "filtro_combustivel", "correia", "revisao_geral", "abastecimento", "outros"]),
    intervalHours: z15.number().min(1),
    lastDoneHours: z15.string().optional(),
    alertThresholdHours: z15.number().default(10),
    notes: z15.string().optional()
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
      }).where(eq15(preventiveMaintenancePlans.id, input.id));
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
  deleteMaintenancePlan: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    await db.update(preventiveMaintenancePlans).set({ active: 0 }).where(eq15(preventiveMaintenancePlans.id, input.id));
    return { ok: true };
  }),
  // ─── ALERTAS DE MANUTENCAO PREVENTIVA ───────────────────────────────────────
  /** Lista alertas pendentes (todos ou por equipamento) */
  listAlerts: protectedProcedure.input(z15.object({ equipmentId: z15.number().optional(), status: z15.string().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const conditions = [];
    if (input.equipmentId) conditions.push(eq15(preventiveMaintenanceAlerts.equipmentId, input.equipmentId));
    if (input.status) conditions.push(eq15(preventiveMaintenanceAlerts.status, input.status));
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
    }).from(preventiveMaintenanceAlerts).innerJoin(equipment, eq15(preventiveMaintenanceAlerts.equipmentId, equipment.id)).innerJoin(preventiveMaintenancePlans, eq15(preventiveMaintenanceAlerts.planId, preventiveMaintenancePlans.id)).where(conditions.length > 0 ? and7(...conditions) : void 0).orderBy(desc13(preventiveMaintenanceAlerts.generatedAt));
  }),
  /** Resolve (conclui) um alerta e atualiza o horimetro do plano */
  resolveAlert: protectedProcedure.input(z15.object({
    alertId: z15.number(),
    status: z15.enum(["concluido", "ignorado"]),
    notes: z15.string().optional(),
    resolvedHourMeter: z15.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponivel" });
    const now = /* @__PURE__ */ new Date();
    await db.update(preventiveMaintenanceAlerts).set({
      status: input.status,
      resolvedAt: now,
      resolvedBy: ctx.user.id,
      notes: input.notes
    }).where(eq15(preventiveMaintenanceAlerts.id, input.alertId));
    if (input.status === "concluido") {
      const alert = await db.select().from(preventiveMaintenanceAlerts).where(eq15(preventiveMaintenanceAlerts.id, input.alertId)).limit(1);
      if (alert.length > 0) {
        await db.update(preventiveMaintenancePlans).set({
          lastDoneHours: input.resolvedHourMeter || alert[0].currentHours,
          lastDoneAt: now
        }).where(eq15(preventiveMaintenancePlans.id, alert[0].planId));
      }
    }
    return { ok: true };
  }),
  /** Contagem de alertas pendentes (para badge na sidebar) */
  alertCount: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const result = await db.select({ count: sql6`COUNT(*)` }).from(preventiveMaintenanceAlerts).where(eq15(preventiveMaintenanceAlerts.status, "pendente"));
    return { count: Number(result[0]?.count || 0) };
  })
});

// server/routers/permissions.ts
import { z as z16 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError12 } from "@trpc/server";
import { eq as eq16, sql as sql7 } from "drizzle-orm";
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
  // Administrativo (valores financeiros)
  { slug: "financeiro", label: "M\xF3dulo Financeiro", group: "Administrativo" },
  { slug: "relatorios", label: "Relat\xF3rios", group: "Administrativo" },
  { slug: "dashboard-exec", label: "Dashboard Executivo", group: "Administrativo" },
  { slug: "acesso", label: "Controle de Acesso", group: "Administrativo" }
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
    }).from(collaborators).where(eq16(collaborators.active, 1)).orderBy(collaborators.name);
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
      const [permRow] = await db.select().from(userPermissions).where(eq16(userPermissions.userId, ctx.user.id));
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
        }).from(collaborators).where(eq16(collaborators.userId, ctx.user.id));
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
  setPermissions: protectedProcedure.input(z16.object({
    userId: z16.number(),
    modules: z16.array(z16.string()).nullable(),
    profile: z16.string().default("custom"),
    allowedClientIds: z16.array(z16.number()).nullable().optional(),
    allowedWorkLocationIds: z16.array(z16.number()).nullable().optional()
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
      await db.update(collaborators).set({ clientId }).where(eq16(collaborators.id, collabId));
      return { success: true };
    }
    try {
      const [existing] = await db.select().from(userPermissions).where(eq16(userPermissions.userId, input.userId));
      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profile,
          allowedClientIds: allowedClientIdsJson,
          allowedWorkLocationIds: allowedWorkLocationIdsJson,
          updatedBy: ctx.user.id
        }).where(eq16(userPermissions.userId, input.userId));
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
    const [collab] = await db.select({ id: collaborators.id }).from(collaborators).where(eq16(collaborators.userId, input.userId));
    if (collab && input.allowedClientIds && input.allowedClientIds.length > 0) {
      await db.update(collaborators).set({ clientId: input.allowedClientIds[0] }).where(eq16(collaborators.id, collab.id));
    }
    return { success: true };
  }),
  // Aplicar perfil pré-definido a um usuário
  applyProfile: protectedProcedure.input(z16.object({
    userId: z16.number(),
    profileKey: z16.string()
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
      const [existing] = await db.select().from(userPermissions).where(eq16(userPermissions.userId, input.userId));
      if (existing) {
        await db.update(userPermissions).set({
          modules: modulesJson,
          profile: input.profileKey,
          updatedBy: ctx.user.id
        }).where(eq16(userPermissions.userId, input.userId));
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
  setCollaboratorClient: protectedProcedure.input(z16.object({
    collaboratorId: z16.number(),
    clientId: z16.number().nullable()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(collaborators).set({ clientId: input.clientId }).where(eq16(collaborators.id, input.collaboratorId));
    return { success: true };
  })
});

// server/routers/chainsaws.ts
import { z as z17 } from "zod";
init_db();
init_schema();
import { eq as eq17, desc as desc14, and as and8, sql as sql8 } from "drizzle-orm";
var chainsawsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsaws).orderBy(chainsaws.name);
  }),
  create: protectedProcedure.input(z17.object({
    name: z17.string().min(1),
    brand: z17.string().optional(),
    model: z17.string().optional(),
    serialNumber: z17.string().optional(),
    chainType: z17.string().default("30"),
    imageUrl: z17.string().optional(),
    notes: z17.string().optional()
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
  update: protectedProcedure.input(z17.object({
    id: z17.number(),
    name: z17.string().min(1).optional(),
    brand: z17.string().optional(),
    model: z17.string().optional(),
    serialNumber: z17.string().optional(),
    chainType: z17.string().optional(),
    status: z17.enum(["ativa", "oficina", "inativa"]).optional(),
    imageUrl: z17.string().optional(),
    notes: z17.string().optional()
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
    await db.update(chainsaws).set({ ...data, ...imageUrl !== void 0 ? { imageUrl } : {} }).where(eq17(chainsaws.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(chainsaws).where(eq17(chainsaws.id, input.id));
    return { success: true };
  })
});
var fuelRouter = router({
  listContainers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(fuelContainers).where(eq17(fuelContainers.isActive, 1)).orderBy(fuelContainers.name);
  }),
  createContainer: protectedProcedure.input(z17.object({
    name: z17.string().min(1),
    color: z17.string().default("vermelho"),
    type: z17.enum(["puro", "mistura"]),
    capacityLiters: z17.string().default("20"),
    notes: z17.string().optional()
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
  supplyContainer: protectedProcedure.input(z17.object({
    containerId: z17.number(),
    volumeLiters: z17.string(),
    costPerLiter: z17.string().optional(),
    totalCost: z17.string().optional(),
    notes: z17.string().optional(),
    workLocationId: z17.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [container] = await db.select().from(fuelContainers).where(eq17(fuelContainers.id, input.containerId));
    if (!container) throw new Error("Gal\xE3o n\xE3o encontrado");
    const newVolume = (parseFloat(container.currentVolumeLiters || "0") + parseFloat(input.volumeLiters)).toFixed(2);
    await db.update(fuelContainers).set({ currentVolumeLiters: newVolume }).where(eq17(fuelContainers.id, input.containerId));
    let oil2tMl;
    if (container.type === "mistura") {
      const oil2t = (parseFloat(input.volumeLiters) * 20).toFixed(0);
      oil2tMl = oil2t;
      const oil2tParts = await db.select().from(chainsawParts).where(and8(
        eq17(chainsawParts.isActive, 1),
        sql8`(LOWER(${chainsawParts.name}) LIKE '%2t%' OR LOWER(${chainsawParts.name}) LIKE '%dois tempos%')`
      )).limit(1);
      const oil2tPart = oil2tParts[0];
      if (oil2tPart) {
        const currentStock = parseFloat(oil2tPart.currentStock || "0");
        const usedMl = parseFloat(oil2t);
        const newStock = Math.max(0, currentStock - usedMl).toFixed(0);
        await db.update(chainsawParts).set({ currentStock: newStock }).where(eq17(chainsawParts.id, oil2tPart.id));
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
  useFuel: protectedProcedure.input(z17.object({
    containerId: z17.number(),
    volumeLiters: z17.string(),
    chainsawId: z17.number().optional(),
    notes: z17.string().optional(),
    workLocationId: z17.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [container] = await db.select().from(fuelContainers).where(eq17(fuelContainers.id, input.containerId));
    if (!container) throw new Error("Gal\xE3o n\xE3o encontrado");
    const currentVol = parseFloat(container.currentVolumeLiters || "0");
    const usedVol = parseFloat(input.volumeLiters);
    if (usedVol > currentVol) throw new Error("Volume insuficiente no gal\xE3o");
    const newVolume = (currentVol - usedVol).toFixed(2);
    await db.update(fuelContainers).set({ currentVolumeLiters: newVolume }).where(eq17(fuelContainers.id, input.containerId));
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
  transferFuel: protectedProcedure.input(z17.object({
    sourceContainerId: z17.number(),
    targetContainerId: z17.number(),
    volumeLiters: z17.string(),
    notes: z17.string().optional(),
    workLocationId: z17.number().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [source] = await db.select().from(fuelContainers).where(eq17(fuelContainers.id, input.sourceContainerId));
    const [target] = await db.select().from(fuelContainers).where(eq17(fuelContainers.id, input.targetContainerId));
    if (!source || !target) throw new Error("Gal\xE3o n\xE3o encontrado");
    const sourceVol = parseFloat(source.currentVolumeLiters || "0");
    const transferVol = parseFloat(input.volumeLiters);
    if (transferVol > sourceVol) throw new Error("Volume insuficiente no gal\xE3o de origem");
    const targetVol = parseFloat(target.currentVolumeLiters || "0");
    await db.update(fuelContainers).set({ currentVolumeLiters: (sourceVol - transferVol).toFixed(2) }).where(eq17(fuelContainers.id, input.sourceContainerId));
    await db.update(fuelContainers).set({ currentVolumeLiters: (targetVol + transferVol).toFixed(2) }).where(eq17(fuelContainers.id, input.targetContainerId));
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
  listEvents: protectedProcedure.input(z17.object({ containerId: z17.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.containerId) {
      return db.select().from(fuelContainerEvents).where(eq17(fuelContainerEvents.containerId, input.containerId)).orderBy(desc14(fuelContainerEvents.eventDate)).limit(50);
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
  upsertStock: protectedProcedure.input(z17.object({
    chainType: z17.string(),
    sharpenedInBox: z17.number().optional(),
    inField: z17.number().optional(),
    inWorkshop: z17.number().optional(),
    totalStock: z17.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select().from(chainsawChainStock).where(eq17(chainsawChainStock.chainType, input.chainType));
    if (existing.length > 0) {
      const e = existing[0];
      await db.update(chainsawChainStock).set({
        sharpenedInBox: input.sharpenedInBox ?? e.sharpenedInBox,
        inField: input.inField ?? e.inField,
        inWorkshop: input.inWorkshop ?? e.inWorkshop,
        totalStock: input.totalStock ?? e.totalStock
      }).where(eq17(chainsawChainStock.chainType, input.chainType));
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
  registerEvent: protectedProcedure.input(z17.object({
    chainType: z17.string(),
    eventType: z17.enum(["envio_campo", "retorno_oficina", "afiacao_concluida", "baixa_estoque", "entrada_estoque"]),
    quantity: z17.number().min(1),
    chainsawId: z17.number().optional(),
    notes: z17.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const stockRows = await db.select().from(chainsawChainStock).where(eq17(chainsawChainStock.chainType, input.chainType));
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
    await db.update(chainsawChainStock).set(updates).where(eq17(chainsawChainStock.chainType, input.chainType));
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
  listEvents: protectedProcedure.input(z17.object({ chainType: z17.string().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.chainType) {
      return db.select().from(chainsawChainEvents).where(eq17(chainsawChainEvents.chainType, input.chainType)).orderBy(desc14(chainsawChainEvents.eventDate)).limit(50);
    }
    return db.select().from(chainsawChainEvents).orderBy(desc14(chainsawChainEvents.eventDate)).limit(100);
  })
});
var chainsawPartsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chainsawParts).where(eq17(chainsawParts.isActive, 1)).orderBy(chainsawParts.category, chainsawParts.name);
  }),
  create: protectedProcedure.input(z17.object({
    code: z17.string().optional(),
    name: z17.string().min(1),
    category: z17.string().optional(),
    unit: z17.string().default("un"),
    currentStock: z17.string().default("0"),
    minStock: z17.string().default("0"),
    unitCost: z17.string().optional(),
    imageUrl: z17.string().optional(),
    notes: z17.string().optional()
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
  update: protectedProcedure.input(z17.object({
    id: z17.number(),
    code: z17.string().optional(),
    name: z17.string().optional(),
    category: z17.string().optional(),
    unit: z17.string().optional(),
    currentStock: z17.string().optional(),
    minStock: z17.string().optional(),
    unitCost: z17.string().optional(),
    imageUrl: z17.string().optional(),
    notes: z17.string().optional()
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
    await db.update(chainsawParts).set(updateData).where(eq17(chainsawParts.id, id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(chainsawParts).set({ isActive: 0 }).where(eq17(chainsawParts.id, input.id));
    return { success: true };
  }),
  stockEntry: protectedProcedure.input(z17.object({
    partId: z17.number(),
    quantity: z17.string(),
    unitCost: z17.string().optional(),
    notes: z17.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const parts3 = await db.select().from(chainsawParts).where(eq17(chainsawParts.id, input.partId));
    if (parts3.length === 0) throw new Error("Pe\xE7a n\xE3o encontrada");
    const part = parts3[0];
    const newStock = (parseFloat(part.currentStock || "0") + parseFloat(input.quantity)).toFixed(2);
    await db.update(chainsawParts).set({ currentStock: newStock }).where(eq17(chainsawParts.id, input.partId));
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
  listMovements: protectedProcedure.input(z17.object({ partId: z17.number().optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    if (input.partId) {
      return db.select().from(chainsawPartMovements).where(eq17(chainsawPartMovements.partId, input.partId)).orderBy(desc14(chainsawPartMovements.createdAt)).limit(50);
    }
    return db.select().from(chainsawPartMovements).orderBy(desc14(chainsawPartMovements.createdAt)).limit(100);
  })
});
var chainsawOSRouter = router({
  list: protectedProcedure.input(z17.object({
    status: z17.enum(["aberta", "em_andamento", "concluida", "cancelada", "todas"]).default("todas")
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
    }).from(chainsawServiceOrders).leftJoin(chainsaws, eq17(chainsawServiceOrders.chainsawId, chainsaws.id)).where(
      input.status === "todas" ? void 0 : eq17(chainsawServiceOrders.status, input.status)
    ).orderBy(desc14(chainsawServiceOrders.openedAt));
    return rows;
  }),
  getById: protectedProcedure.input(z17.object({ id: z17.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(chainsawServiceOrders).where(eq17(chainsawServiceOrders.id, input.id));
    if (rows.length === 0) throw new Error("OS n\xE3o encontrada");
    const parts3 = await db.select().from(chainsawServiceParts).where(eq17(chainsawServiceParts.serviceOrderId, input.id));
    return { ...rows[0], parts: parts3 };
  }),
  open: protectedProcedure.input(z17.object({
    chainsawId: z17.number(),
    problemType: z17.enum(["motor_falhando", "nao_liga", "superaquecimento", "vazamento", "corrente_problema", "sabre_problema", "manutencao_preventiva", "outro"]),
    problemDescription: z17.string().optional(),
    priority: z17.enum(["baixa", "media", "alta", "urgente"]).default("media"),
    imageUrl: z17.string().optional()
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
    await db.update(chainsaws).set({ status: "oficina" }).where(eq17(chainsaws.id, input.chainsawId));
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
  startService: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(chainsawServiceOrders).set({ status: "em_andamento", mechanicId: ctx.user.id }).where(eq17(chainsawServiceOrders.id, input.id));
    return { success: true };
  }),
  complete: protectedProcedure.input(z17.object({
    id: z17.number(),
    serviceDescription: z17.string().min(1),
    parts: z17.array(z17.object({
      partId: z17.number().optional(),
      partName: z17.string(),
      quantity: z17.string(),
      unit: z17.string().default("un"),
      unitCost: z17.string().optional(),
      fromStock: z17.number().default(1)
    })).default([])
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const osRows = await db.select().from(chainsawServiceOrders).where(eq17(chainsawServiceOrders.id, input.id));
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
        const pRows = await db.select().from(chainsawParts).where(eq17(chainsawParts.id, part.partId));
        if (pRows.length > 0) {
          const p = pRows[0];
          const newStock = Math.max(0, parseFloat(p.currentStock || "0") - parseFloat(part.quantity)).toFixed(2);
          await db.update(chainsawParts).set({ currentStock: newStock }).where(eq17(chainsawParts.id, part.partId));
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
    }).where(eq17(chainsawServiceOrders.id, input.id));
    await db.update(chainsaws).set({ status: "ativa" }).where(eq17(chainsaws.id, os.chainsawId));
    return { success: true };
  }),
  cancel: protectedProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const osRows = await db.select().from(chainsawServiceOrders).where(eq17(chainsawServiceOrders.id, input.id));
    if (osRows.length === 0) throw new Error("OS n\xE3o encontrada");
    const os = osRows[0];
    await db.update(chainsawServiceOrders).set({ status: "cancelada" }).where(eq17(chainsawServiceOrders.id, input.id));
    await db.update(chainsaws).set({ status: "ativa" }).where(eq17(chainsaws.id, os.chainsawId));
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
import { z as z18 } from "zod";
init_db();
init_schema();
import { desc as desc15, eq as eq18, and as and9, gte as gte3, lte as lte3, sql as sql9 } from "drizzle-orm";
var extraExpensesRouter = router({
  list: protectedProcedure.input(z18.object({
    dateFrom: z18.string().optional(),
    dateTo: z18.string().optional(),
    category: z18.string().optional()
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
      conditions.push(eq18(extraExpenses.category, input.category));
    }
    let allowedClientIds = null;
    if (ctx.user.role !== "admin") {
      try {
        const [perm] = await db.select().from(userPermissions).where(eq18(userPermissions.userId, ctx.user.id));
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
          const [collab] = await db.select({ clientId: collaborators.clientId }).from(collaborators).where(eq18(collaborators.userId, ctx.user.id));
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
      locationName: gpsLocations.name,
      locationClientId: gpsLocations.clientId
    }).from(extraExpenses).leftJoin(gpsLocations, eq18(extraExpenses.workLocationId, gpsLocations.id)).where(conditions.length > 0 ? and9(...conditions) : void 0).orderBy(desc15(extraExpenses.date));
    if (allowedClientIds && allowedClientIds.length > 0) {
      return rows.filter((r) => {
        const cId = r.clientId || r.locationClientId;
        return cId && allowedClientIds.includes(cId);
      });
    }
    return rows;
  }),
  create: protectedProcedure.input(z18.object({
    date: z18.string(),
    category: z18.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]),
    description: z18.string().min(1),
    amount: z18.string().min(1),
    paymentMethod: z18.enum(["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro"),
    receiptImageUrl: z18.string().optional(),
    notes: z18.string().optional(),
    workLocationId: z18.number().optional(),
    clientId: z18.number().optional()
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
      clientId: input.clientId || null
    });
    return { id: result.insertId };
  }),
  updateLocation: protectedProcedure.input(z18.object({
    id: z18.number(),
    workLocationId: z18.number().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(extraExpenses).set({
      workLocationId: input.workLocationId
    }).where(eq18(extraExpenses.id, input.id));
    return { success: true };
  }),
  delete: protectedProcedure.input(z18.object({ id: z18.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(extraExpenses).where(eq18(extraExpenses.id, input.id));
    return { success: true };
  })
});

// server/routers/dashboard.ts
init_db();
init_schema();
import { sql as sql10, gte as gte4, lte as lte4, and as and10 } from "drizzle-orm";
import { z as z19 } from "zod";
var dashboardRouter = router({
  stats: protectedProcedure.input(z19.object({
    month: z19.number().min(0).max(11).optional(),
    // 0-indexed
    year: z19.number().min(2020).max(2100).optional()
  }).optional()).query(async ({ input }) => {
    const now = /* @__PURE__ */ new Date();
    const targetMonth = input?.month ?? now.getMonth();
    const targetYear = input?.year ?? now.getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
import { z as z20 } from "zod";
init_db();
init_schema();
import { desc as desc16, eq as eq19, and as and11, gte as gte5, lte as lte5, sql as sql11 } from "drizzle-orm";
var financialRouter = router({
  // ── Listar lançamentos ──────────────────────────────────────────────────
  list: protectedProcedure.input(z20.object({
    type: z20.enum(["receita", "despesa", "all"]).default("all"),
    dateFrom: z20.string().optional(),
    dateTo: z20.string().optional(),
    referenceMonth: z20.string().optional(),
    // "2026-04"
    status: z20.string().optional(),
    category: z20.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.type !== "all") {
      conditions.push(eq19(financialEntries.type, input.type));
    }
    if (input.dateFrom) {
      conditions.push(gte5(financialEntries.date, new Date(input.dateFrom)));
    }
    if (input.dateTo) {
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte5(financialEntries.date, to));
    }
    if (input.referenceMonth) {
      conditions.push(eq19(financialEntries.referenceMonth, input.referenceMonth));
    }
    if (input.status) {
      conditions.push(eq19(financialEntries.status, input.status));
    }
    if (input.category) {
      conditions.push(eq19(financialEntries.category, input.category));
    }
    return db.select().from(financialEntries).where(conditions.length > 0 ? and11(...conditions) : void 0).orderBy(desc16(financialEntries.date));
  }),
  // ── Resumo mensal ────────────────────────────────────────────────────────
  monthlySummary: protectedProcedure.input(z20.object({
    referenceMonth: z20.string()
    // "2026-04"
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { totalReceitas: 0, totalDespesas: 0, saldo: 0, entries: [] };
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const entries = await db.select().from(financialEntries).where(and11(
      gte5(financialEntries.date, startDate),
      lte5(financialEntries.date, endDate),
      eq19(financialEntries.status, "confirmado")
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
  categoryBreakdown: protectedProcedure.input(z20.object({
    referenceMonth: z20.string(),
    type: z20.enum(["receita", "despesa"])
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const rows = await db.select({
      category: financialEntries.category,
      total: sql11`coalesce(sum(cast(amount as decimal(10,2))), 0)`,
      count: sql11`count(*)`
    }).from(financialEntries).where(and11(
      eq19(financialEntries.type, input.type),
      gte5(financialEntries.date, startDate),
      lte5(financialEntries.date, endDate),
      eq19(financialEntries.status, "confirmado")
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
      eq19(financialEntries.status, "confirmado"),
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
  create: protectedProcedure.input(z20.object({
    type: z20.enum(["receita", "despesa"]),
    category: z20.string().min(1),
    description: z20.string().min(1),
    amount: z20.string().min(1),
    date: z20.string(),
    paymentMethod: z20.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).default("pix"),
    status: z20.enum(["pendente", "confirmado", "cancelado"]).default("confirmado"),
    clientId: z20.number().optional(),
    clientName: z20.string().optional(),
    receiptImageUrl: z20.string().optional(),
    notes: z20.string().optional()
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
      date: dateObj,
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
  update: protectedProcedure.input(z20.object({
    id: z20.number(),
    type: z20.enum(["receita", "despesa"]).optional(),
    category: z20.string().optional(),
    description: z20.string().optional(),
    amount: z20.string().optional(),
    date: z20.string().optional(),
    paymentMethod: z20.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).optional(),
    status: z20.enum(["pendente", "confirmado", "cancelado"]).optional(),
    clientName: z20.string().optional(),
    notes: z20.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, date, ...rest } = input;
    const updateData = { ...rest };
    if (date) {
      const dateObj = new Date(date);
      updateData.date = dateObj;
      updateData.referenceMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    }
    await db.update(financialEntries).set(updateData).where(eq19(financialEntries.id, id));
    return { success: true };
  }),
  // ──   // ── Excluir lançamento ───────────────────────────────────────────
  delete: protectedProcedure.input(z20.object({ id: z20.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(financialEntries).where(eq19(financialEntries.id, input.id));
    return { success: true };
  }),
  // ── Lançar folha de pagamento automaticamente ──────────────────────
  launchPayroll: protectedProcedure.input(z20.object({
    referenceMonth: z20.string()
    // "YYYY-MM"
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select({ id: financialEntries.id }).from(financialEntries).where(and11(
      eq19(financialEntries.referenceMonth, input.referenceMonth),
      eq19(financialEntries.category, "folha_pagamento"),
      eq19(financialEntries.type, "despesa")
    )).limit(1);
    if (existing.length > 0) {
      return { success: false, alreadyExists: true, message: "Folha de pagamento j\xE1 foi lan\xE7ada para este m\xEAs." };
    }
    const [year, month] = input.referenceMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
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
  checkPayrollStatus: protectedProcedure.input(z20.object({ referenceMonth: z20.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select({ id: financialEntries.id, amount: financialEntries.amount, description: financialEntries.description }).from(financialEntries).where(and11(
      eq19(financialEntries.referenceMonth, input.referenceMonth),
      eq19(financialEntries.category, "folha_pagamento"),
      eq19(financialEntries.type, "despesa")
    )).limit(1);
    return { launched: existing.length > 0, entry: existing[0] || null };
  })
});

// server/routers/gpsLocations.ts
import { z as z21 } from "zod";
import { eq as eq20, desc as desc17 } from "drizzle-orm";
init_db();
init_schema();
var gpsLocationsRouter = router({
  // ── Listar todos os locais ativos ────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(gpsLocations).orderBy(desc17(gpsLocations.createdAt));
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq20(userPermissions.userId, ctx.user.id));
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
    const rows = await db.select().from(gpsLocations).where(eq20(gpsLocations.isActive, 1)).orderBy(gpsLocations.name);
    if (ctx.user.role !== "admin") {
      const [perm] = await db.select().from(userPermissions).where(eq20(userPermissions.userId, ctx.user.id));
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
  create: protectedProcedure.input(z21.object({
    name: z21.string().min(1, "Nome \xE9 obrigat\xF3rio"),
    latitude: z21.string().min(1, "Latitude \xE9 obrigat\xF3ria"),
    longitude: z21.string().min(1, "Longitude \xE9 obrigat\xF3ria"),
    radiusMeters: z21.number().min(100).max(5e4).default(2e3),
    clientId: z21.number().optional(),
    notes: z21.string().optional()
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
  update: protectedProcedure.input(z21.object({
    id: z21.number(),
    name: z21.string().min(1).optional(),
    latitude: z21.string().optional(),
    longitude: z21.string().optional(),
    radiusMeters: z21.number().min(100).max(5e4).optional(),
    clientId: z21.number().nullable().optional(),
    notes: z21.string().optional(),
    isActive: z21.number().optional()
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
    await db.update(gpsLocations).set(updateData).where(eq20(gpsLocations.id, id));
    return { success: true };
  }),
  // ── Excluir local ────────────────────────────────────────────────────────
  delete: protectedProcedure.input(z21.object({ id: z21.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(gpsLocations).where(eq20(gpsLocations.id, input.id));
    return { success: true };
  })
});

// server/routers/reports.ts
import { z as z22 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError13 } from "@trpc/server";
import { eq as eq21, desc as desc18, and as and13, gte as gte6, lte as lte6, sql as sql12, isNull as isNull2 } from "drizzle-orm";
var reportsRouter = router({
  // ── Listar todos os locais de trabalho (para filtro) ──────────────────────
  locations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    return db.select({ id: gpsLocations.id, name: gpsLocations.name, isActive: gpsLocations.isActive }).from(gpsLocations).orderBy(gpsLocations.name);
  }),
  // ── Padronizar nomes de locais (atualizar locationName em registros antigos) ──
  standardizeLocationNames: protectedProcedure.input(z22.object({
    oldName: z22.string(),
    newLocationId: z22.number(),
    newLocationName: z22.string()
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
  fullReport: protectedProcedure.input(z22.object({
    locationId: z22.number().optional(),
    // null = todos os locais
    dateFrom: z22.string(),
    // YYYY-MM-DD
    dateTo: z22.string(),
    // YYYY-MM-DD
    includeMaoDeObra: z22.boolean().default(true),
    includeConsumo: z22.boolean().default(true),
    includeCargas: z22.boolean().default(true)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    let maoDeObra = [];
    if (input.includeMaoDeObra) {
      const attendanceQuery = db.select({
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
      }).from(collaboratorAttendance).innerJoin(collaborators, eq21(collaboratorAttendance.collaboratorId, collaborators.id)).where(
        and13(
          gte6(collaboratorAttendance.date, dateFrom),
          lte6(collaboratorAttendance.date, dateTo),
          ...input.locationId ? [eq21(collaboratorAttendance.workLocationId, input.locationId)] : []
        )
      ).orderBy(desc18(collaboratorAttendance.date));
      maoDeObra = await attendanceQuery;
    }
    let consumoVeiculos = [];
    if (input.includeConsumo) {
      consumoVeiculos = await db.select({
        id: fuelRecords.id,
        date: fuelRecords.date,
        equipmentName: equipment.name,
        equipmentPlate: equipment.plate,
        fuelType: fuelRecords.fuelType,
        liters: fuelRecords.liters,
        totalValue: fuelRecords.totalValue,
        pricePerLiter: fuelRecords.pricePerLiter,
        station: fuelRecords.station,
        workLocationId: fuelRecords.workLocationId
      }).from(fuelRecords).innerJoin(equipment, eq21(fuelRecords.equipmentId, equipment.id)).where(
        and13(
          gte6(fuelRecords.date, dateFrom),
          lte6(fuelRecords.date, dateTo),
          ...input.locationId ? [eq21(fuelRecords.workLocationId, input.locationId)] : []
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
      }).from(machineFuel).innerJoin(equipment, eq21(machineFuel.equipmentId, equipment.id)).where(
        and13(
          gte6(machineFuel.date, dateFrom),
          lte6(machineFuel.date, dateTo),
          ...input.locationId ? [eq21(machineFuel.workLocationId, input.locationId)] : []
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
          ...input.locationId ? [eq21(extraExpenses.workLocationId, input.locationId)] : []
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
          ...input.locationId ? [eq21(cargoLoads.workLocationId, input.locationId)] : []
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
  dashboardByLocation: protectedProcedure.input(z22.object({
    dateFrom: z22.string(),
    dateTo: z22.string()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError13({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    const locations = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(eq21(gpsLocations.isActive, 1)).orderBy(gpsLocations.name);
    const locationData = await Promise.all(locations.map(async (loc) => {
      const attendance = await db.select({ dailyValue: collaboratorAttendance.dailyValue }).from(collaboratorAttendance).where(and13(
        eq21(collaboratorAttendance.workLocationId, loc.id),
        gte6(collaboratorAttendance.date, dateFrom),
        lte6(collaboratorAttendance.date, dateTo)
      ));
      const totalMaoDeObra = attendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
      const fuel = await db.select({ totalValue: fuelRecords.totalValue, liters: fuelRecords.liters }).from(fuelRecords).where(and13(
        eq21(fuelRecords.workLocationId, loc.id),
        gte6(fuelRecords.date, dateFrom),
        lte6(fuelRecords.date, dateTo)
      ));
      const totalFuel = fuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalFuelLiters = fuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0);
      const mfuel = await db.select({ totalValue: machineFuel.totalValue, liters: machineFuel.liters }).from(machineFuel).where(and13(
        eq21(machineFuel.workLocationId, loc.id),
        gte6(machineFuel.date, dateFrom),
        lte6(machineFuel.date, dateTo)
      ));
      const totalMFuel = mfuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalMFuelLiters = mfuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0);
      const extras = await db.select({ amount: extraExpenses.amount }).from(extraExpenses).where(and13(
        eq21(extraExpenses.workLocationId, loc.id),
        gte6(extraExpenses.date, dateFrom),
        lte6(extraExpenses.date, dateTo)
      ));
      const totalExtras = extras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const cargos = await db.select({ volumeM3: cargoLoads.volumeM3 }).from(cargoLoads).where(and13(
        eq21(cargoLoads.workLocationId, loc.id),
        gte6(cargoLoads.date, dateFrom),
        lte6(cargoLoads.date, dateTo)
      ));
      const totalVolume = cargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);
      return {
        locationId: loc.id,
        locationName: loc.name,
        maoDeObra: { total: totalMaoDeObra, dias: attendance.length },
        combustivel: { total: totalFuel + totalMFuel, litros: totalFuelLiters + totalMFuelLiters },
        despesasExtras: { total: totalExtras, qtd: extras.length },
        cargas: { total: cargos.length, volumeM3: totalVolume },
        custoTotal: totalMaoDeObra + totalFuel + totalMFuel + totalExtras
      };
    }));
    const unassignedAttendance = await db.select({ dailyValue: collaboratorAttendance.dailyValue }).from(collaboratorAttendance).where(and13(
      isNull2(collaboratorAttendance.workLocationId),
      gte6(collaboratorAttendance.date, dateFrom),
      lte6(collaboratorAttendance.date, dateTo)
    ));
    const unassignedTotal = unassignedAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
    return {
      locations: locationData,
      unassigned: {
        maoDeObra: { total: unassignedTotal, dias: unassignedAttendance.length }
      },
      totals: {
        custoTotal: locationData.reduce((s, l) => s + l.custoTotal, 0) + unassignedTotal,
        totalMaoDeObra: locationData.reduce((s, l) => s + l.maoDeObra.total, 0) + unassignedTotal,
        totalCombustivel: locationData.reduce((s, l) => s + l.combustivel.total, 0),
        totalDespesas: locationData.reduce((s, l) => s + l.despesasExtras.total, 0),
        totalCargas: locationData.reduce((s, l) => s + l.cargas.total, 0),
        totalVolumeM3: locationData.reduce((s, l) => s + l.cargas.volumeM3, 0)
      }
    };
  })
});

// server/routers/reportPdf.ts
import { z as z23 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError14 } from "@trpc/server";
import { eq as eq22, desc as desc19, and as and14, gte as gte7, lte as lte7 } from "drizzle-orm";
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
  generatePdfHtml: protectedProcedure.input(z23.object({
    locationId: z23.number().optional(),
    dateFrom: z23.string(),
    dateTo: z23.string(),
    includeMaoDeObra: z23.boolean().default(true),
    includeConsumo: z23.boolean().default(true),
    includeCargas: z23.boolean().default(true)
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError14({ code: "INTERNAL_SERVER_ERROR", message: "DB indispon\xEDvel" });
    const dateFrom = input.dateFrom + " 00:00:00";
    const dateTo = input.dateTo + " 23:59:59";
    let locationName = "Todos os Locais";
    if (input.locationId) {
      const loc = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq22(gpsLocations.id, input.locationId));
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
      }).from(collaboratorAttendance).innerJoin(collaborators, eq22(collaboratorAttendance.collaboratorId, collaborators.id)).where(and14(
        gte7(collaboratorAttendance.date, dateFrom),
        lte7(collaboratorAttendance.date, dateTo),
        ...input.locationId ? [eq22(collaboratorAttendance.workLocationId, input.locationId)] : []
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
      }).from(fuelRecords).innerJoin(equipment, eq22(fuelRecords.equipmentId, equipment.id)).where(and14(
        gte7(fuelRecords.date, dateFrom),
        lte7(fuelRecords.date, dateTo),
        ...input.locationId ? [eq22(fuelRecords.workLocationId, input.locationId)] : []
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
      }).from(machineFuel).innerJoin(equipment, eq22(machineFuel.equipmentId, equipment.id)).where(and14(
        gte7(machineFuel.date, dateFrom),
        lte7(machineFuel.date, dateTo),
        ...input.locationId ? [eq22(machineFuel.workLocationId, input.locationId)] : []
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
      }).from(extraExpenses).where(and14(
        gte7(extraExpenses.date, dateFrom),
        lte7(extraExpenses.date, dateTo),
        ...input.locationId ? [eq22(extraExpenses.workLocationId, input.locationId)] : []
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
      }).from(cargoLoads).where(and14(
        gte7(cargoLoads.date, dateFrom),
        lte7(cargoLoads.date, dateTo),
        ...input.locationId ? [eq22(cargoLoads.workLocationId, input.locationId)] : []
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

// server/routers.ts
import { z as z24 } from "zod";
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
import crypto from "crypto";
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
        const { sql: sql14 } = await import("drizzle-orm");
        const [permsRows] = await db.execute(sql14`SELECT * FROM user_permissions WHERE user_id = ${ctx.user.id}`);
        const [collabRows] = await db.execute(sql14`SELECT id, name, email, role, client_id, user_id, active FROM collaborators WHERE user_id = ${ctx.user.id}`);
        const [countRows] = await db.execute(sql14`SELECT COUNT(*) as cnt FROM collaborators WHERE active = 1`);
        const [colsRows] = await db.execute(sql14`SHOW COLUMNS FROM collaborators`);
        const [sampleRows] = await db.execute(sql14`SELECT id, name, user_id, client_id, active FROM collaborators WHERE active = 1 LIMIT 3`);
        let myPermsResult = null;
        try {
          const { collaborators: collabTable, userPermissions: upTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq23 } = await import("drizzle-orm");
          const permResult = await db.select().from(upTable).where(eq23(upTable.userId, ctx.user.id));
          const collabResult = await db.select({
            clientId: collabTable.clientId,
            role: collabTable.role
          }).from(collabTable).where(eq23(collabTable.userId, ctx.user.id));
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
        const { collaboratorAttendance: collaboratorAttendance2, collaborators: collaborators2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq23, desc: desc20 } = await import("drizzle-orm");
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
    register: publicProcedure.input(z24.object({
      name: z24.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      email: z24.string().email("Email inv\xE1lido"),
      password: z24.string().min(6, "Senha deve ter pelo menos 6 caracteres")
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
    login: publicProcedure.input(z24.object({
      email: z24.string().email("Email inv\xE1lido"),
      password: z24.string().min(1, "Senha \xE9 obrigat\xF3ria")
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
        throw new Error(error instanceof Error ? error.message : "Erro ao fazer login");
      }
    }),
    // Rota de seed para criar/atualizar admin (apenas para uso interno)
    seedAdmin: publicProcedure.input(z24.object({
      seedKey: z24.string(),
      email: z24.string().email(),
      name: z24.string(),
      password: z24.string().min(4)
    })).mutation(async ({ input }) => {
      if (input.seedKey !== "BTREE_SEED_2026") {
        throw new Error("Chave inv\xE1lida");
      }
      const passwordHash = await hashPassword(input.password);
      const result = await updateUserPasswordByEmail(input.email, passwordHash, "admin");
      return { success: true, message: `Admin ${input.email} ${result.action === "updated" ? "atualizado" : "criado"} com sucesso` };
    }),
    // Solicitar recuperação de senha
    forgotPassword: publicProcedure.input(z24.object({
      email: z24.string().email("Email inv\xE1lido"),
      origin: z24.string().url().optional()
    })).mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        return { success: true };
      }
      const token = crypto.randomBytes(48).toString("hex");
      await createPasswordResetToken(user.id, token);
      const baseUrl = input.origin || "https://btreeambiental.com";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      return { success: true };
    }),
    // Redefinir senha com token
    resetPassword: publicProcedure.input(z24.object({
      token: z24.string().min(1),
      password: z24.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input }) => {
      const resetToken = await getValidResetToken(input.token);
      if (!resetToken) {
        throw new Error("Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha.");
      }
      const passwordHash = await hashPassword(input.password);
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { users: users3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq23 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.update(users3).set({ passwordHash, loginMethod: "email", updatedAt: /* @__PURE__ */ new Date() }).where(eq23(users3.id, resetToken.userId));
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
  reportPdf: reportPdfRouter,
  // Procedure de migração para criar tabelas faltantes na produção
  migrations: router({
    run: publicProcedure.input(z24.object({ key: z24.string() })).mutation(async ({ input }) => {
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
import { jwtVerify } from "jose";
init_db();
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

// server/_core/index.ts
async function startServer() {
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
        const { collaboratorAttendance: collaboratorAttendance2, collaborators: collaborators2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq23, and: and15, lt: lt2 } = await import("drizzle-orm");
        const db = await getDb2();
        if (!db) return;
        const sevenDaysAgo = /* @__PURE__ */ new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const pendingRecords = await db.select({
          id: collaboratorAttendance2.id,
          collaboratorName: collaborators2.name,
          date: collaboratorAttendance2.date,
          dailyValue: collaboratorAttendance2.dailyValue
        }).from(collaboratorAttendance2).innerJoin(collaborators2, eq23(collaboratorAttendance2.collaboratorId, collaborators2.id)).where(and15(
          eq23(collaboratorAttendance2.paymentStatusCa, "pendente"),
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
