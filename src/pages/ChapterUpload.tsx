import { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTitleOptions } from '@/hooks/useTitleOptions';
import { useCreateChapter } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, X, GripVertical, Image as ImageIcon, ArrowLeft, Layers,
  FolderOpen, FileText, FileUp, Maximize2, Search, Crown, Loader2,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { uploadImagesToChapterBucket } from '@/lib/chapterUpload';
import mammoth from 'mammoth';
import RichTextEditor from '@/components/RichTextEditor';
import { toLocalDatetimeInput, localDatetimeToIso, parseLocalDatetimeInput } from '@/lib/datetime';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContentType = 'images' | 'novel';

interface FormData {
  title_id: string;
  chapter_number: number | '';
  chapter_title: string;
  images: string[];
  content: string;
  content_type: ContentType;
  is_vip: boolean;
  vip_unlock_at: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const ChapterUpload = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { titleId: urlTitleId } = useParams();
  const { toast } = useToast();
  const { data: titles } = useTitleOptions();
  const createChapter = useCreateChapter();

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  const preselectedTitleId = urlTitleId || searchParams.get('titleId') || '';
  const hasTitleFromUrl = !!urlTitleId;

  const [form, setForm] = useState<FormData>({
    title_id: preselectedTitleId,
    chapter_number: '',
    chapter_title: '',
    images: [],
    content: '',
    content_type: 'images',
    is_vip: false,
    vip_unlock_at: '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isImportingText, setIsImportingText] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [titleSearch, setTitleSearch] = useState('');

  // ── Auth guards ──────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-destructive/10 mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você precisa ser administrador para acessar esta página.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const patch = (updates: Partial<FormData>) => setForm(prev => ({ ...prev, ...updates }));

  // ── Image processing ─────────────────────────────────────────────────────────

  const processImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f.name));

