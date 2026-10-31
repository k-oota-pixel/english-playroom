import {authReady as rewardAuthReady} from '../coin-reward.js?v=2.2.3';
import {LEVELS,CATEGORIES,CAREERS,normalizeProfile,recommendedLevel,rankArticles,recommendationReason,countWords,validateArticle} from './model.js?v=1.1.0';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const firebaseConfig={
  apiKey:'AIzaSyCeU9C8JeIl92dAjUIDSIsifNB9ExGlEPc',
  authDomain:'english-playroom-2025.firebaseapp.com',
  projectId:'english-playroom-2025',
  storageBucket:'english-playroom-2025.firebasestorage.app',
  messagingSenderId:'512038602250',
  appId:'1:512038602250:web:00125c30096c9420a85c14'
};
const firebaseApp=initializeApp(firebaseConfig,'today');
const auth=getAuth(firebaseApp);
const db=getFirestore(firebaseApp);

const app=document.getElementById('app');
const dialog=document.getElementById('profileDialog');
const form=document.getElementById('profileForm');
const profileButton=document.getElementById('profileButton');
const profileError=document.getElementById('profileError');
const PROFILE_KEY_PREFIX='monstudy-today-profile-v1';
const BEHAVIOR_KEY_PREFIX='monstudy-today-behavior-v1';
const PROFILE_SYNC_KEY_PREFIX='monstudy-today-profile-synced-v1';
const CACHE_KEY='monstudy-today-news-v1';
const BEGINNER_TITLE_LEVELS=new Set(['5級','4級','3級']);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const saveJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const sessionRead=key=>{try{return sessionStorage.getItem(key);}catch{return null;}};
const sessionWrite=(key,value)=>{try{sessionStorage.setItem(key,value);}catch{}};
const scopedKey=(prefix,uid)=>`${prefix}:${uid||'guest'}`;
const localDate=date=>new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(date);
const dayKey=date=>{const d=new Date(date);return Number.isNaN(d.valueOf())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const categoryInfo=id=>CATEGORIES.find(c=>c.id===id)||{id,label:'ニュース',icon:'📰'};
const displayTitle=(article,level,levelTitle='')=>BEGINNER_TITLE_LEVELS.has(level)?(article.titleJa||article.summaryJa||levelTitle||article.title||''):(levelTitle||article.title||'');
const titleUsesSummary=(article,level)=>BEGINNER_TITLE_LEVELS.has(level)&&!article.titleJa&&Boolean(article.summaryJa);

const emptyBehavior=()=>({read:{},completed:{},bookmarks:{},difficulty:{},categoryReads:{},levelUses:{}});
let currentUser=null;
let profileKey=scopedKey(PROFILE_KEY_PREFIX,'guest');
let behaviorKey=scopedKey(BEHAVIOR_KEY_PREFIX,'guest');
let articles=[];
let profile=normalizeProfile({});
let behavior=emptyBehavior();
let view='today';
let current=null;
let currentLevel=profile.level;
let archiveCategory='all';
let archiveQuery='';

function normalizeBehavior(raw={}){
  return {
    read:raw.read&&typeof raw.read==='object'?raw.read:{},
    completed:raw.completed&&typeof raw.completed==='object'?raw.completed:{},
    bookmarks:raw.bookmarks&&typeof raw.bookmarks==='object'?raw.bookmarks:{},
    difficulty:raw.difficulty&&typeof raw.difficulty==='object'?raw.difficulty:{},
    categoryReads:raw.categoryReads&&typeof raw.categoryReads==='object'?raw.categoryReads:{},
    levelUses:raw.levelUses&&typeof raw.levelUses==='object'?raw.levelUses:{}
  };
}

function waitForAuth(){
  return new Promise(resolve=>{
    let unsubscribe=()=>{};
    unsubscribe=onAuthStateChanged(auth,user=>{unsubscribe();resolve(user);},error=>{console.warn('[TODAY] auth state unavailable',error);unsubscribe();resolve(null);});
  });
}

async function hydrateProfileFromFirestore(){
  if(!currentUser)return;
  const marker=scopedKey(PROFILE_SYNC_KEY_PREFIX,currentUser.uid);
  if(sessionRead(marker)==='1')return;
  try{
    const snap=await getDoc(doc(db,'users',currentUser.uid,'apps','today-profile'));
    if(snap.exists()){
      const remote=snap.data()||{};
      profile=normalizeProfile({
        ...profile,
        interests:Array.isArray(remote.interests)?remote.interests:profile.interests,
        careers:Array.isArray(remote.careers)?remote.careers:profile.careers,
        level:LEVELS.includes(remote.level)?remote.level:profile.level,
        updatedAt:profile.updatedAt||Date.now()
      });
      saveJSON(profileKey,profile);
    }
    sessionWrite(marker,'1');
  }catch(error){
    console.warn('[TODAY] profile read failed; using this device only',error);
  }
}

async function initializeUserState(){
  currentUser=await waitForAuth();
  const uid=currentUser?.uid||'guest';
  profileKey=scopedKey(PROFILE_KEY_PREFIX,uid);
  behaviorKey=scopedKey(BEHAVIOR_KEY_PREFIX,uid);
  profile=normalizeProfile(readJSON(profileKey,{}));
  behavior=normalizeBehavior(readJSON(behaviorKey,emptyBehavior()));
  await hydrateProfileFromFirestore();
  currentLevel=profile.level;
}

async function syncProfileToFirestore(){
  if(!currentUser)return;
  try{
    await setDoc(doc(db,'users',currentUser.uid,'apps','today-profile'),{
      interests:[...profile.interests],
      careers:[...profile.careers],
      level:profile.level,
      updatedAt:serverTimestamp()
    },{merge:true});
    sessionWrite(scopedKey(PROFILE_SYNC_KEY_PREFIX,currentUser.uid),'1');
  }catch(error){
    console.warn('[TODAY] profile write failed; local copy was kept',error);
  }
}

function saveProfile(){
  profile=normalizeProfile(profile);
  saveJSON(profileKey,profile);
  void syncProfileToFirestore();
}
function saveBehavior(){saveJSON(behaviorKey,behavior);}
function hasProfile(){return profile.interests.length>0||profile.careers.length>0||profile.updatedAt>0;}

function buildSurvey(){
  document.getElementById('interestChoices').innerHTML=CATEGORIES.map(c=>`<label><input type="checkbox" name="interest" value="${c.id}"> ${c.icon} ${esc(c.label)}</label>`).join('');
  document.getElementById('careerChoices').innerHTML=CAREERS.map(c=>`<label><input type="checkbox" name="career" value="${c.id}"> ${esc(c.label)}</label>`).join('');
  document.getElementById('levelChoices').innerHTML=LEVELS.map(level=>`<label><input type="radio" name="level" value="${level}"> ${level}</label>`).join('');
  form.querySelectorAll('input[name="interest"]').forEach(input=>input.addEventListener('change',()=>{
    const checked=[...form.querySelectorAll('input[name="interest"]:checked')];
    if(checked.length>5){input.checked=false;profileError.textContent='気になる分野は5つまで選べます。';}else profileError.textContent='';
  }));
}

function openSurvey(){
  profileError.textContent='';
  form.querySelectorAll('input[name="interest"]').forEach(input=>input.checked=profile.interests.includes(input.value));
  form.querySelectorAll('input[name="career"]').forEach(input=>input.checked=profile.careers.includes(input.value));
  const level=form.querySelector(`input[name="level"][value="${CSS.escape(profile.level)}"]`);if(level)level.checked=true;
  const challenge=form.querySelector(`input[name="challenge"][value="${CSS.escape(profile.challenge)}"]`);if(challenge)challenge.checked=true;
  dialog.showModal();
}

form.addEventListener('submit',event=>{
  const submitter=event.submitter;
  if(submitter?.value==='cancel')return;
  event.preventDefault();
  const interests=[...form.querySelectorAll('input[name="interest"]:checked')].map(x=>x.value);
  if(interests.length>5){profileError.textContent='気になる分野は5つまで選べます。';return;}
  profile=normalizeProfile({
    interests,
    careers:[...form.querySelectorAll('input[name="career"]:checked')].map(x=>x.value),
    level:form.querySelector('input[name="level"]:checked')?.value||'準2級',
    challenge:form.querySelector('input[name="challenge"]:checked')?.value||'balanced',
    updatedAt:Date.now()
  });
  currentLevel=profile.level;saveProfile();dialog.close();render();
});
profileButton.addEventListener('click',openSurvey);

async function loadNews(){
  const cached=readJSON(CACHE_KEY,null);
  try{
    const response=await fetch('./news.json?v=2026-10-31-eiken5',{cache:'no-cache',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('news unavailable');
    const data=await response.json();
    const list=(Array.isArray(data)?data:data.articles||[]).filter(validateArticle);
    if(!list.length)throw new Error('empty news');
    articles=list;saveJSON(CACHE_KEY,{articles:list,at:Date.now()});
  }catch(error){
    console.warn('TODAY news load failed',error);
    articles=(cached?.articles||[]).filter(validateArticle);
  }
}

function recordOpen(article){
  const first=!behavior.read[article.id];
  behavior.read[article.id]={at:Date.now(),count:(behavior.read[article.id]?.count||0)+1};
  if(first)behavior.categoryReads[article.category]=(Number(behavior.categoryReads[article.category])||0)+1;
  saveBehavior();
}
function toggleBookmark(article){
  if(behavior.bookmarks[article.id])delete behavior.bookmarks[article.id];else behavior.bookmarks[article.id]={at:Date.now()};
  saveBehavior();renderArticle();
}
function markComplete(article){
 window.EnglishPlayroomCoins?.recordTodayRead?.(article.id,currentLevel,String(article.date).slice(0,10));
 const previous=behavior.completed[article.id]||{};
 if(previous.level===currentLevel||previous.levels?.includes(currentLevel))return;
 behavior.completed[article.id]={at:Date.now(),level:currentLevel,levels:[...new Set([...(previous.levels||[]),...(previous.level?[previous.level]:[]),currentLevel])]};
 saveBehavior();renderArticle();
}
function setDifficulty(article,value){behavior.difficulty[article.id]=value;saveBehavior();renderArticle();}
function useLevel(level){currentLevel=level;behavior.levelUses[level]=(Number(behavior.levelUses[level])||0)+1;saveBehavior();renderArticle(false);}

function hero(){
  const today=new Date();
  return `<section class="hero"><div><span class="eyebrow">DAILY ENGLISH · PERSONALIZED READING</span><h1>TODAY</h1><p>世界を、自分の英語で読む。<br>興味・進路・これまで読んだ記事から、今日のおすすめを選びます。</p></div><div class="hero-side"><div><div class="hero-date">${esc(localDate(today))}</div><div class="hero-level">おすすめの読み始め<strong>${esc(profile.level)}</strong></div></div><button id="heroProfile">おすすめを調整する →</button></div></section>`;
}
function tabs(){return `<nav class="tabs" aria-label="TODAYの表示"><button class="tab ${view==='today'?'active':''}" data-view="today">今日のおすすめ</button><button class="tab ${view==='archive'?'active':''}" data-view="archive">アーカイブ</button><button class="tab ${view==='saved'?'active':''}" data-view="saved">あとで読む</button></nav>`;}

function card(article,index,{personal=true}={}){
  const cat=categoryInfo(article.category);
  const level=recommendedLevel(profile,article,behavior);
  const bookmarked=Boolean(behavior.bookmarks[article.id]);
  const title=displayTitle(article,profile.level);
  const summary=titleUsesSummary(article,profile.level)?'':(article.summaryJa||'');
  return `<button class="news-card ${personal&&index<3?'recommended':''}" data-open="${esc(article.id)}"><div class="category"><span>${cat.icon}</span><span>${esc(cat.label)}</span>${bookmarked?'<span class="bookmark-mark" title="あとで読む">★</span>':''}</div><h3>${esc(title)}</h3>${summary?`<div class="ja">${esc(summary)}</div>`:''}${personal?`<div class="why">${index<3?'✨ あなたへのおすすめ · ':''}${esc(recommendationReason(article,profile,behavior))}</div>`:''}<div class="card-foot"><span>${esc(dayKey(article.date))}</span><span class="badge">${esc(level)}から読む</span></div></button>`;
}

function renderToday(){
  const latest=articles.reduce((max,a)=>Math.max(max,Date.parse(a.date)||0),0);
  const sameDay=articles.filter(a=>(Date.parse(a.date)||0)>=latest-36*3600000);
  const pool=sameDay.length>=6?sameDay:articles;
  const ranked=rankArticles(pool,profile,behavior,6);
  app.innerHTML=hero()+tabs()+`<div class="section-head"><div><h2>今日の6本</h2><p>上位3本はあなた向け。最後の1本には、ときどき新しい分野も混ぜます。</p></div><span class="badge">5級〜準1級</span></div>${ranked.length?`<div class="news-grid">${ranked.map((a,i)=>card(a,i)).join('')}</div>`:'<div class="empty">今日のニュースを準備しています。もう一度開いてみてください。</div>'}`;
  bindHome();
}

function archivePool(){
  const q=archiveQuery.trim().toLowerCase();
  return articles.filter(a=>archiveCategory==='all'||a.category===archiveCategory).filter(a=>!q||[a.title,a.titleJa,a.summaryJa,...(a.tags||[])].join(' ').toLowerCase().includes(q)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function renderArchive(){
  const pool=archivePool();
  app.innerHTML=hero()+tabs()+`<div class="section-head"><div><h2>NEWS ARCHIVE</h2><p>過去の記事も、今の自分に合うレベルで読み直せます。</p></div><span class="badge">${articles.length} stories</span></div><input id="archiveSearch" class="archive-search" type="search" value="${esc(archiveQuery)}" placeholder="AI、宇宙、医療、スポーツ…"><div class="filters"><button class="filter ${archiveCategory==='all'?'active':''}" data-category="all">すべて</button>${CATEGORIES.map(c=>`<button class="filter ${archiveCategory===c.id?'active':''}" data-category="${c.id}">${c.icon} ${esc(c.label)}</button>`).join('')}</div><div id="archiveResults">${pool.length?`<div class="news-grid">${pool.map((a,i)=>card(a,i,{personal:false})).join('')}</div>`:'<div class="empty">条件に合う記事がありません。</div>'}</div>`;
  bindHome();
  const search=document.getElementById('archiveSearch');search.addEventListener('input',()=>{archiveQuery=search.value;renderArchiveResults();});
  app.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{archiveCategory=b.dataset.category;renderArchive();}));
}
function renderArchiveResults(){
  const target=document.getElementById('archiveResults');if(!target)return;const pool=archivePool();
  target.innerHTML=pool.length?`<div class="news-grid">${pool.map((a,i)=>card(a,i,{personal:false})).join('')}</div>`:'<div class="empty">条件に合う記事がありません。</div>';
  target.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openArticle(b.dataset.open)));
}
function renderSaved(){
  const saved=articles.filter(a=>behavior.bookmarks[a.id]).sort((a,b)=>(behavior.bookmarks[b.id]?.at||0)-(behavior.bookmarks[a.id]?.at||0));
  app.innerHTML=hero()+tabs()+`<div class="section-head"><div><h2>あとで読む</h2><p>気になった記事をここに残せます。</p></div></div>${saved.length?`<div class="news-grid">${saved.map((a,i)=>card(a,i,{personal:false})).join('')}</div>`:'<div class="empty">記事の「☆ あとで読む」を押すと、ここに保存されます。</div>'}`;
  bindHome();
}
function bindHome(){
  app.querySelector('#heroProfile')?.addEventListener('click',openSurvey);
  app.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
  app.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openArticle(b.dataset.open)));
}

