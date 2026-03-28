# Guia de Próximos Passos — Módulo GPS BTREE Ambiental

**Data:** 28/03/2026  
**Sistema:** BTREE Ambiental (Aza Connect)  
**Hardware:** 10x EC33 QUECTEL (protocolo GT06)  
**SIM:** EMnify quadri-band  
**Servidor GPS:** Traccar v6 — VPS Hostinger `82.29.62.204:8082`

---

## Status Atual

| Item | Status |
|------|--------|
| Servidor Traccar no VPS | Operacional |
| Conta admin Traccar criada | Concluído |
| Token API configurado na Hostinger | Concluído |
| Backend BTREE com autenticação Bearer Token | Concluído |
| Tabelas GPS no banco Manus (dev) | Concluídas |
| Tabelas GPS no banco Hostinger (produção) | **Pendente** |
| Chips EMnify ativados | **Aguardando provedor** |
| Dispositivos EC33 configurados | **Aguardando chips** |
| Dispositivos cadastrados no Traccar | 1 de 10 (teste) |
| Vinculação GPS ↔ Equipamentos no BTREE | **Pendente** |

---

## Passo 1 — Executar SQL no Banco de Produção (Hostinger)

Antes de qualquer outra coisa, é necessário criar as tabelas GPS no banco MySQL de produção.

**Como executar:**

1. Acesse o painel Hostinger → **Bancos de dados** → **phpMyAdmin**
2. Selecione o banco `u629128033_btree`
3. Clique na aba **SQL**
4. Cole o conteúdo do arquivo `ATUALIZACAO_GPS_HOSTINGER.sql` e clique em **Executar**

O script cria 4 tabelas:
- `gps_device_links` — vinculação rastreador ↔ equipamento
- `gps_hours_log` — horas de ignição por dia (calculadas automaticamente)
- `preventive_maintenance_plans` — planos de manutenção por horímetro
- `preventive_maintenance_alerts` — alertas gerados automaticamente

---

## Passo 2 — Ativar os Chips EMnify

Os 10 chips EMnify precisam ser ativados pelo provedor antes de configurar os dispositivos.

