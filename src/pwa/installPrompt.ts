// Captura o evento `beforeinstallprompt` assim que o módulo é carregado.
// O navegador dispara esse evento uma única vez, logo no carregamento da página;
// se a captura ficasse dentro de um useEffect, no celular o evento costumava
// chegar antes do React montar e se perdia, impedindo a instalação real (WebAPK).
// Importe este módulo em main.tsx ANTES de renderizar o App.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: InstallPromptState = { deferredPrompt: null, installed: false };
const listeners = new Set<() => void>();

function setState(next: Partial<InstallPromptState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPromptState(): InstallPromptState {
  return state;
}

export async function triggerInstallPrompt(): Promise<boolean> {
  const evt = state.deferredPrompt;
  if (!evt) return false;
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    // O evento só pode ser usado uma vez, aceito ou não.
    setState({ deferredPrompt: null, installed: outcome === 'accepted' || state.installed });
    return outcome === 'accepted';
  } catch (err) {
    console.warn('[PWA] Prompt error:', err);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setState({ deferredPrompt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    setState({ deferredPrompt: null, installed: true });
  });
}

export type BrowserKind = 'ios-safari' | 'ios-other' | 'in-app' | 'samsung' | 'firefox-android' | 'chromium';

/** Identifica o navegador para mostrar o passo a passo certo de instalação. */
export function detectBrowserKind(ua: string): BrowserKind {
  const u = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(u);
  // Navegadores embutidos em apps (Instagram, Facebook, TikTok, LinkedIn, WebView do Android)
  if (/instagram|fban|fbav|fb_iab|tiktok|bytedancewebview|linkedinapp|line\//.test(u) || (/android/.test(u) && /; wv\)/.test(u))) {
    return 'in-app';
  }
  if (isIOS) {
    return /crios|fxios|edgios|opios/.test(u) ? 'ios-other' : 'ios-safari';
  }
  if (/samsungbrowser/.test(u)) return 'samsung';
  if (/android/.test(u) && /firefox/.test(u)) return 'firefox-android';
  return 'chromium';
}
