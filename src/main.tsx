import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initializeLocalStorageOverride } from './lib/db';

// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC
// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC
initializeLocalStorageOverride().then(() => {
  createRoot(document.getElementById('root')!).render(
    <App />
  );
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}


