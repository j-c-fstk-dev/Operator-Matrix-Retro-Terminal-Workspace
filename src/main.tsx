import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
