import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {normalizeProfile,rankArticles,validateArticle} from './today/model.js?v=1.1.1';

const firebaseConfig={
  apiKey:'AIzaSyCeU9C8JeIl92dAjUIDSIsifNB9ExGlEPc',
  authDomain:'english-playroom-2025.firebaseapp.com',
  projectId:'english-playroom-2025',
  storageBucket:'english-playroom-2025.firebasestorage.app',
  messagingSenderId:'512038602250',
  appId:'1:512038602250:web:00125c30096c9420a85c14'
};
const PROFILE_KEY_PREFIX='monstudy-today-profile-v1';
const BEHAVIOR_KEY_PREFIX='monstudy-today-behavior-v1';
const NEWS_CACHE_KEY='monstudy-today-news-v2';
const NEWS_URL='./today/news.json?v=2026-11-02-missions';
const scopedKey=(prefix,uid)=>`${prefix}:${uid||'guest'}`;
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const saveJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

function waitForTodayUser(){
  try{
    const app=getApps().find(item=>item.name==='today')||initializeApp(firebaseConfig,'today');
    const auth=getAuth(app);
    return new Promise(resolve=>{
      let settled=false;
      let unsubscribe=()=>{};
      const finish=user=>{if(settled)return;settled=true;clearTimeout(timer);unsubscribe();resolve(user||null);};
      const timer=setTimeout(()=>finish(auth.currentUser),2500);
      unsubscribe=onAuthStateChanged(auth,user=>finish(user),()=>finish(auth.currentUser));
    });
  }catch(error){
    console.warn('[TODAY home] auth state unavailable; using local guest profile',error);
    return Promise.resolve(null);
  }
}

function hasProfile(profile){
  return profile.interests.length>0||profile.careers.length>0||profile.updatedAt>0;
}

function todayPool(list){
  const latest=list.reduce((max,article)=>Math.max(max,Date.parse(article.date)||0),0);
  const sameDay=list.filter(article=>(Date.parse(article.date)||0)>=latest-36*3600000);
  return sameDay.length>=6?sameDay:list;
}

function topRecommendation(list,profile,behavior){
  const pool=todayPool(list);
  return rankArticles(pool,profile,behavior,6)[0]||null;
}

function japaneseTitle(article){
  return String(article?.titleJa||article?.summaryJa||'').replace(/[\r\n]+/g,' ').trim()||'おすすめニュースを読む';
}

function installStyle(){
  if(document.getElementById('todayHomeCardStyle'))return;
  const style=document.createElement('style');
  style.id='todayHomeCardStyle';
  style.textContent=`
.today-news-home-card{box-sizing:border-box;width:100%;margin-top:10px;display:flex!important;flex-direction:column;justify-content:center;min-width:0;text-decoration:none!important;cursor:pointer;overflow:hidden;transition:transform .14s,box-shadow .14s,border-color .14s;color:inherit}
.today-news-home-card:hover{transform:translateY(-1px)}
.today-news-home-card:focus-visible{outline:3px solid #e4af37;outline-offset:3px}
.today-news-home-kicker{display:block;font-size:10px;line-height:1.2;letter-spacing:.13em;font-weight:900;color:inherit;opacity:.72;white-space:nowrap}
.today-news-home-title{display:block;min-width:0;margin-top:8px;font-size:15px;line-height:1.4;font-weight:900;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.today-news-home-meta{display:block;min-width:0;margin-top:8px;font-size:10.5px;line-height:1.35;font-weight:750;color:inherit;opacity:.68;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:760px){.today-news-home-card{margin-top:10px}.today-news-home-title{font-size:14px}}
`;
  document.head.appendChild(style);
}

function createCard(streak){
  const card=document.createElement('a');
  card.id='todayNewsHomeCard';
  card.className='login-streak-bonus today-news-home-card';
  card.href='./today/';
  card.setAttribute('aria-label','TODAYのおすすめニュース');
  card.innerHTML='<span class="today-news-home-kicker">TODAY\'S NEWS</span><strong class="today-news-home-title">おすすめを読み込んでいます…</strong><span class="today-news-home-meta">TODAYから今日の1本を選んでいます</span>';
  streak.insertAdjacentElement('afterend',card);

  const syncHeight=()=>{
    const height=Math.ceil(streak.getBoundingClientRect().height);
    if(height>0)card.style.height=`${height}px`;
  };
  requestAnimationFrame(syncHeight);
  if('ResizeObserver' in window){
    const observer=new ResizeObserver(syncHeight);
    observer.observe(streak);
  }
  return card;
}

function renderUnconfigured(card){
  card.href='./today/?profile=1';
  card.querySelector('.today-news-home-title').textContent='あなた向けのニュースを選ぼう';
  card.querySelector('.today-news-home-meta').textContent='興味・進路を設定する →';
}

function renderRecommendation(card,article){
  if(!article){
    card.href='./today/';
    card.querySelector('.today-news-home-title').textContent='今日のニュースを見にいく';
    card.querySelector('.today-news-home-meta').textContent='TODAYを開く →';
    return;
  }
  card.href=`./today/?article=${encodeURIComponent(article.id)}`;
  const title=japaneseTitle(article);
  const titleEl=card.querySelector('.today-news-home-title');
  titleEl.textContent=title;
  titleEl.title=title;
  card.querySelector('.today-news-home-meta').textContent='✨ あなたへのおすすめ →';
  card.setAttribute('aria-label',`TODAY'S NEWS：${title}`);
}

async function loadFreshNews(){
  try{
    const response=await fetch(NEWS_URL,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const list=(Array.isArray(data)?data:data.articles||[]).filter(validateArticle);
    if(!list.length)throw new Error('empty news');
    saveJSON(NEWS_CACHE_KEY,{articles:list,at:Date.now()});
    return list;
  }catch(error){
    console.warn('[TODAY home] news refresh failed; using cached news',error);
    return [];
  }
}

async function installTodayHomeCard(){
  const streak=document.getElementById('loginStreakBonus');
  if(!streak||document.getElementById('todayNewsHomeCard'))return;
  installStyle();
  const card=createCard(streak);
  const user=await waitForTodayUser();
  const uid=user?.uid||'guest';
  const profile=normalizeProfile(readJSON(scopedKey(PROFILE_KEY_PREFIX,uid),{}));
  const behavior=readJSON(scopedKey(BEHAVIOR_KEY_PREFIX,uid),{});

  if(!hasProfile(profile)){
    renderUnconfigured(card);
    return;
  }

  const cached=readJSON(NEWS_CACHE_KEY,null);
  const cachedArticles=(cached?.articles||[]).filter(validateArticle);
  if(cachedArticles.length)renderRecommendation(card,topRecommendation(cachedArticles,profile,behavior));

  const freshArticles=await loadFreshNews();
  if(freshArticles.length)renderRecommendation(card,topRecommendation(freshArticles,profile,behavior));
  else if(!cachedArticles.length)renderRecommendation(card,null);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void installTodayHomeCard(),{once:true});
else void installTodayHomeCard();
