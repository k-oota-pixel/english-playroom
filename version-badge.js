import './pet-jump-fix.js';

const APP_VERSION='1.3.3';

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