    if (imageFiles.length === 0) {
      toast({ title: 'Nenhuma imagem encontrada', description: 'Use JPG, PNG, WEBP, GIF ou AVIF.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await uploadImagesToChapterBucket(imageFiles, {
        batchSize: 6,
        onProgress: setUploadProgress,
      });

      const urls = uploaded
        .sort((a, b) => a.order - b.order || a.sourceName.localeCompare(b.sourceName))
        .map(item => item.url);

      patch({ images: [...form.images, ...urls] });

      toast({ title: `${urls.length} imagem(ns) adicionada(s)` });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processImageFiles(files);
  }, [form.images]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    await processImageFiles(files);
    e.target.value = '';
  };

  // ── Text import ──────────────────────────────────────────────────────────────

  const handleTextFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingText(true);
    try {
      const name = file.name.toLowerCase();
      let text = '';
      if (name.endsWith('.txt')) {
        text = await file.text();
      } else if (name.endsWith('.docx')) {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = result.value;
      } else {
        toast({ title: 'Formato não suportado', description: 'Use .txt ou .docx.', variant: 'destructive' });
        return;
      }
      patch({ content: text, content_type: 'novel' });
      toast({ title: 'Arquivo importado', description: file.name });
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' });
    } finally {
      setIsImportingText(false);
      e.target.value = '';
    }
  };

  // ── Image drag-to-reorder ────────────────────────────────────────────────────

  const handleImageDragStart = (index: number) => setDraggedIndex(index);

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const imgs = [...form.images];
    const [item] = imgs.splice(draggedIndex, 1);
    imgs.splice(index, 0, item);
    patch({ images: imgs });
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => setDraggedIndex(null);

  const removeImage = (index: number) =>
    patch({ images: form.images.filter((_, i) => i !== index) });

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title_id) {
      toast({ title: 'Selecione um título', variant: 'destructive' });
      return;
    }
    if (form.chapter_number === '' || isNaN(Number(form.chapter_number))) {
      toast({ title: 'Informe o número do capítulo', variant: 'destructive' });
      return;
    }
    if (form.content_type === 'images' && form.images.length === 0) {
      toast({ title: 'Adicione pelo menos uma imagem', variant: 'destructive' });
      return;
    }
    if (form.content_type === 'novel' && !form.content.trim()) {
      toast({ title: 'Adicione o texto do capítulo', variant: 'destructive' });
      return;
    }
    if (form.is_vip && form.vip_unlock_at) {
      const d = parseLocalDatetimeInput(form.vip_unlock_at);
      if (!d || d.getTime() <= Date.now()) {
        toast({
          title: 'Data de desbloqueio inválida',
          description: 'Deve ser uma data futura, ou deixe vazio para VIP permanente.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      await createChapter.mutateAsync({
        title_id: form.title_id,
        chapter_number: Number(form.chapter_number),
        chapter_title: form.chapter_title,
        images: form.content_type === 'images' ? form.images : [],
        content: form.content_type === 'novel' ? form.content : null,
        content_type: form.content_type,
        is_vip: form.is_vip,
        vip_unlock_at: form.is_vip && form.vip_unlock_at ? localDatetimeToIso(form.vip_unlock_at) : null,
      } as any);

      toast({
        title: 'Capítulo publicado!',
        description: form.is_vip && form.vip_unlock_at
          ? `Desbloqueio em ${parseLocalDatetimeInput(form.vip_unlock_at)?.toLocaleString('pt-BR')}.`
          : `Capítulo ${form.chapter_number} adicionado.`,
      });
      navigate(-1);
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedTitle = titles?.find(t => t.id === form.title_id);
  const filteredTitles = (titles || []).filter(t =>
    !titleSearch.trim() || t.title.toLowerCase().includes(titleSearch.toLowerCase())
  );
  const canSubmit = !createChapter.isPending && !isUploading;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-28">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight">Novo Capítulo</h1>
              {selectedTitle && (
                <p className="text-xs text-muted-foreground truncate">→ {selectedTitle.title}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

            {/* ── Left panel: metadata ── */}
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-4">

                  {/* Title selector */}
                  {!hasTitleFromUrl && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Título *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          value={titleSearch}
                          onChange={e => setTitleSearch(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                      <Select value={form.title_id} onValueChange={v => patch({ title_id: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecionar título" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTitles.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Selected title mini card */}
                  {selectedTitle && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-muted/30 rounded-lg border border-border/30">
                      <div className="w-10 shrink-0 aspect-[3/4] rounded overflow-hidden">
                        <img src={selectedTitle.cover} alt={selectedTitle.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate leading-tight">{selectedTitle.title}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedTitle.status}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 shrink-0">{selectedTitle.type}</Badge>
                    </div>
                  )}

                  {/* Chapter number */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Número *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.chapter_number}
                      onChange={e => patch({ chapter_number: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      placeholder="Ex: 1, 1.5, 10"
                      className="h-9 font-mono"
                    />
                  </div>

                  {/* Chapter title */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Título <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      value={form.chapter_title}
                      onChange={e => patch({ chapter_title: e.target.value })}
                      placeholder="O Início da Aventura"
                      className="h-9"
                    />
                  </div>

                  {/* VIP toggle */}
                  <div className={`rounded-lg border p-3 transition-colors ${form.is_vip ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/40'}`}>
                    <button
                      type="button"
                      onClick={() => patch({ is_vip: !form.is_vip })}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <Crown className={`h-4 w-4 shrink-0 transition-colors ${form.is_vip ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
                      <span className={`text-sm font-medium transition-colors ${form.is_vip ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        Capítulo VIP
                      </span>
                      <div className={`ml-auto w-8 h-4 rounded-full transition-colors relative ${form.is_vip ? 'bg-amber-500' : 'bg-muted-foreground/20'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${form.is_vip ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </button>

                    {form.is_vip && (
                      <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Desbloqueio automático
                          <span className="block opacity-60 font-normal">Vazio = VIP permanente</span>
                        </Label>
                        <div className="flex gap-1.5">
                          <Input
                            type="datetime-local"
                            value={form.vip_unlock_at}
                            min={toLocalDatetimeInput()}
                            onChange={e => patch({ vip_unlock_at: e.target.value })}
                            className="h-8 text-xs flex-1"
                          />
                          {form.vip_unlock_at && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground"
                              onClick={() => patch({ vip_unlock_at: '' })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Right panel: content ── */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <Tabs
                  value={form.content_type}
                  onValueChange={v => patch({ content_type: v as ContentType })}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-5 h-9">
                    <TabsTrigger value="images" className="text-xs gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Imagens
                    </TabsTrigger>
                    <TabsTrigger value="novel" className="text-xs gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Novel
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Images tab ── */}
                  <TabsContent value="images" className="mt-0">

                    {/* Drop zone */}
                    <div
                      onDrop={handleFileDrop}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4
                        ${isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/20'}
                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                      `}
                    >
                      <input
                        type="file"
                        accept="image/*,.avif"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <input
                        type="file"
                        accept="image/*,.avif"
                        multiple
                        // @ts-ignore
                        webkitdirectory=""
                        onChange={handleFileInput}
                        className="hidden"
                        ref={folderInputRef}
                      />

                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="text-sm font-medium">Enviando... {uploadProgress}%</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-xl bg-muted/50">
                            <Upload className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Arraste imagens ou clique para selecionar</p>
                            <p className="text-xs text-muted-foreground mt-0.5">JPG · PNG · WEBP · GIF · AVIF</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Folder button */}
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={e => { e.stopPropagation(); folderInputRef.current?.click(); }}
                        disabled={isUploading}
                        className="text-xs h-8"
                      >
                        <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                        Selecionar pasta
                      </Button>
                      {form.images.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {form.images.length} página(s) adicionada(s)
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {isUploading && uploadProgress > 0 && (
                      <Progress value={uploadProgress} className="h-1.5 mb-4" />
                    )}

                    {/* Image grid */}
                    {form.images.length > 0 && (
                      <ScrollArea className="h-[420px]">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pr-1">
                          {form.images.map((url, index) => (
                            <div
                              key={index}
                              draggable
                              onDragStart={() => handleImageDragStart(index)}
                              onDragOver={e => handleImageDragOver(e, index)}
                              onDragEnd={handleImageDragEnd}
                              className={`
                                relative group aspect-[2/3] rounded-lg overflow-hidden border border-border/50
                                cursor-grab active:cursor-grabbing transition-opacity
                                ${draggedIndex === index ? 'opacity-40 scale-95' : ''}
                              `}
                            >
                              <img
                                src={url}
                                alt={`Página ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />

                              {/* Overlay on hover */}
                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <GripVertical className="h-4 w-4 text-white/70" />
                                <span className="text-white text-xs font-bold">{index + 1}</span>
                              </div>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>

                              {/* Page number pill */}
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                                {index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {form.images.length === 0 && !isUploading && (
                      <div className="text-center py-10 text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma imagem ainda</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Novel tab ── */}
                  <TabsContent value="novel" className="mt-0">

                    {/* File import zone */}
                    <div
                      className="border-2 border-dashed border-violet-500/30 rounded-xl p-5 text-center bg-violet-500/5 mb-4 cursor-pointer hover:border-violet-500/50 transition-colors"
                      onClick={() => textFileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept=".txt,.docx"
                        onChange={handleTextFileImport}
                        className="hidden"
                        ref={textFileInputRef}
                        disabled={isImportingText}
                      />
                      {isImportingText ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                          <p className="text-sm text-violet-500">Importando...</p>
                        </div>
                      ) : (
                        <>
                          <FileUp className="h-7 w-7 mx-auto mb-2 text-violet-500/60" />
                          <p className="text-sm font-medium">Importar arquivo de texto</p>
                          <p className="text-xs text-muted-foreground">.txt ou .docx</p>
                        </>
                      )}
                    </div>

                    {/* Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Conteúdo</Label>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {form.content.length.toLocaleString('pt-BR')} caracteres
                        </span>
                      </div>
                      <RichTextEditor
                        value={form.content}
                        onChange={value => patch({ content: value })}
                        placeholder="Cole ou escreva o texto do capítulo..."
                        rows={16}
                      />
                    </div>

                    {/* Preview */}
                    {form.content && (
                      <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border/30">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsFullscreenPreview(true)}
                            className="h-7 text-xs gap-1.5"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Tela cheia
                          </Button>
                        </div>
                        <NovelPreview content={form.content.slice(0, 600)} truncated={form.content.length > 600} />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* ── Fullscreen preview dialog ── */}
          <Dialog open={isFullscreenPreview} onOpenChange={setIsFullscreenPreview}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-violet-500" />
                  {form.chapter_title || `Capítulo ${form.chapter_number}`}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-2">
                <div className="py-2">
                  <NovelPreview content={form.content} />
                </div>
              </ScrollArea>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {form.content.length.toLocaleString('pt-BR')} caracteres
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsFullscreenPreview(false)}>
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </form>
      </div>

      {/* ── Sticky bottom submit bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/50 px-4 py-3 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {form.images.length > 0 && form.content_type === 'images' && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{form.images.length} imagem(ns) pronta(s)</span>
              </div>
            )}
            {form.is_vip && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Crown className="h-3.5 w-3.5" />
                <span>VIP{form.vip_unlock_at ? ' com desbloqueio agendado' : ' permanente'}</span>
              </div>
            )}
          </div>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0"
          >
            {createChapter.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publicando...</>
              : <><Upload className="h-4 w-4 mr-2" />Publicar capítulo</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Novel preview renderer ────────────────────────────────────────────────────

const NovelPreview = ({ content, truncated = false }: { content: string; truncated?: boolean }) => {
  const html = content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-medium mt-2 mb-1">$1</h3>')
    .replace(/^> (.*?)$/gm, '<blockquote class="border-l-2 border-violet-500 pl-3 py-1 my-2 italic text-muted-foreground">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="my-3 border-border" />')
    .replace(/\n/g, '<br />');

  return (
    <div
      className="text-sm leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: html + (truncated ? '<span class="text-muted-foreground">...</span>' : '') }}
    />
  );
};

export default ChapterUpload;
