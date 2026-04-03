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

---

## 🐛 CORREÇÕES URGENTES (11/03/2026 - v2)

- [x] PartsPage: adicionar campo de upload de foto no formulário (estava faltando no deploy)
- [x] PartsPage: remover campo "Código" do formulário de nova peça
- [x] ClientPortal: substituir campo "Código de Acesso" por e-mail + senha
- [x] Presença: remover biometria facial e cadastro de biometria do menu/aba
- [x] Solicitações de Peças: reformular como carrinho de compras (selecionar peças + quantidade)
- [x] Solicitações de Peças: seleção de itens por fornecedor para PDF separado
- [x] PDF padrão: logo BTREE, QR code do site, contato, rodapé com logo Kobayashi
- [x] PDF padrão: aplicar em todos os PDFs gerados pelo sistema
- [x] Compilar frontend e preparar zip para Hostinger

---

## 🐛 CORREÇÕES URGENTES (12/03/2026)

- [ ] DashboardLayout: remover "Presença Facial" do menu
- [ ] DashboardLayout: renomear "Horas preparadas" → "Abastecimento"
- [ ] DashboardLayout: renomear "Cerco de Cargas" → "Controle de Cargas"
- [ ] Equipamentos: adicionar campo "Setor" no formulário de cadastro/edição
- [ ] Abastecimento de veículo: adicionar campo de imagem no registro
- [ ] Abastecimento: corrigir exibição do veículo (mostrando "Veículo 2" em vez do nome)
- [ ] Novo módulo: Controle de Horas de Máquinas (início/fim horímetro + registro de falhas)
- [ ] Controle de Cargas: restaurar campos de peso e separação por cliente
- [ ] Peças e Acessórios: restaurar campo de foto no formulário
- [ ] Peças e Acessórios: restaurar carrinho de pedidos + PDF por fornecedor
- [ ] Portal do Cliente: login com e-mail+senha (sem código de acesso)

---

## 🐛 CORREÇÕES URGENTES v5 (22/03/2026)

- [ ] VehicleControlPage: botão editar registro de abastecimento
- [ ] VehicleControlPage: visualizar foto do registro
- [ ] VehicleControlPage: upload de foto da galeria (não só câmera)
- [ ] VehicleControlPage: mostrar quem cadastrou o registro (usuário logado)
- [ ] MachineHoursPage: corrigir título "direção dePons" → nome real do equipamento selecionado
- [ ] MachineHoursPage: aba Abastecimentos separada de veículos (combustível de máquinas)
- [ ] DashboardLayout: menu hambúrguer visível no mobile
- [ ] Todas as páginas internas: botão Voltar para navegação sem usar botão do navegador
- [ ] PWA: ícone da BTREE como favicon e ícone de tela inicial (manifest.json)
- [ ] Card do desenvolvedor: clicável com informações de contato (Fernando Kobayashi)
- [ ] Logo do desenvolvedor: maior e mais visível no Portal do Cliente
- [ ] AttendancePage: campo local de trabalho no registro de presença
- [ ] AttendancePage: formulário de cadastro de presença funcional
- [ ] CargoControl: rastreamento em tempo real com status (Em andamento / Na fábrica / Aguardando descarga / Entregue)
- [ ] CargoControl: campo de hora de saída e hora de chegada
- [ ] CargoControl: registro de atrasos/problemas com observação
- [ ] Portal do Cliente: cargas em andamento com status atualizado em tempo real

---

## 🐛 CORREÇÕES 22/03/2026

- [x] VehicleControlPage: galeria de fotos funcional (câmera + galeria)
- [x] VehicleControlPage: botão editar com modal
- [x] VehicleControlPage: mostrar "Cadastrado por" na listagem
- [x] DashboardLayout: centralizado no App.tsx para todas as rotas protegidas
- [x] CollaboratorDetail: removido DashboardLayout interno (evitar aninhamento)
- [x] EquipmentDetail: removido DashboardLayout interno (evitar aninhamento)
- [x] Home: removido DashboardLayout interno
- [x] DashboardLayout: logo Kobayashi maior e clicável com dialog de contato
- [x] manifest.json: criado com ícone BTREE para PWA (ícone na área de trabalho)
- [x] AttendanceList: formulário de cadastro de presença manual implementado
- [x] AttendanceList: tabela collaborator_attendance criada no banco
- [x] AttendanceList: router de presença com list, create, markPaid, delete
- [x] AttendanceList: mostrar quem cadastrou cada presença
- [x] AttendanceList: gestão de pagamento (marcar pago/pendente)

