import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, timestamp, mysqlEnum, varchar, text, index, tinyint } from "drizzle-orm/mysql-core"
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
});

export const cargoLoads = mysqlTable("cargo_loads", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
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
	status: mysqlEnum(['pendente','entregue','cancelado']).default('pendente').notNull(),
	registeredBy: int("registered_by").references(() => users.id),
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
	defaultHeightM: varchar("default_height_m", { length: 20 }),
	defaultWidthM: varchar("default_width_m", { length: 20 }),
	defaultLengthM: varchar("default_length_m", { length: 20 }),
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
