import { foodArt } from './pet-food-art.js?v=1.8.0';
import { emitCareEffects } from './pet-effects.js?v=touch1812';

let active=null;
const STYLE=`
#petVisual [data-feeding-native-face] path{transform-box:fill-box;transform-origin:center;transition:transform .1s ease-out}
#petVisual [data-feeding-native-face=bird][data-feeding-open] path,#petVisual [data-feeding-native-face=penguin][data-feeding-open] path{transform:scaleY(1.5)}
#petVisual [data-feeding-native-face=hamster][data-feeding-open] path[fill=none]{transform:scaleY(.55)}
#petVisual[data-care-reacting] .pet-character,#petVisual[data-care-reacting] .pet-shadow{animation-play-state:paused!important}
#petVisual .pet-care-motion-layer{transform-box:view-box;transform-origin:120px 200px;animation-duration:1.8s;animation-timing-function:ease-in-out;animation-fill-mode:both}
#petVisual[data-care-reacting=music] .pet-care-motion-layer{animation-name:petCareSnack153}
#petVisual[data-care-reacting=jump] .pet-care-motion-layer{animation-name:petCareMeal153}
#petVisual[data-care-reacting=max] .pet-care-motion-layer{animation-name:petCareSpecial153;animation-duration:2.8s}
#petVisual[data-care-reacting=celebrate] .pet-care-motion-layer{animation-name:petCareSpecial153;animation-duration:2.2s}
.pet-care-feedback{position:absolute;left:50%;top:-18px;transform:translateX(-50%);z-index:15;pointer-events:none;white-space:nowrap;padding:5px 9px;border:1px solid #eed398;border-radius:14px;background:#fff9e8;color:#80601f;font:800 12px/1.4 sans-serif;box-shadow:0 2px 6px #57452218}
.pet-care-feedback b{display:inline-block;font-size:23px;vertical-align:middle;margin-right:4px}
@keyframes petCareSnack153{0%,100%{transform:translateY(0) rotate(0)}20%{transform:translateY(-12px) rotate(-9deg) scale(1.04)}40%{transform:translateY(2px) rotate(8deg) scale(1.06,.94)}60%{transform:translateY(-14px) rotate(-7deg)}80%{transform:translateY(0) rotate(6deg)}}
@keyframes petCareMeal153{0%,100%{transform:translateY(0) scale(1)}15%{transform:translateY(5px) scale(1.12,.86)}38%{transform:translateY(-36px) scale(.94,1.08)}62%{transform:translateY(0) scale(1.1,.9)}80%{transform:translateY(-16px)}}
@keyframes petCareSpecial153{0%,100%{transform:translateY(0) scale(1)}12%{transform:translateY(4px) scale(1.08,.9)}30%{transform:translateY(-42px) rotate(-10deg)}48%{transform:translateY(0) scale(1.08,.92)}68%{transform:translateY(-32px) rotate(10deg)}86%{transform:translateY(0) scale(1.06,.94)}}
@media(prefers-reduced-motion:reduce){#petVisual .pet-care-motion-layer{animation:none!important}}
`;

