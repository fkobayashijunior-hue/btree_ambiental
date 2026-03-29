CREATE TABLE `maintenance_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenance_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`part_photo_url` text,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`total_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_template_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_template_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
	`description` text,
	`estimated_cost` varchar(20),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts_stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`reference_id` int,
	`reference_type` varchar(50),
	`unit_cost` varchar(20),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parts_stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_id_equipment_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_template_id_maintenance_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_templates` ADD CONSTRAINT `maintenance_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;