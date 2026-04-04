# Diagnóstico Portal do Cliente - Fazenda GW

## Dados no banco Hostinger:

### Clientes:
- id=2, name="Fazenda GW" (DUPLICADO)
- id=3, name="Fazenda GW" (DUPLICADO)

### Cargas (cargo_loads):
- Cargas id 3-10: client_id=3, client_name="Fazenda GW", destination="Lobato Líder/Lobato - Líder", destination_id=NULL
- Cargas id 1-2: client_id=NULL, client_name="Família Molina"/"TESTE"

### Destinos (cargo_destinations):
- id=1, name="Lobato Líder", client_id=NULL

### Problema:
O portal do cliente faz login com email. Se o email está no cliente id=2, mas as cargas estão vinculadas ao id=3, o filtro não encontra nada.

### Solução:
1. Verificar qual cliente tem o email configurado (id=2 ou id=3)
2. Atualizar as cargas para apontar para o cliente correto
3. OU: melhorar o filtro para buscar por nome também (já faz isso no código)

### Hipótese principal:
O filtro por nome JÁ existe no código (linha 94: clientName.toLowerCase().includes(clientNameLower))
Mas o problema pode ser que o login retorna clientId=2, e as cargas têm client_id=3.
O nome "Fazenda GW" deveria casar, mas preciso verificar se o login está retornando o cliente correto.