// Reparenting an SVG node restarts its CSS animation. Retain the walk phase.
function walkPhases(visual){
  return [...visual.querySelectorAll('.pet-character,.pet-shadow')].flatMap(el=>
    el.getAnimations().filter(a=>/^pet(Waddle|Shadow)/.test(a.animationName||'')).map(a=>({el,name:a.animationName,time:a.currentTime})));
}
function restoreWalk(phases){
  for(const {el,name,time} of phases)if(time!=null){
    const target=el.isConnected?el:document.getElementById('petVisual')?.querySelector(el.classList.contains('pet-character')?'.pet-character':'.pet-shadow');
    const walk=target?.getAnimations().find(a=>a.animationName===name);if(walk)walk.currentTime=time;
  }
}
// Pin the rendered walk pose as well as its clock: CSS restarts caused by
// waking, wrappers, or a server redraw must not move the reaction to frame zero.
function pinWalkPose(visual){
 const poses=['.pet-character','.pet-shadow'].map(selector=>{const el=visual.querySelector(selector);if(!el)return null;const css=getComputedStyle(el);return {selector,transform:css.transform,origin:css.transformOrigin,box:css.transformBox,original:['transform','transform-origin','transform-box'].map(key=>[key,el.style.getPropertyValue(key),el.style.getPropertyPriority(key)])};}).filter(Boolean);
 const originals=new Map();
 return {attach(){for(const pose of poses){const el=visual.querySelector(pose.selector);if(!el)continue;if(!originals.has(el))originals.set(el,pose.original);el.style.setProperty('transform',pose.transform,'important');el.style.setProperty('transform-origin',pose.origin,'important');el.style.setProperty('transform-box',pose.box,'important');}},release(){for(const [el,props] of originals)for(const [key,value,priority] of props){if(value)el.style.setProperty(key,value,priority);else el.style.removeProperty(key);}}};
}
function playFeeding(visual,kind,food){
 active?.stop();
 if(!document.getElementById('petCareAnimation153')){const s=document.createElement('style');s.id='petCareAnimation153';s.textContent=STYLE;document.head.append(s);}
 const phases=walkPhases(visual),timers=[];
 visual.dispatchEvent(new CustomEvent('pet-care-reaction'));
 visual.dataset.careReacting='eating';
 const host=visual.closest('.pet-visual-wrap')||visual;
 const plate=document.createElement('div');plate.className='pet-eating-food';plate.setAttribute('role','status');host.append(plate);
 let remaining=3,open=false,finished=false;
 function drawFood(){plate.dataset.remaining=remaining;plate.innerHTML=foodArt(food.id,remaining)+'<span>'+(finished?'ごちそうさま！':'もぐもぐ…')+'</span>';plate.setAttribute('aria-label',food.name+'：'+['食べ終わりました','残り3分の1','残り3分の2','食べ始めます'][remaining]);}
 function attach(){
  const character=visual.querySelector('.pet-character');if(!character)return;
  if(!character.closest('.pet-care-motion-layer')){const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.classList.add('pet-care-motion-layer');character.before(layer);layer.append(character);restoreWalk(phases);}
  const nativeFace=character.querySelector('[data-feeding-native-face]');
  if(nativeFace){nativeFace.toggleAttribute('data-feeding-open',open&&!finished);return;}
  let mouth=character.querySelector('.pet-eating-mouth');
  if(!mouth){
   const cat=character.querySelector('[data-pet-cat-art]'),dog=character.querySelector('[data-pet-dog-art]'),dragon=character.querySelector('[data-pet-dragon-art]');
   const target=cat||dog||dragon||character;
   const [x,y,skin,scale]=cat?[127,165,'#fff5dc',1.4]:dog?[120,134,'#fff7e9',1]:dragon?[120,138,'#fff3d7',1]:[120,146,'#fff3df',1];
   mouth=document.createElementNS('http://www.w3.org/2000/svg','g');mouth.classList.add('pet-eating-mouth');mouth.setAttribute('transform',`translate(${x} ${y}) scale(${scale})`);
   mouth.innerHTML=`<ellipse rx="17" ry="10" fill="${skin}" stroke="none"/><g class="pet-eating-open"><ellipse rx="9" ry="9" fill="#593a32" stroke="#513829" stroke-width="2"/><ellipse cy="5" rx="5" ry="2.5" fill="#ef9c9d" stroke="none"/></g><path class="pet-eating-closed" d="M-8 0 Q0 7 8 0" fill="none" stroke="#513829" stroke-width="2.5" stroke-linecap="round"/>`;
   target.append(mouth);
  }
  mouth.style.display=finished?'none':'';
  mouth.querySelector('.pet-eating-open').style.display=open?'':'none';mouth.querySelector('.pet-eating-closed').style.display=open?'none':'';
 }
 const observer=new MutationObserver(attach);observer.observe(visual,{childList:true,subtree:true});
 drawFood();attach();
 function later(fn,ms){timers.push(setTimeout(fn,ms));}
 for(let bite=0;bite<3;bite++){
  for(const offset of [100,330]){later(()=>{open=true;attach();},bite*700+offset);later(()=>{open=false;attach();},bite*700+offset+130);}
  later(()=>{remaining=2-bite;drawFood();},bite*700+580);
 }
 let feedback;
 later(()=>{finished=true;open=false;drawFood();attach();visual.dataset.careReacting=kind;emitCareEffects(visual,kind);feedback=document.createElement('span');feedback.className='pet-care-feedback';feedback.setAttribute('role','status');feedback.textContent=`満腹度 +${food.price}`;host.append(feedback);},2200);
 const run={stop(){timers.forEach(clearTimeout);observer.disconnect();visual.querySelectorAll('[data-feeding-open]').forEach(el=>el.removeAttribute('data-feeding-open'));plate.remove();feedback?.remove();visual.querySelectorAll('.pet-eating-mouth').forEach(m=>m.remove());const ending=walkPhases(visual);visual.querySelectorAll('.pet-care-motion-layer').forEach(l=>l.replaceWith(...l.childNodes));delete visual.dataset.careReacting;restoreWalk(ending);if(active===run)active=null;}};
 active=run;later(()=>run.stop(),4600);
}
export function playCareReaction(visual,kind,food){
  if(food)return playFeeding(visual,kind,food);
  const phases=walkPhases(visual);
  active?.stop();
  const pose=pinWalkPose(visual);
  if(!document.getElementById('petCareAnimation153')){
    const style=document.createElement('style');style.id='petCareAnimation153';style.textContent=STYLE;document.head.append(style);
  }
  visual.dispatchEvent(new CustomEvent('pet-care-reaction'));
  const host=visual.closest('.pet-visual-wrap')||visual;
  const feedback=document.createElement('span');feedback.className='pet-care-feedback'+(kind==='max'?' pet-care-max':'');feedback.setAttribute('role','status');
  if(food){const icon=document.createElement('b');icon.textContent=food.icon;
    feedback.append(icon,document.createTextNode(`満腹度 +${food.price}`));host.append(feedback);}
  const started=performance.now(),duration=kind==='max'?2800:kind==='celebrate'?2200:1800;
  visual.dataset.careReacting=kind;
  function attach(){
    const character=visual.querySelector('.pet-character');if(!character)return;
    if(character.closest('.pet-care-motion-layer')){pose.attach();restoreWalk(phases);return;}
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.classList.add('pet-care-motion-layer');
    // A CSS reaction stays independent from the child's walking animation.
    layer.style.animationDelay=`-${Math.max(0,performance.now()-started)}ms`;
    character.parentNode.insertBefore(layer,character);layer.append(character);
    restoreWalk(phases);pose.attach();
  }
  // Snapshot refreshes can replace the rendered character during a transaction.
  const observer=new MutationObserver(attach);observer.observe(visual,{childList:true,subtree:true});attach();
  emitCareEffects(visual,kind);
  let timer;
  const run={stop(){clearTimeout(timer);observer.disconnect();feedback.remove();const endingPhases=walkPhases(visual);
    visual.querySelectorAll('.pet-care-motion-layer').forEach(layer=>layer.replaceWith(...layer.childNodes));
    delete visual.dataset.careReacting;restoreWalk(endingPhases);pose.release();
    if(active===run)active=null;
  }};active=run;timer=setTimeout(()=>run.stop(),Math.max(duration,2400));
}
