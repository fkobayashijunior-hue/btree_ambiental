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

## CORREÇÕES 03/04/2026 (tarde)

- [x] Botões de acesso rápido (Cargas, Presenças, Abastecimento) devem aparecer no header fixo (topo), não embaixo — seção "Ações Rápidas" removida do Painel
- [x] Usuários com role=admin (Fábio Kobayashi e Julia Yui) devem sempre ver todos os módulos — SQL_ADMIN_FABIO_JULIA.sql gerado para corrigir no banco Hostinger

## BUGS E MELHORIAS 03/04/2026 (noite)

### BUGS CRÍTICOS
- [x] Portal do cliente: cargas da Fazenda GW não aparecem (corrigido: filtro agora inclui campo destination)
- [ ] Correntes: erro "Correntes insuficientes na caixa" ao enviar para campo (estoque não atualiza corretamente)
- [ ] Destino: erro ao cadastrar destino (client_id obrigatório no schema mas deve ser opcional)

### MELHORIAS VISUAIS
- [ ] Portal do cliente: trocar cor verde escuro pelo tom do portal do colaborador (mais claro/moderno)
- [ ] Logo do desenvolvedor (Kobayashi) não aparece no portal do cliente
- [ ] Avatar do usuário logado: mostrar foto do cadastro do colaborador em vez de círculo vazio

### MELHORIAS FUNCIONAIS (SPRINT ATUAL)
- [ ] Motosserras: campo de imagem deve puxar fotos do cadastro em Setores e Equipamentos
- [ ] Cargo de Líder: novo perfil que pode registrar presença mas não vê valores financeiros
- [ ] Presença: registrar localização GPS automática (identifica fazenda/sede) com opção de alterar manualmente

### FUNCIONALIDADES FUTURAS (PRÓXIMAS SPRINTS)
- [ ] Controle financeiro completo: cadastro de todos os gastos e entradas para relatórios e planilhas
- [ ] Campos específicos por tipo de equipamento (eliminar campo genérico de motosserra no futuro)
- [ ] Destino: remover vínculo obrigatório com cliente (mesmo destino pode receber carga de vários clientes)

---

## SPRINT 04/04/2026

### PDFs — Padronização de Cabeçalho/Rodapé
- [ ] Criar utilitário pdfTemplate.ts com cabeçalho BTREE (logo + título + subtítulo) e rodapé (logo Kobayashi + btreeambiental.com + QR Code)
- [ ] Aplicar template em: Ficha do Colaborador
- [ ] Aplicar template em: Relatório de Presenças
- [ ] Aplicar template em: Relatório de Cargas
- [ ] Aplicar template em: Relatório de Abastecimento
- [ ] Aplicar template em: Relatório de Peças/OS Motosserras
- [ ] Verificar e aplicar em todos os demais PDFs do sistema

### Cargo de Líder
- [ ] Adicionar role "lider" no enum de roles do schema (collaborators)
- [ ] Líder pode registrar presença mas não vê valores financeiros
- [ ] Registro de presença captura GPS automaticamente
- [ ] GPS identifica fazenda/sede mais próxima e pré-preenche o local
- [ ] Permite alterar manualmente o local
- [ ] Migração SQL para Hostinger

### Módulo Financeiro
- [ ] Schema: tabelas financial_entries (entradas) e financial_expenses (saídas)
- [ ] Categorias configuráveis
- [ ] Tela de lançamentos com filtro por período e categoria
- [ ] Dashboard financeiro: receitas x despesas x saldo
- [ ] Exportação para Excel e PDF
- [ ] Acesso restrito a admin

### Vincular Cargas Antigas ao Cliente
- [ ] Gerar SQL para atualizar clientId das cargas com clientName = 'Fazenda GW'

---

## 💰 MÓDULO FINANCEIRO (03/04/2026)

- [x] Schema DB: tabela financial_entries (tipo, categoria, valor, data, forma de pagamento, status)
- [x] Router backend: financial.ts com list, monthlySummary, categoryBreakdown, monthlyHistory, create, update, delete
- [x] Registrar router financeiro no routers.ts principal
- [x] Adicionar slug "financeiro" na lista de módulos do sistema (permissions.ts)
- [x] Página FinancialModule.tsx com 3 abas: Dashboard, Lançamentos, Relatório
- [x] Dashboard com cards de resumo (receitas, despesas, saldo)
- [x] Gráfico de barras - histórico mensal (últimos 12 meses)
- [x] Gráficos de pizza - receitas e despesas por categoria
- [x] Breakdown por categoria com totais
- [x] Formulário de cadastro de receitas e despesas (Sheet lateral)
- [x] Edição e exclusão de lançamentos
- [x] Exportação de relatório mensal em PDF com cabeçalho/rodapé padrão BTREE
- [x] Rota /financeiro no App.tsx
- [x] Item "Financeiro" no menu lateral (DashboardLayout)
- [x] Testes unitários: 29 testes passando (financial.test.ts)

