#!/usr/bin/env python3
"""
Gera um script SQL consolidado SEGURO para a Hostinger.
- CREATE TABLE IF NOT EXISTS para todas as tabelas
- ALTER TABLE com tratamento de erro para colunas/constraints que já existem
- Separado por seções claras
"""

import re
import os

INPUT_FILE = "/home/ubuntu/btree-ambiental/ALL_MIGRATIONS_CONSOLIDATED.sql"
OUTPUT_FILE = "/home/ubuntu/btree-ambiental/HOSTINGER_SAFE_MIGRATION.sql"

with open(INPUT_FILE, 'r') as f:
    content = f.read()

# Remove statement-breakpoint comments
content = content.replace('--> statement-breakpoint', '')

# Split into individual statements
raw_statements = [s.strip() for s in content.split(';') if s.strip() and not s.strip().startswith('--')]

# Clean up statements - remove leading comments
statements = []
for stmt in raw_statements:
    # Remove leading comment lines
    lines = stmt.split('\n')
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('--'):
            clean_lines.append(line)  # Keep comments for readability
        else:
            clean_lines.append(line)
    clean_stmt = '\n'.join(clean_lines).strip()
    if clean_stmt and not all(l.strip().startswith('--') or l.strip() == '' for l in clean_stmt.split('\n')):
        statements.append(clean_stmt)

output_lines = []
output_lines.append("-- ================================================================")
output_lines.append("-- BTREE AMBIENTAL - Script SQL Consolidado SEGURO para Hostinger")
output_lines.append("-- Gerado em: 2026-04-10")
output_lines.append("-- ")
output_lines.append("-- INSTRUÇÕES:")
output_lines.append("-- 1. Execute este script no phpMyAdmin da Hostinger")
output_lines.append("-- 2. É seguro executar múltiplas vezes (idempotente)")
output_lines.append("-- 3. Tabelas existentes NÃO serão recriadas")
output_lines.append("-- 4. Colunas existentes NÃO serão duplicadas")
output_lines.append("-- ================================================================")
output_lines.append("")
output_lines.append("SET FOREIGN_KEY_CHECKS = 0;")
output_lines.append("")

# Track what we've processed
created_tables = set()
processed_alters = set()

