// src/lib/antiScrape.ts
// Utilitários client-side do sistema anti-extensão do Wolftoon.
//
// Responsabilidades:
//  1. Gerar um fingerprint estável do dispositivo/browser
//  2. Solicitar e cachear tokens de imagem assinados
//  3. Construir URLs de imagem que passam pelo proxy (nunca a URL real)
//  4. Detectar comportamento suspeito de bots no client

import { supabase } from '@/integrations/supabase/client';

// ─── Fingerprint ──────────────────────────────────────────────────────────────

/**
 * Gera um fingerprint leve do browser usando características estáveis.
 * Não usa bibliotecas externas, sem canvas fingerprint (pesado demais).
 * Resultado: hash SHA-256 de ~16 fatores combinados.
 */
export async function generateFingerprint(): Promise<string> {
  const factors = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ''),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
    navigator.platform ?? '',
    // WebGL renderer (se disponível) — forte indicador de device único
    getWebGLRenderer(),
  ].join('|');

  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(factors));
  const hex  = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 32); // 32 hex chars são suficientes
}

function getWebGLRenderer(): string {
  try {
    const canvas  = document.createElement('canvas');
    const gl      = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '';
  } catch {
    return '';
  }
}

// ─── Fingerprint cache ────────────────────────────────────────────────────────

let _fp: string | null = null;

export async function getFingerprint(): Promise<string> {
  if (_fp) return _fp;
  // Tentar cache da sessão para não recalcular a cada render
  const cached = sessionStorage.getItem('wt_fp');
  if (cached) { _fp = cached; return cached; }

  _fp = await generateFingerprint();
  sessionStorage.setItem('wt_fp', _fp);
  return _fp;
}

// ─── Image Token ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

// Cache em memória: chapterId → token
const tokenCache = new Map<string, TokenCache>();

/**
 * Obtém um token de imagem válido para o capítulo.
 * Reutiliza cache se ainda válido (com 60s de margem).
 */
export async function getImageToken(chapterId: string): Promise<string | null> {
  const now = Date.now();
  const cached = tokenCache.get(chapterId);
  if (cached && cached.expiresAt - 60_000 > now) return cached.token;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null; // Usuário não autenticado

    const fingerprint = await getFingerprint();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-image-token`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chapterId, fingerprint }),
      },
    );

    if (!res.ok) return null;

    const { token, ttl } = await res.json();
    tokenCache.set(chapterId, {
      token,
      expiresAt: now + ttl * 1000,
    });
    return token;
  } catch {
    return null;
  }
}

/**
 * Constrói a URL de uma imagem de capítulo que passa pelo proxy.
 * O índice (0-based) é o único parâmetro exposto — a URL real fica no servidor.
 */
export function buildProxiedImageUrl(
  chapterId: string,
  imageIndex: number,
): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anti-scrape/chapter-image/${imageIndex}?cid=${chapterId}`;
}

// ─── Fetch autenticado para imagens ──────────────────────────────────────────

/**
 * Busca uma imagem de capítulo passando os headers de autenticação.
 * Retorna uma object URL local (blob:) para uso em <img src>.
 * Mantém cache em memória para evitar requests duplicados.
 */
const blobCache = new Map<string, string>();

export async function fetchProtectedImage(
  chapterId: string,
  imageIndex: number,
): Promise<string | null> {
  const cacheKey = `${chapterId}:${imageIndex}`;
  if (blobCache.has(cacheKey)) return blobCache.get(cacheKey)!;

  try {
    const token       = await getImageToken(chapterId);
    const fingerprint = await getFingerprint();
    if (!token) return null;

    const url = buildProxiedImageUrl(chapterId, imageIndex);
    const res = await fetch(url, {
      headers: {
        'X-Image-Token':  token,
        'X-Fingerprint': fingerprint,
      },
    });

    if (!res.ok) return null;

    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobCache.set(cacheKey, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}

/** Libera as object URLs do cache (chamar ao desmontar o reader) */
export function releaseImageCache() {
  for (const url of blobCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobCache.clear();
}

// ─── Bot detection (client) ───────────────────────────────────────────────────

export interface BotSignals {
  /** Nenhum movimento de mouse detectado após N segundos */
  noMouseMovement: boolean;
  /** navigator.webdriver = true (Selenium, Playwright, etc.) */
  webdriver: boolean;
  /** Propriedades de automação no window */
  automationProps: boolean;
  /** Tempo até primeiro evento de input absurdamente curto */
  suspiciousInputSpeed: boolean;
}

/**
 * Detecta sinais de bot/headless browser.
 * Não é infalível — serve como sinal adicional, não como única barreira.
 */
export function detectBotSignals(): BotSignals {
  const automationProps = [
    '__webdriver_evaluate',
    '__selenium_evaluate',
    '__fxdriver_evaluate',
    '__driver_unwrapped',
    '__webdriver_unwrapped',
    '__driver_evaluate',
    '__selenium_unwrapped',
    '__fxdriver_unwrapped',
    '_phantom',
    '__nightmare',
    'callPhantom',
    '_Selenium_IDE_Recorder',
  ].some((prop) => prop in window);

  return {
    noMouseMovement:      false, // atualizado pelo hook useAntiScrape
    webdriver:            !!navigator.webdriver,
    automationProps,
    suspiciousInputSpeed: false, // atualizado pelo hook
  };
}
