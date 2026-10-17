import React, { createContext, useContext, useEffect } from 'react';
import { pt } from './pt';
import { en } from './en';

export type Lang = 'pt' | 'en';
/** pt.ts é a fonte da verdade: en.ts precisa ter exatamente a mesma forma. */
export type Dict = typeof pt;

export const DICTS: Record<Lang, Dict> = { pt, en };
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
];

/** Português no navegador vira 'pt'; qualquer outro idioma vira inglês. */
export function detectLang(languages?: readonly string[]): Lang {
  const list = languages ?? (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []);
  return (list[0] || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function resolveLang(value: unknown): Lang {
  return value === 'pt' || value === 'en' ? value : detectLang();
}

export const localeOf = (lang: Lang) => (lang === 'pt' ? 'pt-BR' : 'en-US');

// Idioma atual para código fora do React (avisos do sync, erros do Storage).
let current: Lang = 'pt';
export function setCurrentLang(lang: Lang) {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = localeOf(lang);
}
export const getLang = () => current;
export const getT = (): Dict => DICTS[current];

const LangContext = createContext<Lang>('pt');

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // Atualiza antes de renderizar os filhos, para getT() concordar com useT() no mesmo render.
  if (current !== lang) setCurrentLang(lang);
  // Também no primeiro render, quando o idioma inicial já é o padrão do módulo.
  useEffect(() => {
    document.documentElement.lang = localeOf(lang);
  }, [lang]);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = (): Dict => DICTS[useContext(LangContext)];
