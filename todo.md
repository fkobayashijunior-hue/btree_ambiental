# BTREE AMBIENTAL - TODO LIST

**Projeto:** Sistema de Gestão para Reflorestamento e Corte de Eucalipto  
**Cliente:** BTREE Ambiental  
**Desenvolvedor:** Kobayashi - Desenvolvimento de Sistemas

---

## 🎨 FASE 1: CONFIGURAÇÃO INICIAL E IDENTIDADE VISUAL

- [x] Configurar identidade visual (cores, logos)
- [x] Adicionar logos BTREE e Kobayashi
- [x] Configurar tema e CSS global
- [x] Criar layout base responsivo (mobile-first)
- [x] Criar DashboardLayout adaptado

---

## 👥 FASE 2: GESTÃO DE USUÁRIOS E PERMISSÕES

- [ ] Criar tabela de perfis de usuário
- [ ] Implementar 8 perfis: Administrativo, Encarregado, Mecânico, Motosserrista, Carregador, Operador, Motorista, Terceirizado
- [ ] Sistema de permissões (RBAC)
- [ ] Página de gestão de usuários

---

## 🚜 FASE 3: CADASTRO DE EQUIPAMENTOS

- [ ] Criar tabela de equipamentos
- [ ] Criar tabela de tipos de equipamentos
- [ ] Página de cadastro de equipamentos
- [ ] Campos: Marca, Modelo, Ano, Número de Série, Tipo
- [ ] Upload de fotos dos equipamentos
- [ ] Listagem de equipamentos

---

## 📤 FASE 4: CONTROLE DE SAÍDA DE CARGAS

- [ ] Criar tabela de saídas de cargas
- [ ] Formulário mobile de registro
- [ ] Upload de fotos da carga
- [ ] Seleção de caminhão
- [ ] Seleção de motorista
- [ ] Campos de medidas (altura, largura, comprimento)
- [ ] Cálculo automático de volume (m³)
- [ ] Campos: Destino, Nota Fiscal, Tipo de Madeira, Cliente
- [ ] Listagem de cargas

---

## 📥 FASE 5: CONTROLE DE RECEBIMENTO DE CARGAS

- [ ] Criar tabela de recebimentos
- [ ] Formulário mobile de recebimento
- [ ] Upload de fotos do recebimento
- [ ] Campo de volume recebido
- [ ] Assinatura digital
- [ ] Listagem de recebimentos

---

## ⛽ FASE 6: CONTROLE DE COMBUSTÍVEL

- [ ] Criar tabela de abastecimentos
- [ ] Formulário mobile de registro
- [ ] Seleção de equipamento
- [ ] Campos: Litros, Valor, Hodômetro/Horímetro
- [ ] Campo de posto/fornecedor
- [ ] Upload de nota fiscal
- [ ] Listagem de abastecimentos
- [ ] Relatório de consumo

---

## 📋 FASE 7: REGISTRO DE PRESENÇA

- [ ] Criar tabela de presenças
- [ ] Formulário mobile de registro
- [ ] Seleção de colaborador
- [ ] Tipo de vínculo (CLT/Terceirizado/Diarista)
- [ ] Valor da diária
- [ ] Chave PIX
- [ ] Função/Atividade
- [ ] Observações
- [ ] Listagem de presenças
- [ ] Gestão de pagamentos (marcar como pago)
- [ ] Status de pagamento
- [ ] Relatórios de presença

---

## 🪚 FASE 8: CONTROLE DE MOTOSSERRAS

- [ ] Criar tabela de manutenções de motosserras
- [ ] Formulário de registro de manutenção
- [ ] Campos: Afiação, Troca de corrente, Consumo de óleo, Horas de uso
- [ ] Listagem de manutenções
- [ ] Histórico por motosserra

---

## 🔧 FASE 9: CADASTRO DE PEÇAS

- [ ] Criar tabela de peças
- [ ] Formulário de cadastro
- [ ] Upload de foto da peça
- [ ] Campos: Código, Descrição, Categoria, Unidade, Estoque
- [ ] Listagem de peças

---

## 🛒 FASE 10: SOLICITAÇÕES DE COMPRAS

