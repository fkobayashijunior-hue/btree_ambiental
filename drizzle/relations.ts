import { relations } from "drizzle-orm/relations";
import { users, attendanceRecords, collaborators, biometricAttendance, equipment, cargoLoads, clients, cargoShipments, clientContracts, clientPaymentReceipts, clientPayments, clientPortalAccess, collaboratorDocuments, equipmentTypes, equipmentMaintenance, equipmentPhotos, extraExpenses, fuelRecords, machineFuel, machineHours, machineMaintenance, maintenanceParts, parts, maintenanceTemplates, maintenanceTemplateParts, partsRequests, partsStockMovements, passwordResetTokens, purchaseOrders, purchaseOrderItems, replantingRecords, rolePermissions, sectors, userPermissions, userProfiles, vehicleRecords } from "./schema";

export const attendanceRecordsRelations = relations(attendanceRecords, ({one}) => ({
	user_userId: one(users, {
		fields: [attendanceRecords.userId],
		references: [users.id],
		relationName: "attendanceRecords_userId_users_id"
	}),
	user_paidBy: one(users, {
		fields: [attendanceRecords.paidBy],
		references: [users.id],
		relationName: "attendanceRecords_paidBy_users_id"
	}),
	user_registeredBy: one(users, {
		fields: [attendanceRecords.registeredBy],
		references: [users.id],
		relationName: "attendanceRecords_registeredBy_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	attendanceRecords_userId: many(attendanceRecords, {
		relationName: "attendanceRecords_userId_users_id"
	}),
	attendanceRecords_paidBy: many(attendanceRecords, {
		relationName: "attendanceRecords_paidBy_users_id"
	}),
	attendanceRecords_registeredBy: many(attendanceRecords, {
		relationName: "attendanceRecords_registeredBy_users_id"
	}),
	biometricAttendances: many(biometricAttendance),
	cargoLoads: many(cargoLoads),
	cargoShipments_driverId: many(cargoShipments, {
		relationName: "cargoShipments_driverId_users_id"
	}),
	cargoShipments_registeredBy: many(cargoShipments, {
		relationName: "cargoShipments_registeredBy_users_id"
	}),
	clientContracts: many(clientContracts),
	clientPaymentReceipts: many(clientPaymentReceipts),
	clientPayments: many(clientPayments),
	clientPortalAccesses: many(clientPortalAccess),
	clients: many(clients),
	collaboratorDocuments: many(collaboratorDocuments),
	collaborators_userId: many(collaborators, {
		relationName: "collaborators_userId_users_id"
	}),
	collaborators_createdBy: many(collaborators, {
		relationName: "collaborators_createdBy_users_id"
	}),
	equipmentMaintenances: many(equipmentMaintenance),
	equipmentPhotos: many(equipmentPhotos),
	extraExpenses: many(extraExpenses),
	fuelRecords_operatorId: many(fuelRecords, {
		relationName: "fuelRecords_operatorId_users_id"
	}),
	fuelRecords_registeredBy: many(fuelRecords, {
		relationName: "fuelRecords_registeredBy_users_id"
	}),
	machineFuels: many(machineFuel),
	machineHours: many(machineHours),
	machineMaintenances: many(machineMaintenance),
	parts: many(parts),
	partsRequests_approvedBy: many(partsRequests, {
		relationName: "partsRequests_approvedBy_users_id"
	}),
	partsRequests_requestedBy: many(partsRequests, {
		relationName: "partsRequests_requestedBy_users_id"
	}),
	passwordResetTokens: many(passwordResetTokens),
	replantingRecords: many(replantingRecords),
	rolePermissions: many(rolePermissions),
	sectors: many(sectors),
	userPermissions: many(userPermissions),
	userProfiles: many(userProfiles),
	vehicleRecords: many(vehicleRecords),
}));

export const biometricAttendanceRelations = relations(biometricAttendance, ({one}) => ({
	collaborator: one(collaborators, {
		fields: [biometricAttendance.collaboratorId],
		references: [collaborators.id]
	}),
	user: one(users, {
		fields: [biometricAttendance.registeredBy],
		references: [users.id]
	}),
}));

export const collaboratorsRelations = relations(collaborators, ({one, many}) => ({
	biometricAttendances: many(biometricAttendance),
	cargoLoads: many(cargoLoads),
	collaboratorDocuments: many(collaboratorDocuments),
	user_userId: one(users, {
		fields: [collaborators.userId],
		references: [users.id],
		relationName: "collaborators_userId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [collaborators.createdBy],
		references: [users.id],
		relationName: "collaborators_createdBy_users_id"
	}),
	machineHours: many(machineHours),
	machineMaintenances: many(machineMaintenance),
	vehicleRecords: many(vehicleRecords),
}));