---

## 🐛 CORREÇÕES 22/03/2026 (Sessão 2)

- [ ] Menu lateral: reordenar e renomear conforme lista do usuário
- [ ] VehicleControlPage: corrigir título "drama de abas" → "Controle de Abastecimento"
- [ ] DashboardLayout: dados dev corretos (tel: (15) 99705-6890, email: fkobayashijunior@gmail.com, desc: "Sistemas para seu negócio")
- [ ] DashboardLayout: logo Kobayashi clicável visível com texto "Desenvolvedor"
- [ ] ClientsPage: remover campo "Gerar código de acesso" do formulário
- [ ] Portal do cliente: logo Kobayashi visível (não "Kobayashi Dev")

---

## 🚀 MELHORIAS 22/03/2026 (Sessão 3)
- [x] Painel com dados reais: cards conectados ao banco (total cargas, colaboradores, abastecimentos do mês)
- [x] Relatório de presenças em PDF com totais a pagar por colaborador
- [x] Notificação automática ao administrador ao cadastrar presença

---

## 🐛 CORREÇÕES 23/03/2026
- [ ] Bug: setor salvando nome errado (sempre salva "churrascos" em vez do nome digitado)
- [ ] Menu: "cerco de Cargas" → "Controle de Cargas" e "coração de Abastecimento" → "Controle de Abastecimento"
- [ ] Painel sem dados (dashboard router não retorna dados)
- [ ] Portal do cliente: simplificar fluxo de cadastro de senha de acesso

---

## 🚀 MELHORIAS 23/03/2026

- [x] Relatório de abastecimentos em PDF/Excel por veículo e período
- [x] Filtro por período (mês/ano) no Painel
- [x] Controle de horas de equipamentos com manutenções preventivas

## 🐛 CORREÇÕES 23/03/2026 (Sessão 2)
- [x] Erro ao registrar presença: tabela collaborator_attendance criada no banco Manus via SQL direto; script SQL gerado para rodar no banco de produção Hostinger

## 🔔 NOTIFICAÇÕES AUTOMÁTICAS — Mary (23/03/2026)
- [x] Sistema de notificação por e-mail para múltiplos destinatários (owner + Mary)
- [x] Notificação automática ao registrar presença (e-mail para Mary + owner)
- [x] Notificação automática ao registrar abastecimento de veículo (e-mail para Mary + owner)
- [x] Notificação automática ao criar pedido de peças/acessórios (e-mail para Mary + owner)
- [x] Notificação automática ao criar pedido de compra (e-mail para Mary + owner)
- [x] Script SQL completo para sincronizar tabelas faltantes no banco de produção (Hostinger)

## 🛰️ MÓDULO GPS — EC33 QUECTEL + TRACCAR (24/03/2026)
- [x] Guia de instalação do Traccar no VPS Hostinger
- [x] Módulo de Rastreamento GPS no BTREE (mapa em tempo real, histórico de rotas, alertas)
- [x] Integração API Traccar → BTREE (posições, velocidade, ignição, km rodados)
- [x] Configuração dos rastreadores EC33 via SMS (comandos APN, servidor, fuso horário) — incluso no guia
- [x] Contagem automática de horas de máquinas via GPS (ignição ligada = hora trabalhada)
- [x] Geração automática de alertas de manutenção preventiva por horas acumuladas (engraxamento, abastecimento, troca de óleo)
- [x] Vinculação de dispositivo GPS a equipamento/máquina cadastrada no sistema
- [x] Alerta visual e notificação quando máquina atingir limiar de horas para manutenção

## 🔗 INTEGRAÇÃO TRACCAR → BTREE (28/03/2026)
- [x] Configurar secrets TRACCAR_URL e TRACCAR_TOKEN no sistema BTREE (configurado na Hostinger)
- [x] Atualizar router traccar.ts para usar Bearer Token (TRACCAR_TOKEN) em vez de Basic Auth
- [x] Instalar @types/cors para resolver erros de TypeScript
- [x] Criar script SQL para tabelas GPS no banco de produção (ATUALIZACAO_GPS_HOSTINGER.sql)
- [x] Criar guia de próximos passos: chips EMnify, configuração EC33, cadastro de dispositivos (GUIA_GPS_PROXIMOS_PASSOS.md)
- [ ] Executar ATUALIZACAO_GPS_HOSTINGER.sql no phpMyAdmin da Hostinger
- [ ] Ativar chips EMnify e obter números + APN
- [ ] Configurar 10 dispositivos EC33 via SMS
- [ ] Cadastrar 9 dispositivos restantes no Traccar
- [ ] Vincular GPS aos equipamentos no BTREE
- [ ] Renovar token Traccar antes de 03/04/2026