## 📍 GPS NA TELA DE PRESENÇAS (03/04/2026)

- [x] Captura automática de GPS ao abrir formulário de registro de presença
- [x] Detecção do nome do local baseada nas coordenadas (Fazenda GW, Sede, etc.)
- [x] Ocultar valores financeiros (diária, PIX) quando perfil é "Líder"
- [x] Exibição do local GPS nos cards de presença
- [x] Schema já tinha campos latitude, longitude, locationName na tabela collaborator_attendance

---

**Última atualização:** 03/04/2026

---

## 🔗 INTEGRAÇÃO FOLHA DE PAGAMENTO → FINANCEIRO (03/04/2026)

- [ ] Botão "Lançar no Financeiro" na tela de Presenças (por mês)
- [ ] Calcular total de diárias do mês por colaborador
- [ ] Criar lançamento automático de despesa "Folha de Pagamento" no módulo financeiro
- [ ] Evitar lançamento duplicado (verificar se já existe para o mês)
- [ ] Mostrar status de lançamento no resumo mensal de presenças

## 📍 CONFIGURAÇÃO DE LOCAIS GPS (03/04/2026)

- [ ] Criar página/modal de configuração de locais GPS (admin)
- [ ] Tabela gps_locations no schema (nome, latitude, longitude, raio em metros)
- [ ] Pré-popular com locais conhecidos (Fazenda GW, Sede, etc.)
- [ ] Usar locais cadastrados na detecção automática da tela de presenças
- [ ] Permitir adicionar/editar/remover locais pelo admin

## 📄 PADRONIZAÇÃO DE PDFs (03/04/2026)

- [ ] Auditar todos os PDFs do sistema
- [ ] Padronizar PDF de Presenças com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Cargas com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Motosserras com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Gastos Extras com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Clientes com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Veículos/Abastecimento com cabeçalho/rodapé BTREE
- [ ] Padronizar PDF de Peças com cabeçalho/rodapé BTREE

---

## ✅ IMPLEMENTAÇÕES 03/04/2026 (SESSÃO 2)

### Cadastro de Locais GPS
- [x] Tabela gps_locations no banco de dados (criada via SQL direto)
- [x] Schema gps_locations no drizzle/schema.ts
- [x] Router gpsLocations.ts com CRUD completo
- [x] Página GpsLocationsPage.tsx com captura da localização atual
- [x] Botão "Usar minha localização atual" — captura GPS do dispositivo
- [x] Rota /locais-gps no App.tsx
- [x] Item "Locais GPS" no menu lateral (DashboardLayout)
- [x] AttendanceList atualizado para usar locais do banco (não mais lista fixa)

### Padronização de PDFs
- [x] MachineHoursPage: PDF convertido para HTML/CSS com logo BTREE no cabeçalho e logo Kobayashi + QR code no rodapé
- [x] VehicleControlPage: PDF convertido para HTML/CSS com logo BTREE no cabeçalho e logo Kobayashi + QR code no rodapé
- [x] Todos os PDFs do sistema agora seguem o padrão BTREE (cabeçalho verde com logo + rodapé Kobayashi + QR)

### Status de todos os PDFs do sistema
- [x] AttendanceList — padrão BTREE ✅
- [x] CargoControl — padrão BTREE ✅
- [x] CollaboratorDetail — padrão BTREE ✅
- [x] EquipmentDetail — padrão BTREE ✅
- [x] FinancialModule — padrão BTREE ✅
- [x] PartsPage — padrão BTREE ✅
- [x] MachineHoursPage — padrão BTREE ✅ (padronizado nesta sessão)
- [x] VehicleControlPage — padrão BTREE ✅ (padronizado nesta sessão)

---

## 🔗 SPRINT 04/04/2026 — SESSÃO 3

### Lançamento Automático Folha de Pagamento
- [x] Botão "Lançar Folha no Financeiro" na tela de Presenças
- [x] Calcular total de diárias do mês selecionado
- [x] Criar lançamento automático como despesa "Folha de Pagamento" no módulo financeiro
- [x] Verificar duplicidade antes de lançar (evitar lançamento duplo)
- [x] Exibir badge/status indicando se o mês já foi lançado

