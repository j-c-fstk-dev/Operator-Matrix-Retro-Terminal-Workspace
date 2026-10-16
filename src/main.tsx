// Deve ser o primeiro import: captura o evento de instalação do PWA antes do React montar.
import './pwa/installPrompt';
import './pwa/registerUpdates';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyAccentTheme, resolveAccentTheme } from './theme/themes';

// Aplica o tema salvo antes do primeiro render para não piscar o verde padrão.
try {
  const saved = JSON.parse(localStorage.getItem('operator_matrix_settings_v1') || '{}');
  applyAccentTheme(resolveAccentTheme(saved.accentTheme));
} catch {
  // sem tema salvo
}

// Guard against third-party browser extension errors (e.g. MetaMask / Web3 injected scripts)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    if (typeof reason === 'string' && /metamask|ethereum|web3|wallet/i.test(reason)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (typeof msg === 'string' && /metamask|ethereum|web3|wallet/i.test(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
