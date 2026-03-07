import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
  date: timestamp("date").notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  location: varchar("location", { length: 255 }), // Nome do local (fazenda, talhao)
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  photoUrl: text("photo_url"), // Foto tirada no momento da presença
  confidence: varchar("confidence", { length: 10 }), // % de confiança do reconhecimento
  registeredBy: int("registered_by").notNull().references(() => users.id),
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
  imageUrl: text("image_url"),
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
  active: int("active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdBy: int("created_by").references(() => users.id),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

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