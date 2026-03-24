CREATE TABLE `gps_device_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`traccar_device_id` int NOT NULL,
	`traccar_device_name` varchar(255),
	`traccar_unique_id` varchar(100),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_device_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gps_hours_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`gps_device_link_id` int,
	`date` timestamp NOT NULL,
	`hours_worked` varchar(20) NOT NULL,
	`hour_meter_start` varchar(20),
	`hour_meter_end` varchar(20),
	`distance_km` varchar(20),
	`source` enum('gps_auto','manual') NOT NULL DEFAULT 'gps_auto',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gps_hours_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preventive_maintenance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`status` enum('pendente','em_andamento','concluido','ignorado') NOT NULL DEFAULT 'pendente',
	`current_hours` varchar(20) NOT NULL,
	`due_hours` varchar(20) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`resolved_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preventive_maintenance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preventive_maintenance_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros') NOT NULL DEFAULT 'outros',
	`interval_hours` int NOT NULL,
	`last_done_hours` varchar(20) DEFAULT '0',
	`last_done_at` timestamp,
	`alert_threshold_hours` int DEFAULT 10,
	`active` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preventive_maintenance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_gps_device_link_id_gps_device_links_id_fk` FOREIGN KEY (`gps_device_link_id`) REFERENCES `gps_device_links`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;