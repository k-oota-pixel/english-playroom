// Pet resurvey was retired in v1.5.31.
// Keep only the base pet motion styles that pet-motion-polish.js builds on.
function installPetMotion(){
  if(document.getElementById('petMotionStyles'))return;
  const style=document.createElement('style');
  style.id='petMotionStyles';
  style.textContent=`#petVisual.hatched{cursor:pointer}#petVisual.hatched .pet-character{transform-box:fill-box;transform-origin:center bottom;animation:petWaddle 8.4s ease-in-out infinite}#petVisual.hatched .pet-shadow{transform-box:fill-box;transform-origin:center;animation:petShadowWalk 8.4s ease-in-out infinite}#petVisual.hatched.pet-hop .pet-character{animation:petHop .68s cubic-bezier(.2,.75,.25,1) 1}@keyframes petWaddle{0%,8%{transform:translateX(-17px) translateY(0) rotate(-1deg)}13%{transform:translateX(-11px) translateY(-2px) rotate(1.6deg)}18%{transform:translateX(-5px) translateY(0) rotate(-1.3deg)}23%{transform:translateX(1px) translateY(-2px) rotate(1.5deg)}28%{transform:translateX(7px) translateY(0) rotate(-1.2deg)}33%{transform:translateX(13px) translateY(-2px) rotate(1.4deg)}40%,52%{transform:translateX(17px) translateY(0) rotate(0)}57%{transform:translateX(11px) translateY(-2px) rotate(-1.6deg)}62%{transform:translateX(5px) translateY(0) rotate(1.3deg)}67%{transform:translateX(-1px) translateY(-2px) rotate(-1.5deg)}72%{transform:translateX(-7px) translateY(0) rotate(1.2deg)}77%{transform:translateX(-13px) translateY(-2px) rotate(-1.4deg)}84%,100%{transform:translateX(-17px) translateY(0) rotate(0)}}@keyframes petShadowWalk{0%,8%{transform:translateX(-17px)}40%,52%{transform:translateX(17px)}84%,100%{transform:translateX(-17px)}}@keyframes petHop{0%{transform:translateY(0) scale(1)}18%{transform:translateY(3px) scale(1.04,.96)}48%{transform:translateY(-25px) scale(.98,1.04)}72%{transform:translateY(0) scale(1.04,.96)}100%{transform:translateY(0) scale(1)}}@media(prefers-reduced-motion:reduce){#petVisual.hatched .pet-character,#petVisual.hatched .pet-shadow{animation:none!important}}`;
  document.head.append(style);
  const visual=document.getElementById('petVisual');
  if(!visual)return;
  let timer=0;
  visual.addEventListener('click',()=>{
    if(!visual.classList.contains('hatched')||visual.dataset.petCareEnabled==='1')return;
    visual.classList.remove('pet-hop');
    void visual.offsetWidth;
    visual.classList.add('pet-hop');
    clearTimeout(timer);
    timer=setTimeout(()=>visual.classList.remove('pet-hop'),720);
  });
}

function boot(){installPetMotion();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
