function installEggUiGuard(){
  if(!document.getElementById('eggUiStableStyles')){
    const style=document.createElement('style');
    style.id='eggUiStableStyles';
    style.textContent=`
html[data-pet-stage="egg"] #petDays,
html[data-pet-stage="egg"] .pet-bar{display:none!important}
html[data-pet-stage="egg"] #petStatus{font-size:0!important;min-height:1.45em}
html[data-pet-stage="egg"] #petStatus::after{content:'たまごがもうすぐかえりそう！';font-size:11.5px;color:#6f6654;line-height:1.45}
@media(max-width:560px){html[data-pet-stage="egg"] #petStatus::after{font-size:10.5px}}
`;
    document.head.appendChild(style);
  }

  const sync=()=>{
    const visual=document.getElementById('petVisual');
    let stage=document.documentElement.dataset.petStage;
    const looksLikeEgg=stage==='egg'||(!stage&&visual?.classList.contains('egg')&&!visual.classList.contains('hatched'));
    if(!looksLikeEgg)return;

    if(!stage){
      document.documentElement.dataset.petStage='egg';
      stage='egg';
    }

    if(visual){
      if(!visual.classList.contains('egg')||visual.querySelector('svg')||visual.textContent!=='🥚')visual.textContent='🥚';
      visual.classList.add('egg');
      visual.classList.remove('hatched');
      visual.setAttribute('aria-label','ふしぎなたまご');
    }

    const days=document.getElementById('petDays');
    if(days){days.hidden=true;days.textContent='';}

    const status=document.getElementById('petStatus');
    if(status&&status.textContent!=='たまごがもうすぐかえりそう！'){
      status.hidden=false;
      status.textContent='たまごがもうすぐかえりそう！';
    }

    const bar=document.getElementById('petBar')?.closest('.pet-bar');
    if(bar)bar.hidden=true;

    const chat=document.getElementById('petChatModal');
    if(chat)chat.hidden=true;
    const nameButton=document.getElementById('petNameButton');
    if(nameButton)nameButton.hidden=true;
  };

  const scheduleSync=()=>queueMicrotask(sync);
  sync();

  document.addEventListener('pet-state-updated',scheduleSync);

  const observer=new MutationObserver(scheduleSync);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-pet-stage']});
  const status=document.getElementById('petStatus');
  if(status)observer.observe(status,{childList:true,characterData:true,subtree:true});
  const days=document.getElementById('petDays');
  if(days)observer.observe(days,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installEggUiGuard,{once:true});
else installEggUiGuard();
