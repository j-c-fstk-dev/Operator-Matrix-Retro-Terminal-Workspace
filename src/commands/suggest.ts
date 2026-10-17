import { DICTS, LANGS, type Dict, type Lang } from '../i18n';
import { ACCENT_THEMES, type AccentThemeId } from '../theme/themes';

/** Uma sugestão do autocomplete do prompt (Ctrl+K). */
export interface CommandSuggestion {
  /** Texto completo que vai para o prompt ao aceitar. */
  completion: string;
  /** Descrição curta mostrada ao lado. */
  hint: string;
  /** Termina em espaço: ainda falta um argumento, então aceitar só preenche o prompt. */
  needsArg: boolean;
}

interface CatalogContext {
  t: Dict;
  lang: Lang;
  projects: { title: string; tasks: { tags?: string[] }[] }[];
  accentTheme?: string;
}

const entry = (completion: string, hint: string): CommandSuggestion => ({
  completion,
  hint,
  needsArg: completion.endsWith(' '),
});

/** Todos os comandos que o prompt entende, na ordem em que devem ser sugeridos. */
export function buildCommandCatalog({ t, lang, projects, accentTheme }: CatalogContext): CommandSuggestion[] {
  const c = t.manual.commands;
  // O idioma que a pessoa ainda não está usando vem primeiro: é o que ela quer ao digitar "lang".
  const langs = [...LANGS].sort((a, b) => Number(a.id === lang) - Number(b.id === lang));
  const themes = [...ACCENT_THEMES].sort((a, b) => Number(a.id === accentTheme) - Number(b.id === accentTheme));
  const tags = Array.from(new Set(projects.flatMap((p) => p.tasks.flatMap((task) => task.tags || [])))).sort();

  const list: CommandSuggestion[] = [
    entry('help', c.help),
    entry('man', c.help),
    entry('git status', c.status),
    entry('git commit', c.commit),
    entry('git init ', c.init),
    ...projects.map((p) => entry(`git checkout ${p.title}`, c.checkout)),
    entry('new ', c.init),
    ...projects.map((p) => entry(`switch ${p.title}`, c.checkout)),
    entry('export', c.commit),
    ...langs.map((l) => entry(`lang ${l.id}`, `${c.lang}: ${l.label}`)),
    ...themes.map((theme) => entry(`theme ${theme.id}`, `${c.theme}: ${t.themes[theme.id]}`)),
    entry('login', c.auth),
    entry('logout', c.auth),
    entry('install', c.pwa),
    entry('task: ', c.task),
    ...tags.map((tag) => entry(`#${tag}`, t.palette.tagHint)),
  ];
  const seen = new Set<string>();
  return list.filter((s) => {
    if (seen.has(s.completion)) return false;
    seen.add(s.completion);
    return true;
  });
}

/** Sugestões que continuam o que foi digitado (sem diferenciar maiúsculas). */
export function suggestCommands(input: string, catalog: CommandSuggestion[], limit = 6): CommandSuggestion[] {
  if (!input.trim() || input !== input.trimStart()) return [];
  const q = input.toLowerCase();
  return catalog
    .filter((s) => {
      const full = s.completion.toLowerCase();
      return full.startsWith(q) && full !== q;
    })
    .slice(0, limit);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_]+/g, '-');

/** Aceita o id do tema ("purple") ou o nome em qualquer idioma ("roxo", "Verde-água", "deep blue"). */
export function resolveThemeName(name: string): AccentThemeId | null {
  const wanted = normalize(name.trim());
  for (const theme of ACCENT_THEMES) {
    const names = [theme.id, DICTS.pt.themes[theme.id], DICTS.en.themes[theme.id]].map(normalize);
    if (names.includes(wanted)) return theme.id;
  }
  return null;
}
