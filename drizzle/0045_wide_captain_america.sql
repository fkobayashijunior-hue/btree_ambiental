ALTER TABLE `cargo_loads` DROP FOREIGN KEY `cargo_loads_vehicle_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_loads` DROP FOREIGN KEY `cargo_loads_driver_collaborator_id_collaborators_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_loads` DROP FOREIGN KEY `cargo_loads_client_id_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_loads` DROP FOREIGN KEY `cargo_loads_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `received_by_buyer` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `received_at` timestamp;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `receiver_name` varchar(255);