### Bugs Críticos
- [x] Portal do cliente: cargas da Fazenda GW não aparecem (corrigido: filtro agora inclui campo destination)
- [x] Destino: erro ao cadastrar destino sem cliente vinculado (já estava correto no backend e frontend)

### Avatar do Usuário Logado
- [x] Exibir foto do colaborador logado no menu lateral (já estava implementado via getMyPhoto)

---

## 🚀 SPRINT 04/04/2026 — PARTE 2

- [ ] Criar tabela financial_entries no banco da Hostinger via SQL
- [ ] Exportação PDF na aba Relatório do módulo financeiro (padrão BTREE)
- [ ] Notificações automáticas de pagamento pendente (> 7 dias)
- [ ] Corrigir erro 404 do Service Worker PWA (rotas novas não encontradas no cache do PWA)

---

## 🚀 SPRINT 04/04/2026 — PARTE 3

- [ ] Gerar SQL para criação das tabelas financial_entries e gps_locations (para phpMyAdmin)
- [ ] Reposicionar botões de acesso rápido no topo do painel (como era antes, maiores)

---

## 🐛 BUGS SPRINT 04/04/2026 (Tarde)

- [ ] BUG: Dados de presenças antigas sumiram - investigar e corrigir filtro/query
- [ ] Exibir imagens das motosserras vindas do cadastro de Setores e Equipamentos
- [ ] BUG: Aba Mensal mostra 0 presenças em março/2026 - investigar datas no banco da Hostinger
- [ ] BUG: Portal do cliente Fazenda GW mostra 0 cargas, 0 replantios e 0 pagamentos

## 🚀 SPRINT 04/04/2026 — SESSÃO 4 (Noite)

### Portal do Cliente — Correções
- [x] Portal do cliente Fazenda GW: cargas agora aparecem (corrigido try/catch no getPortalData)
- [ ] Corrigir cadastro de destinos (client_id deve ser opcional)

### Tracking de Cargas com Fotos (Fluxo Motorista)
- [ ] Implementar sistema de etapas de tracking com upload de fotos
- [ ] Etapas do fluxo principal (caminhão próprio):
  - [ ] 1. Início do carregamento (foto)
  - [ ] 2. Fim do carregamento (foto)
  - [ ] 3. Pesagem na balança (foto)
  - [ ] 4. Nota fiscal recebida (foto/PDF)
  - [ ] 5. Nota entregue ao motorista
  - [ ] 6. Descarga + pesagem/medição do receptor (foto dos papéis)
  - [ ] 7. Cliente envia boleto (foto)
  - [ ] 8. Confirmação de pagamento
- [ ] Fluxo simplificado (carga de terceiros):
  - [ ] 1. Enviar nota de transporte
  - [ ] 2. Receber finalização após descarga (foto)
  - [ ] 3. Registro financeiro
- [ ] Interface mobile simples: motorista tira foto e clica "Próximo"
- [ ] Portal do cliente: timeline visual com fotos de cada etapa

### Replantios (Admin + Portal do Cliente)
- [ ] Tela no admin para cadastrar replantios vinculados a clientes
- [ ] Formulário: cliente, área, espécie, quantidade, data, fotos, notas
- [ ] Listagem de replantios com filtros
- [ ] Portal do cliente: aba Replantio mostra replantios do cliente

### Pagamentos do Cliente (Admin + Portal do Cliente)
- [ ] Tela no admin para registrar pagamentos de clientes
- [ ] Formulário: cliente, mês referência, volume m³, preço/m³, deduções, valor líquido, vencimento, PIX
- [ ] Status: pendente, pago, atrasado, cancelado
- [ ] Portal do cliente: aba Pagamentos mostra pagamentos do cliente
- [ ] Gerar boleto/comprovante em PDF

---


## 🚀 SPRINT 04/04/2026 — SESSÃO 5

### Tracking de Cargas com Fotos por Etapa
- [x] Criar tabela cargo_tracking_photos no schema (cargoId, etapa, fotoUrl, notas, timestamp)
- [x] Backend: procedures para upload de foto por etapa, listar fotos por carga
- [x] Backend: procedure pública getTrackingPhotosPublic para portal do cliente
- [ ] Frontend: tela mobile de tracking para motoristas (botão grande "Tirar Foto" por etapa)
- [ ] Fluxo completo: 8 etapas (início carregamento → confirmação pagamento)
- [ ] Fluxo simplificado: 3 etapas (nota transporte → fotos descarga → financeiro)
- [x] Portal do cliente: timeline com fotos de cada etapa

