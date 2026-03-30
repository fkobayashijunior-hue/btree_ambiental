CREATE TABLE `chainsaw_chain_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`event_type` enum('envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque') NOT NULL,
	`quantity` int NOT NULL,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_chain_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_chain_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`sharpened_in_box` int NOT NULL DEFAULT 0,
	`in_field` int NOT NULL DEFAULT 0,
	`in_workshop` int NOT NULL DEFAULT 0,
	`total_stock` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chainsaw_chain_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_part_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`reason` varchar(255),
	`service_order_id` int,
	`unit_cost` varchar(20),
	`registered_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_part_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`unit` varchar(20) DEFAULT 'un',
	`current_stock` varchar(20) DEFAULT '0',
	`min_stock` varchar(20) DEFAULT '0',
	`unit_cost` varchar(20),
	`notes` text,
	`is_active` int DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_service_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chainsaw_id` int NOT NULL,
	`problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL,
	`problem_description` text,
	`priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`mechanic_id` int,
	`service_description` text,
	`completed_at` timestamp,
	`opened_by` int,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_service_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaws` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`serial_number` varchar(100),
	`chain_type` varchar(20) DEFAULT '30',
	`status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa',
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaws_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_container_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`container_id` int NOT NULL,
	`event_type` enum('abastecimento','uso','transferencia') NOT NULL,
	`volume_liters` varchar(10) NOT NULL,
	`cost_per_liter` varchar(20),
	`total_cost` varchar(20),
	`oil2t_ml` varchar(10),
	`source_container_id` int,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_container_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(30) DEFAULT 'vermelho',
	`type` enum('puro','mistura') NOT NULL,
	`capacity_liters` varchar(10) DEFAULT '20',
	`current_volume_liters` varchar(10) DEFAULT '0',
	`is_active` int DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_containers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_parts` ADD CONSTRAINT `chainsaw_parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_mechanic_id_users_id_fk` FOREIGN KEY (`mechanic_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_opened_by_users_id_fk` FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk` FOREIGN KEY (`service_order_id`) REFERENCES `chainsaw_service_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaws` ADD CONSTRAINT `chainsaws_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_container_id_fuel_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_source_container_id_fuel_containers_id_fk` FOREIGN KEY (`source_container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;