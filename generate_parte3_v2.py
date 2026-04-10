#!/usr/bin/env python3
"""
Gera PARTE3 usando PROCEDURE que verifica se coluna e constraint existem
antes de tentar criar a FK. Isso evita o erro #1072.
"""
import re

INPUT = "/home/ubuntu/btree-ambiental/PARTE3_CONSTRAINTS.sql"
OUTPUT = "/home/ubuntu/btree-ambiental/PARTE3_CONSTRAINTS_V2.sql"

with open(INPUT, 'r') as f:
    content = f.read()

# Parse all FK and UNIQUE constraints from the file
# Pattern: table_name, constraint_name, column_name (from FK definition), full FK definition
fk_entries = []
unique_entries = []

lines = content.split('\n')
i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # Match SET @sql = IF(@fk_exists = 0, 'ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...
    if "ADD CONSTRAINT" in line and "FOREIGN KEY" in line:
        # Extract: table, constraint, fk_column, referenced table
        m = re.search(
            r"ALTER TABLE `(\w+)` ADD CONSTRAINT `(\w+)` FOREIGN KEY \(`(\w+)`\) REFERENCES `(\w+)`\(`(\w+)`\)(.*?)'",
            line
        )
        if m:
            table = m.group(1)
            constraint = m.group(2)
            fk_col = m.group(3)
            ref_table = m.group(4)
            ref_col = m.group(5)
            on_clause = m.group(6).strip()
            fk_entries.append({
                'table': table,
                'constraint': constraint,
                'fk_col': fk_col,
                'ref_table': ref_table,
                'ref_col': ref_col,
                'on_clause': on_clause
            })
    
    # Match UNIQUE constraints
    if "ADD CONSTRAINT" in line and "UNIQUE" in line:
        m = re.search(
            r"ALTER TABLE `(\w+)` ADD CONSTRAINT `(\w+)` UNIQUE\((.+?)\)",
            line
        )
        if m:
            table = m.group(1)
            constraint = m.group(2)
            cols = m.group(3)
            unique_entries.append({
                'table': table,
                'constraint': constraint,
                'cols': cols
            })
    
    i += 1

print(f"Found {len(fk_entries)} FK entries and {len(unique_entries)} UNIQUE entries")

# Generate the output using a stored procedure approach
out = []
out.append("-- ================================================================")
out.append("-- BTREE AMBIENTAL - PARTE 3: CONSTRAINTS (V2 - com verificação de coluna)")
out.append("-- Usa PROCEDURE para verificar se coluna existe antes de criar FK")
out.append("-- ================================================================")
out.append("")
out.append("SET FOREIGN_KEY_CHECKS = 0;")
out.append("")
out.append("-- Criar procedure auxiliar")
out.append("DROP PROCEDURE IF EXISTS add_fk_if_col_exists;")
out.append("")
out.append("DELIMITER //")
out.append("CREATE PROCEDURE add_fk_if_col_exists(")
out.append("  IN p_table VARCHAR(100),")
out.append("  IN p_constraint VARCHAR(200),")
out.append("  IN p_column VARCHAR(100),")
out.append("  IN p_ref_table VARCHAR(100),")
out.append("  IN p_ref_col VARCHAR(100),")
out.append("  IN p_on_clause VARCHAR(200)")
out.append(")")
out.append("BEGIN")
out.append("  DECLARE col_exists INT DEFAULT 0;")
out.append("  DECLARE fk_exists INT DEFAULT 0;")
out.append("  DECLARE ref_col_exists INT DEFAULT 0;")
out.append("")
out.append("  -- Check if the column exists in the source table")
out.append("  SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS")
out.append("    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column;")
out.append("")
out.append("  -- Check if the referenced column exists")
out.append("  SELECT COUNT(*) INTO ref_col_exists FROM INFORMATION_SCHEMA.COLUMNS")
out.append("    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_ref_table AND COLUMN_NAME = p_ref_col;")
out.append("")
out.append("  -- Check if the constraint already exists")
out.append("  SELECT COUNT(*) INTO fk_exists FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS")
out.append("    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_constraint;")
out.append("")
out.append("  IF col_exists > 0 AND ref_col_exists > 0 AND fk_exists = 0 THEN")
out.append("    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_constraint,")
out.append("      '` FOREIGN KEY (`', p_column, '`) REFERENCES `', p_ref_table, '`(`', p_ref_col, '`) ', p_on_clause);")
out.append("    PREPARE stmt FROM @ddl;")
out.append("    EXECUTE stmt;")
out.append("    DEALLOCATE PREPARE stmt;")
out.append("  END IF;")
out.append("END //")
out.append("DELIMITER ;")
out.append("")

# Generate FK calls
out.append("-- ================================================================")
out.append("-- FOREIGN KEYS")
out.append("-- ================================================================")
out.append("")

for fk in fk_entries:
    on_clause = fk['on_clause']
    # Clean up on_clause
    if not on_clause:
        on_clause = "ON DELETE no action ON UPDATE no action"
    out.append(f"CALL add_fk_if_col_exists('{fk['table']}', '{fk['constraint']}', '{fk['fk_col']}', '{fk['ref_table']}', '{fk['ref_col']}', '{on_clause}');")

out.append("")

# Generate UNIQUE constraints using PREPARE (these don't have the column issue)
if unique_entries:
    out.append("-- ================================================================")
    out.append("-- UNIQUE CONSTRAINTS")
    out.append("-- ================================================================")
    out.append("")
    for u in unique_entries:
        out.append(f"SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{u['table']}' AND CONSTRAINT_NAME = '{u['constraint']}');")
        out.append(f"SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `{u['table']}` ADD CONSTRAINT `{u['constraint']}` UNIQUE({u['cols']})', 'SELECT 1');")
        out.append("PREPARE stmt FROM @sql;")
        out.append("EXECUTE stmt;")
        out.append("DEALLOCATE PREPARE stmt;")
        out.append("")

out.append("-- Limpar procedure auxiliar")
out.append("DROP PROCEDURE IF EXISTS add_fk_if_col_exists;")
out.append("")
out.append("SET FOREIGN_KEY_CHECKS = 1;")
out.append("")
out.append("-- ================================================================")
out.append("-- FIM DA PARTE 3")
out.append("-- ================================================================")

with open(OUTPUT, 'w') as f:
    f.write('\n'.join(out))

print(f"Script gerado: {OUTPUT}")
print(f"FKs: {len(fk_entries)}, UNIQUEs: {len(unique_entries)}")
