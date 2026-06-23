import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, bigint, timestamp, mysqlEnum, varchar, text, index, tinyint, datetime } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const attendanceRecords = mysqlTable("attendance_records", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	date: timestamp({ mode: 'string' }).notNull(),
	employmentType: mysqlEnum("employment_type", ['clt','terceirizado','diarista']).notNull(),
	dailyValue: varchar("daily_value", { length: 20 }).notNull(),
	pixKey: varchar("pix_key", { length: 255 }).notNull(),
	function: varchar({ length: 100 }).notNull(),
	observations: text(),
	paymentStatus: mysqlEnum("payment_status", ['pendente','pago','atrasado','cancelado']).default('pendente').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	paidBy: int("paid_by").references(() => users.id),
	registeredBy: int("registered_by").notNull().references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const biometricAttendance = mysqlTable("biometric_attendance", {
	id: int().autoincrement().notNull(),
	collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
	date: timestamp({ mode: 'string' }).notNull(),
	checkInTime: timestamp("check_in_time", { mode: 'string' }).notNull(),
	checkOutTime: timestamp("check_out_time", { mode: 'string' }),
	location: varchar({ length: 255 }),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 20 }),
	photoUrl: text("photo_url"),
	confidence: varchar({ length: 10 }),
	registeredBy: int("registered_by").notNull().references(() => users.id),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const cargoDestinations = mysqlTable("cargo_destinations", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: varchar({ length: 500 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 2 }),
	notes: text(),
	active: int().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	unit: varchar({ length: 20 }).default("ton"),
});

export const cargoLoads = mysqlTable("cargo_loads", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
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
	status: mysqlEnum(['pendente','entregue','cancelado']).default('pendente').notNull(),
	registeredBy: int("registered_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	weightKg: varchar("weight_kg", { length: 20 }),
	destinationId: int("destination_id"),
	trackingStatus: mysqlEnum("tracking_status", ['aguardando','carregando','em_transito','pesagem_saida','descarregando','pesagem_chegada','finalizado']).default('aguardando'),
	trackingUpdatedAt: timestamp("tracking_updated_at", { mode: 'string' }),
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
		boletoDueDate: timestamp("boleto_due_date", { mode: 'string' }),
		paymentReceiptUrl: text("payment_receipt_url"),
			paymentStatus: mysqlEnum("payment_status", ['sem_boleto','a_pagar','pago']).default('sem_boleto'),
			paidAt: timestamp("paid_at", { mode: 'string' }),
			humidity: varchar({ length: 20 }),
		deliveryDate: timestamp("delivery_date", { mode: 'string' }),
		receivedByBuyer: int("received_by_buyer").default(0).notNull(),
		receivedAt: timestamp("received_at", { mode: 'string' }),
		receiverName: varchar("receiver_name", { length: 255 }),
		thirdPartyContractor: varchar("third_party_contractor", { length: 255 }),
		thirdPartyCost: varchar("third_party_cost", { length: 20 }),
		thirdPartyPaid: tinyint("third_party_paid").default(0),
		thirdPartyPaidAt: datetime("third_party_paid_at"),
		thirdPartyPaymentNotes: text("third_party_payment_notes"),
		invoiceChecked: int("invoice_checked").default(0).notNull(),
		invoiceCheckedAt: bigint("invoice_checked_at", { mode: 'number' }).notNull().default(0),
		invoiceCheckedBy: int("invoice_checked_by"),
		invoiceCheckedByName: varchar("invoice_checked_by_name", { length: 255 }),
	});

