# Mudanças necessárias no ClientPortal.tsx

## Resumo das alterações solicitadas:
1. **Remover botão "Marcar Pago"** de toda a área do cliente
2. **Alinhar badges** (entregue, finalizado, pendente de pagamento) na mesma linha
3. **Trocar "Nota" por Código do cliente**: SF001, SF002... (SIMFLOR), GW001, GW002... (Fazenda GW)
4. **Renomear pesos**: "Peso Bruto Saída" → "Peso Total", "Peso Bruto Chegada" → "Peso Tara"
5. **Fechamentos expandíveis**: botão/seta para abrir lista de cargas do fechamento (igual ao PDF)
6. **Cabeçalho completo BTREE**: logo maior, botão site, botão contatos
7. **Logo do cliente SIMA** abaixo do cabeçalho com nome da fazenda SIMFLOR
   - Logo SIMA salva em: /home/ubuntu/btree-ambiental/client/public/sima-logo.webp
   - URL do site SIMA: https://sima.org.br
   - Página Fazenda SIMFLOR: https://sima.org.br/fazenda-simflor.html

## Também renomear no CargoControl.tsx:
- "Peso Bruto Saída" → "Peso Total"
- "Peso Bruto Chegada" → "Peso Tara"

## Logo SIMA:
- Arquivo local: /home/ubuntu/btree-ambiental/client/public/sima-logo.webp
- É o logo com triângulos dourados/prateados e texto "SIMA"
- Usar como logo do cliente SIMFLOR no portal

## Estrutura do cabeçalho desejado:
- Logo BTREE maior (lado esquerdo)
- Nome do cliente + fazenda (centro ou abaixo)
- Botão "Nosso Site" → btreeambiental.com
- Botão "Contato" → WhatsApp ou email
- Botão Voltar / Sair (já existe)

## Código do cliente (substituir campo Nota):
- SIMFLOR: SF001, SF002, SF003...
- Fazenda GW: GW001, GW002, GW003...
- Outros clientes: usar prefixo das iniciais + número sequencial
- Precisa ser gerado automaticamente ou salvo no banco?
  → Gerar baseado no ID da carga + prefixo do cliente

## Fechamentos expandíveis:
- Manter PDF existente
- Adicionar seta/chevron para expandir e ver lista de cargas do fechamento
- Mostrar: data, destino, peso líquido, valor por tonelada, valor total
