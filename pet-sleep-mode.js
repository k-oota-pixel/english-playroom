function installPetSleepMode(){
  const visual=document.getElementById('petVisual');
  if(!visual){setTimeout(installPetSleepMode,100);return;}
  if(visual.dataset.sleepModeInstalled==='1')return;
  visual.dataset.sleepModeInstalled='1';

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let awakeUntil=0;
  let grumpyTimer=0;
  let sleepTimer=0;

  const style=document.createElement('style');
  style.id='petSleepModeStyles';
  style.textContent=`
.pet-visual-wrap{position:relative}
.pet-sleep-zzz,.pet-grumpy-bubble{position:absolute;z-index:4;pointer-events:none;user-select:none;font-weight:900;letter-spacing:.04em}
.pet-sleep-zzz{right:7px;top:7px;color:#705f8f;font-size:12px;opacity:.9;animation:petSleepFloat 2.3s ease-in-out infinite}
.pet-grumpy-bubble{left:5px;top:6px;color:#865445;background:#fff9ea;border:1px solid #e6d5b4;border-radius:999px;padding:3px 7px;font-size:10px;box-shadow:0 2px 7px #4b392018}
@keyframes petSleepFloat{0%,100%{transform:translateY(2px);opacity:.66}50%{transform:translateY(-3px);opacity:1}}
@media(prefers-reduced-motion:reduce){.pet-sleep-zzz{animation:none}}
`;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  const wrap=visual.closest('.pet-visual-wrap');
  const zzz=document.createElement('span');zzz.className='pet-sleep-zzz';zzz.textContent='Z z z…';zzz.hidden=true;zzz.setAttribute('aria-hidden','true');
  const grumpy=document.createElement('span');grumpy.className='pet-grumpy-bubble';grumpy.textContent='むぅ…';grumpy.hidden=true;grumpy.setAttribute('aria-hidden','true');
  if(wrap){wrap.append(zzz,grumpy);}

  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function hashString(value){let h=2166136261;for(const ch of value){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function minutesNow(d){return d.getHours()*60+d.getMinutes();}
  function petIdentity(){return `${document.getElementById('petTitle')?.textContent||''}|${visual.getAttribute('aria-label')||''}`;}
  function napWindow(d){
    const h=hashString(`${dateKey(d)}|${petIdentity()}`);
    const start=13*60+(h%76); // 13:00–14:15
    const duration=35+((h>>>8)%21); // 35–55 min
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

  function eyeGroup(){
    const faceGroup=visual.querySelector('.pet-character > g');
    if(!faceGroup)return null;
    return [...faceGroup.children].find(el=>el.tagName?.toLowerCase()==='g'&&el.getAttribute('fill')==='#40564e'&&!el.hasAttribute('opacity'))||null;
  }
  function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
  function ensureFaceOverlay(kind){
    const character=visual.querySelector('.pet-character');if(!character)return null;
    let overlay=character.querySelector(`:scope > .pet-${kind}-face`);
    if(overlay)return overlay;
    overlay=svgEl('g',{class:`pet-${kind}-face`,fill:'none',stroke:'#40564e','stroke-width':'5','stroke-linecap':'round'});
    if(kind==='sleep'){
      overlay.append(svgEl('path',{d:'M84 109 Q94 117 104 109'}),svgEl('path',{d:'M136 109 Q146 117 156 109'}));
    }else{
      overlay.append(svgEl('path',{d:'M84 105 Q94 112 104 108'}),svgEl('path',{d:'M136 108 Q146 112 156 105'}));
    }
    character.appendChild(overlay);return overlay;
  }
  function ensureSleepLayer(){
    const character=visual.querySelector('.pet-character');if(!character)return null;
    const parent=character.parentNode;
    if(parent?.classList?.contains('pet-sleep-layer'))return parent;
    const layer=svgEl('g',{class:'pet-sleep-layer'});
    layer.style.transformBox='fill-box';layer.style.transformOrigin='center bottom';layer.style.transition='transform .38s ease';
    parent.insertBefore(layer,character);layer.appendChild(character);return layer;
  }
  function setEyes(mode){
    const eyes=eyeGroup();if(eyes)eyes.style.opacity=mode==='normal'?'':'0';
    const sleep=ensureFaceOverlay('sleep'),grumpyFace=ensureFaceOverlay('grumpy');
    if(sleep)sleep.style.display=mode==='sleep'?'':'none';
    if(grumpyFace)grumpyFace.style.display=mode==='grumpy'?'':'none';
  }
  function setMotionPaused(paused){
    const character=visual.querySelector('.pet-character'),shadow=visual.querySelector('.pet-shadow');
    if(character)character.style.animationPlayState=paused?'paused':'';
    if(shadow)shadow.style.animationPlayState=paused?'paused':'';
  }
  function applySleep(){
    if(!visual.classList.contains('hatched'))return;
    const layer=ensureSleepLayer();
    visual.dataset.petSleeping='1';delete visual.dataset.petGrumpy;
    setMotionPaused(true);setEyes('sleep');
    if(layer)layer.style.transform='translateY(8px) rotate(-7deg) scale(.98,.94)';
    const shadow=visual.querySelector('.pet-shadow');if(shadow){shadow.style.opacity='.065';shadow.style.transformOrigin='center';}
    zzz.hidden=false;grumpy.hidden=true;
  }
  function clearSleepPose({resume=true}={}){
    delete visual.dataset.petSleeping;
    const layer=visual.querySelector('.pet-sleep-layer');if(layer)layer.style.transform='none';
    zzz.hidden=true;
    if(resume)setMotionPaused(false);
  }
  function finishGrumpy(){
    delete visual.dataset.petGrumpy;grumpy.hidden=true;setEyes('normal');
    if(shouldSleep())applySleep();else{clearSleepPose({resume:true});}
  }
  function wakeGrumpy(){
    if(visual.dataset.petSleeping!=='1')return;
    awakeUntil=Date.now()+7000;
    clearTimeout(grumpyTimer);clearTimeout(sleepTimer);
    clearSleepPose({resume:false});
    visual.dataset.petGrumpy='1';
    setEyes('grumpy');grumpy.hidden=false;
    const layer=visual.querySelector('.pet-sleep-layer');
    if(layer){
      layer.animate([
        {transform:'translateY(8px) rotate(-7deg) scale(.98,.94)'},
        {transform:'translateY(1px) rotate(2deg) scale(1.02,.98)'},
        {transform:'translateY(0) rotate(0deg) scale(1,1)'}
      ],{duration:420,easing:'ease-out'}).finished.catch(()=>{});
      layer.style.transform='none';
    }
    grumpyTimer=setTimeout(()=>{
      delete visual.dataset.petGrumpy;grumpy.hidden=true;setEyes('normal');setMotionPaused(false);
    },2600);
    sleepTimer=setTimeout(()=>{if(shouldSleep())applySleep();else finishGrumpy();},7200);
  }
  function resetIfNoPet(){
    delete visual.dataset.petSleeping;delete visual.dataset.petGrumpy;zzz.hidden=true;grumpy.hidden=true;setMotionPaused(false);
  }
  function syncState(){
    if(!visual.classList.contains('hatched')){resetIfNoPet();return;}
    if(visual.dataset.petGrumpy==='1')return;
    if(shouldSleep())applySleep();
    else if(visual.dataset.petSleeping==='1'){clearSleepPose({resume:true});setEyes('normal');}
  }

  // Sleeping taps wake the pet before the normal jump handler sees the event.
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('#petVisual'):null;
    if(!target)return;
    if(visual.dataset.petSleeping==='1'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();wakeGrumpy();
    }else if(visual.dataset.petGrumpy==='1'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    }
  },true);

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncState();});
  setInterval(syncState,15000);
  setTimeout(syncState,600);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPetSleepMode,{once:true});
else installPetSleepMode();
