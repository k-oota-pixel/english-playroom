import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const full=fs.readFileSync(new URL('../auth-session.js',import.meta.url),'utf8');
const source=full.slice(full.indexOf("const API="),full.indexOf('export function onAuthStateChanged')).replaceAll('export ','');
function fixture(sessionResponse=async()=>({ok:true,json:async()=>({registered:true,resetRequired:false})})){
 let now=1000,health=0,sessions=0;
 const saved=new Map();
 const store={getItem:k=>saved.has(k)?saved.get(k):null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
 const context=vm.createContext({
  Date:class extends Date{static now(){return now;}},AbortSignal,localStorage:store,sessionStorage:{removeItem:()=>{}},
  console:{warn:()=>{}},firebaseSignOut:async()=>{},setTimeout:fn=>fn(),
  fetch:async url=>{
   if(url.endsWith('/api/status')){health++;return {ok:true};}
   assert.ok(url.endsWith('/api/account/session'));sessions++;return sessionResponse();
  }
 });
 const api=vm.runInContext('(()=>{'+source+';return {accountSession,clearAccountSessionCache,signOut};})()',context);
 const user=(uid='student',signature='first')=>({uid,metadata:{lastSignInTime:signature},getIdToken:async()=> 'token'});
 return {api,user,store,get health(){return health;},get sessions(){return sessions;},advance:ms=>now+=ms,get size(){return saved.size}};
}
test('twenty simultaneous observers share one admission request and one public wake check',async()=>{
 let release;
 const pending=new Promise(resolve=>release=resolve);
 const f=fixture(async()=>{await pending;return {ok:true,json:async()=>({registered:true})};});
 const u=f.user();
 const values=Array.from({length:20},()=>f.api.accountSession(u));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.sessions,1);assert.equal(f.health,1);
 release();
 assert.equal((await Promise.all(values)).every(v=>v.registered===true),true);
 await f.api.accountSession(u);
 assert.equal(f.sessions,1);
});
test('admission cache is retained across reinitializations but expires after seven days',async()=>{
 const f=fixture(),u=f.user();
 await f.api.accountSession(u);assert.equal(f.sessions,1);
 f.advance(6*24*60*60*1000);
 await f.api.accountSession(f.user());assert.equal(f.sessions,1);
 f.advance(24*60*60*1000+1);
 await f.api.accountSession(f.user());assert.equal(f.sessions,2);
});
test('different users and a new Firebase sign-in signature require new admission checks',async()=>{
 const f=fixture();
 await f.api.accountSession(f.user('a','first'));
 await f.api.accountSession(f.user('b','first'));
 await f.api.accountSession(f.user('a','second'));
 assert.equal(f.sessions,3);
});
test('logout removes the local admission cache',async()=>{
 const f=fixture(),u=f.user();
 await f.api.accountSession(u);assert.equal(f.size,1);
 await f.api.signOut({currentUser:u});assert.equal(f.size,0);
 await f.api.accountSession(u);assert.equal(f.sessions,2);
});
test('temporary network failure is retried, but a denied user is not',async()=>{
 let attempts=0;
 const f=fixture(async()=>{attempts++;return attempts===1?{ok:false,status:503,json:async()=>({error:'unavailable'})}:{ok:true,json:async()=>({registered:true})};});
 assert.equal((await f.api.accountSession(f.user())).registered,true);
 assert.equal(attempts,2);
 const denied=fixture(async()=>({ok:false,status:403,json:async()=>({error:'registration code required'})}));
 await assert.rejects(denied.api.accountSession(denied.user()),{status:403});
 assert.equal(denied.sessions,1);
});
test('password reset admission is never written to the seven-day cache',async()=>{
 const f=fixture(async()=>({ok:true,json:async()=>({registered:true,resetRequired:true})}));
 await f.api.accountSession(f.user());
 assert.equal(f.size,0);
});
