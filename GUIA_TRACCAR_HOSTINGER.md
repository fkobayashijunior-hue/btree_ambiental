# Guia de Instalação do Traccar no VPS Hostinger
## Sistema BTREE Ambiental — Rastreamento GPS EC33 QUECTEL

---

## Visão Geral

O **Traccar** é uma plataforma de rastreamento GPS gratuita e open source que serve como intermediário entre os rastreadores EC33 e o sistema BTREE Ambiental. Os rastreadores enviam posição GPS via protocolo GT06 (porta TCP 5023) para o servidor Traccar, que armazena os dados e os disponibiliza via API REST para integração com o BTREE.

```
EC33 (veículo)  ──GT06/TCP──►  Traccar (VPS Hostinger)  ──API REST──►  BTREE Ambiental
```

---

## Pré-requisitos

Antes de começar, verifique se o VPS da Hostinger atende aos requisitos mínimos:

| Requisito | Mínimo | Recomendado |
|---|---|---|
| RAM | 1 GB | 2 GB |
| CPU | 1 vCPU | 2 vCPU |
| Disco | 10 GB | 20 GB SSD |
| SO | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| Portas abertas | 8082 (web), 5023 (GT06) | + 443 (HTTPS) |

---

## Passo 1 — Acessar o VPS via SSH

Acesse o painel da Hostinger → **VPS** → clique no seu servidor → **Terminal** (ou use um cliente SSH como PuTTY).

```bash
ssh root@SEU_IP_DO_VPS
```

---

## Passo 2 — Instalar Docker e Docker Compose

O Docker é a forma mais simples e confiável de instalar o Traccar. Execute os comandos abaixo um por um:

```bash
# Atualizar o sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Verificar se o Docker está funcionando
docker --version
```

---

## Passo 3 — Criar os arquivos de configuração do Traccar

Crie uma pasta para o Traccar e os arquivos necessários:

```bash
mkdir -p /opt/traccar/logs
cd /opt/traccar
```

Crie o arquivo de configuração principal:

```bash
cat > /opt/traccar/traccar.xml << 'EOF'
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>

    <!-- Banco de dados interno (H2 - simples, sem instalação extra) -->
    <entry key='database.driver'>org.h2.Driver</entry>
    <entry key='database.url'>jdbc:h2:/opt/traccar/data/database</entry>
    <entry key='database.user'>sa</entry>
    <entry key='database.password'></entry>

    <!-- Porta web (interface e API REST) -->
    <entry key='web.port'>8082</entry>

    <!-- Protocolo GT06 — usado pelo EC33 QUECTEL -->
    <entry key='gt06.port'>5023</entry>

</properties>
EOF
```

Crie o arquivo `docker-compose.yml`:

```bash
cat > /opt/traccar/docker-compose.yml << 'EOF'
version: '3'
services:
  traccar:
    image: traccar/traccar:latest
    container_name: traccar
    restart: unless-stopped
    ports:
      - "8082:8082"   # Interface web e API REST
      - "5023:5023"   # Protocolo GT06 (EC33 QUECTEL)
    volumes:
      - /opt/traccar/logs:/opt/traccar/logs
      - /opt/traccar/traccar.xml:/opt/traccar/conf/traccar.xml
      - traccar_data:/opt/traccar/data

volumes:
  traccar_data:
EOF
```

---

## Passo 4 — Iniciar o Traccar

```bash
cd /opt/traccar
docker compose up -d

# Verificar se está rodando
docker ps
docker logs traccar
```

Aguarde cerca de 30 segundos para o servidor iniciar completamente.

---

## Passo 5 — Abrir as portas no firewall da Hostinger

No painel da Hostinger → **VPS** → **Firewall**, adicione as seguintes regras de entrada:

| Porta | Protocolo | Descrição |
|---|---|---|
| 8082 | TCP | Interface web do Traccar e API REST |
| 5023 | TCP | Protocolo GT06 (EC33 QUECTEL) |

Também execute no terminal do VPS:

```bash
ufw allow 8082/tcp
ufw allow 5023/tcp
ufw reload
```

---

## Passo 6 — Acessar a interface do Traccar

Abra no navegador:

```
http://SEU_IP_DO_VPS:8082
```

Na primeira vez, crie uma conta de administrador com seu e-mail e senha. **Guarde essas credenciais** — serão usadas para integrar com o BTREE.

---

