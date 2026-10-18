import { emitCareEffects } from './pet-effects.js?v=1.5.1-effects';

let active=null;
const STYLE=`
#petVisual[data-care-reacting] .pet-character,#petVisual[data-care-reacting] .pet-shadow{animation-play-state:paused!important}
#petVisual .pet-care-motion-layer{transform-box:view-box;transform-origin:120px 200px;animation-duration:1.8s;animation-timing-function:ease-in-out;animation-fill-mode:both}
#petVisual[data-care-reacting=music] .pet-care-motion-layer{animation-name:petCareSnack153}
#petVisual[data-care-reacting=jump] .pet-care-motion-layer{animation-name:petCareMeal153}
#petVisual[data-care-reacting=celebrate] .pet-care-motion-layer{animation-name:petCareSpecial153;animation-duration:2.2s}
.pet-care-feedback{position:absolute;left:50%;top:-18px;transform:translateX(-50%);z-index:15;pointer-events:none;white-space:nowrap;padding:5px 9px;border:1px solid #eed398;border-radius:14px;background:#fff9e8;color:#80601f;font:800 12px/1.4 sans-serif;box-shadow:0 2px 6px #57452218}
.pet-care-feedback b{display:inline-block;font-size:23px;vertical-align:middle;margin-right:4px}
@keyframes petCareSnack153{0%,100%{transform:translateY(0) rotate(0)}20%{transform:translateY(-12px) rotate(-9deg) scale(1.04)}40%{transform:translateY(2px) rotate(8deg) scale(1.06,.94)}60%{transform:translateY(-14px) rotate(-7deg)}80%{transform:translateY(0) rotate(6deg)}}
@keyframes petCareMeal153{0%,100%{transform:translateY(0) scale(1)}15%{transform:translateY(5px) scale(1.12,.86)}38%{transform:translateY(-36px) scale(.94,1.08)}62%{transform:translateY(0) scale(1.1,.9)}80%{transform:translateY(-16px)}}
@keyframes petCareSpecial153{0%,100%{transform:translateY(0) scale(1)}12%{transform:translateY(4px) scale(1.08,.9)}30%{transform:translateY(-42px) rotate(-10deg)}48%{transform:translateY(0) scale(1.08,.92)}68%{transform:translateY(-32px) rotate(10deg)}86%{transform:translateY(0) scale(1.06,.94)}}
@media(prefers-reduced-motion:reduce){#petVisual .pet-care-motion-layer{animation:none!important}}
`;

export function playCareReaction(visual,kind,food){
  active?.stop();
  if(!document.getElementById('petCareAnimation153')){
    const style=document.createElement('style');style.id='petCareAnimation153';style.textContent=STYLE;document.head.append(style);
  }
  visual.dispatchEvent(new CustomEvent('pet-care-reaction'));
  const host=visual.closest('.pet-visual-wrap')||visual;
  const feedback=document.createElement('span');feedback.className='pet-care-feedback';feedback.setAttribute('role','status');
  const icon=document.createElement('b');icon.textContent=food?.icon||'♥';
  feedback.append(icon,document.createTextNode(food?'おいしい！':'うれしい！'));host.append(feedback);
  const started=performance.now(),duration=kind==='celebrate'?2200:1800;
  visual.dataset.careReacting=kind;
  function attach(){
    const character=visual.querySelector('.pet-character');if(!character)return;
    if(character.closest('.pet-care-motion-layer'))return;
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.classList.add('pet-care-motion-layer');
    // A CSS reaction stays independent from the child's walking animation.
    layer.style.animationDelay=`-${Math.max(0,performance.now()-started)}ms`;
    character.parentNode.insertBefore(layer,character);layer.append(character);
  }
  // Snapshot refreshes can replace the rendered character during a transaction.
  const observer=new MutationObserver(attach);observer.observe(visual,{childList:true,subtree:true});attach();
  emitCareEffects(visual,kind);
  let timer;
  const run={stop(){clearTimeout(timer);observer.disconnect();feedback.remove();delete visual.dataset.careReacting;
    visual.querySelectorAll('.pet-care-motion-layer').forEach(layer=>layer.replaceWith(...layer.childNodes));
    if(active===run)active=null;
  }};active=run;timer=setTimeout(()=>run.stop(),Math.max(duration,2400));
}
