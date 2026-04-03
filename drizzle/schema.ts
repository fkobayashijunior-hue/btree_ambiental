import { date, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tokens de recuperação de senha
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Ficha completa do colaborador
export const collaborators = mysqlTable("collaborators", {
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
  faceDescriptor: text("face_descriptor"), // JSON com vetor facial (128 floats)
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
  createdBy: int("created_by").references(() => users.id),
});
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

// Registro de presença biométrica
export const biometricAttendance = mysqlTable("biometric_attendance", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BiometricAttendance = typeof biometricAttendance.$inferSelect;
export type InsertBiometricAttendance = typeof biometricAttendance.$inferInsert;

// Perfis de usuário (mantido para compatibilidade)
export const userProfiles = mysqlTable("user_profiles", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Tipos de equipamentos
export const equipmentTypes = mysqlTable("equipment_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Equipamentos
export const equipment = mysqlTable("equipment", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Saídas de cargas
export const cargoShipments = mysqlTable("cargo_shipments", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Abastecimentos
export const fuelRecords = mysqlTable("fuel_records", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Registro de presença
export const attendanceRecords = mysqlTable("attendance_records", {
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type EquipmentType = typeof equipmentTypes.$inferSelect;
export type InsertEquipmentType = typeof equipmentTypes.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;
export type CargoShipment = typeof cargoShipments.$inferSelect;
export type InsertCargoShipment = typeof cargoShipments.$inferInsert;
export type FuelRecord = typeof fuelRecords.$inferSelect;
export type InsertFuelRecord = typeof fuelRecords.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

// Setores da empresa
export const sectors = mysqlTable("sectors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#16a34a"),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdBy: int("created_by").references(() => users.id),
});
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// Permissões de acesso por função (RBAC)
// Define quais módulos cada função pode acessar
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleName: varchar("role_name", { length: 50 }).notNull(), // ex: mecanico, motorista
  module: varchar("module", { length: 50 }).notNull(), // ex: colaboradores, equipamentos, presenca
  canView: int("can_view").default(0).notNull(),
  canCreate: int("can_create").default(0).notNull(),
  canEdit: int("can_edit").default(0).notNull(),
  canDelete: int("can_delete").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updated_by").references(() => users.id),
});
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ===== CLIENTES =====
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }), // CPF ou CNPJ
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  notes: text("notes"),
  password: varchar("password", { length: 255 }), // senha para acesso ao portal
  active: int("active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdBy: int("created_by").references(() => users.id),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ===== DESTINOS DE CARGA =====
export const cargoDestinations = mysqlTable("cargo_destinations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  notes: text("notes"),
  active: int("active").default(1).notNull(),
  clientId: int("client_id").references(() => clients.id), // cliente vinculado ao destino
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: int("created_by").references(() => users.id),
});
export type CargoDestination = typeof cargoDestinations.$inferSelect;
export type InsertCargoDestination = typeof cargoDestinations.$inferInsert;

// ===== CONTROLE DE CARGAS =====
export const cargoLoads = mysqlTable("cargo_loads", {
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
  volumeM3: varchar("volume_m3", { length: 20 }).notNull(), // calculado
  // Informações da carga
  woodType: varchar("wood_type", { length: 100 }),
  destination: varchar("destination", { length: 255 }),
  destinationId: int("destination_id").references(() => cargoDestinations.id),
  weightKg: varchar("weight_kg", { length: 20 }), // peso em kg
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  // Acompanhamento em tempo real
  trackingStatus: mysqlEnum("tracking_status", ["aguardando", "carregando", "em_transito", "pesagem_saida", "descarregando", "pesagem_chegada", "finalizado"]).default("aguardando"),
  trackingUpdatedAt: timestamp("tracking_updated_at"),
  trackingNotes: text("tracking_notes"),
  weightOutPhotoUrl: text("weight_out_photo_url"), // foto da pesagem na saída
  weightInPhotoUrl: text("weight_in_photo_url"),   // foto da pesagem na chegada/destino
  // Cliente
  clientId: int("client_id").references(() => clients.id),
  clientName: varchar("client_name", { length: 255 }),
  // Fotos (JSON array de URLs)
  photosJson: text("photos_json"),
  notes: text("notes"),
  status: mysqlEnum("status", ["pendente", "entregue", "cancelado"]).default("pendente").notNull(),
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type CargoLoad = typeof cargoLoads.$inferSelect;
export type InsertCargoLoad = typeof cargoLoads.$inferInsert;

// ===== CONTROLE DE HORAS DE MÁQUINAS =====
export const machineHours = mysqlTable("machine_hours", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id),
  operatorCollaboratorId: int("operator_collaborator_id").references(() => collaborators.id),
  date: timestamp("date").notNull(),
  startHourMeter: varchar("start_hour_meter", { length: 20 }).notNull(),
  endHourMeter: varchar("end_hour_meter", { length: 20 }).notNull(),
  hoursWorked: varchar("hours_worked", { length: 20 }).notNull(), // calculado
  activity: varchar("activity", { length: 255 }),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MachineHours = typeof machineHours.$inferSelect;
export type InsertMachineHours = typeof machineHours.$inferInsert;

// ===== MANUTENÇÃO DE MÁQUINAS =====
export const machineMaintenance = mysqlTable("machine_maintenance", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id),
  date: timestamp("date").notNull(),
  hourMeter: varchar("hour_meter", { length: 20 }),
  type: mysqlEnum("type", ["preventiva", "corretiva", "revisao"]).notNull().default("corretiva"),
  serviceType: mysqlEnum("service_type", ["proprio", "terceirizado"]).notNull().default("proprio"),
  mechanicCollaboratorId: int("mechanic_collaborator_id").references(() => collaborators.id),
  mechanicName: varchar("mechanic_name", { length: 255 }),
  thirdPartyCompany: varchar("third_party_company", { length: 255 }),
  partsReplaced: text("parts_replaced"), // JSON: [{name, quantity, cost}]
  laborCost: varchar("labor_cost", { length: 20 }),
  totalCost: varchar("total_cost", { length: 20 }),
  description: text("description"),
  nextMaintenanceHours: varchar("next_maintenance_hours", { length: 20 }),
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type MachineMaintenance = typeof machineMaintenance.$inferSelect;
export type InsertMachineMaintenance = typeof machineMaintenance.$inferInsert;

// ===== ABASTECIMENTO DE MÁQUINAS (por horímetro) =====
export const machineFuel = mysqlTable("machine_fuel", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MachineFuel = typeof machineFuel.$inferSelect;
export type InsertMachineFuel = typeof machineFuel.$inferInsert;

// ===== CONTROLE DE VEÍCULOS =====
export const vehicleRecords = mysqlTable("vehicle_records", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type VehicleRecord = typeof vehicleRecords.$inferSelect;
export type InsertVehicleRecord = typeof vehicleRecords.$inferInsert;

// ===== PEÇAS E ACESSÓRIOS =====
export const parts = mysqlTable("parts", {
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
  createdBy: int("created_by").references(() => users.id),
});
export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;

// ===== SOLICITAÇÕES DE PEÇAS =====
export const partsRequests = mysqlTable("parts_requests", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("part_id").references(() => parts.id),
  partName: varchar("part_name", { length: 255 }).notNull(), // fallback se não cadastrada
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PartsRequest = typeof partsRequests.$inferSelect;
export type InsertPartsRequest = typeof partsRequests.$inferInsert;
// ===== PORTAL DO CLIENTE =====

// Código de acesso do cliente ao portal (PIN de 6 dígitos ou token)
export const clientPortalAccess = mysqlTable("client_portal_access", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  accessCode: varchar("access_code", { length: 64 }).notNull().unique(), // PIN ou token
  active: int("active").default(1).notNull(),
  lastAccessAt: timestamp("last_access_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdBy: int("created_by"),
});
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
export type InsertClientPortalAccess = typeof clientPortalAccess.$inferInsert;

// Replantio vinculado ao cliente
export const replantingRecords = mysqlTable("replanting_records", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id),
  date: timestamp("date").notNull(),
  area: varchar("area", { length: 100 }), // ex: "Fazenda Boa Vista - Talhão 3"
  species: varchar("species", { length: 100 }).default("Eucalipto"), // espécie plantada
  quantity: int("quantity"), // número de mudas
  areaHectares: varchar("area_hectares", { length: 20 }), // área em hectares
  notes: text("notes"),
  photosJson: text("photos_json"), // JSON array de URLs
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ReplantingRecord = typeof replantingRecords.$inferSelect;
export type InsertReplantingRecord = typeof replantingRecords.$inferInsert;

// Pagamentos ao cliente (compra de eucalipto)
export const clientPayments = mysqlTable("client_payments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id),
  referenceDate: timestamp("reference_date").notNull(), // mês/período de referência
  description: varchar("description", { length: 500 }), // ex: "Compra de eucalipto - Talhão 3"
  volumeM3: varchar("volume_m3", { length: 20 }), // volume comprado
  pricePerM3: varchar("price_per_m3", { length: 20 }), // preço por m³
  grossAmount: varchar("gross_amount", { length: 20 }).notNull(), // valor bruto
  deductions: varchar("deductions", { length: 20 }).default("0"), // descontos
  netAmount: varchar("net_amount", { length: 20 }).notNull(), // valor líquido
  status: mysqlEnum("status", ["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
  dueDate: timestamp("due_date"), // data de vencimento
  paidAt: timestamp("paid_at"), // data do pagamento
  pixKey: varchar("pix_key", { length: 255 }), // chave pix do cliente
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ClientPayment = typeof clientPayments.$inferSelect;
export type InsertClientPayment = typeof clientPayments.$inferInsert;

// ===== DOCUMENTOS & CERTIFICADOS DE COLABORADORES =====
export const collaboratorDocuments = mysqlTable("collaborator_documents", {
  id: int("id").autoincrement().primaryKey(),
  collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
  type: mysqlEnum("type", [
    "cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"
  ]).notNull().default("outros"),
  title: varchar("title", { length: 255 }).notNull(), // ex: "CNH Categoria B", "Certificado NR10"
  fileUrl: varchar("file_url", { length: 1000 }).notNull(), // URL Cloudinary
  fileType: varchar("file_type", { length: 50 }), // "image/jpeg", "application/pdf"
  issueDate: timestamp("issue_date"), // data de emissão
  expiryDate: timestamp("expiry_date"), // data de validade (opcional)
  notes: text("notes"),
  uploadedBy: int("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type CollaboratorDocument = typeof collaboratorDocuments.$inferSelect;
export type InsertCollaboratorDocument = typeof collaboratorDocuments.$inferInsert;

// ===== FOTOS DE EQUIPAMENTOS =====
export const equipmentPhotos = mysqlTable("equipment_photos", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull(), // referência ao equipamento (setores/equipamentos)
  photoUrl: varchar("photo_url", { length: 1000 }).notNull(),
  caption: varchar("caption", { length: 255 }), // ex: "Foto da placa", "Vista lateral"
  uploadedBy: int("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EquipmentPhoto = typeof equipmentPhotos.$inferSelect;
export type InsertEquipmentPhoto = typeof equipmentPhotos.$inferInsert;

// ===== HISTÓRICO DE MANUTENÇÕES DE EQUIPAMENTOS =====
export const equipmentMaintenance = mysqlTable("equipment_maintenance", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull(),
  type: mysqlEnum("type", ["manutencao", "limpeza", "afiacao", "revisao", "troca_oleo", "outros"]).notNull().default("manutencao"),
  description: text("description").notNull(),
  performedBy: varchar("performed_by", { length: 255 }), // nome do responsável
  cost: varchar("cost", { length: 20 }), // custo em R$
  nextMaintenanceDate: timestamp("next_maintenance_date"), // próxima manutenção prevista
  photosJson: text("photos_json"), // JSON array de URLs
  registeredBy: int("registered_by").references(() => users.id),
  performedAt: timestamp("performed_at").notNull(), // data da manutenção
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EquipmentMaintenance = typeof equipmentMaintenance.$inferSelect;
export type InsertEquipmentMaintenance = typeof equipmentMaintenance.$inferInsert;

// ===== PEDIDOS DE COMPRA (Carrinho de Peças) =====
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // ex: "Pedido 001 - Filtros"
  status: mysqlEnum("status", ["rascunho", "enviado", "aprovado", "rejeitado", "comprado"]).default("rascunho").notNull(),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

// ===== REGISTRO DE PRESENÇA DE COLABORADORES =====
export const collaboratorAttendance = mysqlTable("collaborator_attendance", {
  id: int("id").autoincrement().primaryKey(),
  collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
  date: timestamp("date").notNull(),
  employmentType: mysqlEnum("employment_type_ca", ["clt", "terceirizado", "diarista"]).notNull().default("diarista"),
  dailyValue: varchar("daily_value", { length: 20 }).notNull().default("0"),
  pixKey: varchar("pix_key", { length: 255 }),
  activity: varchar("activity", { length: 255 }), // função/atividade do dia
  observations: text("observations"),
  paymentStatus: mysqlEnum("payment_status_ca", ["pendente", "pago"]).default("pendente").notNull(),
  paidAt: timestamp("paid_at"),
  registeredBy: int("registered_by").references(() => users.id),
  // GPS do registro de presença
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  locationName: varchar("location_name", { length: 255 }), // nome do local (fazenda, sede, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type CollaboratorAttendance = typeof collaboratorAttendance.$inferSelect;
export type InsertCollaboratorAttendance = typeof collaboratorAttendance.$inferInsert;

// ===== VINCULAÇÃO GPS (Traccar) ↔ EQUIPAMENTO =====
// Vincula um dispositivo Traccar a um equipamento cadastrado no sistema
export const gpsDeviceLinks = mysqlTable("gps_device_links", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  traccarDeviceId: int("traccar_device_id").notNull(), // ID do dispositivo no Traccar
  traccarDeviceName: varchar("traccar_device_name", { length: 255 }), // nome no Traccar (cache)
  traccarUniqueId: varchar("traccar_unique_id", { length: 100 }), // IMEI/ID único do rastreador
  active: int("active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type GpsDeviceLink = typeof gpsDeviceLinks.$inferSelect;
export type InsertGpsDeviceLink = typeof gpsDeviceLinks.$inferInsert;

// ===== HORAS ACUMULADAS VIA GPS =====
// Registra as horas de ignição ligada por dia (calculado automaticamente via GPS)
export const gpsHoursLog = mysqlTable("gps_hours_log", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id),
  gpsDeviceLinkId: int("gps_device_link_id").references(() => gpsDeviceLinks.id),
  date: timestamp("date").notNull(), // dia do registro
  hoursWorked: varchar("hours_worked", { length: 20 }).notNull(), // horas com ignição ligada
  hourMeterStart: varchar("hour_meter_start", { length: 20 }), // horímetro início do dia
  hourMeterEnd: varchar("hour_meter_end", { length: 20 }),   // horímetro fim do dia
  distanceKm: varchar("distance_km", { length: 20 }),         // km rodados no dia
  source: mysqlEnum("source", ["gps_auto", "manual"]).default("gps_auto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type GpsHoursLog = typeof gpsHoursLog.$inferSelect;
export type InsertGpsHoursLog = typeof gpsHoursLog.$inferInsert;

// ===== PLANOS DE MANUTENÇÃO PREVENTIVA =====
// Define os intervalos de manutenção para cada equipamento
export const preventiveMaintenancePlans = mysqlTable("preventive_maintenance_plans", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // ex: "Troca de óleo", "Engraxamento"
  type: mysqlEnum("type", [
    "troca_oleo", "engraxamento", "filtro_ar", "filtro_combustivel",
    "correia", "revisao_geral", "abastecimento", "outros"
  ]).notNull().default("outros"),
  intervalHours: int("interval_hours").notNull(), // a cada X horas de uso
  lastDoneHours: varchar("last_done_hours", { length: 20 }).default("0"), // horímetro da última execução
  lastDoneAt: timestamp("last_done_at"), // data da última execução
  alertThresholdHours: int("alert_threshold_hours").default(10), // alertar X horas antes
  active: int("active").default(1).notNull(),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PreventiveMaintenancePlan = typeof preventiveMaintenancePlans.$inferSelect;
export type InsertPreventiveMaintenancePlan = typeof preventiveMaintenancePlans.$inferInsert;

// ===== ALERTAS DE MANUTENÇÃO PREVENTIVA =====
// Gerado automaticamente quando o equipamento atinge o limiar de horas
export const preventiveMaintenanceAlerts = mysqlTable("preventive_maintenance_alerts", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id),
  planId: int("plan_id").notNull().references(() => preventiveMaintenancePlans.id),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluido", "ignorado"]).default("pendente").notNull(),
  currentHours: varchar("current_hours", { length: 20 }).notNull(), // horímetro quando gerado
  dueHours: varchar("due_hours", { length: 20 }).notNull(), // horímetro alvo
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: int("resolved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PreventiveMaintenanceAlert = typeof preventiveMaintenanceAlerts.$inferSelect;
export type InsertPreventiveMaintenanceAlert = typeof preventiveMaintenanceAlerts.$inferInsert;

// ===== TEMPLATES DE MANUTENÇÃO =====
// Define quais peças são necessárias para cada tipo de manutenção
export const maintenanceTemplates = mysqlTable("maintenance_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ex: "Troca de Óleo Motor"
  type: mysqlEnum("type", ["preventiva", "corretiva", "revisao"]).notNull().default("preventiva"),
  description: text("description"),
  estimatedCost: varchar("estimated_cost", { length: 20 }),
  active: int("active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type MaintenanceTemplate = typeof maintenanceTemplates.$inferSelect;
export type InsertMaintenanceTemplate = typeof maintenanceTemplates.$inferInsert;

// ===== PEÇAS DO TEMPLATE =====
// Peças que compõem cada template de manutenção
export const maintenanceTemplateParts = mysqlTable("maintenance_template_parts", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull().references(() => maintenanceTemplates.id, { onDelete: "cascade" }),
  partId: int("part_id").references(() => parts.id, { onDelete: "set null" }),
  partCode: varchar("part_code", { length: 50 }), // cache do código
  partName: varchar("part_name", { length: 255 }).notNull(), // cache do nome
  quantity: int("quantity").notNull().default(1),
  unit: varchar("unit", { length: 20 }).default("un"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MaintenanceTemplatePart = typeof maintenanceTemplateParts.$inferSelect;
export type InsertMaintenanceTemplatePart = typeof maintenanceTemplateParts.$inferInsert;

// ===== PEÇAS USADAS EM MANUTENÇÃO =====
// Registra cada peça utilizada em uma manutenção executada
export const maintenanceParts = mysqlTable("maintenance_parts", {
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
  fromStock: int("from_stock").default(1), // 1 = baixou do estoque, 0 = compra avulsa
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MaintenancePart = typeof maintenanceParts.$inferSelect;
export type InsertMaintenancePart = typeof maintenanceParts.$inferInsert;

// ===== MOVIMENTAÇÃO DE ESTOQUE DE PEÇAS =====
export const partsStockMovements = mysqlTable("parts_stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  quantity: int("quantity").notNull(),
  reason: varchar("reason", { length: 255 }), // ex: "Compra", "Uso em manutenção #42"
  referenceId: int("reference_id"), // ID da manutenção ou pedido de compra
  referenceType: varchar("reference_type", { length: 50 }), // "maintenance" | "purchase_order"
  unitCost: varchar("unit_cost", { length: 20 }),
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PartsStockMovement = typeof partsStockMovements.$inferSelect;
export type InsertPartsStockMovement = typeof partsStockMovements.$inferInsert;

// ===== PERMISSÕES DE ACESSO POR MÓDULO =====
// Controla quais módulos cada usuário pode acessar no sistema
// modules é um JSON array com os slugs dos módulos permitidos
// Ex: ["equipamentos","pecas","manutencao","horas-maquina"]
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  // JSON array de módulos permitidos. null = admin (acesso total)
  modules: text("modules"), // JSON: string[]
  // Perfil pré-definido para referência (não restringe, apenas label)
  profile: varchar("profile", { length: 64 }).default("custom"),
  updatedBy: int("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

// ============================================================
// MÓDULO MOTOSSERRA
// ============================================================

// ===== CADASTRO DE MOTOSSERRAS =====
export const chainsaws = mysqlTable("chainsaws", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // ex: "Motosserra 1 - Stihl MS 250"
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  chainType: varchar("chain_type", { length: 20 }).default("30"), // "30" | "34" | outro
  status: mysqlEnum("status", ["ativa", "oficina", "inativa"]).default("ativa").notNull(),
  imageUrl: text("image_url"), // foto da motosserra
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Chainsaw = typeof chainsaws.$inferSelect;
export type InsertChainsaw = typeof chainsaws.$inferInsert;

// ===== GALÕES DE COMBUSTÍVEL =====
// Cada galão tem tipo (puro=gasolina, mistura=gasolina+2T) e volume atual
export const fuelContainers = mysqlTable("fuel_containers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // ex: "Galão Vermelho", "Galão Verde"
  color: varchar("color", { length: 30 }).default("vermelho"), // "vermelho" | "verde"
  type: mysqlEnum("type", ["puro", "mistura"]).notNull(), // puro=gasolina, mistura=gasolina+2T
  capacityLiters: varchar("capacity_liters", { length: 10 }).default("20"), // capacidade total
  currentVolumeLiters: varchar("current_volume_liters", { length: 10 }).default("0"), // volume atual
  isActive: int("is_active").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type FuelContainer = typeof fuelContainers.$inferSelect;
export type InsertFuelContainer = typeof fuelContainers.$inferInsert;

// ===== EVENTOS DE ABASTECIMENTO DE GALÕES =====
// Registra quando um galão é abastecido (reabastecimento) ou usado (baixa)
export const fuelContainerEvents = mysqlTable("fuel_container_events", {
  id: int("id").autoincrement().primaryKey(),
  containerId: int("container_id").notNull().references(() => fuelContainers.id, { onDelete: "cascade" }),
  eventType: mysqlEnum("event_type", ["abastecimento", "uso", "transferencia"]).notNull(),
  // abastecimento = galão foi reabastecido (compra)
  // uso = galão foi usado para abastecer motosserra no campo
  // transferencia = galão vermelho → galão verde
  volumeLiters: varchar("volume_liters", { length: 10 }).notNull(), // litros movimentados
  costPerLiter: varchar("cost_per_liter", { length: 20 }), // custo por litro (para financeiro)
  totalCost: varchar("total_cost", { length: 20 }), // custo total
  oil2tMl: varchar("oil2t_ml", { length: 10 }), // ml de óleo 2T usados (só para mistura)
  sourceContainerId: int("source_container_id").references(() => fuelContainers.id), // para transferência
  chainsawId: int("chainsaw_id").references(() => chainsaws.id), // motosserra abastecida (para uso)
  registeredBy: int("registered_by").references(() => users.id),
  notes: text("notes"),
  eventDate: timestamp("event_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type FuelContainerEvent = typeof fuelContainerEvents.$inferSelect;
export type InsertFuelContainerEvent = typeof fuelContainerEvents.$inferInsert;

// ===== ESTOQUE DE CORRENTES =====
// Saldo de correntes por tipo (30 ou 34 dentes)
export const chainsawChainStock = mysqlTable("chainsaw_chain_stock", {
  id: int("id").autoincrement().primaryKey(),
  chainType: varchar("chain_type", { length: 20 }).notNull(), // "30", "34", ou outro
  sharpenedInBox: int("sharpened_in_box").default(0).notNull(),   // afiadas na caixa (prontas)
  inField: int("in_field").default(0).notNull(),                   // em campo
  inWorkshop: int("in_workshop").default(0).notNull(),             // na oficina (para afiar)
  totalStock: int("total_stock").default(0).notNull(),             // total em estoque (compradas)
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ChainsawChainStock = typeof chainsawChainStock.$inferSelect;
export type InsertChainsawChainStock = typeof chainsawChainStock.$inferInsert;

// ===== MOVIMENTAÇÕES DE CORRENTES =====
// Histórico de cada movimentação (campo, oficina, afiação, baixa)
export const chainsawChainEvents = mysqlTable("chainsaw_chain_events", {
  id: int("id").autoincrement().primaryKey(),
  chainType: varchar("chain_type", { length: 20 }).notNull(),
  eventType: mysqlEnum("event_type", [
    "envio_campo",       // caixa → campo
    "retorno_oficina",   // campo → oficina (para afiar)
    "afiacao_concluida", // oficina → caixa (afiadas)
    "baixa_estoque",     // descarte ou substituição definitiva
    "entrada_estoque",   // compra de novas correntes
  ]).notNull(),
  quantity: int("quantity").notNull(),
  chainsawId: int("chainsaw_id").references(() => chainsaws.id),
  registeredBy: int("registered_by").references(() => users.id),
  notes: text("notes"), // observações para o mecânico
  eventDate: timestamp("event_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChainsawChainEvent = typeof chainsawChainEvents.$inferSelect;
export type InsertChainsawChainEvent = typeof chainsawChainEvents.$inferInsert;

// ===== PEÇAS E CONSUMÍVEIS DO SETOR MOTOSSERRA =====
// Catálogo de peças específicas para motosserras
export const chainsawParts = mysqlTable("chainsaw_parts", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // ex: "Filtro", "Corrente", "Sabre", "Óleo"
  unit: varchar("unit", { length: 20 }).default("un"), // un, L, ml, m
  currentStock: varchar("current_stock", { length: 20 }).default("0"),
  minStock: varchar("min_stock", { length: 20 }).default("0"), // estoque mínimo para alerta
  unitCost: varchar("unit_cost", { length: 20 }),
  imageUrl: text("image_url"), // foto da peça
  notes: text("notes"),
  isActive: int("is_active").default(1),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChainsawPart = typeof chainsawParts.$inferSelect;
export type InsertChainsawPart = typeof chainsawParts.$inferInsert;

// ===== MOVIMENTAÇÕES DE ESTOQUE DE PEÇAS MOTOSSERRA =====
export const chainsawPartMovements = mysqlTable("chainsaw_part_movements", {
  id: int("id").autoincrement().primaryKey(),
  partId: int("part_id").notNull().references(() => chainsawParts.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  quantity: varchar("quantity", { length: 20 }).notNull(),
  reason: varchar("reason", { length: 255 }), // ex: "Compra", "Uso em OS #12"
  serviceOrderId: int("service_order_id"), // referência à OS
  unitCost: varchar("unit_cost", { length: 20 }),
  registeredBy: int("registered_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChainsawPartMovement = typeof chainsawPartMovements.$inferSelect;
export type InsertChainsawPartMovement = typeof chainsawPartMovements.$inferInsert;

// ===== ORDENS DE SERVIÇO (OS) PARA MOTOSSERRAS =====
export const chainsawServiceOrders = mysqlTable("chainsaw_service_orders", {
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
    "outro",
  ]).notNull(),
  problemDescription: text("problem_description"),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  status: mysqlEnum("status", ["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta").notNull(),
  // Execução pelo mecânico
  mechanicId: int("mechanic_id").references(() => users.id),
  serviceDescription: text("service_description"), // o que foi feito
  completedAt: timestamp("completed_at"),
  // Imagem do problema (foto tirada no campo)
  imageUrl: text("image_url"),
  // Metadados
  openedBy: int("opened_by").references(() => users.id),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChainsawServiceOrder = typeof chainsawServiceOrders.$inferSelect;
export type InsertChainsawServiceOrder = typeof chainsawServiceOrders.$inferInsert;

// ===== PEÇAS USADAS EM OS DE MOTOSSERRA =====
export const chainsawServiceParts = mysqlTable("chainsaw_service_parts", {
  id: int("id").autoincrement().primaryKey(),
  serviceOrderId: int("service_order_id").notNull().references(() => chainsawServiceOrders.id, { onDelete: "cascade" }),
  partId: int("part_id").references(() => chainsawParts.id, { onDelete: "set null" }),
  partName: varchar("part_name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 20 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("un"),
  unitCost: varchar("unit_cost", { length: 20 }),
  fromStock: int("from_stock").default(1), // 1 = baixou do estoque, 0 = compra avulsa
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChainsawServicePart = typeof chainsawServiceParts.$inferSelect;
export type InsertChainsawServicePart = typeof chainsawServiceParts.$inferInsert;

// ===== GASTOS EXTRAS =====
export const extraExpenses = mysqlTable("extra_expenses", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  category: mysqlEnum("category", ["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: varchar("amount", { length: 20 }).notNull(), // valor em reais
  paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro").notNull(),
  receiptImageUrl: text("receipt_image_url"), // foto da nota fiscal
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  registeredByName: varchar("registered_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ExtraExpense = typeof extraExpenses.$inferSelect;
export type InsertExtraExpense = typeof extraExpenses.$inferInsert;

// ===== MÓDULO FINANCEIRO =====
export const financialEntries = mysqlTable("financial_entries", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["receita", "despesa"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  // Categorias de receita: venda_madeira, servico_corte, servico_plantio, servico_transporte, outro_receita
  // Categorias de despesa: folha_pagamento, combustivel, manutencao, material, alimentacao, transporte, impostos, aluguel, outro_despesa
  description: varchar("description", { length: 500 }).notNull(),
  amount: varchar("amount", { length: 20 }).notNull(), // valor em reais
  date: timestamp("date").notNull(),
  referenceMonth: varchar("reference_month", { length: 7 }), // ex: "2026-04" para agrupamento
  paymentMethod: mysqlEnum("payment_method", ["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).default("pix").notNull(),
  status: mysqlEnum("status", ["pendente", "confirmado", "cancelado"]).default("confirmado").notNull(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 255 }),
  receiptImageUrl: text("receipt_image_url"),
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  registeredByName: varchar("registered_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = typeof financialEntries.$inferInsert;