### Tela Admin de Replantios
- [x] Página ReplantingPage.tsx com listagem e formulário de cadastro
- [x] Filtros por cliente e busca
- [ ] Upload de fotos do replantio
- [x] Rota /replantios no App.tsx
- [x] Item no menu lateral

### Tela Admin de Pagamentos de Clientes
- [x] Página ClientPaymentsPage.tsx com listagem e formulário de cadastro
- [x] Filtros por cliente, status e período
- [x] Marcar como pago/atrasado
- [x] Rota /pagamentos-clientes no App.tsx
- [x] Item no menu lateral
- [x] Testes vitest para procedures (clientPortal.test.ts)

---

## 📌 REGRAS DE WORKFLOW
- [x] Sempre fazer push no GitHub após salvar checkpoint
- [x] Sempre enviar script SQL ao usuário quando houver alteração no banco de dados


## 🐛 BUGS 04/04/2026 — SESSÃO 5b
- [x] Botão "Ver Tracking" na página Controle de Cargas não mostra tracking, só alterna texto
- [x] Replantios não aparece no menu lateral do dashboard (faltava slug no SYSTEM_MODULES)
- [x] Pagamentos de Clientes não aparece no menu lateral do dashboard (faltava slug no SYSTEM_MODULES)


## 🐛 BUG 05/04/2026 — Login não funciona na Hostinger
- [x] Erro "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" ao tentar login
- [x] Backend retornando HTML em vez de JSON nas chamadas de API
- [x] 403 Forbidden em aba anônima - public_html estava vazio
- [x] Causa raiz: arquivos estáticos (index.html, CSS, JS) não copiados para public_html
- [x] Correção: copiados manualmente + build.sh atualizado para copiar automaticamente


## 🚀 SPRINT 05/04/2026 — Simplificação do Controle de Cargas para Motoristas

### Experiência do Motorista
- [x] Ao logar, motorista vê Controle de Cargas com seu caminhão pré-selecionado
- [x] Auto-preenchimento: motorista, caminhão, metragem prevista (2,4 x 2,4 x 13,80 padrão 6 pilhas)
- [x] Metragem configurável (comprimento pode mudar conforme pedido do cliente)
- [x] Seleção simples de Cliente (local de extração) via dropdown
- [x] Seleção simples de Destino via dropdown
- [x] Tracking com fotos por etapa: clicar na etapa → abre câmera → envia foto
- [x] Etapas: Carregando → Pesagem Saída → Em Trânsito → Descarregando → Pesagem Chegada → Finalizado

### Visibilidade e Controle
- [x] Portal do cliente: timeline com fotos de cada etapa visível
- [x] Admin: visão completa de todas as cargas com tracking, fotos e documentos
- [x] Transparência: todas as informações disponíveis para cliente e admin

## 🔧 MELHORIAS 05/04/2026 — Peso/Metragem Final + Medidas por Caminhão

### Peso e Metragem Final
- [x] Adicionar campos peso_saida_kg, peso_chegada_kg, metragem_final ao schema cargo_loads
- [x] Motorista registra peso e metragem final ao concluir a carga
- [x] Admin e cliente visualizam peso e metragem final

### Medidas Padrão por Caminhão
- [x] Adicionar campos default_height, default_width, default_length ao schema equipment
- [x] Ao selecionar caminhão, preencher medidas padrão do caminhão automaticamente
- [x] Admin pode configurar medidas padrão de cada caminhão no cadastro de equipamentos

### Git e SQL
- [x] Push no GitHub (btree_ambiental)
- [x] Gerar script SQL com nova tabela cargo_tracking_photos e novos campos

## 🔧 PRÓXIMOS PASSOS 05/04/2026 — Funcionar Tudo de Ponta a Ponta

### 1. Medidas Padrão por Caminhão (Admin)
- [x] Adicionar campos de medidas padrão no formulário de cadastro/edição de equipamento
- [x] Exibir medidas padrão na listagem de equipamentos (caminhões)

### 2. Vincular Colaborador a Usuário
- [x] Adicionar campo userId no formulário de cadastro/edição de colaborador
- [x] Dropdown de usuários disponíveis para vincular ao colaborador
- [x] Procedure backend para listar usuários disponíveis para vinculação

### 3. Peso e Metragem Final no Portal do Cliente e Admin
- [x] Exibir peso saída/chegada nos detalhes da carga (admin CargoControl)
- [x] Exibir metragem final nos detalhes da carga (admin CargoControl)
- [x] Exibir peso e metragem final no portal do cliente (ClientPortal)

