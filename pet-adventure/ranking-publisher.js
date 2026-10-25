import {auth,authReady} from '../coin-reward.js?v=2.1.2';

const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const endpoint='https://task-quest.onrender.com/api/adventure/rankings';
const label=document.getElementById('bestLabel');
let lastValue='',timer=0,cachedToken='',lastFloor=0;
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
  const result=await send(cachedToken,expectedFloor);if(!result.pending)return;
  await sleep(700*(attempt+1));
 }
 throw Error('自己ベストの保存完了を待っています。');
}
function schedule(){
 const value=label?.textContent?.trim()||'',floor=floorFromLabel(value);if(!floor||value===lastValue)return;lastValue=value;lastFloor=floor;
 clearTimeout(timer);timer=setTimeout(()=>{void publish(floor).catch(error=>console.warn('Adventure ranking sync deferred',error));},450);
}

if(label){new MutationObserver(schedule).observe(label,{childList:true,characterData:true,subtree:true});schedule();}
window.addEventListener('pagehide',()=>{clearTimeout(timer);if(cachedToken&&lastFloor)void send(cachedToken,lastFloor).catch(()=>{});});
