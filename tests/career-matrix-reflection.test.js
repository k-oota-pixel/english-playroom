import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleState,calculate} from '../career-matrix/model.js';

const client=readFileSync(new URL('../career-matrix/reflection.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../career-matrix/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../career-matrix/reflection.css',import.meta.url),'utf8');
function makeClient({matrix=sampleState(),serverReply}={}){
  const nodes=new Map(),store=new Map(),calls=[],saved=[];
  const dom=id=>{
    if(!nodes.has(id))nodes.set(id,{
      innerHTML:'',textContent:'',focused:false,listeners:{},
      addEventListener(key,listener){this.listeners[key]=listener;},
      querySelector(){return {disabled:false};},
      focus(){this.focused=true;}
    });
    return nodes.get(id);
  };
  const env={
    apiHeaders:async()=>({Authorization:'Bearer example'}),
    document:{getElementById:dom},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    window:{confirm:()=>true},
    AbortSignal:{timeout:()=>({})},
    fetch:async(url,options)=>{
      const request=JSON.parse(options.body);
      calls.push(request);
      const data=serverReply?serverReply(request.step):request.step===4?
        {summary:{values:'興味を大切にしたい',toExplore:'学部の学習内容',nextStep:'大学のシラバスを調べる'}}:
        {question:request.step===2?'その判断にどんな根拠がありますか？':'判断を確かめるため、何を調べたいですか？'};
      return {ok:true,json:async()=>data};
    }
  };
  const names=Object.keys(env);
  const create=new Function(...names,client.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'')+';return createReflectionUI;')(...names.map(k=>env[k]));
  const ui=create({getMatrix:()=>matrix,isReady:()=>calculate(matrix).ready,
    getUser:()=>({uid:'test-user'}),onEdit:()=>{},onSave:()=>saved.push('save')});
  const content=dom('reflectionContent');
  const click=action=>content.listeners.click({target:{closest:()=>({dataset:{reflectAction:action}})}});
  const type=value=>content.listeners.input({target:{id:'reflectionAnswer',value}});
  return {ui,content,calls,saved,store,click,type,matrix};
}
test('guided UI is mounted after score results and includes readable focused layout',()=>{
 assert.match(html,/id="reflectionStage"/);
 assert.match(html,/id="reflectionContent"/);
 assert.match(html,/reflection\.css/);
 assert.match(css,/\.reflection-question-card/);
 assert.match(css,/\.reflection-summary-grid/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/@media print/);
});
test('three replies lead to two adaptive AI questions and a final personal summary',async()=>{
 const x=makeClient();
 x.ui.attachUser({uid:'test-user'});
 assert.match(x.content.innerHTML,/AIと振り返りを始める/);
 await x.click('start');
 assert.match(x.content.innerHTML,/QUESTION 1 \/ 3/);
 assert.match(x.content.innerHTML,/家族のすすめ/);
 assert.equal(x.calls.length,0);
 x.type('家族の意見を参考にしたいと思っているからです。');
 await x.click('submit');
 assert.match(x.content.innerHTML,/QUESTION 2 \/ 3/);
 assert.equal(x.calls[0].step,2);
 x.type('その大学の授業を十分に調べていません。');
 await x.click('submit');
 assert.match(x.content.innerHTML,/QUESTION 3 \/ 3/);
 assert.equal(x.calls[1].step,3);
 x.type('大学のホームページを調べてみます。');
 await x.click('submit');
 assert.deepEqual(x.calls.map(call=>call.step),[2,3,4]);
 assert.match(x.content.innerHTML,/あなたの進路ノート/);
 assert.match(x.content.innerHTML,/学部の学習内容/);
 assert.equal(x.ui.cloudPayload().history.length,3);
 assert.equal(x.saved.length,0);
 await x.click('save');
 assert.equal(x.saved.length,1);
});
test('ratings change makes prior reflection stale and prevents old cloud upload',async()=>{
 const x=makeClient();
 x.ui.attachUser({uid:'test-user'});
 await x.click('start');
 x.matrix.values[0].weight=1;
 x.ui.render();
 assert.match(x.content.innerHTML,/評価が更新されました/);
 assert.equal(x.ui.cloudPayload(),null);
});
test('HTML escapes generated questions and handles AI errors without losing text',async()=>{
 const x=makeClient({serverReply:()=>({question:'<script>alert(1)</script> は、なぜですか？'})});
 x.ui.attachUser({uid:'test-user'});
 await x.click('start');
 x.type('興味があります。');
 await x.click('submit');
 assert.doesNotMatch(x.content.innerHTML,/<script>/);
 assert.match(x.content.innerHTML,/&lt;script&gt;/);
});
