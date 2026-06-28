// Sistema anti-extensão / anti-scraping do Wolftoon — client-side.
//
// Camadas de proteção:
//  1. Fingerprint estável do dispositivo (SHA-256, 12+ fatores, WebGL, AudioContext)
//  2. Tokens de imagem assinados (HMAC-SHA256, TTL curto, vinculados ao fingerprint)
//  3. Blob URLs locais — URL real NUNCA chega ao DOM
//  4. Detecção de bots/automação (webdriver, props Selenium/Playwright, timing)
//  5. Honeypot de requests — registra fingerprints suspeitos no servidor
//  6. Rate-limiting client-side para burlar scrapers via volume
//  7. Poison pill: respostas falsas para clientes não-autenticados detectados
//  8. Nonce rotativo por sessão — tokens não são reutilizáveis entre sessões

import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// 1. FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coleta 12+ fatores de hardware/software para gerar fingerprint SHA-256.
 * Inclui WebGL renderer, AudioContext, e características de tela.
 */
export async function generateFingerprint(): Promise<string> {
  const factors = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') ?? '',
    String(navigator.hardwareConcurrency ?? ''),
    String(navigator.deviceMemory ?? ''),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(screen.pixelDepth ?? ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
    navigator.platform ?? '',
    String(window.devicePixelRatio ?? ''),
    getWebGLRenderer(),
    await getAudioFingerprint(),
    getFontFingerprint(),
  ].join('||wt||');

  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(factors));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'no-ext';
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '';
    const vendor   = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) ?? '';
    return `${vendor}::${renderer}`;
  } catch {
    return 'webgl-err';
  }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100, 44100);
    const osc = ctx.createOscillator();
    const cmp = ctx.createDynamicsCompressor();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    osc.connect(cmp);
    cmp.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0).slice(4500, 5000);
    const sum = data.reduce((a, b) => a + Math.abs(b), 0);
    return sum.toFixed(10);
  } catch {
    return 'no-audio';
  }
}

function getFontFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-ctx';
    const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
    const widths = fonts.map((f) => {
      ctx.font = `12px ${f}`;
      return ctx.measureText('WolfToon_Probe').width;
    });
    return widths.join('.');
  } catch {
    return 'font-err';
  }
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let _fp: string | null = null;
let _fpExpiry = 0;
const FP_TTL = 1000 * 60 * 30; // 30 min — regenera em sessões longas

export async function getFingerprint(): Promise<string> {
  const now = Date.now();
  if (_fp && now < _fpExpiry) return _fp;

  const cached = sessionStorage.getItem('wt_fp');
  const cachedExpiry = Number(sessionStorage.getItem('wt_fp_exp') ?? 0);
  if (cached && now < cachedExpiry) {
    _fp = cached;
    _fpExpiry = cachedExpiry;
    return cached;
  }

  _fp = await generateFingerprint();
  _fpExpiry = now + FP_TTL;
  sessionStorage.setItem('wt_fp', _fp);
  sessionStorage.setItem('wt_fp_exp', String(_fpExpiry));
  return _fp;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SESSION NONCE — rotativo por sessão, invalida tokens entre sessões
// ─────────────────────────────────────────────────────────────────────────────

function getSessionNonce(): string {
  const existing = sessionStorage.getItem('wt_nonce');
  if (existing) return existing;
  const nonce = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  sessionStorage.setItem('wt_nonce', nonce);
  return nonce;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. IMAGE TOKEN — assinado HMAC, curta duração, vinculado a fingerprint+nonce
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

export async function getImageToken(chapterId: string): Promise<string | null> {
  const now = Date.now();
  const cached = tokenCache.get(chapterId);
  // Margem de 90s — renova antes de expirar
  if (cached && cached.expiresAt - 90_000 > now) return cached.token;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const fingerprint = await getFingerprint();
    const nonce = getSessionNonce();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-image-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Wt-Nonce': nonce,
        },
        body: JSON.stringify({ chapterId, fingerprint, nonce }),
      },
    );

    if (!res.ok) return null;

    const { token, ttl } = await res.json();
    tokenCache.set(chapterId, { token, expiresAt: now + ttl * 1000 });
    return token;
  } catch {
    return null;
  }
}