export const cargoLoadsRelations = relations(cargoLoads, ({one}) => ({
	equipment: one(equipment, {
		fields: [cargoLoads.vehicleId],
		references: [equipment.id]
	}),
	collaborator: one(collaborators, {
		fields: [cargoLoads.driverCollaboratorId],
		references: [collaborators.id]
	}),
	client: one(clients, {
		fields: [cargoLoads.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [cargoLoads.registeredBy],
		references: [users.id]
	}),
}));

export const equipmentRelations = relations(equipment, ({one, many}) => ({
	cargoLoads: many(cargoLoads),
	cargoShipments: many(cargoShipments),
	equipmentType: one(equipmentTypes, {
		fields: [equipment.typeId],
		references: [equipmentTypes.id]
	}),
	fuelRecords: many(fuelRecords),
	machineFuels: many(machineFuel),
	machineHours: many(machineHours),
	machineMaintenances: many(machineMaintenance),
	partsRequests: many(partsRequests),
	vehicleRecords: many(vehicleRecords),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	cargoLoads: many(cargoLoads),
	clientContracts: many(clientContracts),
	clientPaymentReceipts: many(clientPaymentReceipts),
	clientPayments: many(clientPayments),
	clientPortalAccesses: many(clientPortalAccess),
	user: one(users, {
		fields: [clients.createdBy],
		references: [users.id]
	}),
	replantingRecords: many(replantingRecords),
}));

export const cargoShipmentsRelations = relations(cargoShipments, ({one}) => ({
	equipment: one(equipment, {
		fields: [cargoShipments.truckId],
		references: [equipment.id]
	}),
	user_driverId: one(users, {
		fields: [cargoShipments.driverId],
		references: [users.id],
		relationName: "cargoShipments_driverId_users_id"
	}),
	user_registeredBy: one(users, {
		fields: [cargoShipments.registeredBy],
		references: [users.id],
		relationName: "cargoShipments_registeredBy_users_id"
	}),
}));

export const clientContractsRelations = relations(clientContracts, ({one, many}) => ({
	client: one(clients, {
		fields: [clientContracts.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [clientContracts.registeredBy],
		references: [users.id]
	}),
	clientPaymentReceipts: many(clientPaymentReceipts),
}));

export const clientPaymentReceiptsRelations = relations(clientPaymentReceipts, ({one}) => ({
	client: one(clients, {
		fields: [clientPaymentReceipts.clientId],
		references: [clients.id]
	}),
	clientContract: one(clientContracts, {
		fields: [clientPaymentReceipts.contractId],
		references: [clientContracts.id]
	}),
	user: one(users, {
		fields: [clientPaymentReceipts.registeredBy],
		references: [users.id]
	}),
}));

export const clientPaymentsRelations = relations(clientPayments, ({one}) => ({
	client: one(clients, {
		fields: [clientPayments.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [clientPayments.registeredBy],
		references: [users.id]
	}),
}));

export const clientPortalAccessRelations = relations(clientPortalAccess, ({one}) => ({
	client: one(clients, {
		fields: [clientPortalAccess.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [clientPortalAccess.createdBy],
		references: [users.id]
	}),
}));

export const collaboratorDocumentsRelations = relations(collaboratorDocuments, ({one}) => ({
	collaborator: one(collaborators, {
		fields: [collaboratorDocuments.collaboratorId],
		references: [collaborators.id]
	}),
	user: one(users, {
		fields: [collaboratorDocuments.uploadedBy],
		references: [users.id]
	}),
}));

export const equipmentTypesRelations = relations(equipmentTypes, ({many}) => ({
	equipment: many(equipment),
}));

export const equipmentMaintenanceRelations = relations(equipmentMaintenance, ({one, many}) => ({
	user: one(users, {
		fields: [equipmentMaintenance.registeredBy],
		references: [users.id]
	}),
	maintenanceParts: many(maintenanceParts),
}));

export const equipmentPhotosRelations = relations(equipmentPhotos, ({one}) => ({
	user: one(users, {
		fields: [equipmentPhotos.uploadedBy],
		references: [users.id]
	}),
}));

export const extraExpensesRelations = relations(extraExpenses, ({one}) => ({
	user: one(users, {
		fields: [extraExpenses.registeredBy],
		references: [users.id]
	}),
}));

export const fuelRecordsRelations = relations(fuelRecords, ({one}) => ({
	equipment: one(equipment, {
		fields: [fuelRecords.equipmentId],
		references: [equipment.id]
	}),
	user_operatorId: one(users, {
		fields: [fuelRecords.operatorId],
		references: [users.id],
		relationName: "fuelRecords_operatorId_users_id"
	}),
	user_registeredBy: one(users, {
		fields: [fuelRecords.registeredBy],
		references: [users.id],
		relationName: "fuelRecords_registeredBy_users_id"
	}),
}));

export const machineFuelRelations = relations(machineFuel, ({one}) => ({
	equipment: one(equipment, {
		fields: [machineFuel.equipmentId],
		references: [equipment.id]
	}),
	user: one(users, {
		fields: [machineFuel.registeredBy],
		references: [users.id]
	}),
}));

export const machineHoursRelations = relations(machineHours, ({one}) => ({
	equipment: one(equipment, {
		fields: [machineHours.equipmentId],
		references: [equipment.id]
	}),
	collaborator: one(collaborators, {
		fields: [machineHours.operatorCollaboratorId],
		references: [collaborators.id]
	}),
	user: one(users, {
		fields: [machineHours.registeredBy],
		references: [users.id]
	}),
}));

export const machineMaintenanceRelations = relations(machineMaintenance, ({one}) => ({
	equipment: one(equipment, {
		fields: [machineMaintenance.equipmentId],
		references: [equipment.id]
	}),
	collaborator: one(collaborators, {
		fields: [machineMaintenance.mechanicCollaboratorId],
		references: [collaborators.id]
	}),
	user: one(users, {
		fields: [machineMaintenance.registeredBy],
		references: [users.id]
	}),
}));

export const maintenancePartsRelations = relations(maintenanceParts, ({one}) => ({
	equipmentMaintenance: one(equipmentMaintenance, {
		fields: [maintenanceParts.maintenanceId],
		references: [equipmentMaintenance.id]
	}),
	part: one(parts, {
		fields: [maintenanceParts.partId],
		references: [parts.id]
	}),
}));

export const partsRelations = relations(parts, ({one, many}) => ({
	maintenanceParts: many(maintenanceParts),
	maintenanceTemplateParts: many(maintenanceTemplateParts),
	user: one(users, {
		fields: [parts.createdBy],
		references: [users.id]
	}),
	partsRequests: many(partsRequests),
	partsStockMovements: many(partsStockMovements),
}));

export const maintenanceTemplatePartsRelations = relations(maintenanceTemplateParts, ({one}) => ({
	maintenanceTemplate: one(maintenanceTemplates, {
		fields: [maintenanceTemplateParts.templateId],
		references: [maintenanceTemplates.id]
	}),
	part: one(parts, {
		fields: [maintenanceTemplateParts.partId],
		references: [parts.id]
	}),
}));

export const maintenanceTemplatesRelations = relations(maintenanceTemplates, ({many}) => ({
	maintenanceTemplateParts: many(maintenanceTemplateParts),
}));

export const partsRequestsRelations = relations(partsRequests, ({one}) => ({
	part: one(parts, {
		fields: [partsRequests.partId],
		references: [parts.id]
	}),
	equipment: one(equipment, {
		fields: [partsRequests.equipmentId],
		references: [equipment.id]
	}),
	user_approvedBy: one(users, {
		fields: [partsRequests.approvedBy],
		references: [users.id],
		relationName: "partsRequests_approvedBy_users_id"
	}),
	user_requestedBy: one(users, {
		fields: [partsRequests.requestedBy],
		references: [users.id],
		relationName: "partsRequests_requestedBy_users_id"
	}),
}));

export const partsStockMovementsRelations = relations(partsStockMovements, ({one}) => ({
	part: one(parts, {
		fields: [partsStockMovements.partId],
		references: [parts.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderItems.orderId],
		references: [purchaseOrders.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({many}) => ({
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const replantingRecordsRelations = relations(replantingRecords, ({one}) => ({
	client: one(clients, {
		fields: [replantingRecords.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [replantingRecords.registeredBy],
		references: [users.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	user: one(users, {
		fields: [rolePermissions.updatedBy],
		references: [users.id]
	}),
}));

export const sectorsRelations = relations(sectors, ({one}) => ({
	user: one(users, {
		fields: [sectors.createdBy],
		references: [users.id]
	}),
}));

export const userPermissionsRelations = relations(userPermissions, ({one}) => ({
	user: one(users, {
		fields: [userPermissions.userId],
		references: [users.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const vehicleRecordsRelations = relations(vehicleRecords, ({one}) => ({
	equipment: one(equipment, {
		fields: [vehicleRecords.equipmentId],
		references: [equipment.id]
	}),
	collaborator: one(collaborators, {
		fields: [vehicleRecords.driverCollaboratorId],
		references: [collaborators.id]
	}),
	user: one(users, {
		fields: [vehicleRecords.registeredBy],
		references: [users.id]
	}),
}));