### 4. Git e SQL
- [x] Push no GitHub
- [x] Script SQL se houver alterações de tabela

## 🐛 CORREÇÕES 05/04/2026 — Auto-preenchimento medidas no admin
- [x] Formulário Nova Carga (admin): ao selecionar caminhão, preencher medidas padrão automaticamente
- [x] Verificar se a página /motorista está acessível e funcionando

## 🐛 BUG 05/04/2026 — Campos não aparecem
- [x] Campos de medidas padrão (altura, largura, comprimento) não aparecem no formulário de editar equipamento
- [x] Card de vincular usuário não aparece no detalhe do colaborador (adicionado também no painel lateral de edição)

## 🐛 BUG 09/04/2026
- [x] Erro "The string did not match the expected pattern" no login do colaborador

## 🐛 BUG 09/04/2026
- [x] Erro "The string did not match the expected pattern" no login do colaborador

## 🐛 CORREÇÕES 10/04/2026

- [x] Corrigir lista de presenças que não atualiza após registrar (presença salva no banco mas não aparece na listagem)
- [x] Gerar script SQL CONSOLIDADO com TODAS as alterações pendentes para banco Hostinger
- [x] Garantir Git atualizado com push para GitHub

## 📊 RELATÓRIOS POR LOCAL/FAZENDA - 11/04/2026

- [x] Criar cadastro de locais/fazendas padronizados
- [x] Permitir editar/padronizar nomes de locais já cadastrados
- [x] Adicionar campo de local nos registros de consumo (combustível, óleo, etc.)
- [x] Vincular presenças e cargas aos locais
- [x] Criar router de relatórios com queries por dia/semana/mês agrupadas por local
- [x] Criar Dashboard executiva bonita para diretores com dados visuais
- [x] Implementar geração de relatórios em PDF (mão de obra, consumo, cargas)
- [x] Relatório com seções opcionais (incluir/excluir cargas)
- [x] Compilar dist/ e fazer push no Git

## 🔧 PRÓXIMOS PASSOS 11/04/2026 — Seletor de Local nos Formulários + Padronização

### Verificação Git/Deploy
- [x] Verificar se último push foi feito corretamente no GitHub
- [x] Recompilar dist/ e fazer push (commit 47b7f66)

### Seletor de Local nos Formulários de Consumo
- [x] Criar componente WorkLocationSelect reutilizável
- [x] Criar hook useWorkLocations para buscar locais GPS
- [x] Adicionar dropdown de local no formulário de veículos (VehicleRecords)
- [x] Adicionar dropdown de local no formulário de abastecimento de máquinas (MachineFuel)
- [x] Adicionar dropdown de local no formulário de horas de máquina (MachineHours)
- [x] Adicionar dropdown de local no formulário de despesas extras (ExtraExpenses)
- [x] Adicionar dropdown de local no formulário de presenças (Attendance - dinâmico)
- [x] Adicionar dropdown de local no formulário de cargas (CargoLoads)
- [x] Backend: extraExpenses, vehicleRecords, machineHours, cargoLoads aceitam workLocationId

### Padronização de Nomes de Locais
- [x] Interface já existe em GPS Locations (cadastro de locais padronizados)
- [ ] Permitir mesclar/renomear locais duplicados (futuro)
- [ ] Atualizar registros vinculados ao nome antigo para o novo (futuro)

### Build e Deploy
- [x] Compilar dist/ e fazer push no Git (commit 47b7f66)
- [x] Sem alterações de schema necessárias (workLocationId já existia nas tabelas)

## 🔤 ORDENAÇÃO ALFABÉTICA - LISTA DE PRESENÇAS (11/04/2026)

- [x] Ordenar lista de presenças por nome do colaborador em ordem alfabética (visão diária + semanal + PDF)

## 📍 AGRUPAMENTO POR LOCAL + EDIÇÃO DE LOCAL (11/04/2026)

### Presenças
- [x] Agrupar lista de presenças por local de trabalho (separar visualmente por fazenda/local)
- [x] Permitir editar o local de trabalho de presenças já registradas
- [x] Mostrar seção "Sem local atribuído" para registros antigos sem local

### Consumos (Veículos, Máquinas, Despesas, Cargas)
- [x] Exibir local de trabalho nos cards de veículos, máquinas, despesas e cargas
- [x] Backend updateLocation pronto para presenças e despesas extras
- [x] Backend update com workLocationId pronto para veículos, máquinas e cargas
- [x] Edição de local via formulário de edição existente (veículos, máquinas, cargas)

