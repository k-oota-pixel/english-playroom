// All same-origin materials must use the same persistence preference before
// Auth initializes. getAuth's IndexedDB-first default otherwise migrates a
// localStorage session out from under the still-mounted home document.
import {getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {
  getAuth as defaultGetAuth, initializeAuth, browserLocalPersistence,
  indexedDBLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver,
  onAuthStateChanged as firebaseOnAuthStateChanged, getIdTokenResult as firebaseGetIdTokenResult,
  signOut as firebaseSignOut
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
const SESSION_TTL_MS=7*24*60*60*1000;
const SESSION_STORAGE_PREFIX='monstudy.accountSession.v3.';
const OLD_SESSION_STORAGE_PREFIX='monstudy.accountSession.v2.';
const SERVER_WAKE_MAX_MS=120000;
const SESSION_FETCH_TIMEOUT_MS=20000;

export function timeoutSignal(ms){
 if(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function')return AbortSignal.timeout(ms);
 const controller=new AbortController();
 setTimeout(()=>controller.abort(),ms);
 return controller.signal;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const serverState=globalThis[Symbol.for('monstudy.auth.serverReady.v1')]||
 (globalThis[Symbol.for('monstudy.auth.serverReady.v1')]={until:0,pending:null});
const sessionChecks=globalThis[Symbol.for('monstudy.auth.sessionChecks')]||
 (globalThis[Symbol.for('monstudy.auth.sessionChecks')]=new WeakMap());

// A public, read-free status endpoint wakes sleeping free Render services.
// It never verifies a user, reads Firestore or extends a login session.
export async function ensureRenderReady(){
 if(Date.now()<serverState.until)return;
 if(serverState.pending)return serverState.pending;
 const task=(async()=>{
  const started=Date.now(),deadline=started+SERVER_WAKE_MAX_MS;
  let attempts=0,lastFailure='unavailable';
  while(Date.now()<deadline){
   attempts++;
   try{
    const remaining=Math.max(1000,Math.min(12000,deadline-Date.now()));
    const response=await fetch(API+'/api/status',{method:'GET',cache:'no-store',signal:timeoutSignal(remaining)});
    if(response.ok){serverState.until=Date.now()+30000;return;}
    lastFailure='HTTP '+response.status;
    if(response.status>=400&&response.status<500&&response.status!==429)
     throw Object.assign(new Error('サーバーの起動確認に失敗しました。'),{permanent:true,status:response.status});
   }catch(error){
    if(error?.permanent)throw error;
    lastFailure=error?.name||'network';
   }
   const pause=Math.min(5000,1500+attempts*500,Math.max(0,deadline-Date.now()));
   if(pause>0)await sleep(pause);
  }
  console.warn('[monstudy-auth] server wake timeout',{attempts,elapsedMs:Date.now()-started,lastFailure});
  throw new Error('認証サーバーの起動に時間がかかっています。少し待ってから、もう一度お試しください。');
 })();
 serverState.pending=task;
 try{return await task;}finally{if(serverState.pending===task)serverState.pending=null;}
}

export function invalidateRenderReady(){serverState.until=0;}

function signInSignature(user){return String(user?.metadata?.lastSignInTime||user?.metadata?.lastLoginAt||'');}
function readSessionCache(user){
 if(!user?.uid)return null;
 try{
  const key=SESSION_STORAGE_PREFIX+user.uid,raw=localStorage.getItem(key);
  if(!raw)return null;
  const cached=JSON.parse(raw);
  if(!cached||cached.signInSignature!==signInSignature(user)||
    !Number.isFinite(cached.expiresAt)||cached.expiresAt<=Date.now()||
    !cached.data||cached.data.resetRequired===true){
   localStorage.removeItem(key);
   return null;
  }
  return cached.data;
 }catch{return null;}
}
function writeSessionCache(user,data){
 if(!user?.uid||!data||data.resetRequired===true)return;
 try{localStorage.setItem(SESSION_STORAGE_PREFIX+user.uid,JSON.stringify({
  signInSignature:signInSignature(user),expiresAt:Date.now()+SESSION_TTL_MS,data
 }));}catch{}
}
function clearSessionCache(user){
 try{
  if(!user?.uid)return;
  localStorage.removeItem(SESSION_STORAGE_PREFIX+user.uid);
  sessionStorage.removeItem(OLD_SESSION_STORAGE_PREFIX+user.uid);
 }catch{}
}
export function clearAccountSessionCache(user){
 clearSessionCache(user);
 if(user)sessionChecks.delete(user);
}
export async function signOut(auth){
 const user=auth?.currentUser;
 try{return await firebaseSignOut(auth);}
 finally{clearAccountSessionCache(user);}
}
const retryable=error=>!Number.isFinite(error?.status)||error.status===429||error.status>=500;
function userFacingSessionError(error){
 if(Number.isFinite(error?.status)&&error.status<500&&error.status!==429)return error;
 return Object.assign(new Error('認証サーバーとの通信が完了しませんでした。接続を確認してもう一度お試しください。'),{cause:error});
}
export async function accountSession(user){
 const cached=readSessionCache(user);
 if(cached)return cached;
 const existing=sessionChecks.get(user);
 if(existing&&existing.until>Date.now())return existing.promise;
 const entry={until:Infinity,promise:null};
 entry.promise=(async()=>{
  try{
   await ensureRenderReady();
   const token=await user.getIdToken();
   for(let attempt=1;attempt<=2;attempt++){
    const started=Date.now();
    try{
     const response=await fetch(API+'/api/account/session',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:'{}',signal:timeoutSignal(SESSION_FETCH_TIMEOUT_MS)
     });
     const data=await response.json();
     if(!response.ok)throw Object.assign(Error(data.error||'ログインを確認できませんでした。'),{status:response.status});
     entry.until=Date.now()+5000;
     writeSessionCache(user,data);
     return data;
    }catch(error){
     console.warn('[monstudy-auth] session request failed',{
      attempt,elapsedMs:Date.now()-started,status:error?.status||null,kind:error?.name||'unknown'
     });
     if(attempt===2||!retryable(error))throw userFacingSessionError(error);
     serverState.until=0;
     await sleep(1200);
     await ensureRenderReady();
    }
   }
  }catch(error){
   if(sessionChecks.get(user)===entry)sessionChecks.delete(user);
   throw error;
  }
 })();
 sessionChecks.set(user,entry);
 return entry.promise;
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
