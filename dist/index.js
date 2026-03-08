var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendanceRecords: () => attendanceRecords,
  biometricAttendance: () => biometricAttendance,
  cargoLoads: () => cargoLoads,
  cargoShipments: () => cargoShipments,
  clientPayments: () => clientPayments,
  clientPortalAccess: () => clientPortalAccess,
  clients: () => clients,
  collaboratorDocuments: () => collaboratorDocuments,
  collaborators: () => collaborators,
  equipment: () => equipment,
  equipmentMaintenance: () => equipmentMaintenance,
  equipmentPhotos: () => equipmentPhotos,
  equipmentTypes: () => equipmentTypes,
  fuelRecords: () => fuelRecords,
  machineFuel: () => machineFuel,
  machineHours: () => machineHours,
  machineMaintenance: () => machineMaintenance,
  parts: () => parts,
  partsRequests: () => partsRequests,
  passwordResetTokens: () => passwordResetTokens,
  replantingRecords: () => replantingRecords,
  rolePermissions: () => rolePermissions,
  sectors: () => sectors,
  userProfiles: () => userProfiles,
  users: () => users,
  vehicleRecords: () => vehicleRecords
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, passwordResetTokens, collaborators, biometricAttendance, userProfiles, equipmentTypes, equipment, cargoShipments, fuelRecords, attendanceRecords, sectors, rolePermissions, clients, cargoLoads, machineHours, machineMaintenance, machineFuel, vehicleRecords, parts, partsRequests, clientPortalAccess, replantingRecords, clientPayments, collaboratorDocuments, equipmentPhotos, equipmentMaintenance;
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
      collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
      date: timestamp("date").notNull(),
      checkInTime: timestamp("check_in_time").notNull(),
      checkOutTime: timestamp("check_out_time"),
      location: varchar("location", { length: 255 }),
      // Nome do local (fazenda, talhao)
      latitude: varchar("latitude", { length: 20 }),
      longitude: varchar("longitude", { length: 20 }),
      photoUrl: text("photo_url"),
      // Foto tirada no momento da presença
      confidence: varchar("confidence", { length: 10 }),
      // % de confiança do reconhecimento
      registeredBy: int("registered_by").notNull().references(() => users.id),
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
      imageUrl: text("image_url"),
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
      active: int("active").default(1).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
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
      invoiceNumber: varchar("invoice_number", { length: 100 }),
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
      createdBy: int("created_by").references(() => users.id)
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

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createPasswordResetToken: () => createPasswordResetToken,
  createUser: () => createUser,
  getDb: () => getDb,
  getUserByEmail: () => getUserByEmail,
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

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

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

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      user = await getUserByEmail(sessionUserId);
    }
    if (!user && sessionUserId.includes("@") === false) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || "",
          email: userInfo.email || "",
          loginMethod: userInfo.loginMethod || userInfo.platform || "oauth",
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (user.openId) {
      await upsertUser({
        openId: user.openId,
        name: user.name || "",
        email: user.email || "",
        lastSignedIn: signedInAt
      });
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || "",
        email: userInfo.email || "",
        loginMethod: userInfo.loginMethod || userInfo.platform || "oauth",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
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
import { z as z2 } from "zod";
import { eq as eq2, desc, and as and2, like, or } from "drizzle-orm";

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

// server/cloudinary.ts
async function cloudinaryUpload(data, folder = "btree") {
  let buffer;
  let contentType = "image/jpeg";
  if (Buffer.isBuffer(data)) {
    buffer = data;
  } else {
    if (data.startsWith("data:")) {
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64");
      }
    } else {
      buffer = Buffer.from(data, "base64");
    }
  }
  const timestamp2 = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = contentType.includes("pdf") ? "pdf" : contentType.includes("png") ? "png" : "jpg";
  const key = `${folder}/${timestamp2}-${random}.${ext}`;
  const { url } = await storagePut(key, buffer, contentType);
  return {
    url,
    publicId: key
  };
}