## Passo 7 — Cadastrar os veículos no Traccar

Na interface web do Traccar:

1. Clique em **Dispositivos** (ícone de carro) → **+** para adicionar
2. Para cada veículo, preencha:
   - **Nome:** Ex: `Caminhão F-350`, `Trator John Deere`
   - **Identificador:** O número IMEI do rastreador EC33 (está na etiqueta do aparelho ou no manual)
3. Clique em **Salvar**

> **Como encontrar o IMEI do EC33:** Ligue o aparelho e envie o SMS `IMEI#` para o número do chip instalado no rastreador. Ele responderá com o número IMEI de 15 dígitos.

---

## Passo 8 — Configurar os rastreadores EC33 via SMS

Com o chip M2M instalado no EC33 e o aparelho ligado, envie os seguintes SMS para o número do chip **na ordem indicada**:

### 8.1 — Inicializar o aparelho
```
begin123456
```
*(123456 é a senha padrão de fábrica)*

### 8.2 — Configurar o APN do chip M2M
```
APN,123456,m2m.claro.com.br,,#
```
> Substitua `m2m.claro.com.br` pelo APN da operadora do chip M2M. Chipsets M2M comuns no Brasil:
> - Claro M2M: `m2m.claro.com.br`
> - Vivo M2M: `zap.vivo.com.br`
> - TIM M2M: `tim.br`

### 8.3 — Apontar para o servidor Traccar
```
SERVER,1,SEU_IP_DO_VPS,5023,0#
```
> Substitua `SEU_IP_DO_VPS` pelo IP do seu VPS da Hostinger.

### 8.4 — Configurar fuso horário (Brasil = GMT-3)
```
GMT,W,3,0#
```

### 8.5 — Definir intervalo de envio de posição (a cada 30 segundos)
```
TIMER,123456,30,30#
```

### 8.6 — Verificar se está conectado
```
STATUS#
```
O aparelho responderá com informações de GPS, GSM e tensão. Se `GPS:A` aparecer na resposta, o GPS está fixado e enviando dados.

---

## Passo 9 — Verificar no Traccar

Após configurar o EC33, acesse `http://SEU_IP_DO_VPS:8082` e verifique se o dispositivo aparece **online** (ponto verde) no mapa. Pode levar de 1 a 5 minutos para a primeira posição aparecer.

---

## Passo 10 — Configurar HTTPS (opcional mas recomendado)

Para acessar o Traccar com segurança via `https://gps.btreeambiental.com`, instale o Nginx como proxy reverso:

```bash
apt install nginx certbot python3-certbot-nginx -y

# Criar configuração do Nginx
cat > /etc/nginx/sites-available/traccar << 'EOF'
server {
    listen 80;
    server_name gps.btreeambiental.com;

    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/traccar /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Gerar certificado SSL gratuito
certbot --nginx -d gps.btreeambiental.com
```

> Para isso funcionar, você precisa criar um subdomínio `gps.btreeambiental.com` apontando para o IP do VPS no painel DNS da Hostinger.

---

## Credenciais para integração com o BTREE Ambiental

Após a instalação, anote as seguintes informações e envie para configurar a integração no sistema:

| Informação | Valor |
|---|---|
| URL do Traccar | `http://SEU_IP_DO_VPS:8082` (ou `https://gps.btreeambiental.com`) |
| E-mail do admin | O e-mail cadastrado no Passo 6 |
| Senha do admin | A senha cadastrada no Passo 6 |

---

## Resumo dos comandos SMS para o EC33

| Comando | Função |
|---|---|
| `begin123456` | Inicializar |
| `APN,123456,[apn],,#` | Configurar APN |
| `SERVER,1,[IP],5023,0#` | Apontar para servidor |
| `GMT,W,3,0#` | Fuso horário Brasil (GMT-3) |
| `TIMER,123456,30,30#` | Intervalo de envio (30s) |
| `STATUS#` | Verificar status |
| `IMEI#` | Consultar IMEI |
| `RESET#` | Reiniciar o aparelho |

---

## Próximo passo após a instalação

Com o Traccar funcionando e os EC33 enviando dados, o módulo de **Rastreamento GPS** será ativado no sistema BTREE Ambiental, permitindo visualizar em tempo real a posição de todos os veículos e equipamentos, histórico de rotas, relatórios de km rodados e alertas de velocidade — tudo integrado ao sistema que vocês já utilizam.
