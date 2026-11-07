import {auth,authReady} from '../coin-reward.js?v=2.1.2';
import {accountSession} from '../auth-session.js?v=2.3.8';
import {TOWER_SEASON_ID} from './tower-season.js?v=2.3.26-hq2';

const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const endpoint='https://task-quest.onrender.com/api/adventure/rankings';
const storagePrefix='monstudy-adventure-ranking-sync:'+mode+':'+(mode==='tower'?TOWER_SEASON_ID:'default');
const lastPublishedFloor=new Map(),pendingMemory=new Map(),inFlight=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function floorFromLabel(value){const floor=Number(String(value||'').match(/\d+/)?.[0]||0);return Number.isSafeInteger(floor)&&floor>0?floor:0;}
function storageKey(uid,type){return storagePrefix+':'+uid+':'+type;}
function getPending(uid){
 let saved=null;
 try{
  const value=JSON.parse(localStorage.getItem(storageKey(uid,'pending'))||'null');
  if(Number.isSafeInteger(value?.floor)&&value.floor>0)saved={floor:value.floor,cleared:value.cleared===true};
 }catch{}
 const memory=pendingMemory.get(uid);
 if(!saved)return memory||null;
 if(!memory)return saved;
 return {floor:Math.max(saved.floor,memory.floor),cleared:saved.cleared||memory.cleared};
}
function rememberPending(uid,floor,cleared){
 const old=getPending(uid),next={floor:Math.max(floor,old?.floor||0),cleared:cleared||old?.cleared===true};
 pendingMemory.set(uid,next);
 try{localStorage.setItem(storageKey(uid,'pending'),JSON.stringify(next));}catch{}
}
function clearPending(uid){
 pendingMemory.delete(uid);
 try{localStorage.removeItem(storageKey(uid,'pending'));}catch{}
}
function clearAcknowledged(uid){
 try{return localStorage.getItem(storageKey(uid,'clear-synced'))==='1';}catch{return false;}
}
function acknowledgeClear(uid){
 try{localStorage.setItem(storageKey(uid,'clear-synced'),'1');}catch{}
}
async function send(token,expectedFloor){
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode,expectedFloor}),cache:'no-store',keepalive:true});
 const result=await response.json().catch(()=>({}));
 if(response.status===202&&result.pending)return {pending:true};
 if(!response.ok)throw Error(result.error||'冒険ランキングを同期できませんでした。');
 return {pending:false};
}
async function publish(uid,expectedFloor,cleared){
 await authReady;
 const current=auth.currentUser;
 if(!current||current.uid!==uid)return;
 const session=await accountSession(current);
 if(session.admin===true){clearPending(uid);return;}
 const token=await current.getIdToken();
 let lastError=null;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const result=await send(token,expectedFloor);
   if(!result.pending){
    lastPublishedFloor.set(uid,Math.max(lastPublishedFloor.get(uid)||0,expectedFloor));
    if(cleared)acknowledgeClear(uid);
    const latest=getPending(uid);
    if(latest&&latest.floor<=expectedFloor&&(!latest.cleared||cleared))clearPending(uid);
    return;
   }
   lastError=Error('自己ベストの保存完了を待っています。');
  }catch(error){lastError=error;}
  if(attempt<3)await sleep(700*(attempt+1));
 }
 throw lastError||Error('冒険ランキングを同期できませんでした。');
}
function requestSync(uid,floor,cleared=false){
 if(!uid||floor<1)return;
 if(floor<=(lastPublishedFloor.get(uid)||0)&&(!cleared||clearAcknowledged(uid)))return;
 rememberPending(uid,floor,cleared);
 const previous=inFlight.get(uid)||Promise.resolve();
 const next=previous.catch(()=>{}).then(async()=>{
  const pending=getPending(uid);
  if(pending)await publish(uid,pending.floor,pending.cleared);
 });
 inFlight.set(uid,next);
 void next.catch(error=>console.warn('Adventure ranking sync deferred',error)).finally(()=>{
  if(inFlight.get(uid)===next)inFlight.delete(uid);
 });
}
window.addEventListener('pet-adventure:run-finished',event=>{
 const uid=auth.currentUser?.uid,floor=floorFromLabel(event.detail?.best);
 const cleared=event.detail?.reason==='clear'&&floor>=100;
 requestSync(uid,floor,cleared);
});
window.addEventListener('pet-adventure:ready',event=>{
 if(event.detail?.rankingEligible===false)return;
 const uid=auth.currentUser?.uid;
 if(!uid)return;
 const pending=getPending(uid),floor=floorFromLabel(event.detail?.best);
 const cleared=event.detail?.cleared===true&&floor>=100;
 // A previously saved full clear is re-published once per user and season.
 // Failed publications remain in local storage for the next game visit.
 if(cleared&&!clearAcknowledged(uid))requestSync(uid,Math.max(floor,pending?.floor||0),true);
 else if(pending)requestSync(uid,pending.floor,pending.cleared);
});
