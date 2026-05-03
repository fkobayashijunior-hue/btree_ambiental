ALTER TABLE `client_documents` DROP FOREIGN KEY `client_documents_client_id_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `client_documents` DROP FOREIGN KEY `client_documents_uploaded_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `client_documents` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());