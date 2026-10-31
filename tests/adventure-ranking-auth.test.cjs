const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'pet-adventure/rankings.js'),'utf8').replace(/^import .*;\n/gm,'');
function fixture({authReady=Promise.resolve(),user={uid:'learner',getIdToken:async()=> 'test-token'},response}={}){
 const nodes={},calls=[],buttons=['tower','dungeon'].map(mode=>node({ranking:mode}));
 function node(dataset={}){return {dataset,textContent:'',children:[],events:{},disabled:false,addEventListener(k,fn){this.events[k]=fn;},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);},showModal(){},close(){this.events.close?.();}};}
 const auth={currentUser:user};
 const c=vm.createContext({auth,authReady,AbortController,Error,document:{getElementById(id){return nodes[id]||=(node());},querySelectorAll(){return buttons;},createElement(){return node();}},fetch:async(url,options)=>{calls.push({url,options});return response?response(url,options):{ok:true,status:200,json:async()=>({leaders:[{rank:1,petName:'もこ',title:'塔の冒険者',floor:50}]})};}});
 vm.runInContext(source,c);
 return {auth,c,nodes,calls,load:mode=>vm.runInContext(`mode='${mode}';load()`,c)};
}
test('both rankings send the signed-in token, only on demand, using GET',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);
 for(const mode of ['tower','dungeon']){await f.load(mode);const call=f.calls.at(-1);assert.equal(call.options.headers.Authorization,'Bearer test-token');assert.ok(call.url.endsWith('mode='+mode));assert.equal(call.options.method,undefined);assert.equal(f.nodes.rankingList.children.length,1);}
 assert.equal(f.calls.length,2);
});
test('ranking waits for restored authentication before sending the request',async()=>{
 let restore;const f=fixture({authReady:new Promise(r=>restore=r)});const pending=f.load('tower');await new Promise(setImmediate);assert.equal(f.calls.length,0);restore();await pending;assert.equal(f.calls.length,1);
});
test('signed-out and anonymous users never send unauthenticated API requests',async()=>{
 for(const user of [null,{uid:'guest',isAnonymous:true}]){const f=fixture({user});await f.load('tower');assert.equal(f.calls.length,0);assert.match(f.nodes.rankingStatus.textContent,/ログインして/);assert.equal(f.nodes.rankingReload.disabled,false);}
});
test('expired authentication and permission errors display actionable messages',async()=>{
 for(const [status,message]of [[401,'ページを更新'],[403,'パスワードを再設定']]){const f=fixture({response:()=>({ok:false,status,json:async()=>({error:'パスワードを再設定してください。'})})});await f.load('dungeon');assert.match(f.nodes.rankingStatus.textContent,new RegExp(message));assert.equal(f.nodes.rankingList.children.length,0);}
});
test('closing the dialog during token acquisition prevents a late request',async()=>{
 let release;const f=fixture({user:{uid:'learner',getIdToken:()=>new Promise(r=>release=r)}});const pending=f.load('tower');await new Promise(setImmediate);f.nodes.rankingDialog.events.close();release('test-token');await pending;assert.equal(f.calls.length,0);
});
test('a user switch during token acquisition cannot send the previous user token',async()=>{
 let release;const f=fixture({user:{uid:'one',getIdToken:()=>new Promise(r=>release=r)}});const pending=f.load('tower');await new Promise(setImmediate);f.auth.currentUser={uid:'two'};release('old-token');await pending;assert.equal(f.calls.length,0);assert.match(f.nodes.rankingStatus.textContent,/ログイン状態が変わりました/);
});
test('a user switch during response parsing does not display stale results',async()=>{
 let finish;const f=fixture({response:()=>({ok:true,status:200,json:()=>new Promise(r=>finish=r)})});const pending=f.load('tower');for(let i=0;i<4;i++)await new Promise(setImmediate);f.auth.currentUser={uid:'two'};finish({leaders:[{rank:1,petName:'stale',floor:10}]});await pending;assert.equal(f.nodes.rankingList.children.length,0);assert.match(f.nodes.rankingStatus.textContent,/ログイン状態が変わりました/);
});
test('server failures retain retry guidance and retry renders the ranking',async()=>{
 let failed=true;const f=fixture({response:()=>({ok:!failed,status:failed?503:200,json:async()=>failed?{error:'failed'}:{leaders:[{rank:1,petName:'もこ',floor:8}]}})});await f.load('tower');assert.match(f.nodes.rankingStatus.textContent,/再表示/);failed=false;await f.load('tower');assert.equal(f.nodes.rankingList.children.length,1);
});
test('the released entry loads the new ranking module',()=>{
 assert.match(fs.readFileSync(path.join(root,'pet-adventure/index.html'),'utf8'),/entry\.js\?v=2\.3\.6/);
 assert.match(fs.readFileSync(path.join(root,'pet-adventure/entry.js'),'utf8'),/rankings\.js\?v=2\.3\.6/);
});
