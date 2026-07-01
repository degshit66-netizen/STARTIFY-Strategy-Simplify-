import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION
try {
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  const isGlobalKey = (key: string) => {
    if (!key) return true;
    return key.startsWith('mock_') || 
           key.startsWith('onboarded_') || 
           key.startsWith('show_onboarding_') ||
           key.startsWith('stratify_theme') || 
           key === 'current_tenant_id' || 
           key === 'current_user_id';
  };

  const getTenantKey = (key: string) => {
    if (isGlobalKey(key)) return key;
    try {
      const tenantId = originalGetItem.call(window.localStorage, 'current_tenant_id');
      if (tenantId) {
        return `${tenantId}_${key}`;
      }
    } catch (e) {}
    return key;
  };

  Storage.prototype.getItem = function(key: string) {
    if (!key) return null;
    return originalGetItem.call(this, getTenantKey(key));
  };

  Storage.prototype.setItem = function(key: string, value: string) {
    if (!key) return;
    originalSetItem.call(this, getTenantKey(key), value);
  };

  Storage.prototype.removeItem = function(key: string) {
    if (!key) return;
    originalRemoveItem.call(this, getTenantKey(key));
  };

  Storage.prototype.clear = function() {
    try {
      const tenantId = originalGetItem.call(window.localStorage, 'current_tenant_id');
      if (!tenantId) {
        return;
      }
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(`${tenantId}_`)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => originalRemoveItem.call(window.localStorage, k));
    } catch (e) {}
  };
} catch (e) {
  console.error("Failed to override localStorage", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

