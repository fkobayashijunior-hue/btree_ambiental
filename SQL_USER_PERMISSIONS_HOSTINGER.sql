-- ============================================================
-- CRIAR TABELA user_permissions NA HOSTINGER
-- Execute no phpMyAdmin da Hostinger
-- Banco: u629128033_btree_ambienta
-- ============================================================

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `modules` text,
  `profile` varchar(64) DEFAULT 'custom',
  `updated_by` int,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_permissions_user_id_unique` UNIQUE(`user_id`)
);

-- Adicionar foreign keys (ignora se já existir)
ALTER TABLE `user_permissions` 
  ADD CONSTRAINT `user_permissions_user_id_users_id_fk` 
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE `user_permissions` 
  ADD CONSTRAINT `user_permissions_updated_by_users_id_fk` 
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Verificar resultado
SELECT 'Tabela user_permissions criada com sucesso!' AS status;
SELECT COUNT(*) AS total_usuarios FROM `users`;