### Build e Deploy
- [x] Compilar dist/ e fazer push no Git (commit 7ab198f)

## 🐛 CORREÇÕES URGENTES (12/04/2026)

### Presenças - Edição de Local
- [x] Corrigir botão de editar local nas presenças (dist/ recompilado com funcionalidade)
- [x] Garantir que registros antigos possam ter o local atualizado (mutation updateLocation)

### PDF de Presenças
- [x] Adicionar coluna "Local de Trabalho" no PDF diário de presenças
- [x] Adicionar coluna "Local" no PDF semanal de presenças

### Motosserras
- [x] Adicionar campo de local de trabalho nos 3 formulários de combustível (abastecer, uso, transferência)
- [x] Adicionar workLocationId ao backend de motosserras + schema DB atualizado

### Controle de Acesso (Permissões por Perfil)
- [x] Fazer Controle de Acesso funcionar para a equipe usar o sistema
- [x] Equipe NÃO pode ver valores financeiros (módulos financeiros protegidos)
- [x] Equipe PODE registrar valores de peças, combustível etc.
- [x] Motorista: acesso a equipamentos + cargas + abastecimento
- [x] Perfis atualizados: admin, mecânico, operador, motorista, motosserrista, líder, equipe, personalizado
- [x] Módulos novos no RBAC: gastos-extras, locais-gps, abastecimento, dashboard-exec
- [x] Slugs do menu lateral corrigidos para corresponder aos módulos de permissão

### Simplificação do Menu (Futuro)
- [ ] Unificar "Controle de Cargas" e "Minha Carga" em um único módulo
- [ ] Simplificar campos duplicados de manutenção e abastecimento

## 🐛 CORREÇÕES + NOVOS RECURSOS (12/04/2026 - Parte 2)

### Bug: Erro removeChild no Dashboard Executivo e Presenças
- [x] Investigar erro "removeChild" ao mudar data no Dashboard Executivo
- [x] Investigar erro "removeChild" ao clicar em Presenças
- [x] Corrigir o bug de renderização React (translate=no, key props, remoção de capitalize CSS)

### PDF de Presenças - PIX não atualiza
- [x] Verificar se o PDF busca dados atualizados do colaborador (PIX do Gilmar)
- [x] Corrigir para que o PDF sempre use dados mais recentes (fallback para collaboratorPixKey)

### Seletor de Período para PDF de Presenças
- [x] Criar seletor de intervalo de datas para gerar PDF de presenças (nova aba "PDF")
- [x] Permitir selecionar dias específicos ou intervalo (de/até)

### Relatório de Consumos/Gastos em PDF
- [x] Criar relatório PDF com todos os gastos da operação (presenças + combustível + despesas + cargas)
- [x] Layout profissional com logo da empresa para enviar à chefe
- [x] Permitir gerar PDF para todos os locais (sem precisar selecionar um específico)
- [x] Adicionado logo BTREE e Kobayashi no cabeçalho/rodapé do PDF
- [x] Corrigido campo equipment.plate para equipment.licensePlate
- [ ] Filtro por período e por local de trabalho

### Bug: Local de trabalho salvo no campo errado
- [x] Presença salva local de trabalho no campo location_name em vez de work_location
- [x] Dashboard Executivo filtra por work_location, então não encontra os registros
- [x] Corrigir backend para salvar ambos campos (locationName + workLocationId) com resolução automática
- [x] Corrigir updateLocation e updateLocationBatch para também resolver ambos campos
- [ ] Script SQL para corrigir registros antigos que têm location_name mas não work_location_id

### Exportação Excel com ExcelJS no Abastecimento
- [x] Instalar ExcelJS e file-saver no projeto
- [x] Substituir xlsx por ExcelJS com formatação profissional
- [x] Usar mesmos padrões visuais do PDF (cores verde BTREE, cabeçalho, resumo, rodapé)
- [x] Botão de exportação Excel já existente no frontend (reutilizado)
- [x] Build e push para GitHub

### Bug: Erro ao gerar Excel no Controle de Abastecimento
- [x] Build antigo na Hostinger ainda referencia xlsx-DGuHH-KN.js (pacote antigo) - removido xlsx
- [x] O novo build com ExcelJS precisa ser deployado corretamente - push feito
- [x] Verificar se o import dinâmico do ExcelJS funciona no build de produção
- [x] Adicionado cleanupOutdatedCaches/skipWaiting/clientsClaim no workbox para forçar atualização

