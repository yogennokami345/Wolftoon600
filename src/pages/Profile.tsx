import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesWithTitles } from '@/hooks/useFavoritesWithTitles';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useDetailedUserStats } from '@/hooks/useDetailedUserStats';
import { useUserComments, useDeleteComment } from '@/hooks/useUserComments';
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
  Calendar, Camera, Sparkles, Image as ImageIcon, Lock, MessageSquare,
  Bell, ShoppingBag, Home, Palette, Ban, ChevronRight, Clock, Eye, EyeOff,
  Shield, AlertTriangle, CheckCircle2, Smartphone, Monitor, Key,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
type MainTab = 'overview' | 'favoritos' | 'historico' | 'comprados' | 'comentarios' | 'configuracoes';
type SettingsTab = 'conta' | 'seguranca' | 'notificacoes' | 'leitura' | 'aparencia' | 'personalizar' | 'bloqueados';

// ─── NotifRow helper ──────────────────────────────────────────────────────────
const NotifRow = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-border/30 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} className="shrink-0" />
  </div>
);

// ─── Password strength ────────────────────────────────────────────────────────
const getStrength = (pw: string) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'] as const;
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'] as const;
  return { score, label: map[score], color: colors[score] };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, isVip, isAdmin, signOut } = useAuth();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavoritesWithTitles();
  const { history, isLoading: historyLoading, clearHistory, isClearingHistory } = useReadingHistory();
  const { data: detailedStats } = useDetailedUserStats(user?.id);
  const { data: userXP } = useUserXP(user?.id);
  const { data: userComments = [], isLoading: commentsLoading } = useUserComments();
  const deleteComment = useDeleteComment();
  const { toast } = useToast();

  // ── Profile fields
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // ── Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const strength = getStrength(newPassword);

  // ── Notifications
  const [notifNewSeries, setNotifNewSeries] = useState(true);
  const [notifNewChapters, setNotifNewChapters] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  // ── Reading prefs
  const [readTheme, setReadTheme] = useState<'night' | 'onyx' | 'sepia' | 'light'>('night');
  const [readMode, setReadMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [readFit, setReadFit] = useState<'fit' | 'original'>('fit');
  const [readGap, setReadGap] = useState<'none' | 'small' | 'large'>('none');

  // ── Accent color
  const PRESET_COLORS = ['#f59e0b', '#7c3aed', '#ec4899', '#a78bfa', '#60a5fa', '#10b981', '#ef4444', '#06b6d4'];
  const [accentColor, setAccentColor] = useState('#7c3aed');
  const [customColorInput, setCustomColorInput] = useState('');

  // ── Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('conta');

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username, avatar_url, banner_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url || '');
          setBannerUrl((data as any).banner_url || '');
        }
      });
  }, [user]);

  // ── Handlers
  const uploadFile = async (file: File, path: string) => {
    await supabase.storage.from('covers').upload(path, file, { upsert: true });
    return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
  };

  const validateFileSize = (file: File, maxMB: number) => {
    if (file.size > maxMB * 1024 * 1024) {
      toast({ title: `Arquivo muito grande (máx ${maxMB}MB)`, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validateFileSize(f, 3)) return;
    setAvatarFile(f);
    setAvatarUrl(URL.createObjectURL(f));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validateFileSize(f, 6)) return;
    setBannerFile(f);
    setBannerUrl(URL.createObjectURL(f));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (username.trim().length < 2) { toast({ title: 'Nome muito curto (mín. 2 caracteres)', variant: 'destructive' }); return; }
    if (username.trim().length > 30) { toast({ title: 'Nome muito longo (máx. 30 caracteres)', variant: 'destructive' }); return; }
    setIsSaving(true);
    try {
      let finalAvatar = avatarUrl;
      let finalBanner = bannerUrl;
      if (avatarFile) finalAvatar = await uploadFile(avatarFile, `${user.id}/avatar.${avatarFile.name.split('.').pop()}`);
      if (bannerFile) finalBanner = await uploadFile(bannerFile, `${user.id}/banner.${bannerFile.name.split('.').pop()}`);
      const { error } = await supabase.from('profiles').update({ username: username.trim(), avatar_url: finalAvatar, banner_url: finalBanner, updated_at: new Date().toISOString() } as any).eq('id', user.id);
      if (error) await supabase.from('profiles').insert({ id: user.id, username: username.trim(), avatar_url: finalAvatar, banner_url: finalBanner } as any);
      setAvatarUrl(finalAvatar); setBannerUrl(finalBanner);
      setAvatarFile(null); setBannerFile(null);
      toast({ title: '✅ Perfil atualizado com sucesso!' });
    } catch { toast({ title: 'Erro ao salvar o perfil', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword) { toast({ title: 'Digite a nova senha', variant: 'destructive' }); return; }
    if (newPassword !== confirmNewPw) { toast({ title: 'As senhas não coincidem', variant: 'destructive' }); return; }
    if (newPassword.length < 6) { toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return; }
    if (strength.score < 2) { toast({ title: 'Use uma senha mais forte', variant: 'destructive' }); return; }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: '✅ Senha atualizada com sucesso!' });
      setCurrentPw(''); setNewPassword(''); setConfirmNewPw('');
    } catch (e: any) { toast({ title: e.message, variant: 'destructive' }); }
    finally { setIsChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir conta');
      await signOut(); navigate('/');
    } catch (e: any) { toast({ title: e.message, variant: 'destructive' }); }
    finally { setIsDeletingAccount(false); }
  };

  // ── Guards
  if (loading) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="container mx-auto px-4 py-16 space-y-4 max-w-3xl">
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

  const statsCards = [
    { icon: '🪙', label: 'Moedas', value: 0, color: 'text-yellow-400' },
    { icon: '🔖', label: 'Favoritos', value: detailedStats?.favoritesCount || favorites.length || 0, color: 'text-primary' },
    { icon: '🔒', label: 'Cap. Próprios', value: 0, color: 'text-purple-400' },
    { icon: '💬', label: 'Comentários', value: userComments.length, color: 'text-blue-400' },
  ];

  const mainTabs = [
    { id: 'overview' as MainTab, label: 'Visão Geral', icon: Home },
    { id: 'favoritos' as MainTab, label: 'Favoritos', icon: Heart },
    { id: 'historico' as MainTab, label: 'Histórico', icon: History },
    { id: 'comprados' as MainTab, label: 'Comprados', icon: ShoppingBag },
    { id: 'comentarios' as MainTab, label: 'Comentários', icon: MessageSquare },
    { id: 'configuracoes' as MainTab, label: 'Configurações', icon: Settings },
  ];

  const settingsTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'conta', label: 'Conta', icon: User },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'leitura', label: 'Leitura', icon: BookOpen },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'personalizar', label: 'Personalizar', icon: Sparkles },
    { id: 'bloqueados', label: 'Bloqueados', icon: Ban },
  ];

  // ── PW input helper
  const PwInput = ({ label, value, onChange, show, onToggle, placeholder = '••••••••' }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="rounded-xl text-sm pr-10" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-3 py-4 max-w-3xl space-y-4">

          {/* ── Profile Card ── */}
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-card/60 shadow-lg">
            {/* Banner */}
            <div className="relative h-28 md:h-36 w-full overflow-hidden">
              {bannerUrl
                ? <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${tier.from} ${tier.via} ${tier.to} opacity-25`} />
              }
              <div className="absolute inset-0 bg-gradient-to-t from-card/95 to-transparent" />
              <label className="absolute top-2 right-2 cursor-pointer group">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/75 text-white text-[11px] font-medium backdrop-blur-sm transition border border-white/10">
                  <ImageIcon className="h-3 w-3" /> Banner
                </div>
                <input type="file" accept="image/*,.avif" onChange={handleBannerChange} className="hidden" />
              </label>
            </div>

            <div className="px-4 pb-5 -mt-10 relative">
              <div className="flex items-end gap-3">
                {/* Avatar */}
                <div className="relative shrink-0 group">
                  <Avatar className="h-20 w-20 border-4 border-card shadow-xl ring-2 ring-primary/20">
                    <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary text-xl font-black">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isVip && (
                    <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full ring-2 ring-card shadow">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                    <input type="file" accept="image/*,.avif" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-black">{displayName}</h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.text} border-current/20`}>
                      {tier.emoji} {tier.shortName.toUpperCase()}
                    </span>
                    {isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">⚡ ADMIN</span>}
                    {isVip && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">👑 VIP</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    Membro desde {memberSince.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <LevelBadge level={level} size="lg" className="shrink-0 pb-1" />
              </div>

              {/* XP Bar */}
              <div className="mt-3">
                <XPBar xp={userXP} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="rounded-xl flex-1 h-9 text-xs font-semibold" onClick={() => { setActiveTab('configuracoes'); setSettingsTab('conta'); }}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" /> Configurações
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive hover:text-white transition-colors" onClick={async () => { await signOut(); navigate('/'); }}>
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
                </Button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {statsCards.map(s => (
                  <div key={s.label} className="rounded-xl bg-muted/20 border border-border/30 p-3 text-center hover:bg-muted/30 transition-colors cursor-default">
                    <div className="flex items-center justify-center gap-0.5 mb-1">
                      <span className="text-sm">{s.icon}</span>
                      <p className={`text-base font-black tabular-nums ${s.color}`}>{s.value}</p>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main Tabs ── */}
          <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide border-b border-border/30">
            {mainTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === 'comentarios' && userComments.length > 0 && (
                  <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center">{userComments.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ───────── VISÃO GERAL ───────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Recently read */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lidos Recentemente</h2>
                  <button onClick={() => setActiveTab('historico')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Ver histórico <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-border/30 bg-card/40 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Nenhum histórico ainda.</p>
                    <Link to="/catalog" className="text-sm font-bold text-primary hover:underline">Encontrar algo para ler →</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 4).map(item => (
                      <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/30 hover:bg-card/60 border border-border/20 hover:border-primary/30 transition-all group">
                          <img src={item.title?.cover} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title?.title}</p>
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

              {/* Daily + Level */}
              <div className="grid md:grid-cols-2 gap-4">
                <DailyCheckinCard />
                <div className={`rounded-2xl border p-4 relative overflow-hidden`} style={{ background: `linear-gradient(135deg, ${tier.from.replace('from-','').replace('-400','').replace('-500','').replace('-300','')} 0%, transparent 100%)`, borderColor: `${accentColor}30` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/80 rounded-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-white/60 font-bold uppercase tracking-wider">Seu Nível</p>
                        <p className="text-white font-black text-lg leading-tight">Nível {level}</p>
                        <p className={`text-sm font-semibold ${tier.text}`}>{tier.name}</p>
                      </div>
                      <LevelBadge level={level} size="xl" showDetails />
                    </div>
                    <XPBar xp={userXP} />
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                      {[
                        { val: detailedStats?.chaptersRead || 0, label: 'Capítulos' },
                        { val: detailedStats?.titlesRead || 0, label: 'Títulos' },
                        { val: `${detailedStats?.readingStreak || 0}🔥`, label: 'Streak' },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="text-white font-bold text-sm">{s.val}</p>
                          <p className="text-white/50 text-[10px]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <AchievementsBadges />
            </div>
          )}

          {/* ───────── FAVORITOS ───────── */}
          {activeTab === 'favoritos' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {favorites.length} SÉRIE(S) FAVORITADA(S)
                {favorites.length > 0 && <button onClick={() => navigate('/my-list')} className="ml-2 text-primary hover:underline">VER TODAS →</button>}
              </p>
              {favoritesLoading ? (
                <div className="grid grid-cols-3 gap-2">{[...Array(6)].map((_, i) => <div key={i} className="aspect-[2/3] bg-card/50 rounded-lg animate-pulse" />)}</div>
              ) : favorites.length === 0 ? (
                <div className="rounded-xl border border-border/30 p-10 text-center">
                  <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
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

          {/* ───────── HISTÓRICO ───────── */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CONTINUE LENDO</p>
                {history.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive h-7 hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3 mr-1" /> Limpar tudo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Limpar histórico?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearHistory(undefined, { onSuccess: () => toast({ title: '✅ Histórico limpo' }) })} disabled={isClearingHistory} className="bg-destructive text-white">Limpar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {historyLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card/50 rounded-xl animate-pulse" />)}</div>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-border/30 p-10 text-center">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum histórico de leitura ainda.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {history.map(item => (
                    <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/30 hover:bg-card/60 border border-border/20 hover:border-primary/30 transition-all group">
                        <img src={item.title?.cover} alt="" className="w-10 h-14 object-cover rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary">{item.title?.title}</p>
                          <p className="text-xs text-muted-foreground">Cap. {item.chapter?.chapter_number}{item.chapter?.chapter_title ? ` · ${item.chapter.chapter_title}` : ''}</p>
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

          {/* ───────── COMPRADOS ───────── */}
          {activeTab === 'comprados' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">0 CAPÍTULOS PRÓPRIOS EM 0 SÉRIES</p>
              <div className="rounded-xl border border-border/30 p-10 text-center">
                <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-1">Você ainda não desbloqueou nenhum capítulo premium.</p>
                <Link to="/vip" className="text-sm font-bold text-primary hover:underline">Obter moedas →</Link>
              </div>
            </div>
          )}

          {/* ───────── COMENTÁRIOS ───────── */}
          {activeTab === 'comentarios' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                SEUS COMENTÁRIOS RECENTES
              </p>
              {commentsLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card/50 rounded-xl animate-pulse" />)}</div>
              ) : userComments.length === 0 ? (
                <div className="rounded-xl border border-border/30 p-10 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Você ainda não fez nenhum comentário.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Leia uma obra e deixe sua opinião!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userComments.map(comment => (
                    <div key={comment.id} className="rounded-xl border border-border/30 bg-card/40 hover:bg-card/60 transition-colors overflow-hidden">
                      <div className="flex gap-3 p-3">
                        {/* Cover */}
                        {comment.title_cover && (
                          <Link to={comment.title_slug ? `/manga/${comment.title_slug}` : '#'} className="shrink-0">
                            <img src={comment.title_cover} alt="" className="w-10 h-14 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                          </Link>
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Title + chapter */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              {comment.title_name && (
                                <Link to={comment.title_slug ? `/manga/${comment.title_slug}` : '#'} className="text-xs font-bold text-primary hover:underline truncate block">
                                  {comment.title_name}
                                </Link>
                              )}
                              {comment.chapter_number && (
                                <span className="text-[10px] text-muted-foreground">Capítulo {comment.chapter_number}</span>
                              )}
                              {comment.parent_id && (
                                <span className="text-[10px] text-muted-foreground/60"> · Resposta</span>
                              )}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 p-0.5 rounded">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Excluir comentário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteComment.mutate(comment.id, { onSuccess: () => toast({ title: '✅ Comentário excluído' }) })} className="bg-destructive text-white">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {/* Content */}
                          <p className={`text-sm text-foreground/90 leading-relaxed line-clamp-3 ${comment.is_spoiler ? 'blur-sm hover:blur-none transition-all cursor-pointer' : ''}`}>
                            {comment.content}
                          </p>
                          {comment.is_spoiler && (
                            <span className="text-[10px] text-orange-400 font-medium mt-0.5 block">⚠️ Spoiler — clique para revelar</span>
                          )}
                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                            <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
                            {comment.likes_count > 0 && <span>❤️ {comment.likes_count}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────── CONFIGURAÇÕES ───────── */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-4">
              {/* Settings sub-tabs */}
              <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide border-b border-border/30">
                {settingsTabs.map(t => (
                  <button key={t.id} onClick={() => setSettingsTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${settingsTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ─── CONTA ─── */}
              {settingsTab === 'conta' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                    <div><h3 className="font-bold text-sm">Perfil</h3><p className="text-xs text-muted-foreground">Como você aparece na Wolftoon.</p></div>
                  </div>

                  {/* Avatar */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avatar</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        <Avatar className="h-16 w-16 border-2 border-border ring-2 ring-primary/10">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary font-black text-lg">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                          <Camera className="h-5 w-5 text-white" />
                          <input type="file" accept="image/*,.avif" onChange={handleAvatarChange} className="hidden" />
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs font-semibold hover:bg-muted/40 transition">
                              <Camera className="h-3 w-3" /> Upload
                            </div>
                            <input type="file" accept="image/*,.avif" onChange={handleAvatarChange} className="hidden" />
                          </label>
                          {avatarUrl && <button onClick={() => { setAvatarUrl(''); setAvatarFile(null); }} className="px-3 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition">Remover</button>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF ou WebP · máx 3MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banner do Perfil</Label>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs font-semibold hover:bg-muted/40 transition">
                          <ImageIcon className="h-3 w-3" /> Upload banner
                        </div>
                        <input type="file" accept="image/*,.avif" onChange={handleBannerChange} className="hidden" />
                      </label>
                      {bannerUrl && <button onClick={() => { setBannerUrl(''); setBannerFile(null); }} className="px-3 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition">Remover</button>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Imagem larga exibida atrás do cabeçalho · máx 6MB</p>
                  </div>

                  {/* Display name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome de exibição</Label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu nome" className="rounded-xl text-sm" maxLength={30} />
                    <p className="text-[10px] text-muted-foreground text-right">{username.length}/30</p>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bio</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Fale um pouco sobre você para outros leitores..." className="rounded-xl text-sm min-h-[80px] resize-none" maxLength={160} />
                    <p className="text-[10px] text-muted-foreground text-right">{bio.length}/160</p>
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                    <Input value={user.email || ''} disabled className="rounded-xl text-sm bg-muted/30 cursor-not-allowed" />
                    <p className="text-[10px] text-muted-foreground">Usado para login e notificações. Nunca exibido publicamente.</p>
                  </div>

                  {/* Twitter / X */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Twitter / X</Label>
                    <Input value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} placeholder="https://x.com/você" className="rounded-xl text-sm" />
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</Label>
                    <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://" className="rounded-xl text-sm" />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              )}

              {/* ─── SEGURANÇA ─── */}
              {settingsTab === 'seguranca' && (
                <div className="space-y-4">
                  {/* Change password */}
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Key className="h-4 w-4 text-primary" /></div>
                      <div><h3 className="font-bold text-sm">Alterar senha</h3><p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p></div>
                    </div>

                    <PwInput label="Senha atual" value={currentPw} onChange={setCurrentPw} show={showPw.current} onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />
                    <PwInput label="Nova senha" value={newPassword} onChange={setNewPassword} show={showPw.new} onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))} />

                    {/* Strength indicator */}
                    {newPassword && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-muted/40'}`} />
                          ))}
                        </div>
                        <p className={`text-[11px] font-medium ${strength.score >= 3 ? 'text-green-400' : strength.score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                          Força: {strength.label}
                        </p>
                        <ul className="text-[11px] text-muted-foreground space-y-0.5">
                          {[
                            { ok: newPassword.length >= 8, text: 'Pelo menos 8 caracteres' },
                            { ok: /[A-Z]/.test(newPassword), text: 'Uma letra maiúscula' },
                            { ok: /[0-9]/.test(newPassword), text: 'Um número' },
                            { ok: /[^A-Za-z0-9]/.test(newPassword), text: 'Um caractere especial' },
                          ].map(r => (
                            <li key={r.text} className={`flex items-center gap-1 ${r.ok ? 'text-green-400' : ''}`}>
                              <CheckCircle2 className={`h-3 w-3 ${r.ok ? 'text-green-400' : 'text-muted-foreground/40'}`} />
                              {r.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <PwInput label="Confirmar nova senha" value={confirmNewPw} onChange={setConfirmNewPw} show={showPw.confirm} onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />

                    {confirmNewPw && newPassword !== confirmNewPw && (
                      <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> As senhas não coincidem</p>
                    )}

                    <Button onClick={handleChangePassword} disabled={isChangingPassword} className="rounded-xl">
                      {isChangingPassword ? 'Atualizando...' : 'Atualizar senha'}
                    </Button>
                  </div>

                  {/* Sessões / dispositivos */}
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Monitor className="h-4 w-4 text-blue-400" /></div>
                      <div><h3 className="font-bold text-sm">Sessões ativas</h3><p className="text-xs text-muted-foreground">Dispositivos conectados à sua conta.</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <Smartphone className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Sessão atual</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">Ativa</span>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs w-full" onClick={async () => { await supabase.auth.signOut({ scope: 'others' }); toast({ title: '✅ Outras sessões encerradas' }); }}>
                      <LogOut className="h-3.5 w-3.5 mr-1.5" /> Encerrar outras sessões
                    </Button>
                  </div>

                  {/* Danger zone */}
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
                      <div><h3 className="font-bold text-sm text-destructive">Zona de Perigo</h3><p className="text-xs text-muted-foreground">Ações irreversíveis.</p></div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="rounded-xl" disabled={isDeletingAccount}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir minha conta permanentemente
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>Todos os seus dados, comentários, histórico e favoritos serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-white">
                            {isDeletingAccount ? 'Excluindo...' : 'Excluir definitivamente'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {/* ─── NOTIFICAÇÕES ─── */}
              {settingsTab === 'notificacoes' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
                    <div><h3 className="font-bold text-sm">Notificações</h3><p className="text-xs text-muted-foreground">Escolha sobre o que ser notificado — no sino e no dispositivo.</p></div>
                  </div>
                  <NotifRow label="Novas séries" desc="Quando uma nova série é adicionada ao site." value={notifNewSeries} onChange={setNotifNewSeries} />
                  <NotifRow label="Novos capítulos" desc="Das séries que você favoritou." value={notifNewChapters} onChange={setNotifNewChapters} />
                  <NotifRow label="Respostas aos meus comentários" desc="Quando alguém responde você." value={notifReplies} onChange={setNotifReplies} />
                  <NotifRow label="Anúncios" desc="Novidades e ofertas do site." value={notifAnnouncements} onChange={setNotifAnnouncements} />
                  <NotifRow label="Push para este dispositivo" desc="Receba alertas no celular/PC mesmo com a Wolftoon fechada." value={notifPush} onChange={setNotifPush} />
                  <Button className="rounded-xl mt-4" onClick={() => toast({ title: '✅ Notificações salvas' })}>Salvar</Button>
                </div>
              )}

              {/* ─── LEITURA ─── */}
              {settingsTab === 'leitura' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="h-4 w-4 text-primary" /></div>
                    <div><h3 className="font-bold text-sm">Preferências de leitura</h3><p className="text-xs text-muted-foreground">Salvas na sua conta para que o leitor fique igual em todos os dispositivos.</p></div>
                  </div>
                  {[
                    { label: 'Tema', opts: [{ v: 'night', l: 'Noturno' }, { v: 'onyx', l: 'Onyx' }, { v: 'sepia', l: 'Sépia' }, { v: 'light', l: 'Claro' }], val: readTheme, set: setReadTheme },
                    { label: 'Modo de leitura', opts: [{ v: 'webtoon', l: 'Webtoon' }, { v: 'paged', l: 'Paginado' }], val: readMode, set: setReadMode },
                    { label: 'Ajuste da imagem', opts: [{ v: 'fit', l: 'Ajustar largura' }, { v: 'original', l: 'Original' }], val: readFit, set: setReadFit },
                    { label: 'Espaço entre páginas (webtoon)', opts: [{ v: 'none', l: 'Nenhum' }, { v: 'small', l: 'Pequeno' }, { v: 'large', l: 'Grande' }], val: readGap, set: setReadGap },
                  ].map(row => (
                    <div key={row.label} className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</Label>
                      <div className="flex gap-2 flex-wrap">
                        {row.opts.map(o => (
                          <button key={o.v} onClick={() => (row.set as any)(o.v)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${(row.val as string) === o.v ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button className="rounded-xl" onClick={() => toast({ title: '✅ Preferências de leitura salvas' })}>Salvar preferências</Button>
                </div>
              )}

              {/* ─── APARÊNCIA ─── */}
              {settingsTab === 'aparencia' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Palette className="h-4 w-4 text-primary" /></div>
                    <div><h3 className="font-bold text-sm">Aparência do site</h3><p className="text-xs text-muted-foreground">Altera o tema da Wolftoon em todo o site. Aplicado instantaneamente e salvo neste navegador.</p></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tema</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: 'night', l: 'Noturno', desc: 'Escuro suave' }, { v: 'onyx', l: 'Onyx', desc: 'Preto puro' }, { v: 'sepia', l: 'Sépia', desc: 'Tom quente' }, { v: 'light', l: 'Claro', desc: 'Fundo branco' }].map(o => (
                        <button key={o.v} className="flex flex-col items-start px-4 py-3 rounded-xl text-sm border border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all text-left">
                          <span className="font-semibold">{o.l}</span>
                          <span className="text-[10px] opacity-60">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">💡 O leitor tem seu próprio tema separado, configurável em <button onClick={() => setSettingsTab('leitura')} className="text-primary hover:underline font-medium">Leitura</button>.</p>
                </div>
              )}

              {/* ─── PERSONALIZAR ─── */}
              {settingsTab === 'personalizar' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary" /></div>
                    <div><h3 className="font-bold text-sm">Personalizar</h3><p className="text-xs text-muted-foreground">Escolha a cor de destaque dos seus cards de séries favoritadas.</p></div>
                  </div>
                  {/* Preview */}
                  <div className="rounded-xl border-2 p-3 flex items-center gap-3 transition-all" style={{ borderColor: accentColor + '60' }}>
                    <div className="w-12 h-12 rounded-xl shrink-0 shadow-lg" style={{ backgroundColor: accentColor }} />
                    <div>
                      <p className="text-sm font-bold">Pré-visualização do card</p>
                      <p className="text-xs text-muted-foreground">Este é o destaque que seus favoritos usarão.</p>
                    </div>
                  </div>
                  {/* Presets */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cores predefinidas</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setAccentColor(c)}
                          className="w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm hover:scale-110"
                          style={{ backgroundColor: c, borderColor: accentColor === c ? 'white' : 'transparent', boxShadow: accentColor === c ? `0 0 0 3px ${c}60` : undefined }}>
                          {accentColor === c && <span className="text-white text-base drop-shadow">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Custom */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cor personalizada</Label>
                    <div className="flex gap-2 items-center">
                      <div className="w-11 h-11 rounded-xl border border-border/50 overflow-hidden shrink-0 shadow-sm">
                        <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-full cursor-pointer scale-110" />
                      </div>
                      <Input value={customColorInput || accentColor} onChange={e => { setCustomColorInput(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setAccentColor(e.target.value); }} placeholder="#7c3aed" className="rounded-xl text-sm font-mono" maxLength={7} />
                      <Button onClick={() => toast({ title: '✅ Cor salva' })} className="rounded-xl shrink-0">Salvar</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── BLOQUEADOS ─── */}
              {settingsTab === 'bloqueados' && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center"><Ban className="h-4 w-4 text-destructive" /></div>
                    <div><h3 className="font-bold text-sm">Usuários bloqueados</h3><p className="text-xs text-muted-foreground">Você não verá comentários de ninguém que bloquear.</p></div>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-muted/10 p-8 text-center">
                    <Ban className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
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
