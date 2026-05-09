CREATE TABLE `fuel_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`old_price` varchar(20) NOT NULL,
	`new_price` varchar(20) NOT NULL,
	`changed_by` int,
	`changed_at` timestamp NOT NULL DEFAULT (now())
);
