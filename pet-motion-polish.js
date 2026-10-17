function installPetMotionPolish(){
  if(document.getElementById('petMotionPolishStyles'))return;
  const visual=document.getElementById('petVisual');
  if(!visual){setTimeout(installPetMotionPolish,80);return;}

  // pet-enhancements.js owns the base motion styles. Wait until those exist,
  // then add this sheet afterwards so these refinements always win.
  if(!document.getElementById('petMotionStyles')){
    setTimeout(installPetMotionPolish,80);
    return;
  }

  const style=document.createElement('style');
  style.id='petMotionPolishStyles';
  style.textContent=`
#petVisual.hatched .pet-character{
  animation-name:petWaddleSmooth!important;
  animation-duration:10.2s!important;
  animation-timing-function:linear!important;
  animation-iteration-count:infinite!important;
}
#petVisual.hatched .pet-shadow{
  animation-name:petShadowWalkSmooth!important;
  animation-duration:10.2s!important;
  animation-timing-function:linear!important;
  animation-iteration-count:infinite!important;
}
@keyframes petWaddleSmooth{
  0%,7%{transform:translateX(-18px) translateY(0) rotate(0deg)}
  12%{transform:translateX(-14px) translateY(-2px) rotate(1.3deg)}
  17%{transform:translateX(-10px) translateY(0) rotate(-1.2deg)}
  22%{transform:translateX(-6px) translateY(-2px) rotate(1.1deg)}
  27%{transform:translateX(-2px) translateY(0) rotate(-1deg)}
  32%{transform:translateX(2px) translateY(-2px) rotate(1deg)}
  37%{transform:translateX(6px) translateY(0) rotate(-1deg)}
  42%{transform:translateX(10px) translateY(-2px) rotate(1.1deg)}
  47%{transform:translateX(14px) translateY(0) rotate(-1.1deg)}
  52%,59%{transform:translateX(18px) translateY(0) rotate(0deg)}
  64%{transform:translateX(14px) translateY(-2px) rotate(-1.3deg)}
  69%{transform:translateX(10px) translateY(0) rotate(1.2deg)}
  74%{transform:translateX(6px) translateY(-2px) rotate(-1.1deg)}
  79%{transform:translateX(2px) translateY(0) rotate(1deg)}
  84%{transform:translateX(-2px) translateY(-2px) rotate(-1deg)}
  89%{transform:translateX(-10px) translateY(0) rotate(1deg)}
  93%,100%{transform:translateX(-18px) translateY(0) rotate(0deg)}
}
@keyframes petShadowWalkSmooth{
  0%,7%{transform:translateX(-18px)}
  52%,59%{transform:translateX(18px)}
  93%,100%{transform:translateX(-18px)}
}
@media(prefers-reduced-motion:reduce){
  #petVisual.hatched .pet-character,#petVisual.hatched .pet-shadow{animation:none!important}
}
`;
  document.head.appendChild(style);

  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;

  let blinkTimer=0;
  let secondBlinkTimer=0;

  function eyeGroup(){
    const faceGroup=visual.querySelector('.pet-character > g');
    if(!faceGroup)return null;
    return [...faceGroup.children].find(el=>
      el.tagName?.toLowerCase()==='g' &&
      el.getAttribute('fill')==='#40564e' &&
      !el.hasAttribute('opacity')
    )||null;
  }

  function blinkOnce(){
    if(!visual.classList.contains('hatched')||document.hidden)return;
    const eyes=eyeGroup();
    if(!eyes)return;
    eyes.style.transformBox='fill-box';
    eyes.style.transformOrigin='center center';
    try{
      eyes.animate([
        {transform:'scaleY(1)',offset:0},
        {transform:'scaleY(.06)',offset:.46},
        {transform:'scaleY(.06)',offset:.58},
        {transform:'scaleY(1)',offset:1}
      ],{duration:150,easing:'ease-in-out'});
    }catch{}
  }

  function scheduleBlink(){
    clearTimeout(blinkTimer);
    const delay=4500+Math.random()*6500;
    blinkTimer=setTimeout(()=>{
      blinkOnce();
      clearTimeout(secondBlinkTimer);
      if(Math.random()<.28){
        secondBlinkTimer=setTimeout(blinkOnce,180);
      }
      scheduleBlink();
    },delay);
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){clearTimeout(blinkTimer);clearTimeout(secondBlinkTimer);}
    else scheduleBlink();
  });
  scheduleBlink();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPetMotionPolish,{once:true});
else installPetMotionPolish();
