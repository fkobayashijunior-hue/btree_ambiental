import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissions } from "@/hooks/usePermissions";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, UserCheck, Truck, ClipboardList, Layers, ShieldCheck, Car, Package, Globe, ArrowLeft, Home, Phone, Mail, Code2, Navigation, Scissors, Fuel, CheckCircle2, Receipt, Wallet, Map, Leaf, DollarSign, BarChart3, Building2, Route, Download, Smartphone, X, FileBarChart, TrendingUp, Wrench, Droplets, ShoppingCart, TrendingDown, RefreshCw, FileText, Database, Settings, Bell, ChevronRight, Radio
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { NotificationBell } from './NotificationBell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── PWA INSTALL HOOK ──
function useDashboardInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('btree_pwa_dismissed_dash') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('btree_pwa_dismissed_dash', 'true'); } catch {}
  };

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return { canInstall: !!deferredPrompt && !isInstalled && !dismissed, isInstalled, isIOS, install, dismiss };
}

type MenuItem = {
  label: string;
  path: string;
  slug: string | null;
  icon?: React.ElementType;
};

type MenuGroup = {
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  adminOnly?: boolean;
  driverOnly?: boolean;
  isFixed?: boolean;
  path?: string;
  slug?: string | null;
};

const menuGroups: MenuGroup[] = [
  // ── Painel ──
  {
    label: "Painel",
    icon: LayoutDashboard,
    isFixed: true,
    path: "/app",
    slug: null,
    items: [],
  },
  // ── Pessoas ──
  {
    label: "Pessoas",
    icon: Users,
    items: [
      { label: "Colaboradores", path: "/colaboradores", slug: "colaboradores", icon: UserCheck },
      { label: "Presenças", path: "/presencas", slug: "presencas", icon: ClipboardList },
      { label: "Clientes", path: "/clientes", slug: "clientes", icon: Users },
    ],
  },
  // ── Equipamentos ──
  {
    label: "Equipamentos",
    icon: Wrench,
    items: [
      { label: "Setores e Máquinas", path: "/setores", slug: "equipamentos", icon: Layers },
      { label: "Horímetro e Manutenção", path: "/maquinas", slug: "manutencao", icon: ClipboardList },
      { label: "Motosserras", path: "/motosserras", slug: "motosserras", icon: Scissors },
      { label: "Peças e Acessórios", path: "/pecas", slug: "pecas", icon: Package },
      { label: "Abastecimento de Veículos", path: "/veiculos", slug: "abastecimento", icon: Car },
    ],
  },
  // ── Operações ──
  {
    label: "Operações",
    icon: ClipboardList,
    items: [
      { label: "Controle de Cargas", path: "/cargas", slug: "cargas", icon: Truck },
      { label: "Controle de Notas", path: "/controle-notas", slug: "controle-notas", icon: FileText },
      { label: "Relatório de Destinos", path: "/relatorio-destinos", slug: "relatorio-destinos", icon: FileBarChart },
      { label: "Replantios", path: "/replantios", slug: "replantios", icon: Leaf },
    ],
  },
  // ── GPS e Fretes ──
  {
    label: "GPS e Fretes",
    icon: Navigation,
    items: [
      { label: "Rastreamento GPS", path: "/rastreamento-gps", slug: "gps", icon: Navigation },
      { label: "Locais GPS", path: "/locais-gps", slug: "locais-gps", icon: Map },
      { label: "Porteiras Virtuais", path: "/porteiras-virtuais", slug: "porteiras-virtuais", icon: Radio },
      { label: "Cálculo de Fretes", path: "/fretes", slug: "fretes", icon: Route },
      { label: "Ciclos de Frete", path: "/ciclos-frete", slug: "ciclos-frete", icon: RefreshCw },
      { label: "Fretes GPS", path: "/fretes-gps", slug: "fretes-gps", icon: Truck },
    ],
  },
  // ── Terceirizados ──
  {
    label: "Terceirizados",
    icon: UserCheck,
    items: [
      { label: "Contratados", path: "/terceirizados", slug: "terceirizados", icon: UserCheck },
      { label: "Caminhões", path: "/caminhoes-terceirizados", slug: "caminhoes-terceirizados", icon: Truck },
      { label: "Relatório de Corte", path: "/corte-terceirizado", slug: "corte-terceirizado", icon: FileBarChart },
    ],
  },
  // ── Combustível ──
  {
    label: "Combustível",
    icon: Fuel,
    items: [
      { label: "Fornecedores", path: "/fornecedores-combustivel", slug: "fornecedores-combustivel", icon: Fuel },
      { label: "Relatórios", path: "/relatorios-combustivel", slug: "relatorios-combustivel", icon: BarChart3 },
      { label: "Contas a Pagar", path: "/contas-pagar-combustivel", slug: "contas-pagar-combustivel", icon: Receipt },
    ],
  },
  // ── Comercial ──
  {
    label: "Comercial",
    icon: Building2,
    items: [
      { label: "Compradores", path: "/compradores", slug: "compradores", icon: Building2 },
      { label: "Portal do Cliente", path: "/client-portal", slug: "portal-cliente", icon: Globe },
    ],
  },
  // ── Compras ──
  {
    label: "Compras",
    icon: ShoppingCart,
    items: [
      { label: "Solicitações", path: "/compras", slug: "compras", icon: ShoppingCart },
      { label: "Fornecedores", path: "/fornecedores", slug: "fornecedores", icon: Building2 },
      { label: "Orçamentos", path: "/orcamentos", slug: "orcamentos", icon: TrendingDown },
    ],
  },
  // ── Financeiro ──
  {
    label: "Financeiro",
    icon: Wallet,
    items: [
      { label: "Gastos Extras", path: "/gastos-extras", slug: "gastos-extras", icon: Receipt },
      { label: "Pagamentos de Compradores", path: "/pagamentos-clientes", slug: "pagamentos-clientes", icon: DollarSign },
      { label: "Lançamentos Financeiros", path: "/financeiro", slug: "financeiro", icon: Wallet },
      { label: "Dashboard Financeiro", path: "/dashboard-financeiro", slug: "dashboard-financeiro", icon: TrendingUp },
      { label: "Dashboard Executivo", path: "/dashboard-executivo", slug: "dashboard-exec", icon: BarChart3 },
    ],
  },
  // ── Administração (admin only) ──
  {
    label: "Administração",
    icon: Settings,
    adminOnly: true,
    items: [
      { label: "Usuários", path: "/usuarios", slug: null, icon: Users },
      { label: "Controle de Acesso", path: "/controle-acesso", slug: null, icon: ShieldCheck },
      { label: "Config. Notificações", path: "/config-notificacoes", slug: null, icon: Bell },
      { label: "Auditoria de Dados", path: "/auditoria-dados", slug: null, icon: Database },
    ],
  },
  // ── Minha Carga (motorista only) ──
  {
    label: "Minha Carga",
    icon: Truck,
    isFixed: true,
    driverOnly: true,
    path: "/motorista",
    slug: "minha-carga",
    items: [],
  },
];

