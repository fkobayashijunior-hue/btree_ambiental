ALTER TABLE `financial_entries` ADD `cargo_load_id` int;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD `auto_generated` int DEFAULT 0;