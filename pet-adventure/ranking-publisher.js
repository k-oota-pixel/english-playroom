import {auth,authReady} from '../coin-reward.js?v=2.1.2';

const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const endpoint='https://task-quest.onrender.com/api/adventure/rankings';
const label=document.getElementById('bestLabel');
let lastValue='',timer=0,cachedToken='';

async function send(token){
 if(!token)return;
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mode}),cache:'no-store',keepalive:true});
 if(!response.ok)throw Error('冒険ランキングを同期できませんでした。');
}
async function publish(){
 await authReady;const current=auth.currentUser;if(!current)return;
 cachedToken=await current.getIdToken();await send(cachedToken);
}
function schedule(){
 const value=label?.textContent?.trim()||'';if(!value||value===lastValue)return;lastValue=value;
 clearTimeout(timer);timer=setTimeout(()=>{void publish().catch(error=>console.warn('Adventure ranking sync deferred',error));},450);
}

if(label){new MutationObserver(schedule).observe(label,{childList:true,characterData:true,subtree:true});schedule();}
window.addEventListener('pagehide',()=>{clearTimeout(timer);if(cachedToken)void send(cachedToken).catch(()=>{});});
