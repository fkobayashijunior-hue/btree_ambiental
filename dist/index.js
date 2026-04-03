var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendanceRecords: () => attendanceRecords,
  biometricAttendance: () => biometricAttendance,
  cargoDestinations: () => cargoDestinations,
  cargoLoads: () => cargoLoads,
  cargoShipments: () => cargoShipments,
  chainsawChainEvents: () => chainsawChainEvents,
  chainsawChainStock: () => chainsawChainStock,
  chainsawPartMovements: () => chainsawPartMovements,
  chainsawParts: () => chainsawParts,
  chainsawServiceOrders: () => chainsawServiceOrders,
  chainsawServiceParts: () => chainsawServiceParts,
  chainsaws: () => chainsaws,
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
  fuelContainerEvents: () => fuelContainerEvents,
  fuelContainers: () => fuelContainers,
  fuelRecords: () => fuelRecords,
  gpsDeviceLinks: () => gpsDeviceLinks,
  gpsHoursLog: () => gpsHoursLog,
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
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, passwordResetTokens, collaborators, biometricAttendance, userProfiles, equipmentTypes, equipment, cargoShipments, fuelRecords, attendanceRecords, sectors, rolePermissions, clients, cargoDestinations, cargoLoads, machineHours, machineMaintenance, machineFuel, vehicleRecords, parts, partsRequests, clientPortalAccess, replantingRecords, clientPayments, collaboratorDocuments, equipmentPhotos, equipmentMaintenance, purchaseOrders, purchaseOrderItems, collaboratorAttendance, gpsDeviceLinks, gpsHoursLog, preventiveMaintenancePlans, preventiveMaintenanceAlerts, maintenanceTemplates, maintenanceTemplateParts, maintenanceParts, partsStockMovements, userPermissions, chainsaws, fuelContainers, fuelContainerEvents, chainsawChainStock, chainsawChainEvents, chainsawParts, chainsawPartMovements, chainsawServiceOrders, chainsawServiceParts, extraExpenses;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: int("id").autoincrement().primaryKey(),
      /** Manus OAuth identifier (openId) - NULLABLE para suportar login com email/senha */
      openId: varchar("openId", { length: 64 }).unique(),
      name: text("name").notNull(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      /** Hash da senha (bcrypt) - para autenticação própria */
      passwordHash: varchar("password_hash", { length: 255 }),
      loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    passwordResetTokens = mysqlTable("password_reset_tokens", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      token: varchar("token", { length: 128 }).notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      usedAt: timestamp("used_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    collaborators = mysqlTable("collaborators", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
      // Dados pessoais
      name: varchar("name", { length: 255 }).notNull(),
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 20 }),
      cpf: varchar("cpf", { length: 14 }),
      rg: varchar("rg", { length: 20 }),
      // Endereço
      address: varchar("address", { length: 500 }),
      city: varchar("city", { length: 100 }),
      state: varchar("state", { length: 2 }),
      zipCode: varchar("zip_code", { length: 10 }),
      // Foto e biometria facial
      photoUrl: text("photo_url"),
      faceDescriptor: text("face_descriptor"),
      // JSON com vetor facial (128 floats)
      // Função e acesso
      role: mysqlEnum("role", [
        "administrativo",
        "encarregado",
        "mecanico",
        "motosserrista",
        "carregador",
        "operador",
        "motorista",
        "terceirizado"
      ]).notNull().default("operador"),
      // Dados de pagamento
      pixKey: varchar("pix_key", { length: 255 }),
      dailyRate: varchar("daily_rate", { length: 20 }),
      employmentType: mysqlEnum("employment_type", ["clt", "terceirizado", "diarista"]).default("diarista"),
      // Tamanhos para EPI
      shirtSize: mysqlEnum("shirt_size", ["PP", "P", "M", "G", "GG", "XGG"]),
      pantsSize: varchar("pants_size", { length: 10 }),
      shoeSize: varchar("shoe_size", { length: 5 }),
      bootSize: varchar("boot_size", { length: 5 }),
      // Status
      active: int("active").default(1).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    biometricAttendance = mysqlTable("biometric_attendance", {
      id: int("id").autoincrement().primaryKey(),
      collaboratorId: int("collaborator_id").notNull(),
      checkIn: timestamp("check_in").notNull(),
      checkOut: timestamp("check_out"),
      location: varchar("location", { length: 255 }),
      latitude: varchar("latitude", { length: 20 }),
      longitude: varchar("longitude", { length: 20 }),
      confidence: varchar("confidence", { length: 10 }),
      registeredBy: int("registered_by"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userProfiles = mysqlTable("user_profiles", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      profileType: mysqlEnum("profile_type", [
        "administrativo",
        "encarregado",
        "mecanico",
        "motosserrista",
        "carregador",
        "operador",
        "motorista",
        "terceirizado"
      ]).notNull(),
      cpf: varchar("cpf", { length: 14 }),
      phone: varchar("phone", { length: 20 }),
      pixKey: varchar("pix_key", { length: 255 }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    equipmentTypes = mysqlTable("equipment_types", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    equipment = mysqlTable("equipment", {
      id: int("id").autoincrement().primaryKey(),
      typeId: int("type_id").notNull().references(() => equipmentTypes.id),
      name: varchar("name", { length: 255 }).notNull(),
      brand: varchar("brand", { length: 100 }),
      model: varchar("model", { length: 100 }),
      year: int("year"),
      serialNumber: varchar("serial_number", { length: 100 }),
      licensePlate: varchar("license_plate", { length: 20 }),
      imageUrl: text("image_url"),
      sectorId: int("sector_id"),
      status: mysqlEnum("status", ["ativo", "manutencao", "inativo"]).default("ativo").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    cargoShipments = mysqlTable("cargo_shipments", {
      id: int("id").autoincrement().primaryKey(),
      truckId: int("truck_id").notNull().references(() => equipment.id),
      driverId: int("driver_id").notNull().references(() => users.id),
      date: timestamp("date").notNull(),
      height: varchar("height", { length: 20 }).notNull(),
      width: varchar("width", { length: 20 }).notNull(),
      length: varchar("length", { length: 20 }).notNull(),
      volume: varchar("volume", { length: 20 }).notNull(),
      destination: varchar("destination", { length: 255 }),
      invoiceNumber: varchar("invoice_number", { length: 100 }),
      woodType: varchar("wood_type", { length: 100 }),
      client: varchar("client", { length: 255 }),
      imagesUrls: text("images_urls"),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    fuelRecords = mysqlTable("fuel_records", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      operatorId: int("operator_id").notNull().references(() => users.id),
      date: timestamp("date").notNull(),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "mistura_2t"]).notNull(),
      liters: varchar("liters", { length: 20 }).notNull(),
      totalValue: varchar("total_value", { length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      odometer: varchar("odometer", { length: 20 }),
      station: varchar("station", { length: 255 }),
      invoiceUrl: text("invoice_url"),
      odometerImageUrl: text("odometer_image_url"),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    attendanceRecords = mysqlTable("attendance_records", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").notNull().references(() => users.id),
      date: timestamp("date").notNull(),
      employmentType: mysqlEnum("employment_type", ["clt", "terceirizado", "diarista"]).notNull(),
      dailyValue: varchar("daily_value", { length: 20 }).notNull(),
      pixKey: varchar("pix_key", { length: 255 }).notNull(),
      function: varchar("function", { length: 100 }).notNull(),
      observations: text("observations"),
      paymentStatus: mysqlEnum("payment_status", ["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
      paidAt: timestamp("paid_at"),
      paidBy: int("paid_by").references(() => users.id),
      registeredBy: int("registered_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    sectors = mysqlTable("sectors", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      description: text("description"),
      color: varchar("color", { length: 20 }).default("#16a34a"),
      active: int("active").default(1).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    rolePermissions = mysqlTable("role_permissions", {
      id: int("id").autoincrement().primaryKey(),
      roleName: varchar("role_name", { length: 50 }).notNull(),
      // ex: mecanico, motorista
      module: varchar("module", { length: 50 }).notNull(),
      // ex: colaboradores, equipamentos, presenca
      canView: int("can_view").default(0).notNull(),
      canCreate: int("can_create").default(0).notNull(),
      canEdit: int("can_edit").default(0).notNull(),
      canDelete: int("can_delete").default(0).notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      updatedBy: int("updated_by").references(() => users.id)
    });
    clients = mysqlTable("clients", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      document: varchar("document", { length: 20 }),
      // CPF ou CNPJ
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 20 }),
      address: varchar("address", { length: 500 }),
      city: varchar("city", { length: 100 }),
      state: varchar("state", { length: 2 }),
      notes: text("notes"),
      password: varchar("password", { length: 255 }),
      // senha para acesso ao portal
      active: int("active").default(1).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    cargoDestinations = mysqlTable("cargo_destinations", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      address: varchar("address", { length: 500 }),
      city: varchar("city", { length: 100 }),
      state: varchar("state", { length: 2 }),
      notes: text("notes"),
      active: int("active").default(1).notNull(),
      clientId: int("client_id").references(() => clients.id),
      // cliente vinculado ao destino
      createdAt: timestamp("created_at").defaultNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    cargoLoads = mysqlTable("cargo_loads", {
      id: int("id").autoincrement().primaryKey(),
      date: timestamp("date").notNull(),
      // Veículo e motorista
      vehicleId: int("vehicle_id").references(() => equipment.id),
      vehiclePlate: varchar("vehicle_plate", { length: 20 }),
      driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
      driverName: varchar("driver_name", { length: 255 }),
      // Medidas da carga (em metros)
      heightM: varchar("height_m", { length: 20 }).notNull(),
      widthM: varchar("width_m", { length: 20 }).notNull(),
      lengthM: varchar("length_m", { length: 20 }).notNull(),
      volumeM3: varchar("volume_m3", { length: 20 }).notNull(),
      // calculado
      // Informações da carga
      woodType: varchar("wood_type", { length: 100 }),
      destination: varchar("destination", { length: 255 }),
      destinationId: int("destination_id").references(() => cargoDestinations.id),
      weightKg: varchar("weight_kg", { length: 20 }),
      // peso em kg
      invoiceNumber: varchar("invoice_number", { length: 100 }),
      // Acompanhamento em tempo real
      trackingStatus: mysqlEnum("tracking_status", ["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).default("aguardando"),
      trackingUpdatedAt: timestamp("tracking_updated_at"),
      trackingNotes: text("tracking_notes"),
      weightOutPhotoUrl: text("weight_out_photo_url"),
      // foto da pesagem na saída
      weightInPhotoUrl: text("weight_in_photo_url"),
      // foto da pesagem na chegada/destino
      // Cliente
      clientId: int("client_id").references(() => clients.id),
      clientName: varchar("client_name", { length: 255 }),
      // Fotos (JSON array de URLs)
      photosJson: text("photos_json"),
      notes: text("notes"),
      status: mysqlEnum("status", ["pendente", "entregue", "cancelado"]).default("pendente").notNull(),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    machineHours = mysqlTable("machine_hours", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      operatorCollaboratorId: int("operator_collaborator_id").references(() => collaborators.id),
      date: timestamp("date").notNull(),
      startHourMeter: varchar("start_hour_meter", { length: 20 }).notNull(),
      endHourMeter: varchar("end_hour_meter", { length: 20 }).notNull(),
      hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
      // calculado
      activity: varchar("activity", { length: 255 }),
      location: varchar("location", { length: 255 }),
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    machineMaintenance = mysqlTable("machine_maintenance", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp("date").notNull(),
      hourMeter: varchar("hour_meter", { length: 20 }),
      type: mysqlEnum("type", ["preventiva", "corretiva", "revisao"]).notNull().default("corretiva"),
      serviceType: mysqlEnum("service_type", ["proprio", "terceirizado"]).notNull().default("proprio"),
      mechanicCollaboratorId: int("mechanic_collaborator_id").references(() => collaborators.id),
      mechanicName: varchar("mechanic_name", { length: 255 }),
      thirdPartyCompany: varchar("third_party_company", { length: 255 }),
      partsReplaced: text("parts_replaced"),
      // JSON: [{name, quantity, cost}]
      laborCost: varchar("labor_cost", { length: 20 }),
      totalCost: varchar("total_cost", { length: 20 }),
      description: text("description"),
      nextMaintenanceHours: varchar("next_maintenance_hours", { length: 20 }),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    machineFuel = mysqlTable("machine_fuel", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp("date").notNull(),
      hourMeter: varchar("hour_meter", { length: 20 }),
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "mistura_2t", "arla"]).notNull(),
      liters: varchar("liters", { length: 20 }).notNull(),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      totalValue: varchar("total_value", { length: 20 }),
      supplier: varchar("supplier", { length: 255 }),
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    vehicleRecords = mysqlTable("vehicle_records", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      date: timestamp("date").notNull(),
      recordType: mysqlEnum("record_type", ["abastecimento", "manutencao", "km"]).notNull(),
      // Para abastecimento
      fuelType: mysqlEnum("fuel_type", ["diesel", "gasolina", "etanol", "gnv"]),
      liters: varchar("liters", { length: 20 }),
      fuelCost: varchar("fuel_cost", { length: 20 }),
      pricePerLiter: varchar("price_per_liter", { length: 20 }),
      supplier: varchar("supplier", { length: 255 }),
      // Para km
      odometer: varchar("odometer", { length: 20 }),
      kmDriven: varchar("km_driven", { length: 20 }),
      // Para manutenção
      maintenanceType: varchar("maintenance_type", { length: 255 }),
      maintenanceCost: varchar("maintenance_cost", { length: 20 }),
      serviceType: mysqlEnum("service_type", ["proprio", "terceirizado"]),
      mechanicName: varchar("mechanic_name", { length: 255 }),
      // Geral
      driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
      photoUrl: text("photo_url"),
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    parts = mysqlTable("parts", {
      id: int("id").autoincrement().primaryKey(),
      code: varchar("code", { length: 50 }),
      name: varchar("name", { length: 255 }).notNull(),
      category: varchar("category", { length: 100 }),
      unit: varchar("unit", { length: 20 }).default("un"),
      stockQuantity: int("stock_quantity").default(0).notNull(),
      minStock: int("min_stock").default(0),
      unitCost: varchar("unit_cost", { length: 20 }),
      supplier: varchar("supplier", { length: 255 }),
      photoUrl: text("photo_url"),
      notes: text("notes"),
      active: int("active").default(1).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by").references(() => users.id)
    });
    partsRequests = mysqlTable("parts_requests", {
      id: int("id").autoincrement().primaryKey(),
      partId: int("part_id").references(() => parts.id),
      partName: varchar("part_name", { length: 255 }).notNull(),
      // fallback se não cadastrada
      quantity: int("quantity").notNull(),
      urgency: mysqlEnum("urgency", ["baixa", "media", "alta"]).notNull().default("media"),
      equipmentId: int("equipment_id").references(() => equipment.id),
      equipmentName: varchar("equipment_name", { length: 255 }),
      reason: text("reason"),
      status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado", "comprado", "entregue"]).default("pendente").notNull(),
      approvedBy: int("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      rejectionReason: text("rejection_reason"),
      estimatedCost: varchar("estimated_cost", { length: 20 }),
      requestedBy: int("requested_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    clientPortalAccess = mysqlTable("client_portal_access", {
      id: int("id").autoincrement().primaryKey(),
      clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
      accessCode: varchar("access_code", { length: 64 }).notNull().unique(),
      // PIN ou token
      active: int("active").default(1).notNull(),
      lastAccessAt: timestamp("last_access_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdBy: int("created_by")
    });
    replantingRecords = mysqlTable("replanting_records", {
      id: int("id").autoincrement().primaryKey(),
      clientId: int("client_id").notNull().references(() => clients.id),
      date: timestamp("date").notNull(),
      area: varchar("area", { length: 100 }),
      // ex: "Fazenda Boa Vista - Talhão 3"
      species: varchar("species", { length: 100 }).default("Eucalipto"),
      // espécie plantada
      quantity: int("quantity"),
      // número de mudas
      areaHectares: varchar("area_hectares", { length: 20 }),
      // área em hectares
      notes: text("notes"),
      photosJson: text("photos_json"),
      // JSON array de URLs
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    clientPayments = mysqlTable("client_payments", {
      id: int("id").autoincrement().primaryKey(),
      clientId: int("client_id").notNull().references(() => clients.id),
      referenceDate: timestamp("reference_date").notNull(),
      // mês/período de referência
      description: varchar("description", { length: 500 }),
      // ex: "Compra de eucalipto - Talhão 3"
      volumeM3: varchar("volume_m3", { length: 20 }),
      // volume comprado
      pricePerM3: varchar("price_per_m3", { length: 20 }),
      // preço por m³
      grossAmount: varchar("gross_amount", { length: 20 }).notNull(),
      // valor bruto
      deductions: varchar("deductions", { length: 20 }).default("0"),
      // descontos
      netAmount: varchar("net_amount", { length: 20 }).notNull(),
      // valor líquido
      status: mysqlEnum("status", ["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
      dueDate: timestamp("due_date"),
      // data de vencimento
      paidAt: timestamp("paid_at"),
      // data do pagamento
      pixKey: varchar("pix_key", { length: 255 }),
      // chave pix do cliente
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    collaboratorDocuments = mysqlTable("collaborator_documents", {
      id: int("id").autoincrement().primaryKey(),
      collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
      type: mysqlEnum("type", [
        "cnh",
        "certificado",
        "aso",
        "contrato",
        "rg",
        "cpf",
        "outros"
      ]).notNull().default("outros"),
      title: varchar("title", { length: 255 }).notNull(),
      // ex: "CNH Categoria B", "Certificado NR10"
      fileUrl: varchar("file_url", { length: 1e3 }).notNull(),
      // URL Cloudinary
      fileType: varchar("file_type", { length: 50 }),
      // "image/jpeg", "application/pdf"
      issueDate: timestamp("issue_date"),
      // data de emissão
      expiryDate: timestamp("expiry_date"),
      // data de validade (opcional)
      notes: text("notes"),
      uploadedBy: int("uploaded_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    equipmentPhotos = mysqlTable("equipment_photos", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull(),
      // referência ao equipamento (setores/equipamentos)
      photoUrl: varchar("photo_url", { length: 1e3 }).notNull(),
      caption: varchar("caption", { length: 255 }),
      // ex: "Foto da placa", "Vista lateral"
      uploadedBy: int("uploaded_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    equipmentMaintenance = mysqlTable("equipment_maintenance", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull(),
      type: mysqlEnum("type", ["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]).notNull().default("manutencao"),
      description: text("description").notNull(),
      performedBy: varchar("performed_by", { length: 255 }),
      // nome do responsável
      cost: varchar("cost", { length: 20 }),
      // custo em R$
      nextMaintenanceDate: timestamp("next_maintenance_date"),
      // próxima manutenção prevista
      photosJson: text("photos_json"),
      // JSON array de URLs
      registeredBy: int("registered_by").references(() => users.id),
      performedAt: timestamp("performed_at").notNull(),
      // data da manutenção
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    purchaseOrders = mysqlTable("purchase_orders", {
      id: int("id").autoincrement().primaryKey(),
      title: varchar("title", { length: 255 }).notNull(),
      // ex: "Pedido 001 - Filtros"
      status: mysqlEnum("status", ["rascunho", "enviado", "aprovado", "rejeitado", "comprado"]).default("rascunho").notNull(),
      notes: text("notes"),
      createdBy: int("created_by").references(() => users.id),
      approvedBy: int("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    purchaseOrderItems = mysqlTable("purchase_order_items", {
      id: int("id").autoincrement().primaryKey(),
      orderId: int("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => parts.id),
      partName: varchar("part_name", { length: 255 }).notNull(),
      partCode: varchar("part_code", { length: 50 }),
      partCategory: varchar("part_category", { length: 100 }),
      supplier: varchar("supplier", { length: 255 }),
      unit: varchar("unit", { length: 20 }).default("un"),
      quantity: int("quantity").notNull(),
      unitCost: varchar("unit_cost", { length: 20 }),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    collaboratorAttendance = mysqlTable("collaborator_attendance", {
      id: int("id").autoincrement().primaryKey(),
      collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
      date: timestamp("date").notNull(),
      employmentType: mysqlEnum("employment_type_ca", ["clt", "terceirizado", "diarista"]).notNull().default("diarista"),
      dailyValue: varchar("daily_value", { length: 20 }).notNull().default("0"),
      pixKey: varchar("pix_key", { length: 255 }),
      activity: varchar("activity", { length: 255 }),
      // função/atividade do dia
      observations: text("observations"),
      paymentStatus: mysqlEnum("payment_status_ca", ["pendente", "pago"]).default("pendente").notNull(),
      paidAt: timestamp("paid_at"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    gpsDeviceLinks = mysqlTable("gps_device_links", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
      traccarDeviceId: int("traccar_device_id").notNull(),
      // ID do dispositivo no Traccar
      traccarDeviceName: varchar("traccar_device_name", { length: 255 }),
      // nome no Traccar (cache)
      traccarUniqueId: varchar("traccar_unique_id", { length: 100 }),
      // IMEI/ID único do rastreador
      active: int("active").default(1).notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    gpsHoursLog = mysqlTable("gps_hours_log", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      gpsDeviceLinkId: int("gps_device_link_id").references(() => gpsDeviceLinks.id),
      date: timestamp("date").notNull(),
      // dia do registro
      hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
      // horas com ignição ligada
      hourMeterStart: varchar("hour_meter_start", { length: 20 }),
      // horímetro início do dia
      hourMeterEnd: varchar("hour_meter_end", { length: 20 }),
      // horímetro fim do dia
      distanceKm: varchar("distance_km", { length: 20 }),
      // km rodados no dia
      source: mysqlEnum("source", ["gps_auto", "manual"]).default("gps_auto").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    preventiveMaintenancePlans = mysqlTable("preventive_maintenance_plans", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
      name: varchar("name", { length: 255 }).notNull(),
      // ex: "Troca de óleo", "Engraxamento"
      type: mysqlEnum("type", [
        "troca_oleo",
        "engraxamento",
        "filtro_ar",
        "filtro_combustivel",
        "correia",
        "revisao_geral",
        "abastecimento",
        "outros"
      ]).notNull().default("outros"),
      intervalHours: int("interval_hours").notNull(),
      // a cada X horas de uso
      lastDoneHours: varchar("last_done_hours", { length: 20 }).default("0"),
      // horímetro da última execução
      lastDoneAt: timestamp("last_done_at"),
      // data da última execução
      alertThresholdHours: int("alert_threshold_hours").default(10),
      // alertar X horas antes
      active: int("active").default(1).notNull(),
      notes: text("notes"),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    preventiveMaintenanceAlerts = mysqlTable("preventive_maintenance_alerts", {
      id: int("id").autoincrement().primaryKey(),
      equipmentId: int("equipment_id").notNull().references(() => equipment.id),
      planId: int("plan_id").notNull().references(() => preventiveMaintenancePlans.id),
      status: mysqlEnum("status", ["pendente", "em_andamento", "concluido", "ignorado"]).default("pendente").notNull(),
      currentHours: varchar("current_hours", { length: 20 }).notNull(),
      // horímetro quando gerado
      dueHours: varchar("due_hours", { length: 20 }).notNull(),
      // horímetro alvo
      generatedAt: timestamp("generated_at").defaultNow().notNull(),
      resolvedAt: timestamp("resolved_at"),
      resolvedBy: int("resolved_by").references(() => users.id),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    maintenanceTemplates = mysqlTable("maintenance_templates", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      // ex: "Troca de Óleo Motor"
      type: mysqlEnum("type", ["preventiva", "corretiva", "revisao"]).notNull().default("preventiva"),
      description: text("description"),
      estimatedCost: varchar("estimated_cost", { length: 20 }),
      active: int("active").default(1).notNull(),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    maintenanceTemplateParts = mysqlTable("maintenance_template_parts", {
      id: int("id").autoincrement().primaryKey(),
      templateId: int("template_id").notNull().references(() => maintenanceTemplates.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => parts.id, { onDelete: "set null" }),
      partCode: varchar("part_code", { length: 50 }),
      // cache do código
      partName: varchar("part_name", { length: 255 }).notNull(),
      // cache do nome
      quantity: int("quantity").notNull().default(1),
      unit: varchar("unit", { length: 20 }).default("un"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    maintenanceParts = mysqlTable("maintenance_parts", {
      id: int("id").autoincrement().primaryKey(),
      maintenanceId: int("maintenance_id").notNull().references(() => equipmentMaintenance.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => parts.id, { onDelete: "set null" }),
      partCode: varchar("part_code", { length: 50 }),
      partName: varchar("part_name", { length: 255 }).notNull(),
      partPhotoUrl: text("part_photo_url"),
      quantity: int("quantity").notNull().default(1),
      unit: varchar("unit", { length: 20 }).default("un"),
      unitCost: varchar("unit_cost", { length: 20 }),
      totalCost: varchar("total_cost", { length: 20 }),
      fromStock: int("from_stock").default(1),
      // 1 = baixou do estoque, 0 = compra avulsa
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    partsStockMovements = mysqlTable("parts_stock_movements", {
      id: int("id").autoincrement().primaryKey(),
      partId: int("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
      type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
      quantity: int("quantity").notNull(),
      reason: varchar("reason", { length: 255 }),
      // ex: "Compra", "Uso em manutenção #42"
      referenceId: int("reference_id"),
      // ID da manutenção ou pedido de compra
      referenceType: varchar("reference_type", { length: 50 }),
      // "maintenance" | "purchase_order"
      unitCost: varchar("unit_cost", { length: 20 }),
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userPermissions = mysqlTable("user_permissions", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
      // JSON array de módulos permitidos. null = admin (acesso total)
      modules: text("modules"),
      // JSON: string[]
      // Perfil pré-definido para referência (não restringe, apenas label)
      profile: varchar("profile", { length: 64 }).default("custom"),
      updatedBy: int("updated_by").references(() => users.id),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsaws = mysqlTable("chainsaws", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // ex: "Motosserra 1 - Stihl MS 250"
      brand: varchar("brand", { length: 100 }),
      model: varchar("model", { length: 100 }),
      serialNumber: varchar("serial_number", { length: 100 }),
      chainType: varchar("chain_type", { length: 20 }).default("30"),
      // "30" | "34" | outro
      status: mysqlEnum("status", ["ativa", "oficina", "inativa"]).default("ativa").notNull(),
      imageUrl: text("image_url"),
      // foto da motosserra
      notes: text("notes"),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    fuelContainers = mysqlTable("fuel_containers", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // ex: "Galão Vermelho", "Galão Verde"
      color: varchar("color", { length: 30 }).default("vermelho"),
      // "vermelho" | "verde"
      type: mysqlEnum("type", ["puro", "mistura"]).notNull(),
      // puro=gasolina, mistura=gasolina+2T
      capacityLiters: varchar("capacity_liters", { length: 10 }).default("20"),
      // capacidade total
      currentVolumeLiters: varchar("current_volume_liters", { length: 10 }).default("0"),
      // volume atual
      isActive: int("is_active").default(1),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    fuelContainerEvents = mysqlTable("fuel_container_events", {
      id: int("id").autoincrement().primaryKey(),
      containerId: int("container_id").notNull().references(() => fuelContainers.id, { onDelete: "cascade" }),
      eventType: mysqlEnum("event_type", ["abastecimento", "uso", "transferencia"]).notNull(),
      // abastecimento = galão foi reabastecido (compra)
      // uso = galão foi usado para abastecer motosserra no campo
      // transferencia = galão vermelho → galão verde
      volumeLiters: varchar("volume_liters", { length: 10 }).notNull(),
      // litros movimentados
      costPerLiter: varchar("cost_per_liter", { length: 20 }),
      // custo por litro (para financeiro)
      totalCost: varchar("total_cost", { length: 20 }),
      // custo total
      oil2tMl: varchar("oil2t_ml", { length: 10 }),
      // ml de óleo 2T usados (só para mistura)
      sourceContainerId: int("source_container_id").references(() => fuelContainers.id),
      // para transferência
      chainsawId: int("chainsaw_id").references(() => chainsaws.id),
      // motosserra abastecida (para uso)
      registeredBy: int("registered_by").references(() => users.id),
      notes: text("notes"),
      eventDate: timestamp("event_date").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsawChainStock = mysqlTable("chainsaw_chain_stock", {
      id: int("id").autoincrement().primaryKey(),
      chainType: varchar("chain_type", { length: 20 }).notNull(),
      // "30", "34", ou outro
      sharpenedInBox: int("sharpened_in_box").default(0).notNull(),
      // afiadas na caixa (prontas)
      inField: int("in_field").default(0).notNull(),
      // em campo
      inWorkshop: int("in_workshop").default(0).notNull(),
      // na oficina (para afiar)
      totalStock: int("total_stock").default(0).notNull(),
      // total em estoque (compradas)
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull()
    });
    chainsawChainEvents = mysqlTable("chainsaw_chain_events", {
      id: int("id").autoincrement().primaryKey(),
      chainType: varchar("chain_type", { length: 20 }).notNull(),
      eventType: mysqlEnum("event_type", [
        "envio_campo",
        // caixa → campo
        "retorno_oficina",
        // campo → oficina (para afiar)
        "afiacao_concluida",
        // oficina → caixa (afiadas)
        "baixa_estoque",
        // descarte ou substituição definitiva
        "entrada_estoque"
        // compra de novas correntes
      ]).notNull(),
      quantity: int("quantity").notNull(),
      chainsawId: int("chainsaw_id").references(() => chainsaws.id),
      registeredBy: int("registered_by").references(() => users.id),
      notes: text("notes"),
      // observações para o mecânico
      eventDate: timestamp("event_date").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsawParts = mysqlTable("chainsaw_parts", {
      id: int("id").autoincrement().primaryKey(),
      code: varchar("code", { length: 50 }),
      name: varchar("name", { length: 255 }).notNull(),
      category: varchar("category", { length: 100 }),
      // ex: "Filtro", "Corrente", "Sabre", "Óleo"
      unit: varchar("unit", { length: 20 }).default("un"),
      // un, L, ml, m
      currentStock: varchar("current_stock", { length: 20 }).default("0"),
      minStock: varchar("min_stock", { length: 20 }).default("0"),
      // estoque mínimo para alerta
      unitCost: varchar("unit_cost", { length: 20 }),
      imageUrl: text("image_url"),
      // foto da peça
      notes: text("notes"),
      isActive: int("is_active").default(1),
      createdBy: int("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsawPartMovements = mysqlTable("chainsaw_part_movements", {
      id: int("id").autoincrement().primaryKey(),
      partId: int("part_id").notNull().references(() => chainsawParts.id, { onDelete: "cascade" }),
      type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
      quantity: varchar("quantity", { length: 20 }).notNull(),
      reason: varchar("reason", { length: 255 }),
      // ex: "Compra", "Uso em OS #12"
      serviceOrderId: int("service_order_id"),
      // referência à OS
      unitCost: varchar("unit_cost", { length: 20 }),
      registeredBy: int("registered_by").references(() => users.id),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsawServiceOrders = mysqlTable("chainsaw_service_orders", {
      id: int("id").autoincrement().primaryKey(),
      chainsawId: int("chainsaw_id").notNull().references(() => chainsaws.id, { onDelete: "cascade" }),
      // Problema reportado (pelo operador no campo ou pelo encarregado)
      problemType: mysqlEnum("problem_type", [
        "motor_falhando",
        "nao_liga",
        "superaquecimento",
        "vazamento",
        "corrente_problema",
        "sabre_problema",
        "manutencao_preventiva",
        "outro"
      ]).notNull(),
      problemDescription: text("problem_description"),
      priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
      status: mysqlEnum("status", ["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta").notNull(),
      // Execução pelo mecânico
      mechanicId: int("mechanic_id").references(() => users.id),
      serviceDescription: text("service_description"),
      // o que foi feito
      completedAt: timestamp("completed_at"),
      // Imagem do problema (foto tirada no campo)
      imageUrl: text("image_url"),
      // Metadados
      openedBy: int("opened_by").references(() => users.id),
      openedAt: timestamp("opened_at").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chainsawServiceParts = mysqlTable("chainsaw_service_parts", {
      id: int("id").autoincrement().primaryKey(),
      serviceOrderId: int("service_order_id").notNull().references(() => chainsawServiceOrders.id, { onDelete: "cascade" }),
      partId: int("part_id").references(() => chainsawParts.id, { onDelete: "set null" }),
      partName: varchar("part_name", { length: 255 }).notNull(),
      quantity: varchar("quantity", { length: 20 }).notNull(),
      unit: varchar("unit", { length: 20 }).default("un"),
      unitCost: varchar("unit_cost", { length: 20 }),
      fromStock: int("from_stock").default(1),
      // 1 = baixou do estoque, 0 = compra avulsa
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    extraExpenses = mysqlTable("extra_expenses", {
      id: int("id").autoincrement().primaryKey(),
      date: timestamp("date").notNull(),
      category: mysqlEnum("category", ["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]).notNull(),
      description: varchar("description", { length: 500 }).notNull(),
      amount: varchar("amount", { length: 20 }).notNull(),
      // valor em reais
      paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro").notNull(),
      receiptImageUrl: text("receipt_image_url"),
      // foto da nota fiscal
      notes: text("notes"),
      registeredBy: int("registered_by").references(() => users.id),
      registeredByName: varchar("registered_by_name", { length: 255 }),
      createdAt: timestamp("created_at").defaultNow().notNull()
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
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
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
import { eq as eq2, desc, and as and2, like, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
  // Listar todos os colaboradores
  list: protectedProcedure.input(z2.object({
    search: z2.string().optional(),
    role: z2.string().optional(),
    active: z2.boolean().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
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
  // Criar colaborador
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
    password: z2.string().min(4).optional()
    // senha de acesso ao sistema
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
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
      createdBy: ctx.user.id
    });
    const newId = inserted.insertId;
    const created = await db.select().from(collaborators).where(eq2(collaborators.id, newId)).limit(1);
    return created[0];
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
    password: z2.string().min(4).optional()
    // nova senha (opcional na edição)
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
  // Listar registros de ponto
  listAttendance: protectedProcedure.input(z2.object({
    date: z2.string().optional(),
    // YYYY-MM-DD
    collaboratorId: z2.number().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const baseQuery = db.select({
      id: biometricAttendance.id,
      collaboratorId: biometricAttendance.collaboratorId,
      collaboratorName: collaborators.name,
      collaboratorRole: collaborators.role,
      collaboratorPhoto: collaborators.photoUrl,
      checkInTime: biometricAttendance.checkIn,
      checkOutTime: biometricAttendance.checkOut,
      location: biometricAttendance.location,
      latitude: biometricAttendance.latitude,
      longitude: biometricAttendance.longitude,
      notes: biometricAttendance.notes,
      createdAt: biometricAttendance.createdAt
    }).from(biometricAttendance).innerJoin(collaborators, eq2(biometricAttendance.collaboratorId, collaborators.id));
    if (input?.collaboratorId) {
      const records2 = await baseQuery.where(eq2(biometricAttendance.collaboratorId, input.collaboratorId)).orderBy(desc(biometricAttendance.checkIn));
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
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
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
      typeName: equipmentTypes.name,
      createdAt: equipment.createdAt
    }).from(equipment).leftJoin(equipmentTypes, eq3(equipment.typeId, equipmentTypes.id)).orderBy(equipment.name);
    return rows.filter((r) => {
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
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
    licensePlate: z3.string().optional(),
    imageUrl: z3.string().optional(),
    status: z3.enum(["ativo", "manutencao", "inativo"]).optional()
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
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
    licensePlate: z3.string().optional(),
    imageUrl: z3.string().optional(),
    status: z3.enum(["ativo", "manutencao", "inativo"]).optional()
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
import { eq as eq5, desc as desc3 } from "drizzle-orm";
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
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
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
      // Joins
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq5(cargoLoads.vehicleId, equipment.id)).orderBy(desc3(cargoLoads.createdAt));
    let filtered = results;
    if (input?.search) {
      const s = input.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.driverName?.toLowerCase().includes(s) || r.clientName?.toLowerCase().includes(s) || r.clientNameJoined?.toLowerCase().includes(s) || r.destination?.toLowerCase().includes(s) || r.destinationNameJoined?.toLowerCase().includes(s) || r.invoiceNumber?.toLowerCase().includes(s) || r.vehiclePlate?.toLowerCase().includes(s) || r.vehiclePlateJoined?.toLowerCase().includes(s)
      );
    }
    if (input?.clientId) filtered = filtered.filter((r) => r.clientId === input.clientId);
    if (input?.status) filtered = filtered.filter((r) => r.status === input.status);
    return filtered.map((r) => ({
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined
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
      clientNameJoined: clients.name,
      destinationNameJoined: cargoDestinations.name,
      vehicleNameJoined: equipment.name,
      vehiclePlateJoined: equipment.licensePlate
    }).from(cargoLoads).leftJoin(clients, eq5(cargoLoads.clientId, clients.id)).leftJoin(cargoDestinations, eq5(cargoLoads.destinationId, cargoDestinations.id)).leftJoin(equipment, eq5(cargoLoads.vehicleId, equipment.id)).where(eq5(cargoLoads.id, input.id)).limit(1);
    if (!result.length) throw new TRPCError4({ code: "NOT_FOUND" });
    const r = result[0];
    return {
      ...r,
      clientName: r.clientNameJoined || r.clientName,
      destination: r.destinationNameJoined || r.destination,
      vehiclePlate: r.vehiclePlateJoined || r.vehiclePlate,
      vehicleName: r.vehicleNameJoined
    };
  }),
  // Listagem pública para portal do cliente (por token)
  getByClientToken: publicProcedure.input(z5.object({ clientId: z5.number(), token: z5.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const client = await db.select().from(clients).where(eq5(clients.id, input.clientId)).limit(1);
    if (!client.length) throw new TRPCError4({ code: "NOT_FOUND" });
    const loads = await db.select().from(cargoLoads).where(eq5(cargoLoads.clientId, input.clientId)).orderBy(desc3(cargoLoads.createdAt));
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
      await db.update(cargoLoads).set({ weightOutPhotoUrl: uploaded.url, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(cargoLoads.id, input.cargoId));
      return { url: uploaded.url };
    } else if (input.photoType === "weight_in") {
      await db.update(cargoLoads).set({ weightInPhotoUrl: uploaded.url, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(cargoLoads.id, input.cargoId));
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
    await db.update(cargoLoads).set({ photosJson: JSON.stringify(photos), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(cargoLoads.id, input.cargoId));
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
    woodType: z5.string().optional(),
    destination: z5.string().optional(),
    destinationId: z5.number().optional(),
    invoiceNumber: z5.string().optional(),
    clientId: z5.number().optional(),
    clientName: z5.string().optional(),
    photosJson: z5.string().optional(),
    notes: z5.string().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(cargoLoads).values({
      ...input,
      date: new Date(input.date),
      status: input.status || "pendente",
      trackingStatus: "aguardando",
      registeredBy: ctx.user.id
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
    trackingNotes: z5.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date: date2, ...rest } = input;
    const updateData = { ...rest, updatedAt: /* @__PURE__ */ new Date() };
    if (date2) updateData.date = new Date(date2);
    if (rest.trackingStatus) updateData.trackingUpdatedAt = /* @__PURE__ */ new Date();
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
      trackingUpdatedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      // Finalizar carga quando tracking chega em "finalizado"
      status: input.trackingStatus === "finalizado" ? "entregue" : void 0
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
      status: equipment.status
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
  })
});

// server/routers/machineHours.ts
import { z as z6 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError5 } from "@trpc/server";
import { eq as eq6, desc as desc4 } from "drizzle-orm";
var machineHoursRouter = router({
  // === HORAS TRABALHADAS ===
  listHours: protectedProcedure.input(z6.object({ equipmentId: z6.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(machineHours).orderBy(desc4(machineHours.createdAt));
    if (input?.equipmentId) return results.filter((r) => r.equipmentId === input.equipmentId);
    return results;
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
    notes: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(machineHours).values({
      ...input,
      date: new Date(input.date),
      registeredBy: ctx.user.id
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
    notes: z6.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date: date2, ...rest } = input;
    await db.update(machineHours).set({
      ...rest,
      ...date2 ? { date: new Date(date2) } : {}
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
      date: new Date(input.date),
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
    const { id, date: date2, ...rest } = input;
    await db.update(machineMaintenance).set({
      ...rest,
      ...date2 ? { date: new Date(date2) } : {}
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
  listFuel: protectedProcedure.input(z6.object({ equipmentId: z6.number().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(machineFuel).orderBy(desc4(machineFuel.createdAt));
    if (input?.equipmentId) return results.filter((r) => r.equipmentId === input.equipmentId);
    return results;
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
    notes: z6.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(machineFuel).values({
      ...input,
      date: new Date(input.date),
      registeredBy: ctx.user.id
    });
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
  // Retorna equipamentos que estão próximos ou passaram da próxima manutenção programada
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
    return equipmentList.map((eq19) => {
      const eqHours = hoursRecords.filter((h) => h.equipmentId === eq19.id);
      const eqMaint = maintenances.filter((m) => m.equipmentId === eq19.id);
      const eqFuel = fuelRecords2.filter((f) => f.equipmentId === eq19.id);
      const totalHours = eqHours.reduce((sum, h) => sum + (parseFloat(h.hoursWorked) || 0), 0);
      const totalFuelLiters = eqFuel.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
      const totalFuelCost = eqFuel.reduce((sum, f) => sum + (parseFloat(f.totalValue || "0") || 0), 0);
      const lastHourMeter = eqHours.length > 0 ? eqHours[0].endHourMeter : null;
      const lastMaintenance = eqMaint.length > 0 ? eqMaint[0] : null;
      return {
        equipmentId: eq19.id,
        equipmentName: eq19.name,
        brand: eq19.brand,
        model: eq19.model,
        status: eq19.status,
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
import { eq as eq7, desc as desc5, inArray } from "drizzle-orm";

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
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(vehicleRecords).orderBy(desc5(vehicleRecords.createdAt));
    let filtered = results;
    if (input?.equipmentId) filtered = filtered.filter((r) => r.equipmentId === input.equipmentId);
    if (input?.recordType) filtered = filtered.filter((r) => r.recordType === input.recordType);
    const userIdsRaw = filtered.map((r) => r.registeredBy).filter((id) => id !== null && id !== void 0);
    const userIds = Array.from(new Set(userIdsRaw));
    let userMap = {};
    if (userIds.length > 0) {
      const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
      userMap = Object.fromEntries(usersData.map((u) => [u.id, u.name]));
    }
    return filtered.map((r) => ({ ...r, registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null }));
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
    notes: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    let photoUrl;
    if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(input.photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
    }
    const { photoBase64, ...rest } = input;
    await db.insert(vehicleRecords).values({
      ...rest,
      date: new Date(input.date),
      photoUrl,
      registeredBy: ctx.user.id
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
    notes: z7.string().optional().nullable()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, photoBase64, date: date2, ...rest } = input;
    let photoUrl;
    if (photoBase64 && photoBase64.startsWith("data:")) {
      const { cloudinaryUpload: cloudinaryUpload2 } = await Promise.resolve().then(() => (init_cloudinary(), cloudinary_exports));
      const result = await cloudinaryUpload2(photoBase64, "btree/vehicle-records");
      photoUrl = result.url;
    }
    await db.update(vehicleRecords).set({
      ...rest,
      ...date2 ? { date: new Date(date2) } : {},
      ...photoUrl ? { photoUrl } : {}
    }).where(eq7(vehicleRecords.id, id));
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
    return results.filter((c) => c.active === 1);
  }),
  create: protectedProcedure.input(z9.object({
    name: z9.string().min(2),
    document: z9.string().optional(),
    email: z9.string().email().optional(),
    phone: z9.string().optional(),
    address: z9.string().optional(),
    city: z9.string().optional(),
    state: z9.string().optional(),
    notes: z9.string().optional()
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
    active: z9.number().optional()
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
        eq10(clients.email, input.email.trim().toLowerCase()),
        eq10(clients.active, 1)
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
        eq10(clients.email, input.email.trim().toLowerCase()),
        eq10(clients.active, 1)
      )
    ).limit(1);
    if (!client) throw new Error("Acesso n\xE3o autorizado.");
    const clientDestinations = await db.select({ id: cargoDestinations.id }).from(cargoDestinations).where(eq10(cargoDestinations.clientId, input.clientId));
    const destIds = clientDestinations.map((d) => d.id);
    const allLoads = await db.select().from(cargoLoads).orderBy(desc8(cargoLoads.date)).limit(200);
    const clientNameLower = client.name.toLowerCase();
    const loads = allLoads.filter(
      (l) => l.clientId === input.clientId || l.clientName && l.clientName.toLowerCase().includes(clientNameLower) || l.destinationId && destIds.includes(l.destinationId)
    ).slice(0, 50);
    const replanting = await db.select().from(replantingRecords).where(eq10(replantingRecords.clientId, input.clientId)).orderBy(desc8(replantingRecords.date)).limit(50);
    const payments = await db.select().from(clientPayments).where(eq10(clientPayments.clientId, input.clientId)).orderBy(desc8(clientPayments.referenceDate)).limit(50);
    return { client, loads, replanting, payments };
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
      date: new Date(input.date),
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
      referenceDate: new Date(input.referenceDate),
      description: input.description,
      volumeM3: input.volumeM3,
      pricePerM3: input.pricePerM3,
      grossAmount: input.grossAmount,
      deductions: input.deductions || "0",
      netAmount: input.netAmount,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : void 0,
      paidAt: input.paidAt ? new Date(input.paidAt) : void 0,
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
import { TRPCError as TRPCError10 } from "@trpc/server";
import { eq as eq14, desc as desc12, inArray as inArray2 } from "drizzle-orm";
var attendanceRouter = router({
  // Listar presenças com filtros
  list: protectedProcedure.input(z14.object({
    dateFrom: z14.string().optional(),
    // YYYY-MM-DD
    dateTo: z14.string().optional(),
    collaboratorId: z14.number().optional(),
    paymentStatus: z14.enum(["pendente", "pago"]).optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const records = await db.select({
      id: collaboratorAttendance.id,
      collaboratorId: collaboratorAttendance.collaboratorId,
      collaboratorName: collaborators.name,
      collaboratorRole: collaborators.role,
      collaboratorPhoto: collaborators.photoUrl,
      date: collaboratorAttendance.date,
      employmentType: collaboratorAttendance.employmentType,
      dailyValue: collaboratorAttendance.dailyValue,
      pixKey: collaboratorAttendance.pixKey,
      activity: collaboratorAttendance.activity,
      observations: collaboratorAttendance.observations,
      paymentStatus: collaboratorAttendance.paymentStatus,
      paidAt: collaboratorAttendance.paidAt,
      registeredBy: collaboratorAttendance.registeredBy,
      createdAt: collaboratorAttendance.createdAt
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
      filtered = filtered.filter((r) => new Date(r.date) >= from);
    }
    if (input?.dateTo) {
      const to = /* @__PURE__ */ new Date(input.dateTo + "T23:59:59");
      filtered = filtered.filter((r) => new Date(r.date) <= to);
    }
    const userIdsRaw = filtered.map((r) => r.registeredBy).filter((id) => id !== null && id !== void 0);
    const userIds = Array.from(new Set(userIdsRaw));
    let userMap = {};
    if (userIds.length > 0) {
      const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray2(users.id, userIds));
      userMap = Object.fromEntries(usersData.map((u) => [u.id, u.name]));
    }
    return filtered.map((r) => ({
      ...r,
      registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null
    }));
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
    observations: z14.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const [collaborator] = await db.select({ name: collaborators.name }).from(collaborators).where(eq14(collaborators.id, input.collaboratorId));
    const collaboratorName = collaborator?.name || `ID ${input.collaboratorId}`;
    await db.insert(collaboratorAttendance).values({
      collaboratorId: input.collaboratorId,
      date: /* @__PURE__ */ new Date(input.date + "T12:00:00"),
      employmentType: input.employmentType,
      dailyValue: input.dailyValue,
      pixKey: input.pixKey || null,
      activity: input.activity || null,
      observations: input.observations || null,
      registeredBy: ctx.user.id
    });
    const dateFormatted = (/* @__PURE__ */ new Date(input.date + "T12:00:00")).toLocaleDateString("pt-BR");
    const activityInfo = input.activity ? ` (${input.activity})` : "";
    const employmentLabel = input.employmentType === "clt" ? "CLT" : input.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
    await notifyOwner({
      title: `\u2705 Presen\xE7a registrada \u2014 ${collaboratorName}`,
      content: `${collaboratorName}${activityInfo} teve presen\xE7a registrada em ${dateFormatted}.
V\xEDnculo: ${employmentLabel} | Di\xE1ria: R$ ${input.dailyValue}${input.pixKey ? " | PIX: " + input.pixKey : ""}
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
      paymentStatus: input.paid ? "pago" : "pendente",
      paidAt: input.paid ? /* @__PURE__ */ new Date() : null
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
  })
});

// server/routers/traccar.ts
import { z as z15 } from "zod";
import { TRPCError as TRPCError11 } from "@trpc/server";
init_db();
init_schema();
import { eq as eq15, and as and7, desc as desc13, gte as gte2, lte as lte2, sql as sql2 } from "drizzle-orm";
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
          const totalResult = await db.select({ total: sql2`SUM(CAST(hours_worked AS DECIMAL(10,2)))` }).from(gpsHoursLog).where(eq15(gpsHoursLog.equipmentId, link.equipmentId));
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
      totalHours: sql2`SUM(CAST(hours_worked AS DECIMAL(10,2)))`,
      lastDate: sql2`MAX(date)`,
      recordCount: sql2`COUNT(*)`
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
    const result = await db.select({ count: sql2`COUNT(*)` }).from(preventiveMaintenanceAlerts).where(eq15(preventiveMaintenanceAlerts.status, "pendente"));
    return { count: Number(result[0]?.count || 0) };
  })
});

// server/routers/permissions.ts
import { z as z16 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError12 } from "@trpc/server";
import { eq as eq16 } from "drizzle-orm";
var SYSTEM_MODULES = [
  { slug: "equipamentos", label: "Equipamentos", group: "Maquin\xE1rio" },
  { slug: "pecas", label: "Pe\xE7as / Estoque", group: "Maquin\xE1rio" },
  { slug: "manutencao", label: "Manuten\xE7\xE3o", group: "Maquin\xE1rio" },
  { slug: "horas-maquina", label: "Horas de M\xE1quina", group: "Maquin\xE1rio" },
  { slug: "colaboradores", label: "Colaboradores", group: "Pessoas" },
  { slug: "presencas", label: "Presen\xE7as", group: "Pessoas" },
  { slug: "reflorestamento", label: "Reflorestamento", group: "Opera\xE7\xF5es" },
  { slug: "cargas", label: "Controle de Cargas", group: "Opera\xE7\xF5es" },
  { slug: "clientes", label: "Clientes", group: "Comercial" },
  { slug: "portal-cliente", label: "Portal do Cliente", group: "Comercial" },
  { slug: "gps", label: "Rastreamento GPS", group: "Opera\xE7\xF5es" },
  { slug: "motosserras", label: "Motosserras", group: "Maquin\xE1rio" },
  { slug: "relatorios", label: "Relat\xF3rios", group: "Administrativo" },
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
    modules: ["equipamentos", "horas-maquina"]
  },
  motorista: {
    label: "Motorista",
    modules: ["equipamentos", "cargas"]
  },
  motosserrista: {
    label: "Motosserrista",
    modules: ["equipamentos", "manutencao", "motosserras"]
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
  // Listar todos os usuários com suas permissões
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
    const allPerms = await db.select().from(userPermissions);
    const permMap = Object.fromEntries(allPerms.map((p) => [p.userId, p]));
    return allUsers.map((u) => ({
      ...u,
      permissions: permMap[u.id] || null,
      modules: u.role === "admin" ? null : permMap[u.id]?.modules ? JSON.parse(permMap[u.id].modules) : [],
      profile: permMap[u.id]?.profile || "custom"
    }));
  }),
  // Buscar permissões do usuário atual
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { modules: null, profile: "admin" };
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    const [perm] = await db.select().from(userPermissions).where(eq16(userPermissions.userId, ctx.user.id));
    if (!perm) return { modules: [], profile: "custom" };
    return {
      modules: perm.modules ? JSON.parse(perm.modules) : [],
      profile: perm.profile || "custom"
    };
  }),
  // Definir permissões de um usuário (apenas admin)
  setPermissions: protectedProcedure.input(z16.object({
    userId: z16.number(),
    modules: z16.array(z16.string()).nullable(),
    // null = acesso total
    profile: z16.string().default("custom")
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError12({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR" });
    const modulesJson = input.modules === null ? null : JSON.stringify(input.modules);
    const [existing] = await db.select().from(userPermissions).where(eq16(userPermissions.userId, input.userId));
    if (existing) {
      await db.update(userPermissions).set({
        modules: modulesJson,
        profile: input.profile,
        updatedBy: ctx.user.id
      }).where(eq16(userPermissions.userId, input.userId));
    } else {
      await db.insert(userPermissions).values({
        userId: input.userId,
        modules: modulesJson,
        profile: input.profile,
        updatedBy: ctx.user.id
      });
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
    const modulesJson = input.profileKey === "admin" ? null : JSON.stringify(profile.modules);
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
    return { success: true };
  })
});

// server/routers/chainsaws.ts
import { z as z17 } from "zod";
init_db();
init_schema();
import { eq as eq17, desc as desc14, and as and8, sql as sql3 } from "drizzle-orm";
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
    notes: z17.string().optional()
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
        sql3`(LOWER(${chainsawParts.name}) LIKE '%2t%' OR LOWER(${chainsawParts.name}) LIKE '%dois tempos%')`
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
      oil2tMl,
      registeredBy: ctx.user.id,
      notes: input.notes
    });
    return { success: true, oil2tMl };
  }),
  // Registrar uso de combustível no campo (baixa no galão)
  useFuel: protectedProcedure.input(z17.object({
    containerId: z17.number(),
    volumeLiters: z17.string(),
    chainsawId: z17.number().optional(),
    notes: z17.string().optional()
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
      notes: input.notes
    });
    return { success: true };
  }),
  // Transferir combustível entre galões (vermelho → verde)
  transferFuel: protectedProcedure.input(z17.object({
    sourceContainerId: z17.number(),
    targetContainerId: z17.number(),
    volumeLiters: z17.string(),
    notes: z17.string().optional()
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
      notes: input.notes
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
      completedAt: /* @__PURE__ */ new Date(),
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
import { desc as desc15, eq as eq18, and as and9, gte as gte3, lte as lte3 } from "drizzle-orm";
var extraExpensesRouter = router({
  list: protectedProcedure.input(z18.object({
    dateFrom: z18.string().optional(),
    dateTo: z18.string().optional(),
    category: z18.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.dateFrom) {
      conditions.push(gte3(extraExpenses.date, new Date(input.dateFrom)));
    }
    if (input.dateTo) {
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte3(extraExpenses.date, to));
    }
    if (input.category) {
      conditions.push(eq18(extraExpenses.category, input.category));
    }
    return db.select().from(extraExpenses).where(conditions.length > 0 ? and9(...conditions) : void 0).orderBy(desc15(extraExpenses.date));
  }),
  create: protectedProcedure.input(z18.object({
    date: z18.string(),
    category: z18.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]),
    description: z18.string().min(1),
    amount: z18.string().min(1),
    paymentMethod: z18.enum(["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro"),
    receiptImageUrl: z18.string().optional(),
    notes: z18.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(extraExpenses).values({
      date: new Date(input.date),
      category: input.category,
      description: input.description,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      receiptImageUrl: input.receiptImageUrl,
      notes: input.notes,
      registeredBy: ctx.user.id,
      registeredByName: ctx.user.name
    });
    return { id: result.insertId };
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
import { sql as sql4, gte as gte4, lte as lte4, and as and10 } from "drizzle-orm";
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
    const [{ count: totalCollaborators }] = await db.select({ count: sql4`count(*)` }).from(collaborators);
    const [{ count: totalClients }] = await db.select({ count: sql4`count(*)` }).from(clients);
    const [{ count: cargoThisMonth }] = await db.select({ count: sql4`count(*)` }).from(cargoLoads).where(and10(
      gte4(cargoLoads.createdAt, startOfMonth),
      lte4(cargoLoads.createdAt, endOfMonth)
    ));
    const [{ total: cargoVolumeThisMonth }] = await db.select({ total: sql4`coalesce(sum(volume_m3), 0)` }).from(cargoLoads).where(and10(
      gte4(cargoLoads.createdAt, startOfMonth),
      lte4(cargoLoads.createdAt, endOfMonth)
    ));
    const [{ count: fuelThisMonth }] = await db.select({ count: sql4`count(*)` }).from(vehicleRecords).where(
      and10(
        gte4(vehicleRecords.createdAt, startOfMonth),
        lte4(vehicleRecords.createdAt, endOfMonth),
        sql4`record_type = 'abastecimento'`
      )
    );
    const [{ total: fuelCostThisMonth }] = await db.select({ total: sql4`coalesce(sum(fuel_cost), 0)` }).from(vehicleRecords).where(
      and10(
        gte4(vehicleRecords.createdAt, startOfMonth),
        lte4(vehicleRecords.createdAt, endOfMonth),
        sql4`record_type = 'abastecimento'`
      )
    );
    const [{ count: attendanceToday }] = await db.select({ count: sql4`count(*)` }).from(collaboratorAttendance).where(gte4(collaboratorAttendance.date, startOfDay));
    const [{ count: attendanceThisMonth }] = await db.select({ count: sql4`count(*)` }).from(collaboratorAttendance).where(and10(
      gte4(collaboratorAttendance.date, startOfMonth),
      lte4(collaboratorAttendance.date, endOfMonth)
    ));
    const [{ total: pendingPaymentThisMonth }] = await db.select({ total: sql4`coalesce(sum(cast(daily_value as decimal(10,2))), 0)` }).from(collaboratorAttendance).where(
      and10(
        gte4(collaboratorAttendance.date, startOfMonth),
        lte4(collaboratorAttendance.date, endOfMonth),
        sql4`payment_status_ca = 'pendente'`
      )
    );
    const [{ count: totalEquipment }] = await db.select({ count: sql4`count(*)` }).from(equipment);
    const [{ count: lowStockParts }] = await db.select({ count: sql4`count(*)` }).from(parts).where(sql4`stock_quantity < 5`);
    const recentCargos = await db.select({
      id: cargoLoads.id,
      vehiclePlate: cargoLoads.vehiclePlate,
      destination: cargoLoads.destination,
      volumeM3: cargoLoads.volumeM3,
      createdAt: cargoLoads.createdAt,
      status: cargoLoads.status
    }).from(cargoLoads).orderBy(sql4`created_at desc`).limit(5);
    const recentAttendance = await db.select({
      id: collaboratorAttendance.id,
      collaboratorId: collaboratorAttendance.collaboratorId,
      date: collaboratorAttendance.date,
      dailyValue: collaboratorAttendance.dailyValue,
      paymentStatus: collaboratorAttendance.paymentStatus,
      activity: collaboratorAttendance.activity
    }).from(collaboratorAttendance).orderBy(sql4`created_at desc`).limit(5);
    const [{ count: pendingOrders }] = await db.select({ count: sql4`count(*)` }).from(purchaseOrders).where(sql4`status = 'pending'`);
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

// server/routers.ts
import { z as z20 } from "zod";
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
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z20.object({
      name: z20.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      email: z20.string().email("Email inv\xE1lido"),
      password: z20.string().min(6, "Senha deve ter pelo menos 6 caracteres")
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
    login: publicProcedure.input(z20.object({
      email: z20.string().email("Email inv\xE1lido"),
      password: z20.string().min(1, "Senha \xE9 obrigat\xF3ria")
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
    seedAdmin: publicProcedure.input(z20.object({
      seedKey: z20.string(),
      email: z20.string().email(),
      name: z20.string(),
      password: z20.string().min(4)
    })).mutation(async ({ input }) => {
      if (input.seedKey !== "BTREE_SEED_2026") {
        throw new Error("Chave inv\xE1lida");
      }
      const passwordHash = await hashPassword(input.password);
      const result = await updateUserPasswordByEmail(input.email, passwordHash, "admin");
      return { success: true, message: `Admin ${input.email} ${result.action === "updated" ? "atualizado" : "criado"} com sucesso` };
    }),
    // Solicitar recuperação de senha
    forgotPassword: publicProcedure.input(z20.object({
      email: z20.string().email("Email inv\xE1lido"),
      origin: z20.string().url().optional()
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
    resetPassword: publicProcedure.input(z20.object({
      token: z20.string().min(1),
      password: z20.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input }) => {
      const resetToken = await getValidResetToken(input.token);
      if (!resetToken) {
        throw new Error("Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha.");
      }
      const passwordHash = await hashPassword(input.password);
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { users: users3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq19 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.update(users3).set({ passwordHash, loginMethod: "email", updatedAt: /* @__PURE__ */ new Date() }).where(eq19(users3.id, resetToken.userId));
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
  extraExpenses: extraExpensesRouter
  // TODO: add feature routers here, e.g.
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
