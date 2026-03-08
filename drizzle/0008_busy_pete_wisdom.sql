CREATE TABLE `collaborator_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`type` enum('cnh','certificado','aso','contrato','rg','cpf','outros') NOT NULL DEFAULT 'outros',
	`title` varchar(255) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`file_type` varchar(50),
	`issue_date` timestamp,
	`expiry_date` timestamp,
	`notes` text,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaborator_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`type` enum('manutencao','limpeza','afiacao','revisao','troca_oleo','outros') NOT NULL DEFAULT 'manutencao',
	`description` text NOT NULL,
	`performed_by` varchar(255),
	`cost` varchar(20),
	`next_maintenance_date` timestamp,
	`photos_json` text,
	`registered_by` int,
	`performed_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`photo_url` varchar(1000) NOT NULL,
	`caption` varchar(255),
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_maintenance` ADD CONSTRAINT `equipment_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_photos` ADD CONSTRAINT `equipment_photos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;