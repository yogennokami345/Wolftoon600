import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTitle } from "@/hooks/useTitles";
import { useChapters } from "@/hooks/useChapters";
import { useIncrementViews } from "@/hooks/useIncrementViews";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useReadingStatus, STATUS_CONFIG, ReadingStatus } from "@/hooks/useReadingStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import CommentsSection from "@/components/CommentsSection";
import RatingSection from "@/components/RatingSection";
import VipCountdown from "@/components/VipCountdown";
import {
  BookOpen, Star, Heart, Share2, Play, Crown,
  BookMarked, CheckCircle, Pause, Trash2, ListPlus,
  Upload, Layers, Pencil, Flag, Search, ArrowUpDown,
  AlignLeft, MessageSquare, Image as ImageIcon, Calendar,
  User as UserIcon, Brush, Activity, Eye, ThumbsUp,
  ChevronDown, ChevronUp, Clock
} from "lucide-react";

type Tab = 'chapters' | 'synopsis' | 'reviews';

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'EM ANDAMENTO',
  Em_andamento: 'EM ANDAMENTO',
  completed: 'COMPLETO',
  hiatus: 'HIATUS',
  cancelled: 'CANCELADO',
};

const STATUS_COLOR: Record<string, { dot: string; badge: string }> = {
  ongoing:     { dot: 'bg-emerald-400', badge: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  Em_andamento:{ dot: 'bg-emerald-400', badge: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  completed:   { dot: 'bg-blue-400',    badge: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  hiatus:      { dot: 'bg-amber-400',   badge: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  cancelled:   { dot: 'bg-red-400',     badge: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

// Emoji reactions config
const REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Curtir' },
  { key: 'love',  emoji: '❤️', label: 'Amar' },
  { key: 'laugh', emoji: '😂', label: 'Rir' },
  { key: 'wow',   emoji: '😮', label: 'Uau' },
  { key: 'sad',   emoji: '😢', label: 'Triste' },
  { key: 'angry', emoji: '😡', label: 'Irritar' },
];

const MangaDetails = () => {
  const { slug } = useParams();
  const { data: manga, isLoading } = useTitle(slug || "");
  const { data: chapters } = useChapters(manga?.id || "");
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { getProgressForTitle } = useReadingProgress();
  const { status: readingStatus, updateStatus, isInList } = useReadingStatus(manga?.id);

  const [tab, setTab] = useState<Tab>('chapters');
  const [chapterQuery, setChapterQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('broken_chapter');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({ like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 });
  const [myReaction, setMyReaction] = useState<string | null>(null);

  const isFavorite = favorites?.includes(manga?.id || "") ?? false;
  const readingProgress = getProgressForTitle(manga?.id || "");
  const continueChapter = readingProgress?.chapter?.chapter_number || 1;

  useIncrementViews(manga?.id);

  const statusIcons: Record<ReadingStatus, React.ReactNode> = {
    reading:   <BookOpen className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    planning:  <BookMarked className="h-4 w-4" />,
    dropped:   <Trash2 className="h-4 w-4" />,
    on_hold:   <Pause className="h-4 w-4" />,
  };

  const filteredChapters = useMemo(() => {
    let list = chapters || [];
    if (chapterQuery.trim()) {
      const q = chapterQuery.toLowerCase();
      list = list.filter(
        (c) =>
          String(c.chapter_number).includes(q) ||
          (c.chapter_title || '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      sortDesc ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number,
    );
  }, [chapters, chapterQuery, sortDesc]);

  const handleReaction = (key: string) => {
    if (!user) {
      toast({ title: "Login necessário", description: "Faça login para reagir", variant: "destructive" });
      return;
    }
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction === key) {
        next[key] = Math.max(0, (next[key] || 0) - 1);
        setMyReaction(null);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 0) - 1);
        next[key] = (next[key] || 0) + 1;
        setMyReaction(key);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[420px] bg-muted animate-pulse" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Título não encontrado</h1>
          <Button asChild><Link to="/catalog">Voltar ao Catálogo</Link></Button>
        </div>
      </div>
    );
  }

  const formatViews = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };
  const ratingDisplay = (manga.rating || 0).toFixed(1);

  const handleShare = async () => {
    try {
      await navigator.share({ title: manga.title, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copiado!" });
    }
  };

  const synopsis = manga.synopsis || '';
  const synopsisShort = synopsis.length > 300 ? synopsis.slice(0, 300).trimEnd() + '…' : synopsis;
  const statusKey = (manga.status || 'ongoing') as string;
  const statusLabel = STATUS_LABEL[statusKey] || (manga.status || 'EM ANDAMENTO').toUpperCase();
  const statusStyle = STATUS_COLOR[statusKey] || STATUS_COLOR.ongoing;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white pb-16">
      <Header />

      {/* ═══════════════════════════════════════════
          HERO — full-width banner + poster sidebar
      ═══════════════════════════════════════════ */}
      <div className="relative w-full">
        {/* Blurred banner */}
        <div className="absolute inset-0 h-[420px] sm:h-[500px] overflow-hidden">
          <img
            src={manga.cover}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-top scale-105 blur-lg opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f13]/20 via-[#0f0f13]/70 to-[#0f0f13]" />
        </div>

        {/* Content grid */}
        <div className="relative container mx-auto px-4 max-w-5xl pt-8 pb-0">
          <div className="flex flex-col sm:flex-row gap-7 sm:gap-10 items-start">

            {/* ── LEFT: Poster ── */}
            <div className="shrink-0 w-[160px] sm:w-[200px] mx-auto sm:mx-0">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/80">
                <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover" />
                {/* Type badge */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-[10px] font-black uppercase tracking-widest text-white shadow">
                  {manga.type}
                </span>
              </div>

              {/* Action buttons below poster on desktop */}
              <div className="hidden sm:flex flex-col gap-2 mt-4">
                {readingProgress ? (
                  <Button asChild size="sm" className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold w-full">
                    <Link to={`/read/${manga.id}/${continueChapter}`}>
                      <Play className="h-4 w-4 fill-current mr-1.5" />
                      Cap. {continueChapter}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold w-full">
                    <Link to={`/read/${manga.id}/1`}>
                      <Play className="h-4 w-4 fill-current mr-1.5" />
                      Ler Cap. 1
                    </Link>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className={`h-10 rounded-lg font-bold w-full ${
                    isFavorite
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    if (!user) {
                      toast({ title: "Login necessário", description: "Faça login para favoritar", variant: "destructive" });
                      return;
                    }
                    toggleFavorite.mutate({ titleId: manga.id, isFavorite }, {
                      onSuccess: () => toast({ title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos" }),
                    });
                  }}
                  disabled={toggleFavorite.isPending}
                >
                  <Heart className={`h-4 w-4 mr-1.5 ${isFavorite ? 'fill-current text-rose-400' : ''}`} />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-lg font-bold w-full border-white/20 bg-white/5 hover:bg-white/10"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  Compartilhar
                </Button>
              </div>
            </div>

            {/* ── RIGHT: Info ── */}
            <div className="flex-1 min-w-0 pt-2">
              {/* Alt title */}
              {manga.alternative_titles?.length > 0 && (
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold line-clamp-1">
                  {manga.alternative_titles[0]}
                </p>
              )}

              {/* Main title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight break-words mb-4">
                {manga.title}
              </h1>

              {/* Meta grid — like Vortex's stat sidebar */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
                <MetaRow label="Status">
                  <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2 py-0.5 rounded border ${statusStyle.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot} animate-pulse`} />
                    {statusLabel}
                  </span>
                </MetaRow>

                <MetaRow label="Tipo">
                  <span className="font-bold text-white/90">{manga.type}</span>
                </MetaRow>

                <MetaRow label="Capítulos">
                  <span className="font-bold text-white/90">{chapters?.length || 0}</span>
                </MetaRow>

                {manga.year && (
                  <MetaRow label="Ano">
                    <span className="font-bold text-white/90">{manga.year}</span>
                  </MetaRow>
                )}

                {manga.author && (
                  <MetaRow label="Autor">
                    <span className="font-bold text-white/90 truncate max-w-[140px]">{manga.author}</span>
                  </MetaRow>
                )}

                {manga.artist && (
                  <MetaRow label="Arte">
                    <span className="font-bold text-white/90 truncate max-w-[140px]">{manga.artist}</span>
                  </MetaRow>
                )}

                <MetaRow label="Avaliação">
                  <span className="flex items-center gap-1 font-bold text-yellow-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {ratingDisplay}
                  </span>
                </MetaRow>

                <MetaRow label="Favoritos">
                  <span className="flex items-center gap-1 font-bold text-rose-400">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    {formatViews((manga as any).favorites_count || 0)}
                  </span>
                </MetaRow>
              </div>

              {/* Genres */}
              {manga.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {manga.genres.slice(0, 6).map((g) => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-semibold text-white/60 hover:bg-rose-600/20 hover:border-rose-500/40 hover:text-rose-300 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}

              {/* Mobile action buttons */}
              <div className="flex sm:hidden gap-2 mt-2">
                {readingProgress ? (
                  <Button asChild size="sm" className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
                    <Link to={`/read/${manga.id}/${continueChapter}`}>
                      <Play className="h-4 w-4 fill-current mr-1" />
                      Cap. {continueChapter}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
                    <Link to={`/read/${manga.id}/1`}>
                      <Play className="h-4 w-4 fill-current mr-1" />
                      Ler Cap. 1
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={`flex-1 h-11 rounded-xl font-bold ${isFavorite ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' : 'border-white/15 bg-white/5'}`}
                  onClick={() => {
                    if (!user) { toast({ title: "Login necessário", variant: "destructive" }); return; }
                    toggleFavorite.mutate({ titleId: manga.id, isFavorite });
                  }}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>

              {/* Secondary icon bar */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 sm:hidden" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1.5" />Compartilhar
                </Button>

                {user && (
                  <Select
                    value={readingStatus || ''}
                    onValueChange={(value) => {
                      updateStatus.mutate({ status: value as ReadingStatus }, {
                        onSuccess: () => toast({ title: "Lista atualizada" }),
                      });
                    }}
                  >
                    <SelectTrigger className={`h-9 rounded-lg px-3 text-sm border ${isInList ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-white/5 text-white/60'}`}>
                      {isInList ? (
                        <span className="flex items-center gap-1.5">{statusIcons[readingStatus!]}{STATUS_CONFIG[readingStatus!]?.label}</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><ListPlus className="h-4 w-4" />Adicionar à Lista</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">{statusIcons[s]}{STATUS_CONFIG[s].label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Report */}
                <Dialog open={reportOpen} onOpenChange={(o) => { setReportOpen(o); if (!o) setReportFeedback(null); }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
                      <Flag className="h-4 w-4 mr-1.5" />Reportar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-[#1a1a22] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-white">
                        <Flag className="h-5 w-5 text-rose-400" />Reportar problema
                      </DialogTitle>
                      <DialogDescription className="text-white/50">
                        Conte o que aconteceu com <strong className="text-white/70">{manga.title}</strong>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wider">Tipo</label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="broken_chapter">Capítulo quebrado / não carrega</SelectItem>
                            <SelectItem value="wrong_info">Informação incorreta</SelectItem>
                            <SelectItem value="missing_chapter">Capítulo faltando</SelectItem>
                            <SelectItem value="duplicate">Obra duplicada</SelectItem>
                            <SelectItem value="copyright">Violação de direitos autorais</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wider">Detalhes</label>
                        <Textarea
                          value={reportMessage}
                          onChange={(e) => setReportMessage(e.target.value)}
                          placeholder="Descreva o problema com o máximo de detalhes..."
                          className="min-h-[100px] resize-none bg-white/5 border-white/10"
                          maxLength={500}
                        />
                        <p className="text-[10px] text-white/30 mt-1 text-right">{reportMessage.length}/500</p>
                      </div>
                      {reportFeedback && (
                        <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${reportFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                          {reportFeedback.text}
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" className="border-white/10" onClick={() => setReportOpen(false)}>
                        {reportFeedback?.type === 'success' ? 'Fechar' : 'Cancelar'}
                      </Button>
                      <Button
                        disabled={reportSubmitting || reportMessage.trim().length < 5 || reportFeedback?.type === 'success'}
                        onClick={async () => {
                          setReportSubmitting(true);
                          setReportFeedback(null);
                          const { error } = await supabase.from('title_reports').insert({
                            title_id: manga.id,
                            reporter_id: user?.id ?? null,
                            report_type: reportType,
                            message: reportMessage.trim(),
                          });
                          setReportSubmitting(false);
                          if (error) {
                            setReportFeedback({ type: 'error', text: 'Não foi possível enviar. Tente novamente.' });
                            return;
                          }
                          setReportFeedback({ type: 'success', text: 'Relatório enviado! Obrigado por ajudar.' });
                          setReportMessage('');
                          toast({ title: 'Relatório enviado!' });
                        }}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        {reportSubmitting ? 'Enviando…' : 'Enviar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Admin tools */}
                {isAdmin && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                          <Link to={`/upload/chapter/${manga.id}`}><Upload className="h-4 w-4" /></Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload Capítulo</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                          <Link to={`/upload/bulk/${manga.id}`}><Layers className="h-4 w-4" /></Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload em Massa</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                          <Link to={`/manga/${manga.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar Obra</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TABS
      ═══════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-5xl mt-8">
        <div className="flex gap-0 border-b border-white/10">
          {([
            { key: 'chapters', label: `Capítulos (${chapters?.length || 0})`, icon: <BookOpen className="h-4 w-4" /> },
            { key: 'synopsis', label: 'Sinopse',   icon: <AlignLeft className="h-4 w-4" /> },
            { key: 'reviews',  label: 'Comentários', icon: <MessageSquare className="h-4 w-4" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
                tab === key
                  ? 'border-rose-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{key === 'chapters' ? `Cap. (${chapters?.length || 0})` : key === 'synopsis' ? 'Sinopse' : 'Reviews'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TAB CONTENT
      ═══════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-5xl mt-5 space-y-4">

        {/* ── CHAPTERS TAB ── */}
        {tab === 'chapters' && (
          <>
            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={chapterQuery}
                  onChange={(e) => setChapterQuery(e.target.value)}
                  placeholder="Buscar capítulo..."
                  className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 placeholder:text-white/25 text-white focus:border-rose-500/50 focus:bg-white/8"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white/50 hover:text-white"
                onClick={() => setSortDesc((s) => !s)}
                aria-label="Ordenar"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Mark all */}
            {user && filteredChapters.length > 0 && (
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-colors group">
                <CheckCircle className="h-5 w-5 text-white/30 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm font-semibold text-white/50 group-hover:text-emerald-300 transition-colors">Marcar todos como lido</span>
              </button>
            )}

            {/* Chapter rows — Vortex style */}
            {filteredChapters.length === 0 ? (
              <div className="text-center py-14">
                <BookOpen className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhum capítulo encontrado.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/8">
                {filteredChapters.map((chapter) => {
                  const isNew = Date.now() - new Date(chapter.created_at).getTime() < 1000 * 60 * 60 * 24 * 3;
                  const unlockAt = (chapter as any).vip_unlock_at as string | null;
                  const isAutoUnlocked = unlockAt && new Date(unlockAt).getTime() <= Date.now();
                  const isVipLocked = chapter.is_vip && !isAutoUnlocked;

                  return (
                    <Link
                      key={chapter.id}
                      to={`/read/${manga.id}/${chapter.chapter_number}`}
                      className="flex items-center gap-3 sm:gap-4 px-4 py-3.5 bg-[#16161e] hover:bg-[#1e1e2a] transition-colors group"
                    >
                      {/* Chapter thumb */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                        <img src={manga.cover} alt="" loading="lazy" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">
                            Capítulo {chapter.chapter_number}
                          </span>
                          {isNew && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-rose-600 text-white">
                              Novo
                            </span>
                          )}
                          {isVipLocked && (
                            unlockAt
                              ? <VipCountdown unlockAt={unlockAt} variant="badge" />
                              : <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] px-1.5 py-0 h-5">
                                  <Crown className="h-2.5 w-2.5 mr-0.5" />VIP
                                </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-white/30 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(chapter.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {chapter.chapter_title && (
                            <span className="text-[11px] text-white/30 truncate">{chapter.chapter_title}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: view + comment counts (decorative, Vortex-style) */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0 text-white/25">
                        <span className="flex items-center gap-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          {Math.floor(Math.random() * 200 + 10)}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {Math.floor(Math.random() * 20)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── SYNOPSIS TAB ── */}
        {tab === 'synopsis' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/8 bg-[#16161e] p-5">
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                {synopsisExpanded ? synopsis : synopsisShort}
              </p>
              {synopsis.length > 300 && (
                <button
                  onClick={() => setSynopsisExpanded((s) => !s)}
                  className="mt-4 flex items-center gap-1.5 text-rose-400 font-bold text-sm hover:text-rose-300 transition-colors"
                >
                  {synopsisExpanded ? <><ChevronUp className="h-4 w-4" />Mostrar menos</> : <><ChevronDown className="h-4 w-4" />Mostrar mais</>}
                </button>
              )}
            </div>

            {manga.genres?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Gêneros</h3>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map((g) => (
                    <Link
                      key={g}
                      to={`/catalog?genre=${encodeURIComponent(g)}`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-rose-600/15 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <RatingSection titleId={manga.id} />
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === 'reviews' && (
          <div className="rounded-xl border border-white/8 bg-[#16161e] p-4">
            <CommentsSection titleId={manga.id} />
          </div>
        )}

        {/* ══════════════════════════════════════
            REACTIONS — always visible below tabs
        ══════════════════════════════════════ */}
        <div className="rounded-xl border border-white/8 bg-[#16161e] p-4 mt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Sua reação</p>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(({ key, emoji, label }) => (
              <button
                key={key}
                onClick={() => handleReaction(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  myReaction === key
                    ? 'border-rose-500/50 bg-rose-500/15 text-white scale-105'
                    : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
                aria-label={label}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="tabular-nums">{reactions[key]}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

/* ── Helpers ── */

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{label}</span>
    <div className="text-sm">{children}</div>
  </div>
);

export default MangaDetails;
