function installEggUiGuard(){
  const sync=()=>{
    if(document.documentElement.dataset.petStage!=='egg')return;
    const visual=document.getElementById('petVisual');
    if(visual){
      if(!visual.classList.contains('egg')||visual.querySelector('svg')||visual.textContent!=='🥚')visual.textContent='🥚';
      visual.classList.add('egg');visual.classList.remove('hatched');visual.setAttribute('aria-label','ふしぎなたまご');
    }
    const chat=document.getElementById('petChatModal');if(chat)chat.hidden=true;
    const nameButton=document.getElementById('petNameButton');if(nameButton)nameButton.hidden=true;
  };
  sync();setInterval(sync,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installEggUiGuard,{once:true});else installEggUiGuard();
