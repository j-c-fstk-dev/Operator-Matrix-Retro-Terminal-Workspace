import { useMemo, useSyncExternalStore } from 'react';
import {
  subscribeInstallPrompt,
  getInstallPromptState,
  triggerInstallPrompt,
  detectBrowserKind,
} from '../pwa/installPrompt';

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall() {
  const { deferredPrompt, installed } = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState);
  const browserKind = useMemo(() => detectBrowserKind(window.navigator.userAgent), []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: installed || isStandaloneDisplay(),
    isIOS: browserKind === 'ios-safari' || browserKind === 'ios-other',
    browserKind,
    install: triggerInstallPrompt,
  };
}
