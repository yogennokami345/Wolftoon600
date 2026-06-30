import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesWithTitles } from '@/hooks/useFavoritesWithTitles';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useDetailedUserStats } from '@/hooks/useDetailedUserStats';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import MangaCard from '@/components/MangaCard';
import LevelBadge, { tierFor } from '@/components/profile/LevelBadge';
import XPBar from '@/components/profile/XPBar';
import DailyCheckinCard from '@/components/profile/DailyCheckinCard';
import AchievementsBadges from '@/components/profile/AchievementsBadges';
import { useUserXP } from '@/hooks/useGamification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  User, Heart, BookOpen, Settings, Crown, Save, History, Trash2, LogOut,
  Calendar, Key, Camera, Sparkles, Image as ImageIcon, Lock, MessageSquare,
  Bell, ShoppingBag, Home, Palette, Ban, ChevronRight, Trophy, Flame,
  BookMarked, Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Sub-aba de configurações ─────────────────────────────────────────────────
type SettingsTab = 'conta' | 'seguranca' | 'notificacoes' | 'leitura' | 'aparencia' | 'personalizar' | 'bloqueados';

// ─── Componente de toggle de notificação ──────────────────────────────────────
const NotifRow = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-border/30 last:border-0">
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, isVip, isAdmin, signOut } = useAuth();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavoritesWithTitles();
  const { progress, isLoading: progressLoading } = useReadingProgress();
  const { history, isLoading: historyLoading, clearHistory, isClearingHistory } = useReadingHistory();
  const { data: detailedStats } = useDetailedUserStats(user?.id);
  const { data: userXP } = useUserXP(user?.id);
  const { toast } = useToast();

  // profile fields
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // notifications
  const [notifNewSeries, setNotifNewSeries] = useState(true);
  const [notifNewChapters, setNotifNewChapters] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  // reading prefs
  const [readTheme, setReadTheme] = useState<'night' | 'onyx' | 'sepia' | 'light'>('night');
  const [readMode, setReadMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [readFit, setReadFit] = useState<'fit' | 'original'>('fit');
  const [readGap, setReadGap] = useState<'none' | 'small' | 'large'>('none');

  // accent color
  const PRESET_COLORS = ['#f59e0b', '#7c3aed', '#ec4899', '#a78bfa', '#60a5fa', '#10b981', '#ef4444', '#06b6d4'];
  const [accentColor, setAccentColor] = useState('#7c3aed');

  // tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'favoritos' | 'historico' | 'comprados' | 'comentarios' | 'configuracoes'>('overview');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('conta');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, banner_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
        setBannerUrl((data as any).banner_url || '');
      }
    };
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let finalAvatar = avatarUrl;
      let finalBanner = bannerUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        await supabase.storage.from('covers').upload(path, avatarFile, { upsert: true });
        finalAvatar = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop();
        const path = `${user.id}/banner.${ext}`;
        await supabase.storage.from('covers').upload(path, bannerFile, { upsert: true });
        finalBanner = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('profiles').update({
        username, avatar_url: finalAvatar, banner_url: finalBanner, updated_at: new Date().toISOString(),
      } as any).eq('id', user.id);
      if (error) await supabase.from('profiles').insert({ id: user.id, username, avatar_url: finalAvatar, banner_url: finalBanner } as any);
      setAvatarUrl(finalAvatar); setBannerUrl(finalBanner);
      setAvatarFile(null); setBannerFile(null);
      toast({ title: '✅ Perfil atualizado' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmNewPassword) {
      toast({ title: 'Senhas não coincidem', variant: 'destructive' }); return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Mínimo 6 caracteres', variant: 'destructive' }); return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: '✅ Senha atualizada' });
      setNewPassword(''); setConfirmNewPassword('');
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setIsChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      await signOut(); navigate('/');
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally { setIsDeletingAccount(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="container mx-auto px-4 py-16 space-y-4">
        <div className="h-40 bg-card rounded-2xl animate-pulse" />
        <div className="h-24 bg-card rounded-2xl animate-pulse" />
      </div>
    </div>
  );
  if (!user) return null;

  const displayName = username || user.email?.split('@')[0] || 'Usuário';
  const memberSince = new Date(user.created_at || Date.now());
  const level = userXP?.level ?? 1;
  const tier = tierFor(level);

  // Stats cards (utoon style)
  const statsCards = [
    { icon: '🪙', label: 'Moedas', value: 0, color: 'text-yellow-400' },
    { icon: '🔖', label: 'Favoritos', value: detailedStats?.favoritesCount || favorites.length || 0, color: 'text-primary' },
    { icon: '🔒', label: 'Cap. Próprios', value: 0, color: 'text-purple-400' },
    { icon: '💬', label: 'Comentários', value: 0, color: 'text-blue-400' },
  ];

  const mainTabs = [
    { id: 'overview', label: 'Visão Geral', icon: Home },
    { id: 'favoritos', label: 'Favoritos', icon: Heart },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'comprados', label: 'Comprados', icon: ShoppingBag },
    { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ] as const;

  const settingsTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'conta', label: 'Conta', icon: User },
    { id: 'seguranca', label: 'Segurança', icon: Lock },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'leitura', label: 'Leitura', icon: BookOpen },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'personalizar', label: 'Personalizar', icon: Sparkles },
    { id: 'bloqueados', label: 'Bloqueados', icon: Ban },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-3 py-4 max-w-3xl space-y-4">

          {/* ── Profile Card ── */}
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-card/60">
            {/* Banner */}
            <div className="relative h-28 md:h-36 w-full overflow-hidden">
              {bannerUrl
                ? <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${tier.from} ${tier.via} ${tier.to} opacity-30`} />
              }
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              <label className="absolute top-2 right-2 cursor-pointer">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/70 text-white text-[11px] font-medium backdrop-blur-sm transition">
                  <ImageIcon className="h-3 w-3" /> Banner
                </div>
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerUrl(URL.createObjectURL(f)); } }} className="hidden" />
              </label>
            </div>

            {/* Avatar + Info */}
            <div className="px-4 pb-4 -mt-10 relative">
              <div className="flex items-end gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-20 w-20 border-4 border-card shadow-xl">
                    <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isVip && (
                    <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full ring-2 ring-card">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); } }} className="hidden" />
                  </label>
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-black">{displayName}</h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.bg} ${tier.text}`}>
                      {tier.emoji} {tier.shortName.toUpperCase()}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        ⚡ ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    Membro desde {memberSince.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Level badge */}
                <LevelBadge level={level} size="lg" className="shrink-0 pb-1" />
              </div>

              {/* XP Bar */}
              <div className="mt-3">
                <XPBar xp={userXP} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="rounded-xl flex-1 h-9 text-xs" onClick={() => { setActiveTab('configuracoes'); setSettingsTab('conta'); }}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" /> Configurações
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={async () => { await signOut(); navigate('/'); }}>
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
                </Button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {statsCards.map(s => (
                  <div key={s.label} className="rounded-xl bg-muted/20 border border-border/30 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-base">{s.icon}</span>
                      <p className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main Navigation Tabs ── */}
          <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide border-b border-border/30">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── VISÃO GERAL ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Recently read */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lidos Recentemente</h2>
                  <button onClick={() => setActiveTab('historico')} className="text-xs text-primary hover:underline flex items-center gap-1">
                    Ver histórico <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-border/30 bg-card/40 p-6 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum histórico de leitura ainda.</p>
                    <Link to="/catalog" className="text-sm font-bold text-primary hover:underline">Encontrar algo para ler →</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 5).map(item => (
                      <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/30 hover:bg-card/60 border border-border/20 hover:border-primary/30 transition-all group">
                          <img src={item.title?.cover} alt="" className="w-10 h-14 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary">{item.title?.title}</p>
                            <p className="text-xs text-muted-foreground">Cap. {item.chapter?.chapter_number}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(item.read_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily checkin + Level progress */}
              <div className="grid md:grid-cols-2 gap-4">
                <DailyCheckinCard />
                {/* Level card */}
                <div className={`rounded-2xl border p-4 bg-gradient-to-br ${tier.from} ${tier.via} ${tier.to} bg-opacity-10 border-opacity-30`} style={{ borderColor: 'currentColor' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-white/70 font-bold uppercase tracking-wider">Seu Nível</p>
                      <p className="text-white font-black text-xl">Nível {level} · {tier.shortName}</p>
                    </div>
                    <LevelBadge level={level} size="xl" />
                  </div>
                  <XPBar xp={userXP} />
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{detailedStats?.chaptersRead || 0}</p>
                      <p className="text-white/60 text-[10px]">Capítulos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{detailedStats?.titlesRead || 0}</p>
                      <p className="text-white/60 text-[10px]">Títulos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{detailedStats?.readingStreak || 0}🔥</p>
                      <p className="text-white/60 text-[10px]">Streak</p>
                    </div>
                  </div>
                </div>
              </div>

              <AchievementsBadges />
            </div>
          )}

          {/* ── FAVORITOS ── */}
          {activeTab === 'favoritos' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {favorites.length} SÉRIE(S) FAVORITADA(S) · <button onClick={() => navigate('/my-list')} className="text-primary hover:underline">VER TODAS →</button>
              </p>
              {favoritesLoading ? (
                <div className="grid grid-cols-3 gap-2">{[...Array(6)].map((_, i) => <div key={i} className="aspect-[2/3] bg-card/50 rounded-lg animate-pulse" />)}</div>
              ) : favorites.length === 0 ? (
                <div className="rounded-xl border border-border/30 p-8 text-center">
                  <Heart className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhum favorito ainda.</p>
                  <Button asChild size="sm" className="rounded-xl"><Link to="/catalog">Explorar Catálogo</Link></Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {favorites.map(fav => (
                    <MangaCard key={fav.id} id={fav.title_id} title={fav.title?.title || ''} cover={fav.title?.cover || ''} type={(fav.title?.type as any) || 'Manhwa'} rating={fav.title?.rating || 0} views={fav.title?.views || 0} status={(fav.title?.status as any) || 'Em andamento'} genres={fav.title?.genres || []} slug={fav.title?.slug} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HISTÓRICO ── */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CONTINUE LENDO</p>
                {history.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive h-7">
                        <Trash2 className="h-3 w-3 mr-1" /> Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearHistory(undefined, { onSuccess: () => toast({ title: 'Histórico limpo' }) })} disabled={isClearingHistory} className="bg-destructive text-white">
                          {isClearingHistory ? 'Limpando...' : 'Limpar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {historyLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card/50 rounded-xl animate-pulse" />)}</div>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-border/30 p-8 text-center">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum histórico de leitura ainda.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {history.map(item => (
                    <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/30 hover:bg-card/60 border border-border/20 hover:border-primary/30 transition-all group">
                        <img src={item.title?.cover} alt="" className="w-10 h-14 object-cover rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary">{item.title?.title}</p>
                          <p className="text-xs text-muted-foreground">Cap. {item.chapter?.chapter_number}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(item.read_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPRADOS ── */}
          {activeTab === 'comprados' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">0 CAPÍTULOS PRÓPRIOS EM 0 SÉRIES</p>
              <div className="rounded-xl border border-border/30 p-8 text-center">
                <Lock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Você ainda não desbloqueou nenhum capítulo premium.</p>
                <Link to="/vip" className="text-sm font-bold text-primary hover:underline">Obter moedas →</Link>
              </div>
            </div>
          )}

          {/* ── COMENTÁRIOS ── */}
          {activeTab === 'comentarios' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">SEUS COMENTÁRIOS RECENTES</p>
              <div className="rounded-xl border border-border/30 p-8 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
              </div>
            </div>
          )}

          {/* ── CONFIGURAÇÕES ── */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-4">
              {/* Settings sub-tabs */}
              <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide border-b border-border/30">
                {settingsTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSettingsTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                      settingsTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ─ CONTA ─ */}
              {settingsTab === 'conta' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div>
                    <h3 className="font-bold text-sm mb-1">Perfil</h3>
                    <p className="text-xs text-muted-foreground">Como você aparece na Wolftoon.</p>
                  </div>

                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="h-16 w-16 border-2 border-border">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera className="h-5 w-5 text-white" />
                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); } }} className="hidden" />
                      </label>
                    </div>
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/20 text-xs font-medium hover:bg-muted/40 transition">
                            <Camera className="h-3 w-3" /> Upload
                          </div>
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); } }} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF ou WebP · máx 3MB</p>
                    </div>
                  </div>

                  {/* Banner upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Banner do perfil</Label>
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/20 text-xs font-medium hover:bg-muted/40 transition w-fit">
                        <ImageIcon className="h-3.5 w-3.5" /> Upload banner
                      </div>
                      <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerUrl(URL.createObjectURL(f)); } }} className="hidden" />
                    </label>
                    <p className="text-[10px] text-muted-foreground">Imagem larga exibida atrás do cabeçalho · máx 6MB</p>
                  </div>

                  {/* Display name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome de exibição</Label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu nome" className="rounded-xl text-sm" />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bio</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Fale um pouco sobre você..." className="rounded-xl text-sm min-h-[80px] resize-none" />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email</Label>
                    <Input value={user.email || ''} disabled className="rounded-xl text-sm bg-muted/30" />
                    <p className="text-[10px] text-muted-foreground">Usado para login e notificações. Nunca exibido publicamente.</p>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              )}

              {/* ─ SEGURANÇA ─ */}
              {settingsTab === 'seguranca' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div>
                    <h3 className="font-bold text-sm mb-0.5">Alterar senha</h3>
                    <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Senha atual</Label>
                      <Input type="password" placeholder="••••••••" className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nova senha</Label>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Confirmar nova senha</Label>
                      <Input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="••••••••" className="rounded-xl text-sm" />
                    </div>
                  </div>
                  <Button onClick={handleChangePassword} disabled={isChangingPassword} className="rounded-xl">
                    {isChangingPassword ? 'Atualizando...' : 'Atualizar senha'}
                  </Button>

                  <div className="pt-4 border-t border-destructive/20">
                    <h3 className="font-bold text-sm text-destructive mb-3">Zona de Perigo</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="rounded-xl" disabled={isDeletingAccount}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir Conta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os seus dados serão removidos.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-white">
                            {isDeletingAccount ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {/* ─ NOTIFICAÇÕES ─ */}
              {settingsTab === 'notificacoes' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
                  <h3 className="font-bold text-sm mb-1">Notificações</h3>
                  <p className="text-xs text-muted-foreground mb-4">Escolha sobre o que ser notificado — no sino e no dispositivo.</p>
                  <NotifRow label="Novas séries" desc="Quando uma nova série é adicionada ao site." value={notifNewSeries} onChange={setNotifNewSeries} />
                  <NotifRow label="Novos capítulos" desc="Das séries que você favoritou." value={notifNewChapters} onChange={setNotifNewChapters} />
                  <NotifRow label="Respostas aos meus comentários" desc="Quando alguém responde você." value={notifReplies} onChange={setNotifReplies} />
                  <NotifRow label="Anúncios" desc="Novidades e ofertas do site." value={notifAnnouncements} onChange={setNotifAnnouncements} />
                  <NotifRow label="Push para este dispositivo" desc="Receba alertas no celular/PC mesmo com a Wolftoon fechada." value={notifPush} onChange={setNotifPush} />
                  <Button className="rounded-xl mt-4" onClick={() => toast({ title: '✅ Notificações salvas' })}>Salvar</Button>
                </div>
              )}

              {/* ─ LEITURA ─ */}
              {settingsTab === 'leitura' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div>
                    <h3 className="font-bold text-sm mb-0.5">Preferências de leitura</h3>
                    <p className="text-xs text-muted-foreground">Salvas na sua conta para que o leitor fique igual em todos os dispositivos.</p>
                  </div>
                  {[
                    { label: 'Tema', opts: [{ v: 'night', l: 'Noturno' }, { v: 'onyx', l: 'Onyx' }, { v: 'sepia', l: 'Sépia' }, { v: 'light', l: 'Claro' }], val: readTheme, set: setReadTheme },
                    { label: 'Modo de leitura', opts: [{ v: 'webtoon', l: 'Webtoon' }, { v: 'paged', l: 'Paginado' }], val: readMode, set: setReadMode },
                    { label: 'Ajuste da imagem', opts: [{ v: 'fit', l: 'Ajustar largura' }, { v: 'original', l: 'Original' }], val: readFit, set: setReadFit },
                    { label: 'Espaço entre páginas (webtoon)', opts: [{ v: 'none', l: 'Nenhum' }, { v: 'small', l: 'Pequeno' }, { v: 'large', l: 'Grande' }], val: readGap, set: setReadGap },
                  ].map(row => (
                    <div key={row.label} className="space-y-2">
                      <Label className="text-xs font-semibold">{row.label}</Label>
                      <div className="flex gap-2 flex-wrap">
                        {row.opts.map(o => (
                          <button key={o.v} onClick={() => (row.set as any)(o.v)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${(row.val as string) === o.v ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40'}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button className="rounded-xl" onClick={() => toast({ title: '✅ Preferências salvas' })}>Salvar preferências</Button>
                </div>
              )}

              {/* ─ APARÊNCIA ─ */}
              {settingsTab === 'aparencia' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-sm mb-0.5">Aparência do site</h3>
                    <p className="text-xs text-muted-foreground">Altera o tema da Wolftoon em todo o site. Aplicado instantaneamente e salvo neste navegador.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tema</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: 'night', l: 'Noturno' }, { v: 'onyx', l: 'Onyx' }, { v: 'sepia', l: 'Sépia' }, { v: 'light', l: 'Claro' }].map(o => (
                        <button key={o.v} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40 transition-all">
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">O leitor tem seu próprio tema separado em Leitura.</p>
                </div>
              )}

              {/* ─ PERSONALIZAR ─ */}
              {settingsTab === 'personalizar' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Palette className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Cor dos favoritos</h3>
                      <p className="text-xs text-muted-foreground">Escolha a cor de destaque dos seus cards de séries favoritadas.</p>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="rounded-xl border-2 p-3 flex items-center gap-3" style={{ borderColor: accentColor }}>
                    <div className="w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: accentColor }} />
                    <div>
                      <p className="text-sm font-bold">Pré-visualização do card</p>
                      <p className="text-xs text-muted-foreground">Este é o destaque que seus favoritos usarão.</p>
                    </div>
                  </div>
                  {/* Preset colors */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Cores predefinidas</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setAccentColor(c)}
                          className="w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center"
                          style={{ backgroundColor: c, borderColor: accentColor === c ? 'white' : 'transparent' }}>
                          {accentColor === c && <span className="text-white text-sm">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button className="rounded-xl" onClick={() => toast({ title: '✅ Cor salva' })}>Salvar</Button>
                </div>
              )}

              {/* ─ BLOQUEADOS ─ */}
              {settingsTab === 'bloqueados' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Ban className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Usuários bloqueados</h3>
                      <p className="text-xs text-muted-foreground">Você não verá comentários de ninguém que bloquear.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-muted/10 p-6 text-center">
                    <p className="text-sm text-muted-foreground">Você não bloqueou ninguém.</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;