// server/routers/collaborators.ts
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
  // Registrar presença biométrica
  registerAttendance: protectedProcedure.input(z2.object({
    collaboratorId: z2.number(),
    location: z2.string().optional(),
    latitude: z2.string().optional(),
    longitude: z2.string().optional(),
    photoBase64: z2.string().optional(),
    confidence: z2.string().optional(),
    notes: z2.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let photoUrl;
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, "btree/attendance");
      photoUrl = result.url;
    }
    const now = /* @__PURE__ */ new Date();
    const [inserted] = await db.insert(biometricAttendance).values({
      collaboratorId: input.collaboratorId,
      date: now,
      checkInTime: now,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      photoUrl,
      confidence: input.confidence,
      registeredBy: ctx.user.id,
      notes: input.notes
    });
    const newId = inserted.insertId;
    return { success: true, id: newId };
  }),
  // Listar presenças (para o admin/Mary)
  listAttendance: protectedProcedure.input(z2.object({
    date: z2.string().optional(),
    // YYYY-MM-DD
    collaboratorId: z2.number().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const records = await db.select({
      id: biometricAttendance.id,
      collaboratorId: biometricAttendance.collaboratorId,
      collaboratorName: collaborators.name,
      collaboratorRole: collaborators.role,
      collaboratorPhoto: collaborators.photoUrl,
      date: biometricAttendance.date,
      checkInTime: biometricAttendance.checkInTime,
      checkOutTime: biometricAttendance.checkOutTime,
      location: biometricAttendance.location,
      latitude: biometricAttendance.latitude,
      longitude: biometricAttendance.longitude,
      photoUrl: biometricAttendance.photoUrl,
      confidence: biometricAttendance.confidence,
      notes: biometricAttendance.notes,
      createdAt: biometricAttendance.createdAt
    }).from(biometricAttendance).innerJoin(collaborators, eq2(biometricAttendance.collaboratorId, collaborators.id)).orderBy(desc(biometricAttendance.checkInTime));
    return records;
  }),
  // Buscar todos os descritores faciais (para reconhecimento)
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
      imageUrl: equipment.imageUrl,
      status: equipment.status,
      typeId: equipment.typeId,
      typeName: equipmentTypes.name,
      createdAt: equipment.createdAt
    }).from(equipment).leftJoin(equipmentTypes, eq3(equipment.typeId, equipmentTypes.id)).orderBy(equipment.name);
    return rows.filter((r) => {
      if (input.typeId && r.typeId !== input.typeId) return false;
      if (input.status && r.status !== input.status) return false;
      if (input.search) {
        const s = input.search.toLowerCase();
        return r.name.toLowerCase().includes(s) || (r.brand || "").toLowerCase().includes(s) || (r.model || "").toLowerCase().includes(s) || (r.serialNumber || "").toLowerCase().includes(s);
      }
      return true;
    });
  }),
  createEquipment: protectedProcedure.input(z3.object({
    name: z3.string().min(1),
    typeId: z3.number(),
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
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
    brand: z3.string().optional(),
    model: z3.string().optional(),
    year: z3.number().optional(),
    serialNumber: z3.string().optional(),
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
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq5, desc as desc3 } from "drizzle-orm";

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

// server/routers/cargoLoads.ts
var cargoLoadsRouter = router({
  list: protectedProcedure.input(z5.object({
    search: z5.string().optional(),
    clientId: z5.number().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional(),
    dateFrom: z5.string().optional(),
    dateTo: z5.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const results = await db.select().from(cargoLoads).orderBy(desc3(cargoLoads.createdAt));
    let filtered = results;
    if (input?.search) {
      const s = input.search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.driverName?.toLowerCase().includes(s) || r.clientName?.toLowerCase().includes(s) || r.destination?.toLowerCase().includes(s) || r.invoiceNumber?.toLowerCase().includes(s) || r.vehiclePlate?.toLowerCase().includes(s)
      );
    }
    if (input?.clientId) filtered = filtered.filter((r) => r.clientId === input.clientId);
    if (input?.status) filtered = filtered.filter((r) => r.status === input.status);
    return filtered;
  }),
  getById: protectedProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const result = await db.select().from(cargoLoads).where(eq5(cargoLoads.id, input.id)).limit(1);
    if (!result.length) throw new TRPCError4({ code: "NOT_FOUND" });
    return result[0];
  }),
  // Analisar foto de carga via IA e extrair dados automaticamente
  analyzePhoto: protectedProcedure.input(z5.object({
    photoBase64: z5.string()
    // base64 da imagem
  })).mutation(async ({ input }) => {
    const uploaded = await cloudinaryUpload(input.photoBase64, "btree/cargo-analysis");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Voc\xEA \xE9 um assistente especializado em extrair dados de documentos de transporte de lenha/madeira no Brasil.
Analise a imagem fornecida (pode ser um formul\xE1rio de recebimento, ticket de pesagem, nota fiscal ou foto da carga) e extraia os dados dispon\xEDveis.
Retorne APENAS um JSON v\xE1lido com os campos encontrados, sem texto adicional.
Se um campo n\xE3o estiver vis\xEDvel ou leg\xEDvel, retorne null para esse campo.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise esta imagem e extraia os dados de transporte/carga. Retorne um JSON com os campos: date (data no formato YYYY-MM-DD), vehiclePlate (placa do ve\xEDculo), driverName (nome do motorista), heightM (altura em metros, apenas n\xFAmero), widthM (largura em metros, apenas n\xFAmero), lengthM (comprimento em metros, apenas n\xFAmero), volumeM3 (volume em m\xB3, apenas n\xFAmero), woodType (tipo de lenha/madeira), destination (destino/estabelecimento), invoiceNumber (n\xFAmero da nota fiscal/NF), clientName (nome do cliente/empresa recebedora), notes (observa\xE7\xF5es)."
            },
            {
              type: "image_url",
              image_url: { url: uploaded.url, detail: "high" }
            }
          ]
        }
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
              vehiclePlate: { type: ["string", "null"], description: "Placa do ve\xEDculo" },
              driverName: { type: ["string", "null"], description: "Nome do motorista" },
              heightM: { type: ["string", "null"], description: "Altura em metros" },
              widthM: { type: ["string", "null"], description: "Largura em metros" },
              lengthM: { type: ["string", "null"], description: "Comprimento em metros" },
              volumeM3: { type: ["string", "null"], description: "Volume em m\xB3" },
              woodType: { type: ["string", "null"], description: "Tipo de lenha/madeira" },
              destination: { type: ["string", "null"], description: "Destino/estabelecimento" },
              invoiceNumber: { type: ["string", "null"], description: "N\xFAmero da nota fiscal" },
              clientName: { type: ["string", "null"], description: "Nome do cliente/empresa" },
              notes: { type: ["string", "null"], description: "Observa\xE7\xF5es" }
            },
            required: ["date", "vehiclePlate", "driverName", "heightM", "widthM", "lengthM", "volumeM3", "woodType", "destination", "invoiceNumber", "clientName", "notes"],
            additionalProperties: false
          }
        }
      }
    });
    const content = response.choices?.[0]?.message?.content;
    let extracted = {};
    try {
      extracted = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      extracted = {};
    }
    return {
      photoUrl: uploaded.url,
      extracted
    };
  }),
  // Upload de foto para uma carga existente
  uploadPhoto: protectedProcedure.input(z5.object({
    cargoId: z5.number(),
    photoBase64: z5.string()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const uploaded = await cloudinaryUpload(input.photoBase64, `btree/cargo/${input.cargoId}`);
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
    woodType: z5.string().optional(),
    destination: z5.string().optional(),
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
    woodType: z5.string().optional(),
    destination: z5.string().optional(),
    invoiceNumber: z5.string().optional(),
    clientId: z5.number().optional(),
    clientName: z5.string().optional(),
    photosJson: z5.string().optional(),
    notes: z5.string().optional(),
    status: z5.enum(["pendente", "entregue", "cancelado"]).optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, date, ...rest } = input;
    const updateData = { ...rest, updatedAt: /* @__PURE__ */ new Date() };
    if (date) updateData.date = new Date(date);
    await db.update(cargoLoads).set(updateData).where(eq5(cargoLoads.id, id));
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
  })
});

