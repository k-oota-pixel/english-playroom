// All same-origin materials must use the same persistence preference before
// Auth initializes. getAuth's IndexedDB-first default otherwise migrates a
// localStorage session out from under the still-mounted home document.
import {getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {
  getAuth as defaultGetAuth, initializeAuth, browserLocalPersistence,
  indexedDBLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver,
  onAuthStateChanged as firebaseOnAuthStateChanged, getIdTokenResult as firebaseGetIdTokenResult
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

export function onAuthStateChanged(auth,observerOrNext,error,completed){
  const isObserver=observerOrNext&&typeof observerOrNext==='object';
  const next=isObserver?observerOrNext.next:observerOrNext;
  const deliver=user=>{if(typeof next==='function')next(user);};
  const notify=user=>{
    if(!user){deliver(null);return;}
    const root='/english-playroom/';
    const path=location.pathname;
    const allowResetPrompt=[root,root+'index.html',root+'login.html',root+'password-reset-required.html'].includes(path);
    if(allowResetPrompt){deliver(user);return;}
    firebaseGetIdTokenResult(user).then(result=>{
      if(result.claims?.passwordResetRequired===true){
        location.replace(new URL('/english-playroom/password-reset-required.html',location.origin).href);
        return;
      }
      deliver(user);
    }).catch(()=>deliver(user));
  };
  if(isObserver)return firebaseOnAuthStateChanged(auth,{...observerOrNext,next:notify});
  return firebaseOnAuthStateChanged(auth,notify,error,completed);
}
