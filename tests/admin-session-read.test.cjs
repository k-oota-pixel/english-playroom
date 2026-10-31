const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),authSource=fs.readFileSync(path.join(root,'auth-session.js'),'utf8'),panelSource=fs.readFileSync(path.join(root,'pet-admin-panel.js'),'utf8');
const sessionCode=authSource.slice(authSource.indexOf("const API="),authSource.indexOf('export function onAuthStateChanged')).replaceAll('export ','');
const panelCode=panelSource.slice(panelSource.indexOf('async function verifyAdmin(user)'),panelSource.indexOf('function ensureDialog()'));
function fixture(data={admin:false,resetRequired:false}){
 let calls=0,clock=1000,response=data,fail=false;const user={uid:'student',getIdToken:async()=> 'test-token'};
 const c=vm.createContext({Date:class extends Date{static now(){return clock;}},AbortSignal,fetch:async url=>{assert.ok(url.endsWith('/api/account/session'));calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>response};}});
 const create=()=>vm.runInContext('(()=>{'+sessionCode+';return accountSession;})()',c);c.accountSession=create();vm.runInContext(panelCode,c);
 return {user,c,create,get calls(){return calls;},advance:()=>clock+=6000,setData:data=>response=data,setFailure:value=>fail=value};
}
test('the home login check and administrator UI share one request for a student',async()=>{
 const f=fixture();await f.c.accountSession(f.user);for(let i=0;i<10;i++)assert.equal(await f.c.verifyAdmin(f.user),false);assert.equal(f.calls,1);
});
test('the administrator hint is available without a separate administrator request',async()=>{
 const f=fixture({admin:true,resetRequired:false});await f.c.accountSession(f.user);assert.equal(await f.c.verifyAdmin(f.user),true);assert.equal(f.calls,1);
});
test('query-string module aliases share the same in-flight session request',async()=>{
 const f=fixture(),other=f.create();await Promise.all([f.c.accountSession(f.user),other(f.user),f.c.verifyAdmin(f.user)]);assert.equal(f.calls,1);
});
test('missing hints, required password resets and network failures never enable administrator tools',async()=>{
 for(const data of [{},{admin:'true'},{admin:true,resetRequired:true}]){const f=fixture(data);assert.equal(await f.c.verifyAdmin(f.user),false);}
 const f=fixture();f.setFailure(true);assert.equal(await f.c.verifyAdmin(f.user),false);assert.equal(await f.c.verifyAdmin(null),false);
});
test('a new token and the existing five-second expiry still require a fresh session check',async()=>{
 const f=fixture({admin:true});await f.c.accountSession(f.user);f.advance();f.setData({admin:false});assert.equal(await f.c.verifyAdmin(f.user),false);assert.equal(f.calls,2);
 f.user.getIdToken=async()=> 'new-token';await f.c.accountSession(f.user);assert.equal(f.calls,3);
});