/** Invalida o cache de token de um capítulo (ex.: ao trocar de capítulo) */
export function invalidateImageToken(chapterId: string) {
  tokenCache.delete(chapterId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROXY URL + FETCH AUTENTICADO (blob URL)
// ─────────────────────────────────────────────────────────────────────────────

export function buildProxiedImageUrl(chapterId: string, imageIndex: number): string {
  // Índice obfuscado — XOR com valor da sessão
  const obfIndex = imageIndex ^ (getSessionNonce().charCodeAt(0) % 64);
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anti-scrape/chapter-image/${obfIndex}?cid=${chapterId}`;
}

const blobCache = new Map<string, string>();
// Rate limit client-side: máx 60 imgs/minuto
const requestLog: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 60;

function isRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (requestLog.length && requestLog[0] < windowStart) requestLog.shift();
  return requestLog.length >= MAX_REQUESTS_PER_MINUTE;
}

export async function fetchProtectedImage(
  chapterId: string,
  imageIndex: number,
): Promise<string | null> {
  const cacheKey = `${chapterId}:${imageIndex}`;
  if (blobCache.has(cacheKey)) return blobCache.get(cacheKey)!;

  if (isRateLimited()) {
    console.warn('[WolfToon] Rate limit client-side atingido');
    return null;
  }

  try {
    const [token, fingerprint] = await Promise.all([getImageToken(chapterId), getFingerprint()]);
    if (!token) return null;

    const nonce = getSessionNonce();
    const url = buildProxiedImageUrl(chapterId, imageIndex);

    requestLog.push(Date.now());

    const res = await fetch(url, {
      headers: {
        'X-Image-Token': token,
        'X-Fingerprint': fingerprint,
        'X-Wt-Nonce': nonce,
        'X-Img-Index': String(imageIndex),
      },
    });

    if (!res.ok) return null;

    const blob = await res.blob();

    // Valida MIME — rejeita respostas malformadas/poison
    if (!blob.type.startsWith('image/')) {
      console.warn('[WolfToon] Resposta não é imagem:', blob.type);
      return null;
    }

    const blobUrl = URL.createObjectURL(blob);
    blobCache.set(cacheKey, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}

export function releaseImageCache() {
  for (const url of blobCache.values()) URL.revokeObjectURL(url);
  blobCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BOT / AUTOMAÇÃO DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface BotSignals {
  webdriver: boolean;
  automationProps: boolean;
  headlessChrome: boolean;
  missingPlugins: boolean;
  noMouseMovement: boolean;
  suspiciousInputSpeed: boolean;
  // Novos em v2
  fakeNotifications: boolean;
  phantomUserAgent: boolean;
  noTouchOnMobile: boolean;
}

const AUTOMATION_PROPS = [
  '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
  '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate',
  '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom',
  '__nightmare', 'callPhantom', '_Selenium_IDE_Recorder',
  '__puppeteer_evaluation_script__', 'domAutomation', 'domAutomationController',
  '_cdc_asdjflasutopfhvcZLmcfl_',
] as const;

export function detectBotSignals(): BotSignals {
  const ua = navigator.userAgent.toLowerCase();

  const automationProps = AUTOMATION_PROPS.some((p) => p in window);

  const headlessChrome = (
    ua.includes('headlesschrome') ||
    ua.includes('headless') ||
    /chrome\/(\d+)/.test(ua) && !(window as any).chrome
  );

  // Notificações sempre "granted" sem interação = headless
  const fakeNotifications =
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    !sessionStorage.getItem('wt_notif_granted');

  // PhantomJS / Nightmare user-agents
  const phantomUserAgent = ua.includes('phantom') || ua.includes('nightmare') || ua.includes('slimerjs');

  // Mobile sem suporte a touch = emulação
  const noTouchOnMobile = /android|iphone|ipad/i.test(ua) && !('ontouchstart' in window);

  const missingPlugins = navigator.plugins.length === 0 && !headlessChrome;

  return {
    webdriver: !!navigator.webdriver,
    automationProps,
    headlessChrome,
    missingPlugins,
    noMouseMovement: false,   // atualizado pelo hook useAntiScrape
    suspiciousInputSpeed: false,
    fakeNotifications,
    phantomUserAgent,
    noTouchOnMobile,
  };
}

/** Score de suspeita: quantos sinais ativos (0 = limpo, 3+ = bot provável) */
export function botScore(signals: BotSignals): number {
  return Object.values(signals).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HONEYPOT — reporta fingerprints suspeitos ao servidor
// ─────────────────────────────────────────────────────────────────────────────

let _reportedThisSession = false;

export async function reportSuspiciousClient(signals: BotSignals): Promise<void> {
  if (_reportedThisSession) return;
  if (botScore(signals) < 2) return; // Só reporta se 2+ sinais

  _reportedThisSession = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const fingerprint = await getFingerprint();

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anti-scrape/report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          fingerprint,
          signals,
          score: botScore(signals),
          timestamp: new Date().toISOString(),
          url: window.location.pathname,
        }),
      },
    );
  } catch {
    // Silently fail — não bloquear o cliente por erro de rede
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ANTI-EXTENSÃO — bloqueia padrões Mihon / Tachiyomi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Referências a headers injetados por extensões de manga reader.
 * O servidor (Edge Function) deve rejeitar requests com esses headers.
 * Este objeto é exportado para uso nos Edge Functions (via import compartilhado).
 */
export const BLOCKED_EXTENSION_PATTERNS = {
  // Headers comuns de extensões Mihon/Tachiyomi
  headers: [
    'x-requested-with',       // android WebView fingerprint
    'x-tachiyomi',
    'x-mihon',
    'x-keiyoushi',
    'user-agent-tachiyomi',
  ],
  // User-agents de scrapers conhecidos
  userAgents: [
    'tachiyomi',
    'mihon',
    'aniyomi',
    'neko',
    'komga',
    'kavita',
    'paperback',
    'aidoku',
    'suwatte',
    'yomi',
  ],
} as const;

/** Verifica se o UA atual corresponde a extensão conhecida */
export function isKnownExtension(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return BLOCKED_EXTENSION_PATTERNS.userAgents.some((ext) => ua.includes(ext));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. OBFUSCAÇÃO DE DOM — remove src real de imagens do DOM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Substitui o src de todas as <img> de capítulos por um placeholder
 * antes que scrapers de DOM possam capturar.
 * Chamar ao desmontar o Reader.
 */
export function clearChapterImagesFromDOM() {
  document
    .querySelectorAll<HTMLImageElement>('img[data-wt-protected]')
    .forEach((img) => {
      img.src = '';
      img.removeAttribute('data-wt-protected');
    });
}

/**
 * Adiciona atributo de rastreamento e remove do DOM após render
 * para evitar snapshots por extensões de browser.
 */
export function markProtectedImage(img: HTMLImageElement) {
  img.setAttribute('data-wt-protected', '1');
  // Previne salvar via context menu
  img.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
  // Previne drag (arrastar para salvar)
  img.addEventListener('dragstart', (e) => e.preventDefault(), { passive: false });
}
