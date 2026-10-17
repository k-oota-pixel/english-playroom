function installInPlacePetJump(){
  const visual=document.getElementById('petVisual');
  if(!visual||visual.dataset.inPlaceJumpInstalled==='1')return;
  visual.dataset.inPlaceJumpInstalled='1';

  let jumping=false;

  function ensureJumpLayer(character){
    const parent=character.parentNode;
    if(parent?.classList?.contains('pet-jump-layer'))return parent;
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('class','pet-jump-layer');
    layer.style.transformBox='fill-box';
    layer.style.transformOrigin='center bottom';
    parent.insertBefore(layer,character);
    layer.appendChild(character);
    return layer;
  }

  function primeJumpLayer(){
    if(visual.dataset.petSleeping==='1'||visual.dataset.petGrumpy==='1')return;
    const character=visual.querySelector('.pet-character');
    if(!character)return;
    if(character.parentNode?.classList?.contains('pet-jump-layer'))return;
    ensureJumpLayer(character);
  }
  primeJumpLayer();
  const primeTimer=setInterval(primeJumpLayer,100);
  window.addEventListener('pagehide',()=>clearInterval(primeTimer),{once:true});

  visual.addEventListener('click',async event=>{
    if(!visual.classList.contains('hatched'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(jumping||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;

    const character=visual.querySelector('.pet-character');
    const shadow=visual.querySelector('.pet-shadow');
    if(!character)return;

    jumping=true;
    visual.classList.remove('pet-hop');
    character.style.animationPlayState='paused';
    if(shadow)shadow.style.animationPlayState='paused';

    const isBaby=document.documentElement.dataset.petStage==='baby';
    const height=isBaby?-18:-25;
    const duration=isBaby?610:680;
    const jumpLayer=ensureJumpLayer(character);
    const jump=jumpLayer.animate([
      {transform:'translateY(0px) scale(1,1)',offset:0},
      {transform:'translateY(3px) scale(1.035,.965)',offset:.18},
      {transform:`translateY(${height}px) scale(.985,1.035)`,offset:.5},
      {transform:'translateY(0px) scale(1.035,.965)',offset:.78},
      {transform:'translateY(0px) scale(1,1)',offset:1}
    ],{duration,easing:'cubic-bezier(.2,.75,.25,1)'});

    const shadowJump=shadow?.animate([
      {opacity:.09,transform:'scale(1)'},
      {opacity:.045,transform:`scale(${isBaby?.8:.72})`},
      {opacity:.09,transform:'scale(1)'}
    ],{duration,easing:'ease-in-out'});

    try{await jump.finished;}catch{}
    try{shadowJump?.cancel();}catch{}
    character.style.animationPlayState='';
    if(shadow)shadow.style.animationPlayState='';
    jumping=false;
  },true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installInPlacePetJump,{once:true});
else installInPlacePetJump();