### Integração GPS/Traccar - Nova Conta
- [x] Verificar estado atual do módulo GPS no projeto
- [x] Gerar novo token API do Traccar (expira 31/12/2027)
- [x] Configurar TRACCAR_URL e TRACCAR_TOKEN no sistema BTREE
- [x] Testar conexão com a API do Traccar (vitest passou)
- [x] Preparar guia de configuração dos dispositivos EC33 com chips EMnify
- [ ] Build e push para GitHub

### Bug: App BTREE mostra 0 dispositivos GPS apesar do Traccar estar conectado
- [x] Investigar por que o app mostra "Traccar conectado" mas 0 dispositivos
- [x] Verificar se o token está configurado corretamente na Hostinger (token antigo na env)
- [x] Corrigir para que os dispositivos apareçam no app (atualizar TRACCAR_TOKEN na Hostinger)

### Substituir Google Maps por Leaflet/OpenStreetMap no Rastreamento GPS
- [x] Instalar leaflet e @types/leaflet
- [x] Substituir MapView do Google Maps por Leaflet no GpsTrackingPage
- [x] Manter marcadores, histórico de rota e funcionalidades existentes
- [x] Build funciona sem erros
- [x] Push para GitHub

### Melhoria Controle de Cargas - Agrupamento por Cliente (14/04/2026)
- [x] Ordenar cargas por data (mais recente primeiro)
- [x] Agrupar/separar cargas por cliente para facilitar visualização e conferência
- [x] Manter funcionalidade de cadastro manual pelo admin
- [x] Push para GitHub

### Correções Minha Carga + Integração + Permissões (16/04/2026)
- [x] Corrigir gravação do Minha Carga (integração já funcional via create mutation)
- [x] Integrar Minha Carga com Controle de Cargas (registros aparecem lá)
- [x] Integrar Minha Carga com Portal do Cliente (registros aparecem para clientes)
- [x] Adicionar Minha Carga no Controle de Acesso (permissões configuráveis)
- [x] Ocultar painel financeiro para colaboradores/motoristas
- [x] Adicionar botão voltar no Portal do Cliente
- [x] Adicionar campo peso bruto (pesada de saída) na carga
- [x] Adicionar campo peso líquido (final da carga) na carga
- [x] Push para GitHub
- [ ] Enviar scripts SQL ao usuário

### Correções Rastreamento GPS (21/04/2026)
- [x] Corrigir horas trabalhadas não aparecendo (summary do Traccar com engineHours)
- [x] Corrigir relatório de viagens vazio (seletor de período com datas)
- [x] Corrigir histórico de rotas vazio (seletor de período + resumo horas/distância)
- [x] Corrigir botões/abas encavalados no layout (scroll horizontal + textos responsivos)
- [x] Melhorar mapa ao vivo com auto-refresh (refetchInterval 10s + indicador visual)
- [x] Preparar integração manutenção preventiva por horímetro (abastecimento, troca de óleo, engraxamento)
- [x] Compilar e push para GitHub
- [x] Sem novas tabelas/colunas nesta atualização (apenas frontend)

### Correções GPS Mobile + Lógica Stats (21/04/2026)
- [x] Corrigir layout mobile: números fora das caixas, cards desalinhados
- [x] Corrigir lógica "Em movimento": considerar ignição ligada + velocidade > 2km/h + online
- [x] Corrigir "Vel. máx. agora": mostra 0 se nenhum dispositivo está realmente em movimento
- [x] Dispositivos na lista com velocidade, ignição, data e badge "Movendo"
- [x] Compilar e push para GitHub

### Documentos Financeiros nas Cargas + Integração Financeiro (22/04/2026)
- [x] Adicionar campos nota_url, boleto_url, comprovante_url, payment_status no schema cargo_loads
- [x] Backend: rotas para upload de nota, boleto e comprovante por carga
- [x] CargoControl: botões para anexar nota, boleto e comprovante em cada carga
- [x] Portal do Cliente: exibir nota, boleto e comprovante compartilhados
- [x] Minha Carga (motorista): exibir nota da viagem
- [x] Financeiro: listar cargas com boleto como "despesas a pagar"
- [x] Financeiro: ao anexar comprovante, mudar automaticamente para "despesas pagas"
- [x] Compilar e push para GitHub
- [x] Enviar scripts SQL ao usuário

### Relatórios PDF de Cargas (24/04/2026)
- [x] PDF individual: ficha da carga com motorista, caminhão, imagens e dados completos
- [x] PDF completo: relatório tabular com todas as cargas de um cliente (peso, caminhão, motorista, metragem, nota, data)
- [x] Seguir identidade visual BTREE (logo, cores verde)
- [x] Botões de geração no CargoControl (individual e por cliente)
- [x] Compilar e push para GitHub