function openArticle(id){
  const article=articles.find(a=>a.id===id);if(!article)return;
  current=article;
  const suggested=recommendedLevel(profile,article,behavior);
  currentLevel=article.levels[suggested]?.text?suggested:(LEVELS.find(level=>article.levels[level]?.text)||'4級');
  recordOpen(article);renderArticle();window.scrollTo({top:0,behavior:'smooth'});
}
function renderArticle(scroll=true){
  if(!current)return;
  const availableLevels=LEVELS.filter(level=>current.levels[level]?.text);
  if(!current.levels[currentLevel]?.text)currentLevel=availableLevels[0]||'4級';
  const cat=categoryInfo(current.category),content=current.levels[currentLevel]||current.levels['4級']||current.levels['準2級'];
  const completed=Boolean(behavior.completed[current.id]?.levels?.includes(currentLevel)||behavior.completed[current.id]?.level===currentLevel),bookmarked=Boolean(behavior.bookmarks[current.id]),difficulty=behavior.difficulty[current.id];
  const paragraphs=String(content.text).split(/\n\s*\n/).filter(Boolean);
  const heading=displayTitle(current,currentLevel,content.title||current.title);
  const summary=titleUsesSummary(current,currentLevel)?'':(current.summaryJa||'');
  app.innerHTML=`<div class="article"><article class="paper"><button id="backToFeed" class="back">← ${view==='archive'?'アーカイブ':'TODAY'}へ戻る</button><header class="article-heading"><div class="category">${cat.icon} ${esc(cat.label)} · ${esc(dayKey(current.date))}</div><h1>${esc(heading)}</h1>${summary?`<div class="ja-title">${esc(summary)}</div>`:''}</header><div class="levels" aria-label="英文レベル">${availableLevels.map(level=>{const item=current.levels[level],wc=Number(item?.wordCount)||countWords(item?.text||'');return `<button class="level ${level===currentLevel?'active':''}" data-level="${level}">${level}<small>${wc} words</small></button>`;}).join('')}</div><div class="article-text" lang="en">${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div></article><aside class="article-side"><span class="eyebrow">WHY THIS STORY?</span><h3>${esc(recommendationReason(current,profile,behavior))}</h3><p class="side-note">おすすめレベルは目安です。知っているテーマなら上のレベル、難しいテーマなら下のレベルに自由に変えてください。</p><div class="action-stack"><button id="complete" class="side-action ${completed?'done':''}">${completed?'✓ 読了しました':'✓ 読み終わった'}</button><p class="side-note">読了で称号の進捗を記録します。コイン付与はありません。</p><button id="bookmark" class="side-action">${bookmarked?'★ あとで読むに保存済み':'☆ あとで読む'}</button></div><h3 style="margin-top:17px">この${esc(currentLevel)}版は？</h3><div class="difficulty"><button data-difficulty="easy" class="${difficulty==='easy'?'active':''}">簡単</button><button data-difficulty="just" class="${difficulty==='just'?'active':''}">ちょうど</button><button data-difficulty="hard" class="${difficulty==='hard'?'active':''}">難しい</button></div><div class="sources"><h3>Original Sources</h3><p class="side-note">記事本文はTODAY用に独自作成しています。事実確認に使った元情報です。</p>${current.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(s.name)}</a>`).join('')}</div></aside></div>`;
  app.querySelector('#backToFeed').addEventListener('click',()=>{current=null;render();window.scrollTo({top:0});});
  app.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>useLevel(b.dataset.level)));
  app.querySelector('#complete').addEventListener('click',()=>markComplete(current));
  app.querySelector('#bookmark').addEventListener('click',()=>toggleBookmark(current));
  app.querySelectorAll('[data-difficulty]').forEach(b=>b.addEventListener('click',()=>setDifficulty(current,b.dataset.difficulty)));
  if(scroll)window.scrollTo({top:0});
}

function render(){
  if(current){renderArticle();return;}
  if(view==='archive')renderArchive();else if(view==='saved')renderSaved();else renderToday();
}

app.innerHTML='<div class="empty">TODAYを読み込んでいます…</div>';
await initializeUserState();
await rewardAuthReady;
buildSurvey();
await loadNews();
render();
if(!hasProfile())setTimeout(openSurvey,250);