// server/routers/vehicleRecords.ts
import { z as z7 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError6 } from "@trpc/server";
import { eq as eq7, desc as desc5 } from "drizzle-orm";
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
    return filtered;
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
    notes: z7.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(vehicleRecords).values({
      ...input,
      date: new Date(input.date),
      registeredBy: ctx.user.id
    });
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
    notes: z8.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    await db.insert(parts).values({ ...input, createdBy: ctx.user.id });
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
    notes: z8.string().optional(),
    active: z8.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Banco indispon\xEDvel" });
    const { id, ...rest } = input;
    await db.update(parts).set({ ...rest, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(parts.id, id));
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
import crypto from "crypto";
var clientPortalRouter = router({
  // ── LOGIN DO CLIENTE (público) ──
  login: publicProcedure.input(z10.object({ accessCode: z10.string().min(4) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [access] = await db.select({
      id: clientPortalAccess.id,
      clientId: clientPortalAccess.clientId,
      active: clientPortalAccess.active,
      clientName: clients.name,
      clientPhone: clients.phone,
      clientEmail: clients.email,
      clientCity: clients.city
    }).from(clientPortalAccess).innerJoin(clients, eq10(clientPortalAccess.clientId, clients.id)).where(
      and4(
        eq10(clientPortalAccess.accessCode, input.accessCode.trim().toUpperCase()),
        eq10(clientPortalAccess.active, 1),
        eq10(clients.active, 1)
      )
    ).limit(1);
    if (!access) throw new Error("C\xF3digo de acesso inv\xE1lido ou inativo.");
    await db.update(clientPortalAccess).set({ lastAccessAt: /* @__PURE__ */ new Date() }).where(eq10(clientPortalAccess.id, access.id));
    return {
      clientId: access.clientId,
      clientName: access.clientName,
      clientPhone: access.clientPhone,
      clientEmail: access.clientEmail,
      clientCity: access.clientCity
    };
  }),
  // ── DADOS DO PORTAL (público — requer clientId validado no frontend) ──
  getPortalData: publicProcedure.input(z10.object({ clientId: z10.number(), accessCode: z10.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [access] = await db.select({ id: clientPortalAccess.id }).from(clientPortalAccess).where(
      and4(
        eq10(clientPortalAccess.clientId, input.clientId),
        eq10(clientPortalAccess.accessCode, input.accessCode.trim().toUpperCase()),
        eq10(clientPortalAccess.active, 1)
      )
    ).limit(1);
    if (!access) throw new Error("Acesso n\xE3o autorizado.");
    const [client] = await db.select().from(clients).where(eq10(clients.id, input.clientId)).limit(1);
    const loads = await db.select().from(cargoLoads).where(eq10(cargoLoads.clientId, input.clientId)).orderBy(desc8(cargoLoads.date)).limit(50);
    const replanting = await db.select().from(replantingRecords).where(eq10(replantingRecords.clientId, input.clientId)).orderBy(desc8(replantingRecords.date)).limit(50);
    const payments = await db.select().from(clientPayments).where(eq10(clientPayments.clientId, input.clientId)).orderBy(desc8(clientPayments.referenceDate)).limit(50);
    return { client, loads, replanting, payments };
  }),
  // ── GERAR CÓDIGO DE ACESSO (admin) ──
  generateAccessCode: protectedProcedure.input(z10.object({ clientId: z10.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(clientPortalAccess).set({ active: 0 }).where(eq10(clientPortalAccess.clientId, input.clientId));
    const code = crypto.randomInt(1e5, 999999).toString();
    await db.insert(clientPortalAccess).values({
      clientId: input.clientId,
      accessCode: code,
      active: 1,
      createdBy: ctx.user.id
    });
    return { accessCode: code };
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
  }),
  // ── LISTAR ACESSOS ATIVOS (admin) ──
  listAccesses: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select({
      id: clientPortalAccess.id,
      clientId: clientPortalAccess.clientId,
      clientName: clients.name,
      accessCode: clientPortalAccess.accessCode,
      active: clientPortalAccess.active,
      lastAccessAt: clientPortalAccess.lastAccessAt,
      createdAt: clientPortalAccess.createdAt
    }).from(clientPortalAccess).innerJoin(clients, eq10(clientPortalAccess.clientId, clients.id)).orderBy(desc8(clientPortalAccess.createdAt));
  })
});

// server/routers/collaboratorDocuments.ts
init_db();
init_schema();
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
import { eq as eq12, desc as desc10 } from "drizzle-orm";
var equipmentDetailRouter = router({
  // Buscar equipamento por ID
  getById: protectedProcedure.input(z12.object({ id: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select().from(equipment).where(eq12(equipment.id, input.id)).limit(1);
    return result[0] || null;
  }),
  // Listar fotos do equipamento
  listPhotos: protectedProcedure.input(z12.object({ equipmentId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(equipmentPhotos).where(eq12(equipmentPhotos.equipmentId, input.equipmentId)).orderBy(desc10(equipmentPhotos.createdAt));
  }),
  // Adicionar foto ao equipamento
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
  // Remover foto
  removePhoto: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentPhotos).where(eq12(equipmentPhotos.id, input.id));
    return { success: true };
  }),
  // Listar histórico de manutenções
  listMaintenance: protectedProcedure.input(z12.object({ equipmentId: z12.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(equipmentMaintenance).where(eq12(equipmentMaintenance.equipmentId, input.equipmentId)).orderBy(desc10(equipmentMaintenance.performedAt));
  }),
  // Registrar manutenção
  addMaintenance: protectedProcedure.input(z12.object({
    equipmentId: z12.number(),
    type: z12.enum(["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]),
    description: z12.string().min(3),
    performedBy: z12.string().optional(),
    cost: z12.string().optional(),
    nextMaintenanceDate: z12.string().optional(),
    // ISO date string
    performedAt: z12.string(),
    // ISO date string
    photoBase64: z12.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let photosJson;
    if (input.photoBase64) {
      const result = await cloudinaryUpload(input.photoBase64, `btree/maintenance/${input.equipmentId}`);
      photosJson = JSON.stringify([result.url]);
    }
    const [ins] = await db.insert(equipmentMaintenance).values({
      equipmentId: input.equipmentId,
      type: input.type,
      description: input.description,
      performedBy: input.performedBy,
      cost: input.cost,
      nextMaintenanceDate: input.nextMaintenanceDate ? new Date(input.nextMaintenanceDate) : void 0,
      performedAt: new Date(input.performedAt),
      photosJson,
      registeredBy: ctx.user.id
    });
    return { id: ins.insertId };
  }),
  // Remover manutenção
  removeMaintenance: protectedProcedure.input(z12.object({ id: z12.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(equipmentMaintenance).where(eq12(equipmentMaintenance.id, input.id));
    return { success: true };
  }),
  // Atualizar foto principal do equipamento
  updateMainPhoto: protectedProcedure.input(z12.object({
    id: z12.number(),
    photoBase64: z12.string()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await cloudinaryUpload(input.photoBase64, `btree/equipment/main`);
    await db.update(equipment).set({ imageUrl: result.url }).where(eq12(equipment.id, input.id));
    return { url: result.url };
  })
});

// server/routers.ts
import { z as z13 } from "zod";
init_db();

// server/email.ts
import nodemailer from "nodemailer";
async function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }
  const testAccount = await nodemailer.createTestAccount();
  console.log("[Email] Usando conta de teste Ethereal:", testAccount.user);
  return nodemailer.createTransport({
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
    const transporter = await createTransporter();
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
    const previewUrl = nodemailer.getTestMessageUrl(info) || void 0;
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
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z13.object({
      name: z13.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      email: z13.string().email("Email inv\xE1lido"),
      password: z13.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input, ctx }) => {
      try {
        const user = await registerUser(input);
        const sessionToken = await sdk.createSessionToken(user.email, {
          name: user.name,
          expiresInMs: 365 * 24 * 60 * 60 * 1e3
          // 1 ano
        });
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
    login: publicProcedure.input(z13.object({
      email: z13.string().email("Email inv\xE1lido"),
      password: z13.string().min(1, "Senha \xE9 obrigat\xF3ria")
    })).mutation(async ({ input, ctx }) => {
      try {
        const user = await loginUser(input.email, input.password);
        const sessionToken = await sdk.createSessionToken(user.email, {
          name: user.name,
          expiresInMs: 365 * 24 * 60 * 60 * 1e3
          // 1 ano
        });
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
    seedAdmin: publicProcedure.input(z13.object({
      seedKey: z13.string(),
      email: z13.string().email(),
      name: z13.string(),
      password: z13.string().min(4)
    })).mutation(async ({ input }) => {
      if (input.seedKey !== "BTREE_SEED_2026") {
        throw new Error("Chave inv\xE1lida");
      }
      const passwordHash = await hashPassword(input.password);
      const result = await updateUserPasswordByEmail(input.email, passwordHash, "admin");
      return { success: true, message: `Admin ${input.email} ${result.action === "updated" ? "atualizado" : "criado"} com sucesso` };
    }),
    // Solicitar recuperação de senha
    forgotPassword: publicProcedure.input(z13.object({
      email: z13.string().email("Email inv\xE1lido"),
      origin: z13.string().url().optional()
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
    resetPassword: publicProcedure.input(z13.object({
      token: z13.string().min(1),
      password: z13.string().min(6, "Senha deve ter pelo menos 6 caracteres")
    })).mutation(async ({ input }) => {
      const resetToken = await getValidResetToken(input.token);
      if (!resetToken) {
        throw new Error("Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha.");
      }
      const passwordHash = await hashPassword(input.password);
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq13 } = await import("drizzle-orm");
      const dbInstance = await getDb2();
      if (!dbInstance) throw new Error("Database not available");
      await dbInstance.update(users2).set({ passwordHash, loginMethod: "email", updatedAt: /* @__PURE__ */ new Date() }).where(eq13(users2.id, resetToken.userId));
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
  equipmentDetail: equipmentDetailRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
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
  registerOAuthRoutes(app);
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
