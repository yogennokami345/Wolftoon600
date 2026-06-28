import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreateTitle, useTitles, useDeleteTitle } from '@/hooks/useTitles';
import { useTitleOptions } from '@/hooks/useTitleOptions';
import { useCreateChapter, useChapters, useDeleteChapter, useUpdateChapterVip } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAdminStats } from '@/hooks/useAdminStats';
import {
  Trash2, Plus, BarChart3, Users, Search, Edit, Layers, Crown,
  BookOpen, TrendingUp, Activity, Loader2, Flag, ChevronRight,
  ChevronDown, ShieldCheck, Zap, Eye, Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import VipManagement from '@/components/admin/VipManagement';
import CommentReports from '@/components/admin/CommentReports';
import UserManagement from '@/components/admin/UserManagement';
import AdminActionsHistory from '@/components/admin/AdminActionsHistory';
import MaintenanceSettings from '@/components/admin/MaintenanceSettings';
import { Switch } from '@/components/ui/switch';

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  iconColor: string;
}

const StatCard = ({ icon: Icon, label, value, sub, gradient, iconColor }: StatCardProps) => (
  <div className={`relative overflow-hidden rounded-2xl border p-4 ${gradient}`}>
    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5" />
    <div className="absolute -right-1 -top-1 h-10 w-10 rounded-full bg-white/5" />
    <div className="relative flex flex-col gap-3">
      <div className={`w-fit rounded-xl p-2.5 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-2xl font-black tabular-nums tracking-tight">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] opacity-50">{sub}</div>}
      </div>
    </div>
  </div>
);

// ─── Chapter VIP Panel ───────────────────────────────────────────────────────

interface ChapterVipPanelProps {
  titleId: string;
  chapters: any[];
  updateChapterVip: any;
}

const ChapterVipPanel = ({ titleId, chapters, updateChapterVip }: ChapterVipPanelProps) => {
  const vipCount = chapters.filter((c) => c.is_vip).length;

  return (
    <div className="ml-13 mt-1 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-card/60">
      <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Capítulos VIP</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
            {vipCount} VIP
          </Badge>
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
            {chapters.length - vipCount} Livres
          </Badge>
          {updateChapterVip.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto p-2">
        <div className="space-y-1">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                chapter.is_vip
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted/30 border border-transparent hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold tabular-nums text-muted-foreground w-12 shrink-0">
                  Cap. {chapter.chapter_number}
                </span>
                {chapter.chapter_title && (
                  <span className="truncate text-xs text-muted-foreground">{chapter.chapter_title}</span>
                )}
                {chapter.is_vip && (
                  <Crown className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>
              <Switch
                checked={chapter.is_vip || false}
                onCheckedChange={(checked) =>
                  updateChapterVip.mutate({ chapterId: chapter.id, isVip: checked })
                }
                className="shrink-0 scale-90"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Title Row ───────────────────────────────────────────────────────────────

interface TitleRowProps {
  title: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  chapters: any[];
  updateChapterVip: any;
  deleteTitle: any;
}

const TitleRow = ({
  title,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  chapters,
  updateChapterVip,
  deleteTitle,
}: TitleRowProps) => {
  const statusColors: Record<string, string> = {
    'Em andamento': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Completo': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Hiato': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Cancelado': 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-3 rounded-xl border p-2.5 transition-all ${
          isExpanded
            ? 'border-primary/30 bg-primary/5'
            : 'border-border/30 bg-muted/20 hover:bg-muted/40 hover:border-border/60'
        }`}
      >
        {/* Thumbnail */}
        <div className="relative shrink-0">
          <img
            src={title.cover}
            alt={title.title}
            className="h-16 w-11 rounded-lg object-cover shadow-sm"
          />
          {title.type && (
            <span className="absolute -bottom-1 -right-1 rounded-md bg-card px-1 py-0.5 text-[9px] font-bold uppercase border border-border/50 leading-none">
              {title.type.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight">{title.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {title.author}
                {title.artist && title.artist !== title.author && ` · ${title.artist}`}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {title.status && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[title.status] || 'bg-muted/50 text-muted-foreground border-border/30'}`}>
                {title.status}
              </span>
            )}
            {title.year && (
              <span className="text-[10px] text-muted-foreground">{title.year}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleExpand}
            title="Gerenciar VIP"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isExpanded
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            title="Editar obra"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleteTitle.isPending}
            title="Excluir obra"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* VIP Panel */}
      {isExpanded && (
        <div className="mt-1">
          {chapters && chapters.length > 0 ? (
            <ChapterVipPanel
              titleId={title.id}
              chapters={chapters}
              updateChapterVip={updateChapterVip}
            />
          ) : (
            <div className="ml-13 mt-1 rounded-xl border border-dashed border-border/40 px-4 py-5 text-center text-xs text-muted-foreground">
              Nenhum capítulo cadastrado para este título.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: titles } = useTitles();
  const { data: titleOptions } = useTitleOptions();
  const deleteTitle = useDeleteTitle();

  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [manageSearch, setManageSearch] = useState('');
  const [managePage, setManagePage] = useState(1);
  const [selectedTitleForChapters, setSelectedTitleForChapters] = useState<string | null>(null);
  const { data: analyticsData } = useAnalytics(analyticsPeriod);
  const { data: adminStats } = useAdminStats();
  const { data: chaptersForManage } = useChapters(selectedTitleForChapters || '');
  const deleteChapter = useDeleteChapter();
  const updateChapterVip = useUpdateChapterVip();

  const filteredTitles = useMemo(() => {
    if (!titleOptions) return [];
    if (!manageSearch.trim()) return titleOptions;
    const search = manageSearch.toLowerCase();
    return titleOptions.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.author.toLowerCase().includes(search) ||
        t.artist?.toLowerCase().includes(search),
    );
  }, [titleOptions, manageSearch]);

  const paginatedFilteredTitles = useMemo(() => {
    const start = (managePage - 1) * 12;
    return filteredTitles.slice(start, start + 12);
  }, [filteredTitles, managePage]);

  const manageTotalPages = Math.max(1, Math.ceil(filteredTitles.length / 12));
  const totalVisits = analyticsData?.reduce((sum, item) => sum + item.visits, 0) || 0;

  const handleDeleteTitle = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este título?')) {
      try {
        await deleteTitle.mutateAsync(id);
        toast({ title: 'Título excluído!', description: 'O título foi removido com sucesso.' });
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-9 w-9 text-destructive" />
          </div>
          <h1 className="mb-3 text-2xl font-black">Acesso Restrito</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Você precisa de permissão de administrador para acessar esta área.
          </p>
          <Button onClick={() => navigate('/')} className="rounded-xl">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'manage', label: 'Gerenciar', icon: Edit },
    { value: 'users', label: 'Usuários', icon: Users },
    { value: 'vip', label: 'VIP', icon: Crown },
    { value: 'reports', label: 'Denúncias', icon: Flag },
    { value: 'history', label: 'Histórico', icon: BarChart3 },
    { value: 'analytics', label: 'Analytics', icon: TrendingUp },
    { value: 'maintenance', label: 'Manutenção', icon: Wrench },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto max-w-7xl px-3 py-6 md:px-4 md:py-8">

          {/* ── Hero Header ── */}
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-primary/5 blur-2xl" />
            </div>
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-xl shadow-primary/25">
                  <Crown className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Painel de Controle
                  </div>
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">Administração</h1>
                  <p className="text-xs text-muted-foreground">
                    Gerencie títulos, capítulos, usuários e assinaturas VIP
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:opacity-90"
                  onClick={() => navigate('/create')}
                >
                  <Plus className="h-4 w-4" />
                  Nova Obra
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => navigate('/upload/bulk')}
                >
                  <Layers className="h-4 w-4" />
                  Upload em Massa
                </Button>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={Users}
              label="Usuários"
              value={adminStats?.totalUsers?.toLocaleString('pt-BR') || '0'}
              sub="cadastrados"
              gradient="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent"
              iconColor="bg-blue-500/15 text-blue-400"
            />
            <StatCard
              icon={BookOpen}
              label="Títulos"
              value={titles?.length?.toLocaleString('pt-BR') || '0'}
              sub="no catálogo"
              gradient="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent"
              iconColor="bg-emerald-500/15 text-emerald-400"
            />
            <StatCard
              icon={Eye}
              label="Visitas"
              value={totalVisits.toLocaleString('pt-BR')}
              sub={`no período`}
              gradient="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent"
              iconColor="bg-amber-500/15 text-amber-400"
            />
            <StatCard
              icon={Zap}
              label="Status"
              value="Online"
              sub="todos os serviços"
              gradient="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent"
              iconColor="bg-primary/15 text-primary"
            />
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="manage" className="w-full">
            <div className="-mx-3 mb-5 overflow-x-auto px-3">
              <TabsList className="inline-flex h-auto w-auto gap-0.5 rounded-xl border border-border/40 bg-card/80 p-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                  >
                    <tab.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Manage Tab ── */}
            <TabsContent value="manage" className="mt-0">
              <div className="rounded-2xl border border-border/40 bg-card/80 p-4 md:p-6">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">Títulos Cadastrados</h2>
                    <p className="text-xs text-muted-foreground">
                      {filteredTitles.length !== (titleOptions?.length || 0)
                        ? `${filteredTitles.length} de ${titleOptions?.length || 0} títulos`
                        : `${titleOptions?.length || 0} títulos no total`}
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, autor ou artista..."
                    value={manageSearch}
                    onChange={(e) => { setManageSearch(e.target.value); setManagePage(1); }}
                    className="rounded-xl pl-10 text-sm"
                  />
                  {manageSearch && (
                    <button
                      onClick={() => { setManageSearch(''); setManagePage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Title List */}
                <div className="space-y-2">
                  {paginatedFilteredTitles.length === 0 ? (
                    <div className="py-12 text-center">
                      <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        {manageSearch ? 'Nenhum título encontrado para essa busca.' : 'Nenhum título cadastrado ainda.'}
                      </p>
                      {!manageSearch && (
                        <Button size="sm" className="mt-4 rounded-xl" onClick={() => navigate('/create')}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Adicionar título
                        </Button>
                      )}
                    </div>
                  ) : (
                    paginatedFilteredTitles.map((title) => (
                      <TitleRow
                        key={title.id}
                        title={title}
                        isExpanded={selectedTitleForChapters === title.id}
                        onToggleExpand={() =>
                          setSelectedTitleForChapters(
                            selectedTitleForChapters === title.id ? null : title.id,
                          )
                        }
                        onEdit={() => navigate(`/manga/${title.id}/edit`)}
                        onDelete={() => handleDeleteTitle(title.id)}
                        chapters={selectedTitleForChapters === title.id ? chaptersForManage || [] : []}
                        updateChapterVip={updateChapterVip}
                        deleteTitle={deleteTitle}
                      />
                    ))
                  )}
                </div>

                {/* Pagination */}
                {filteredTitles.length > 12 && (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Página <strong>{managePage}</strong> de <strong>{manageTotalPages}</strong>
                      <span className="ml-2 opacity-60">· {filteredTitles.length} títulos</span>
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-3 text-xs"
                        disabled={managePage === 1}
                        onClick={() => setManagePage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-3 text-xs"
                        disabled={managePage === manageTotalPages}
                        onClick={() => setManagePage((p) => Math.min(manageTotalPages, p + 1))}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-0"><UserManagement /></TabsContent>
            <TabsContent value="vip" className="mt-0"><VipManagement /></TabsContent>
            <TabsContent value="reports" className="mt-0"><CommentReports /></TabsContent>
            <TabsContent value="history" className="mt-0"><AdminActionsHistory /></TabsContent>

            {/* ── Maintenance Tab ── */}
            <TabsContent value="maintenance" className="mt-0">
              <div className="rounded-2xl border border-border/40 bg-card/80 p-4 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Modo Manutenção</h2>
                    <p className="text-xs text-muted-foreground">Controle o acesso ao site durante manutenções</p>
                  </div>
                </div>
                <MaintenanceSettings />
              </div>
            </TabsContent>

            {/* ── Analytics Tab ── */}
            <TabsContent value="analytics" className="mt-0">
              <div className="rounded-2xl border border-border/40 bg-card/80 p-4 md:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold">Estatísticas de Acesso</h2>
                    <p className="text-xs text-muted-foreground">Visitantes únicos e engajamento da plataforma</p>
                  </div>
                  <div className="flex gap-1 rounded-xl border border-border/40 bg-muted/30 p-1">
                    {(['day', 'month', 'year'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAnalyticsPeriod(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          analyticsPeriod === p
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p === 'day' ? 'Diário' : p === 'month' ? 'Mensal' : 'Anual'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {analyticsData && analyticsData.length > 0 && (
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total no período', value: totalVisits.toLocaleString('pt-BR') },
                      { label: 'Média por ponto', value: Math.round(totalVisits / analyticsData.length).toLocaleString('pt-BR') },
                      { label: 'Pico de visitas', value: Math.max(...analyticsData.map((i) => i.visits)).toLocaleString('pt-BR') },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
                        <div className="text-xl font-black tabular-nums text-primary">{s.value}</div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData || []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '10px' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '10px' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                        }}
                        cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#visitGrad)"
                        name="Visitas"
                        dot={false}
                        activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Admin;