export const cargoShipments = mysqlTable("cargo_shipments", {
	id: int().autoincrement().notNull(),
	truckId: int("truck_id").notNull().references(() => equipment.id),
	driverId: int("driver_id").notNull().references(() => users.id),
	date: timestamp({ mode: 'string' }).notNull(),
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
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const chainsawChainEvents = mysqlTable("chainsaw_chain_events", {
	id: int().autoincrement().notNull(),
	chainType: varchar("chain_type", { length: 20 }).notNull(),
	eventType: mysqlEnum("event_type", ['envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque']).notNull(),
	quantity: int().notNull(),
	chainsawId: int("chainsaw_id"),
	registeredBy: int("registered_by"),
	notes: text(),
	eventDate: timestamp("event_date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const chainsawChainStock = mysqlTable("chainsaw_chain_stock", {
	id: int().autoincrement().notNull(),
	chainType: varchar("chain_type", { length: 20 }).notNull(),
	sharpenedInBox: int("sharpened_in_box").default(0).notNull(),
	inField: int("in_field").default(0).notNull(),
	inWorkshop: int("in_workshop").default(0).notNull(),
	totalStock: int("total_stock").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const chainsawPartMovements = mysqlTable("chainsaw_part_movements", {
	id: int().autoincrement().notNull(),
	partId: int("part_id").notNull(),
	type: mysqlEnum(['entrada','saida']).notNull(),
	quantity: varchar({ length: 20 }).notNull(),
	reason: varchar({ length: 255 }),
	serviceOrderId: int("service_order_id"),
	unitCost: varchar("unit_cost", { length: 20 }),
	registeredBy: int("registered_by"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const chainsawParts = mysqlTable("chainsaw_parts", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 20 }).default('un'),
	currentStock: varchar("current_stock", { length: 20 }).default('0'),
	minStock: varchar("min_stock", { length: 20 }).default('0'),
	unitCost: varchar("unit_cost", { length: 20 }),
	notes: text(),
	isActive: int("is_active").default(1),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	imageUrl: text("image_url"),
});

export const chainsawServiceOrders = mysqlTable("chainsaw_service_orders", {
	id: int().autoincrement().notNull(),
	chainsawId: int("chainsaw_id").notNull(),
	problemType: mysqlEnum("problem_type", ['motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro']).notNull(),
	problemDescription: text("problem_description"),
	priority: mysqlEnum(['baixa','media','alta','urgente']).default('media').notNull(),
	status: mysqlEnum(['aberta','em_andamento','concluida','cancelada']).default('aberta').notNull(),
	mechanicId: int("mechanic_id"),
	serviceDescription: text("service_description"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	openedBy: int("opened_by"),
	openedAt: timestamp("opened_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	imageUrl: text("image_url"),
});

export const chainsawServiceParts = mysqlTable("chainsaw_service_parts", {
	id: int().autoincrement().notNull(),
	serviceOrderId: int("service_order_id").notNull(),
	partId: int("part_id"),
	partName: varchar("part_name", { length: 255 }).notNull(),
	quantity: varchar({ length: 20 }).notNull(),
	unit: varchar({ length: 20 }).default('un'),
	unitCost: varchar("unit_cost", { length: 20 }),
	fromStock: int("from_stock").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const chainsaws = mysqlTable("chainsaws", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	brand: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	serialNumber: varchar("serial_number", { length: 100 }),
	chainType: varchar("chain_type", { length: 20 }).default('30'),
	status: mysqlEnum(['ativa','oficina','inativa']).default('ativa').notNull(),
	notes: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	imageUrl: text("image_url"),
});

export const clientContracts = mysqlTable("client_contracts", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id),
	description: varchar({ length: 500 }).notNull(),
	billingType: mysqlEnum("billing_type", ['peso_kg','metro_m3','fixo']).default('metro_m3').notNull(),
	unitPrice: varchar("unit_price", { length: 20 }),
	estimatedVolume: varchar("estimated_volume", { length: 20 }),
	totalAmount: varchar("total_amount", { length: 20 }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: mysqlEnum(['ativo','pago','atrasado','cancelado']).default('ativo').notNull(),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const clientPaymentReceipts = mysqlTable("client_payment_receipts", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id),
	contractId: int("contract_id").references(() => clientContracts.id),
	paymentDate: timestamp("payment_date", { mode: 'string' }).notNull(),
	amount: varchar({ length: 20 }).notNull(),
	paymentMethod: mysqlEnum("payment_method", ['pix','transferencia','dinheiro','cheque','outros']).default('pix').notNull(),
	receiptUrl: varchar("receipt_url", { length: 1000 }),
	referenceMonth: varchar("reference_month", { length: 7 }),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const clientPayments = mysqlTable("client_payments", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id),
	referenceDate: timestamp("reference_date", { mode: 'string' }).notNull(),
	description: varchar({ length: 500 }),
	volumeM3: varchar("volume_m3", { length: 20 }),
	pricePerM3: varchar("price_per_m3", { length: 20 }),
	grossAmount: varchar("gross_amount", { length: 20 }).notNull(),
	deductions: varchar({ length: 20 }).default('0'),
	netAmount: varchar("net_amount", { length: 20 }).notNull(),
	status: mysqlEnum(['pendente','pago','atrasado','cancelado']).default('pendente').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	pixKey: varchar("pix_key", { length: 255 }),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const clientPortalAccess = mysqlTable("client_portal_access", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" } ),
	accessCode: varchar("access_code", { length: 64 }).notNull(),
	active: int().default(1).notNull(),
	lastAccessAt: timestamp("last_access_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by").references(() => users.id),
},
(table) => [
	index("client_portal_access_access_code_unique").on(table.accessCode),
]);

export const clients = mysqlTable("clients", {
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
	billingCycle: mysqlEnum("billing_cycle", ['semanal','quinzenal','mensal']).default('mensal'),
	billingDayOfWeek: int("billing_day_of_week").default(5),
	paymentTermDays: int("payment_term_days").default(30),
	documentsJson: text("documents_json"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by").references(() => users.id),
});

export const collaboratorAttendance = mysqlTable("collaborator_attendance", {
	id: int().autoincrement().notNull(),
	collaboratorId: int("collaborator_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	employmentTypeCa: mysqlEnum("employment_type_ca", ['clt','terceirizado','diarista']).default('diarista').notNull(),
	dailyValue: varchar("daily_value", { length: 20 }).default('0').notNull(),
	pixKey: varchar("pix_key", { length: 255 }),
	activity: varchar({ length: 255 }),
	observations: text(),
	paymentStatusCa: mysqlEnum("payment_status_ca", ['pendente','pago']).default('pendente').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	registeredBy: int("registered_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 20 }),
	locationName: varchar("location_name", { length: 255 }),
	workLocationId: int("work_location_id"),
});

export const collaboratorDocuments = mysqlTable("collaborator_documents", {
	id: int().autoincrement().notNull(),
	collaboratorId: int("collaborator_id").notNull().references(() => collaborators.id),
	type: mysqlEnum(['cnh','certificado','aso','contrato','rg','cpf','outros']).default('outros').notNull(),
	title: varchar({ length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 1000 }).notNull(),
	fileType: varchar("file_type", { length: 50 }),
	issueDate: timestamp("issue_date", { mode: 'string' }),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	notes: text(),
	uploadedBy: int("uploaded_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const collaborators = mysqlTable("collaborators", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" } ),
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
	role: mysqlEnum(['administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado']).default('operador').notNull(),
	pixKey: varchar("pix_key", { length: 255 }),
	dailyRate: varchar("daily_rate", { length: 20 }),
	employmentType: mysqlEnum("employment_type", ['clt','terceirizado','diarista']).default('diarista'),
	shirtSize: mysqlEnum("shirt_size", ['PP','P','M','G','GG','XGG']),
	pantsSize: varchar("pants_size", { length: 10 }),
	shoeSize: varchar("shoe_size", { length: 5 }),
	bootSize: varchar("boot_size", { length: 5 }),
	active: int().default(1).notNull(),
	clientId: int("client_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by").references(() => users.id),
});

export const equipment = mysqlTable("equipment", {
	id: int().autoincrement().notNull(),
	typeId: int("type_id").notNull().references(() => equipmentTypes.id),
	name: varchar({ length: 255 }).notNull(),
	brand: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	year: int(),
	serialNumber: varchar("serial_number", { length: 100 }),
	licensePlate: varchar("license_plate", { length: 20 }),
	imageUrl: text("image_url"),
	status: mysqlEnum(['ativo','manutencao','inativo']).default('ativo').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	sectorId: int("sector_id"),
	clientId: int("client_id"),
	defaultHeightM: varchar("default_height_m", { length: 20 }),
	defaultWidthM: varchar("default_width_m", { length: 20 }),
	defaultLengthM: varchar("default_length_m", { length: 20 }),
	category: mysqlEnum(['maquina','veiculo','caminhao']).default('maquina'),
	accumulatedHours: varchar("accumulated_hours", { length: 20 }).default('0'),
	accumulatedKm: varchar("accumulated_km", { length: 20 }).default('0'),
	isThirdParty: tinyint("is_third_party").default(0).notNull(),
	thirdPartyOwner: varchar("third_party_owner", { length: 255 }),
});

export const equipmentMaintenance = mysqlTable("equipment_maintenance", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	type: mysqlEnum(['manutencao','limpeza','afiacao','revisao','troca_oleo','outros']).default('manutencao').notNull(),
	description: text().notNull(),
	performedBy: varchar("performed_by", { length: 255 }),
	cost: varchar({ length: 20 }),
	nextMaintenanceDate: timestamp("next_maintenance_date", { mode: 'string' }),
	photosJson: text("photos_json"),
	registeredBy: int("registered_by").references(() => users.id),
	performedAt: timestamp("performed_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const equipmentPhotos = mysqlTable("equipment_photos", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	photoUrl: varchar("photo_url", { length: 1000 }).notNull(),
	caption: varchar({ length: 255 }),
	uploadedBy: int("uploaded_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const equipmentTypes = mysqlTable("equipment_types", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const extraExpenses = mysqlTable("extra_expenses", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	category: mysqlEnum(['abastecimento','refeicao','compra_material','servico_terceiro','pedagio','outro']).notNull(),
	description: varchar({ length: 500 }).notNull(),
	amount: varchar({ length: 20 }).notNull(),
	paymentMethod: mysqlEnum("payment_method", ['dinheiro','pix','cartao','transferencia']).default('dinheiro').notNull(),
	receiptImageUrl: text("receipt_image_url"),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	registeredByName: varchar("registered_by_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	workLocationId: int("work_location_id"),
	clientId: int("client_id"),
	equipmentId: int("equipment_id"),
});

export const financialEntries = mysqlTable("financial_entries", {
	id: int().autoincrement().notNull(),
	type: mysqlEnum(['receita','despesa']).notNull(),
	category: varchar({ length: 100 }).notNull(),
	description: varchar({ length: 500 }).notNull(),
	amount: varchar({ length: 20 }).notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	referenceMonth: varchar("reference_month", { length: 7 }),
	paymentMethod: mysqlEnum("payment_method", ['dinheiro','pix','cartao','transferencia','boleto','cheque']).default('pix').notNull(),
	status: mysqlEnum(['pendente','confirmado','cancelado']).default('confirmado').notNull(),
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
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const fuelContainerEvents = mysqlTable("fuel_container_events", {
	id: int().autoincrement().notNull(),
	containerId: int("container_id").notNull(),
	eventType: mysqlEnum("event_type", ['abastecimento','uso','transferencia']).notNull(),
	volumeLiters: varchar("volume_liters", { length: 10 }).notNull(),
	costPerLiter: varchar("cost_per_liter", { length: 20 }),
	totalCost: varchar("total_cost", { length: 20 }),
	oil2TMl: varchar("oil2t_ml", { length: 10 }),
	sourceContainerId: int("source_container_id"),
	chainsawId: int("chainsaw_id"),
	registeredBy: int("registered_by"),
	notes: text(),
	workLocationId: int("work_location_id"),
	eventDate: timestamp("event_date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const fuelContainers = mysqlTable("fuel_containers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	color: varchar({ length: 30 }).default('vermelho'),
	type: mysqlEnum(['puro','mistura']).notNull(),
	capacityLiters: varchar("capacity_liters", { length: 10 }).default('20'),
	currentVolumeLiters: varchar("current_volume_liters", { length: 10 }).default('0'),
	isActive: int("is_active").default(1),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const fuelRecords = mysqlTable("fuel_records", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	operatorId: int("operator_id").notNull().references(() => users.id),
	date: timestamp({ mode: 'string' }).notNull(),
	fuelType: mysqlEnum("fuel_type", ['diesel','gasolina','mistura_2t']).notNull(),
	liters: varchar({ length: 20 }).notNull(),
	totalValue: varchar("total_value", { length: 20 }).notNull(),
	pricePerLiter: varchar("price_per_liter", { length: 20 }),
	odometer: varchar({ length: 20 }),
	station: varchar({ length: 255 }),
	invoiceUrl: text("invoice_url"),
	odometerImageUrl: text("odometer_image_url"),
	registeredBy: int("registered_by").notNull().references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	workLocationId: int("work_location_id"),
});

export const gpsDeviceLinks = mysqlTable("gps_device_links", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	traccarDeviceId: int("traccar_device_id").notNull(),
	traccarDeviceName: varchar("traccar_device_name", { length: 255 }),
	traccarUniqueId: varchar("traccar_unique_id", { length: 100 }),
	active: int().default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const gpsHoursLog = mysqlTable("gps_hours_log", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	gpsDeviceLinkId: int("gps_device_link_id"),
	date: timestamp({ mode: 'string' }).notNull(),
	hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
	hourMeterStart: varchar("hour_meter_start", { length: 20 }),
	hourMeterEnd: varchar("hour_meter_end", { length: 20 }),
	distanceKm: varchar("distance_km", { length: 20 }),
	source: mysqlEnum(['gps_auto','manual']).default('gps_auto').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const gpsLocations = mysqlTable("gps_locations", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	latitude: varchar({ length: 30 }).notNull(),
	longitude: varchar({ length: 30 }).notNull(),
	radiusMeters: int("radius_meters").default(2000).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	clientId: int("client_id"),
	notes: text(),
	createdBy: int("created_by"),
	createdByName: varchar("created_by_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineFuel = mysqlTable("machine_fuel", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	date: timestamp({ mode: 'string' }).notNull(),
	hourMeter: varchar("hour_meter", { length: 20 }),
	fuelType: mysqlEnum("fuel_type", ['diesel','gasolina','mistura_2t','arla']).notNull(),
	liters: varchar({ length: 20 }).notNull(),
	pricePerLiter: varchar("price_per_liter", { length: 20 }),
	totalValue: varchar("total_value", { length: 20 }),
	supplier: varchar({ length: 255 }),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	workLocationId: int("work_location_id"),
});

export const machineHours = mysqlTable("machine_hours", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	operatorCollaboratorId: int("operator_collaborator_id").references(() => collaborators.id),
	date: timestamp({ mode: 'string' }).notNull(),
	startHourMeter: varchar("start_hour_meter", { length: 20 }).notNull(),
	endHourMeter: varchar("end_hour_meter", { length: 20 }).notNull(),
	hoursWorked: varchar("hours_worked", { length: 20 }).notNull(),
	activity: varchar({ length: 255 }),
	location: varchar({ length: 255 }),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	workLocationId: int("work_location_id"),
	source: mysqlEnum(['manual','gps']).default('manual').notNull(),
});

export const equipmentOilRecords = mysqlTable("equipment_oil_records", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	date: timestamp({ mode: 'string' }).notNull(),
	hourMeter: varchar("hour_meter", { length: 20 }),
	oilType: mysqlEnum("oil_type", ['hidraulico','motor','transmissao','diferencial','outros']).notNull(),
	quantityLiters: varchar("quantity_liters", { length: 20 }).notNull(),
	brand: varchar({ length: 100 }),
	supplier: varchar({ length: 255 }),
	pricePerLiter: varchar("price_per_liter", { length: 20 }),
	totalValue: varchar("total_value", { length: 20 }),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineMaintenance = mysqlTable("machine_maintenance", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	date: timestamp({ mode: 'string' }).notNull(),
	hourMeter: varchar("hour_meter", { length: 20 }),
	type: mysqlEnum(['preventiva','corretiva','revisao']).default('corretiva').notNull(),
	serviceType: mysqlEnum("service_type", ['proprio','terceirizado']).default('proprio').notNull(),
	mechanicCollaboratorId: int("mechanic_collaborator_id").references(() => collaborators.id),
	mechanicName: varchar("mechanic_name", { length: 255 }),
	thirdPartyCompany: varchar("third_party_company", { length: 255 }),
	partsReplaced: text("parts_replaced"),
	laborCost: varchar("labor_cost", { length: 20 }),
	totalCost: varchar("total_cost", { length: 20 }),
	description: text(),
	nextMaintenanceHours: varchar("next_maintenance_hours", { length: 20 }),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const maintenanceParts = mysqlTable("maintenance_parts", {
	id: int().autoincrement().notNull(),
	maintenanceId: int("maintenance_id").notNull().references(() => equipmentMaintenance.id, { onDelete: "cascade" } ),
	partId: int("part_id").references(() => parts.id, { onDelete: "set null" } ),
	partCode: varchar("part_code", { length: 50 }),
	partName: varchar("part_name", { length: 255 }).notNull(),
	partPhotoUrl: text("part_photo_url"),
	quantity: int().default(1).notNull(),
	unit: varchar({ length: 20 }).default('un'),
	unitCost: varchar("unit_cost", { length: 20 }),
	totalCost: varchar("total_cost", { length: 20 }),
	fromStock: int("from_stock").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const maintenanceTemplateParts = mysqlTable("maintenance_template_parts", {
	id: int().autoincrement().notNull(),
	templateId: int("template_id").notNull().references(() => maintenanceTemplates.id, { onDelete: "cascade" } ),
	partId: int("part_id").references(() => parts.id, { onDelete: "set null" } ),
	partCode: varchar("part_code", { length: 50 }),
	partName: varchar("part_name", { length: 255 }).notNull(),
	quantity: int().default(1).notNull(),
	unit: varchar({ length: 20 }).default('un'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const maintenanceTemplates = mysqlTable("maintenance_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['preventiva','corretiva','revisao']).default('preventiva').notNull(),
	description: text(),
	estimatedCost: varchar("estimated_cost", { length: 20 }),
	active: int().default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const parts = mysqlTable("parts", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 20 }).default('un'),
	stockQuantity: int("stock_quantity").default(0).notNull(),
	minStock: int("min_stock").default(0),
	unitCost: varchar("unit_cost", { length: 20 }),
	supplier: varchar({ length: 255 }),
	photoUrl: text("photo_url"),
	notes: text(),
	active: int().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by").references(() => users.id),
	photosJson: text("photos_json"),
});

export const partsRequests = mysqlTable("parts_requests", {
	id: int().autoincrement().notNull(),
	partId: int("part_id").references(() => parts.id),
	partName: varchar("part_name", { length: 255 }).notNull(),
	quantity: int().notNull(),
	urgency: mysqlEnum(['baixa','media','alta']).default('media').notNull(),
	equipmentId: int("equipment_id").references(() => equipment.id),
	equipmentName: varchar("equipment_name", { length: 255 }),
	reason: text(),
	status: mysqlEnum(['pendente','aprovado','rejeitado','comprado','entregue']).default('pendente').notNull(),
	approvedBy: int("approved_by").references(() => users.id),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	estimatedCost: varchar("estimated_cost", { length: 20 }),
	requestedBy: int("requested_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partsStockMovements = mysqlTable("parts_stock_movements", {
	id: int().autoincrement().notNull(),
	partId: int("part_id").notNull().references(() => parts.id, { onDelete: "cascade" } ),
	type: mysqlEnum(['entrada','saida']).notNull(),
	quantity: int().notNull(),
	reason: varchar({ length: 255 }),
	referenceId: int("reference_id"),
	referenceType: varchar("reference_type", { length: 50 }),
	unitCost: varchar("unit_cost", { length: 20 }),
	notes: text(),
	registeredBy: int("registered_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: varchar({ length: 128 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("password_reset_tokens_token_unique").on(table.token),
]);

export const preventiveMaintenanceAlerts = mysqlTable("preventive_maintenance_alerts", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	planId: int("plan_id").notNull(),
	status: mysqlEnum(['pendente','em_andamento','concluido','ignorado']).default('pendente').notNull(),
	currentHours: varchar("current_hours", { length: 20 }).notNull(),
	dueHours: varchar("due_hours", { length: 20 }).notNull(),
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const preventiveMaintenancePlans = mysqlTable("preventive_maintenance_plans", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros']).default('outros').notNull(),
	intervalHours: int("interval_hours").notNull(),
	lastDoneHours: varchar("last_done_hours", { length: 20 }).default('0'),
	lastDoneAt: timestamp("last_done_at", { mode: 'string' }),
	alertThresholdHours: int("alert_threshold_hours").default(10),
	active: int().default(1).notNull(),
	notes: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
	id: int().autoincrement().notNull(),
	orderId: int("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" } ),
	partId: int("part_id"),
	partName: varchar("part_name", { length: 255 }).notNull(),
	partCode: varchar("part_code", { length: 50 }),
	partCategory: varchar("part_category", { length: 100 }),
	supplier: varchar({ length: 255 }),
	unit: varchar({ length: 20 }).default('un'),
	quantity: int().notNull(),
	unitCost: varchar("unit_cost", { length: 20 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['rascunho','enviado','aprovado','rejeitado','comprado']).default('rascunho').notNull(),
	notes: text(),
	createdBy: int("created_by"),
	approvedBy: int("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const replantingRecords = mysqlTable("replanting_records", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id),
	date: timestamp({ mode: 'string' }).notNull(),
	area: varchar({ length: 100 }),
	species: varchar({ length: 100 }).default('Eucalipto'),
	quantity: int(),
	areaHectares: varchar("area_hectares", { length: 20 }),
	notes: text(),
	photosJson: text("photos_json"),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const rolePermissions = mysqlTable("role_permissions", {
	id: int().autoincrement().notNull(),
	roleName: varchar("role_name", { length: 50 }).notNull(),
	module: varchar({ length: 50 }).notNull(),
	canView: int("can_view").default(0).notNull(),
	canCreate: int("can_create").default(0).notNull(),
	canEdit: int("can_edit").default(0).notNull(),
	canDelete: int("can_delete").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int("updated_by").references(() => users.id),
});

export const sectors = mysqlTable("sectors", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#16a34a'),
	active: int().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int("created_by").references(() => users.id),
});

export const userPermissions = mysqlTable("user_permissions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	modules: text(),
	profile: varchar({ length: 64 }).default('custom'),
	allowedClientIds: text("allowed_client_ids"),
	allowedWorkLocationIds: text("allowed_work_location_ids"),
	updatedBy: int("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_id").on(table.userId),
]);

export const userProfiles = mysqlTable("user_profiles", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	profileType: mysqlEnum("profile_type", ['administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado']).notNull(),
	cpf: varchar({ length: 14 }),
	phone: varchar({ length: 20 }),
	pixKey: varchar("pix_key", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }),
	name: text().notNull(),
	email: varchar({ length: 320 }).notNull(),
	loginMethod: varchar({ length: 64 }).default('email').notNull(),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	passwordHash: varchar("password_hash", { length: 255 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_email_unique").on(table.email),
]);

export const vehicleRecords = mysqlTable("vehicle_records", {
	id: int().autoincrement().notNull(),
	equipmentId: int("equipment_id").notNull().references(() => equipment.id),
	date: timestamp({ mode: 'string' }).notNull(),
	recordType: mysqlEnum("record_type", ['abastecimento','manutencao','km']).notNull(),
	fuelType: mysqlEnum("fuel_type", ['diesel','gasolina','etanol','gnv']),
	liters: varchar({ length: 20 }),
	fuelCost: varchar("fuel_cost", { length: 20 }),
	pricePerLiter: varchar("price_per_liter", { length: 20 }),
	supplier: varchar({ length: 255 }),
	odometer: varchar({ length: 20 }),
	kmDriven: varchar("km_driven", { length: 20 }),
	maintenanceType: varchar("maintenance_type", { length: 255 }),
	maintenanceCost: varchar("maintenance_cost", { length: 20 }),
	serviceType: mysqlEnum("service_type", ['proprio','terceirizado']),
	mechanicName: varchar("mechanic_name", { length: 255 }),
	driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
	notes: text(),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	maintenanceLocation: varchar("maintenance_location", { length: 255 }),
	photosJson: text("photos_json"),
	photoUrl: text("photo_url"),
	workLocationId: int("work_location_id"),
	fuelInvoiceId: int("fuel_invoice_id"),
});


// ===== FOTOS DE TRACKING DE CARGAS =====
export const cargoTrackingPhotos = mysqlTable("cargo_tracking_photos", {
  id: int("id").autoincrement().primaryKey(),
  cargoId: int("cargo_id").notNull().references(() => cargoLoads.id, { onDelete: "cascade" }),
  stage: varchar("stage", { length: 50 }).notNull(),
  photoUrl: text("photo_url").notNull(),
  notes: text("notes"),
  registeredBy: int("registered_by").references(() => users.id),
  registeredByName: varchar("registered_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type CargoLoad = typeof cargoLoads.$inferSelect;
export type InsertCargoLoad = typeof cargoLoads.$inferInsert;
export type CargoDestination = typeof cargoDestinations.$inferSelect;
export type InsertCargoDestination = typeof cargoDestinations.$inferInsert;
export type CargoTrackingPhoto = typeof cargoTrackingPhotos.$inferSelect;
export type InsertCargoTrackingPhoto = typeof cargoTrackingPhotos.$inferInsert;
export type ReplantingRecord = typeof replantingRecords.$inferSelect;
export type InsertReplantingRecord = typeof replantingRecords.$inferInsert;
export type ClientPayment = typeof clientPayments.$inferSelect;
export type InsertClientPayment = typeof clientPayments.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;
export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type CollaboratorDocument = typeof collaboratorDocuments.$inferSelect;
export type InsertCollaboratorDocument = typeof collaboratorDocuments.$inferInsert;
export type EquipmentPhoto = typeof equipmentPhotos.$inferSelect;
export type InsertEquipmentPhoto = typeof equipmentPhotos.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = typeof financialEntries.$inferInsert;
export type GpsLocation = typeof gpsLocations.$inferSelect;
export type InsertGpsLocation = typeof gpsLocations.$inferInsert;
export type ExtraExpense = typeof extraExpenses.$inferSelect;
export type InsertExtraExpense = typeof extraExpenses.$inferInsert;
export type Chainsaw = typeof chainsaws.$inferSelect;
export type InsertChainsaw = typeof chainsaws.$inferInsert;
export type VehicleRecord = typeof vehicleRecords.$inferSelect;
export type InsertVehicleRecord = typeof vehicleRecords.$inferInsert;
export type MachineHours = typeof machineHours.$inferSelect;
export type InsertMachineHours = typeof machineHours.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type CollaboratorAttendance = typeof collaboratorAttendance.$inferSelect;
export type InsertCollaboratorAttendance = typeof collaboratorAttendance.$inferInsert;
export type GpsDeviceLink = typeof gpsDeviceLinks.$inferSelect;
export type InsertGpsDeviceLink = typeof gpsDeviceLinks.$inferInsert;

export const cargoWeeklyClosings = mysqlTable("cargo_weekly_closings", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull().references(() => clients.id),
	weekStart: timestamp("week_start", { mode: 'string' }).notNull(),
	weekEnd: timestamp("week_end", { mode: 'string' }).notNull(),
	totalLoads: int("total_loads").default(0).notNull(),
	totalWeightKg: varchar("total_weight_kg", { length: 20 }),
	totalAmount: varchar("total_amount", { length: 20 }),
	pricePerTon: varchar("price_per_ton", { length: 20 }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: mysqlEnum(['aberto','fechado','pago','atrasado']).default('aberto').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	receiptUrl: varchar("receipt_url", { length: 1000 }),
	notes: text(),
	closedBy: int("closed_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type CargoWeeklyClosing = typeof cargoWeeklyClosings.$inferSelect;
export type InsertCargoWeeklyClosing = typeof cargoWeeklyClosings.$inferInsert;

export const clientDocuments = mysqlTable("client_documents", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull(),
	type: mysqlEnum(['proposta','contrato','nota_fiscal','boleto','recibo','outros']).default('outros').notNull(),
	title: varchar({ length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 1000 }).notNull(),
	fileType: varchar("file_type", { length: 50 }),
	notes: text(),
	uploadedBy: int("uploaded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = typeof clientDocuments.$inferInsert;

// ===== CLIENTES DESTINO (COMPRADORES DE LENHA/MADEIRA) =====
export const buyerClients = mysqlTable("buyer_clients", {
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
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type BuyerClient = typeof buyerClients.$inferSelect;
export type InsertBuyerClient = typeof buyerClients.$inferInsert;

// ===== HISTÓRICO DE PREÇOS DOS COMPRADORES =====
export const buyerPriceHistory = mysqlTable("buyer_price_history", {
  id: int().primaryKey().autoincrement(),
  buyerId: int("buyer_id").notNull(),
  product: varchar({ length: 255 }).notNull(),
  pricePerUnit: varchar("price_per_unit", { length: 20 }).notNull(),
  unit: varchar({ length: 20 }).default("ton").notNull(),
  validFrom: varchar("valid_from", { length: 10 }),
  validUntil: varchar("valid_until", { length: 10 }),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type BuyerPriceHistory = typeof buyerPriceHistory.$inferSelect;

// ===== PAGAMENTOS DOS COMPRADORES =====
export const buyerPayments = mysqlTable("buyer_payments", {
  id: int().primaryKey().autoincrement(),
  buyerId: int("buyer_id").notNull(),
  amount: varchar({ length: 20 }).notNull(),
  paymentDate: varchar("payment_date", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  notes: text(),
  status: mysqlEnum(['pendente', 'pago', 'atrasado']).default('pendente').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type BuyerPayment = typeof buyerPayments.$inferSelect;

// ===== CÁLCULO DE FRETES =====
export const freightCalculations = mysqlTable("freight_calculations", {
  id: int().primaryKey().autoincrement(),
  cargoLoadId: int("cargo_load_id"),
  date: varchar({ length: 10 }).notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  driverName: varchar("driver_name", { length: 255 }),
  driverType: mysqlEnum("driver_type", ['proprio', 'terceirizado']).default('proprio').notNull(),
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
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type FreightCalculation = typeof freightCalculations.$inferSelect;
export type InsertFreightCalculation = typeof freightCalculations.$inferInsert;

// ===== NOTIFICAÇÕES INTERNAS =====
export const notifications = mysqlTable("notifications", {
  id: int().primaryKey().autoincrement(),
  recipientUserId: int("recipient_user_id").notNull(),
  type: mysqlEnum(['solicitacao_peca', 'pagamento_boleto', 'pagamento_diaria', 'fechamento_carga', 'fechamento_semanal', 'geral']).default('geral').notNull(),
  title: varchar({ length: 255 }).notNull(),
  message: text(),
  relatedId: int("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  isRead: tinyint("is_read").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Fornecedores de combustível (diesel, gasolina, etc.)
export const fuelSuppliers = mysqlTable("fuel_suppliers", {
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
	fuelType: mysqlEnum("fuel_type", ['diesel','gasolina','etanol','gnv']).default('diesel').notNull(),
	pricePerLiter: varchar("price_per_liter", { length: 20 }).notNull(),
	locationType: mysqlEnum("location_type", ['simflor','astorga','postos']).default('simflor').notNull(),
	location: varchar({ length: 255 }),
	workLocationId: int("work_location_id"),
	isActive: tinyint("is_active").default(1).notNull(),
	notes: text(),
	tankCapacity: varchar("tank_capacity", { length: 20 }),
	tankAlertThreshold: varchar("tank_alert_threshold", { length: 5 }).default('20'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const fuelPriceHistory = mysqlTable("fuel_price_history", {
	id: int().autoincrement().notNull(),
	supplierId: int("supplier_id").notNull(),
	oldPrice: varchar("old_price", { length: 20 }).notNull(),
	newPrice: varchar("new_price", { length: 20 }).notNull(),
	changedBy: int("changed_by"),
	changedAt: timestamp("changed_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fuelInvoices = mysqlTable("fuel_invoices", {
	id: int().autoincrement().notNull(),
	supplierId: int("supplier_id").notNull(),
	invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
	invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
	dueDate: varchar("due_date", { length: 10 }).notNull(),
	totalAmount: varchar("total_amount", { length: 20 }).notNull(),
	liters: varchar({ length: 20 }),
	pricePerLiter: varchar("price_per_liter", { length: 20 }),
	fuelType: mysqlEnum("fuel_type", ['diesel','gasolina','etanol','gnv']).default('diesel'),
	paymentMethod: varchar("payment_method", { length: 50 }),
	bankName: varchar("bank_name", { length: 100 }),
	barcodeNumber: varchar("barcode_number", { length: 100 }),
	status: mysqlEnum(['pendente', 'pago', 'vencido', 'cancelado']).default('pendente').notNull(),
	paidAt: varchar("paid_at", { length: 10 }),
	paidAmount: varchar("paid_amount", { length: 20 }),
	transporterName: varchar("transporter_name", { length: 255 }),
	transporterPlate: varchar("transporter_plate", { length: 20 }),
	deliveryLocation: varchar("delivery_location", { length: 100 }),
	notes: text(),
	invoicePhotoUrl: text("invoice_photo_url"),
	boletoPhotoUrl: text("boleto_photo_url"),
	litersUsed: varchar("liters_used", { length: 20 }).default('0'),
	registeredBy: int("registered_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ===== FRETES AUTOMÁTICOS GPS =====
export const autoFreightTrips = mysqlTable("auto_freight_trips", {
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
  fuelCost: varchar("fuel_cost", { length: 20 }).default('0'),
  maintenanceCost: varchar("maintenance_cost", { length: 20 }).default('0'),
  totalCost: varchar("total_cost", { length: 20 }).default('0'),
  status: mysqlEnum(['detectado','confirmado','ignorado']).default('detectado').notNull(),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type AutoFreightTrip = typeof autoFreightTrips.$inferSelect;
export type InsertAutoFreightTrip = typeof autoFreightTrips.$inferInsert;

export const thirdPartyContractors = mysqlTable("third_party_contractors", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	ratePerM3: varchar("rate_per_m3", { length: 20 }).notNull().default('0'),
	phone: varchar({ length: 30 }),
	notes: text(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


// ============================================================
// MÓDULO: SOLICITAÇÕES DE COMPRAS / PEÇAS
// ============================================================

export const purchaseCategories = mysqlTable("purchase_categories", {
  id: int().autoincrement().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  color: varchar({ length: 20 }).default('#6B7280').notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type PurchaseCategory = typeof purchaseCategories.$inferSelect;
export type InsertPurchaseCategory = typeof purchaseCategories.$inferInsert;

export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int().autoincrement().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  images: text(), // JSON array of S3 URLs
  linkUrl: varchar("link_url", { length: 500 }),
  categoryId: int("category_id").references(() => purchaseCategories.id),
  status: mysqlEnum(['pendente','lida','aprovada','comprada','recebida','cancelada']).default('pendente').notNull(),
  urgency: mysqlEnum(['baixa','media','alta','critica']).default('media').notNull(),
  requestDate: timestamp("request_date", { mode: 'string' }).defaultNow().notNull(),
  readDate: timestamp("read_date", { mode: 'string' }),
  purchaseDate: timestamp("purchase_date", { mode: 'string' }),
  expectedArrival: timestamp("expected_arrival", { mode: 'string' }),
  receivedDate: timestamp("received_date", { mode: 'string' }),
  itemsConfirmedDate: timestamp("items_confirmed_date", { mode: 'string' }),
  requestedBy: int("requested_by").references(() => users.id),
  approvedBy: int("approved_by").references(() => users.id),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;

export const purchaseRequestItems = mysqlTable("purchase_request_items", {
  id: int().autoincrement().primaryKey().notNull(),
  requestId: int("request_id").notNull().references(() => purchaseRequests.id),
  name: varchar({ length: 255 }).notNull(),
  quantity: varchar({ length: 50 }).notNull(),
  unit: varchar({ length: 50 }),
  notes: text(),
  confirmed: tinyint().default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type PurchaseRequestItem = typeof purchaseRequestItems.$inferSelect;
export type InsertPurchaseRequestItem = typeof purchaseRequestItems.$inferInsert;

export const suppliers = mysqlTable("suppliers", {
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
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  website: varchar({ length: 500 }),
  active: tinyint().default(1).notNull(),
});
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

export const quotations = mysqlTable("quotations", {
  id: int().autoincrement().primaryKey().notNull(),
  supplierId: int("supplier_id").notNull().references(() => suppliers.id),
  categoryId: int("category_id").references(() => purchaseCategories.id),
  requestId: int("request_id").references(() => purchaseRequests.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  unit: varchar({ length: 50 }),
  price: varchar({ length: 30 }).notNull(), // stored as string to avoid float issues
  quotationDate: timestamp("quotation_date", { mode: 'string' }).defaultNow().notNull(),
  notes: text(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

// ===== CICLOS DE FRETE AUTOMÁTICO =====
export const farmGeofences = mysqlTable("farm_geofences", {
  id: int().autoincrement().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  latitude: varchar({ length: 30 }).notNull(),
  longitude: varchar({ length: 30 }).notNull(),
  radiusMeters: int("radius_meters").default(500).notNull(),
  equipmentId: int("equipment_id").references(() => equipment.id),
  active: tinyint().default(1).notNull(),
  notes: text(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type FarmGeofence = typeof farmGeofences.$inferSelect;
export type InsertFarmGeofence = typeof farmGeofences.$inferInsert;

export const freightCycles = mysqlTable("freight_cycles", {
  id: int().autoincrement().primaryKey().notNull(),
  equipmentId: int("equipment_id").references(() => equipment.id),
  geofenceId: int("geofence_id").references(() => farmGeofences.id),
  driverCollaboratorId: int("driver_collaborator_id").references(() => collaborators.id),
  driverName: varchar("driver_name", { length: 255 }),
  status: mysqlEnum("status", ['em_fazenda','em_transito','concluido','cancelado']).default('em_fazenda').notNull(),
  arrivedFarmAt: timestamp("arrived_farm_at", { mode: 'string' }),
  leftFarmAt: timestamp("left_farm_at", { mode: 'string' }),
  returnedFarmAt: timestamp("returned_farm_at", { mode: 'string' }),
  startLat: varchar("start_lat", { length: 30 }),
  startLng: varchar("start_lng", { length: 30 }),
  endLat: varchar("end_lat", { length: 30 }),
  endLng: varchar("end_lng", { length: 30 }),
  distanceKm: varchar("distance_km", { length: 20 }),
  cargoLoadId: int("cargo_load_id").references(() => cargoLoads.id),
  destination: varchar({ length: 255 }),
  totalFuelCost: varchar("total_fuel_cost", { length: 20 }).default('0'),
  totalMaintenanceCost: varchar("total_maintenance_cost", { length: 20 }).default('0'),
  totalCost: varchar("total_cost", { length: 20 }).default('0'),
  trajectoryJson: text("trajectory_json"),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type FreightCycle = typeof freightCycles.$inferSelect;
export type InsertFreightCycle = typeof freightCycles.$inferInsert;

// ============================================================
// MÓDULO: SOLICITAÇÃO DE ORÇAMENTO
// ============================================================

export const quotationRequests = mysqlTable("quotation_requests", {
  id: int().autoincrement().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  requesterId: int("requester_id").references(() => collaborators.id),
  requesterName: varchar("requester_name", { length: 255 }),
  requesterPhone: varchar("requester_phone", { length: 30 }),
  requesterEmail: varchar("requester_email", { length: 255 }),
  itemsJson: text("items_json").notNull(), // JSON array: [{name, quantity, unit}]
  token: varchar({ length: 64 }).notNull(),
  expiresAt: bigint("expires_at", { mode: 'number' }).notNull(),
  status: mysqlEnum(['ativa','respondida','expirada','cancelada']).default('ativa').notNull(),
  notes: text(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type QuotationRequest = typeof quotationRequests.$inferSelect;
export type InsertQuotationRequest = typeof quotationRequests.$inferInsert;

export const quotationResponses = mysqlTable("quotation_responses", {
  id: int().autoincrement().primaryKey().notNull(),
  quotationRequestId: int("quotation_request_id").notNull().references(() => quotationRequests.id),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  cnpj: varchar({ length: 30 }),
  address: text(),
  sellerName: varchar("seller_name", { length: 255 }),
  sellerPhone: varchar("seller_phone", { length: 30 }),
  sellerEmail: varchar("seller_email", { length: 255 }),
  itemsJson: text("items_json").notNull(), // JSON array: [{name, quantity, unit, price, brand, notes}]
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type QuotationResponse = typeof quotationResponses.$inferSelect;
export type InsertQuotationResponse = typeof quotationResponses.$inferInsert;

// ============================================================
// MÓDULO: TARIFAS DE FRETE TERCEIRIZADO
// ============================================================

export const freightRates = mysqlTable("freight_rates", {
  id: int().autoincrement().primaryKey().notNull(),
  worksite: varchar({ length: 255 }).notNull(),   // ex: SIMFLOR, Fazenda GW
  destination: varchar({ length: 255 }).notNull(), // ex: Líder Lobato, Sonoco Lda.
  ratePerTon: varchar("rate_per_ton", { length: 20 }).notNull(), // R$/ton
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type FreightRate = typeof freightRates.$inferSelect;
export type InsertFreightRate = typeof freightRates.$inferInsert;

// ============================================================
// MÓDULO: ABASTECIMENTOS DE TERCEIRIZADOS
// ============================================================

export const thirdPartyFuel = mysqlTable("third_party_fuel", {
  id: int().autoincrement().primaryKey().notNull(),
  equipmentId: int("equipment_id").notNull().references(() => equipment.id),
  date: timestamp({ mode: 'string' }).notNull(),
  liters: varchar({ length: 20 }).notNull(),
  pricePerLiter: varchar("price_per_liter", { length: 20 }).notNull(),
  total: varchar({ length: 20 }).notNull(),
  location: varchar({ length: 255 }),
  notes: text(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
export type ThirdPartyFuel = typeof thirdPartyFuel.$inferSelect;
export type InsertThirdPartyFuel = typeof thirdPartyFuel.$inferInsert;
