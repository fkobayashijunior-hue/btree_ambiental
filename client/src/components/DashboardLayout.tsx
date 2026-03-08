import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, UserCheck, Camera, Truck, ClipboardList, Layers, ShieldCheck, Car, Package, Globe, ArrowLeft, Home } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: UserCheck, label: "Colaboradores", path: "/colaboradores" },
  { icon: Camera, label: "Presença Facial", path: "/presenca" },
  { icon: ClipboardList, label: "Presenças", path: "/presencas" },
  { icon: Layers, label: "Setores & Equipamentos", path: "/setores" },
  { icon: ShieldCheck, label: "Controle de Acesso", path: "/controle-acesso" },
  { icon: Truck, label: "Controle de Cargas", path: "/cargas" },
  { icon: ClipboardList, label: "Horas Máquinas", path: "/maquinas" },
  { icon: Car, label: "Veículos", path: "/veiculos" },
  { icon: Package, label: "Peças & Acessórios", path: "/pecas" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Globe, label: "Portal do Cliente", path: "/client-portal" },
  { icon: Users, label: "Usuários", path: "/usuarios" },
];

// Rotas que são subpáginas (não estão no menu principal)
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
    // Redirecionar para /login
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
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Determinar se é subpágina e qual o parent
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isSubPage = !activeMenuItem && location !== "/app";
  
  // Encontrar parent para subpáginas (ex: /colaboradores/5 → /colaboradores)
  const getParentPath = () => {
    // Verificar padrões de subpáginas
    for (const [pattern, info] of Object.entries(SUB_PAGES)) {
      if (location.startsWith(pattern)) return info.parent;
    }
    // Padrão genérico: /colaboradores/5 → /colaboradores
    const parts = location.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return "/" + parts[0];
    }
    return "/app";
  };

  const getPageTitle = () => {
    if (activeMenuItem) return activeMenuItem.label;
    // Tentar encontrar no mapa de subpáginas
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

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-medium text-white/80 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-emerald-300" : "text-white/70"}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-3">
            {!isCollapsed && (
              <div className="flex items-center justify-center pb-2 border-t border-white/20 pt-3">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png"
                  alt="Desenvolvido por Kobayashi"
                  className="h-6 object-contain opacity-40 hover:opacity-80 transition-opacity brightness-0 invert"
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
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

      <SidebarInset>
        {/* Header fixo — sempre visível com botão menu e botão voltar */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            {/* Botão menu — SEMPRE visível no mobile */}
            <SidebarTrigger className="h-9 w-9 rounded-lg bg-background flex-shrink-0" />

            {/* Botão voltar — aparece em subpáginas */}
            {isSubPage && (
              <button
                onClick={() => setLocation(getParentPath())}
                className="h-9 w-9 flex items-center justify-center rounded-lg border bg-background hover:bg-accent transition-colors flex-shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            {/* Título da página */}
            <span className="tracking-tight text-foreground font-medium text-sm truncate">
              {getPageTitle()}
            </span>
          </div>

          {/* Botão Home — atalho para dashboard */}
          <button
            onClick={() => setLocation("/app")}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
            aria-label="Dashboard"
            title="Ir para o Dashboard"
          >
            <Home className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
