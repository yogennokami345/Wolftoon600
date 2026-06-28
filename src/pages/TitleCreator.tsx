import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCreateTitle, useTitle, useUpdateTitle } from '@/hooks/useTitles';
import { useChapters, useDeleteChapter, useUpdateChapterVip } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus, X, BookOpen, Sparkles, Image as ImageIcon, Eye, ArrowLeft, Edit, Link as LinkIcon, PenSquare, Trash2, Crown, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateSlug } from '@/lib/slugify';
import TagSelector from '@/components/admin/TagSelector';
import { COMIC_GENRE_OPTIONS, NOVEL_GENRE_OPTIONS, TITLE_STATUS_OPTIONS, type TitleStatus } from '@/lib/titleFormOptions';

const COMIC_TYPES = ['Manhwa', 'Manhua', 'Mangá', 'Webtoon', 'HQ', 'Doujinshi', 'One-shot'] as const;
const NOVEL_TYPES = ['Novel', 'Light Novel', 'Web Novel', 'Fanfic'] as const;
const ALL_TYPES = [...COMIC_TYPES, ...NOVEL_TYPES];

type ContentCategory = 'comic' | 'novel';

const TitleCreator = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: paramId } = useParams();
  const { toast } = useToast();
  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();

  const editId = paramId || searchParams.get('edit');
  const isEditMode = !!editId;
  const { data: existingTitle, isLoading: isLoadingTitle } = useTitle(editId || '');
  const { data: chapters, isLoading: isLoadingChapters } = useChapters(editId || '');
  const deleteChapter = useDeleteChapter();
  const updateChapterVip = useUpdateChapterVip();

  const [category, setCategory] = useState<ContentCategory>('comic');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [alternativeTitleInput, setAlternativeTitleInput] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; number: number } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    alternative_titles: [] as string[],
    cover: '',
    type: 'Manhwa' as string,
    rating: 0,
    status: 'Em andamento' as TitleStatus,
    genres: [] as string[],
    synopsis: '',
    author: '',
    artist: '',
    year: new Date().getFullYear(),
    views: 0,
    slug: null as string | null,
  });

  useEffect(() => {
    if (!isEditMode || !existingTitle) return;
    const isNovel = (NOVEL_TYPES as readonly string[]).includes(existingTitle.type);
    setCategory(isNovel ? 'novel' : 'comic');
    setFormData({
      title: existingTitle.title,
      alternative_titles: existingTitle.alternative_titles || [],
      cover: existingTitle.cover,
      type: existingTitle.type,
      rating: existingTitle.rating || 0,
      status: existingTitle.status,
      genres: existingTitle.genres || [],
      synopsis: existingTitle.synopsis || '',
      author: existingTitle.author,
      artist: existingTitle.artist || '',
      year: existingTitle.year,
      views: existingTitle.views || 0,
      slug: existingTitle.slug,
    });
  }, [isEditMode, existingTitle]);

  // When category changes and not editing, set default type
  useEffect(() => {
    if (isEditMode) return;
    setFormData(c => ({
      ...c,
      type: category === 'comic' ? 'Manhwa' : 'Novel',
      genres: [],
    }));
  }, [category, isEditMode]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-4 font-display text-3xl font-bold">Acesso Negado</h1>
          <p className="mb-6 text-muted-foreground">Você precisa ser administrador.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  const typeOptions = category === 'comic' ? COMIC_TYPES : NOVEL_TYPES;
  const genreOptions = category === 'comic' ? COMIC_GENRE_OPTIONS : NOVEL_GENRE_OPTIONS;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName);
      setFormData(c => ({ ...c, cover: publicUrl }));
      toast({ title: 'Capa enviada!' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const addAlternativeTitle = () => {
    const trimmed = alternativeTitleInput.trim();
    if (trimmed && !formData.alternative_titles.includes(trimmed)) {
      setFormData(c => ({ ...c, alternative_titles: [...c.alternative_titles, trimmed] }));
      setAlternativeTitleInput('');
    }
  };

  const removeAlternativeTitle = (title: string) => {
    setFormData(c => ({ ...c, alternative_titles: c.alternative_titles.filter(item => item !== title) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.cover || !formData.author || !formData.synopsis) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    try {
      const payload = { ...formData, artist: formData.artist || null };
      if (isEditMode && editId) {
        await updateTitle.mutateAsync({ id: editId, ...payload });
        toast({ title: 'Obra atualizada!' });
        if (existingTitle?.slug) navigate(`/manga/${existingTitle.slug}`);
        else navigate(-1);
      } else {
        const created: any = await createTitle.mutateAsync(payload);
        toast({ title: 'Obra criada!' });
        if (created?.slug) navigate(`/manga/${created.slug}`);
        else navigate('/');
      }
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const confirmDeleteChapter = (chapterId: string, chapterNumber: number) => {
    setChapterToDelete({ id: chapterId, number: chapterNumber });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDelete || !editId) return;
    try {
      await deleteChapter.mutateAsync({ id: chapterToDelete.id, titleId: editId });
      toast({ title: `Capítulo ${chapterToDelete.number} deletado!` });
    } catch (error: any) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteConfirmOpen(false);
      setChapterToDelete(null);
    }
  };

  const handleToggleVip = async (chapterId: string, currentVip: boolean) => {
    try {
      await updateChapterVip.mutateAsync({ chapterId, isVip: !currentVip });
      toast({ title: !currentVip ? 'Capítulo marcado como VIP' : 'VIP removido do capítulo' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const goBack = () => {
    if (isEditMode && existingTitle?.slug) {
      navigate(`/manga/${existingTitle.slug}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Premium header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 h-24 w-48 rounded-full bg-primary/5 blur-2xl" />
          </div>
          <div className="relative flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                {isEditMode ? <Edit className="h-6 w-6 text-primary-foreground" /> : <Sparkles className="h-6 w-6 text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                  {isEditMode ? 'Editor de Obra' : 'Criador de Obra'}
                </div>
                <h1 className="font-display text-xl md:text-2xl font-black truncate">
                  {isEditMode ? (existingTitle?.title || 'Editar Obra') : 'Criar Nova Obra'}
                </h1>
                <p className="text-muted-foreground text-xs">
                  {isEditMode ? 'Atualize os dados, capítulos e configurações VIP' : 'Adicione um novo título ao catálogo Wolftoon'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Selector - only for new titles */}
        {!isEditMode && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {([
                { value: 'comic', label: 'Comic / Manga', sublabel: 'Manhwa · Manhua · Mangá · Webtoon', icon: ImageIcon },
                { value: 'novel', label: 'Novel', sublabel: 'Light Novel · Web Novel · Fanfic', icon: FileText },
              ] as const).map(({ value, label, sublabel, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                    category === value
                      ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border/40 bg-card/60 hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${category === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-bold ${category === value ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{sublabel}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isEditMode && isLoadingTitle ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Carregando dados da obra...</CardContent></Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left column - Cover + Preview */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> Capa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {formData.cover ? (
                        <div className="group relative">
                          <img src={formData.cover} alt="Preview" className="aspect-[2/3] w-full rounded-lg border border-border object-cover" onError={e => { e.currentTarget.src = 'https://via.placeholder.com/200x300?text=Erro'; }} />
                          <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 h-8 w-8" onClick={() => setFormData(c => ({ ...c, cover: '' }))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label htmlFor="cover-upload" className="flex aspect-[2/3] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-accent/50">
                          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                          <span className="px-4 text-center text-sm text-muted-foreground">{isUploadingCover ? 'Enviando...' : 'Clique para enviar'}</span>
                          <Input type="file" accept="image/*,.avif" onChange={handleCoverUpload} className="hidden" id="cover-upload" disabled={isUploadingCover} />
                        </label>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Ou cole uma URL:</Label>
                        <Input value={formData.cover} onChange={e => setFormData(c => ({ ...c, cover: e.target.value }))} placeholder="https://..." className="h-9 text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-primary" /> Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="relative aspect-[2/3]">
                        {formData.cover ? <img src={formData.cover} alt="Preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-muted"><ImageIcon className="h-10 w-10 text-muted-foreground" /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                        <div className="absolute left-2 top-2 flex items-center gap-1.5">
                          {formData.rating > 0 && <Badge className="rounded-full text-xs">⭐ {formData.rating.toFixed(1)}</Badge>}
                          <Badge variant="secondary" className="rounded-full text-xs">{formData.status}</Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <Badge variant="secondary" className="mb-1.5 text-[10px]">{formData.type}</Badge>
                          <h3 className="text-sm font-bold text-foreground line-clamp-2">{formData.title || 'Título da Obra'}</h3>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Form */}
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Título *</Label>
                        <Input value={formData.title} onChange={e => { const v = e.target.value; setFormData(c => ({ ...c, title: v, slug: c.slug || generateSlug(v) || null })); }} placeholder="Nome da obra" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Slug (URL)</Label>
                        <div className="flex gap-2">
                          <Input value={formData.slug || ''} onChange={e => setFormData(c => ({ ...c, slug: e.target.value || null }))} placeholder="nome-da-obra" />
                          <Button type="button" variant="outline" size="icon" onClick={() => setFormData(c => ({ ...c, slug: generateSlug(c.title) }))}><LinkIcon className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-sm">Títulos Alternativos</Label>
                        <div className="flex gap-2">
                          <Input value={alternativeTitleInput} onChange={e => setAlternativeTitleInput(e.target.value)} placeholder="Ex: Solo Leveling, 나 혼자만 레벨업" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlternativeTitle(); }}} />
                          <Button type="button" variant="outline" onClick={addAlternativeTitle}><Plus className="h-4 w-4" /></Button>
                        </div>
                        {formData.alternative_titles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {formData.alternative_titles.map((alt, idx) => (
                              <Badge key={idx} variant="secondary" className="pr-1 text-xs">
                                {alt}
                                <button type="button" className="ml-1 hover:text-destructive" onClick={() => removeAlternativeTitle(alt)}><X className="h-3 w-3" /></button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Autor *</Label>
                        <Input value={formData.author} onChange={e => setFormData(c => ({ ...c, author: e.target.value }))} placeholder="Nome do autor" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Artista</Label>
                        <div className="relative">
                          <PenSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input value={formData.artist} onChange={e => setFormData(c => ({ ...c, artist: e.target.value }))} placeholder="Ilustrador" className="pl-10" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Tipo *</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData(c => ({ ...c, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Status *</Label>
                        <Select value={formData.status} onValueChange={(v: TitleStatus) => setFormData(c => ({ ...c, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TITLE_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Ano</Label>
                        <Input type="number" value={formData.year} onChange={e => setFormData(c => ({ ...c, year: parseInt(e.target.value) || new Date().getFullYear() }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Avaliação (0-10)</Label>
                        <Input type="number" step="0.1" min="0" max="10" value={formData.rating} onChange={e => setFormData(c => ({ ...c, rating: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Sinopse *</Label>
                      <Textarea value={formData.synopsis} onChange={e => setFormData(c => ({ ...c, synopsis: e.target.value }))} placeholder="Descreva a história..." rows={4} required />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tags e Gêneros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TagSelector label="Gêneros" description="Clique nas sugestões ou digite novas tags." placeholder="Ex: Regressão, Dungeon" options={genreOptions} value={formData.genres} onChange={genres => setFormData(c => ({ ...c, genres }))} />
                  </CardContent>
                </Card>

                {/* Chapter Management - Edit Mode Only */}
                {isEditMode && editId && (
                  <Card className="border-border/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Capítulos
                          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {chapters?.length || 0}
                          </span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs" onClick={() => navigate(`/upload/chapter/${editId}`)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Capítulo
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs" onClick={() => navigate(`/upload/bulk/${editId}`)}>
                            <Upload className="h-3.5 w-3.5 mr-1" /> Em Lote
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingChapters ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : chapters && chapters.length > 0 ? (
                        <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                          {/* Summary bar */}
                          <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Crown className="h-3 w-3 text-primary" />
                              <span className="font-medium text-primary">{chapters.filter(c => c.is_vip).length} VIP</span>
                            </div>
                            <div className="w-px h-3 bg-border" />
                            <div className="text-xs text-muted-foreground">
                              {chapters.filter(c => !c.is_vip).length} gratuitos
                            </div>
                          </div>
                          {chapters.map(ch => (
                            <div key={ch.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all group ${
                              ch.is_vip
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-border/40 hover:border-border'
                            }`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-bold tabular-nums text-muted-foreground w-14 shrink-0">
                                  Cap. {ch.chapter_number}
                                </span>
                                {ch.chapter_title && (
                                  <span className="text-xs text-muted-foreground truncate">{ch.chapter_title}</span>
                                )}
                                {ch.is_vip && (
                                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] shrink-0">
                                    <Crown className="h-2.5 w-2.5 mr-0.5" />VIP
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 w-7 p-0 ${ch.is_vip ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                  onClick={() => handleToggleVip(ch.id, !!ch.is_vip)}
                                  title={ch.is_vip ? 'Remover VIP' : 'Marcar como VIP'}
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => confirmDeleteChapter(ch.id, ch.chapter_number)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">Nenhum capítulo adicionado ainda.</p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 rounded-lg"
                            onClick={() => navigate(`/upload/chapter/${editId}`)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Capítulo
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Separator />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={goBack}>Cancelar</Button>
                  <Button
                    type="submit"
                    className="rounded-xl px-6 font-bold"
                    disabled={createTitle.isPending || updateTitle.isPending}
                  >
                    {createTitle.isPending || updateTitle.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                    ) : isEditMode ? (
                      <><Edit className="h-4 w-4 mr-2" /> Salvar Alterações</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Criar Obra</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete Chapter Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Deletar Capítulo {chapterToDelete?.number}
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todas as imagens do capítulo serão removidas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteChapter} disabled={deleteChapter.isPending}>
              {deleteChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TitleCreator;
