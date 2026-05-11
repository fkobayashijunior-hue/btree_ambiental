# Diagnóstico: Fornecedor SIMFLOR não aparece no Controle de Abastecimento

## Análise do código:

1. VehicleControlPage usa `trpc.fuelSuppliers.listActive.useQuery()` - busca TODOS os fornecedores ativos
2. O filtro no frontend é: `fuelSuppliersList.filter(s => s.locationType === form.fuelLocation)`
3. O form.fuelLocation default é "simflor"
4. O fornecedor "DISTRIBUIDORA DE COMBUSTÍVEIS BISCAIA LTDA" está cadastrado como locationType = "simflor"

## Problema identificado:

Olhando o screenshot do usuário:
- Quando seleciona "SIMFLOR (tanque fazenda)", só aparece a Biscaia
- A Unipetro está como "Sede Astorga" - correto, não deve aparecer em SIMFLOR

Na verdade o filtro ESTÁ FUNCIONANDO CORRETAMENTE! O usuário cadastrou a Biscaia como SIMFLOR e ela aparece.
O problema é que o usuário esperava ver TAMBÉM a Unipetro (que está como Astorga).

WAIT - relendo a mensagem: "eu cadastrei o distribuidor da simflor, mas ele não está aparecendo no controle de abastecimento"
- Ele pode estar dizendo que cadastrou um fornecedor para SIMFLOR mas não aparece.
- Olhando a screenshot do controle de abastecimento: mostra APENAS "DISTRIBUIDORA DE COMBUSTÍVEIS BISCAIA LTDA (R$ 5.70/L)" 
- Mas na página de fornecedores, a Biscaia está como SIMFLOR e a Unipetro como Sede Astorga

Então o filtro está correto! A Biscaia aparece quando seleciona SIMFLOR.
O problema pode ser que o usuário esperava que a Unipetro aparecesse quando seleciona "Sede Astorga".

Vou verificar se o dropdown de "Local de Abastecimento" tem a opção "Sede Astorga".
