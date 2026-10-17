import './pet-jump-fix.js';
import './pet-motion-polish.js';
import './pet-sleep-mode.js';
import './pet-sleep-visibility.js';
import './pet-grumpy-cleanup-v139.js';
import './pet-lifecycle-v141.js';
import './pet-egg-ui-v141.js';
import './pet-six-species-v141.js';
import './pet-eye-emphasis-v144.js';
import './pet-lion-v149.js?v=1.4.11';

queueMicrotask(()=>import('./pet-admin-panel.js').catch(error=>console.error('Admin pet panel failed to load',error)));

const APP_VERSION='1.4.11';

function installVersionBadge(){
  const logo=document.querySelector('.logo');
  if(!logo||logo.dataset.versionBadgeInstalled==='1')return;
  if(logo.textContent.trim()!=='もんすたでぃ')return;
  logo.dataset.versionBadgeInstalled='1';

  if(!document.getElementById('appVersionBadgeStyle')){
    const style=document.createElement('style');
    style.id='appVersionBadgeStyle';
    style.textContent='.logo{display:flex;align-items:baseline;gap:7px}.app-version-badge{font-size:9px;letter-spacing:.02em;font-weight:700;color:#8a9b94;white-space:nowrap}';
    document.head.appendChild(style);
  }

  const badge=document.createElement('span');
  badge.className='app-version-badge';
  badge.textContent=`ver${APP_VERSION}`;
  badge.setAttribute('aria-label',`version ${APP_VERSION}`);
  logo.appendChild(badge);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installVersionBadge,{once:true});
else installVersionBadge();
