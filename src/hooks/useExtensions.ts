// ─────────────────────────────────────────────────────────────────────────────
// useExtensions.ts
// Hook that manages the full extension lifecycle (Mihon-style)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExtensionManifest, InstalledExtension, ExtensionModule, RepoEntry,
  ExtensionRepo, STORAGE, DEFAULT_REPOS, loadExtensionFromScript, isNewerVersion,
} from './extensionTypes';
import { toast } from 'sonner';

// ─── State persistence helpers ────────────────────────────────────────────────

function readInstalled(): InstalledExtension[] {
  try { return JSON.parse(localStorage.getItem(STORAGE.INSTALLED) ?? '[]'); }
  catch { return []; }
}
function saveInstalled(list: InstalledExtension[]) {
  localStorage.setItem(STORAGE.INSTALLED, JSON.stringify(list));
}

function readRepos(): RepoEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE.REPOS) ?? 'null');
    return stored ?? DEFAULT_REPOS;
  } catch { return DEFAULT_REPOS; }
}
function saveRepos(repos: RepoEntry[]) {
  localStorage.setItem(STORAGE.REPOS, JSON.stringify(repos));
}

// ─── Runtime module cache (in-memory only, not persisted) ────────────────────

const moduleCache = new Map<string, ExtensionModule>();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseExtensionsReturn {
  // State
  installed:        InstalledExtension[];
  available:        ExtensionManifest[];   // from repos, not installed
  repos:            RepoEntry[];
  isLoadingRepos:   boolean;
  loadingIds:       Set<string>;           // ids currently being installed/updated

  // Actions
  fetchRepos:       () => Promise<void>;
  installExtension: (manifest: ExtensionManifest) => Promise<void>;
  removeExtension:  (id: string) => void;
  updateExtension:  (id: string) => Promise<void>;
  updateAll:        () => Promise<void>;
  addRepo:          (url: string, label: string) => Promise<void>;
  removeRepo:       (url: string) => void;

  // Runtime
  getModule:        (id: string) => ExtensionModule | null;
}

