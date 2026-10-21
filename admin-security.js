import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const API='https://task-quest.onrender.com';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function defaultAuth(){for(let i=0;i<40;i++){try{return getAuth();}catch{}await sleep(50);}throw Error('管理画面の認証を初期化できませんでした。');}
const auth=await defaultAuth();

const style=document.createElement('style');
style.textContent=`
.admin-tabs{display:flex;gap:8px;margin:14px 0 10px}.admin-tab{border:1px solid #cfdad3;background:#fff;color:#173b35;border-radius:999px;padding:8px 13px;font-weight:900;cursor:pointer}.admin-tab.active{background:#173b35;color:#fff;border-color:#173b35}.security-panel{display:grid;gap:12px}.security-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.security-title{font-size:20px;font-weight:900}.security-note{font-size:11px;color:#6f7d77}.security-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.security-card{background:#fff;border:1px solid #dfe7e2;border-radius:12px;padding:11px}.security-card .k{font-size:10px;color:#6f7d77;font-weight:800}.security-card .v{font-size:23px;font-weight:950;margin-top:2px}.security-table-wrap{overflow:auto;background:#fff;border:1px solid #dfe7e2;border-radius:12px}.security-table{width:100%;border-collapse:collapse;min-width:760px}.security-table th,.security-table td{padding:9px 10px;border-bottom:1px solid #edf1ee;text-align:left;vertical-align:top}.security-table th{font-size:10px;color:#6f7d77;background:#fafcf9;position:sticky;top:0}.security-table td{font-size:11px}.security-path{font:10px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;max-width:300px}.security-badge{display:inline-block;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900}.security-badge.high{background:#ffe9e5;color:#94372d}.security-badge.medium{background:#fff3d8;color:#8a6217}.security-badge.low{background:#eaf3ef;color:#356457}.security-empty{padding:28px;text-align:center;color:#6f7d77}.security-loading{padding:20px;background:#fff;border:1px solid #dfe7e2;border-radius:12px;color:#6f7d77}
@media(max-width:760px){.security-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.security-card:last-child{grid-column:1/-1}}
`;
document.head.append(style);

const panel=document.getElementById('panel');
const originalChildren=[...panel.children];
const tabs=document.createElement('div');tabs.className='admin-tabs';
const usersTab=document.createElement('button');usersTab.type='button';usersTab.className='admin-tab active';usersTab.textContent='👥 利用者';
const securityTab=document.createElement('button');securityTab.type='button';securityTab.className='admin-tab';securityTab.textContent='🛡 SECURITY';
tabs.append(usersTab,securityTab);panel.prepend(tabs);

const section=document.createElement('section');section.className='security-panel';section.hidden=true;
section.innerHTML=`<div class="security-head"><div><div class="security-title">🛡 SECURITY</div><div class="security-note">高確度の不審アクセスだけを記録します。IPは一部をマスクし、ログは30日を対象にします。</div></div><button id="securityRefresh" class="btn" type="button">↻ セキュリティログ更新</button></div><div id="securityBody" class="security-loading">SECURITYを開くと最新ログを読み込みます。</div>`;
panel.append(section);
const body=section.querySelector('#securityBody'),refresh=section.querySelector('#securityRefresh');
let loading=false,loadedAt=0;

function showUsers(){usersTab.classList.add('active');securityTab.classList.remove('active');section.hidden=true;for(const child of originalChildren)child.hidden=false;}
function showSecurity(){usersTab.classList.remove('active');securityTab.classList.add('active');for(const child of originalChildren)child.hidden=true;section.hidden=false;loadSecurity(false);}
usersTab.onclick=showUsers;securityTab.onclick=showSecurity;refresh.onclick=()=>loadSecurity(true);

function fmtDate(value){const d=new Date(Number(value)||value);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function tokyoDay(value){const d=new Date(Number(value)||value);if(Number.isNaN(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const m=Object.fromEntries(parts.map(part=>[part.type,part.value]));return `${m.year}-${m.month}-${m.day}`;}
function eventTotal(events){return events.reduce((sum,event)=>sum+Math.max(1,Number(event.count)||1),0);}
function card(label,value){const el=document.createElement('div');el.className='security-card';const k=document.createElement('div');k.className='k';k.textContent=label;const v=document.createElement('div');v.className='v';v.textContent=Number(value||0).toLocaleString('ja-JP');el.append(k,v);return el;}
function badge(severity){const el=document.createElement('span');el.className='security-badge '+(severity||'low');el.textContent=severity==='high'?'高':severity==='medium'?'中':'低';return el;}
function td(text,className=''){const cell=document.createElement('td');if(className)cell.className=className;cell.textContent=text;return cell;}
function render(data){
  body.className='';body.replaceChildren();
  const events=Array.isArray(data.events)?data.events:[];
  const todayKey=tokyoDay(Date.now()),today=eventTotal(events.filter(event=>tokyoDay(event.lastSeen)===todayKey));
  const cards=document.createElement('div');cards.className='security-cards';
  cards.append(card('今日',today),card('過去7日',data.summary?.last7Days),card('過去30日',data.summary?.last30Days),card('ブロック',data.summary?.blocked),card('高危険度',data.summary?.high));body.append(cards);
  const note=document.createElement('div');note.className='security-note';note.textContent=`最終更新 ${fmtDate(data.fetchedAt)} ／ 保存対象 ${Number(data.retentionDays||30)}日 ／ 同種の連続アクセスはまとめて記録します。`;body.append(note);
  if(!events.length){const empty=document.createElement('div');empty.className='security-empty';empty.textContent='まだ不審アクセスの記録はありません。';body.append(empty);return;}
  const wrap=document.createElement('div');wrap.className='security-table-wrap';const table=document.createElement('table');table.className='security-table';
  const thead=document.createElement('thead'),hr=document.createElement('tr');for(const h of ['最終検知','危険度','内容','アクセス先','送信元（マスク済）','回数','結果']){const th=document.createElement('th');th.textContent=h;hr.append(th);}thead.append(hr);table.append(thead);
  const tbody=document.createElement('tbody');
  for(const event of events){const tr=document.createElement('tr');tr.append(td(fmtDate(event.lastSeen)));const sev=document.createElement('td');sev.append(badge(event.severity));tr.append(sev,td(event.label||event.category||'不審アクセス'),td(event.samplePath||'—','security-path'),td(event.source||'—'),td(`×${Math.max(1,Number(event.count)||1)}`),td(event.action==='blocked'?'BLOCK':'記録'));tbody.append(tr);}table.append(tbody);wrap.append(table);body.append(wrap);
}
async function loadSecurity(force=false){
  if(loading||!auth.currentUser)return;if(!force&&loadedAt&&Date.now()-loadedAt<30000)return;
  loading=true;refresh.disabled=true;body.className='security-loading';body.textContent='セキュリティログを読み込んでいます…';
  try{const token=await auth.currentUser.getIdToken();const response=await fetch(API+'/api/admin/security',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});let data={};try{data=await response.json();}catch{}if(!response.ok)throw Error(data.error||`セキュリティAPIエラー (${response.status})`);loadedAt=Date.now();render(data);}catch(error){body.className='status error';body.textContent=error.message||'セキュリティログを取得できませんでした。';}finally{loading=false;refresh.disabled=false;}
}
onAuthStateChanged(auth,user=>{if(!user){loadedAt=0;showUsers();body.className='security-loading';body.textContent='SECURITYを開くと最新ログを読み込みます。';}});
