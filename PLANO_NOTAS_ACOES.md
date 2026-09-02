# Plano: Reestruturação do fluxo de Notas/Ações

## Objetivo
1. Ao criar Nova Carga → gerar ação automaticamente (sem precisar ir ao Controle de Notas antes)
2. Na carga → upload da NF em PDF (caso tenha nota)
3. Controle de Notas → relatório simplificado em formato planilha (linhas/colunas) com:
   - Coluna: quantidade da nota (m³ ou ton)
   - Coluna: peso/metro real da carga
   - Resumo com totais para gerar notas de correção
   - Filtros por local e datas

## Arquivos a modificar

### Backend
- `server/routers/cargoLoads.ts` — create: gerar ação automaticamente ao salvar carga (usar getNextActionCode + criar fiscal_note com dados da carga)
- `server/routers/fiscalNotes.ts` — já tem getNextActionCode, create, list, markAsUsed, update, release, delete, stats

### Frontend
- `client/src/pages/CargoControl.tsx` — formulário Nova Carga:
  - Remover seleção manual de ação (availableNotes)
  - Adicionar prévia da próxima ação (ex: "AC-00045")
  - Adicionar campo upload NF em PDF (opcional)
  - handleSubmit: passar invoiceNumber + invoiceFileBase64 para o create
- `client/src/pages/FiscalNotesPage.tsx` — transformar em relatório-planilha:
  - Tabela com colunas: Data, Ação, NF, Local, Destino, Qtd Nota, Qtd Real, Diferença
  - Filtros: local (workLocation), data início/fim
  - Resumo: totais de qtd nota vs real por tipo (m³/ton)
  - Manter ações: editar, liberar, excluir, ver arquivo

## Decisões do usuário
- Ação gerada ao SALVAR a carga (não ao abrir formulário) — evita ações órfãs
- Dados da ação vêm da carga (volume/peso e data) automaticamente
- Campo NF: apenas número + upload PDF (ambos opcionais)
- Controle de Notas: colunas qtd nota (m³/ton) + qtd real da carga + totais
- Filtros por local e datas

## Estado atual
- Mapeamento completo feito
- Próximo: implementar backend (cargoLoads.create) e frontend (CargoControl + FiscalNotesPage)
