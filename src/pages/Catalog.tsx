import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import MangaCard from "@/components/MangaCard";
import MangaCardSkeleton from "@/components/MangaCardSkeleton";
import { useTitles } from "@/hooks/useTitles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Filter, X, Search, BookOpen, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  LayoutGrid, List, TrendingUp, Star, Clock, ArrowDownAZ,
  Sparkles, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const genres = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance",
  "Terror", "Mistério", "Sci-Fi", "Slice of Life", "Sobrenatural",
  "Esportes", "Escolar", "Artes Marciais", "Isekai", "Psicológico",
  "Reencarnação", "Vingança", "Shounen", "Seinen",
  "Xianxia", "Wuxia", "Xuanhuan", "Cultivo", "Sistema", "LitRPG",
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Mais Popular", icon: TrendingUp },
  { value: "rating", label: "Melhor Avaliado", icon: Star },
  { value: "recent", label: "Mais Recente", icon: Clock },
  { value: "alphabetical", label: "A–Z", icon: ArrowDownAZ },
];

const ITEMS_PER_PAGE = 24;

// Debounce hook
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const Catalog = () => {
  const { data: titles, isLoading } = useTitles();
  const [searchParams, setSearchParams] = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);

  // -- State (URL-synced) --
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState(() => searchParams.get("type") || "all");
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get("status") || "all");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    const g = searchParams.get("genre");
    return g ? g.split(",").filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "popularity");
  const [genreMode, setGenreMode] = useState<"any" | "all">(() =>
    (searchParams.get("gmode") as "any" | "all") || "any"
  );
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get("page")) || 1);

  // -- UI state --
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    (localStorage.getItem("catalog.view") as "grid" | "list") || "grid"
  );
  const [showAllGenres, setShowAllGenres] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 220);

  // Sync URL when filters change
  useEffect(() => {
    const p: Record<string, string> = {};
    if (debouncedQuery) p.q = debouncedQuery;
    if (selectedType !== "all") p.type = selectedType;
    if (selectedStatus !== "all") p.status = selectedStatus;
    if (selectedGenres.length) p.genre = selectedGenres.join(",");
    if (sortBy !== "popularity") p.sort = sortBy;
    if (genreMode !== "any") p.gmode = genreMode;
    if (currentPage > 1) p.page = String(currentPage);
    setSearchParams(p, { replace: true });
  }, [debouncedQuery, selectedType, selectedStatus, selectedGenres, sortBy, genreMode, currentPage]);

  useEffect(() => {
    localStorage.setItem("catalog.view", viewMode);
  }, [viewMode]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const filteredMangas = useMemo(() => {
    return (titles || [])
      .filter((manga) => {
        // Search
        if (debouncedQuery.trim()) {
          const q = debouncedQuery.toLowerCase();
          const match =
            manga.title.toLowerCase().includes(q) ||
            manga.author.toLowerCase().includes(q) ||
            manga.genres.some((g) => g.toLowerCase().includes(q)) ||
            (manga.alternative_titles || []).some((a) => a.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (selectedType !== "all" && manga.type !== selectedType) return false;
        if (selectedStatus !== "all" && manga.status !== selectedStatus) return false;
        if (selectedGenres.length > 0) {
          const match =
            genreMode === "all"
              ? selectedGenres.every((g) => manga.genres.includes(g))
              : selectedGenres.some((g) => manga.genres.includes(g));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "popularity") return b.views - a.views;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "alphabetical") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [titles, debouncedQuery, selectedType, selectedStatus, selectedGenres, sortBy, genreMode]);

  // Genre counts from full list (not filtered)
  const genreCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (titles || []).forEach((m) => m.genres.forEach((g) => { map[g] = (map[g] || 0) + 1; }));
    return map;
  }, [titles]);

  const totalPages = Math.max(1, Math.ceil(filteredMangas.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMangas = filteredMangas.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPageNumbers = (): (number | "e1" | "e2")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "e1" | "e2")[] = [1];
    if (safePage > 4) pages.push("e1");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 3) pages.push("e2");
    pages.push(totalPages);
    return pages;
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
    resetPage();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedGenres([]);
    setSortBy("popularity");
    setGenreMode("any");
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeFiltersCount =
    (selectedType !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    selectedGenres.length +
    (debouncedQuery ? 1 : 0);

  const visibleGenres = showAllGenres ? genres : genres.slice(0, 16);

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      <Header />

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border/20">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 50% -20%, hsl(var(--primary) / 0.12), transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4 max-w-7xl py-8 md:py-10 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Wolftoon</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Catálogo</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isLoading ? (
                  <span className="inline-block w-28 h-4 rounded bg-white/10 animate-pulse" />
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{filteredMangas.length.toLocaleString()}</span>
                    {" "}
                    {filteredMangas.length === 1 ? "título" : "títulos"}
                    {activeFiltersCount > 0 && " com filtros ativos"}
                  </>
                )}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Título, autor, gênero..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
                className="pl-10 pr-9 h-10 bg-card/50 border-border/30 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); resetPage(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active genre chips */}
          <AnimatePresence>
            {selectedGenres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-wrap items-center gap-2 mt-4"
              >
                {/* AND/OR toggle */}
                {selectedGenres.length > 1 && (
                  <button
                    onClick={() => setGenreMode((m) => (m === "any" ? "all" : "any"))}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {genreMode === "any" ? "OU" : "E"}
                  </button>
                )}
                {selectedGenres.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className="text-xs px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center gap-1.5 font-medium hover:bg-primary/25 transition-colors"
                  >
                    {g}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpar tudo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar ── */}
          <aside className="lg:w-56 shrink-0">
            <div className="sticky top-20 space-y-3">

              {/* Mobile toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full rounded-xl border-border/30 justify-between h-10"
              >
                <span className="flex items-center gap-2 text-sm">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              <div className={cn(showFilters ? "block" : "hidden lg:block")}>
                <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">

                  {/* Filter header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      Filtros
                    </h2>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Limpar ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-5">
                    {/* Tipo */}
                    <FilterBlock label="Tipo">
                      <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); resetPage(); }}>
                        <SelectTrigger className="bg-background/50 border-border/30 rounded-lg h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            ["all", "Todos"],
                            ["Manhwa", "Manhwa"],
                            ["Manhua", "Manhua"],
                            ["Mangá", "Mangá"],
                            ["Novel", "Novel"],
                            ["Webtoon", "Webtoon"],
                            ["HQ", "HQ"],
                            ["Light Novel", "Light Novel"],
                            ["Web Novel", "Web Novel"],
                            ["One-shot", "One-shot"],
                          ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterBlock>

                    {/* Status */}
                    <FilterBlock label="Status">
                      <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); resetPage(); }}>
                        <SelectTrigger className="bg-background/50 border-border/30 rounded-lg h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Em andamento">Em andamento</SelectItem>
                          <SelectItem value="Completo">Completo</SelectItem>
                          <SelectItem value="Hiato">Hiato</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </FilterBlock>

                    {/* Ordenação */}
                    <FilterBlock label="Ordenar por">
                      <div className="space-y-1">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { setSortBy(opt.value); resetPage(); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                              sortBy === opt.value
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                          >
                            <opt.icon className="h-3.5 w-3.5 shrink-0" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FilterBlock>

                    {/* Gêneros */}
                    <FilterBlock label="Gêneros">
                      {selectedGenres.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-2 p-2 bg-primary/8 border border-primary/20 rounded-lg">
                          <span className="text-[11px] text-muted-foreground">Modo:</span>
                          <button
                            onClick={() => setGenreMode((m) => (m === "any" ? "all" : "any"))}
                            className="text-[11px] font-bold text-primary hover:underline"
                          >
                            {genreMode === "any" ? "Qualquer (OU)" : "Todos (E)"}
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {visibleGenres.map((genre) => {
                          const count = genreCounts[genre] || 0;
                          const active = selectedGenres.includes(genre);
                          return (
                            <button
                              key={genre}
                              onClick={() => toggleGenre(genre)}
                              title={`${count} títulos`}
                              className={cn(
                                "text-[11px] px-2 py-0.5 rounded-full border transition-all font-medium",
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                                  : "bg-background/50 text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground"
                              )}
                            >
                              {genre}
                              {count > 0 && (
                                <span className={cn("ml-1 opacity-50 font-mono text-[9px]", active && "opacity-70")}>
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {genres.length > 16 && (
                        <button
                          onClick={() => setShowAllGenres((p) => !p)}
                          className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <ChevronDown className={cn("h-3 w-3 transition-transform", showAllGenres && "rotate-180")} />
                          {showAllGenres ? "Ver menos" : `+${genres.length - 16} gêneros`}
                        </button>
                      )}
                    </FilterBlock>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">

            {/* Toolbar: sort pills + view toggle */}
            <div className="flex items-center justify-between gap-3 mb-5">
              {/* Quick sort pills (desktop) */}
              <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); resetPage(); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      sortBy === opt.value
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                    )}
                  >
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Right: result count + view toggle */}
              <div className="flex items-center gap-2 ml-auto">
                {!isLoading && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {paginatedMangas.length} de {filteredMangas.length}
                  </span>
                )}
                <div className="flex rounded-lg border border-border/30 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50"
                    )}
                    title="Grade"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2 transition-colors border-l border-border/30",
                      viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50"
                    )}
                    title="Lista"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-3"
              )}>
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <MangaCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredMangas.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card/60 border border-border/30 mb-4">
                  <BookOpen className="h-9 w-9 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Nenhum título encontrado</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  Tente ajustar os filtros ou use termos de busca diferentes.
                </p>
                <Button variant="outline" onClick={clearFilters} className="rounded-xl gap-2">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${safePage}-${sortBy}-${viewMode}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      viewMode === "grid"
                        ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                        : "flex flex-col gap-3"
                    )}
                  >
                    {paginatedMangas.map((manga, index) => (
                      <motion.div
                        key={manga.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                      >
                        <MangaCard
                          {...manga}
                          isHot={safePage === 1 && index === 0}
                          isNew={safePage === 1 && (index === 1 || index === 2)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      <PaginationBtn
                        onClick={() => goToPage(1)}
                        disabled={safePage === 1}
                        title="Primeira"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </PaginationBtn>
                      <PaginationBtn
                        onClick={() => goToPage(Math.max(1, safePage - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </PaginationBtn>

                      {getPageNumbers().map((page, i) =>
                        typeof page === "string" ? (
                          <span key={page} className="px-1 text-muted-foreground select-none text-sm">
                            …
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={cn(
                              "h-9 min-w-[2.25rem] px-2.5 rounded-lg text-sm font-medium transition-all",
                              page === safePage
                                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)] pointer-events-none"
                                : "border border-border/30 text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:border-border/60"
                            )}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <PaginationBtn
                        onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </PaginationBtn>
                      <PaginationBtn
                        onClick={() => goToPage(totalPages)}
                        disabled={safePage === totalPages}
                        title="Última"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </PaginationBtn>
                    </div>

                    {/* Page info + jump */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Página{" "}
                        <span className="font-semibold text-foreground">{safePage}</span>
                        {" de "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                      </span>
                      <span className="text-border">·</span>
                      <span>{filteredMangas.length.toLocaleString()} títulos</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// -- Helpers --

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      {children}
    </div>
  );
}

function PaginationBtn({
  children, onClick, disabled, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-9 w-9 flex items-center justify-center rounded-lg border border-border/30 transition-all text-muted-foreground",
        disabled
          ? "opacity-30 pointer-events-none"
          : "hover:bg-accent/60 hover:text-foreground hover:border-border/60"
      )}
    >
      {children}
    </button>
  );
}

export default Catalog;
