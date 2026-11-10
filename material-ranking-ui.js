/* Per-material daily top-three, shared by the shell and standalone exercises. */
const ENDPOINT='https://task-quest.onrender.com/api/learning/material-rankings';
const DEFENSE_BEST_ENDPOINT='https://task-quest.onrender.com/api/adventure/defense-rankings';
const supported=new Set(['word-breaker','ateru','basic-quest','basic-grammar','grammar','eiken-retry','eiken-cloze','eiken-title','reading-training','listening-training','task-quest','talk-quest','pre2-interview-questions','eiken-pre2-interview-a','pet-catch','pet-fishing','today','word-tower','eiken-dungeon','case-talk','pet-chat','pet-instructions','pet-typing-defense-easy','pet-typing-defense-normal','pet-typing-defense-hard']);
const styleId='monstudyMaterialRankStyle';
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function materialRankingAppId(url=location.href){
 let u;try{u=new URL(url,location.href)}catch{return '';}
 const parts=u.pathname.split('/').filter(Boolean);
 if(parts.includes('basic-quest')){
  const mode=u.searchParams.get('mode');if(mode==='basic-grammar'||mode==='grammar')return mode;
  return 'basic-quest';
 }
 if(parts.includes('pet-adventure')){
  if(parts.some(s=>/tower|word-tower/i.test(s)))return 'word-tower';
  if(parts.some(s=>/dungeon|nest|cave/i.test(s)))return 'eiken-dungeon';
 }
 const id=parts.find(x=>supported.has(x));
 return id||'';
}
function styles(){
 if(document.getElementById(styleId))return;
 const s=make('style');s.id=styleId;
 s.textContent=`
 .ms-material-rank-dialog{width:min(460px,calc(100vw - 24px));max-height:85dvh;overflow:auto;box-sizing:border-box;border-radius:18px;border:1px solid #bdcfc0;background:#f9fbf7;color:#183a2f;padding:18px;font:14px/1.6 system-ui,-apple-system,sans-serif;box-shadow:0 15px 55px #091f1b55}
 .ms-material-rank-dialog::backdrop{background:#13251f99}
 .ms-material-rank-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
 .ms-material-rank-head h2{font-size:18px;margin:0}
 .ms-material-rank-dialog button{border:1px solid #a7c2ae;background:#fff;color:#205540;cursor:pointer;border-radius:10px;padding:6px 10px;font:inherit}
 .ms-material-rank-list{padding:0;margin:9px 0;list-style:none}
 .ms-material-rank-list li{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px;padding:10px 5px;border-top:1px solid #d4e2d7}
 .ms-material-rank-list li strong{white-space:nowrap;font-variant-numeric:tabular-nums}
 .ms-material-rank-list li span:nth-child(2){overflow-wrap:anywhere}
 .ms-material-rank-title{display:block;margin-top:3px;font-size:10px;color:#648272}
 .ms-material-rank-cleared{display:block;margin-top:3px;font-size:10px;color:#836011;white-space:nowrap}
 .ms-material-rank-dialog p{font-size:12px;color:#5d7469;margin:7px 0}
 .ms-material-rank-floating{position:fixed;right:12px;bottom:16px;z-index:900;min-height:40px;border:1px solid #8aaf9a;background:#f4faf3;color:#1f5a40;border-radius:999px;padding:9px 13px;box-shadow:0 4px 15px #0003;font:800 12px system-ui,sans-serif;cursor:pointer}
 body[data-screen-theme="dark"] .ms-material-rank-dialog,body[data-theme="dark"] .ms-material-rank-dialog{background:#1b2c23;color:#ecf4ec;border-color:#557763}
 body[data-screen-theme="dark"] .ms-material-rank-dialog p,body[data-theme="dark"] .ms-material-rank-dialog p{color:#c3d7c8}
 body[data-screen-theme="dark"] .ms-material-rank-dialog button,body[data-theme="dark"] .ms-material-rank-dialog button{background:#304a39;color:#f0f8f2;border-color:#729783}
 body[data-screen-theme="dark"] .ms-material-rank-floating,body[data-theme="dark"] .ms-material-rank-floating{background:#284333;color:#eef9f0}
 `;
 document.head.append(s);
}
let dialog=null;
export async function openMaterialRanking(appId){
 if(!supported.has(appId))return;
 styles();
 if(dialog?.open)dialog.close();
 dialog?.remove();
 dialog=make('dialog','ms-material-rank-dialog');
 const head=make('header','ms-material-rank-head');
 const defenseMode=appId==='pet-typing-defense-easy'?'イージー':appId==='pet-typing-defense-normal'?'ノーマル':appId==='pet-typing-defense-hard'?'ハード':'';
 head.append(make('h2','',defenseMode?'🏆 もんすた城の防衛 '+defenseMode+'ランキング':'🏆 本日の取り組みランキング'));
 const close=make('button','','閉じる');close.type='button';close.addEventListener('click',()=>dialog.close());head.append(close);
 dialog.append(head);
 const status=make('p','','ランキングを読み込んでいます…');status.setAttribute('role','status');dialog.append(status);
 dialog.addEventListener('close',()=>{dialog?.remove()},{once:true});
 document.body.append(dialog);dialog.showModal();
 try{
  const {getAuth}=await import('https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37');
  const user=getAuth().currentUser;
  if(!user)throw Error('ログインするとランキングを確認できます。');
  const token=await user.getIdToken();
  const url=defenseMode?DEFENSE_BEST_ENDPOINT+'?mode='+({イージー:'easy',ノーマル:'normal',ハード:'hard'})[defenseMode]:ENDPOINT+'?appId='+encodeURIComponent(appId);
  const response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?AbortSignal.timeout(20000):undefined});
  const data=await response.json();if(!response.ok)throw Error(data.error||'取得に失敗しました。');
  if(!status.isConnected)return;
  const list=Array.isArray(data.leaders)?data.leaders:[];
  status.textContent=defenseMode?'最高クリアステージ TOP3・同じ記録は同順位です。':'学習完了として保存された取り組み数のランキング（日本時間）';
  if(!list.length){dialog.append(make('p','',defenseMode?'まだクリア記録がありません。':'まだ本日の学習記録はありません。'));return;}
  const ol=make('ol','ms-material-rank-list');
  const petButton=item=>{const b=make('button','','ぺっとを見る');b.type='button';b.style.cssText='padding:5px 7px;border:1px solid #9bbda8;border-radius:7px;background:#e8f4eb;color:#24634f;cursor:pointer';b.onclick=()=>{const root=window.parent!==window?window.parent:window;root.monstudyPetView?.(item.uid);};return b;};
  for(const [i,item] of list.entries()){
   const li=make('li');
   if(defenseMode){
    const rank=make('span','',String(item.rank||i+1)+'位');
    const name=make('span','',item.petName||'ふしぎなたまご');
    name.append(make('small','ms-material-rank-title','ー'+(item.title||'称号なし')+'ー'));
    const score=make('strong','','第'+Math.max(0,Math.floor(Number(item.floor)||0))+'ステージ');
    if(Number(item.floor)===5)score.append(make('small','ms-material-rank-cleared','★ 完全制覇'));
    li.append(rank,name,score,petButton(item));
   }else{
    li.append(make('span','',['🥇','🥈','🥉'][i]||String(i+1)),make('span','',item.petName||'ふしぎなたまご'),make('strong','',Math.max(0,Math.floor(Number(item.count)||0))+'回'),petButton(item));
   }
   ol.append(li);
  }
  dialog.append(ol);
  dialog.append(make('p','',defenseMode?'週間称号は、最高記録とは別に日別の取り組み数から判定されます。':'週間称号は、1週間で4日以上、この教材の最終1位を獲得すると解放されます。'));
 }catch(error){if(status.isConnected)status.textContent=error.message||'ランキングを読み込めませんでした。'}
}
function inShellFrame(){
 try{return window!==window.top&&window.parent?.MonstudyShell?.owns?.(window)}catch{return false}
}
export function installStandaloneMaterialRanking(){
 if(typeof document==='undefined'||inShellFrame())return;
 const id=materialRankingAppId();if(!id)return;
 const launch=()=>{
  if(document.getElementById('monstudyStandaloneMaterialRanking'))return;
  styles();
  const button=make('button','ms-material-rank-floating','🏆 ランキング');button.id='monstudyStandaloneMaterialRanking';button.type='button';
  button.addEventListener('click',()=>openMaterialRanking(id));document.body.append(button);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
}
