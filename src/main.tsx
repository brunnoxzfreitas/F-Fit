import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Runtime API base URL shim
const BASE_API = import.meta.env.VITE_APP_URL || (window as any).__APP_URL__ || '';
const _origFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo, init?: RequestInit) => {
  try {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = BASE_API + input;
    } else if (input instanceof Request && input.url.startsWith('/api')) {
      const url = BASE_API + input.url;
      input = new Request(url, input);
    }
  } catch (e) {
    // ignore and fallback to original
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // App continues normally if the browser does not allow service workers.
    });
  });
}