## 📋 RELATÓRIO DE PRESENÇA SEMANAL (28/03/2026)
- [x] Relatório de presença agrupado por semana (domingo a sábado)
- [x] Listagem por colaborador: dias trabalhados, total de diárias, total a pagar
- [x] Filtro por semana com navegação (anterior/próxima)
- [x] Indicador visual de status de pagamento por colaborador na semana
- [x] Exportar relatório semanal em PDF para Mary
- [ ] Exportar relatório semanal em Excel

## 🚜 EQUIPAMENTOS POR SETOR (28/03/2026)
- [x] Separar equipamentos por setor no cadastro e listagem
- [x] Campos dinâmicos por tipo: veículos/caminhões exibem campo "Placa" ao invés de "Número de Série"
- [x] Campo license_plate adicionado na tabela equipment
- [ ] Filtro de equipamentos por setor nas páginas que usam equipamentos
- [ ] Migrar equipamentos existentes para setores

## 🚛 MÓDULO DE CARGAS REFORMULADO (28/03/2026)
- [x] Cadastro de destinos (tabela cargo_destinations) para seleção no formulário
- [x] Formulário de carga: selecionar caminhão cadastrado (não digitar)
- [x] Formulário de carga: selecionar motorista cadastrado (não digitar)
- [x] Formulário de carga: selecionar cliente cadastrado (não digitar)
- [x] Formulário de carga: selecionar destino cadastrado (não digitar)
- [x] Adicionar campo de peso (kg/ton) no registro de carga
- [x] Relatório completo de cargas para a empresa (PDF) com filtros
- [x] Relatório de cargas separado para clientes na área do cliente
- [x] Geração de PDF individual por carga para envio externo (sem precisar de login)
- [x] Upload de fotos de peso na saída e na chegada
- [x] Upload de fotos da carga (múltiplas fotos)
- [ ] Relatório em Excel

## 📍 ACOMPANHAMENTO EM TEMPO REAL DE CARGAS (28/03/2026)
- [x] Status de carga: Aguardando → Carregando → Em Trânsito → Pesagem Saída → Descarregando → Pesagem Chegada → Finalizado
- [x] Registro de status com data/hora e notas
- [x] Upload de fotos por etapa (peso saída, peso chegada, fotos da carga)
- [x] Área do cliente: timeline visual do status da carga em tempo real
- [x] Fotos de pesagem visíveis para o cliente no portal
- [ ] Notificação automática ao cliente quando status muda
- [ ] PDF final da entrega com fotos de peso e medidas para envio ao cliente

## 📵 MODO OFFLINE / PWA (28/03/2026)
- [x] Configurar Service Worker (vite-plugin-pwa + Workbox) para cache de assets e páginas
- [x] Fila de cadastros offline: salvar localmente quando sem internet (useOfflineQueue)
- [x] Sincronização automática quando a internet voltar
- [x] Indicador visual de modo offline na interface (OfflineIndicator)
- [x] Ícones PWA gerados (pwa-192.png, pwa-512.png)
- [ ] Integrar useOfflineQueue nos formulários de presença, abastecimento, horas de máquina e cargas
- [ ] Suporte offline completo testado em campo

## 🔩 SISTEMA DE PEÇAS E MANUTENÇÃO AVANÇADO (29/03/2026)

### Cadastro de Peças
- [x] Cadastro de peça com: código, nome, descrição, categoria, valor unitário, imagem, estoque atual
- [x] Busca de peça por código (autocomplete) no formulário de manutenção
- [x] Ao selecionar código, preencher automaticamente nome, valor e imagem da peça
- [x] Controle de estoque: entrada (compra) e saída (uso em manutenção) com movimentação automática
- [x] Indicador visual: "Em estoque" / "Sem estoque" / "Estoque baixo" no formulário de manutenção

### Templates de Manutenção por Tipo
- [x] Cadastro de templates: ex. "Troca de Óleo Motor" → lista de peças necessárias
- [x] Ao selecionar template, sistema carrega automaticamente as peças com consulta de estoque
- [x] Sistema indica disponibilidade de cada peça (verde = tem estoque, laranja = insuficiente)
- [x] Peças adicionadas automaticamente com código, valor e imagem