const SUB_PAGES: Record<string, { label: string; parent: string }> = {
  "/colaboradores/": { label: "Detalhes do Colaborador", parent: "/colaboradores" },
  "/setores/equipamento/": { label: "Detalhes do Equipamento", parent: "/setores" },
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    window.location.href = "/login";
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { hasAccess, isAdmin, profile } = usePermissions();
  const { data: myPhotoUrl } = trpc.collaborators.getMyPhoto.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [showDevContact, setShowDevContact] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [didRedirect, setDidRedirect] = useState(false);
  const { canInstall, isIOS, isInstalled, install, dismiss } = useDashboardInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of menuGroups) {
      if (group.isFixed) continue;
      const hasActive = group.items.some(item => item.path === location);
      if (hasActive) initial[group.label] = true;
    }
    return initial;
  });

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (link) link.href = '/manifest-equipe.json';
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon) appleIcon.href = '/manus-storage/pwa-collaborator-192_835bec4b.png';
    return () => {
      if (link) link.href = '/manifest.json';
      if (appleIcon) appleIcon.href = '/icon-btree-192.png';
    };
  }, []);

  useEffect(() => {
    if (!didRedirect && (profile === 'motorista') && location === '/app' && hasAccess('minha-carga')) {
      setDidRedirect(true);
      setLocation('/motorista');
    }
  }, [profile, location, didRedirect, setLocation]);

  useEffect(() => {
    for (const group of menuGroups) {
      if (group.isFixed) continue;
      const hasActive = group.items.some(item => item.path === location);
      if (hasActive) {
        setOpenGroups(prev => ({ ...prev, [group.label]: true }));
        break;
      }
    }
  }, [location]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const allMenuItems = menuGroups.flatMap(g => g.isFixed ? [{ path: g.path!, label: g.label, slug: g.slug ?? null }] : g.items);
  const activeMenuItem = allMenuItems.find(item => item.path === location);
  const isSubPage = !activeMenuItem && location !== "/app";

  const getParentPath = () => {
    for (const [pattern, info] of Object.entries(SUB_PAGES)) {
      if (location.startsWith(pattern)) return info.parent;
    }
    const parts = location.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return "/" + parts[0];
    }
    return "/app";
  };

  const getPageTitle = () => {
    if (activeMenuItem) return activeMenuItem.label;
    for (const [pattern, info] of Object.entries(SUB_PAGES)) {
      if (location.startsWith(pattern)) return info.label;
    }
    return "BTREE Ambiental";
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const visibleGroups = menuGroups.filter(group => {
    if (group.adminOnly && !isAdmin) return false;
    if (group.driverOnly && profile !== 'motorista') return false;
    if (group.isFixed) {
      if (group.driverOnly) return profile === 'motorista' && hasAccess(group.slug ?? '');
      return true;
    }
    return group.items.some(item => {
      if (item.slug === null) return isAdmin;
      return hasAccess(item.slug);
    });
  });

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 [&>[data-slot=sidebar]]:bg-gradient-to-b [&>[data-slot=sidebar]]:from-[#0d4f2e] [&>[data-slot=sidebar]]:to-[#1a5c3a] [&>[data-slot=sidebar]]:text-white"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png"
                    alt="BTREE Ambiental"
                    className="h-8 object-contain brightness-0 invert"
                  />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <SidebarMenu className="px-2 py-1 gap-0.5">
              {visibleGroups.map(group => {
                // ── Fixed single items (Painel, Minha Carga) ──
                if (group.isFixed) {
                  const isActive = location === group.path;
                  return (
                    <SidebarMenuItem key={group.label}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(group.path!)}
                        tooltip={group.label}
                        className="h-10 transition-all font-semibold text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                      >
                        <group.icon className={`h-4 w-4 ${isActive ? "text-emerald-300" : "text-white/70"}`} />
                        <span>{group.label}</span>
                        {group.driverOnly && !isCollapsed && (
                          <span className="ml-auto text-[10px] text-white/40 font-normal">(motorista)</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // ── Collapsible group ──
                const isGroupOpen = !!openGroups[group.label];
                const hasActiveChild = group.items.some(item => item.path === location);
                const visibleItems = group.items.filter(item => {
                  if (item.slug === null) return isAdmin;
                  return hasAccess(item.slug);
                });
                if (visibleItems.length === 0) return null;

                return (
                  <Collapsible
                    key={group.label}
                    open={isGroupOpen}
                    onOpenChange={() => toggleGroup(group.label)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={group.label}
                          className={`h-10 transition-all font-semibold hover:text-white hover:bg-white/10 ${
                            hasActiveChild
                              ? "text-white bg-white/10"
                              : "text-white/80"
                          }`}
                        >
                          <group.icon className={`h-4 w-4 ${hasActiveChild ? "text-emerald-300" : "text-white/60"}`} />
                          <span>{group.label}</span>
                          <ChevronRight
                            className={`ml-auto h-3.5 w-3.5 text-white/40 transition-transform duration-200 ${
                              isGroupOpen ? "rotate-90" : ""
                            }`}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-3 border-l border-white/10 pl-2">
                          {visibleItems.map(item => {
                            const isActive = location === item.path;
                            return (
                              <SidebarMenuSubItem key={item.path}>
                                <SidebarMenuSubButton
                                  isActive={isActive}
                                  onClick={() => setLocation(item.path)}
                                  className={`h-9 text-sm transition-all cursor-pointer ${
                                    isActive
                                      ? "text-white bg-white/15 font-medium"
                                      : "text-white/70 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  {item.icon && (
                                    <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-300" : "text-white/50"}`} />
                                  )}
                                  <span>{item.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-3">
            {!isCollapsed && canInstall && !isInstalled && (
              <button
                onClick={install}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors border border-white/20"
              >
                <Download className="h-4 w-4 flex-shrink-0" />
                <span>Instalar App</span>
              </button>
            )}
            {!isCollapsed && isIOS && !isInstalled && !canInstall && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors border border-white/20"
              >
                <Smartphone className="h-4 w-4 flex-shrink-0" />
                <span>Salvar na Tela</span>
              </button>
            )}
            {!isCollapsed && (
              <div className="flex items-center justify-center pb-2 border-t border-white/20 pt-3">
                <button
                  onClick={() => setShowDevContact(true)}
                  className="flex flex-col items-center gap-1 hover:opacity-100 transition-opacity opacity-80 group"
                  title="Desenvolvido por Kobayashi Dev"
                >
                  <img
                    src="https://res.cloudinary.com/djob7pxme/image/upload/v1773053506/btree-static/bubi6hkzpedz2tj7ti8v.png"
                    alt="Desenvolvido por Kobayashi"
                    className="h-10 object-contain group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[10px] text-white/50 group-hover:text-white/80">Desenvolvedor</span>
                </button>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    {myPhotoUrl && <AvatarImage src={myPhotoUrl} alt={user?.name || ""} className="object-cover" />}
                    <AvatarFallback className="text-xs font-medium bg-emerald-700 text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/60 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* Dialog: Contato do Desenvolvedor */}
      <Dialog open={showDevContact} onOpenChange={setShowDevContact}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-emerald-600" />
              Kobayashi Desenvolvimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <img
                src="https://res.cloudinary.com/djob7pxme/image/upload/v1773053506/btree-static/bubi6hkzpedz2tj7ti8v.png"
                alt="Kobayashi Dev"
                className="h-16 object-contain"
              />
            </div>
            <div className="space-y-3 text-sm">
              <a href="tel:+5515997056890" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-emerald-50 transition-colors">
                <Phone className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">(15) 99705-6890</p>
                  <p className="text-xs text-gray-500">Ligar ou WhatsApp</p>
                </div>
              </a>
              <a href="mailto:fkobayashijunior@gmail.com" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-emerald-50 transition-colors">
                <Mail className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">fkobayashijunior@gmail.com</p>
                  <p className="text-xs text-gray-500">E-mail</p>
                </div>
              </a>
            </div>
            <p className="text-xs text-center text-gray-500 font-medium">Sistemas para seu negócio</p>
            <p className="text-xs text-center text-gray-400">Sistema BTREE Ambiental &copy; {new Date().getFullYear()}</p>
          </div>
        </DialogContent>
      </Dialog>

      <SidebarInset>
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-9 w-9 rounded-lg bg-background flex-shrink-0" />

            {isSubPage && (
              <button
                onClick={() => setLocation(getParentPath())}
                className="h-9 w-9 flex items-center justify-center rounded-lg border bg-background hover:bg-accent transition-colors flex-shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <span className="tracking-tight text-foreground font-medium text-sm truncate">
              {getPageTitle()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocation("/cargas")}
              className="h-9 px-2 flex items-center gap-1.5 rounded-lg hover:bg-accent transition-colors flex-shrink-0 text-muted-foreground hover:text-foreground"
              title="Nova Carga"
            >
              <Truck className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-medium hidden sm:inline">Cargas</span>
            </button>
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
