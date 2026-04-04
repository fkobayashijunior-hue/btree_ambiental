# Notas de Implementação - 04/04/2026

## Estado Atual
- Portal do Cliente: cargas aparecem OK (fix aplicado)
- Destinos: fix de colunas notes/created_by aplicado
- Replantio: backend OK (addReplanting), falta tela admin
- Pagamentos: backend OK (addPayment), falta tela admin
- Portal do Cliente: já tem abas Replantio e Pagamentos (mostra dados)

## O que precisa ser feito:
1. Tela admin para lançar Replantios (vinculado a cliente)
2. Tela admin para lançar Pagamentos (vinculado a cliente)
3. Procedures de listagem/edição/exclusão de replantios e pagamentos
4. Testar cadastro de destinos

## Estrutura existente:
- Schema: replantingRecords, clientPayments já definidos
- Router: clientPortal.addReplanting, clientPortal.addPayment já existem
- Frontend portal: já mostra replantios e pagamentos
- Falta: tela admin para CRUD de replantios e pagamentos

## Abordagem:
- Criar uma nova página "ClientManagement" ou adicionar na ClientsPage
- Melhor: criar uma página separada /clientes/:id com abas (Dados, Replantios, Pagamentos)
- Ou: adicionar botões na lista de clientes para abrir modais de replantio/pagamento
- Mais simples: adicionar na própria ClientsPage botões de ação por cliente
