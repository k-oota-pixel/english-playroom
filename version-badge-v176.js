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
import './pet-lifecycle-v141.js?v=2.1.47';
import './pet-egg-ui-v141.js?v=1.8.4';
import './pet-six-species-v141.js?v=2.1.9';
import './pet-eye-emphasis-v144.js?v=1.9.6';
import './pet-cat-dog-v1425.js?v=1.5.7';
// Cat and dog artwork are rendered directly by pet-art.js; no late redraw.
// Sleep mode now owns original and cloned eye visibility together.
import './pet-lion-v149.js?v=2.1.25';
import './pet-play-menu-v164.js?v=2.1.25';
import './material-return.js?v=4.0.0';

queueMicrotask(()=>import('./pet-admin-panel.js?v=2.1.9').then(()=>import('./pet-admin-limit-v1420.js?v=1.6.2')).catch(error=>console.error('Admin pet panel failed to load',error)));

const APP_VERSION='2.1.58';

function updateHomeHeroCopy(){
  const heading=document.querySelector('.hero-intro h1');
  if(!heading)return;
  heading.textContent='今日はどの教材を使う？？';
}

function installTodayCard(){
  const section=document.getElementById('materials-reading');
  const cards=section?.querySelector('.cards');
  if(!section||!cards||cards.querySelector('[data-today-card]'))return;
  const link=document.createElement('a');
  link.className='card task';
  link.href='./today/';
  link.dataset.todayCard='1';
  link.innerHTML='<div class="eyebrow">DAILY ENGLISH NEWS</div><div class="title">TODAY<span class="eiken-badge">4級〜準1級</span></div><div class="desc">世界を、自分の英語で読む。興味・進路に合わせたニュースを5段階の英文で読み比べ。</div><div class="chips"><span class="chip">6ニュース</span><span class="chip">5レベル</span><span class="chip">おすすめ・アーカイブ</span></div><div class="open-note">今日の英語ニュースを読む</div>';
  cards.prepend(link);
  const count=section.querySelector('.material-group-head > span');
  if(count)count.textContent=`${cards.querySelectorAll(':scope > .card').length}教材`;
}

function installVersionBadge(){
  const logo=document.querySelector('.logo');
  if(!logo)return;
  if(!logo.textContent.trim().startsWith('もんすたでぃ'))return;
  logo.dataset.versionBadgeInstalled='1';

  if(!document.getElementById('appVersionBadgeStyle')){
    const style=document.createElement('style');
    style.id='appVersionBadgeStyle';
    style.textContent='.logo{display:flex;align-items:baseline;gap:7px}.app-version-badge{font-size:9px;letter-spacing:.02em;font-weight:700;color:#8a9b94;white-space:nowrap}';
    document.head.appendChild(style);
  }

  const badge=logo.querySelector('.app-version-badge')||document.createElement('span');
  badge.className='app-version-badge';
  badge.textContent=`ver${APP_VERSION}`;
  badge.setAttribute('aria-label',`version ${APP_VERSION}`);
  logo.appendChild(badge);
}

function installHomeUi(){updateHomeHeroCopy();installTodayCard();installVersionBadge();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomeUi,{once:true});
else installHomeUi();