### Correções 28/04/2026
- [x] Corrigir erro 404 ao abrir o app na Hostinger (SPA routing - .htaccess)
- [x] Adicionar foto do motorista no PDF da carga (buscar foto cadastrada do colaborador)
- [x] Remover "tempo de operação" da landing page/Landing.tsx
- [x] Corrigir erro de parse no CargoControl.tsx (resolvido após restart do servidor)
- [x] Compilar e push para GitHub (commit 180dc2b)

### Correções 01/05/2026
- [x] Corrigir erro 404 ao abrir o app (start_url do PWA apontava para /dashboard que não existe, alterado para /)

### Upgrade SIMFLOR 01/05/2026
- [x] Upload documentos SIMFLOR (proposta + contrato) e criar campo de documentos no cliente
- [x] Criar tabela de fechamentos semanais (sáb-sex) com cálculo de valores (R$130/ton)
- [x] Implementar lógica de fechamento semanal com vencimento em 20 dias
- [x] Exibir valor calculado por carga (toneladas x R$130) no controle de cargas
- [x] Exibir total semanal e data de vencimento nos fechamentos
- [x] Implementar acesso restrito do Juliano (só vê/gerencia SIMFLOR)
- [x] Juliano pode: adicionar gastos extras, manutenções, abastecimentos (só SIMFLOR)
- [x] Juliano NÃO pode: ver financeiro geral, outras roças/clientes (via allowedClientIds)
- [x] Compilar e push para GitHub (commit 208aa13)

### Bug 02/05/2026
- [x] Clientes sumiram da página de Clientes (filtro active corrigido para aceitar NULL)

### Melhorias 02/05/2026
- [x] Adicionar "Lembrar-me" no portal do cliente (salvar sessão no localStorage)
- [x] Criar seção de documentos (proposta/contrato) na página de edição do cliente

### Bugs e Melhorias 02/05/2026 (2)
- [x] Erro no INSERT client_documents (passando createdAt explicitamente)
- [x] Controle de Acesso atualizado (mostra usuários logados + seletor de clientes permitidos)
- [x] Adicionar seletor de cliente/local ao perfil Encarregado (vincular ao cliente)
- [x] Separar gastos por local/cliente (admin vê tudo, encarregado só vê o dele via allowedClientIds + clientId no local GPS)

### Bugs Persistentes 03/05/2026
- [ ] Erro INSERT client_documents persiste na Hostinger (mesmo passando createdAt explicitamente)
- [ ] Controle de Acesso continua vazio (nenhum usuário aparece)

### Correções 03/05/2026 (2)
- [x] Controle de Acesso: listar TODOS os colaboradores (não só usuários OAuth)
- [x] Colaboradores: adicionar campo client_id para vincular a cliente/operação
- [x] Controle de Acesso: permitir definir permissões e cliente vinculado por colaborador
- [x] Perfil encarregado: ocultar valores financeiros mas mostrar equipamentos (filtro server-side)
- [x] Equipamentos: adicionar campo client_id para vincular a cliente/operação
- [x] Equipamentos: filtrar por allowedClientIds para encarregados
- [x] Equipamentos: seletor de cliente na tela de cadastro (admin pode alterar/remanejar)
- [x] Cargas: filtro server-side por allowedClientIds (encarregado só vê cargas do cliente dele)

### Correções 03/05/2026 (3) - Descobertas via phpMyAdmin
- [x] collaborators.user_id está NULL para TODOS - vincular automaticamente no login OAuth (match por email)
- [x] listUsers: funcionar mesmo quando user_id é NULL (mostrar todos os collaborators)
- [x] Filtro cargas: quando allowedClientIds não configurado, não bloquear tudo (fallback)
- [x] Adicionar campo "Local de Trabalho" (client_id) na tela de Colaboradores
- [x] SQL para Hostinger: vincular Juliano (collaborator id=12) ao user OAuth dele

### Correções 04/05/2026
- [x] Gastos Extras: filtrar por allowedClientIds server-side (encarregado vê só do cliente dele)
- [x] Abastecimentos (veículos + máquinas): filtrar por allowedClientIds server-side via workLocationId → gpsLocations.clientId
- [x] Presenças: filtrar por allowedClientIds server-side via workLocationId → gpsLocations.clientId + collaborator.clientId
- [x] Horas de Máquina: filtrar por allowedClientIds server-side via workLocationId → gpsLocations.clientId
