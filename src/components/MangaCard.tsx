import { Link } from "react-router-dom";
import { Star, Eye, Flame, Sparkles, BookOpen } from "lucide-react";
import { memo, useState, useCallback } from "react";

import type { TitleStatus } from "@/lib/titleFormOptions";

export interface MangaCardProps {
  id: string;
  title: string;
  cover: string;
  type: string;
  rating: number;
  chapters?: number;
  status: TitleStatus;
  genres: string[];
  views: number;
  slug?: string | null;
  isHot?: boolean;
  isNew?: boolean;
  rank?: number;
  author?: string;
  artist?: string;
}

// ─── Rank medal colors ──────────────────────────────────────────────────────

const RANK_STYLE: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-orange-400 text-orange-950',
};

// ─── Status dot ─────────────────────────────────────────────────────────────

const STATUS_DOT: Partial<Record<TitleStatus, string>> = {
  ongoing:      'bg-emerald-400',
  Em_andamento: 'bg-emerald-400',
  completed:    'bg-sky-400',
  hiatus:       'bg-amber-400',
  cancelled:    'bg-red-400',
};

const formatViews = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
};

// ─── Component ───────────────────────────────────────────────────────────────

const MangaCard = memo(({
  id, title, cover, type, rating, chapters, status, views,
  slug, isHot, isNew, rank, author, artist,
}: MangaCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const handleLoad = useCallback(() => setImageLoaded(true), []);

  const displayCreator = artist && artist !== author
    ? `${author} / ${artist}`
    : author;

  // Which top-left badge to show — rank > hot > new, at most one
  const topBadge = rank && rank <= 3
    ? 'rank'
    : isHot
    ? 'hot'
    : isNew
    ? 'new'
    : null;

  const dotClass = STATUS_DOT[status] || 'bg-muted-foreground/50';

  return (
    <Link
      to={`/manga/${slug || id}`}
      className="group relative block rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* ── Cover image ── */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">

        {/* Skeleton shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        <img
          src={cover}
          alt={title}
          loading="lazy"
          onLoad={handleLoad}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Gradient overlay — heavier at bottom for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* ── Top-left badge: rank / hot / new ── */}
        {topBadge === 'rank' && rank && (
          <div className={`absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-md font-black text-xs shadow ${RANK_STYLE[rank]}`}>
            {rank}
          </div>
        )}
        {topBadge === 'hot' && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-600 rounded-md text-[9px] font-black text-white shadow">
            <Flame className="h-2.5 w-2.5" />
            HOT
          </div>
        )}
        {topBadge === 'new' && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-600 rounded-md text-[9px] font-black text-white shadow">
            <Sparkles className="h-2.5 w-2.5" />
            NEW
          </div>
        )}

        {/* ── Top-right: type ── */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white/90 border border-white/10">
          {type}
        </div>

        {/* ── Bottom: title + meta ── */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
          <h3 className="font-bold text-[11px] sm:text-xs text-white line-clamp-2 leading-snug">
            {title}
          </h3>

          {displayCreator && (
            <p className="text-[9px] text-white/45 truncate mt-0.5">
              {displayCreator}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-2 mt-1.5">
            {/* Rating */}
            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-400">
              <Star className="h-2.5 w-2.5 fill-current" />
              {rating.toFixed(1)}
            </span>

            {/* Views */}
            <span className="flex items-center gap-0.5 text-[9px] text-white/50">
              <Eye className="h-2.5 w-2.5" />
              {formatViews(views)}
            </span>

            {/* Chapters — pushed to right with ml-auto */}
            {chapters !== undefined && (
              <span className="flex items-center gap-0.5 text-[9px] text-white/50 ml-auto">
                <BookOpen className="h-2.5 w-2.5" />
                {chapters}
              </span>
            )}
          </div>

          {/* Status dot strip — a thin line at the very bottom edge */}
          <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${dotClass} opacity-70`} />
        </div>
      </div>
    </Link>
  );
});

MangaCard.displayName = 'MangaCard';

export default MangaCard;
