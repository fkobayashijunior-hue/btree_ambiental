# 🌳 BTREE Ambiental - Sistema de Gestão

Sistema completo de gestão para operações de reflorestamento e corte de eucalipto.

---

## 📋 **Sobre o Projeto**

**Cliente:** BTREE Ambiental  
**Desenvolvedor:** Kobayashi - Desenvolvimento de Sistemas  
**Domínio:** https://btreeambiental.com/

Sistema desenvolvido para gerenciar equipamentos, cargas, combustível, presença de colaboradores, manutenções, peças, compras e notas fiscais.

---

## 🎨 **Identidade Visual**

**Cores:**
- Verde Turquesa: `#3DBAA0` (principal)
- Bege/Areia: `#C4B5A0` (secundária)
- Cinza Escuro: `#1F2937` (texto)

---

## 🚀 **Tecnologias**

### **Frontend:**
- React 19
- TypeScript
- TailwindCSS 4
- tRPC 11
- shadcn/ui
- Wouter (routing)
- Vite

### **Backend:**
- Node.js + Express
- tRPC
- MySQL/TiDB (Drizzle ORM)
- Hospedagem: Render

### **Armazenamento:**
- Cloudinary (imagens)
- S3 (arquivos)

---

## 📦 **Módulos do Sistema**

### **MVP (Versão 1.0):**
- ✅ Gestão de Usuários
- ✅ Cadastro de Equipamentos
- ✅ Controle de Saída de Cargas
- ✅ Controle de Combustível
- ✅ Registro de Presença
- ✅ Dashboard

### **Próximas Versões:**
- Controle de Recebimento de Cargas
- Controle de Motosserras
- Cadastro de Peças
- Solicitações de Compras
- Controle de Notas Fiscais
- Relatórios Avançados
- Notificações e Alertas
- PWA (Offline)

---

## 👥 **Perfis de Usuário**

1. Administrativo
2. Encarregado de Produção
3. Mecânico
4. Motosserrista
5. Carregador
6. Operador
7. Motorista
8. Terceirizado

---

## 🛠️ **Instalação e Desenvolvimento**

### **Pré-requisitos:**
- Node.js 22+
- pnpm 10+

### **Instalação:**
```bash
# Instalar dependências
pnpm install

# Configurar banco de dados
pnpm db:push

# Rodar em desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Rodar produção
pnpm start
```

---

## 📱 **Design Mobile-First**

O sistema foi desenvolvido com foco em dispositivos móveis, pois a maioria dos colaboradores trabalha no campo sem acesso a computadores.

**Funcionalidades Mobile:**
- Interface otimizada para celular
- Upload de fotos direto da câmera
- Formulários simplificados
- Botões grandes e fáceis de clicar
- Funcionalidade offline (em desenvolvimento)

---

## 🔐 **Autenticação**

Sistema de autenticação via Manus OAuth com controle de permissões baseado em perfis (RBAC).

---

## 📊 **Estrutura do Banco de Dados**

### **Tabelas Principais:**
- `users` - Usuários do sistema
- `user_profiles` - Perfis de acesso
- `equipment_types` - Tipos de equipamentos
- `equipment` - Equipamentos cadastrados
- `cargo_shipments` - Saídas de cargas
- `fuel_records` - Abastecimentos
- `attendance_records` - Registro de presença

---

## 📞 **Suporte**

**Desenvolvedor:** Fernando Kobayashi Junior  
**Email:** fkobayashijunior@gmail.com

---

## 📄 **Licença**

© 2026 Kobayashi - Desenvolvimento de Sistemas. Todos os direitos reservados.

---

**Versão:** 1.0.0 (DEMO)  
**Última atualização:** 08/02/2026
