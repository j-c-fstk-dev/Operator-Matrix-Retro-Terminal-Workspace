import { SubTask, Task } from '../types';

// Transforma uma lista de tarefas em Markdown (colada no campo de nova tarefa) em tarefas.
// Aceita o formato do "Exportar MD" do próprio app e listas escritas à mão:
//
//   - [ ] **Título da tarefa** [CRIT] [#tag #outra]
//     Linha recuada sem caixa de seleção: vira a nota da tarefa
//     - [x] Item recuado com caixa de seleção: vira subtarefa
//   - [x] Tarefa já feita #tag
//
// Títulos de seção (## Tarefas), linhas em branco e o resto do texto são ignorados.

const CHECKBOX = /^(\s*)[-*+]\s+\[( |x|X)\]\s*(.*)$/;
const NOTE_BULLET = /^\s*[-*+]\s+\*?(?:nota|note)\*?:\*?\s*/i;

interface ParseOptions {
  /** Para ids únicos; o padrão usa a hora atual. */
  now?: number;
}

/** true se o texto tem pelo menos um item de lista com caixa de seleção. */
export function looksLikeTaskList(text: string): boolean {
  return text.split(/\r?\n/).some((line) => CHECKBOX.test(line));
}

function parseTitle(raw: string) {
  let text = raw.trim();
  let priority: Task['priority'] = 'med';
  const tags = new Set<string>();

  // Etiquetas de prioridade, como o export usa: [CRIT], [HIGH], [LOW].
  text = text.replace(/\[(crit|critical|high|alta)\]/gi, () => {
    priority = 'high';
    return '';
  });
  text = text.replace(/\[(low|baixa)\]/gi, () => {
    priority = 'low';
    return '';
  });
  // Tags no formato do export: [#api #db]
  text = text.replace(/\[((?:#[\w-]+\s*)+)\]/g, (_, list: string) => {
    list.split(/\s+/).filter(Boolean).forEach((tg) => tags.add(tg.slice(1).toLowerCase()));
    return '';
  });
  // Tags soltas no texto continuam no título (como no campo de nova tarefa).
  (text.match(/#([\w-]+)/g) || []).forEach((tg) => tags.add(tg.slice(1).toLowerCase()));
  // Negrito/itálico/código em volta do título.
  text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\s{2,}/g, ' ').trim();

  return { text, priority, tags: [...tags] };
}

export function parseMarkdownTasks(input: string, { now = Date.now() }: ParseOptions = {}): Task[] {
  const tasks: Task[] = [];
  let taskIndent = -1; // recuo dos itens de primeiro nível
  let current: Task | null = null;
  let counter = 0;
  const id = (prefix: string) => `${prefix}-${now}-${counter++}-${Math.random().toString(36).slice(2, 6)}`;

  const addNote = (line: string) => {
    if (!current) return;
    const text = line.replace(NOTE_BULLET, '').replace(/^\s*[-*+]\s+/, '').replace(/^\*(.+)\*$/, '$1').trim();
    if (!text) return;
    current.notes = current.notes ? `${current.notes}\n${text}` : text;
  };

  for (const line of input.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(CHECKBOX);
    if (match) {
      const indent = match[1].replace(/\t/g, '  ').length;
      const done = match[2].toLowerCase() === 'x';
      const { text, priority, tags } = parseTitle(match[3]);
      if (!text) continue;
      if (taskIndent === -1) taskIndent = indent;
      if (indent > taskIndent && current) {
        const sub: SubTask = { id: id('sub'), text, done, createdAt: now };
        current.subtasks.push(sub);
      } else {
        current = {
          id: id('task'),
          text,
          done,
          priority,
          ...(tags.length ? { tags } : {}),
          subtasks: [],
          createdAt: now,
        };
        tasks.push(current);
      }
      continue;
    }
    // Linha recuada embaixo de uma tarefa: nota. Linha sem recuo (título, parágrafo): fim da tarefa.
    if (current && /^\s+\S/.test(line)) {
      addNote(line);
    } else {
      current = null;
    }
  }
  return tasks;
}
