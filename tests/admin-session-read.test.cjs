const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),authSource=fs.readFileSync(path.join(root,'auth-session.js'),'utf8'),panelSource=fs.readFileSync(path.join(root,'pet-admin-panel.js'),'utf8');
const sessionCode=authSource.slice(authSource.indexOf("const API="),authSource.indexOf('export function onAuthStateChanged')).replaceAll('export ','');
const panelCode=panelSource.slice(panelSource.indexOf('async function verifyAdmin(user)'),panelSource.indexOf('function ensureDialog()'));
function storage(){
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),count:()=>m.size};
}
function fixture(data={admin:false,resetRequired:false}){
 let calls=0,health=0,clock=1000,response=data,fail=false;
 const store=storage(),user={uid:'student',metadata:{lastSignInTime:'first'},getIdToken:async()=> 'test-token'};
 const ctx=vm.createContext({
  Date:class extends Date{static now(){return clock;}},AbortSignal,localStorage:store,sessionStorage:storage(),
  setTimeout:fn=>fn(),console:{warn:()=>{}},firebaseSignOut:async()=>{},
  fetch:async url=>{
   if(url.endsWith('/api/status')){health++;return {ok:true};}
   assert.ok(url.endsWith('/api/account/session'));calls++;
   if(fail)throw Error('offline');
   return {ok:true,json:async()=>response};
  }
 });
 const create=()=>vm.runInContext('(()=>{'+sessionCode+';return {accountSession,signOut,ensureRenderReady};})()',ctx);
 const api=create();ctx.accountSession=api.accountSession;
 vm.runInContext(panelCode,ctx);
 return {user,ctx,api,store,create,get calls(){return calls;},get health(){return health;},
  advance:ms=>clock+=ms,setData:data=>response=data,setFailure:value=>fail=value};
}
test('home and administrator panel share one admission check',async()=>{
 const f=fixture();await f.api.accountSession(f.user);
 for(let i=0;i<10;i++)assert.equal(await f.ctx.verifyAdmin(f.user),false);
 assert.equal(f.calls,1);assert.equal(f.health,1);
});
test('administrator hints are reused without extra Firestore checks for seven days',async()=>{
 const f=fixture({admin:true,resetRequired:false});
 await f.api.accountSession(f.user);f.advance(6*24*60*60*1000);
 assert.equal(await f.ctx.verifyAdmin(f.user),true);
 assert.equal(f.calls,1);
});
test('query-string module aliases share the in-flight request',async()=>{
 const f=fixture(),other=f.create();
 await Promise.all([f.api.accountSession(f.user),other.accountSession(f.user),f.ctx.verifyAdmin(f.user)]);
 assert.equal(f.calls,1);assert.equal(f.health,1);
});
test('missing admin hints and required password resets never enable admin UI',async()=>{
 for(const data of [{},{admin:'true'},{admin:true,resetRequired:true}]){
  const f=fixture(data);assert.equal(await f.ctx.verifyAdmin(f.user),false);
 }
});
test('seven-day expiry and changed Firebase sign-in require a new admission',async()=>{
 const f=fixture({admin:true});
 await f.api.accountSession(f.user);assert.equal(f.calls,1);
 f.advance(6*24*60*60*1000);assert.equal(await f.ctx.verifyAdmin(f.user),true);assert.equal(f.calls,1);
 f.advance(24*60*60*1000+1);f.setData({admin:false});
 assert.equal(await f.ctx.verifyAdmin(f.user),false);assert.equal(f.calls,2);
 f.user.metadata.lastSignInTime='second';await f.api.accountSession(f.user);assert.equal(f.calls,3);
});
test('logout deletes durable admission cache',async()=>{
 const f=fixture({admin:true});await f.api.accountSession(f.user);
 assert.equal(f.store.count(),1);
 await f.api.signOut({currentUser:f.user});
 assert.equal(f.store.count(),0);
 await f.api.accountSession(f.user);
 assert.equal(f.calls,2);
});
test('temporary network failures cannot grant admin access',async()=>{
 const f=fixture();f.setFailure(true);
 assert.equal(await f.ctx.verifyAdmin(f.user),false);
 assert.equal(await f.ctx.verifyAdmin(null),false);
 f.setFailure(false);
 assert.equal(await f.ctx.verifyAdmin(f.user),false);
 assert.equal(f.calls,3);
});
