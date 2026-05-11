# Bug: Data exibida incorretamente nos cards de abastecimento

## Causa raiz:
O VehicleControlPage usa `r.createdAt` em TODOS os lugares onde deveria usar `r.date`:

1. **Filtro por mês/ano** (linha 95): `const d = new Date(r.createdAt)` → deveria ser `r.date`
2. **Cards na listagem** (linha 658): `new Date(r.createdAt).toLocaleDateString("pt-BR")` → deveria ser `r.date`
3. **PDF export** (linha 227): `new Date(r.createdAt).toLocaleDateString("pt-BR")` → deveria ser `r.date`
4. **Excel export** (linha 413): `new Date(r.createdAt).toLocaleDateString("pt-BR")` → deveria ser `r.date`

## Schema:
- `date` = data do abastecimento (informada pelo usuário no formulário)
- `createdAt` = data de criação do registro (automática, timestamp do servidor)

## Solução:
Substituir todas as referências de `r.createdAt` por `r.date` na exibição.
