import './pet-jump-fix.js?v=1.5.7';
import './pet-enhancements.js?v=1.5.31';
import './pet-shop-appearance-lock.js?v=1.5.32';
import './pet-shop-expansion-v1533.js?v=2.1.26';
import './pet-shop-preview-fix-v1534.js?v=2.1.25';
import './pet-dungeons-shop.js?v=2.1.25';
import './pet-motion-polish.js';
import './pet-sleep-mode.js?v=1.9.6';
import './pet-sleep-visibility.js';
import './pet-grumpy-cleanup-v139.js';
import './pet-lifecycle-v141.js?v=2.1.62';
import './pet-egg-ui-v141.js?v=1.8.4';
import './pet-six-species-v141.js?v=2.1.9';
import './pet-eye-emphasis-v144.js?v=1.9.6';
import './pet-cat-dog-v1425.js?v=1.5.7';
// Cat and dog artwork are rendered directly by pet-art.js; no late redraw.
// Sleep mode now owns original and cloned eye visibility together.
import './pet-lion-v149.js?v=2.1.25';
import './pet-play-menu-v164.js?v=2.1.25';
import './material-return.js?v=4.0.0';

queueMicrotask(()=>import('./pet-admin-panel.js?v=2.1.61').then(()=>import('./pet-admin-limit-v1420.js?v=1.6.2')).catch(error=>console.error('Admin pet panel failed to load',error)));

const APP_VERSION='2.2.3';
const APP_ROOT=new URL('./',import.meta.url);
let forceRefreshBusy=false;

function updateHomeHeroCopy(){
  const heading=document.querySelector('.hero-intro h1');
  if(!heading)return;
  heading.textContent='今日はどの教材を使う？？';
}

function currentLogo(){
  const existing=document.querySelector('.logo');
  if(!existing)return null;
  if(existing.dataset.versionObserverDetached==='1')return existing;
  // index.html used to install a fixed-version MutationObserver on this node.
  // Replace only the passive logo node so a stale observer cannot keep forcing an old version label.
  const clone=existing.cloneNode(true);
  clone.dataset.versionObserverDetached='1';
  existing.replaceWith(clone);
  return clone;
}

function installVersionBadge(){
  const logo=currentLogo();
  if(!logo)return;
  if(!logo.textContent.trim().startsWith('もんすたでぃ'))return;
  logo.dataset.versionBadgeInstalled='1';

  if(!document.getElementById('appVersionBadgeStyle')){
    const style=document.createElement('style');
    style.id='appVersionBadgeStyle';
    style.textContent=`
.logo{display:flex;align-items:baseline;gap:7px}.app-version-badge{font-size:9px;letter-spacing:.02em;font-weight:700;color:#8a9b94;white-space:nowrap}
.pet-admin-toolbar{gap:7px;flex-wrap:wrap}
.pet-force-refresh{appearance:none;border:1px solid #6d9b8d;background:#eef8f3;color:#285f50;border-radius:999px;padding:6px 11px;font:inherit;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap}
.pet-force-refresh:hover{background:#e0f1e8}.pet-force-refresh:disabled{opacity:.62;cursor:wait}
`;
    document.head.appendChild(style);
  }

  const badge=logo.querySelector('.app-version-badge')||document.createElement('span');
  badge.className='app-version-badge';
  badge.textContent=`ver${APP_VERSION}`;
  badge.setAttribute('aria-label',`version ${APP_VERSION}`);
  logo.appendChild(badge);
}

function isAppResource(value){
  try{
    const url=new URL(value,location.href);
    return url.origin===location.origin&&url.pathname.startsWith(APP_ROOT.pathname);
  }catch{return false;}
}

function collectLoadedAppResources(){
  const urls=new Set([location.href,import.meta.url]);
  for(const element of document.querySelectorAll('script[src],link[href]')){
    const value=element.src||element.href;
    if(value&&isAppResource(value))urls.add(value);
  }
  try{
    for(const entry of performance.getEntriesByType('resource')){
      if(entry?.name&&isAppResource(entry.name))urls.add(entry.name);
    }
  }catch{}
  return [...urls];
}

async function unregisterAppServiceWorkers(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.filter(registration=>{
      try{
        const scopePath=new URL(registration.scope).pathname;
        return APP_ROOT.pathname.startsWith(scopePath)||scopePath.startsWith(APP_ROOT.pathname);
      }catch{return false;}
    }).map(registration=>registration.unregister()));
  }catch(error){console.warn('App service worker cleanup skipped',error);}
}

async function forceRefresh(button){
  if(forceRefreshBusy)return;
  forceRefreshBusy=true;
  const original=button.textContent;
  button.disabled=true;
  button.textContent='↻ 強制更新中…';
  try{
    await unregisterAppServiceWorkers();
    const resources=collectLoadedAppResources();
    await Promise.allSettled(resources.map(async value=>{
      const url=new URL(value,location.href);url.hash='';
      const response=await fetch(url.href,{cache:'reload',credentials:'same-origin'});
      if(!response.ok)throw Error(`${response.status} ${url.pathname}`);
      try{await response.body?.cancel();}catch{}
    }));
  }catch(error){console.warn('Force refresh prefetch failed',error);}
  const target=new URL(APP_ROOT.href);
  target.searchParams.set('_fresh',`${APP_VERSION}-${Date.now().toString(36)}`);
  location.replace(target.href);
  setTimeout(()=>{forceRefreshBusy=false;button.disabled=false;button.textContent=original;},4000);
}

function installForceRefreshButton(){
  const adminButton=document.querySelector('.pet-admin-open');
  if(!adminButton)return;
  const toolbar=adminButton.closest('.pet-admin-toolbar');
  if(!toolbar||toolbar.querySelector('.pet-force-refresh'))return;
  const refresh=document.createElement('button');
  refresh.type='button';
  refresh.className='pet-force-refresh';
  refresh.textContent='↻ 強制更新';
  refresh.setAttribute('aria-label','管理者用：キャッシュを使わず最新版を再読み込み');
  refresh.title='読み込み済みのもんすたでぃ資源をネットワークから取り直して再読み込みします';
  refresh.addEventListener('click',()=>forceRefresh(refresh));
  toolbar.appendChild(refresh);
}

function cleanForceRefreshMarker(){
  const url=new URL(location.href);
  if(!url.searchParams.has('_fresh'))return;
  url.searchParams.delete('_fresh');
  history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}

function installHomeUi(){
  cleanForceRefreshMarker();
  updateHomeHeroCopy();
  installVersionBadge();
  installForceRefreshButton();
  new MutationObserver(()=>installForceRefreshButton()).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomeUi,{once:true});
else installHomeUi();