- [ ] Criar tabela de solicitações
- [ ] Formulário mobile de solicitação
- [ ] Seleção de peça
- [ ] Quantidade
- [ ] Urgência (Baixa/Média/Alta)
- [ ] Observações
- [ ] Sistema de aprovação (ADM)
- [ ] Status (Pendente/Aprovado/Rejeitado/Comprado)
- [ ] Orçamento de fornecedores
- [ ] Listagem de solicitações

---

## 📄 FASE 11: CONTROLE DE NOTAS FISCAIS

- [ ] Criar tabela de notas fiscais
- [ ] Formulário de registro
- [ ] Upload de PDF
- [ ] Categoria (Combustível/Peças/Serviços/Outros)
- [ ] Tipo (Compra/Venda)
- [ ] Campos: Número, Data, Valor, Fornecedor/Cliente
- [ ] Listagem de notas

---

## 📊 FASE 12: DASHBOARD E RELATÓRIOS

- [x] Dashboard executivo (DEMO)
- [x] Cards de indicadores principais
- [ ] Gráficos de consumo
- [ ] Relatório de cargas (Excel/PDF)
- [ ] Relatório de combustível (Excel/PDF)
- [ ] Relatório de manutenções (Excel/PDF)
- [ ] Relatório de presença (Excel/PDF)
- [ ] Relatório de custos (Excel/PDF)

---

## 🔔 FASE 13: NOTIFICAÇÕES E ALERTAS

- [ ] Sistema de notificações
- [ ] Alerta de manutenção preventiva vencendo
- [ ] Alerta de combustível baixo
- [ ] Alerta de documentos vencendo
- [ ] Notificação de nova solicitação de compra
- [ ] Notificação de aprovação/rejeição

---

## 📱 FASE 14: FUNCIONALIDADES MOBILE

- [ ] PWA (Progressive Web App)
- [ ] Funcionalidade offline
- [ ] Sincronização automática
- [ ] Upload de fotos da câmera
- [ ] Interface otimizada para celular

---

## 🧪 FASE 15: TESTES E AJUSTES

- [ ] Testes de todos os módulos
- [ ] Testes de permissões
- [ ] Testes mobile
- [ ] Testes de relatórios
- [ ] Ajustes de UX/UI
- [ ] Correção de bugs

---

## 🚀 FASE 16: DEPLOY E DOCUMENTAÇÃO

- [ ] Configurar banco de dados de produção
- [ ] Deploy do backend no Render
- [ ] Deploy do frontend na Hostinger
- [ ] Configurar domínio btreeambiental.com
- [ ] Configurar Cloudinary para imagens
- [ ] Criar manual de usuário
- [ ] Criar documentação técnica
- [ ] Treinamento dos usuários

---

## 🐛 BUGS CONHECIDOS

- [ ] Corrigir erro insertBefore em todos os componentes com upload de arquivo (foto equipamento, documentos, peças)
- [ ] Substituir biometria facial por registro manual de ponto (entrada/saída com hora e data)
- [ ] Refazer portal do cliente: login com usuário/senha próprio, visão restrita ao cliente
- [ ] Corrigir upload de foto de equipamento (câmera não carrega no mobile)
- [ ] Adicionar campo de foto em peças e acessórios

---

## 💡 MELHORIAS FUTURAS

- [ ] App mobile nativo (Android/iOS)
- [ ] Integração com ERP
- [ ] Módulo de controle de qualidade
- [ ] Módulo de controle de estoque avançado
- [ ] Módulo de controle de documentos (CNH, CRLV, etc.)
- [ ] Dashboard de análise preditiva

---

## 🌐 FASE 17: PORTAL DO CLIENTE + MELHORIAS LANDING (07/03/2026)

- [x] Corrigir contato comercial para Fábio Jundy Kobayashi
- [x] Adicionar botão "Área do Cliente" na navbar da landing page
- [x] Schema DB: tabelas clientPortalAccess, replantingRecords, clientPayments
- [x] Portal do cliente: login com código de acesso único
- [x] Portal do cliente: dashboard com cargas saídas, replantio e pagamentos
- [x] Área do colaborador: link no menu do dashboard
- [x] Rodapé discreto na landing: divulgação do desenvolvedor Fernando Kobayashi Jr.
- [x] Build de produção realizado com sucesso

