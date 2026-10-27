const IDS=['eigo-meter','word-wolf','word-breaker','ateru','basic-quest','eiken-retry','task-quest','eiken-cloze','eiken-title','reading-training','listening-training','pre2-interview-questions','eiken-pre2-interview-a','talk-quest'];
export function recordMaterialOpen({pathname,send,seen}){const id=pathname.split('/').find(part=>IDS.includes(part));if(!id||seen.has(id))return;seen.add(id);try{Promise.resolve(send(id)).catch(()=>{});}catch{}return id;}

function installGroupGameListeningGuard(){
 if(typeof document==='undefined')return;
 const install=()=>{
  const group=document.getElementById('materials-group-games');if(!group)return;
  const cards=group.querySelector('.cards');if(!cards)return;
  const clean=()=>{
   for(const card of cards.querySelectorAll('a.card')){
    const href=card.getAttribute('href')||'';
    const title=card.querySelector('.title')?.textContent||'';
    if(href.includes('listening-training')||/Listening Training/i.test(title))card.remove();
   }
   const count=group.querySelector('.material-group-head>span');
   if(count)count.textContent=`${cards.querySelectorAll(':scope > a.card').length}教材`;
  };
  clean();
  if(group.dataset.listeningGuardInstalled)return;
  group.dataset.listeningGuardInstalled='1';
  new MutationObserver(clean).observe(cards,{childList:true,subtree:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}

installGroupGameListeningGuard();

if(typeof window!=='undefined'&&typeof fetch==='function'){
 const material=window.MonstudyMaterial||(window.MonstudyMaterial={});
 material.recordActivity=appId=>{
  if(!['eigo-meter','word-wolf'].includes(appId))return Promise.resolve({ok:false});
  return fetch('https://task-quest.onrender.com/api/material-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appId}),credentials:'omit',keepalive:true}).catch(()=>({ok:false}));
 };
}
