import { Project } from '../types';

// Junta as edições de duas pessoas no mesmo projeto de time (merge de 3 vias).
//
// base   = versão do servidor que eu tinha antes de editar
// mine   = minha versão local (base + minhas edições ainda não salvas)
// theirs = versão mais nova do servidor (base + edições de outra pessoa)
//
// Regra: o que eu mudei em relação à base vale; o resto vem do servidor.
// Listas com id (tarefas, subtarefas, notas, snippets, anexos) são juntadas item a
// item, e dentro de um item campo a campo. Assim, se eu marco a tarefa A e a colega
// cria a tarefa B, as duas mudanças ficam. Só quando as duas mexem no mesmo campo
// do mesmo item vale a minha (a última a salvar).

type Json = unknown;
type WithId = { id: string };

const same = (a: Json, b: Json) => JSON.stringify(a) === JSON.stringify(b);

const isIdList = (v: Json): v is WithId[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && typeof (x as WithId).id === 'string');

const isPlainObject = (v: Json): v is Record<string, Json> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function mergeValue(base: Json, mine: Json, theirs: Json): Json {
  if (same(mine, base)) return theirs; // não mexi: vale o servidor
  if (same(theirs, base)) return mine; // só eu mexi
  // Os dois mexeram: tenta descer um nível antes de escolher a minha.
  const lists = [base, mine, theirs].filter(Array.isArray);
  if (lists.length === 3 && [base, mine, theirs].some(isIdList)) {
    return mergeList(base as WithId[], mine as WithId[], theirs as WithId[]);
  }
  if (isPlainObject(base) && isPlainObject(mine) && isPlainObject(theirs)) {
    return mergeObject(base, mine, theirs);
  }
  return mine;
}

function mergeObject(base: Record<string, Json>, mine: Record<string, Json>, theirs: Record<string, Json>) {
  const out: Record<string, Json> = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)])) {
    const value = mergeValue(base[key], mine[key], theirs[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function mergeList<T extends WithId>(base: T[] = [], mine: T[] = [], theirs: T[] = []): T[] {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const mineById = new Map(mine.map((x) => [x.id, x]));
  const theirsById = new Map(theirs.map((x) => [x.id, x]));

  // Parte da ordem do servidor.
  const result: T[] = [];
  for (const item of theirs) {
    const b = baseById.get(item.id);
    const m = mineById.get(item.id);
    if (!b) {
      result.push(m ? (mergeValue(undefined, m, item) as T) : item); // criado pelo outro (ou pelos dois)
    } else if (!m) {
      // Eu apaguei: some, a menos que o outro tenha editado (não perde trabalho dele).
      if (!same(item, b)) result.push(item);
    } else {
      result.push(mergeValue(b, m, item) as T);
    }
  }

  // Itens que eu tenho e o servidor não.
  mine.forEach((item, index) => {
    if (theirsById.has(item.id)) return;
    const b = baseById.get(item.id);
    // O outro apagou e eu não mexi: fica apagado.
    if (b && same(item, b)) return;
    // Novo (ou editado por mim depois que o outro apagou): entra na posição que tem na minha lista.
    let at = 0;
    for (let i = index - 1; i >= 0; i--) {
      const prev = result.findIndex((x) => x.id === mine[i].id);
      if (prev !== -1) {
        at = prev + 1;
        break;
      }
    }
    result.splice(at, 0, item);
  });

  return result;
}

/** Junta minhas edições locais com a versão mais nova do servidor. */
export function mergeProjectEdits(base: Project, mine: Project, theirs: Project): Project {
  const merged = mergeObject(
    base as unknown as Record<string, Json>,
    mine as unknown as Record<string, Json>,
    theirs as unknown as Record<string, Json>
  ) as unknown as Project;
  return {
    ...merged,
    // Metadados do servidor (versão, dono, time) vêm sempre de theirs.
    id: theirs.id,
    ownerId: theirs.ownerId,
    teamId: theirs.teamId,
    version: theirs.version,
    updatedBy: theirs.updatedBy,
    updatedAt: Math.max(mine.updatedAt || 0, theirs.updatedAt || 0),
  };
}