---

**Última atualização:** 07/03/2026  
**Versão atual:** 1.0.0 (em desenvolvimento)

---

## 🎨 AJUSTES VISUAIS

- [x] Adicionar logo BTREE no cabeçalho (sempre visível)
- [x] Adicionar logo Kobayashi no rodapé (sempre visível)

---

## 🔧 CONFIGURAÇÃO DE INFRAESTRUTURA

- [x] Configurar repositório GitHub frontend (btree_frontend)
- [x] Criar arquivo SQL completo com todas as tabelas MySQL
- [x] Preparar backend para deploy no Render
- [x] Fazer push do backend no GitHub (btree_ambiental)
- [x] Atualizar repositório btree_frontend com código completo
- [x] Criar guia passo a passo de deploy no Render
- [x] Criar guia de configuração de variáveis de ambiente
- [x] Documentar conexão MySQL
- [ ] Configurar Cloudinary (usar mesmo do Aza Connect)
- [x] Compilar frontend para Hostinger
- [ ] Testar deploy completo

---

## 🔐 SISTEMA DE AUTENTICAÇÃO PRÓPRIO

- [x] Implementar registro de usuários (email/senha)
- [x] Implementar login com JWT
- [x] Criar middleware de autenticação
- [x] Atualizar rotas protegidas
- [x] Criar tela de login no frontend
- [x] Criar tela de registro no frontend
- [x] Remover dependências do Manus OAuth
- [ ] Testar sistema de autenticação completo
- [x] Atualizar GitHub (backend e frontend)
- [x] Compilar frontend para Hostinger
- [ ] Fazer deploy no Render


---

## 🐛 CORREÇÕES IMEDIATAS (06/03/2026)

- [ ] Corrigir aba Usuários: editar e remover funcionando com backend real
- [ ] Conectar aba Usuários ao banco de dados (listar usuários reais)

---

## 🚛 MÓDULO: CONTROLE DE CARGAS (Novo)

- [ ] Schema: tabela cargo_loads com campos completos
- [ ] Backend: rotas list, create, update, delete
- [ ] Frontend: página CargoControl.tsx
- [ ] Formulário: caminhão, motorista, data, altura, largura, comprimento
- [ ] Cálculo automático de volume (m³)
- [ ] Upload de fotos da carga
- [ ] Campos: destino, nota fiscal, tipo de madeira, cliente
- [ ] Listagem com filtros por data/cliente/motorista

---

## ⚙️ MÓDULO: CONTROLE DE HORAS DE MÁQUINAS (Novo)

- [ ] Schema: tabela machine_hours com horímetro, operador, data
- [ ] Schema: tabela machine_maintenance com peças trocadas, mecânico, tipo (próprio/terceirizado)
- [ ] Schema: tabela machine_fuel para controle de abastecimento por horímetro
- [ ] Backend: rotas para horas, manutenção e abastecimento
- [ ] Frontend: página MachineHours.tsx
- [ ] Operador registra horas trabalhadas (início/fim horímetro)
- [ ] Mecânico registra peças trocadas (próprio ou terceirizado)
- [ ] Controle de abastecimento vinculado ao horímetro
- [ ] Alertas de manutenção preventiva por horas

---

## 🚗 MÓDULO: CONTROLE DE VEÍCULOS (Novo)

- [ ] Schema: tabela vehicle_records com km, abastecimento, manutenções
- [ ] Backend: rotas CRUD para veículos e registros
- [ ] Frontend: página VehicleControl.tsx
- [ ] Registro de km percorrido
- [ ] Controle de abastecimento (litros, valor, km)
- [ ] Registro de manutenções (tipo, peças, custo, responsável)
- [ ] Histórico por veículo

---

## 🔩 MÓDULO: CONTROLE DE PEÇAS E ACESSÓRIOS (Novo)

- [ ] Schema: tabela parts com código, descrição, categoria, estoque
- [ ] Backend: rotas CRUD para peças
- [ ] Frontend: página PartsControl.tsx
- [ ] Cadastro de peças com foto
- [ ] Controle de estoque (entrada/saída)
- [ ] Histórico de uso por equipamento