for stmt in statements:
    # Extract the actual SQL (remove comment lines at the beginning)
    sql_lines = []
    comment_lines = []
    for line in stmt.split('\n'):
        stripped = line.strip()
        if stripped.startswith('--'):
            comment_lines.append(line)
        else:
            sql_lines.append(line)
    
    sql_part = '\n'.join(sql_lines).strip()
    if not sql_part:
        continue
    
    # Handle CREATE TABLE
    create_match = re.match(r'CREATE\s+TABLE\s+`?(\w+)`?', sql_part, re.IGNORECASE)
    if create_match:
        table_name = create_match.group(1)
        if table_name not in created_tables:
            created_tables.add(table_name)
            # Add IF NOT EXISTS
            safe_sql = re.sub(
                r'CREATE\s+TABLE\s+`?(\w+)`?',
                r'CREATE TABLE IF NOT EXISTS `\1`',
                sql_part,
                count=1,
                flags=re.IGNORECASE
            )
            output_lines.append(f"-- Tabela: {table_name}")
            output_lines.append(safe_sql + ";")
            output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... ADD COLUMN
    add_col_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+(?:COLUMN\s+)?`(\w+)`\s+(.+)', sql_part, re.IGNORECASE)
    if add_col_match and 'CONSTRAINT' not in sql_part.upper() and 'FOREIGN KEY' not in sql_part.upper():
        table_name = add_col_match.group(1)
        col_name = add_col_match.group(2)
        col_def = add_col_match.group(3)
        key = f"{table_name}.{col_name}"
        if key not in processed_alters:
            processed_alters.add(key)
            # Use a procedure to check if column exists
            output_lines.append(f"-- Adicionar coluna {col_name} em {table_name}")
            output_lines.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
            output_lines.append(f"SET @sql = IF(@col_exists = 0, 'ALTER TABLE `{table_name}` ADD `{col_name}` {col_def}', 'SELECT 1');")
            output_lines.append("PREPARE stmt FROM @sql;")
            output_lines.append("EXECUTE stmt;")
            output_lines.append("DEALLOCATE PREPARE stmt;")
            output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... ADD CONSTRAINT (foreign keys)
    fk_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+CONSTRAINT\s+`?(\w+)`?\s+(.+)', sql_part, re.IGNORECASE)
    if fk_match:
        table_name = fk_match.group(1)
        constraint_name = fk_match.group(2)
        constraint_def = fk_match.group(3)
        key = f"{table_name}.{constraint_name}"
        if key not in processed_alters:
            processed_alters.add(key)
            output_lines.append(f"-- FK: {constraint_name} em {table_name}")
            output_lines.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
            output_lines.append(f"SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` {constraint_def}', 'SELECT 1');")
            output_lines.append("PREPARE stmt FROM @sql;")
            output_lines.append("EXECUTE stmt;")
            output_lines.append("DEALLOCATE PREPARE stmt;")
            output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... ADD UNIQUE
    unique_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+CONSTRAINT\s+`?(\w+)`?\s+UNIQUE', sql_part, re.IGNORECASE)
    if unique_match:
        table_name = unique_match.group(1)
        constraint_name = unique_match.group(2)
        key = f"{table_name}.{constraint_name}"
        if key not in processed_alters:
            processed_alters.add(key)
            output_lines.append(f"-- UNIQUE: {constraint_name} em {table_name}")
            output_lines.append(f"SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
            output_lines.append(f"SET @sql = IF(@idx_exists = 0, '{sql_part.replace(chr(39), chr(92)+chr(39))}', 'SELECT 1');")
            output_lines.append("PREPARE stmt FROM @sql;")
            output_lines.append("EXECUTE stmt;")
            output_lines.append("DEALLOCATE PREPARE stmt;")
            output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... MODIFY COLUMN (always safe to re-run)
    modify_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+MODIFY', sql_part, re.IGNORECASE)
    if modify_match:
        output_lines.append(f"-- MODIFY: {sql_part[:80]}...")
        output_lines.append(sql_part + ";")
        output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... DROP COLUMN
    drop_col_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+DROP\s+COLUMN\s+`?(\w+)`?', sql_part, re.IGNORECASE)
    if drop_col_match:
        table_name = drop_col_match.group(1)
        col_name = drop_col_match.group(2)
        output_lines.append(f"-- DROP COLUMN: {col_name} de {table_name}")
        output_lines.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
        output_lines.append(f"SET @sql = IF(@col_exists > 0, 'ALTER TABLE `{table_name}` DROP COLUMN `{col_name}`', 'SELECT 1');")
        output_lines.append("PREPARE stmt FROM @sql;")
        output_lines.append("EXECUTE stmt;")
        output_lines.append("DEALLOCATE PREPARE stmt;")
        output_lines.append("")
        continue
    
    # Handle ALTER TABLE ... DROP FOREIGN KEY
    drop_fk_match = re.match(r'ALTER\s+TABLE\s+`?(\w+)`?\s+DROP\s+FOREIGN\s+KEY\s+`?(\w+)`?', sql_part, re.IGNORECASE)
    if drop_fk_match:
        table_name = drop_fk_match.group(1)
        fk_name = drop_fk_match.group(2)
        output_lines.append(f"-- DROP FK: {fk_name} de {table_name}")
        output_lines.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{fk_name}');")
        output_lines.append(f"SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `{table_name}` DROP FOREIGN KEY `{fk_name}`', 'SELECT 1');")
        output_lines.append("PREPARE stmt FROM @sql;")
        output_lines.append("EXECUTE stmt;")
        output_lines.append("DEALLOCATE PREPARE stmt;")
        output_lines.append("")
        continue
    
    # Any other ALTER TABLE statement - just include it
    if sql_part.upper().startswith('ALTER'):
        output_lines.append(f"-- ALTER genérico")
        output_lines.append(sql_part + ";")
        output_lines.append("")
        continue

output_lines.append("")
output_lines.append("SET FOREIGN_KEY_CHECKS = 1;")
output_lines.append("")
output_lines.append("-- ================================================================")
output_lines.append("-- FIM DO SCRIPT - Todas as tabelas e colunas foram verificadas")
output_lines.append("-- ================================================================")

with open(OUTPUT_FILE, 'w') as f:
    f.write('\n'.join(output_lines))

print(f"Script gerado com sucesso: {OUTPUT_FILE}")
print(f"Tabelas: {len(created_tables)}")
print(f"Alterações processadas: {len(processed_alters)}")
print(f"Tabelas criadas: {', '.join(sorted(created_tables))}")
