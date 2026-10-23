function installEggUiGuard(){
  const sync=()=>{
    const visual=document.getElementById('petVisual');
    const stage=document.documentElement.dataset.petStage;
    const looksLikeEgg=stage==='egg'||(!stage&&visual?.classList.contains('egg')&&!visual.classList.contains('hatched'));
    if(!looksLikeEgg)return;

    if(visual){
      if(!visual.classList.contains('egg')||visual.querySelector('svg')||visual.textContent!=='🥚')visual.textContent='🥚';
      visual.classList.add('egg');visual.classList.remove('hatched');visual.setAttribute('aria-label','ふしぎなたまご');
    }

    const days=document.getElementById('petDays');
    if(days){days.hidden=true;days.textContent='';}

    const status=document.getElementById('petStatus');
    if(status){status.hidden=false;status.textContent='たまごがもうすぐかえりそう！';}

    const bar=document.getElementById('petBar')?.closest('.pet-bar');
    if(bar)bar.hidden=true;

    const chat=document.getElementById('petChatModal');if(chat)chat.hidden=true;
    const nameButton=document.getElementById('petNameButton');if(nameButton)nameButton.hidden=true;
  };
  sync();setInterval(sync,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installEggUiGuard,{once:true});else installEggUiGuard();
