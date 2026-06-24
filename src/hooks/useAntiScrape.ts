// src/hooks/useAntiScrape.ts
// Hook que integra a proteção anti-scraping ao Reader.
// Gerencia tokens, detecta bots, e fornece o componente de imagem protegida.

import {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import {
  getImageToken, getFingerprint, fetchProtectedImage,
  releaseImageCache, detectBotSignals,
} from '@/lib/antiScrape';

// ─── useAntiScrape ────────────────────────────────────────────────────────────

interface UseAntiScrapeOptions {
  chapterId: string | undefined;
  /** Se true, solicita token imediatamente ao montar */
  eager?: boolean;
  /** Callback chamado se sinais fortes de bot forem detectados */
  onBotDetected?: () => void;
}

export function useAntiScrape({
  chapterId,
  eager = true,
  onBotDetected,
}: UseAntiScrapeOptions) {
  const [token,   setToken]   = useState<string | null>(null);
  const [ready,   setReady]   = useState(false);
  const [blocked, setBlocked] = useState(false);

  const mouseMovedRef     = useRef(false);
  const firstInputTimeRef = useRef<number | null>(null);
  const mountTimeRef      = useRef(Date.now());

  // ── Bot detection ──────────────────────────────────────────────────────────

  useEffect(() => {
    const signals = detectBotSignals();

    // Webdriver é sinal forte e imediato
    if (signals.webdriver || signals.automationProps) {
      setBlocked(true);
      onBotDetected?.();
      return;
    }

    // Monitorar movimento de mouse — bots geralmente não movem o mouse
    const onMove = () => { mouseMovedRef.current = true; };
    window.addEventListener('mousemove', onMove, { once: true, passive: true });

    // Monitorar velocidade de primeiro input
    const onInput = () => {
      const elapsed = Date.now() - mountTimeRef.current;
      firstInputTimeRef.current = elapsed;
      // Input em menos de 200ms após montagem = suspeito
      if (elapsed < 200) {
        setBlocked(true);
        onBotDetected?.();
      }
    };
    window.addEventListener('keydown', onInput, { once: true, passive: true });
    window.addEventListener('touchstart', onInput, { once: true, passive: true });

    // Verificar ausência de mouse após 10 segundos em desktop
    const mouseCheck = setTimeout(() => {
      if (!mouseMovedRef.current && window.innerWidth > 768) {
        // Não é bloqueio imediato — é só um sinal. Log interno.
        console.debug('[anti-scrape] no mouse movement detected');
      }
    }, 10_000);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onInput);
      window.removeEventListener('touchstart', onInput);
      clearTimeout(mouseCheck);
    };
  }, [onBotDetected]);

  // ── Token lifecycle ────────────────────────────────────────────────────────

  const refreshToken = useCallback(async () => {
    if (!chapterId || blocked) return;
    const t = await getImageToken(chapterId);
    setToken(t);
    setReady(true);
  }, [chapterId, blocked]);

  useEffect(() => {
    if (eager) refreshToken();
    return () => { releaseImageCache(); };
  }, [eager, refreshToken]);

  // Auto-refresh do token a cada 25 minutos (TTL é 30 min)
  useEffect(() => {
    if (!chapterId) return;
    const interval = setInterval(refreshToken, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, [chapterId, refreshToken]);

  // ── Image loader ───────────────────────────────────────────────────────────

  const loadImage = useCallback(async (index: number): Promise<string | null> => {
    if (!chapterId || blocked) return null;
    return fetchProtectedImage(chapterId, index);
  }, [chapterId, blocked]);

  return { token, ready, blocked, refreshToken, loadImage };
}

// ─── ProtectedImage ───────────────────────────────────────────────────────────
// Componente de imagem que carrega via proxy autenticado.
// Substitui <img src={rawUrl}> no Reader.

import { useState as useS } from 'react';

export interface ProtectedImageProps {
  chapterId: string;
  index: number;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Placeholder enquanto carrega */
  placeholder?: string;
}

export const ProtectedImage = memo(({
  chapterId, index, alt, className,
  loading = 'lazy', placeholder,
}: ProtectedImageProps) => {
  const [src,   setSrc]   = useS<string | null>(null);
  const [error, setError] = useS(false);
  const [loaded, setLoaded] = useS(false);

  useEffect(() => {
    let cancelled = false;
    // Lazy: adiar load para quando for visível via IntersectionObserver
    if (loading === 'lazy' && 'IntersectionObserver' in window) {
      const el = document.getElementById(`protected-img-${chapterId}-${index}`);
      if (el) {
        const obs = new IntersectionObserver(
          async ([entry]) => {
            if (!entry.isIntersecting) return;
            obs.disconnect();
            const url = await fetchProtectedImage(chapterId, index);
            if (!cancelled) setSrc(url);
          },
          { rootMargin: '400px' },
        );
        obs.observe(el);
        return () => { cancelled = true; obs.disconnect(); };
      }
    }

    // Eager or fallback
    fetchProtectedImage(chapterId, index).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [chapterId, index, loading]);

  if (error || (src === null && !loaded)) {
    return (
      <div
        id={`protected-img-${chapterId}-${index}`}
        className={`bg-card/40 animate-pulse ${className ?? ''}`}
        style={{ minHeight: 300 }}
        aria-label={alt}
        aria-busy={!error}
      />
    );
  }

  return (
    <img
      id={`protected-img-${chapterId}-${index}`}
      src={src ?? placeholder}
      alt={alt}
      className={className}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()} // dificulta salvar via right-click
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
});

ProtectedImage.displayName = 'ProtectedImage';

// ─── useEffect re-export (for the ProtectedImage component) ──────────────────
// (já importado do react acima via useS)
import { useEffect } from 'react';