**Contato EMnify:** acesse o portal em [https://www.emnify.com](https://www.emnify.com) com a conta cadastrada.

**Informações necessárias que você deve obter:**

| Dado | Descrição |
|------|-----------|
| **Número do chip (ICCID)** | Impresso no cartão SIM (19-20 dígitos) |
| **APN** | Endereço do ponto de acesso (ex: `em` ou `emnify`) |
| **Usuário APN** | Geralmente vazio ou `eseye` |
| **Senha APN** | Geralmente vazia |
| **Número de telefone** | Para envio de SMS de configuração |

> **Dica:** Na plataforma EMnify, após ativar os chips, acesse cada SIM e anote o número MSISDN (número de telefone internacional, ex: +5511999999999). Esse número é usado para enviar os comandos SMS de configuração ao EC33.

---

## Passo 3 — Configurar os Dispositivos EC33 via SMS

Com os chips ativados e os números em mãos, envie os seguintes comandos SMS para cada dispositivo. Os comandos devem ser enviados **na ordem indicada**.

### 3.1 — Configurar APN (dados móveis)

```
APN,<apn_emnify>#
```

Exemplo com APN `em`:
```
APN,em#
```

Se o APN exigir usuário e senha:
```
APN,<apn>,<usuario>,<senha>#
```

### 3.2 — Configurar o Servidor Traccar

```
SERVER,1,82.29.62.204,5023,0#
```

Explicação dos parâmetros:
- `1` = protocolo TCP (recomendado)
- `82.29.62.204` = IP do VPS Hostinger com Traccar
- `5023` = porta GT06 no Traccar
- `0` = sem SSL (conexão direta)

### 3.3 — Definir Intervalo de Atualização

```
TIMER,30#
```

Envia posição a cada 30 segundos quando em movimento. Para economizar dados quando parado, use também:

```
SLEEP,1,300#
```

(entra em modo sleep após 1 minuto parado, acorda a cada 300 segundos)

### 3.4 — Verificar Configuração

Após enviar os comandos, aguarde 2-3 minutos e envie:

```
STATUS#
```

O dispositivo responderá com um SMS contendo IP do servidor, sinal GSM, tensão da bateria e status do GPS.

### 3.5 — Reiniciar o Dispositivo

```
RESET#
```

---

## Passo 4 — Cadastrar os 9 Dispositivos Restantes no Traccar

Acesse o Traccar em `http://82.29.62.204:8082` com:
- **E-mail:** fkobayashijunior@gmail.com
- **Senha:** Btree@2026gps

Para cada dispositivo EC33:

1. Clique em **"+"** (Adicionar dispositivo)
2. **Nome:** nome do equipamento (ex: "Trator John Deere", "Motosserra 01")
3. **Identificador:** IMEI do dispositivo (15 dígitos, impresso no aparelho)
4. Clique em **Salvar**

> O IMEI fica na etiqueta do dispositivo ou pode ser obtido enviando o SMS: `IMEI#`

---

## Passo 5 — Vincular GPS aos Equipamentos no BTREE

Com os dispositivos aparecendo online no Traccar:

1. Acesse o sistema BTREE → **Rastreamento GPS**
2. Clique na aba **"Vincular GPS"**
3. Para cada equipamento, selecione o dispositivo Traccar correspondente
4. Clique em **"Vincular"**

---

## Passo 6 — Configurar Planos de Manutenção Preventiva

Na aba **"Manutenção Preventiva"** do módulo GPS:

1. Selecione o equipamento
2. Clique em **"+ Novo Plano"**
3. Configure os intervalos recomendados:

| Equipamento | Manutenção | Intervalo |
|-------------|-----------|-----------|
| Trator | Troca de óleo | 250 horas |
| Trator | Engraxamento | 50 horas |
| Trator | Filtro de ar | 100 horas |
| Motosserra | Lubrificação corrente | 8 horas |
| Motosserra | Limpeza filtro ar | 25 horas |
| Motosserra | Revisão geral | 100 horas |

---

## Passo 7 — Gerar Novo Token Traccar (antes de 03/04/2026)

O token atual expira em **03/04/2026**. Para renovar:

1. Acesse `http://82.29.62.204:8082`
2. Faça login com a conta admin
3. Vá em **Preferências** → **Token de API**
4. Clique em **"Gerar"** e defina uma data de expiração mais longa (ou sem expiração)
5. Copie o novo token
6. Acesse o painel Hostinger → **Implantações** → **Configurações** → **Variáveis de ambiente**
7. Atualize o valor de `TRACCAR_TOKEN` com o novo token
8. Clique em **"Salvar e reimplantar"**

---

## Resumo de Credenciais e Configurações

| Configuração | Valor |
|-------------|-------|
| Traccar URL | `http://82.29.62.204:8082` |
| Traccar Admin | fkobayashijunior@gmail.com |
| Traccar Senha | Btree@2026gps |
| Porta GPS (GT06) | 5023 |
| Protocolo dispositivo | GT06 |
| Intervalo de envio | 30 segundos |
| Fuso horário | America/Sao_Paulo |

---

## Observações Importantes

**Sobre o token de API:** O token atual tem validade curta (até 03/04/2026). Recomenda-se gerar um token sem data de expiração ou com validade de 1 ano para evitar interrupções no serviço.

**Sobre os chips EMnify:** Enquanto os chips não estiverem ativados, o módulo GPS no BTREE funcionará normalmente, mas os dispositivos aparecerão como "offline" no mapa. Todos os outros módulos do sistema (abastecimento, horas de máquina, pedidos de compra etc.) continuam funcionando normalmente.

**Sobre o número do chip:** O número de telefone do chip (MSISDN) é necessário apenas para enviar os comandos SMS de configuração inicial. Após a configuração, o dispositivo se comunica exclusivamente via dados móveis (GPRS/4G) com o servidor Traccar.
