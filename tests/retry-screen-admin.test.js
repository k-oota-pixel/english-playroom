import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('screen report never fetches automatically, caps users at ten, caches and clears on auth changes',async()=>{
 const elements={};const element=()=>({before(){},after(){},replaceChildren(){this.innerHTML='';},innerHTML:'',textContent:'',disabled:false,click(){return this.onclick();}});
 const calls=[],authCallbacks=[];
 const context=vm.createContext({document:{createElement:element},$:id=>elements[id]||=element(),searchQuery:()=>'',allUsers:Array.from({length:15},(_,i)=>({uid:'u'+i,nickname:'Learner '+i})),searchResults:null,generation:1,auth:{},onAuthStateChanged:(_,cb)=>authCallbacks.push(cb),esc:String,fmtDate:String,api:async path=>{calls.push(path);return {users:Array.from({length:10},(_,i)=>({uid:'u'+i,logs:[]}))};}});
 const source=fs.readFileSync(new URL('../admin-ui.js',import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf('const retryLogsButton=')),context);
 assert.equal(calls.length,0);
 await vm.runInContext('retryLogsButton.onclick()',context);assert.equal(calls.length,1);assert.equal(decodeURIComponent(calls[0]).split('uids=')[1].split(',').length,10);
 await vm.runInContext('retryLogsButton.onclick()',context);assert.equal(calls.length,1);
 authCallbacks[0]();await vm.runInContext('retryLogsButton.onclick()',context);assert.equal(calls.length,2);
});
