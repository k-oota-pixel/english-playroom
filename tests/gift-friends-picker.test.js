import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const gifts=readFileSync(new URL('../pet-gifts.js',import.meta.url),'utf8');
const friends=readFileSync(new URL('../pet-friends.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function harness(getFriends){
 const map=new Map();
 const element=(tag='div')=>({
  tag,children:[],textContent:'',value:'',disabled:false,style:{},
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=[...children]},
  setAttribute(name,value){this[name]=value}
 });
 for(const id of ['giftFriendSelect','giftFriendNote','giftRecipient','giftSearchText','giftResults','giftSendNow','giftFriendReload','giftSendNotice'])map.set('#'+id,element());
 const dialog={open:true,querySelector:id=>map.get(id)||null};
 const calls=[];
 const window={
  addEventListener(){},
  monstudyFriendsGetAccepted:async(force)=>{calls.push(force);return getFriends(force);}
 };
 const document={
  readyState:'loading',addEventListener(){},
  createElement:tag=>element(tag),
  querySelector:selector=>map.get(selector)||null
 };
 const context=vm.createContext({window,document,console,crypto:{randomUUID:()=>'uuid'}});
 vm.runInContext(gifts,context);
 context.mockDialog=dialog;
 context.mockUser={uid:'alice',getIdToken:async()=>'mock-token'};
 vm.runInContext("sendDialog=mockDialog;user=mockUser;profile={coins:100};chosen={id:'hat',name:'帽子',price:10};",context);
 return {context,map,calls,element};
}

test('approved friends load using the shared cached accessor and can be selected without a search request',async()=>{
 const h=harness(async()=>[{uid:'bob',nickname:'Bさん',petName:'ぽち'},{uid:'cora',nickname:'Cさん',petName:'さくら'}]);
 await vm.runInContext('loadGiftFriends()',h.context);
 assert.deepEqual(h.calls,[false]);
 const select=h.map.get('#giftFriendSelect');
 assert.equal(select.disabled,false);
 assert.deepEqual(select.children.map(x=>x.value),['','bob','cora']);
 assert.match(select.children[1].textContent,/ぽち.*Bさん/);
 vm.runInContext("chooseGiftRecipient(friendOptions[0],'friend')",h.context);
 assert.equal(vm.runInContext('recipient.uid',h.context),'bob');
 assert.equal(select.value,'bob');
 assert.match(h.map.get('#giftRecipient').textContent,/ぽち.*Bさん/);
 assert.equal(h.map.get('#giftSendNow').disabled,false);
 assert.equal(h.map.get('#giftSearchText').value,'');
});

test('no approved friends leaves search available, and refresh forces shared list update',async()=>{
 let count=0;
 const h=harness(async()=>++count===1?[]:[{uid:'bob',petName:'ぽち',nickname:'Bさん'}]);
 await vm.runInContext('loadGiftFriends()',h.context);
 assert.equal(h.map.get('#giftFriendSelect').disabled,true);
 assert.match(h.map.get('#giftFriendNote').textContent,/承認/);
 await vm.runInContext('loadGiftFriends(true)',h.context);
 assert.deepEqual(h.calls,[false,true]);
 assert.equal(h.map.get('#giftFriendSelect').disabled,false);
});

test('friend UI exposes one accepted-only cached friend list and release bumps entrypoints',()=>{
 assert.match(friends,/window\.monstudyFriendsGetAccepted=async\(force=false\)=>/);
 assert.match(friends,/Array\.isArray\(data\.friends\)\?data\.friends/);
 const version=home.match(/aria-label="version (\d+\.\d+\.\d+)"/)?.[1];
 assert.ok(version,'home badge must contain a release version');
 assert.ok(home.includes('pet-gifts.js?v='+version),'gifts import must be refreshed for this release');
 assert.ok(home.includes('pet-friends.js?v='+version),'friends import must be refreshed for this release');
 assert.ok(home.includes('ver'+version),'visible release badge must match the imports');
});
