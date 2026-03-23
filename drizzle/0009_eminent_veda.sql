CREATE TABLE `collaborator_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`employment_type_ca` enum('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista',
	`daily_value` varchar(20) NOT NULL DEFAULT '0',
	`pix_key` varchar(255),
	`activity` varchar(255),
	`observations` text,
	`payment_status_ca` enum('pendente','pago') NOT NULL DEFAULT 'pendente',
	`paid_at` timestamp,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborator_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`part_code` varchar(50),
	`part_category` varchar(100),
	`supplier` varchar(255),
	`unit` varchar(20) DEFAULT 'un',
	`quantity` int NOT NULL,
	`unit_cost` varchar(20),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','enviado','aprovado','rejeitado','comprado') NOT NULL DEFAULT 'rascunho',
	`notes` text,
	`created_by` int,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_collaborator_id_collaborators_id_fk`;
--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `client_portal_access` DROP FOREIGN KEY `client_portal_access_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_in` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_out` timestamp;--> statement-breakpoint
ALTER TABLE `clients` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `equipment` ADD `sector_id` int;--> statement-breakpoint
ALTER TABLE `parts` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_purchase_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `date`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_in_time`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_out_time`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `photo_url`;