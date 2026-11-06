import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../material-return.js',import.meta.url),'utf8')
 .replace(/^import .*;\s*$/gm,'')
 .replaceAll('import.meta.url',"'https://k-oota-pixel.github.io/english-playroom/material-return.js'");

class FakeElement{
 constructor(name){this.name=name;this.children=[];this.events={};this.hidden=false;this.style={};this.textContent='';this.className='';}
 append(...children){this.children.push(...children);}
 prepend(...children){this.children.unshift(...children);}
 addEventListener(type,callback){(this.events[type]??=[]).push(callback);}
 dispatch(type){for(const callback of this.events[type]||[])callback();}
 setAttribute(name,value){this[name]=value;}
}
test('shared return bar moves typing-defense mode rankings to the right and preserves other lessons',()=>{
 const workspace=new FakeElement('workspace'),frame=new FakeElement('frame'),clicked=[];
 const shell={classList:{contains:kind=>kind==='ms-showing-material'},querySelector:s=>({'.ms-workspace':workspace,'.ms-material':frame})[s]};
 const document={readyState:'complete',head:new FakeElement('head'),getElementById:id=>id==='monstudyShell'?shell:null,createElement:type=>new FakeElement(type)};
 frame.src='https://k-oota-pixel.github.io/english-playroom/pet-typing-defense/?monstudy-release=x';
 const context={document,URL,window:{MonstudyShell:{},addEventListener(){}},
  MutationObserver:class{observe(){} disconnect(){}},
  materialRankingAppId:url=>url.includes('/ateru/')?'ateru':'',
  openMaterialRanking:async id=>clicked.push(id)};
 vm.runInNewContext(source,context);
 const bar=workspace.children[0],regular=bar.children[1],pair=bar.children[2];
 assert.equal(bar.hidden,false);
 assert.equal(regular.hidden,true);
 assert.equal(pair.hidden,false);
 assert.deepEqual(pair.children.map(x=>x.textContent),['🏆 ノーマル','🏆 ハード']);
 for(const button of pair.children)button.dispatch('click');
 assert.deepEqual(clicked,['pet-typing-defense-normal','pet-typing-defense-hard']);
 frame.src='https://k-oota-pixel.github.io/english-playroom/ateru/';
 frame.dispatch('load');
 assert.equal(regular.hidden,false,'original button must be visible for normal lessons');
 assert.equal(pair.hidden,true,'defense buttons must be hidden for other lessons');
});