### Ficha Completa de Manutenção
- [x] Ficha de manutenção com: equipamento, data, tipo, mecânico responsável
- [x] Lista de peças utilizadas: código, nome, quantidade, valor unitário, valor total, imagem
- [x] Campo de mão de obra (serviços): valor
- [x] Custo total automático (peças + mão de obra)
- [x] Fotos da manutenção
- [x] Geração de PDF da ficha completa de manutenção com fotos das peças
- [x] Ao salvar, baixar estoque automaticamente das peças utilizadas + registrar movimentação

### SQL para Hostinger
- [x] Script SQL gerado: 4 novas tabelas (maintenance_templates, maintenance_template_parts, maintenance_parts, parts_stock_movements)

## 🐛 BUGS PRODUÇÃO (29/03/2026)
- [ ] Equipamentos não aparecem em Setores e Equipamentos (sectorId nulo nos registros antigos)
- [ ] Formulário de manutenção avançado (peças/templates) não aparece na página /maquinas (EquipmentControlPage) — foi implementado no EquipmentDetail mas a página usada é outra

## 🎨 ÍCONE PWA SIMPLIFICADO (29/03/2026)
- [x] Gerar ícone PWA com símbolo de árvores + BTREE AMBIENTAL em branco sobre fundo verde escuro
- [x] Substituir pwa-192.png (192x192, 34KB) e pwa-512.png (512x512, 217KB) no projeto
- [x] Atualizar manifest PWA com background_color #1c3a28
- [x] Corrigir erro NotFoundError (removeChild) ao cadastrar presença no BiometricAttendance

## CORREÇÕES 30/03/2026 (Sessão 2)
- [x] Adicionar botão de excluir presença na listagem diária (AttendanceList)
- [x] Adicionar procedure deleteAttendance no router de attendance
- [x] Corrigir ícone PWA que não atualiza no celular (cache busting)
- [x] Implementar controle de acesso ao app (permissões por usuário/módulo)

## CONTROLE DE ACESSO (RBAC) - 30/03/2026
- [x] Criar tabela user_permissions no schema (userId + módulos permitidos em JSON)
- [x] Criar router de permissões (getPermissions, setPermissions, listUsers)
- [x] Criar tela /acesso com lista de usuários e checkboxes por módulo
- [x] Aplicar restrições no menu lateral (DashboardLayout) baseado nas permissões
- [x] Aplicar restrições nas rotas (redirecionar para /app se sem permissão)
- [ ] Módulos controlados: equipamentos, pecas, manutencao, horas-maquina, colaboradores, presencas, reflorestamento, cargas, clientes, portal-cliente, gps, relatorios

## 🪚 MÓDULO MOTOSSERRA COMPLETO (30/03/2026)

### Schema / Banco de Dados
- [x] Tabela `chainsaws` — cadastro de motosserras (modelo, número série, status)
- [x] Tabela `fuel_containers` — galões (tipo: puro/mistura, capacidade, volume atual)
- [x] Tabela `fuel_supply_events` — abastecimento de galões (data, litros, tipo, custo, financeiro)
- [x] Tabela `chainsaw_fuel_usage` — uso de combustível por motosserra no campo
- [x] Tabela `chainsaw_chains` — estoque de correntes (tipo: 30/34 dentes, qtd afiadas, qtd em campo)
- [x] Tabela `chainsaw_chain_events` — movimentações de correntes (campo→oficina→caixa, baixa estoque)
- [x] Tabela `chainsaw_parts` — peças/consumíveis do setor motosserra
- [x] Tabela `chainsaw_stock_movements` — movimentações de estoque (entrada/saída por OS ou uso)
- [x] Tabela `chainsaw_service_orders` — OS abertas (problema reportado, status, mecânico, conclusão)
- [x] Tabela `chainsaw_service_parts` — peças usadas por OS

### Backend (routers tRPC)
- [x] Router `chainsaws` — CRUD de motosserras
- [x] Router `chainsawFuel` — abastecimento de galões, uso no campo, baixa automática óleo 2T
- [x] Router `chainsawChains` — movimentação de correntes (campo/oficina/caixa/baixa estoque)
- [x] Router `chainsawParts` — CRUD de peças + movimentação de estoque
- [x] Router `chainsawServiceOrders` — abertura, atribuição, conclusão de OS

