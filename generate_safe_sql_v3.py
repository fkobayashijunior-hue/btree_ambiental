#!/usr/bin/env python3
"""
Gera script SQL consolidado SEGURO para Hostinger - V3
REORDENA: 1) CREATE TABLE, 2) ADD COLUMN / MODIFY, 3) FKs / Constraints
Isso evita o erro #1072 "Coluna chave não existe na tabela"
"""

import re

INPUT_FILE = "/home/ubuntu/btree-ambiental/ALL_MIGRATIONS_CONSOLIDATED.sql"
OUTPUT_FILE = "/home/ubuntu/btree-ambiental/HOSTINGER_SAFE_MIGRATION.sql"

with open(INPUT_FILE, 'r') as f:
    raw_content = f.read()

# Remove markers
raw_content = raw_content.replace('--> statement-breakpoint', '')
raw_content = re.sub(r'-- =+\n-- Migration:.*?\n-- =+\n', '\n', raw_content)

# Split into individual statements using paren-aware splitting
statements = []
current = []
paren_depth = 0
for char in raw_content:
    if char == '(':
        paren_depth += 1
        current.append(char)
    elif char == ')':
        paren_depth -= 1
        current.append(char)
    elif char == ';' and paren_depth == 0:
        stmt = ''.join(current).strip()
        if stmt:
            # Remove leading comment-only lines
            lines = stmt.split('\n')
            clean_lines = []
            found_sql = False
            for line in lines:
                stripped = line.strip()
                if not found_sql and (stripped.startswith('--') or stripped == ''):
                    continue
                found_sql = True
                clean_lines.append(line)
            clean_stmt = '\n'.join(clean_lines).strip()
            if clean_stmt and not all(l.strip().startswith('--') or l.strip() == '' for l in clean_stmt.split('\n')):
                statements.append(clean_stmt)
        current = []
    else:
        current.append(char)

# Categorize statements
create_tables = []      # Phase 1
add_columns = []        # Phase 2
modify_columns = []     # Phase 2
drop_columns = []       # Phase 2
drop_fks = []           # Phase 2 (before add FKs)
add_constraints = []    # Phase 3 (FKs, UNIQUE)
other_alters = []       # Phase 2

created_table_names = set()
processed_creates = set()
processed_add_cols = set()
processed_modifies = set()
processed_constraints = set()
processed_drops = set()

