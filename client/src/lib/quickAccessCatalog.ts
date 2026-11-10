// @ts-nocheck
// Catálogo dos atalhos que podem aparecer no Painel. O id é o caminho da tela; o slug é o módulo de permissão.
import {
  ClipboardList, Truck, UserCheck, Users, Layers, Car, Package, Scissors, Wrench, Receipt, Wallet, Globe, Target,
  FileText, FileCheck, FileBarChart, Leaf, Navigation, Map, Fuel, Building2, ShoppingCart, TrendingDown, TrendingUp,
  Landmark, ArrowLeftRight, BarChart3, Shirt,
} from "lucide-react";

export type AtalhoPainel = { id: string; label: string; path: string; slug: string | null; icon: any; color: string };

const a = (label: string, path: string, slug: string | null, icon: any, color: string): AtalhoPainel => ({ id: path, label, path, slug, icon, color });

export const CATALOGO_PAINEL: AtalhoPainel[] = [
  a("Presenças", "/presencas", "presencas", ClipboardList, "bg-blue-500"),
  a("Cargas", "/cargas", "cargas", Truck, "bg-teal-500"),
  a("Metas Semanais", "/metas-semanais", "metas-semanais", Target, "bg-lime-600"),
  a("Colaboradores", "/colaboradores", "colaboradores", UserCheck, "bg-emerald-500"),
  a("Clientes", "/clientes", "clientes", Users, "bg-green-500"),
  a("Equipamentos", "/setores", "equipamentos", Layers, "bg-orange-500"),
  a("Abastecimento", "/veiculos", "abastecimento", Car, "bg-yellow-500"),
  a("Peças", "/pecas", "pecas", Package, "bg-purple-500"),
  a("Motosserras", "/motosserras", "motosserras", Scissors, "bg-red-500"),
  a("Máquinas", "/maquinas", "manutencao", Wrench, "bg-gray-500"),
  a("Meus Gastos", "/meus-gastos", "meus-gastos", Receipt, "bg-rose-600"),
  a("Gastos Extras", "/gastos-extras", "gastos-extras", Receipt, "bg-pink-500"),
  a("Financeiro", "/financeiro", "financeiro", Wallet, "bg-indigo-500"),
  a("Portal Cliente", "/client-portal", "portal-cliente", Globe, "bg-cyan-500"),
  a("Contas a Pagar", "/contas-a-pagar", "contas-a-pagar", TrendingDown, "bg-rose-500"),
  a("Contas a Receber", "/contas-a-receber", "contas-a-receber", Landmark, "bg-sky-600"),
  a("Folha de Pagamento", "/folha-pagamento", "folha-pagamento", Users, "bg-violet-500"),
  a("Fluxo de Caixa", "/fluxo-de-caixa", "fluxo-de-caixa", TrendingUp, "bg-emerald-600"),
  a("Extrato", "/extrato-movimentacoes", "extrato-movimentacoes", ArrowLeftRight, "bg-slate-500"),
  a("Dashboard Financeiro", "/dashboard-financeiro", "dashboard-financeiro", BarChart3, "bg-fuchsia-500"),
  a("Controle de Notas", "/controle-notas", "controle-notas", FileText, "bg-amber-500"),
  a("Conferência de Notas", "/conferencia-notas", "conferencia-notas", FileCheck, "bg-orange-600"),
  a("Relatório de Destinos", "/relatorio-destinos", "relatorio-destinos", FileBarChart, "bg-teal-600"),
  a("Replantios", "/replantios", "replantios", Leaf, "bg-green-600"),
  a("Rastreamento GPS", "/rastreamento-gps", "gps", Navigation, "bg-blue-600"),
  a("Locais GPS", "/locais-gps", "locais-gps", Map, "bg-cyan-600"),
  a("Combustível: fornecedores", "/fornecedores-combustivel", "fornecedores-combustivel", Fuel, "bg-yellow-600"),
  a("Compradores", "/compradores", "compradores", Building2, "bg-indigo-600"),
  a("Compras", "/compras", "compras", ShoppingCart, "bg-purple-600"),
  a("Uniformes", "/uniformes", "uniformes", Shirt, "bg-stone-500"),
];

// Padrão (o que todos veem, filtrado pelo acesso de cada um)
export const PADRAO_PAINEL: string[] = [
  "/presencas", "/cargas", "/colaboradores", "/clientes", "/setores", "/veiculos",
  "/pecas", "/motosserras", "/maquinas", "/gastos-extras", "/financeiro", "/client-portal",
];
