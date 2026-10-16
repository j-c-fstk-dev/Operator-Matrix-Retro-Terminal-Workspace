import { registerSW } from 'virtual:pwa-register';

// Registra o service worker e mantém o app atualizado.
// Antes, o SW só era registrado: quem estava com o app aberto/instalado
// continuava rodando a versão antiga até fechar e reabrir (às vezes duas vezes).
// Agora o app procura atualização ao abrir e sempre que volta para a tela;
// com registerType 'autoUpdate', a página recarrega sozinha quando há versão nova.
// A busca acontece ao voltar para o app (não em intervalos), para não recarregar
// no meio de uma digitação.

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          registration.update().catch(() => {
            // sem rede ou servidor indisponível: tenta na próxima volta
          });
        }
      });
    },
    onRegisterError(error) {
      console.warn('[PWA] Falha ao registrar o service worker:', error);
    },
  });
}
