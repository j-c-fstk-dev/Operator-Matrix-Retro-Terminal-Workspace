import { useCallback, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Project } from '../types';
import { supabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { getInitialProjects, isPristineSeedProject } from '../data/initialData';
import { getLang, getT } from '../i18n';
import { mergeProjects } from './merge';
import {
  Outbox,
  OutboxOp,
  acknowledge,
  enqueue,
  loadOutbox,
  loadSyncMeta,
  saveOutbox,
  saveSyncMeta,
} from './syncState';

/** Espera após a última edição antes de enviar (agrupa digitação). */
const DEBOUNCE_MS = 1500;
/** Envio garantido mesmo se o usuário não parar de editar. */
const MAX_WAIT_MS = 10000;
/** Intervalo mínimo entre buscas automáticas ao voltar para a aba. */
const PULL_THROTTLE_MS = 30000;
const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 60000;

export type SyncStatus = 'local' | 'synced' | 'pending' | 'syncing' | 'error';

interface UseCloudSyncOptions {
  user: User | null;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  showToast: (msg: string) => void;
}

export function useCloudSync({ user, projects, setProjects, showToast }: UseCloudSyncOptions) {
  // Refs com o valor mais recente para uso dentro de timers e callbacks assíncronos.
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const userRef = useRef(user);
  userRef.current = user;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const outboxRef = useRef<Outbox>(loadOutbox());
  const metaRef = useRef(loadSyncMeta());
  const [pendingCount, setPendingCount] = useState(() => Object.keys(outboxRef.current).length);
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'error'>('idle');

  const timers = useRef({
    debounce: 0 as ReturnType<typeof setTimeout> | 0,
    retry: 0 as ReturnType<typeof setTimeout> | 0,
    firstQueuedAt: 0,
    retryDelay: 0,
    flushing: false,
    flushAgain: false,
    errorNotified: false,
    lastPullAt: 0,
  });

  const commitOutbox = useCallback((next: Outbox) => {
    outboxRef.current = next;
    saveOutbox(next);
    setPendingCount(Object.keys(next).length);
  }, []);

  const canSync = () => Boolean(userRef.current && isSupabaseConfigured && navigator.onLine);

  const flush = useCallback(async (): Promise<boolean> => {
    const t = timers.current;
    if (t.debounce) clearTimeout(t.debounce);
    t.debounce = 0;
    t.firstQueuedAt = 0;

    const u = userRef.current;
    if (!u || !canSync()) return false;
    if (t.flushing) {
      t.flushAgain = true;
      return true;
    }
    const snapshot: Outbox = { ...outboxRef.current };
    const entries = Object.entries(snapshot);
    if (entries.length === 0) return true;

    t.flushing = true;
    setPhase('syncing');
    try {
      const current = new Map(projectsRef.current.map((p) => [p.id, p]));
      const upserts = entries
        .filter(([, e]) => e.op === 'upsert')
        .map(([id]) => current.get(id))
        .filter((p): p is Project => Boolean(p));
      const deletes = entries.filter(([, e]) => e.op === 'delete').map(([id]) => id);

      if (upserts.length > 0) await supabaseService.upsertAllProjects(u.id, upserts);
      for (const id of deletes) await supabaseService.deleteProject(u.id, id);

      // Se o usuário trocou de conta durante o envio, não mexe no estado da conta nova.
      if (userRef.current?.id !== u.id) return false;

      commitOutbox(acknowledge(outboxRef.current, snapshot));
      const synced = new Set(metaRef.current.syncedIds);
      upserts.forEach((p) => synced.add(p.id));
      deletes.forEach((id) => synced.delete(id));
      metaRef.current = { ownerId: u.id, syncedIds: [...synced] };
      saveSyncMeta(metaRef.current);

      if (t.errorNotified) showToastRef.current(getT().sync.reconnected);
      t.retryDelay = 0;
      t.errorNotified = false;
      setPhase('idle');
      return true;
    } catch (err: any) {
      console.error('[Sync] Falha ao enviar alterações:', err);
      setPhase('error');
      if (!t.errorNotified) {
        showToastRef.current(getT().sync.pushFailed(err?.message || getT().sync.error));
        t.errorNotified = true;
      }
      t.retryDelay = Math.min(Math.max(t.retryDelay * 2, RETRY_MIN_MS), RETRY_MAX_MS);
      if (t.retry) clearTimeout(t.retry);
      t.retry = setTimeout(() => {
        t.retry = 0;
        flush();
      }, t.retryDelay);
      return false;
    } finally {
      t.flushing = false;
      if (t.flushAgain) {
        t.flushAgain = false;
        scheduleFlush();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitOutbox]);

  const scheduleFlush = useCallback(() => {
    const t = timers.current;
    const now = Date.now();
    if (!t.firstQueuedAt) t.firstQueuedAt = now;
    if (t.debounce) clearTimeout(t.debounce);
    const wait = now - t.firstQueuedAt >= MAX_WAIT_MS ? 0 : DEBOUNCE_MS;
    t.debounce = setTimeout(() => {
      flush();
    }, wait);
  }, [flush]);

  const queue = useCallback(
    (ids: string[], op: OutboxOp) => {
      if (ids.length === 0) return;
      let next = outboxRef.current;
      for (const id of ids) next = enqueue(next, id, op);
      commitOutbox(next);
      scheduleFlush();
    },
    [commitOutbox, scheduleFlush]
  );

  const queueUpsert = useCallback((id: string) => queue([id], 'upsert'), [queue]);
  const queueDelete = useCallback((id: string) => queue([id], 'delete'), [queue]);
  const queueUpserts = useCallback((ids: string[]) => queue(ids, 'upsert'), [queue]);
  const queueDeletes = useCallback((ids: string[]) => queue(ids, 'delete'), [queue]);

  /** Busca a nuvem, mescla com os dados locais e envia o que estiver pendente. */
  const pull = useCallback(
    async (reason: 'login' | 'focus') => {
      const u = userRef.current;
      if (!u || !canSync()) return;
      timers.current.lastPullAt = Date.now();
      try {
        const cloud = await supabaseService.fetchUserProjects(u.id);
        if (userRef.current?.id !== u.id) return;

        const input = {
          cloud,
          meta: metaRef.current,
          outbox: outboxRef.current,
          userId: u.id,
          isPristineSeed: isPristineSeedProject,
        };
        const result = mergeProjects({ ...input, local: projectsRef.current });
        const withFallback = (list: Project[]) => (list.length > 0 ? list : getInitialProjects(getLang()));

        if (result.foreignDataDiscarded) commitOutbox({});
        metaRef.current = result.meta;
        saveSyncMeta(result.meta);

        // Re-mescla sobre o estado mais recente caso algo tenha mudado desde a leitura.
        const base = projectsRef.current;
        setProjects((prev) =>
          withFallback(prev === base ? result.projects : mergeProjects({ ...input, local: prev }).projects)
        );

        if (result.toDeleteRemote.length) queueDeletes(result.toDeleteRemote);
        if (result.toUpload.length) queueUpserts(result.toUpload);
        await flush();

        if (reason === 'login') {
          if (result.foreignDataDiscarded) {
            showToastRef.current(getT().sync.accountSwitched(cloud.length));
          } else if (result.toUpload.length > 0 && cloud.length === 0) {
            showToastRef.current(getT().sync.uploaded(result.toUpload.length));
          } else {
            showToastRef.current(getT().sync.synced(result.projects.length));
          }
        }
      } catch (err: any) {
        console.error('[Sync] Erro ao buscar projetos da nuvem:', err);
        if (reason === 'login') {
          showToastRef.current(getT().sync.loadFailed(err?.message || getT().sync.error));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitOutbox, flush, queueDeletes, queueUpserts, setProjects]
  );

  /** Envia todos os projetos agora (botão manual). Lança erro se falhar. */
  const syncAllNow = useCallback(async () => {
    if (!userRef.current) throw new Error(getT().sync.loginFirst);
    if (!navigator.onLine) throw new Error(getT().sync.offline);
    queueUpserts(projectsRef.current.map((p) => p.id));
    const ok = await flush();
    if (!ok) throw new Error(getT().sync.uploadFailed);
  }, [flush, queueUpserts]);

  // Login, troca de conta ou sessão restaurada.
  const userId = user?.id;
  useEffect(() => {
    if (userId) pull('login');
  }, [userId, pull]);

  // Reenvia ao reconectar e busca novidades ao voltar para a aba.
  useEffect(() => {
    const onOnline = () => {
      flush();
      pull('focus');
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - timers.current.lastPullAt < PULL_THROTTLE_MS) return;
      pull('focus');
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [flush, pull]);

  // Envia o que estiver pendente antes de fechar/ocultar a página.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && Object.keys(outboxRef.current).length > 0) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.debounce) clearTimeout(t.debounce);
      if (t.retry) clearTimeout(t.retry);
    };
  }, []);

  const status: SyncStatus = !user
    ? 'local'
    : phase === 'syncing'
      ? 'syncing'
      : phase === 'error'
        ? 'error'
        : pendingCount > 0
          ? 'pending'
          : 'synced';

  return { status, pendingCount, queueUpsert, queueDelete, queueUpserts, queueDeletes, syncAllNow };
}
