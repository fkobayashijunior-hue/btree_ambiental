#!/usr/bin/env python3
"""
Gera um script SQL consolidado SEGURO para a Hostinger.
V2 - Melhor parsing para capturar TODAS as tabelas e statements.
"""

import re
import os

INPUT_FILE = "/home/ubuntu/btree-ambiental/ALL_MIGRATIONS_CONSOLIDATED.sql"
OUTPUT_FILE = "/home/ubuntu/btree-ambiental/HOSTINGER_SAFE_MIGRATION.sql"

with open(INPUT_FILE, 'r') as f:
    raw_content = f.read()

# Remove statement-breakpoint comments
raw_content = raw_content.replace('--> statement-breakpoint', '')

# Remove migration header comments
raw_content = re.sub(r'-- =+\n-- Migration:.*?\n-- =+\n', '\n', raw_content)

# Split into individual statements by semicolon (but careful with CONSTRAINT definitions)
# We need to split on ; that are NOT inside parentheses
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
        if stmt and not all(l.strip().startswith('--') or l.strip() == '' for l in stmt.split('\n')):
            # Remove leading comment-only lines
            lines = stmt.split('\n')
            clean_lines = []
            found_sql = False
            for line in lines:
                stripped = line.strip()
                if not found_sql and (stripped.startswith('--') or stripped == ''):
                    continue  # Skip leading comments
                found_sql = True
                clean_lines.append(line)
            clean_stmt = '\n'.join(clean_lines).strip()
            if clean_stmt:
                statements.append(clean_stmt)
        current = []
    else:
        current.append(char)

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

created_tables = set()
processed_alters = set()
skipped = []

for stmt in statements:
    upper = stmt.upper().strip()
    
    # Handle CREATE TABLE
    create_match = re.match(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', stmt, re.IGNORECASE)
    if create_match:
        table_name = create_match.group(1)
        if table_name not in created_tables:
            created_tables.add(table_name)
            safe_sql = re.sub(
                r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?',
                r'CREATE TABLE IF NOT EXISTS `\1`',
                stmt,
                count=1,
                flags=re.IGNORECASE
            )
            output_lines.append(f"-- Tabela: {table_name}")
            output_lines.append(safe_sql + ";")
            output_lines.append("")
        continue
    
    # Handle ALTER TABLE
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
            if key not in processed_alters:
                processed_alters.add(key)
                output_lines.append(f"-- DROP FK: {fk_name} de {table_name}")
                output_lines.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{fk_name}');")
                output_lines.append(f"SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `{table_name}` DROP FOREIGN KEY `{fk_name}`', 'SELECT 1');")
                output_lines.append("PREPARE stmt FROM @sql;")
                output_lines.append("EXECUTE stmt;")
                output_lines.append("DEALLOCATE PREPARE stmt;")
                output_lines.append("")
            continue
        
        # DROP COLUMN
        drop_col = re.match(r'DROP\s+COLUMN\s+`?(\w+)`?', rest, re.IGNORECASE)
        if drop_col:
            col_name = drop_col.group(1)
            key = f"drop_col_{table_name}.{col_name}"
            if key not in processed_alters:
                processed_alters.add(key)
                output_lines.append(f"-- DROP COLUMN: {col_name} de {table_name}")
                output_lines.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
                output_lines.append(f"SET @sql = IF(@col_exists > 0, 'ALTER TABLE `{table_name}` DROP COLUMN `{col_name}`', 'SELECT 1');")
                output_lines.append("PREPARE stmt FROM @sql;")
                output_lines.append("EXECUTE stmt;")
                output_lines.append("DEALLOCATE PREPARE stmt;")
                output_lines.append("")
            continue
        
        # MODIFY COLUMN (always safe to re-run)
        if rest_upper.startswith('MODIFY'):
            output_lines.append(f"-- MODIFY em {table_name}")
            output_lines.append(stmt + ";")
            output_lines.append("")
            continue
        
        # ADD CONSTRAINT ... FOREIGN KEY
        add_fk = re.match(r'ADD\s+CONSTRAINT\s+`?(\w+)`?\s+(FOREIGN\s+KEY.+)', rest, re.IGNORECASE | re.DOTALL)
        if add_fk:
            constraint_name = add_fk.group(1)
            fk_def = add_fk.group(2).strip()
            key = f"add_fk_{table_name}.{constraint_name}"
            if key not in processed_alters:
                processed_alters.add(key)
                # Escape single quotes in the FK definition for PREPARE
                fk_def_escaped = fk_def.replace("'", "\\'")
                output_lines.append(f"-- FK: {constraint_name} em {table_name}")
                output_lines.append(f"SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
                output_lines.append(f"SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` {fk_def_escaped}', 'SELECT 1');")
                output_lines.append("PREPARE stmt FROM @sql;")
                output_lines.append("EXECUTE stmt;")
                output_lines.append("DEALLOCATE PREPARE stmt;")
                output_lines.append("")
            continue
        
        # ADD CONSTRAINT ... UNIQUE
        add_unique = re.match(r'ADD\s+CONSTRAINT\s+`?(\w+)`?\s+UNIQUE\s*\((.+?)\)', rest, re.IGNORECASE)
        if add_unique:
            constraint_name = add_unique.group(1)
            cols = add_unique.group(2)
            key = f"add_unique_{table_name}.{constraint_name}"
            if key not in processed_alters:
                processed_alters.add(key)
                output_lines.append(f"-- UNIQUE: {constraint_name} em {table_name}")
                output_lines.append(f"SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME = '{constraint_name}');")
                output_lines.append(f"SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `{table_name}` ADD CONSTRAINT `{constraint_name}` UNIQUE({cols})', 'SELECT 1');")
                output_lines.append("PREPARE stmt FROM @sql;")
                output_lines.append("EXECUTE stmt;")
                output_lines.append("DEALLOCATE PREPARE stmt;")
                output_lines.append("")
            continue
        
        # ADD COLUMN (without CONSTRAINT keyword)
        add_col = re.match(r'ADD\s+(?:COLUMN\s+)?`(\w+)`\s+(.+)', rest, re.IGNORECASE | re.DOTALL)
        if add_col and 'CONSTRAINT' not in rest_upper and 'FOREIGN KEY' not in rest_upper:
            col_name = add_col.group(1)
            col_def = add_col.group(2).strip()
            key = f"add_col_{table_name}.{col_name}"
            if key not in processed_alters:
                processed_alters.add(key)
                # Escape single quotes
                col_def_escaped = col_def.replace("'", "\\'")
                output_lines.append(f"-- ADD COLUMN: {col_name} em {table_name}")
                output_lines.append(f"SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}' AND COLUMN_NAME = '{col_name}');")
                output_lines.append(f"SET @sql = IF(@col_exists = 0, 'ALTER TABLE `{table_name}` ADD `{col_name}` {col_def_escaped}', 'SELECT 1');")
                output_lines.append("PREPARE stmt FROM @sql;")
                output_lines.append("EXECUTE stmt;")
                output_lines.append("DEALLOCATE PREPARE stmt;")
                output_lines.append("")
            continue
        
        # Fallback: include as-is
        output_lines.append(f"-- ALTER genérico em {table_name}")
        output_lines.append(stmt + ";")
        output_lines.append("")
        continue
    
    # Skip pure comments
    if upper.startswith('--'):
        continue
    
    skipped.append(stmt[:80])

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
if skipped:
    print(f"\nStatements ignorados ({len(skipped)}):")
    for s in skipped:
        print(f"  - {s}")
