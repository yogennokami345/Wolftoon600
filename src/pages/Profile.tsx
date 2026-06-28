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
import ProfileStats from '@/components/profile/ProfileStats';
import GenreChart from '@/components/profile/GenreChart';
import ActivityChart from '@/components/profile/ActivityChart';
import TypeDistribution from '@/components/profile/TypeDistribution';
import AchievementsBadges from '@/components/profile/AchievementsBadges';
import ReadingGoalsCard from '@/components/profile/ReadingGoalsCard';
import StatsComparison from '@/components/profile/StatsComparison';
import LevelBadge from '@/components/profile/LevelBadge';
import XPBar from '@/components/profile/XPBar';
import DailyCheckinCard from '@/components/profile/DailyCheckinCard';
import { useUserXP } from '@/hooks/useGamification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Heart, BookOpen, Settings, Crown, Save, History, Trash2, LogOut, Calendar, Clock, Key, BarChart3, Camera, Sparkles, ChevronDown, ChevronUp, Target, Trophy, PieChart, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, isVip, signOut } = useAuth();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavoritesWithTitles();
  const { progress, isLoading: progressLoading } = useReadingProgress();
  const { history, isLoading: historyLoading, clearHistory, isClearingHistory } = useReadingHistory();
  const { data: detailedStats, isLoading: statsLoading } = useDetailedUserStats(user?.id);
  const { data: userXP } = useUserXP(user?.id);
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
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
    loadProfile();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      let finalBannerUrl = bannerUrl;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('covers').upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(filePath);
        finalAvatarUrl = urlData.publicUrl;
      }
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const filePath = `${user.id}/banner.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('covers').upload(filePath, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(filePath);
        finalBannerUrl = urlData.publicUrl;
      }
      const { error: updateError } = await supabase.from('profiles').update({ username, avatar_url: finalAvatarUrl, banner_url: finalBannerUrl, updated_at: new Date().toISOString() } as any).eq('id', user.id);
      if (updateError) {
        const { error: insertError } = await supabase.from('profiles').insert({ id: user.id, username, avatar_url: finalAvatarUrl, banner_url: finalBannerUrl } as any);
        if (insertError) throw insertError;
      }
      setAvatarUrl(finalAvatarUrl);
      setBannerUrl(finalBannerUrl);
      setAvatarFile(null);
      setBannerFile(null);
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o perfil.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = () => {
    clearHistory(undefined, {
      onSuccess: () => toast({ title: 'Histórico limpo', description: 'Seu histórico de leitura foi removido.' }),
      onError: () => toast({ title: 'Erro', description: 'Não foi possível limpar o histórico.', variant: 'destructive' }),
    });
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir conta');
      toast({ title: 'Conta excluída', description: 'Sua conta foi excluída permanentemente.' });
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível excluir a conta.', variant: 'destructive' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) { toast({ title: 'Erro', description: 'Preencha todos os campos de senha.', variant: 'destructive' }); return; }
    if (newPassword !== confirmNewPassword) { toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' }); return; }
    if (newPassword.length < 6) { toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' }); return; }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      setNewPassword(''); setConfirmNewPassword('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível alterar a senha.', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-card rounded-2xl" />
            <div className="h-24 bg-card rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const memberSince = user.created_at ? new Date(user.created_at) : new Date();

  const navItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'progress', label: 'Continue Lendo', icon: BookOpen },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Profile Header with Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm">
          {/* Banner */}
          <div className="relative h-32 md:h-44 w-full overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-blue-500/20 to-amber-500/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute top-2 right-2">
              <label className="cursor-pointer">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 hover:bg-black/70 text-white text-[11px] font-medium backdrop-blur-sm transition">
                  <ImageIcon className="h-3 w-3" />
                  Trocar capa
                </div>
                <input type="file" accept="image/*,.avif" onChange={handleBannerChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="px-4 md:px-5 pb-5 -mt-12 md:-mt-14 relative">
            <div className="flex items-end gap-3 md:gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-card shadow-xl">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                {isVip && (
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full ring-2 ring-card">
                    <Crown className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>

              {/* Name & Level */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h1 className="text-xl md:text-2xl font-bold truncate">
                    {username || user.email?.split('@')[0]}
                  </h1>
                  {isVip && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-full text-[10px] font-bold">
                      <Sparkles className="h-2.5 w-2.5" /> VIP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Desde {memberSince.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Level Badge */}
              <div className="hidden sm:block shrink-0 pb-1">
                <LevelBadge level={userXP?.level ?? 1} size="md" />
              </div>
            </div>

            {/* XP Bar */}
            <div className="mt-4">
              <XPBar xp={userXP} />
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/30">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{detailedStats?.chaptersRead || 0}</p>
                <p className="text-[10px] text-muted-foreground">Capítulos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-400">{detailedStats?.titlesRead || 0}</p>
                <p className="text-[10px] text-muted-foreground">Títulos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{detailedStats?.favoritesCount || 0}</p>
                <p className="text-[10px] text-muted-foreground">Favoritos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-400">{detailedStats?.readingStreak || 0}</p>
                <p className="text-[10px] text-muted-foreground">Streak 🔥</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === item.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <ProfileStats stats={detailedStats} isLoading={statsLoading} />
            
            <div className="grid md:grid-cols-2 gap-4">
              <DailyCheckinCard />
              <ReadingGoalsCard />
            </div>

            <AchievementsBadges />

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/40 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400" />
                    Gêneros Favoritos
                  </CardTitle>
                  <CardDescription className="text-xs">Top 5 gêneros mais lidos</CardDescription>
                </CardHeader>
                <CardContent>
                  {(detailedStats?.favoriteGenres || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Leia mais para ver seus gêneros favoritos</p>
                  ) : (
                    <GenreChart genres={detailedStats?.favoriteGenres || []} />
                  )}
                </CardContent>
              </Card>
              <Card className="bg-card/40 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Atividade Mensal
                  </CardTitle>
                  <CardDescription className="text-xs">Capítulos lidos nos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityChart activity={detailedStats?.monthlyActivity || []} />
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {detailedStats?.typeDistribution && detailedStats.typeDistribution.length > 0 && (
                <Card className="bg-card/40 border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-400" />
                      Tipos de Obras
                    </CardTitle>
                    <CardDescription className="text-xs">Distribuição por tipo de conteúdo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TypeDistribution types={detailedStats.typeDistribution} />
                  </CardContent>
                </Card>
              )}
              <StatsComparison />
            </div>
          </div>
        )}

        {activeSection === 'progress' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Continue Lendo</h2>
            {progressLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card/50 rounded-xl animate-pulse" />)}
              </div>
            ) : progress.length === 0 ? (
              <Card className="bg-card/40 border-border/30">
                <CardContent className="py-10 text-center">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">Você ainda não começou a ler nada.</p>
                  <Button asChild size="sm"><Link to="/catalog">Explorar Catálogo</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {progress.map((item) => (
                  <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                    <Card className="bg-card/40 border-border/30 overflow-hidden hover:border-primary/40 transition-all group">
                      <div className="flex gap-3 p-3">
                        <img src={item.title?.cover} alt={item.title?.title} className="w-14 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{item.title?.title}</h3>
                          <p className="text-xs text-muted-foreground">Cap. {item.chapter?.chapter_number} • Pág. {item.page_number}</p>
                          {item.completed && (
                            <span className="inline-block mt-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">Concluído</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Histórico de Leitura</h2>
              {history.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 text-xs">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} disabled={isClearingHistory} className="bg-destructive text-destructive-foreground">
                        {isClearingHistory ? 'Limpando...' : 'Limpar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            
            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card/50 rounded-lg animate-pulse" />)}
              </div>
            ) : history.length === 0 ? (
              <Card className="bg-card/40 border-border/30">
                <CardContent className="py-10 text-center">
                  <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">Seu histórico está vazio.</p>
                  <Button asChild size="sm"><Link to="/catalog">Começar a Ler</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {history.map((item) => (
                  <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/30 hover:bg-card/60 transition-colors group">
                      <img src={item.title?.cover} alt={item.title?.title} className="w-10 h-14 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title?.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          Cap. {item.chapter?.chapter_number}
                          {item.chapter?.chapter_title && ` - ${item.chapter.chapter_title}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.read_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'favorites' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Meus Favoritos ({favorites.length})</h2>
            {favoritesLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] bg-card/50 rounded-lg animate-pulse" />)}
              </div>
            ) : favorites.length === 0 ? (
              <Card className="bg-card/40 border-border/30">
                <CardContent className="py-10 text-center">
                  <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">Você ainda não tem favoritos.</p>
                  <Button asChild size="sm"><Link to="/catalog">Explorar Catálogo</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {favorites.map((fav) => (
                  <MangaCard 
                    key={fav.id} 
                    id={fav.title_id}
                    title={fav.title?.title || ''}
                    cover={fav.title?.cover || ''}
                    type={(fav.title?.type as "Manhwa" | "Manhua" | "Mangá") || 'Manhwa'}
                    rating={fav.title?.rating || 0}
                    views={fav.title?.views || 0}
                    status={(fav.title?.status as "Completo" | "Em andamento") || 'Em andamento'}
                    genres={fav.title?.genres || []}
                    slug={fav.title?.slug}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="space-y-4">
            {/* Profile Settings */}
            <Card className="bg-card/40 border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Informações do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Camera className="h-5 w-5 text-white" />
                      <input type="file" accept="image/*,.avif" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="username" className="text-xs">Nome de usuário</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Seu nome de usuário" className="h-9 bg-background/50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={user.email || ''} disabled className="h-9 bg-muted/50" />
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving} size="sm">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>

            {/* Password */}
            <Card className="bg-card/40 border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" /> Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nova Senha</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-9 bg-background/50" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Confirmar</Label>
                    <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="••••••••" className="h-9 bg-background/50" />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={isChangingPassword} variant="secondary" size="sm">
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </CardContent>
            </Card>

            {/* VIP Banner */}
            {!isVip && (
              <Card className="bg-gradient-to-r from-primary/15 to-yellow-500/10 border-primary/20">
                <CardContent className="py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Torne-se VIP</h3>
                      <p className="text-xs text-muted-foreground">Acesso a benefícios exclusivos</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0">
                    <Link to="/vip">Ver</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Zona de Perigo
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSignOut} className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sair
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeletingAccount}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir Conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os seus dados serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount} className="bg-destructive text-destructive-foreground">
                        {isDeletingAccount ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default Profile;
