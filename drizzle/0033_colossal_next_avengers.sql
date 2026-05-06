CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipient_user_id` int NOT NULL,
	`type` enum('solicitacao_peca','pagamento_boleto','pagamento_diaria','fechamento_carga','fechamento_semanal','geral') NOT NULL DEFAULT 'geral',
	`title` varchar(255) NOT NULL,
	`message` text,
	`related_id` int,
	`related_type` varchar(50),
	`is_read` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