for stmt in statements:
    upper = stmt.upper().strip()
    
    # Skip pure comments
    if upper.startswith('--'):
        continue
    
    # CREATE TABLE
    create_match = re.match(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', stmt, re.IGNORECASE)
    if create_match:
        table_name = create_match.group(1)
        if table_name not in processed_creates:
            processed_creates.add(table_name)
            created_table_names.add(table_name)
            safe_sql = re.sub(
                r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?',
                r'CREATE TABLE IF NOT EXISTS `\1`',
                stmt, count=1, flags=re.IGNORECASE
            )
            create_tables.append((table_name, safe_sql))
        continue
    
    # ALTER TABLE
    alter_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+(.+)', stmt, re.IGNORECASE | re.DOTALL)
    if alter_match:
        table_name = alter_match.group(1)
        rest = alter_match.group(2).strip()
        rest_upper = rest.upper()
        
        # DROP FOREIGN KEY
        drop_fk = re.match(r'DROP\s+FOREIGN\s+KEY\s+`?(\w+)`?', rest, re.IGNORECASE)
        if drop_fk:
            fk_name = drop_fk.group(1)
            key = f"drop_fk_{table_name}.{fk_name}"
            if key not in processed_drops:
                processed_drops.add(key)
                drop_fks.append((table_name, fk_name))
            continue
        
        # DROP COLUMN
        drop_col = re.match(r'DROP\s+COLUMN\s+`?(\w+)`?', rest, re.IGNORECASE)
        if drop_col:
            col_name = drop_col.group(1)
            key = f"drop_col_{table_name}.{col_name}"
            if key not in processed_drops:
                processed_drops.add(key)
                drop_columns.append((table_name, col_name))
            continue
        
        # MODIFY COLUMN
        if rest_upper.startswith('MODIFY'):
            key = f"modify_{stmt[:100]}"
            if key not in processed_modifies:
                processed_modifies.add(key)
                modify_columns.append(stmt)
            continue
        
        # ADD CONSTRAINT ... FOREIGN KEY
        add_fk = re.match(r'ADD\s+CONSTRAINT\s+`?(\w+)`?\s+(FOREIGN\s+KEY.+)', rest, re.IGNORECASE | re.DOTALL)
        if add_fk:
            constraint_name = add_fk.group(1)
            fk_def = add_fk.group(2).strip()
            key = f"add_fk_{table_name}.{constraint_name}"
            if key not in processed_constraints:
                processed_constraints.add(key)
                add_constraints.append(('fk', table_name, constraint_name, fk_def))
            continue
        
        # ADD CONSTRAINT ... UNIQUE
        add_unique = re.match(r'ADD\s+CONSTRAINT\s+`?(\w+)`?\s+UNIQUE\s*\((.+?)\)', rest, re.IGNORECASE)
        if add_unique:
            constraint_name = add_unique.group(1)
            cols = add_unique.group(2)
            key = f"add_unique_{table_name}.{constraint_name}"
            if key not in processed_constraints:
                processed_constraints.add(key)
                add_constraints.append(('unique', table_name, constraint_name, cols))
            continue
        
        # ADD COLUMN
        add_col = re.match(r'ADD\s+(?:COLUMN\s+)?`(\w+)`\s+(.+)', rest, re.IGNORECASE | re.DOTALL)
        if add_col and 'CONSTRAINT' not in rest_upper and 'FOREIGN KEY' not in rest_upper:
            col_name = add_col.group(1)
            col_def = add_col.group(2).strip()
            key = f"add_col_{table_name}.{col_name}"
            if key not in processed_add_cols:
                processed_add_cols.add(key)
                add_columns.append((table_name, col_name, col_def))
            continue
        
        # Other ALTER
        other_alters.append(stmt)
        continue

# ============================================================
# Now generate the output in the correct order
# ============================================================
out = []
out.append("-- ================================================================")
out.append("-- BTREE AMBIENTAL - Script SQL Consolidado SEGURO para Hostinger")
out.append("-- Gerado em: 2026-04-10 (V3 - Reordenado)")
out.append("-- ")
out.append("-- INSTRUÇÕES:")
out.append("-- 1. Execute este script no phpMyAdmin da Hostinger")
out.append("-- 2. É seguro executar múltiplas vezes (idempotente)")
out.append("-- 3. Tabelas existentes NÃO serão recriadas")
out.append("-- 4. Colunas existentes NÃO serão duplicadas")
out.append("-- ================================================================")
out.append("")
out.append("SET FOREIGN_KEY_CHECKS = 0;")
out.append("")

# ---- PHASE 1: CREATE TABLE ----
out.append("-- ================================================================")
out.append("-- FASE 1: CRIAR TODAS AS TABELAS")
out.append("-- ================================================================")
out.append("")

for table_name, sql in create_tables:
    out.append(f"-- Tabela: {table_name}")
    out.append(sql + ";")
    out.append("")

# ---- Add the 2 missing tables ----
if 'client_contracts' not in processed_creates:
    out.append("-- Tabela: client_contracts (adicional)")
    out.append("""CREATE TABLE IF NOT EXISTS `client_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`billing_type` enum('peso_kg','metro_m3','fixo') NOT NULL DEFAULT 'metro_m3',
	`unit_price` varchar(20),
	`estimated_volume` varchar(20),
	`total_amount` varchar(20),
	`due_date` timestamp,
	`status` enum('ativo','pago','atrasado','cancelado') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_contracts_id` PRIMARY KEY(`id`)
);""")
    out.append("")

if 'client_payment_receipts' not in processed_creates:
    out.append("-- Tabela: client_payment_receipts (adicional)")
    out.append("""CREATE TABLE IF NOT EXISTS `client_payment_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`contract_id` int,
	`payment_date` timestamp NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_method` enum('pix','transferencia','dinheiro','cheque','outros') NOT NULL DEFAULT 'pix',
	`receipt_url` varchar(1000),
	`reference_month` varchar(7),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_payment_receipts_id` PRIMARY KEY(`id`)
);""")
    out.append("")

# ---- PHASE 2: ADD/MODIFY/DROP COLUMNS ----
out.append("-- ================================================================")
out.append("-- FASE 2: ADICIONAR/MODIFICAR COLUNAS")
out.append("-- ================================================================")
out.append("")

# Drop FKs first (before dropping columns they reference)
for table_name, fk_name in drop_fks:
    out.append(f"-- DROP FK: {fk_name} de {table_name}")
    out.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{fk_name}');")
    out.append(f"SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `{table_name}` DROP FOREIGN KEY `{fk_name}`', 'SELECT 1');")
    out.append("PREPARE stmt FROM @sql;")
    out.append("EXECUTE stmt;")
    out.append("DEALLOCATE PREPARE stmt;")
    out.append("")

# Drop columns
for table_name, col_name in drop_columns:
    out.append(f"-- DROP COLUMN: {col_name} de {table_name}")
    out.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
    out.append(f"SET @sql = IF(@col_exists > 0, 'ALTER TABLE `{table_name}` DROP COLUMN `{col_name}`', 'SELECT 1');")
    out.append("PREPARE stmt FROM @sql;")
    out.append("EXECUTE stmt;")
    out.append("DEALLOCATE PREPARE stmt;")
    out.append("")

# Add columns
for table_name, col_name, col_def in add_columns:
    col_def_escaped = col_def.replace("'", "\\'")
    out.append(f"-- ADD COLUMN: {col_name} em {table_name}")
    out.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
    out.append(f"SET @sql = IF(@col_exists = 0, 'ALTER TABLE `{table_name}` ADD `{col_name}` {col_def_escaped}', 'SELECT 1');")
    out.append("PREPARE stmt FROM @sql;")
    out.append("EXECUTE stmt;")
    out.append("DEALLOCATE PREPARE stmt;")
    out.append("")

# Extra columns that may not be in migrations
extra_cols = [
    ('equipment', 'default_height_m', 'varchar(20)'),
    ('equipment', 'default_width_m', 'varchar(20)'),
    ('equipment', 'default_length_m', 'varchar(20)'),
    ('cargo_loads', 'weight_out_kg', 'varchar(20)'),
    ('cargo_loads', 'weight_in_kg', 'varchar(20)'),
    ('cargo_loads', 'final_height_m', 'varchar(20)'),
    ('cargo_loads', 'final_width_m', 'varchar(20)'),
    ('cargo_loads', 'final_length_m', 'varchar(20)'),
    ('cargo_loads', 'final_volume_m3', 'varchar(20)'),
    ('vehicle_records', 'maintenance_location', 'varchar(255)'),
    ('vehicle_records', 'photos_json', 'text'),
    ('parts', 'photos_json', 'text'),
]

for table_name, col_name, col_def in extra_cols:
    key = f"add_col_{table_name}.{col_name}"
    if key not in processed_add_cols:
        out.append(f"-- ADD COLUMN (extra): {col_name} em {table_name}")
        out.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
        out.append(f"SET @sql = IF(@col_exists = 0, 'ALTER TABLE `{table_name}` ADD `{col_name}` {col_def}', 'SELECT 1');")
        out.append("PREPARE stmt FROM @sql;")
        out.append("EXECUTE stmt;")
        out.append("DEALLOCATE PREPARE stmt;")
        out.append("")

# Modify columns
for stmt in modify_columns:
    out.append(f"-- MODIFY")
    out.append(stmt + ";")
    out.append("")

# Other alters
for stmt in other_alters:
    out.append(f"-- ALTER genérico")
    out.append(stmt + ";")
    out.append("")

# ---- PHASE 3: CONSTRAINTS (FKs, UNIQUE) ----
out.append("-- ================================================================")
out.append("-- FASE 3: ADICIONAR CONSTRAINTS (FKs e UNIQUE)")
out.append("-- ================================================================")
out.append("")

for ctype, table_name, constraint_name, definition in add_constraints:
    if ctype == 'fk':
        def_escaped = definition.replace("'", "\\'")
        out.append(f"-- FK: {constraint_name} em {table_name}")
        out.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
        out.append(f"SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` {def_escaped}', 'SELECT 1');")
        out.append("PREPARE stmt FROM @sql;")
        out.append("EXECUTE stmt;")
        out.append("DEALLOCATE PREPARE stmt;")
        out.append("")
    elif ctype == 'unique':
        out.append(f"-- UNIQUE: {constraint_name} em {table_name}")
        out.append(f"SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
        out.append(f"SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` UNIQUE({definition})', 'SELECT 1');")
        out.append("PREPARE stmt FROM @sql;")
        out.append("EXECUTE stmt;")
        out.append("DEALLOCATE PREPARE stmt;")
        out.append("")

# Extra FKs for the 2 additional tables
extra_fks = [
    ('client_contracts', 'client_contracts_client_id_clients_id_fk', 'FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action'),
    ('client_contracts', 'client_contracts_registered_by_users_id_fk', 'FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action'),
    ('client_payment_receipts', 'client_payment_receipts_client_id_clients_id_fk', 'FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action'),
    ('client_payment_receipts', 'client_payment_receipts_contract_id_client_contracts_id_fk', 'FOREIGN KEY (`contract_id`) REFERENCES `client_contracts`(`id`) ON DELETE no action ON UPDATE no action'),
    ('client_payment_receipts', 'client_payment_receipts_registered_by_users_id_fk', 'FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action'),
]

for table_name, constraint_name, fk_def in extra_fks:
    key = f"add_fk_{table_name}.{constraint_name}"
    if key not in processed_constraints:
        out.append(f"-- FK (extra): {constraint_name} em {table_name}")
        out.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
        out.append(f"SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` {fk_def}', 'SELECT 1');")
        out.append("PREPARE stmt FROM @sql;")
        out.append("EXECUTE stmt;")
        out.append("DEALLOCATE PREPARE stmt;")
        out.append("")

out.append("")
out.append("SET FOREIGN_KEY_CHECKS = 1;")
out.append("")
out.append("-- ================================================================")
out.append("-- FIM DO SCRIPT COMPLETO")
out.append("-- Todas as tabelas e colunas do schema estão cobertas")
out.append("-- ================================================================")

with open(OUTPUT_FILE, 'w') as f:
    f.write('\n'.join(out))

print(f"Script gerado: {OUTPUT_FILE}")
print(f"CREATE TABLE: {len(create_tables) + (1 if 'client_contracts' not in processed_creates else 0) + (1 if 'client_payment_receipts' not in processed_creates else 0)}")
print(f"ADD COLUMN: {len(add_columns) + len(extra_cols)}")
print(f"MODIFY: {len(modify_columns)}")
print(f"DROP FK: {len(drop_fks)}")
print(f"DROP COL: {len(drop_columns)}")
print(f"CONSTRAINTS (FK+UNIQUE): {len(add_constraints) + len(extra_fks)}")
print(f"Tabelas: {', '.join(sorted(list(processed_creates) + ['client_contracts', 'client_payment_receipts']))}")
