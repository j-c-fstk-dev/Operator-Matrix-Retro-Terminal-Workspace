import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapRowToProject } from '../services/supabaseService';
import { getT } from '../i18n';
import { Project, Team, TeamMember } from '../types';
import { mergeProjectEdits } from './mergeEdits';
import { teamService } from './teamService';

// Projetos de time: só online, salvos direto no servidor.
// - Cada edição local é salva ~1s depois, condicionada à versão que eu tinha.
// - Se outra pessoa salvou antes, busca a versão nova, junta item a item e tenta de novo.
// - Mudanças das outras pessoas chegam pelo Realtime e são juntadas com o que eu
//   ainda não salvei.

const SAVE_DEBOUNCE_MS = 900;
const MAX_CONFLICT_RETRIES = 4;

const keyOf = (p: { ownerId?: string; id: string }) => `${p.ownerId}/${p.id}`;

/** Erro de banco sem o teams.sql aplicado: tratamos como "sem times". */
const isMissingTeamsSchema = (err: any) =>
  ['42P01', 'PGRST205', 'PGRST200', '42703'].includes(err?.code) || /team_members|teams/.test(String(err?.message));

interface Options {
  user: User | null;
  showToast: (msg: string) => void;
}

export function useTeamSync({ user, showToast }: Options) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [, render] = useReducer((n: number) => n + 1, 0);

  // Estado mutável (as funções assíncronas sempre leem o mais recente).
  const local = useRef(new Map<string, Project>()); // o que aparece na tela
  const base = useRef(new Map<string, Project>()); // última versão do servidor
  const order = useRef<string[]>([]);
  const editSeq = useRef(new Map<string, number>()); // edições locais por projeto
  const savedSeq = useRef(new Map<string, number>()); // até qual edição já foi salva
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saving = useRef(new Set<string>());
  const saveAgain = useRef(new Set<string>());
  const userRef = useRef(user);
  userRef.current = user;
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const isDirty = (key: string) => (editSeq.current.get(key) || 0) > (savedSeq.current.get(key) || 0);

  const setProject = (p: Project) => {
    const key = keyOf(p);
    if (!local.current.has(key)) order.current = [...order.current, key];
    local.current.set(key, p);
  };

  const dropProject = (key: string) => {
    local.current.delete(key);
    base.current.delete(key);
    order.current = order.current.filter((k) => k !== key);
    const timer = timers.current.get(key);
    if (timer) clearTimeout(timer);
    timers.current.delete(key);
  };

  /** Versão nova do servidor (busca, salvamento ou Realtime). */
  const applyServer = useCallback((server: Project) => {
    const key = keyOf(server);
    const prevBase = base.current.get(key);
    if (prevBase && (server.version || 0) <= (prevBase.version || 0)) return; // já tenho
    const mine = local.current.get(key);
    base.current.set(key, server);
    setProject(mine && prevBase && isDirty(key) ? mergeProjectEdits(prevBase, mine, server) : server);
  }, []);

  const save = useCallback(async (key: string): Promise<void> => {
    if (saving.current.has(key)) {
      saveAgain.current.add(key);
      return;
    }
    if (!userRef.current || !navigator.onLine) return;
    saving.current.add(key);
    try {
      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        const mine = local.current.get(key);
        const myBase = base.current.get(key);
        if (!mine || !myBase || !isDirty(key)) return;
        const seq = editSeq.current.get(key) || 0;

        const saved = await teamService.saveTeamProject(mine, myBase.version || 0);
        if (saved) {
          base.current.set(key, saved);
          savedSeq.current.set(key, seq);
          const now = local.current.get(key);
          // Se editei durante o envio, mantenho as edições novas (salvas na próxima rodada).
          if (now) setProject(isDirty(key) ? { ...now, version: saved.version, updatedBy: saved.updatedBy } : saved);
          render();
          return;
        }

        // Outra pessoa salvou antes: junta com a versão dela e tenta de novo.
        const latest = await teamService.fetchTeamProject(mine.ownerId!, mine.id);
        if (!latest) {
          // Fui removida do time, ou o projeto foi descompartilhado/apagado.
          dropProject(key);
          render();
          toastRef.current(getT().teams.lostAccess(mine.title));
          return;
        }
        const current = local.current.get(key) || mine;
        base.current.set(key, latest);
        setProject(mergeProjectEdits(myBase, current, latest));
        render();
      }
      toastRef.current(getT().teams.saveFailed(getT().teams.busy));
    } catch (err: any) {
      console.error('[Times] Falha ao salvar projeto do time:', err);
      toastRef.current(getT().teams.saveFailed(err?.message || getT().sync.error));
    } finally {
      saving.current.delete(key);
      if (saveAgain.current.delete(key)) save(key);
    }
  }, []);

  const scheduleSave = useCallback(
    (key: string) => {
      const prev = timers.current.get(key);
      if (prev) clearTimeout(prev);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          save(key);
        }, SAVE_DEBOUNCE_MS)
      );
    },
    [save]
  );

  /** Busca times, membros e projetos de time. Projetos com edições pendentes são juntados. */
  const refresh = useCallback(async () => {
    const u = userRef.current;
    if (!u || !isSupabaseConfigured || !navigator.onLine) return;
    try {
      const myTeams = await teamService.listMyTeams(u.id);
      setTeams(myTeams);
      if (myTeams.length === 0) {
        for (const key of [...order.current]) dropProject(key);
        setMembers({});
        render();
        return;
      }
      const [projects, memberLists] = await Promise.all([
        teamService.fetchTeamProjects(),
        Promise.all(myTeams.map((team) => teamService.listMembers(team.id).catch(() => [] as TeamMember[]))),
      ]);
      setMembers(Object.fromEntries(myTeams.map((team, i) => [team.id, memberLists[i]])));
      const seen = new Set<string>();
      for (const p of projects) {
        seen.add(keyOf(p));
        applyServer(p);
      }
      // Projetos que não vejo mais (saí do time, foi descompartilhado ou apagado).
      for (const key of [...order.current]) if (!seen.has(key)) dropProject(key);
      render();
    } catch (err: any) {
      if (isMissingTeamsSchema(err)) {
        setTeams([]);
        return;
      }
      console.error('[Times] Falha ao carregar times:', err);
    }
  }, [applyServer]);

  // Login, troca de conta, volta para a aba e reconexão.
  const userId = user?.id;
  useEffect(() => {
    for (const key of [...order.current]) dropProject(key);
    setTeams([]);
    setMembers({});
    render();
    if (userId) refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onOnline = () => {
      refresh();
      for (const key of order.current) if (isDirty(key)) save(key);
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh, save]);

  // Tempo real: o banco só envia as linhas que esta conta pode ler.
  const teamIdsKey = teams.map((team) => team.id).join(',');
  useEffect(() => {
    if (!userId || !supabase || !teamIdsKey) return;
    const teamIds = new Set(teamIdsKey.split(','));
    const channel = supabase
      .channel(`team-projects-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old || {};
          const key = `${old.user_id}/${old.id}`;
          if (local.current.has(key)) {
            dropProject(key);
            render();
          }
          return;
        }
        const row = payload.new;
        if (!row) return;
        const key = `${row.user_id}/${row.id}`;
        if (row.team_id && teamIds.has(row.team_id)) {
          applyServer(mapRowToProject(row));
          render();
        } else if (local.current.has(key)) {
          // Descompartilhado em outro aparelho: deixa de ser projeto de time.
          dropProject(key);
          render();
        }
      })
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [userId, teamIdsKey, applyServer]);

  /** Edição feita na tela num projeto de time. */
  const updateProject = useCallback(
    (updated: Project) => {
      if (!navigator.onLine) {
        toastRef.current(getT().teams.offlineReadOnly);
        return;
      }
      const key = keyOf(updated);
      if (!local.current.has(key)) return;
      editSeq.current.set(key, (editSeq.current.get(key) || 0) + 1);
      setProject(updated);
      render();
      scheduleSave(key);
    },
    [scheduleSave]
  );

  /** Coloca no estado um projeto que acabou de ser compartilhado. */
  const adopt = useCallback((p: Project) => {
    base.current.set(keyOf(p), p);
    setProject(p);
    render();
  }, []);

  const forget = useCallback((p: Project) => {
    dropProject(keyOf(p));
    render();
  }, []);

  const teamProjects = order.current.map((k) => local.current.get(k)!).filter(Boolean);
  const emailOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of Object.values(members)) for (const m of list) map.set(m.userId, m.email);
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [members]);

  return { teams, members, teamProjects, refresh, updateProject, adopt, forget, emailOf };
}
