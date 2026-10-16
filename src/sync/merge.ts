import { Project } from '../types';
import { Outbox, SyncMeta } from './syncState';

export interface MergeInput {
  local: Project[];
  cloud: Project[];
  meta: SyncMeta;
  outbox: Outbox;
  userId: string;
  /** Projetos de exemplo nunca editados: não devem poluir uma conta que já tem dados. */
  isPristineSeed: (p: Project) => boolean;
}

export interface MergeResult {
  projects: Project[];
  /** IDs cuja versão local deve ser enviada para a nuvem. */
  toUpload: string[];
  /** IDs excluídos localmente (offline) que ainda existem na nuvem. */
  toDeleteRemote: string[];
  /** true quando os dados locais pertenciam a outra conta e foram descartados. */
  foreignDataDiscarded: boolean;
  meta: SyncMeta;
}

/**
 * Mescla projetos locais e da nuvem sem perder edições:
 * - mesmo projeto nos dois lados: vence o `updatedAt` mais recente;
 * - só na nuvem: entra, exceto se foi excluído localmente (exclusão pendente);
 * - só local e já sincronizado antes: foi excluído em outro aparelho, sai
 *   (a menos que tenha edição local pendente, que tem prioridade);
 * - só local e nunca sincronizado: é novo, sobe para a nuvem;
 * - dados locais de outra conta: são descartados em favor da nuvem.
 */
export function mergeProjects({ local, cloud, meta, outbox, userId, isPristineSeed }: MergeInput): MergeResult {
  if (meta.ownerId && meta.ownerId !== userId) {
    return {
      projects: sortByUpdated(cloud),
      toUpload: [],
      toDeleteRemote: [],
      foreignDataDiscarded: true,
      meta: { ownerId: userId, syncedIds: cloud.map((p) => p.id) },
    };
  }

  const synced = new Set(meta.syncedIds);
  const localById = new Map(local.map((p) => [p.id, p]));
  const cloudIds = new Set(cloud.map((p) => p.id));
  const result: Project[] = [];
  const toUpload: string[] = [];
  const toDeleteRemote: string[] = [];

  for (const remote of cloud) {
    if (outbox[remote.id]?.op === 'delete') {
      toDeleteRemote.push(remote.id);
      continue;
    }
    const mine = localById.get(remote.id);
    // Exemplo intocado nunca vence: o updatedAt dele é recalculado a cada carregamento
    // e poderia sobrescrever edições reais feitas em outro aparelho.
    if (mine && !isPristineSeed(mine) && (mine.updatedAt || 0) > (remote.updatedAt || 0)) {
      result.push(mine);
      toUpload.push(mine.id);
    } else {
      result.push(remote);
    }
  }

  for (const mine of local) {
    if (cloudIds.has(mine.id)) continue;
    const pendingUpsert = outbox[mine.id]?.op === 'upsert';
    if (synced.has(mine.id) && !pendingUpsert) continue; // excluído em outro aparelho
    if (!pendingUpsert && cloud.length > 0 && isPristineSeed(mine)) continue;
    result.push(mine);
    toUpload.push(mine.id);
  }

  return {
    projects: sortByUpdated(result),
    toUpload,
    toDeleteRemote,
    foreignDataDiscarded: false,
    meta: { ownerId: userId, syncedIds: cloud.filter((p) => !toDeleteRemote.includes(p.id)).map((p) => p.id) },
  };
}

function sortByUpdated(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