---

## 📋 MÓDULO: SOLICITAÇÃO DE PEÇAS (Novo)

- [ ] Schema: tabela parts_requests com status, urgência, aprovação
- [ ] Backend: rotas para criar, aprovar, rejeitar solicitações
- [ ] Frontend: página PartsRequest.tsx
- [ ] Formulário de solicitação (peça, quantidade, urgência, observação)
- [ ] Sistema de aprovação pelo administrativo
- [ ] Status: Pendente / Aprovado / Rejeitado / Comprado
- [ ] Notificação para administrativo

---

## 👤 MÓDULO: ABA DO CLIENTE (Novo)

- [ ] Schema: tabela clients com dados do cliente
- [ ] Schema: tabela client_cargo_reports para relatórios de carga por cliente
- [ ] Schema: tabela client_contracts para contratos (corte/replantio)
- [ ] Backend: rotas CRUD para clientes e relatórios
- [ ] Frontend: página Clients.tsx
- [ ] Cadastro de clientes
- [ ] Vinculação de cargas ao cliente
- [ ] Relatório de cargas por cliente para pagamento
- [ ] Controle de contratos (corte de moitas, replantio)
- [ ] Portal do cliente (acesso externo para visualizar relatórios)

---

## 📊 MÓDULO: DASHBOARDS E RELATÓRIOS PDF (Novo)

- [ ] Dashboard com dados reais do banco (não demo)
- [ ] Gráficos: cargas por período, horas por máquina, consumo de combustível
- [ ] Geração de PDF profissional com logo BTREE no cabeçalho
- [ ] Logo Kobayashi no rodapé dos PDFs
- [ ] QR code do site nos rodapés
- [ ] Contatos da empresa nos rodapés
- [ ] Relatório de cargas (por período, por cliente, por motorista)
- [ ] Relatório de horas de máquinas
- [ ] Relatório de manutenções
- [ ] Relatório de veículos
- [ ] Relatório de presença/pagamento
- [ ] Relatório de peças/estoque

---

## 🔧 CORREÇÃO CRÍTICA: ERRO "FAILED TO FETCH" NO LOGIN (07/03/2026)

- [x] Diagnosticar erro: frontend chamava `onrender.com/api/trpc` (servidor antigo)
- [x] Corrigir `client/src/main.tsx`: usar `window.location.origin/api/trpc` como fallback
- [x] Gerar novo build de produção com Vite (`pnpm vite build`)
- [x] Compilar servidor Node.js com esbuild
- [x] Fazer upload dos arquivos corrigidos para Hostinger via SCP
- [x] Redefinir senha do admin para `btree@2024` (senha anterior era desconhecida)
- [x] Verificar login funcionando em produção: ✅ OK
- [x] Atualizar script de build no `package.json`

**Credenciais de acesso:**
- Email: fkobayashijunior@gmail.com
- Senha: btree@2024


---

## 🔧 CORREÇÃO: BOTÃO "ÁREA DO COLABORADOR" REDIRECIONANDO PARA MANUS OAUTH (07/03/2026)

- [x] Corrigir `client/src/const.ts`: `getLoginUrl()` agora retorna `/login` em vez do OAuth do Manus
- [x] Corrigir `client/src/main.tsx`: redirecionamento de não-autenticado usa `/login` diretamente
- [x] Verificar todos os usos de `getLoginUrl` nos componentes Landing.tsx, useAuth.ts, DashboardLayout.tsx


---

## 🚀 NOVAS FUNCIONALIDADES — SPRINT 08/03/2026

### 🔐 LOGIN RÁPIDO (PIN)
- [ ] Após primeiro login bem-sucedido, oferecer opção de criar PIN de 6 dígitos
- [ ] Salvar PIN criptografado no localStorage vinculado ao e-mail
- [ ] Tela de login rápido: mostrar nome/avatar do usuário + campo PIN
- [ ] Botão "Usar outra conta" para voltar ao login completo
- [ ] Suporte a Web Authentication API (biometria nativa do dispositivo) como alternativa ao PIN