export function useExtensions(): UseExtensionsReturn {
  const [installed,      setInstalled]      = useState<InstalledExtension[]>(readInstalled);
  const [repoManifests,  setRepoManifests]  = useState<ExtensionManifest[]>([]);
  const [repos,          setRepos]          = useState<RepoEntry[]>(readRepos);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [loadingIds,     setLoadingIds]     = useState<Set<string>>(new Set());

  // ── Repo fetching ──────────────────────────────────────────────────────────

  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    const results: ExtensionManifest[] = [];

    await Promise.allSettled(
      repos.map(async (repo) => {
        try {
          const res = await fetch(repo.url, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: ExtensionRepo = await res.json();
          if (!Array.isArray(data)) throw new Error('Repo index is not an array');
          results.push(...data);
        } catch (err) {
          console.warn(`[extensions] Failed to fetch repo ${repo.url}:`, err);
          toast.error(`Falha ao carregar repositório: ${repo.label}`);
        }
      }),
    );

    // Deduplicate by id (last repo wins for conflicts)
    const deduped = new Map<string, ExtensionManifest>();
    for (const m of results) deduped.set(m.id, m);
    setRepoManifests([...deduped.values()]);
    setIsLoadingRepos(false);
  }, [repos]);

  // Fetch on mount
  useEffect(() => { fetchRepos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Script fetching + loading ──────────────────────────────────────────────

  async function fetchAndLoad(manifest: ExtensionManifest): Promise<ExtensionModule> {
    const cacheKey = STORAGE.SCRIPT_PREFIX + manifest.id;
    let script = '';

    const res = await fetch(manifest.scriptUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching script`);
    script = await res.text();

    // Cache script source
    try { localStorage.setItem(cacheKey, script); } catch { /* quota exceeded */ }

    return loadExtensionFromScript(script);
  }

  function markLoading(id: string, loading: boolean) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      loading ? next.add(id) : next.delete(id);
      return next;
    });
  }

  // ── Install ────────────────────────────────────────────────────────────────

  const installExtension = useCallback(async (manifest: ExtensionManifest) => {
    markLoading(manifest.id, true);
    try {
      const mod = await fetchAndLoad(manifest);
      moduleCache.set(manifest.id, mod);

      const entry: InstalledExtension = {
        ...manifest,
        status:      'installed',
        installedAt: new Date().toISOString(),
      };
      setInstalled((prev) => {
        const next = [...prev.filter((e) => e.id !== manifest.id), entry];
        saveInstalled(next);
        return next;
      });
      toast.success(`${manifest.name} instalada com sucesso`);
    } catch (err: any) {
      console.error('[extensions] install error', err);
      toast.error(`Erro ao instalar ${manifest.name}: ${err.message}`);
    } finally {
      markLoading(manifest.id, false);
    }
  }, []);

  // ── Remove ─────────────────────────────────────────────────────────────────

  const removeExtension = useCallback((id: string) => {
    moduleCache.delete(id);
    try { localStorage.removeItem(STORAGE.SCRIPT_PREFIX + id); } catch {}
    setInstalled((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveInstalled(next);
      return next;
    });
    toast.success('Extensão removida');
  }, []);

  // ── Update ─────────────────────────────────────────────────────────────────

  const updateExtension = useCallback(async (id: string) => {
    const remote = repoManifests.find((m) => m.id === id);
    if (!remote) { toast.error('Extensão não encontrada no repositório'); return; }

    markLoading(id, true);
    try {
      const mod = await fetchAndLoad(remote);
      moduleCache.set(id, mod);

      setInstalled((prev) => {
        const next = prev.map((e) =>
          e.id === id
            ? { ...remote, status: 'installed' as const, installedAt: e.installedAt }
            : e,
        );
        saveInstalled(next);
        return next;
      });
      toast.success(`${remote.name} atualizada para v${remote.version}`);
    } catch (err: any) {
      console.error('[extensions] update error', err);
      toast.error(`Erro ao atualizar: ${err.message}`);
      // Mark as error state so the user sees it
      setInstalled((prev) => {
        const next = prev.map((e) =>
          e.id === id ? { ...e, status: 'error' as const } : e,
        );
        saveInstalled(next);
        return next;
      });
    } finally {
      markLoading(id, false);
    }
  }, [repoManifests]);

  const updateAll = useCallback(async () => {
    const outdated = installed.filter((e) => {
      const remote = repoManifests.find((m) => m.id === e.id);
      return remote && isNewerVersion(e.version, remote.version);
    });
    await Promise.allSettled(outdated.map((e) => updateExtension(e.id)));
  }, [installed, repoManifests, updateExtension]);

  // ── Repos management ───────────────────────────────────────────────────────

  const addRepo = useCallback(async (url: string, label: string) => {
    if (repos.some((r) => r.url === url)) {
      toast.error('Repositório já adicionado');
      return;
    }
    // Validate before adding
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Formato inválido');
    } catch (err: any) {
      toast.error(`URL inválida: ${err.message}`);
      return;
    }

    setRepos((prev) => {
      const next = [...prev, { url, label, addedAt: new Date().toISOString() }];
      saveRepos(next);
      return next;
    });
    toast.success(`Repositório "${label}" adicionado`);
    // Trigger a fresh fetch of all repos
    setTimeout(fetchRepos, 100);
  }, [repos, fetchRepos]);

  const removeRepo = useCallback((url: string) => {
    if (DEFAULT_REPOS.some((r) => r.url === url)) {
      toast.error('Não é possível remover o repositório oficial');
      return;
    }
    setRepos((prev) => {
      const next = prev.filter((r) => r.url !== url);
      saveRepos(next);
      return next;
    });
    toast.success('Repositório removido');
  }, []);

  // ── Runtime module access ──────────────────────────────────────────────────

  // On first use, load cached scripts back into memory
  useEffect(() => {
    for (const ext of installed) {
      if (moduleCache.has(ext.id)) continue;
      const cached = localStorage.getItem(STORAGE.SCRIPT_PREFIX + ext.id);
      if (!cached) continue;
      try {
        const mod = loadExtensionFromScript(cached);
        moduleCache.set(ext.id, mod);
      } catch (err) {
        console.warn(`[extensions] Failed to restore ${ext.id} from cache:`, err);
        // Mark as error so UI reflects it
        setInstalled((prev) => {
          const next = prev.map((e) =>
            e.id === ext.id ? { ...e, status: 'error' as const } : e,
          );
          saveInstalled(next);
          return next;
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getModule = useCallback((id: string): ExtensionModule | null => {
    return moduleCache.get(id) ?? null;
  }, []);

  // ── Derived: mark outdated, compute available ──────────────────────────────

  const installedWithStatus = useMemo<InstalledExtension[]>(() => {
    return installed.map((e) => {
      const remote = repoManifests.find((m) => m.id === e.id);
      if (remote && isNewerVersion(e.version, remote.version)) {
        return { ...e, status: 'outdated' as const };
      }
      return e;
    });
  }, [installed, repoManifests]);

  const available = useMemo<ExtensionManifest[]>(() => {
    const installedIds = new Set(installed.map((e) => e.id));
    return repoManifests.filter((m) => !installedIds.has(m.id));
  }, [repoManifests, installed]);

  return {
    installed:        installedWithStatus,
    available,
    repos,
    isLoadingRepos,
    loadingIds,
    fetchRepos,
    installExtension,
    removeExtension,
    updateExtension,
    updateAll,
    addRepo,
    removeRepo,
    getModule,
  };
}
