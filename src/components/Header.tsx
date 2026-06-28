import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, User, Shield, Plus, BookMarked, Trophy, Crown, X, Home, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import BrandLogo from "@/components/BrandLogo";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut, isAdmin, isVip } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toggleSidebar } = useSidebar();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setIsSearchOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const navLinks = [
    { to: "/", label: "Início", icon: Home },
    { to: "/catalog", label: "Catálogo", icon: BookOpen },
    { to: "/ranking", label: "Rankings", icon: Trophy },
    { to: "/vip", label: "VIP", icon: Crown, highlight: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <BrandLogo compact />

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
                  to="/create"
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

            {/* Mobile Menu Button — opens AppSidebar via shadcn toggleSidebar */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={toggleSidebar}
              aria-label="Abrir menu"
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
    </>
  );
};

export default Header;
