import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initializeLocalStorageOverride } from './lib/db';
import { registerSW } from 'virtual:pwa-register';

// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC
// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC
initializeLocalStorageOverride().then(() => {
  createRoot(document.getElementById('root')!).render(
    <App />
  );
});

// Register Service Worker for offline support and caching
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}



