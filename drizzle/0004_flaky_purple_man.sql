CREATE TABLE `biometric_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`check_in_time` timestamp NOT NULL,
	`check_out_time` timestamp,
	`location` varchar(255),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`photo_url` text,
	`confidence` varchar(10),
	`registered_by` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `biometric_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`cpf` varchar(14),
	`rg` varchar(20),
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`zip_code` varchar(10),
	`photo_url` text,
	`face_descriptor` text,
	`role` enum('administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado') NOT NULL DEFAULT 'operador',
	`pix_key` varchar(255),
	`daily_rate` varchar(20),
	`employment_type` enum('clt','terceirizado','diarista') DEFAULT 'diarista',
	`shirt_size` enum('PP','P','M','G','GG','XGG'),
	`pants_size` varchar(10),
	`shoe_size` varchar(5),
	`boot_size` varchar(5),
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;