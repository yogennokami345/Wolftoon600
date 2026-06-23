import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, User, Shield, Plus, BookMarked, Trophy, Crown, X, Home, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import BrandLogo from "@/components/BrandLogo";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut, isAdmin, isVip } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSidebarOpen(false);
      await signOut();
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';

  const navLinks = [
    { to: "/", label: "Início", icon: Home },
    { to: "/catalog", label: "Catálogo", icon: BookOpen },
    { to: "/ranking", label: "Rankings", icon: Trophy },
    { to: "/vip", label: "VIP", icon: Crown, highlight: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="container flex h-14 items-center justify-between px-4">
          
          {/* Logo */}
          <BrandLogo />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  link.highlight
                    ? isActive(link.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-primary hover:bg-primary/10"
                    : isActive(link.to)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            
            {user && (
              <Link
                to="/my-list"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive("/my-list") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <BookMarked className="h-4 w-4" />
                Minha Lista
              </Link>
            )}

            {isAdmin && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                <Link
                  to="/admin"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive("/admin") ? "text-accent-purple bg-accent-purple/10" : "text-muted-foreground hover:text-accent-purple hover:bg-accent-purple/5"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
                <Link
                  to="/admin/create"
                  className="px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-accent-green hover:bg-accent-green/5"
                >
                  <Plus className="h-4 w-4" />
                  Criar
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Search + Actions */}
          <div className="flex items-center gap-1">
            {/* Desktop inline search */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center relative">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 h-9 pl-9 pr-3 bg-muted/50 border-border/40 text-sm focus:w-64 transition-all duration-300"
              />
            </form>

            {/* Mobile search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 lg:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>

            {user ? (
              <>
                <NotificationDropdown />
                {/* Desktop user dropdown */}
                <div className="hidden lg:block">
                  <Link to="/profile">
                    <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <Button variant="default" size="sm" asChild className="hidden lg:flex h-9">
                <Link to="/auth">Entrar</Link>
              </Button>
            )}

            {!user && (
              <Button variant="ghost" size="icon" asChild className="h-9 w-9 lg:hidden">
                <Link to="/auth">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile inline search bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-border/40"
            >
              <form onSubmit={handleSearch} className="container mx-auto px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar manhwas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-muted/50 border-border/40"
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-background border-l border-border/50 flex flex-col lg:hidden"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <BrandLogo compact showText={false} className="gap-0" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      link.highlight
                        ? isActive(link.to)
                          ? "bg-primary text-primary-foreground"
                          : "text-primary hover:bg-primary/10"
                        : isActive(link.to)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}

                {user && (
                  <Link
                    to="/my-list"
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive("/my-list") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <BookMarked className="h-5 w-5" />
                    Minha Lista
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin/create"
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive("/admin/create") ? "bg-accent-green/15 text-accent-green" : "text-accent-green hover:bg-accent-green/10"
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    Criar Obra
                  </Link>
                )}
              </nav>

              {/* User Section at Bottom */}
              <div className="border-t border-border/50 p-3 space-y-1">
                {user ? (
                  <>
                    {/* User Info */}
                    <Link
                      to="/profile"
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-all"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {username} {isVip && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                        </p>
                      </div>
                    </Link>

                    {/* Admin Link */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                      >
                        <Shield className="h-5 w-5" />
                        Painel Admin
                      </Link>
                    )}

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      Sair
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                  >
                    <User className="h-5 w-5" />
                    Entrar / Cadastrar
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