### Frontend (interface)
- [x] Página principal com abas: Motosserras | Abastecimento | Correntes | Peças/Estoque | OS
- [x] Aba Motosserras: lista de motores com status (campo/oficina/inativa)
- [x] Aba Abastecimento: painel dos galões (vermelho/verde) com volume atual, botão abastecer
- [x] Aba Abastecimento: ao abastecer galão verde → baixa automática 400ml óleo 2T no estoque
- [x] Aba Correntes: painel com saldo (afiadas em caixa / em campo / na oficina) por tipo (30/34 dentes)
- [x] Aba Correntes: enviar correntes para campo, registrar retorno para oficina, confirmar afiação, baixa de estoque
- [x] Aba Peças/Estoque: lista de peças com saldo, entrada e saída manual
- [x] Aba OS: lista de OS abertas/em andamento/concluídas, abertura de nova OS, conclusão pelo mecânico
- [x] Relatório de consumo para ADM (combustível, correntes, peças por período)

## 🔧 CORREÇÕES 31/03/2026
- [x] Corrigir ícone PWA que não atualiza no celular mesmo após reinstalação do app (renomeado para pwa-192-v3.png e pwa-512-v3.png)

---

## 🔧 CORREÇÕES MÓDULO MOTOSSERRAS (31/03/2026)

- [ ] Corrigir tabelas na Hostinger (SQL_MOTOSSERRAS_CORRECAO_HOSTINGER.sql)
- [ ] Migrar motosserras do módulo antigo (equipment) para tabela chainsaws
- [ ] Testar cadastro de nova motosserra após correção do SQL
- [ ] Testar abastecimento de combustível
- [ ] Testar controle de correntes

---

## 🔗 VINCULAR DESTINO AO CLIENTE (31/03/2026)

- [x] Adicionar campo client_id na tabela cargo_destinations (schema + SQL Hostinger)
- [x] Atualizar router listDestinations para retornar clientId vinculado
- [x] Atualizar formulário de cadastro de destino para selecionar cliente
- [x] Ao selecionar destino no formulário de carga, preencher clientId automaticamente
- [x] Portal do cliente: mostrar cargas vinculadas via clientId do destino
- [x] Gerar SQL de ALTER TABLE cargo_destinations ADD COLUMN client_id para Hostinger

---

## 🔧 CORREÇÕES E MELHORIAS - 01/04/2026

- [x] Corrigir erro chainsaw_chain_stock (tabela faltando na Hostinger - query 500)
- [x] Corrigir seleção de tipo de corrente no modal de movimentação (auto-inicializa 30 e 34 dentes)
- [x] Adicionar upload de imagem nas motosserras (igual Setores e Equipamentos)
- [x] Adicionar upload de imagem nas peças/consumíveis do módulo motosserras
- [x] Adicionar campo de imagem na abertura de OS
- [x] Corrigir portal do cliente Fazenda GW (SQL de vinculação gerado + query melhorada)
- [x] Gerar SQL completo com todas as tabelas faltantes na Hostinger (hostinger_update_v2.sql)

## 🔧 CORREÇÕES E MELHORIAS - 03/04/2026

- [x] Mover botões de acesso rápido do Painel para o topo da tela (DashboardLayout)
- [x] Sincronizar código com GitHub (push do checkpoint atual)

## 🔧 MELHORIAS - 03/04/2026 (v2)

- [x] Corrigir portal do cliente Fazenda GW (SQL executado - carga vinculada)
- [ ] Corrigir campo de destino no controle de cargas (tabela estava vazia - SQL gerado)
- [ ] Formulário de cargas: substituir campo texto de cliente por select dos clientes cadastrados
- [ ] Ocultar valores monetários em Presenças para não-admin (líderes de campo)
- [ ] Criar módulo de Gastos Extras com foto de nota fiscal
- [ ] Redesenhar Painel como tela de acesso rápido + explicações do sistema
- [ ] Criar Dashboard ADM com custos e controles para administradores
- [ ] Vincular motosserras aos equipamentos já cadastrados no sistema (usar imagens existentes)

---

## 💰 MÓDULO: GASTOS EXTRAS (03/04/2026)

- [x] Schema: tabela extra_expenses com categoria, valor, forma de pagamento, foto da nota
- [x] Backend: router extraExpenses com list, create, delete
- [x] Frontend: página ExtraExpenses.tsx com filtros, resumo por categoria e upload de foto
- [x] Rota /gastos-extras registrada no App.tsx
- [x] Item "Gastos Extras" adicionado ao menu lateral (DashboardLayout)
- [x] SQL de migração para Hostinger gerado (hostinger_extra_expenses.sql)
- [x] Valores monetários visíveis apenas para admin

---

## 🔧 MELHORIAS 03/04/2026

- [x] Ícone Receipt adicionado ao menu lateral para Gastos Extras
- [x] Menu lateral atualizado com item Gastos Extras (slug: null = visível para todos)