### 👷 COLABORADORES — CORREÇÕES E MELHORIAS
- [ ] Corrigir captura de foto pela câmera no cadastro (bug: erro ao salvar)
- [ ] Corrigir upload de foto da galeria (bug: erro ao salvar)
- [ ] Adicionar aba "Documentos & Certificados" no perfil do colaborador
- [ ] Upload de CNH (com data de validade e categoria)
- [ ] Upload de certificados de cursos (nome do curso, data, validade)
- [ ] Alertas de documentos vencendo (CNH, certificados)
- [ ] Geração de PDF com ficha completa do colaborador (dados + documentos)

### 🖥️ NAVEGAÇÃO — BOTÃO DE MENU
- [ ] Botão "Voltar ao Menu" fixo em todas as páginas internas (não apenas na home)
- [ ] Ou: manter sidebar sempre visível / botão de hambúrguer sempre acessível no mobile

### ⚡ AÇÕES RÁPIDAS
- [ ] Corrigir botões de ação rápida no dashboard (Nova Carga, Registrar Abastecimento, Registrar Presença, Novo Equipamento)

### 🚜 EQUIPAMENTOS — MELHORIAS
- [ ] Upload de fotos do equipamento (múltiplas fotos)
- [ ] Upload de foto da placa (quando houver)
- [ ] Geração de ficha PDF do equipamento (dados + fotos)
- [ ] Histórico de manutenções por equipamento (data, tipo, descrição, mecânico)
- [ ] Histórico de limpeza por equipamento
- [ ] Histórico de afiação (motosserras)

### 🚗 MÓDULO DE VEÍCULOS (separado de equipamentos)
- [ ] Cadastro de veículos (placa, modelo, ano, proprietário)
- [ ] Upload de documentos do veículo (CRLV, seguro, etc.)
- [ ] Alertas de documentos vencendo
- [ ] Histórico de manutenções do veículo

### 📦 CARGAS — LEITURA AUTOMÁTICA VIA IA
- [ ] Upload de foto do formulário/ticket de pesagem
- [ ] IA extrai automaticamente: data, placa, motorista, tipo de lenha, altura, largura, comprimento, volume, NF, cliente
- [ ] Campos pré-preenchidos para revisão antes de salvar
- [ ] Suporte aos dois formatos vistos: "Formulário de Recebimento de Lenha" e "Ticket de Pesagem"

### 📊 RELATÓRIOS PDF PROFISSIONAIS
- [ ] Template PDF com logo BTREE no cabeçalho
- [ ] Informações da empresa e site no rodapé
- [ ] QR code para acesso rápido ao site btreeambiental.com
- [ ] Relatório de cargas por período
- [ ] Relatório de cargas por cliente
- [ ] Acompanhamento consolidado de todas as cargas
- [ ] Relatório de colaboradores
- [ ] Relatório de equipamentos


---

## 🚀 MELHORIAS IMPLEMENTADAS (08/03/2026)

### Login
- [x] Login rápido com PIN de 4 dígitos (salvo localmente no dispositivo)

### Cadastro de Colaborador
- [x] Corrigir captura de foto direta pela câmera (suporte a câmera + galeria)
- [x] Integrar Cloudinary (cloud: djob7pxme) para upload de fotos de colaboradores
- [x] Aba de documentos/certificados no colaborador (CNH, cursos, certificados)
- [x] Geração de PDF com todos os dados do colaborador (ficha completa)
- [x] Botão "Ficha" na listagem de colaboradores

### Dashboard
- [x] Botão de menu sempre visível (não só no mobile)
- [x] Ações rápidas do dashboard com navegação funcional

### Equipamentos
- [x] Fotos do equipamento e da placa (upload via Cloudinary)
- [x] Ficha do equipamento em PDF
- [x] Histórico de manutenções, limpeza, afiação
- [x] Botão "Ficha" na listagem de equipamentos

### Controle de Cargas
- [x] Análise automática de fotos de cargas via IA (extrai dados do formulário/ticket)
- [x] Acompanhamento de cargas por cliente (vista agrupada)
- [x] Relatórios PDF profissionais com logo BTREE, cabeçalho e rodapé
- [x] Filtros por cliente e status
- [x] Fotos vinculadas às cargas

