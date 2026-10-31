const COPY={
 arrival:{kicker:'ROYAL GUARD · 90F',title:'大ボス・魔王親衛隊が現れた！',text:'魔王のもとへは、通さぬ。',image:'royal-guard-1.svg',button:'決戦を始める'},
 evolve:{kicker:'SECOND FORM · AWAKENING',title:'魔王親衛隊が第2形態に進化！',text:'封印解放――これが真の力だ！',image:'royal-guard-2.svg',button:'第2形態に挑む'},
 victory:{kicker:'ROYAL GUARD DEFEATED',title:'魔王親衛隊をやっつけた！',text:'二つの形態を突破！ HP・MP全回復！',image:'royal-guard-2.svg',button:'次の階へ進む'}
};
export function createGuardPresentation(){
 const overlay=document.createElement('div');overlay.className='guard-cinematic';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','guardCinematicTitle');
 overlay.innerHTML='<div class="guard-rays" aria-hidden="true"></div><div class="guard-sparks" aria-hidden="true"></div><div class="guard-cinematic-card"><p class="guard-kicker"></p><h2 id="guardCinematicTitle"></h2><div class="guard-portrait"><img alt="魔王親衛隊"></div><p class="guard-quote"></p><button type="button"></button></div>';
 document.body.append(overlay);
 const button=overlay.querySelector('button');let pending=null,restoreFocus=null;
 function setTitle(type,data){const heading=overlay.querySelector('h2');heading.textContent=data.title;if(type==='evolve'){heading.replaceChildren(...['魔王親衛隊が','第2形態に進化！'].map(text=>{const span=document.createElement('span');span.className='guard-title-line';span.textContent=text;return span;}));}}
 overlay.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();button.focus();}if(event.key==='Escape')event.preventDefault();});
 button.addEventListener('click',()=>{if(!pending)return;overlay.hidden=true;const resolve=pending;pending=null;if(restoreFocus?.isConnected&&!restoreFocus.disabled)restoreFocus.focus({preventScroll:true});resolve();});
 return {show(type){if(pending)throw Error('A boss presentation is already open');const data=COPY[type];restoreFocus=document.activeElement;overlay.dataset.scene=type;overlay.querySelector('.guard-kicker').textContent=data.kicker;setTitle(type,data);overlay.querySelector('.guard-quote').textContent=data.text;overlay.querySelector('img').src=`./bosses/${data.image}?v=2.3.13`;button.textContent=data.button;overlay.hidden=false;button.focus({preventScroll:true});return new Promise(resolve=>{pending=resolve;});},get open(){return !overlay.hidden;}};
}

