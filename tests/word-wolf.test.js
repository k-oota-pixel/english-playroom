import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound,pairs} from '../word-wolf/model.js';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('each supported group has exactly one minority at every possible seat',()=>{
  for(let count=3;count<=12;count++) for(let seat=0;seat<count;seat++) for(const flip of [.1,.9]){
    const values=[.3,flip,(seat+.5)/count];
    const round=createRound(count,()=>values.shift());
    assert.equal(round.wolf,seat);
    assert.equal(round.words.filter(w=>w===round.minority).length,1);
    assert.equal(round.words.filter(w=>w===round.majority).length,count-1);
    assert.notDeepEqual(round.majority,round.minority);
  }
});
test('invalid group sizes are rejected',()=>{for(const n of [0,2,13,3.5,NaN,'4'])assert.throws(()=>createRound(n),RangeError);});
test('all topic pairs have English and Japanese words',()=>{for(const pair of pairs){assert.equal(pair.length,4);assert.ok(pair.every(w=>typeof w==='string'&&w.length));assert.notEqual(pair[0],pair[2]);}});
test('a full handoff round hides secrets, gates results and resets',()=>{
  let html='',clicks={};const events={};
  const game={set innerHTML(value){html=value;clicks={};},querySelector(){return {focus(){}};}};
  const document={hidden:false,querySelector(selector){return selector==='#game'?game:{value:'4'};},getElementById(id){return {addEventListener(_,fn){clicks[id]=fn;}};},addEventListener(event,fn){events[event]=fn;}};
  const source=readFileSync(new URL('../word-wolf/app.js',import.meta.url),'utf8').replace(/^import .*\r?\n/,'');
  vm.runInNewContext(source,{document,window:{addEventListener(){}},createRound});
  clicks.start();assert.match(html,/1人目の人に/);
  clicks.reveal();assert.match(html,/class="word"/);
  document.hidden=true;events.visibilitychange();assert.doesNotMatch(html,/class="word"/);assert.match(html,/1人目の人に/);
  for(let i=0;i<4;i++){
    clicks.reveal();assert.match(html,/class="word"/);assert.equal(clicks.answer,undefined);
    clicks.hide();assert.doesNotMatch(html,/class="word"/);
    if(i<3)assert.match(html,new RegExp(`${i+2}人目の人に`));
  }
  assert.match(html,/全員の確認/);clicks.check();assert.match(html,/投票は終わりましたか/);
  clicks.cancel();assert.match(html,/全員の確認/);clicks.check();clicks.answer();assert.match(html,/少数派は [1-4]人目/);
  clicks.again();assert.match(html,/プレイ人数/);assert.doesNotMatch(html,/class="answer"/);
});
