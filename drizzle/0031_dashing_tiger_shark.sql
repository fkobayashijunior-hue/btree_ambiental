CREATE TABLE `buyer_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj_cpf` varchar(30),
	`inscricao_estadual` varchar(30),
	`phone` varchar(30),
	`email` varchar(255),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`cep` varchar(10),
	`contact_person` varchar(255),
	`product` varchar(255),
	`payment_method` varchar(100),
	`notes` text,
	`active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyer_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buyer_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyer_id` int NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_date` varchar(10) NOT NULL,
	`payment_method` varchar(50),
	`invoice_number` varchar(50),
	`notes` text,
	`status` enum('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyer_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buyer_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyer_id` int NOT NULL,
	`product` varchar(255) NOT NULL,
	`price_per_unit` varchar(20) NOT NULL,
	`unit` varchar(20) NOT NULL DEFAULT 'ton',
	`valid_from` varchar(10),
	`valid_until` varchar(10),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyer_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_calculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cargo_load_id` int,
	`date` varchar(10) NOT NULL,
	`vehicle_plate` varchar(20),
	`driver_name` varchar(255),
	`driver_type` enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
	`origin` varchar(255),
	`destination` varchar(255),
	`distance_km` varchar(20),
	`fuel_liters` varchar(20),
	`fuel_cost_per_liter` varchar(20),
	`fuel_total_cost` varchar(20),
	`driver_cost` varchar(20),
	`toll_cost` varchar(20),
	`maintenance_cost` varchar(20),
	`other_costs` varchar(20),
	`other_costs_description` text,
	`total_cost` varchar(20),
	`cost_per_km` varchar(20),
	`cost_per_ton` varchar(20),
	`weight_ton` varchar(20),
	`revenue_per_ton` varchar(20),
	`total_revenue` varchar(20),
	`profit` varchar(20),
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `freight_calculations_id` PRIMARY KEY(`id`)
);
