import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {topics} from '../eigo-meter/topics.js';
import {deal,swap,isCorrect,shuffle,placeCard,removeCard} from '../eigo-meter/model.js';
test('only the newly revealed card flips, including the final card',()=>{const h=harness();h.click({action:'start'});for(let i=0;i<4;i++)h.click({action:'hide'});fillSlots(h);h.click({action:'finish'});for(let i=0;i<4;i++){h.tick();const cards=[...h.game.innerHTML.matchAll(/class="player([^"]*)"/g)].map(m=>m[1]);assert.equal(cards.filter(c=>c.includes('flipping')).length,1);assert.ok(cards[i].includes('flipping'));assert.equal(cards.filter(c=>c.includes('revealed')).length,i+1);h.translate();assert.doesNotMatch(h.game.innerHTML,/ flipping/);}});
test('translation is chosen independently for each screen and player',()=>{const h=harness();h.click({action:'start'});h.translate();assert.match(h.game.innerHTML,/class="ja"/);h.click({action:'show'});assert.doesNotMatch(h.game.innerHTML,/class="ja"/);h.translate();h.click({action:'hide'});assert.doesNotMatch(h.game.innerHTML,/class="ja"/);for(let i=1;i<4;i++)h.click({action:'hide'});h.translate();h.click({player:'0'});h.click({player:'1'});assert.match(h.game.innerHTML,/class="ja"/);h.click({review:'0'});assert.doesNotMatch(h.game.innerHTML,/class="ja"/);h.click({action:'show'});h.translate();h.click({action:'hide'});assert.doesNotMatch(h.game.innerHTML,/class="ja"/);h.translate();fillSlots(h);h.click({action:'finish'});assert.doesNotMatch(h.game.innerHTML,/class="ja"/);});
test('40 bilingual topics have complete scales',()=>{assert.equal(topics.length,40);assert.equal(new Set(topics.map(t=>t.question)).size,40);for(const t of topics)for(const value of Object.values(t))assert.ok(value.length);assert.equal(topics[39].high,'love it');});
test('deal unique numbers in range for every supported group size',()=>{for(let n=2;n<=12;n++)for(let i=0;i<100;i++){const a=deal(n);assert.equal(a.length,n);assert.equal(new Set(a).size,n);assert.ok(a.every(v=>v>=1&&v<=100));}assert.throws(()=>deal(1));assert.throws(()=>deal(13));});
test('ordering example and invalid permutations',()=>{const n=[40,3,79,13];assert.ok(isCorrect([1,3,0,2],n));assert.ok(!isCorrect([0,1,2,3],n));assert.ok(!isCorrect([1,1,0,2],n));assert.ok(!isCorrect([1,3,0],n));assert.deepEqual(swap([0,1,2,3],0,1),[1,0,2,3]);});
function harness(){const handlers={},events={};let tick;const game={innerHTML:'',addEventListener(k,f){handlers[k]=f;},append(){}};const translation={setAttribute(){},addEventListener(k,f){handlers.translation=f;}};const document={hidden:false,querySelector(s){return s==='#game'?game:s==='#translation'?translation:{value:'4'};},addEventListener(k,f){events[k]=f;},createElement(){return {setAttribute(){}};}};const context=vm.createContext({document,window:{addEventListener(k,f){events[k]=f;}},topics,deal,shuffle,swap,isCorrect,placeCard,removeCard,setInterval(f){tick=f;return 1;},clearInterval(){tick=null;}});const code=fs.readFileSync(new URL('../eigo-meter/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');vm.runInContext(code,context);return {handlers,game,events,document,context,click(data){handlers.click({target:{closest(){return {dataset:data};}}});},tick(){tick();},translate(){handlers.translation();},get(s){return vm.runInContext(s,context);}};}
test('private handoff, recheck preserves order, translation, reveal and next topic',()=>{const h=harness();h.click({action:'start'});const first=h.get('topicIndex');assert.ok(!h.game.innerHTML.includes('class="number"'));for(let i=0;i<4;i++){h.click({action:'show'});assert.match(h.game.innerHTML,/class="number"/);h.click({action:'hide'});}assert.equal(h.get('phase'),'talk');h.click({player:'0'});h.click({player:'1'});const order=h.get('JSON.stringify(order)');h.click({review:'2'});assert.doesNotMatch(h.game.innerHTML,/class="number"/);h.click({action:'show'});h.events.blur();assert.doesNotMatch(h.game.innerHTML,/class="number"/);h.click({action:'show'});h.click({action:'hide'});assert.equal(h.get('JSON.stringify(order)'),order);h.translate();assert.match(h.game.innerHTML,/どのくらい/);fillSlots(h);h.click({action:'finish'});for(let i=1;i<=4;i++){h.tick();assert.equal(h.get('revealed'),i);}assert.equal(h.get('phase'),'result');h.click({action:'next'});assert.notEqual(h.get('topicIndex'),first);assert.equal(h.get('phase'),'deal');});
test('correct order celebrates after final reveal only',()=>{const h=harness();h.click({action:'start'});for(let i=0;i<4;i++)h.click({action:'hide'});vm.runInContext('order=numbers.map((_,i)=>i).sort((a,b)=>numbers[a]-numbers[b])',h.context);fillSlots(h);h.click({action:'finish'});for(let i=0;i<3;i++)h.tick();assert.doesNotMatch(h.game.innerHTML,/クリア！/);h.tick();assert.match(h.game.innerHTML,/クリア！/);});

function fillSlots(h){for(let i=0;i<4;i++)if(h.get('order['+i+']')===null){h.click({slot:String(i)});h.click({player:String(i)});}}
test('reveals retain viewport and row scroll and leave completion unfocused',()=>{
 const h=harness();h.click({action:'start'});for(let i=0;i<4;i++)h.click({action:'hide'});fillSlots(h);
 let blurred=0;h.document.activeElement={blur(){blurred++;}};
 const positions=[];h.context.window.scrollX=0;h.context.window.scrollY=320;
 h.context.window.scrollTo=position=>positions.push(position);
 const row={scrollLeft:160};h.game.querySelector=()=>row;
 h.click({action:'finish'});assert.equal(blurred,1);
 for(let i=0;i<4;i++)h.tick();
 assert.equal(blurred,2);assert.equal(positions.length,4);
 for(const position of positions){assert.equal(position.top,320);assert.equal(position.left,0);assert.equal(position.behavior,'instant');}
 assert.equal(row.scrollLeft,160);assert.ok(h.game.innerHTML.includes('<div class="order-scale"><span>'+h.get('topics[topicIndex].lowJa')+' 1</span>'));
});
test('pointer drag routes placement, swaps, pool returns, cancellation and suppresses trailing click',()=>{
 const h=harness();h.click({action:'start'});for(let i=0;i<4;i++)h.click({action:'hide'});
 const classList={add(){},remove(){}};let target;
 h.document.body={append(){}};h.document.createElement=()=>({classList,style:{},remove(){}});
 h.document.elementFromPoint=()=>({closest:()=>target});
 h.game.querySelector=()=>({getBoundingClientRect:()=>({top:0,bottom:200,left:0,right:800}),scrollBy(){}});
 h.game.querySelectorAll=()=>[];
 function drag(id,destination,cancel=false){target={dataset:destination,classList};const card={dataset:{player:String(id)},classList,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 const e={button:0,pointerId:1,clientX:100,clientY:100,target:{closest:()=>card},preventDefault(){}};
 h.handlers.pointerdown(e);h.handlers.pointermove({...e,clientX:180});h.handlers[cancel?'pointercancel':'pointerup']({...e,clientX:180});}
 drag(0,{slot:'0'});assert.equal(h.get('order[0]'),0);
 h.click({player:'0'});assert.equal(h.get('order[0]'),0);
 drag(1,{slot:'1'});drag(0,{slot:'1'});assert.equal(h.get('JSON.stringify(order)'),'[1,0,null,null]');
 drag(0,{pool:'true'});assert.equal(h.get('JSON.stringify(order)'),'[1,null,null,null]');
 drag(1,{slot:'3'},true);assert.equal(h.get('JSON.stringify(order)'),'[1,null,null,null]');
});
test('empty slots gate completion, tapping places and returns cards without duplicates',()=>{
 const h=harness();h.click({action:'start'});for(let i=0;i<4;i++)h.click({action:'hide'});
 assert.equal(h.get('JSON.stringify(order)'), '[null,null,null,null]');
 assert.match(h.game.innerHTML,/disabled data-action="finish"/);
 h.click({action:'finish'});assert.equal(h.get('phase'),'talk');
 h.click({slot:'2'});h.click({player:'0'});assert.equal(h.get('order[2]'),0);
 h.click({player:'0'});assert.equal(h.get('order[2]'),null);
 fillSlots(h);assert.equal(h.get('JSON.stringify(order)'),'[0,1,2,3]');
 h.click({action:'finish'});assert.equal(h.get('phase'),'reveal');
});
test('drag placement model handles empty slots, swaps and displacement to pool',()=>{
 let a=[null,null,null,null];a=placeCard(a,0,2);assert.deepEqual(a,[null,null,0,null]);
 a=placeCard(a,1,0);a=placeCard(a,0,0);assert.deepEqual(a,[0,null,1,null]);
 a=placeCard(a,0,3);assert.deepEqual(a,[null,null,1,0]);
 a=placeCard(a,2,2);assert.deepEqual(a,[null,null,2,0]);
 assert.ok(!a.includes(1));a=removeCard(a,0);assert.deepEqual(a,[null,null,2,null]);
 const before=[0,1,2,3];assert.deepEqual(placeCard(before,0,0),before);assert.deepEqual(before,[0,1,2,3]);
 assert.throws(()=>placeCard(a,4,0));assert.throws(()=>placeCard(a,0,-1));
});