### Pendente (próxima versão)
- [ ] Aba de veículos com documentos (CNH, CRLV)
- [ ] Histórico de manutenções de veículos
- [ ] Módulo de abastecimento por horímetro

---

## 🐛 BUGS REPORTADOS (08/03/2026)

- [ ] PIN não funciona — substituir por "Lembrar acesso" com localStorage (email+senha salvos)
- [ ] Erro ao registrar presença (NotFoundError DOM ao abrir câmera)
- [ ] Upload de CNH dá erro (Cloudinary não configurado no servidor Hostinger)
- [ ] Upload de foto de equipamento dá erro (mesmo problema Cloudinary)
- [ ] Análise de foto de carga dá erro: "OPENAI_API_KEY is not configured" — usar LLM interno do Manus
- [ ] Botão de menu e botão voltar desaparecem ao entrar em subpáginas no mobile
- [ ] Câmera de presença não encontra colaboradores — explicar fluxo de cadastro biométrico

---

## 🐛 CORREÇÕES (08/03/2026)

- [x] Substituir Cloudinary por S3 do Manus em todos os uploads (documentos, equipamentos, cargas, presença)
- [x] Corrigir erro de upload de CNH (collaboratorDocuments.ts)
- [x] Corrigir erro de upload de foto de equipamento (equipmentDetail.ts)
- [x] Corrigir erro de análise de foto de carga (cargoLoads.ts)
- [x] Corrigir erro de registro de presença biométrica
- [x] Corrigir carregamento do face-api.js (usar document.body em vez de document.head)
- [x] Adicionar aba de Biometria Facial no CollaboratorDetail para cadastro facial
- [x] Corrigir botão menu no mobile (z-index do header acima do Sheet)
- [x] Adicionar botão voltar em subpáginas no DashboardLayout
- [x] Adicionar botão Home no header do DashboardLayout
- [x] Substituir PIN por "Lembrar acesso" com localStorage no Login
- [x] Adicionar botão "Gerar Código de Acesso" na página de Clientes para o Portal do Cliente
- [x] Corrigir import do useAuth no DashboardLayout

---

## 🐛 CORREÇÕES ADICIONAIS (08/03/2026 - tarde)

- [x] Mover upload de foto para dentro do formulário de cadastro/edição de equipamento
- [x] Garantir que aba de Biometria Facial apareça corretamente no mobile (CollaboratorDetail - overflow-x-auto nas tabs)

---

## 🚀 MIGRAÇÃO PARA HOSTINGER

- [ ] Substituir autenticação Manus OAuth por email/senha próprio (bcrypt + JWT)
- [ ] Criar tela de login com email/senha (sem OAuth)
- [ ] Criar tela de cadastro de usuário administrador
- [ ] Substituir S3 do Manus por Cloudinary para uploads de fotos e documentos
- [ ] Remover análise de IA de fotos de carga (será preenchimento manual)
- [ ] Remover dependências exclusivas do Manus (vite-plugin-manus-runtime, forge API, etc.)
- [ ] Criar arquivos de configuração para deploy na Hostinger (.htaccess, ecosystem.config.cjs)
- [ ] Ajustar package.json para usar npm em vez de pnpm
- [ ] Fazer push no GitHub para deploy automático na Hostinger

---

## 🔧 CORREÇÕES E MELHORIAS (11/03/2026)

- [x] Portal do Cliente: substituído login por código por login com e-mail + senha (bcrypt)
- [x] ClientsPage: botão "Senha Portal" para definir senha de cada cliente
- [x] Peças e Acessórios: adicionado campo de upload de foto (câmera/galeria) no formulário
- [x] Schema DB: coluna `password` em `clients`, coluna `photo_url` em `parts`
- [x] SQL de atualização para Hostinger: ATUALIZACAO_BANCO_HOSTINGER_v2.sql
- [x] build.sh: corrigido para usar pnpm (evita erro workspace:* do drizzle-kit no npm)
- [x] package.json: drizzle-kit removido das dependências (apenas usado localmente via pnpm)
