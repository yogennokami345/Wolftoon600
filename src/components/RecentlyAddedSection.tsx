import { memo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BookOpen, Star, Flame, Clock, TrendingUp, Eye } from 'lucide-react';

interface Title {
  id: string;
  slug?: string | null;
  title: string;
  cover: string;
  type: string;
  status: string;
  rating: number;
  chapters?: number;
  views?: number;
  created_at?: string;
  genres?: string[];
}

interface Props {
  titles: Title[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRelative = (dateStr?: string) => {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}mês`;
};

const formatViews = (v?: number) => {
  if (!v) return null;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Em andamento': { color: 'bg-emerald-400', label: 'Em andamento' },
  ongoing:        { color: 'bg-emerald-400', label: 'Em andamento' },
  completed:      { color: 'bg-blue-400',    label: 'Completo' },
  'Completo':     { color: 'bg-blue-400',    label: 'Completo' },
  hiatus:         { color: 'bg-amber-400',   label: 'Hiato' },
  cancelled:      { color: 'bg-red-400',     label: 'Cancelado' },
};

const getStatus = (s: string) => STATUS_CONFIG[s] ?? { color: 'bg-emerald-400', label: s };

// ─── Spotlight Card ───────────────────────────────────────────────────────────

interface SpotlightProps {
  title: Title;
  activeIdx: number;
  total: number;
  onDot: (i: number) => void;
}

const SpotlightCard = ({ title: m, activeIdx, total, onDot }: SpotlightProps) => {
  const status = getStatus(m.status);
  const views = formatViews(m.views);

  return (
    <Link
      to={`/manga/${m.slug || m.id}`}
      className="group relative block w-full overflow-hidden rounded-2xl bg-muted"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Cover */}
      <img
        src={m.cover}
        alt={m.title}
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
      />

      {/* Gradient layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {/* Top badges */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <span className="rounded-lg bg-blue-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/40">
          Destaque
        </span>
        <span className="rounded-lg border border-white/15 bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
          {m.type}
        </span>
      </div>

      {/* Dot navigation */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.preventDefault(); onDot(i); }}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIdx ? 'w-5 bg-blue-400' : 'w-1.5 bg-white/35 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex gap-3 p-4 sm:p-5">
        {/* Accent bar */}
        <div className="mt-1 hidden h-auto w-[3px] shrink-0 self-stretch rounded-full bg-gradient-to-b from-blue-400 to-violet-500 sm:block" />

        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-1.5 flex items-center gap-2.5 text-[11px] font-semibold text-white/70">
            <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
            <span>{status.label}</span>
            {m.created_at && (
              <>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelative(m.created_at)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2.5 line-clamp-2 text-xl font-black leading-tight text-white drop-shadow-md sm:text-2xl md:text-3xl">
            {m.title}
          </h3>

          {/* Stats + CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-[12px] text-white/75">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <strong className="tabular-nums text-white">{m.rating?.toFixed(1) || '0.0'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="tabular-nums">{m.chapters ?? 0} caps</span>
              </span>
              {views && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{views}</span>
                </span>
              )}
            </div>
            <span className="ml-auto flex items-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-1.5 text-xs font-black text-white shadow-lg shadow-blue-500/40 transition-colors group-hover:bg-blue-400 sm:ml-0">
              Ler agora
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// ─── Side Stack Item ──────────────────────────────────────────────────────────

const SideItem = ({ m, rank }: { m: Title; rank: number }) => {
  const status = getStatus(m.status);
  return (
    <Link
      to={`/manga/${m.slug || m.id}`}
      className="group flex items-stretch gap-3 rounded-xl border border-border/30 bg-card/50 p-2.5 transition-all hover:border-blue-400/40 hover:bg-card/80"
    >
      {/* Rank */}
      <span className="hidden w-5 shrink-0 items-start pt-1 text-right text-[11px] font-black tabular-nums text-muted-foreground/40 lg:flex">
        {rank}
      </span>

      {/* Thumbnail */}
      <div className="relative h-[72px] w-[50px] shrink-0 overflow-hidden rounded-lg">
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">{m.type}</span>
            {m.genres?.[0] && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[9px] text-muted-foreground/60 truncate">{m.genres[0]}</span>
              </>
            )}
          </div>
          <h4 className="line-clamp-2 text-xs font-bold leading-tight text-foreground transition-colors group-hover:text-blue-300">
            {m.title}
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className={`h-1 w-1 rounded-full ${status.color}`} />
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <strong className="tabular-nums text-foreground/70">{m.rating?.toFixed(1) || '0.0'}</strong>
          </span>
          <span className="tabular-nums">{m.chapters ?? 0} caps</span>
          {m.created_at && <span className="ml-auto">{formatRelative(m.created_at)}</span>}
        </div>
      </div>
    </Link>
  );
};

// ─── Grid Card ────────────────────────────────────────────────────────────────

const GridCard = ({ m }: { m: Title }) => {
  const views = formatViews(m.views);
  return (
    <Link
      to={`/manga/${m.slug || m.id}`}
      className="group snap-start shrink-0 w-[148px] sm:w-[172px]"
    >
      {/* Thumbnail */}
      <div className="relative mb-2 overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: '2/3' }}>
        <img
          src={m.cover}
          alt={m.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Subtle hover overlay */}
        <div className="pointer-events-none absolute inset-0 bg-blue-500/0 transition-colors duration-300 group-hover:bg-blue-500/10" />

        {/* Type pill */}
        <span className="absolute left-2 top-2 rounded-md bg-blue-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
          {m.type}
        </span>

        {/* Rating pill */}
        <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          {m.rating?.toFixed(1) || '0.0'}
        </span>

        {/* Date — appears on hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="text-[9px] font-semibold text-white/70">
            {formatRelative(m.created_at)}
          </span>
        </div>
      </div>

      {/* Title & meta — outside image for legibility */}
      <div className="px-0.5">
        <h3 className="mb-1 line-clamp-2 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-blue-300">
          {m.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <BookOpen className="h-2.5 w-2.5" />
            <span className="tabular-nums">{m.chapters ?? 0}</span>
          </span>
          {views && (
            <span className="flex items-center gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              <span className="tabular-nums">{views}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RecentlyAddedSection = memo(({ titles }: Props) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % Math.min(5, titles.length));
    }, 6000);
  };

  useEffect(() => {
    if (!titles?.length) return;
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [titles?.length]);

  if (!titles?.length) return null;

  const spotlightPool = titles.slice(0, 5);
  const spotlight = spotlightPool[activeIdx] ?? spotlightPool[0];
  // side: pick 4 titles from pool excluding current spotlight
  const sideItems = spotlightPool.filter((_, i) => i !== activeIdx).slice(0, 4);
  const gridItems = titles.slice(5, 14);

  // How many added this week
  const weeklyCount = titles.filter((t) => {
    if (!t.created_at) return false;
    return Date.now() - new Date(t.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const handleDot = (i: number) => {
    setActiveIdx(i);
    resetInterval();
  };

  return (
    <section className="container mx-auto px-3 py-6 md:px-4 md:py-8">

      {/* ── Section Header ── */}
      <div className="mb-5 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">
                Novidades
              </span>
              {weeklyCount > 0 && (
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black text-blue-400 border border-blue-500/25">
                  +{weeklyCount} esta semana
                </span>
              )}
            </div>
            <h2 className="font-black text-2xl leading-none tracking-tight text-foreground md:text-3xl">
              Lançamentos
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="group gap-1 text-blue-400 hover:bg-blue-500/10 font-semibold"
          asChild
        >
          <Link to="/catalog?sort=newest">
            Ver tudo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>

      {/* ── Main Editorial Layout ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12">

        {/* Spotlight */}
        <div className="lg:col-span-7 xl:col-span-8">
          <SpotlightCard
            title={spotlight}
            activeIdx={activeIdx}
            total={spotlightPool.length}
            onDot={handleDot}
          />
        </div>

        {/* Side stack */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-2">
          {/* Stack label */}
          <div className="flex items-center gap-2 px-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Também adicionados
            </span>
          </div>
          {sideItems.map((m, i) => (
            <SideItem key={m.id} m={m} rank={i + 1 <= activeIdx ? i + 1 : i + 2} />
          ))}
        </div>
      </div>

      {/* ── More Releases ── */}
      {gridItems.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400/70">
              Mais lançamentos
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/30 to-transparent" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 md:-mx-4 md:px-4 snap-x scrollbar-hide">
            {gridItems.map((m) => (
              <GridCard key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
});

RecentlyAddedSection.displayName = 'RecentlyAddedSection';
export default RecentlyAddedSection;
