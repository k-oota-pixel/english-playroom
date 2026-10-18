import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readDashboardCache,writeDashboardCache} from '../dashboard-cache.js';
import {extraDashboard} from '../dashboard-extra.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const today='2026-10-18';
function harness({storage=new Map(),fetchData=async()=>({})}={}){
 const local={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const els={},listeners={},reads=[];
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))els[id]={textContent:'',classList:{toggle(k,v){this[k]=!!v;},contains(k){return !!this[k];}},addEventListener(type,fn){listeners[id+':'+type]=fn;}};
 const context={...els,extraDashboard,Date,Number,Object,Array,console,Promise,
  localDateKey:()=>today,db:{},dashboardUser:{uid:'a'},petDataUid:null,petData:{},
  readDashboardCache:uid=>readDashboardCache(uid,local),writeDashboardCache:(...args)=>writeDashboardCache(...args,local),
  doc:(db,...parts)=>parts.join('/'),getDoc:async path=>{reads.push(path);const data=await fetchData(path);return {exists:()=>true,data:()=>data};},
  window:{addEventListener:(event,fn)=>{listeners['window:'+event]=fn;}},document:{addEventListener:(event,fn)=>{listeners['document:'+event]=fn;}}};
 vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function dateKeyFromMs'),html.indexOf('loginBtn.addEventListener("click"')),context);
 return {context,els,listeners,reads,storage,local};
}
test('login restores saved display without reads; first login invites manual update',async()=>{
 const h=harness();h.context.showSavedDashboard(h.context.dashboardUser);
 assert.equal(h.reads.length,0);assert.match(h.els.dashNote.textContent,/更新/);assert.equal(h.els.ateruStat.textContent,'—');
 assert.equal(h.listeners['window:focus'],undefined);assert.equal(h.listeners['document:visibilitychange'],undefined);
 await h.listeners['dashRefresh:click']();assert.equal(h.reads.length,7);
 const reloaded=harness({storage:h.storage});reloaded.context.showSavedDashboard(reloaded.context.dashboardUser);
 assert.equal(reloaded.reads.length,0);assert.equal(reloaded.els.ateruStat.textContent,'0回クリア');assert.match(reloaded.els.dashNote.textContent,/前回取得/);
});
test('actual login handler restores cache and runs pet sync without fetching dashboard',async()=>{
 const h=harness();let synced=0,login;
 Object.assign(h.context,{petAuthGeneration:0,petUser:null,petStateSignature:'',auth:{},petMaker:{close(){}},petNameDialog:{close(){}},
  hidePetChatBuiltIn(){},renderPet(){},shortName:()=>'',setAuthUI(){},retryPetSync:async()=>{synced++;},
  onAuthStateChanged:(auth,fn)=>{login=fn;}});
 h.els.authSub.removeAttribute=()=>{};
 vm.runInContext(html.slice(html.indexOf('onAuthStateChanged(auth,async user=>{'),html.indexOf('async function retryPetSync(')),h.context);
 await login({uid:'a'});assert.equal(synced,1);assert.equal(h.reads.length,0);assert.match(h.els.dashNote.textContent,/更新/);
 await login(null);assert.equal(h.els.ateruStat.textContent,'—');assert.equal(h.reads.length,0);
});
test('manual refresh reuses same-user pet snapshot: six reads, both shared subjects preserved',async()=>{
 const h=harness();h.context.petDataUid='a';h.context.petData={wordBreakerBests:{basic:{score:42,combo:12}},pre2InterviewA:{attemptedIds:['1'],lastPlayedDate:today}};
 await h.context.refreshDashboard();assert.equal(h.reads.length,6);assert.ok(h.reads.every(path=>!path.endsWith('/english-playroom')));
 assert.equal(h.els.wordBreakerStat.textContent,'42 SCORE');assert.equal(h.els.interviewStat.textContent,'1 / 20');
 h.context.petDataUid='b';await h.context.refreshDashboard();assert.equal(h.reads.length,13,'another account snapshot must not be reused');
});
test('repeated manual clicks share one read batch and recover after failure',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const h=harness({fetchData:()=>gate});
 const first=h.context.refreshDashboard(),second=h.context.refreshDashboard();assert.equal(h.reads.length,7);
 release({});await Promise.all([first,second]);assert.equal(h.els.dashRefresh.disabled,false);
 await h.context.refreshDashboard();assert.equal(h.reads.length,14);
});
test('logout and account switch ignore old in-flight results and never cache them',async()=>{
 let release;const h=harness({fetchData:()=>new Promise(resolve=>{(release??=[]).push(resolve);})});
 const pending=h.context.refreshDashboard();h.context.dashboardUser=null;h.context.resetDashboard();
 release.forEach(resolve=>resolve({gamesCompleted:999}));await pending;
 assert.equal(h.els.ateruStat.textContent,'—');assert.equal(h.storage.size,0);assert.equal(h.els.dashRefresh.disabled,false);
 h.context.dashboardUser={uid:'b'};h.context.showSavedDashboard(h.context.dashboardUser);assert.equal(h.els.ateruStat.textContent,'—');
});
test('cached daily badges expire at midnight and records remain account-specific',async()=>{
 const h=harness({fetchData:async path=>path.endsWith('/ateru')?{gamesCompleted:3,lastPlayedDate:today}:{}});
 await h.context.refreshDashboard();assert.equal(h.els.todayAteru.classList.contains('done'),true);
 const next=harness({storage:h.storage});next.context.localDateKey=()=>'2026-10-19';next.context.showSavedDashboard(next.context.dashboardUser);
 assert.equal(next.els.ateruStat.textContent,'3回クリア');assert.equal(next.els.todayAteru.classList.contains('done'),false);assert.equal(next.reads.length,0);
 next.context.dashboardUser={uid:'b'};next.context.showSavedDashboard(next.context.dashboardUser);assert.equal(next.els.ateruStat.textContent,'—');
});
test('failed refresh keeps last displayed records and offers retry',async()=>{
 const h=harness();await h.context.refreshDashboard();const cached=[...h.storage];
 h.context.getDoc=async()=>{throw Error('offline');};h.context.console={error(){}};
 await h.context.refreshDashboard();assert.equal(h.els.ateruStat.textContent,'0回クリア');assert.equal(h.els.dashRefresh.disabled,false);assert.match(h.els.dashNote.textContent,/失敗/);assert.deepEqual([...h.storage],cached);
});
test('blocked storage and invalid cache never prevent display or cross accounts',()=>{
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
 assert.equal(readDashboardCache('a',blocked),null);assert.doesNotThrow(()=>writeDashboardCache('a',today,Array(8).fill({main:'0',sub:'',done:false}),blocked));
 const h=harness();h.local.setItem('english-playroom:dashboard:v1:a','bad JSON');h.context.showSavedDashboard(h.context.dashboardUser);assert.equal(h.els.ateruStat.textContent,'—');
 for(const value of [{version:1,uid:'b'}, {version:1,uid:'a',day:today,savedAt:1,entries:Array(8).fill({main:{},sub:'',done:true})}]){
  h.local.setItem('english-playroom:dashboard:v1:a',JSON.stringify(value));assert.equal(readDashboardCache('a',h.local),null);
 }
});
