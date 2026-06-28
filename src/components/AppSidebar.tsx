import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Library, Flame, Heart, History, Trophy, BookOpen, BookText,
  Users2, Gift, Crown, MessageCircle, Megaphone, Award, User as UserIcon,
  Settings, Bell, MessageSquare, LayoutDashboard, FolderKanban, FileText,
  Upload, UploadCloud, ImageIcon, Shield, Flag, BarChart3, Wrench,
  LogOut, ChevronRight, Sparkles,
} from "lucide-react";
import wolfLogo from "@/assets/wolftoon-wolf-logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Item = {
  title: string;
  url: string;
  icon: any;
  external?: boolean;
  highlight?: boolean;
};

const mainMenu: Item[] = [
  { title: "Início", url: "/", icon: Home },
  { title: "Biblioteca", url: "/my-list", icon: Library },
  { title: "Tendências", url: "/catalog?sort=trending", icon: Flame },
  { title: "Favoritos", url: "/my-list?tab=favorites", icon: Heart },
  { title: "Histórico", url: "/profile?tab=history", icon: History },
  { title: "Rankings", url: "/ranking", icon: Trophy },
  { title: "Novels", url: "/catalog?type=novel", icon: BookText },
  { title: "Mangás", url: "/catalog?type=manga", icon: BookOpen },
  { title: "Comunidade", url: "/contact", icon: Users2 },
  { title: "Eventos", url: "/notifications", icon: Gift },
  { title: "VIP", url: "/vip", icon: Crown, highlight: true },
];

const socialMenu: Item[] = [
  { title: "Discord", url: "https://discord.gg/6wUg8wssQv", icon: MessageCircle, external: true },
  { title: "Anúncios", url: "/notifications", icon: Megaphone },
  { title: "Conquistas", url: "/profile?tab=achievements", icon: Award },
];

const userMenu: Item[] = [
  { title: "Meu Perfil", url: "/profile", icon: UserIcon },
  { title: "Configurações", url: "/profile?tab=settings", icon: Settings },
  { title: "Notificações", url: "/notifications", icon: Bell },
  { title: "Comentários", url: "/profile?tab=comments", icon: MessageSquare },
];

const adminMenu: Item[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Gerenciar Obras", url: "/admin?tab=manage", icon: FolderKanban },
  { title: "Gerenciar Capítulos", url: "/admin?tab=chapters", icon: FileText },
  { title: "Upload Individual", url: "/admin/upload-chapter", icon: Upload },
  { title: "Upload em Massa", url: "/admin/batch-upload", icon: UploadCloud },
  { title: "Gerenciar Capas", url: "/admin?tab=covers", icon: ImageIcon },
  { title: "Usuários", url: "/admin?tab=users", icon: Users2 },
  { title: "Moderação", url: "/admin?tab=moderation", icon: Shield },
  { title: "Denúncias", url: "/admin?tab=reports", icon: Flag },
  { title: "Estatísticas", url: "/admin?tab=analytics", icon: BarChart3 },
  { title: "Modo Manutenção", url: "/admin?tab=maintenance", icon: Wrench },
  { title: "Configurações do Site", url: "/admin?tab=settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname, search } = useLocation();
  const { user, isAdmin, isVip, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "Usuário";
  const avatarUrl = user?.user_metadata?.avatar_url || "";

  const closeMobile = () => setOpenMobile(false);

  const isActive = (url: string) => {
    const [path, query] = url.split("?");
    if (path !== pathname) return false;
    if (!query) return !search || search === "";
    const [key, val] = query.split("=");
    return search.includes(`${key}=${val || ""}`);
  };

  const renderItem = (item: Item) => {
    const external = item.external || item.url.startsWith("http");
    const active = !external && isActive(item.url);
    const showBadge = item.title === "Notificações" && unreadCount > 0;

    const content = (
      <>
        <item.icon className={`h-[18px] w-[18px] shrink-0 ${
          item.highlight && !active ? "text-yellow-400" : ""
        }`} />
        {!collapsed && (
          <span className={`truncate ${item.highlight && !active ? "text-yellow-400 font-semibold" : ""}`}>
            {item.title}
          </span>
        )}
        {!collapsed && showBadge && (
          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </>
    );

    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={item.highlight && !active ? "hover:bg-yellow-500/10" : ""}
        >
          {external ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
              {content}
            </a>
          ) : (
            <NavLink to={item.url} onClick={closeMobile}>
              {content}
            </NavLink>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-sidebar-border">
        <NavLink to="/" onClick={closeMobile} className="flex items-center gap-3 px-2 py-2 group">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/50 blur-md rounded-xl opacity-70" />
            <img
              src={wolfLogo}
              alt="Wolftoon"
              className="relative h-9 w-9 rounded-xl object-cover ring-2 ring-primary/40"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-black text-base bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent leading-none">
                Wolftoon
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-primary/70 font-bold mt-0.5">
                Reino dos Lobos
              </div>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent className="px-1">
        {/* Menu Principal */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Social */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Social</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{socialMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conta (só logado) */}
        {user && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Conta</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{userMenu.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-primary/80 font-bold tracking-wide">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{adminMenu.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer: user info ── */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user ? (
          collapsed ? (
            /* Collapsed: só avatar */
            <button
              onClick={() => { navigate("/profile"); closeMobile(); }}
              className="flex items-center justify-center w-full py-1"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            /* Expanded: avatar + nome + ações */
            <div className="space-y-1">
              <button
                onClick={() => { navigate("/profile"); closeMobile(); }}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold truncate">{username}</p>
                    {isVip && <Crown className="h-3 w-3 text-yellow-400 shrink-0" />}
                    {isAdmin && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => { signOut(); closeMobile(); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          )
        ) : (
          !collapsed && (
            <NavLink
              to="/auth"
              onClick={closeMobile}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              Entrar / Cadastrar
            </NavLink>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
