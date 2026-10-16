// Estado persistente da sincronização: fila de envio (outbox) e metadados.
// Fica no localStorage para sobreviver a recarregamentos e ao modo offline.

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  op: OutboxOp;
  /** Momento em que a operação foi enfileirada (usado para não descartar uma edição mais nova). */
  at: number;
}

/** Uma entrada por projeto: só a última operação importa. */
export type Outbox = Record<string, OutboxEntry>;

export interface SyncMeta {
  /** Usuário dono dos dados locais. null = dados nunca sincronizados. */
  ownerId: string | null;
  /** IDs que sabidamente existem na nuvem desde o último sync bem-sucedido. */
  syncedIds: string[];
}

const OUTBOX_KEY = 'operator_sync_outbox_v1';
const META_KEY = 'operator_sync_meta_v1';

export const EMPTY_META: SyncMeta = { ownerId: null, syncedIds: [] };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[Sync] Falha ao salvar estado de sincronização', e);
  }
}

export const loadOutbox = (): Outbox => read<Outbox>(OUTBOX_KEY, {});
export const saveOutbox = (outbox: Outbox) => write(OUTBOX_KEY, outbox);
export const loadSyncMeta = (): SyncMeta => read<SyncMeta>(META_KEY, EMPTY_META);
export const saveSyncMeta = (meta: SyncMeta) => write(META_KEY, meta);

export function enqueue(outbox: Outbox, projectId: string, op: OutboxOp, at: number = Date.now()): Outbox {
  // Garante que `at` cresce mesmo com duas operações no mesmo milissegundo.
  const prev = outbox[projectId];
  return { ...outbox, [projectId]: { op, at: prev && prev.at >= at ? prev.at + 1 : at } };
}

/** Remove as entradas enviadas, preservando as que foram reenfileiradas durante o envio. */
export function acknowledge(outbox: Outbox, sent: Outbox): Outbox {
  const next = { ...outbox };
  for (const [id, entry] of Object.entries(sent)) {
    if (next[id] && next[id].at === entry.at) delete next[id];
  }
  return next;
}
