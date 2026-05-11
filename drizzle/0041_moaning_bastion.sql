ALTER TABLE `fuel_invoices` ADD `liters_used` varchar(20) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `tank_capacity` varchar(20);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `tank_alert_threshold` varchar(5) DEFAULT '20';--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `fuel_invoice_id` int;