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

const API='https://task-quest.onrender.com';
const SESSION_TTL_MS=12*60*60*1000;
const SESSION_STORAGE_PREFIX='monstudy.accountSession.v2.';
const sessionChecks=globalThis[Symbol.for('monstudy.auth.sessionChecks')]||(globalThis[Symbol.for('monstudy.auth.sessionChecks')]=new WeakMap());

function signInSignature(user){return String(user?.metadata?.lastSignInTime||user?.metadata?.lastLoginAt||'');}
function readSessionCache(user){
 try{
  const raw=sessionStorage.getItem(SESSION_STORAGE_PREFIX+user.uid);
  if(!raw)return null;
  const cached=JSON.parse(raw);
  if(!cached||cached.signInSignature!==signInSignature(user)||!Number.isFinite(cached.expiresAt)||cached.expiresAt<=Date.now()){
   sessionStorage.removeItem(SESSION_STORAGE_PREFIX+user.uid);
   return null;
  }
  return cached.data||null;
 }catch{return null;}
}
function writeSessionCache(user,data){
 try{sessionStorage.setItem(SESSION_STORAGE_PREFIX+user.uid,JSON.stringify({signInSignature:signInSignature(user),expiresAt:Date.now()+SESSION_TTL_MS,data}));}catch{}
}
function clearSessionCache(user){
 try{if(user?.uid)sessionStorage.removeItem(SESSION_STORAGE_PREFIX+user.uid);}catch{}
}

export async function accountSession(user){
 const cached=readSessionCache(user);
 if(cached)return cached;
 const existing=sessionChecks.get(user);
 if(existing&&existing.until>Date.now())return existing.promise;
 const entry={until:Infinity,promise:null};
 entry.promise=(async()=>{
  try{
   const token=await user.getIdToken();
   const response=await fetch(API+'/api/account/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}',signal:AbortSignal.timeout(30000)});
   const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'ログインを確認できませんでした。'),{status:response.status});
   entry.until=Date.now()+5000;
   writeSessionCache(user,data);
   return data;
  }catch(error){if(sessionChecks.get(user)===entry)sessionChecks.delete(user);throw error;}
 })();
 sessionChecks.set(user,entry);return entry.promise;
}

export function clearAccountSessionCache(user){
 clearSessionCache(user);
 sessionChecks.delete(user);
}

export function onAuthStateChanged(auth,observerOrNext,error,completed){
 const isObserver=observerOrNext&&typeof observerOrNext==='object',next=isObserver?observerOrNext.next:observerOrNext;
 let generation=0;
 const notify=async user=>{
  const current=++generation,path=location.pathname,login=path==='/english-playroom/login.html',account=path==='/english-playroom/account.html';
  const deliver=value=>{if(current===generation&&typeof next==='function')next(value);};
  if(login||account){deliver(user);return;}
  if(!user||user.isAnonymous){location.replace('https://k-oota-pixel.github.io/english-playroom/login.html?return='+encodeURIComponent(location.href));return;}
  try{
   const session=await accountSession(user);
   if(current!==generation)return;
   if(session.resetRequired){clearSessionCache(user);location.replace('https://k-oota-pixel.github.io/english-playroom/account.html?mode=password');return;}
   const token=await firebaseGetIdTokenResult(user);
   if(token.claims?.passwordResetRequired===true&&!token.claims?.codeAccount&&!path.endsWith('/password-reset-required.html')){
    clearSessionCache(user);location.replace('https://k-oota-pixel.github.io/english-playroom/password-reset-required.html');return;
   }
   deliver(user);
  }catch(e){
   if(current!==generation)return;
   window.dispatchEvent(new CustomEvent('monstudy-access-error',{detail:e}));
   if(typeof error==='function')error(e);
  }
 };
 return firebaseOnAuthStateChanged(auth,isObserver?{...observerOrNext,next:notify}:notify,error,completed);
}
