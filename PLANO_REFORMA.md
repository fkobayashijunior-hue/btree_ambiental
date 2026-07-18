# Plano de Reforma — BTREE Ambiental
**Versão 1.0 — Julho 2026**

---

## Como funciona este plano

Cada fase tem um conjunto de entregas bem definidas. Ao final de cada fase, você receberá:
- ✅ **Resumo do que foi feito** — o que mudou no sistema
- 📋 **Próximos passos** — o que vem a seguir
- 🔧 **Ação necessária sua** — se precisar fazer algo no Hostinger/phpMyAdmin

---

## FASE 1 — Correções Urgentes de Banco
> **Objetivo:** Corrigir os problemas que causam bugs no dia a dia

### 1A — Campos Monetários VARCHAR → DECIMAL
**Problema:** ~80% dos valores em R$ estão salvos como texto. O banco não consegue somar texto corretamente.
**Impacto esperado:** Cálculos corretos no financeiro, abastecimentos e cargas.

Tabelas afetadas:
- `vehicle_records`: fuel_cost, price_per_liter, charged_value
- `extra_expenses`: amount
- `financial_entries`: amount, debit_amount, credit_amount
- `cargo_loads`: net_weight_kg, price_per_unit, total_value
- `machine_fuel`: total_value, price_per_liter
- `equipment_maintenance`: cost
- `fuel_invoices`: total_amount

**Ação necessária no Hostinger:** Executar script SQL de migração (fornecido ao final da fase).

---

### 1B — Criar tabela `work_locations`
**Problema:** O campo `work_location_id` existe em 8 tabelas mas a tabela referenciada não existe.
**Impacto esperado:** Campo "Local de Trabalho" passa a salvar e filtrar corretamente.

Locais iniciais a cadastrar: FAZENDA SIMFLOR, SEDE BTREE ASTORGA, SEDE BTREE ASTORGA-PR, outros.

---

### 1C — FKs e Índices em `cargo_loads`
**Problema:** Tabela mais importante sem integridade referencial e sem índices de busca.
**Impacto esperado:** Cargas não ficam órfãs; filtros por data e status ficam mais rápidos.

---

### 1D — Remover FKs Duplicadas
**Problema:** ~55 tabelas com duas constraints para o mesmo campo.
**Impacto esperado:** INSERT e UPDATE mais rápidos em todo o sistema.

---

## FASE 2 — Consolidação de Módulos
> **Objetivo:** Unificar tabelas duplicadas e limpar o que não é usado

### 2A — Consolidar Abastecimentos
**Problema:** Três tabelas fazem a mesma coisa: `fuel_records` (0 linhas), `machine_fuel` (dados de máquinas), `vehicle_records` (258 linhas — a principal).
**Ação:** Migrar dados de `machine_fuel` para `vehicle_records` com campo de tipo de equipamento. Remover `fuel_records` e `third_party_fuel` (0 linhas).
**Impacto:** Uma única tela e relatório para todos os abastecimentos.

---

### 2B — Consolidar Manutenções
**Problema:** `equipment_maintenance` e `machine_maintenance` fazem a mesma coisa.
**Ação:** Migrar dados de `machine_maintenance` para `equipment_maintenance`. Remover tabelas mortas: `preventive_maintenance_schedules`, `attendance_records`, `cargo_shipments`, `gps_devices`, `gps_alerts`, `gps_hours_log`, `farm_geofences`, `freight_trips`, `auto_freight_trips`.

---

### 2C — Corrigir Campo Destino nas Cargas
**Problema:** O campo "destino" nas cargas é preenchido manualmente porque o sistema não busca de `cargo_destinations`.
**Ação:** Conectar o formulário de nova carga ao cadastro de destinos. Ao selecionar o destino, preencher automaticamente o valor por tonelada/metro.

---

## FASE 3 — Melhorias Funcionais
> **Objetivo:** Funcionalidades que dependem das correções anteriores

### 3A — Dashboard Financeiro Correto
**Depende de:** Fase 1A (campos DECIMAL)
**Entrega:** Totais de receita, despesa e saldo calculados corretamente. Gráficos por categoria e período.

---

### 3B — Fechamento Semanal Consistente
**Depende de:** Fase 1A e 1C
**Entrega:** O que aparece no controle interno é idêntico ao que o cliente vê. Integração automática: ao registrar abastecimento ou manutenção, lançamento financeiro é criado automaticamente.

---

### 3C — Relatório de Cargas por Cliente com Status de Pagamento
**Depende de:** Fase 2C
**Entrega:** PDF com: lista de cargas do período, peso líquido, valor por unidade, total, status de pagamento (pago/pendente/parcialmente abatido), comprovantes.

---

## Registro de Progresso

| Fase | Status | Data | Observações |
|---|---|---|---|
| 1A — Campos Monetários | ⏳ Em andamento | — | — |
| 1B — work_locations | ⏳ Aguardando | — | — |
| 1C — FKs e Índices | ⏳ Aguardando | — | — |
| 1D — FKs Duplicadas | ⏳ Aguardando | — | — |
| 2A — Consolidar Abastecimentos | ⏳ Aguardando | — | — |
| 2B — Consolidar Manutenções | ⏳ Aguardando | — | — |
| 2C — Campo Destino Cargas | ⏳ Aguardando | — | — |
| 3A — Dashboard Financeiro | ⏳ Aguardando | — | — |
| 3B — Fechamento Semanal | ⏳ Aguardando | — | — |
| 3C — Relatório PDF Cargas | ⏳ Aguardando | — | — |

---

## Regras de Comunicação

Ao final de cada fase entregue:

```
✅ ENTREGA — [Nome da Fase]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O QUE FOI FEITO:
- [item 1]
- [item 2]

AÇÃO NECESSÁRIA (se houver):
- [SQL para executar no phpMyAdmin]
- [Configuração no Hostinger]

PRÓXIMOS PASSOS:
- [Fase seguinte]
- [O que você pode testar agora]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
