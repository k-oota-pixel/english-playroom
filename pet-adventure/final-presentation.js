export function createFinalPresentation(){
 const overlay=document.createElement('div');overlay.className='final-cinematic';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','finalSceneTitle');
 overlay.innerHTML='<div class="final-stars" aria-hidden="true"></div><div class="final-rays" aria-hidden="true"></div><div class="final-card"><p class="final-kicker"></p><h2 id="finalSceneTitle"></h2><div class="final-portraits"></div><p class="final-quote"></p><button type="button"></button></div>';
 document.body.append(overlay);const button=overlay.querySelector('button');let pending=null,previousFocus=null;
 button.addEventListener('click',()=>{if(!pending)return;overlay.hidden=true;const resolve=pending;pending=null;if(previousFocus?.isConnected&&!previousFocus.disabled)previousFocus.focus({preventScroll:true});resolve();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();button.focus();}if(event.key==='Escape')event.preventDefault();});
 return {show({id,title,quote,kicker,actors=[],buttonText='戦いを続ける',victory=false}){
  if(pending)throw Error('Final presentation already open');previousFocus=document.activeElement;overlay.dataset.scene=id;overlay.classList.toggle('final-victory',victory);overlay.querySelector('.final-kicker').textContent=kicker;overlay.querySelector('h2').textContent=title;overlay.querySelector('.final-quote').textContent=quote;
  overlay.querySelector('.final-portraits').replaceChildren(...actors.map(a=>{const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=`./bosses/${a.image}?v=2.3.22`;image.alt=a.name;caption.textContent=`${a.name} · 第${a.phase}形態`;figure.append(image,caption);return figure;}));if(id==='game-clear'){const trophy=document.createElement('div');trophy.className='final-trophy';trophy.textContent='🏆';overlay.querySelector('.final-portraits').append(trophy);}button.textContent=buttonText;overlay.hidden=false;button.focus({preventScroll:true});return new Promise(resolve=>{pending=resolve;});
 },get open(){return !overlay.hidden;}};
}

