"""
Gera o script SQL para sanitizar vírgulas em campos numéricos do banco BTREE Ambiental.
Troca ',' por '.' em todos os campos VARCHAR que armazenam valores numéricos.
"""
import re

with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

table_pattern = re.compile(r'export const (\w+) = mysqlTable\("([^"]+)"', re.MULTILINE)
field_pattern = re.compile(r'\t+(\w+): varchar\((?:"([^"]+)", )?{ length: 20 }\)', re.MULTILINE)

tables = list(table_pattern.finditer(content))
results = []

SKIP_KEYWORDS = [
    'plate', 'phone', 'type', 'unit', 'color', 'chain_type', 'document',
    'rg', 'cnpj', 'vehicle_plate', 'license_plate', 'transporter_plate',
    'latitude', 'longitude',  # coords are dots already
]

NUMERIC_KEYWORDS = [
    'cost', 'price', 'amount', 'value', 'rate', 'fee', 'salary', 'wage',
    'total', 'charge', 'revenue', 'profit', 'tax', 'discount', 'balance',
    'debt', 'credit', 'liters', 'liter', 'fuel', 'kg', 'm3', 'volume',
    'weight', 'height', 'width', 'length', 'humidity', 'km', 'odometer',
    'hour', 'stock', 'quantity', 'area', 'distance', 'accumulated',
    'daily', 'residue', 'boleto',
]

for i, table_match in enumerate(tables):
    sql_name = table_match.group(2)
    start = table_match.start()
    end = tables[i+1].start() if i+1 < len(tables) else len(content)
    block = content[start:end]

    fields = field_pattern.findall(block)
    numeric_fields = []
    for ts_field, sql_field in fields:
        col_name = sql_field if sql_field else re.sub(r'([A-Z])', r'_\1', ts_field).lower().lstrip('_')
        if any(skip in col_name for skip in SKIP_KEYWORDS):
            continue
        if any(kw in col_name for kw in NUMERIC_KEYWORDS):
            numeric_fields.append(col_name)

    if numeric_fields:
        results.append((sql_name, numeric_fields))

lines = []
lines.append("-- ============================================================")
lines.append("-- BTREE Ambiental — Script de Sanitização de Campos Numéricos")
lines.append("-- Substitui vírgula por ponto em todos os campos numéricos VARCHAR")
lines.append("-- Execute no phpMyAdmin do Hostinger (banco u629128033_btree_ambienta)")
lines.append("-- IMPORTANTE: Faça backup antes de executar!")
lines.append("-- ============================================================")
lines.append("")
lines.append("START TRANSACTION;")
lines.append("")

total_statements = 0
for table, fields in results:
    lines.append(f"-- Tabela: {table}")
    for field in fields:
        sql = (
            f"UPDATE `{table}` "
            f"SET `{field}` = REPLACE(`{field}`, ',', '.') "
            f"WHERE `{field}` LIKE '%,%';"
        )
        lines.append(sql)
        total_statements += 1
    lines.append("")

lines.append("COMMIT;")
lines.append("")
lines.append(f"-- Total de statements: {total_statements} em {len(results)} tabelas")

output = "\n".join(lines)
with open('scripts/sanitize_numeric_fields.sql', 'w') as f:
    f.write(output)

print(f"Script gerado: scripts/sanitize_numeric_fields.sql")
print(f"Total: {total_statements} UPDATE statements em {len(results)} tabelas")
for t, f in results:
    print(f"  {t}: {f}")
