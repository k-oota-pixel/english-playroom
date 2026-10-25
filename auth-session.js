// All same-origin materials must use the same persistence preference before
// Auth initializes. getAuth's IndexedDB-first default otherwise migrates a
// localStorage session out from under the still-mounted home document.
import {getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {
  getAuth as defaultGetAuth, initializeAuth, browserLocalPersistence,
  indexedDBLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

export function getAuth(app = getApp()) {
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch (error) {
    if (error?.code !== 'auth/already-initialized') throw error;
    return defaultGetAuth(app);
  }
}
