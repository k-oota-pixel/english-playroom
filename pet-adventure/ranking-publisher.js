import {auth,authReady} from '../coin-reward.js?v=2.1.2';

const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const endpoint='https://task-quest.onrender.com/api/adventure/rankings';
const label=document.getElementById('bestLabel');
let lastValue='',cachedToken='',lastFloor=0,lastPublishedFloor=0,initialized=false,ready=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function floorFromLabel(value){const floor=Number(String(value||'').match(/\d+/)?.[0]||0);return Number.isSafeInteger(floor)&&floor>0?floor:0;}

async function send(token,expectedFloor=0){
 if(!token)return {pending:false};
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mode,expectedFloor}),cache:'no-store',keepalive:true});
 const result=await response.json().catch(()=>({}));
 if(response.status===202&&result.pending)return {pending:true};
 if(!response.ok)throw Error(result.error||'冒険ランキングを同期できませんでした。');
 return {pending:false};
}
async function publish(expectedFloor){
 await authReady;const current=auth.currentUser;if(!current)return;
 cachedToken=await current.getIdToken();
 for(let attempt=0;attempt<4;attempt++){
  const result=await send(cachedToken,expectedFloor);if(!result.pending){lastPublishedFloor=Math.max(lastPublishedFloor,expectedFloor);return;}
  await sleep(700*(attempt+1));
 }
 throw Error('自己ベストの保存完了を待っています。');
}
function schedule(){
 const value=label?.textContent?.trim()||'',floor=floorFromLabel(value);if(!floor||value===lastValue)return;lastValue=value;lastFloor=floor;
 if(!ready)return;
 const checkpoint=mode==='tower'?10:5;
 if(floor%checkpoint===0&&floor>lastPublishedFloor)void publish(floor).catch(error=>console.warn('Adventure ranking sync deferred',error));
}

if(label){new MutationObserver(schedule).observe(label,{childList:true,characterData:true,subtree:true});schedule();}
window.addEventListener('pet-adventure:ready',event=>{ready=true;const floor=floorFromLabel(event.detail?.best||lastFloor);if(!floor)return;lastFloor=floor;lastValue=label?.textContent?.trim()||lastValue;if(!initialized){initialized=true;void publish(floor).catch(error=>console.warn('Adventure ranking sync deferred',error));}});
window.addEventListener('pet-adventure:run-finished',event=>{const floor=floorFromLabel(event.detail?.best||lastFloor);if(floor>lastPublishedFloor){lastFloor=floor;void publish(floor).catch(error=>console.warn('Adventure ranking sync deferred',error));}});
window.addEventListener('pagehide',()=>{if(cachedToken&&lastFloor>lastPublishedFloor)void send(cachedToken,lastFloor).catch(()=>{});});
