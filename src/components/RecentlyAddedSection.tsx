import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string }> = {
  'Em andamento': { label: 'Em andamento' },
  ongoing:        { label: 'Em andamento' },
  completed:      { label: 'Completo'     },
  'Completo':     { label: 'Completo'     },
  hiatus:         { label: 'Hiato'        },
  cancelled:      { label: 'Cancelado'    },
};
const getStatusLabel = (s: string) => STATUS_CONFIG[s]?.label ?? s;

const PAGE_SIZE = 6; // 9 linhas × 1 cols

const NewWorksCard = memo(({ m }: { m: Title }) => (
  <Link to={`/manga/${m.slug || m.id}`} className="group block">
    {/* Imagem — aspect quadrado, border-radius grande */}
    <div className="relative overflow-hidden rounded-2xl bg-muted" style={{ aspectRatio: '3/4' }}>
      <img
        src={m.cover}
        alt={m.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {/* Badge status — canto sup esq, ponto verde + texto */}
      <div className="absolute top-2.5 left-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white leading-none">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          {getStatusLabel(m.status)}
        </span>
      </div>
    </div>

    {/* Título + tipo FORA da imagem, abaixo — exato como na screenshot */}
    <div className="mt-2 px-0.5">
      <h3 className="text-[14px] font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
        {m.title}
      </h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{m.type}</p>
    </div>
  </Link>
));
NewWorksCard.displayName = 'NewWorksCard';

const RecentlyAddedSection = memo(({ titles }: Props) => {
  const [page, setPage] = useState(1);
  if (!titles?.length) return null;

  const totalPages = Math.max(1, Math.ceil(titles.length / PAGE_SIZE));
  const pageItems  = titles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="container mx-auto px-3 md:px-4 py-5 md:py-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="font-black text-xl md:text-2xl tracking-tight leading-none">Novas Obras</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid 2 colunas fixo */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-6">
        {pageItems.map((m) => (
          <NewWorksCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
});

RecentlyAddedSection.displayName = 'RecentlyAddedSection';
export default RecentlyAddedSection;
