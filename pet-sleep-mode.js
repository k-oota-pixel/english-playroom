import {GRUMPY_VARIANTS,renderGrumpyEyes} from './pet-grumpy-eyes.js?v=1.8.25';
import {renderCompanionEyes} from './pet-companion-eyes.js?v=1.8.17';

function installPetSleepMode(){
  const visual=document.getElementById('petVisual');
  if(!visual){setTimeout(installPetSleepMode,100);return;}
  if(visual.dataset.sleepModeInstalled==='1')return;
  visual.dataset.sleepModeInstalled='1';

  let awakeUntil=0;
  let grumpyIndex=-1;
  let grumpyTimer=0;
  let sleepTimer=0;

  const style=document.createElement('style');
  style.id='petSleepModeStyles';
  style.textContent=`
.pet-visual-wrap{position:relative}
.pet-sleep-zzz{position:absolute;z-index:8;pointer-events:none;user-select:none;font-weight:900}
.pet-sleep-zzz{right:-3px;top:-8px;width:44px;height:48px;color:#705f8f;filter:drop-shadow(0 2px 2px #fff9)}
.pet-sleep-zzz span{position:absolute;left:3px;bottom:3px;opacity:0;line-height:1;animation:petSleepZFloat 2.4s ease-out infinite}
.pet-sleep-zzz .z1{font-size:14px;animation-delay:0s}
.pet-sleep-zzz .z2{font-size:11px;animation-delay:.72s}
.pet-sleep-zzz .z3{font-size:9px;animation-delay:1.44s}
@keyframes petSleepZFloat{
  0%{transform:translate(0,7px) scale(.86);opacity:0}
  18%{opacity:1}
  72%{opacity:.92}
  100%{transform:translate(22px,-24px) scale(1.14);opacity:0}
}
@media(prefers-reduced-motion:reduce){
  .pet-sleep-zzz span{animation:none;opacity:1}
  .pet-sleep-zzz .z1{left:3px;bottom:4px}.pet-sleep-zzz .z2{left:15px;bottom:17px}.pet-sleep-zzz .z3{left:27px;bottom:29px}
}
`;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  const wrap=visual.closest('.pet-visual-wrap');
  const zzz=document.createElement('span');
  zzz.className='pet-sleep-zzz';
  zzz.innerHTML='<span class="z1">Z</span><span class="z2">z</span><span class="z3">z</span>';
  zzz.hidden=true;
  zzz.setAttribute('aria-hidden','true');
  if(wrap)wrap.append(zzz);

  const swirl=document.createElement('span');
  swirl.className='pet-grumpy-swirl';swirl.hidden=true;swirl.setAttribute('aria-hidden','true');
  swirl.innerHTML='<svg viewBox="0 0 64 64" focusable="false"><g fill="none" stroke="#80728f" stroke-width="3.5" stroke-linecap="round"><path d="M49 17 C43 8 18 10 14 20 C9 31 49 34 52 24 C55 14 19 17 18 29 C17 39 47 42 47 34 C47 28 22 31 24 41 C26 49 41 48 39 43 C37 39 28 44 32 52 L36 57"/></g></svg>';
  if(wrap)wrap.append(swirl);
  const swirlStyle=document.createElement('style');
  swirlStyle.textContent=`.pet-grumpy-swirl{position:absolute;right:5px;top:3px;width:62px;height:64px;z-index:20;pointer-events:none}.pet-grumpy-swirl[hidden]{display:none!important}.pet-grumpy-swirl svg{width:100%;height:100%;animation:petGrumpySwirl 1.1s ease-in-out infinite}@keyframes petGrumpySwirl{0%,100%{transform:translateY(0) rotate(-7deg)}50%{transform:translateY(-3px) rotate(8deg)}}@media(prefers-reduced-motion:reduce){.pet-grumpy-swirl svg{animation:none}}`;
  document.head.append(swirlStyle);

  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function hashString(value){let h=2166136261;for(const ch of value){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function minutesNow(d){return d.getHours()*60+d.getMinutes();}
  function petIdentity(){return `${document.getElementById('petTitle')?.textContent||''}|${visual.getAttribute('aria-label')||''}`;}
  function napWindow(d){
    const h=hashString(`${dateKey(d)}|${petIdentity()}`);
    const start=13*60+(h%76);
    const duration=35+((h>>>8)%21);
    return {start,end:start+duration};
  }
  function sleepPeriod(d=new Date()){
    const minutes=minutesNow(d);
    if(minutes>=23*60+30||minutes<5*60+30)return 'night';
    const nap=napWindow(d);
    if(minutes>=nap.start&&minutes<nap.end)return 'nap';
    return '';
  }
  function shouldSleep(){return !!sleepPeriod()&&Date.now()>=awakeUntil;}

  function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
  function ensureFaceOverlay(kind){
    const character=visual.querySelector('.pet-character');if(!character)return null;
    let overlay=character.querySelector(`.pet-${kind}-face`);
    if(overlay&&kind==='grumpy'&&overlay.dataset.grumpyEyeStyle!==(visual.dataset.grumpyVariant||'musu')){overlay.remove();overlay=null;}
    if(overlay)return overlay;
    const nativeEyes=character.querySelector('[data-cat-eye-style],[data-dog-eye-style]');
    if(kind==='grumpy'){
      const eyes=nativeEyes||character.querySelector('[data-dragon-eye-style],[data-pet-eyes]');
      if(eyes){
        overlay=svgEl('g',{class:'pet-grumpy-face','data-grumpy-eye-style':visual.dataset.grumpyVariant||'musu'});
        const local=svgEl('g',{fill:'none',stroke:nativeEyes||eyes.hasAttribute('data-dragon-eye-style')?'#513829':'#40564e','stroke-width':'4','stroke-linecap':'round'});
        const companion=!!nativeEyes||eyes.hasAttribute('data-dragon-eye-style');
        if(eyes.hasAttribute('data-cat-eye-style'))local.setAttribute('transform',eyes.firstElementChild.getAttribute('transform'));
        local.innerHTML=renderGrumpyEyes(companion?96:94,companion?144:146,companion?106:114,visual.dataset.grumpyVariant||'musu',local.getAttribute('stroke'));
        overlay.append(local);eyes.parentNode.insertBefore(overlay,eyes.nextSibling);return overlay;
      }
    }
    if(kind==='sleep'&&nativeEyes){
      // Use the same eye art and local coordinate system as the sleepy choice.
      overlay=svgEl('g',{class:'pet-sleep-face','data-sleep-eye-style':'sleepy'});
      const local=svgEl('g');
      const catTransform=nativeEyes.hasAttribute('data-cat-eye-style')?nativeEyes.firstElementChild?.getAttribute('transform'):null;
      if(catTransform)local.setAttribute('transform',catTransform);
      local.innerHTML=renderCompanionEyes('sleepy');
      overlay.append(local);
      nativeEyes.parentNode.insertBefore(overlay,nativeEyes.nextSibling);
      return overlay;
    }
    overlay=svgEl('g',{class:`pet-${kind}-face`,fill:'none',stroke:'#40564e','stroke-width':'5','stroke-linecap':'round'});
    if(kind==='sleep'){
      overlay.append(svgEl('path',{d:'M84 109 Q94 117 104 109'}),svgEl('path',{d:'M136 109 Q146 117 156 109'}));
    }else{
      overlay.append(svgEl('path',{d:'M84 110 H104'}),svgEl('path',{d:'M136 110 H156'}));
    }
    character.appendChild(overlay);return overlay;
  }

  function removeSleepLayers(){
    const layers=[...visual.querySelectorAll('.pet-sleep-layer')].reverse();
    for(const layer of layers){
      try{layer.getAnimations().forEach(animation=>animation.cancel());}catch{}
      const parent=layer.parentNode;
      if(!parent)continue;
      while(layer.firstChild)parent.insertBefore(layer.firstChild,layer);
      layer.remove();
    }
  }
  function ensureSleepLayer(){
    const character=visual.querySelector('.pet-character');if(!character)return null;
    if(character.parentNode?.classList?.contains('pet-sleep-layer'))return character.parentNode;
    // Never stack sleep wrappers. Old wrappers are fully removed first.
    removeSleepLayers();
    const currentCharacter=visual.querySelector('.pet-character');if(!currentCharacter)return null;
    const parent=currentCharacter.parentNode;
    const layer=svgEl('g',{class:'pet-sleep-layer'});
    layer.style.transformBox='fill-box';
    layer.style.transformOrigin='center bottom';
    parent.insertBefore(layer,currentCharacter);
    layer.appendChild(currentCharacter);
    return layer;
  }
  function setEyes(mode){
    swirl.hidden=mode!=='grumpy';
    // Both the shared holder and its cloned eye group may carry sleep opacity.
    // Restore every semantic eye group, including clones nested by species art.
    visual.querySelectorAll('[data-pet-eyes],[data-shared-legacy-eyes]').forEach(eyes=>{
      eyes.style.opacity=mode==='normal'?'':'0';
      eyes.style.pointerEvents=mode==='normal'?'':'none';
    });
    const sleep=ensureFaceOverlay('sleep'),grumpyFace=ensureFaceOverlay('grumpy');
    if(sleep)sleep.style.display=mode==='sleep'?'':'none';
    if(grumpyFace)grumpyFace.style.display=mode==='grumpy'?'':'none';
  }
  function setMotionPaused(paused){
    const character=visual.querySelector('.pet-character'),shadow=visual.querySelector('.pet-shadow');
    if(character)character.style.animationPlayState=paused?'paused':'';
    if(shadow)shadow.style.animationPlayState=paused?'paused':'';
  }
  function resetShadow(){
    const shadow=visual.querySelector('.pet-shadow');
    if(!shadow)return;
    shadow.style.opacity='';
    shadow.style.transformOrigin='';
  }
  function applySleep(){
    if(!visual.classList.contains('hatched'))return;
    const layer=ensureSleepLayer();
    visual.dataset.petSleeping='1';delete visual.dataset.petGrumpy;
    setMotionPaused(true);setEyes('sleep');
    if(layer){
      layer.style.transition='transform .38s ease';
      layer.style.transform='translateY(8px) rotate(-7deg) scale(.98,.94)';
    }
    const shadow=visual.querySelector('.pet-shadow');if(shadow){shadow.style.opacity='.065';shadow.style.transformOrigin='center';}
    zzz.hidden=false;
  }
  function clearSleepPose({resume=true,removeLayer=true}={}){
    delete visual.dataset.petSleeping;
    zzz.hidden=true;
    if(removeLayer)removeSleepLayers();
    else{
      const layer=visual.querySelector('.pet-sleep-layer');
      if(layer)layer.style.transform='none';
    }
    resetShadow();
    if(resume)setMotionPaused(false);
  }
  function finishGrumpy(){
    delete visual.dataset.petGrumpy;
    setEyes('normal');
    removeSleepLayers();
    resetShadow();
    if(shouldSleep())applySleep();
    else setMotionPaused(false);
  }
  function wakeGrumpy(){
    if(visual.dataset.petSleeping!=='1')return;
    awakeUntil=Date.now()+7000;
    clearTimeout(grumpyTimer);clearTimeout(sleepTimer);
    delete visual.dataset.petSleeping;
    zzz.hidden=true;
    grumpyIndex=(grumpyIndex+1)%GRUMPY_VARIANTS.length;
    visual.dataset.grumpyVariant=GRUMPY_VARIANTS[grumpyIndex];
    visual.dataset.petGrumpy='1';
    setEyes('grumpy');
    resetShadow();

    const layer=visual.querySelector('.pet-sleep-layer');
    if(layer){
      layer.style.transition='none';
      const reaction=layer.animate([
        {transform:'translateY(8px) rotate(-7deg) scale(.98,.94)',offset:0},
        {transform:'translateY(-3px) rotate(3deg) scale(1.03,.97)',offset:.18},
        {transform:'translateX(-3px) translateY(0) rotate(-2deg)',offset:.35},
        {transform:'translateX(3px) translateY(0) rotate(2deg)',offset:.48},
        {transform:'translateX(-2px) translateY(0) rotate(-1.3deg)',offset:.61},
        {transform:'translateX(2px) translateY(0) rotate(1.2deg)',offset:.73},
        {transform:'translateX(0) translateY(0) rotate(0deg) scale(1)',offset:1}
      ],{duration:720,easing:'ease-out'});
      reaction.finished.catch(()=>{}).finally(()=>removeSleepLayers());
    }else{
      removeSleepLayers();
    }

    grumpyTimer=setTimeout(()=>{
      delete visual.dataset.petGrumpy;
      setEyes('normal');
      removeSleepLayers();
      resetShadow();
      setMotionPaused(false);
    },2000);
    sleepTimer=setTimeout(()=>{if(shouldSleep())applySleep();else finishGrumpy();},7200);
  }
  function resetIfNoPet(){
    delete visual.dataset.petSleeping;delete visual.dataset.petGrumpy;
    zzz.hidden=true;
    removeSleepLayers();
    resetShadow();
    setMotionPaused(false);
  }
  function syncState(){
    if(!visual.classList.contains('hatched')){resetIfNoPet();return;}
    if(visual.dataset.petGrumpy==='1')return;
    if(shouldSleep())applySleep();
    else if(visual.dataset.petSleeping==='1'){
      clearSleepPose({resume:true,removeLayer:true});
      setEyes('normal');
    }else{
      // Defensive cleanup in case an old sleep wrapper survived a previous version.
      removeSleepLayers();
      resetShadow();
    }
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('#petVisual'):null;
    if(!target)return;
    if(visual.dataset.petSleeping==='1'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();wakeGrumpy();
    }else if(visual.dataset.petGrumpy==='1'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)||!event.target.closest?.('#petVisual'))return;
    if(visual.dataset.petSleeping==='1'||visual.dataset.petGrumpy==='1'){
      event.preventDefault();event.stopImmediatePropagation();
      if(visual.dataset.petSleeping==='1')wakeGrumpy();
    }
  },true);

  // Any SVG replacement discards the closed-eye overlay, but leaves sleeping
  // state on the container. Rebuild the pose immediately for every renderer.
  const renderObserver=new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeName?.toLowerCase()==='svg')))syncState();
    if(records.some(record=>record.type==='childList'))setEyes(visual.dataset.petSleeping==='1'?'sleep':visual.dataset.petGrumpy==='1'?'grumpy':'normal');
  });
  renderObserver.observe(visual,{childList:true,subtree:true});
  visual.addEventListener('pet-care-reaction',()=>{
    awakeUntil=Date.now()+7000;
    clearTimeout(grumpyTimer);clearTimeout(sleepTimer);
    delete visual.dataset.petGrumpy;
    clearSleepPose({resume:true,removeLayer:true});
    setEyes('normal');
    sleepTimer=setTimeout(syncState,7200);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncState();});
  setInterval(syncState,15000);
  setTimeout(syncState,600);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPetSleepMode,{once:true});
else installPetSleepMode();
