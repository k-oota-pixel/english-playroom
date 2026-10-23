import {topics} from './topics.js';
import {deal,shuffle,placeCard,removeCard,isCorrect} from './model.js';
const game=document.querySelector('#game'),translation=document.querySelector('#translation');
let japanese=false,phase='setup',count=4,topicQueue=[],topicIndex=-1,numbers=[],order=[],person=0,visible=false,review=null,selected=null,revealed=0,timer=null;
const name=id=>`${id+1}人目`;
function topicHtml(){const t=topics[topicIndex];return `<div class="topic"><h3>${t.question}${japanese?`<span class="ja">${t.ja}</span>`:''}</h3><div class="scale"><div><b>1</b> · ${t.low}${japanese?`<span class="ja">${t.lowJa}</span>`:''}</div><div><b>100</b> · ${t.high}${japanese?`<span class="ja">${t.highJa}</span>`:''}</div></div></div>`;}
function nextRound(){if(!topicQueue.length){topicQueue=shuffle(topics.map((_,i)=>i));if(topicQueue.at(-1)===topicIndex)[topicQueue[0],topicQueue[topicQueue.length-1]]=[topicQueue.at(-1),topicQueue[0]];}topicIndex=topicQueue.pop();numbers=deal(count);order=Array(count).fill(null);person=0;visible=false;review=null;selected=null;revealed=0;phase='deal';render();}
function button(action,text,secondary=false,disabled=false){return `<button ${disabled?'disabled':''} data-action="${action}"${secondary?' class="secondary"':''}>${text}</button>`;}
let translationScreen='';
function render(animateIndex=-1){
const screen=[phase,topicIndex,person,visible,review].join(':');
if(screen!==translationScreen){japanese=false;translationScreen=screen;}
translation.textContent=japanese?'日本語訳を隠す':'日本語訳を表示';translation.setAttribute('aria-pressed',String(japanese));
if(phase==='setup'){game.innerHTML=`<h2 id="heading">みんなで挑戦しよう</h2><ol><li>お題と自分の数字をこっそり確認。</li><li>数字そのものは言わず、その数字に合うものやことを英語で伝えよう。</li><li>相談して、左から小さい順に並べよう！</li></ol><label for="count">プレイ人数</label><select id="count">${Array.from({length:11},(_,i)=>i+2).map(n=>`<option${n===count?' selected':''}>${n}</option>`).join('')}</select><p class="note">お題は全40題。1〜100の数字は重複しません。</p>${button('start','お題を決めてスタート')}`;return;}
if(phase==='deal'||review!==null){const id=review??person;game.innerHTML=`<h2 id="heading">${name(id)}の人${visible?'の数字':'に渡してください'}</h2><p class="progress">${review!==null?'数字の再確認':`${person+1} / ${count}人`}</p>${topicHtml()}${visible?`<div class="number">${numbers[id]}</div><p class="note">数字に合うものを考えよう。ほかの人には数字を見せないでね。</p>${button('hide',review!==null?'隠して話し合いへ戻る':person===count-1?'隠して話し合いへ':'隠して次の人へ')}`:`<p>本人だけが画面を見てから、ボタンを押してください。</p>${button('show','自分の数字を見る')}`}`;return;}
const finished=phase==='result',correct=finished&&isCorrect(order,numbers);
game.innerHTML=`<h2 id="heading">${phase==='talk'?'英語で話して、並べよう':finished?'答え合わせ':'左から数字をめくっています…'}</h2>${topicHtml()}<div class="order-scale"><span>小さい 1</span><span class="scale-arrow" aria-hidden="true">→</span><span>大きい 100</span></div>${phase==='talk'?'<p class="note">点線の枠→下のカードの順にタッチして入れよう。枠の中のカードはタッチで下へ戻せます。ドラッグでも移動・入れ替えできます。</p>':''}<div class="lineup">${order.map((id,i)=>id===null?`<button class="slot${selected===i?' selected':''}" data-slot="${i}" aria-label="空の枠 ${i+1}" aria-pressed="${selected===i}"><span aria-hidden="true">＋</span></button>`:`<button class="player${i<revealed?' revealed':''}${i===animateIndex?' flipping':''}" data-player="${id}" data-slot="${i}" ${phase!=='talk'?'disabled':''} aria-label="${name(id)}${phase==='talk'?'、タッチで下に戻す':''}">${name(id)}${i<revealed?`<strong>${numbers[id]}</strong>`:''}</button>`).join('')}</div>${phase==='talk'?`<div class="pool" data-pool="true" aria-label="まだ配置していないカード"><h3>カード置き場</h3><div class="pool-cards">${numbers.map((_,id)=>id).filter(id=>!order.includes(id)).map(id=>`<button class="player" data-player="${id}">${name(id)}</button>`).join('')||'<p class="note">全員のカードが枠に入りました。カードをここへドラッグすると戻せます。</p>'}</div></div>`:''}<p class="sr-status" role="status">${phase==='talk'?(selected===null?'':'枠を選択中。下のカードをタッチしてください。'):`${revealed} / ${count}人の数字を公開`}</p>${phase==='talk'?`${button('finish','これで完了！',false,order.includes(null))}<h3>数字をもう一度見る</h3><p class="note">確認する人を選んで、その人にタブレットを渡してください。</p><div class="review">${numbers.map((_,id)=>`<button class="secondary" data-review="${id}">${name(id)}</button>`).join('')}</div>`:finished?`<div class="result" role="status">${correct?'🎉 クリア！':'おしい！'}</div>${correct?'<p>みんなで小さい順に並べられたね！</p>':`<p>正しい並びはこちら。</p><p class="correct-order">${[...order].sort((a,b)=>numbers[a]-numbers[b]).map(id=>`${name(id)}（${numbers[id]}）`).join(' → ')}</p>`}${button('next','次のお題へ')}${button('reset','人数選択に戻る',true)}`:''}`;
if(correct){const party=document.createElement('div');party.className='party';party.setAttribute('aria-hidden','true');party.innerHTML='<span class="popper left">🎉</span><span class="popper right">🎉</span>'+Array.from({length:70},(_,i)=>`<i class="confetti" style="--x:${(i*37)%100}%;--color:${['#eabc36','#ed638a','#50ad7b','#6a8de8'][i%4]};--duration:${2+i%3}s;--delay:${-(i%7)/3}s;--drift:${i%2?100:-100}px"></i>`).join('');game.append(party);}
}
let drag=null,suppressClickUntil=0;
game.addEventListener('pointerdown',e=>{
 if(phase!=='talk'||review!==null||e.button!==0)return;
 const card=e.target.closest('[data-player]');if(!card)return;
 drag={id:Number(card.dataset.player),x:e.clientX,y:e.clientY,pointer:e.pointerId,active:false,card,ghost:null};
 card.setPointerCapture(e.pointerId);
});
game.addEventListener('pointermove',e=>{
 if(!drag||drag.pointer!==e.pointerId)return;
 if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10)return;
 if(!drag.active){drag.active=true;drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=name(drag.id);document.body.append(drag.ghost);drag.card.classList.add('drag-source');}
 e.preventDefault();drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
 const row=game.querySelector('.lineup'),rect=row.getBoundingClientRect();
 if(e.clientY>=rect.top&&e.clientY<=rect.bottom){if(e.clientX<rect.left+40)row.scrollBy(-18,0);else if(e.clientX>rect.right-40)row.scrollBy(18,0);}
 game.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot],[data-pool]');target?.classList.add('drop-target');
});
function endDrag(e,cancelled=false){
 if(!drag||drag.pointer!==e.pointerId)return;
 const current=drag;drag=null;current.ghost?.remove();current.card.classList.remove('drag-source');
 if(current.card.hasPointerCapture(e.pointerId))current.card.releasePointerCapture(e.pointerId);
 if(!current.active)return;
 suppressClickUntil=Date.now()+400;
 if(!cancelled&&phase==='talk'&&review===null){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot],[data-pool]');if(target?.dataset.slot!==undefined)order=placeCard(order,current.id,Number(target.dataset.slot));else if(target?.dataset.pool!==undefined)order=removeCard(order,current.id);}
 selected=null;render();
}
game.addEventListener('pointerup',e=>endDrag(e));
game.addEventListener('pointercancel',e=>endDrag(e,true));
translation.addEventListener('click',()=>{japanese=!japanese;render();});
game.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||Date.now()<suppressClickUntil)return;
if(b.dataset.review!==undefined&&phase==='talk'){review=Number(b.dataset.review);visible=false;render();return;}
if(phase==='talk'&&review===null){
 if(b.dataset.player!==undefined){const id=Number(b.dataset.player);if(order.includes(id))order=removeCard(order,id);else if(selected!==null){order=placeCard(order,id,selected);selected=null;}render();return;}
 if(b.dataset.slot!==undefined){const slot=Number(b.dataset.slot);selected=selected===slot?null:slot;render();return;}
}
switch(b.dataset.action){case 'start':count=Number(document.querySelector('#count').value);nextRound();break;case 'show':visible=true;render();break;case 'hide':visible=false;if(review!==null)review=null;else if(person<count-1)person++;else phase='talk';render();break;case 'finish':if(phase!=='talk'||order.includes(null))return;document.activeElement?.blur?.();phase='reveal';selected=null;render();timer=setInterval(revealNext,900);break;case 'next':nextRound();break;case 'reset':phase='setup';render();break;}
});
function revealNext(){
 const x=window.scrollX,y=window.scrollY,left=game.querySelector?.('.lineup')?.scrollLeft??0;
 revealed++;
 if(revealed===count){clearInterval(timer);timer=null;phase='result';document.activeElement?.blur?.();}
 render(revealed-1);
 const row=game.querySelector?.('.lineup');if(row)row.scrollLeft=left;
 window.scrollTo?.({left:x,top:y,behavior:'instant'});
}
function conceal(){if(visible){visible=false;render();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)conceal();});window.addEventListener('pagehide',conceal);window.addEventListener('blur',conceal);
render();
