// A calm, three-step guided reflection paired with one completed career matrix.
// All Gemini traffic uses the authenticated Render backend. Nothing is auto-written to Firestore.
import {apiHeaders} from '../firebase-security.js';
const API='https://task-quest.onrender.com/api/career-reflection';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const labels=['価値観に気づく','判断の根拠を考える','次の一歩を決める'];
const asText=(x,limit)=>typeof x==='string'?x.slice(0,limit):'';
const signatureOf=matrix=>JSON.stringify({
  values:matrix.values.map(v=>({label:v.label,weight:v.weight})),
  options:matrix.options.map(o=>({kind:o.kind,name:o.name})),
  ratings:matrix.ratings.flat()
});
const snapshot=matrix=>({
  values:matrix.values.map(({label,weight})=>({label,weight})),
  options:matrix.options.map(({kind,name})=>({kind,name})),
  ratings:matrix.ratings.flat()
});
const initialQuestion=matrix=>{
  const strongest=matrix.values.map((v,i)=>({...v,i})).sort((a,b)=>b.weight-a.weight||a.i-b.i)[0];
  return '「'+strongest.label+'」を重要度★'+strongest.weight+'にしたのは、あなた自身にとってどんな意味があるからでしょうか？';
};
const makeInitial=matrix=>({signature:signatureOf(matrix),phase:'question',step:1,question:initialQuestion(matrix),history:[],draft:'',summary:null,updatedAt:Date.now()});
const cleanHistory=(entries,limit)=>Array.isArray(entries)?entries.slice(0,limit).map(x=>({
  question:asText(x?.question,250),answer:asText(x?.answer,500)
})).filter(x=>x.question&&x.answer):[];
const initialState=()=>({signature:'',phase:'idle',step:1,question:'',history:[],draft:'',summary:null,updatedAt:0});
const loadedState=raw=>{
  if(!raw||typeof raw!=='object'||typeof raw.signature!=='string'||raw.signature.length>2200)return null;
  const phase=['idle','question','done'].includes(raw.phase)?raw.phase:'idle';
  const history=cleanHistory(raw.history,3);
  const step=Number.isInteger(raw.step)?Math.max(1,Math.min(3,raw.step)):1;
  const question=asText(raw.question,250);
  const draft=asText(raw.draft,500);
  const summary=raw.summary&&typeof raw.summary==='object'?{
    values:asText(raw.summary.values,240),
    toExplore:asText(raw.summary.toExplore,240),
    nextStep:asText(raw.summary.nextStep,240)
  }:null;
  if(phase==='done'&&(history.length!==3||!summary?.values||!summary?.toExplore||!summary?.nextStep))return null;
  if(phase==='question'&&(!question||history.length!==step-1))return null;
  const updatedAt=Number.isFinite(raw.updatedAt)?raw.updatedAt:0;
  return {signature:raw.signature,phase,step,question,history,draft,summary,updatedAt};
};

export function createReflectionUI({getMatrix,isReady,getUser,onEdit,onSave}){
  let reflection=initialState(),busy=false,error='',info='';
  let storageKey='';
  const saveLocal=()=>{
    if(!storageKey)return;
    try{localStorage.setItem(storageKey,JSON.stringify(reflection));}catch{}
  };
  const update=()=>{reflection.updatedAt=Date.now();saveLocal();onEdit?.();};
  function attachUser(user){
    const key='monstudy-career-reflection-v1:'+user.uid;
    if(storageKey===key)return;
    storageKey=key;
    try{reflection=loadedState(JSON.parse(localStorage.getItem(key)||'null'))||initialState();}
    catch{reflection=initialState();}
    render();
  }
  function mergeRemote(raw){
    const remote=loadedState(raw);
    if(!remote||remote.phase!=='done')return;
    if(remote.signature!==signatureOf(getMatrix()))return;
    if(remote.updatedAt>reflection.updatedAt){
      reflection=remote;saveLocal();render();
    }
  }
  function cloudPayload(){
    if(reflection.phase!=='done'||reflection.signature!==signatureOf(getMatrix()))return null;
    return {signature:reflection.signature,phase:'done',step:3,
      question:reflection.question,history:reflection.history,summary:reflection.summary,updatedAt:reflection.updatedAt};
  }
  function notifySave(ok){
    info=ok?'マトリクスと振り返りを保存しました。':'保存に失敗しました。通信状態を確認して、もう一度お試しください。';
    render();
  }
  function render(){
    const node=$('reflectionContent');
    if(!node)return;
    const ready=isReady(),fresh=reflection.signature===signatureOf(getMatrix());
    const stale=reflection.phase!=='idle'&&!fresh;
    const startLabel=stale?'新しい評価で振り返る':'AIと振り返りを始める';
    if(!ready||reflection.phase==='idle'||stale){
      node.innerHTML='<div class="reflection-welcome">'+
        '<div class="reflection-intro"><span class="reflection-eyebrow">3 QUESTIONS · 5 MINUTES</span>'+
        '<h3>'+(stale?'評価が更新されました':'点数の先に、あなたの考えがある。')+'</h3>'+
        '<p>'+(stale?'前の評価をもとにした問い返しが残っています。今の評価でもう一度考えてみましょう。':
          'AIは進路を決めません。「なぜそう考えたか」を一緒に掘り下げます。')+'</p>'+
        '<div class="reflection-steps-preview"><span>01 価値観</span><span>02 根拠</span><span>03 次の一歩</span></div>'+
        '</div><div class="reflection-start"><div class="reflection-icon" aria-hidden="true">✦</div>'+
        '<button type="button" class="reflection-button" data-reflect-action="start"'+(ready&&!busy&&getUser()?'':' disabled')+'>'+startLabel+' →</button>'+
        '<small>'+(ready?'3つの問いに答えると振り返りが完成します。':'まず4つの価値観・候補と16か所の評価を完成させてください。')+'</small>'+
        '</div></div>';
      return;
    }
    const done=reflection.phase==='done';
    const currentStep=done?3:reflection.step;
    const stepper='<div class="reflection-stepper" aria-label="問い返しの進行状況">'+labels.map((label,i)=>{
      const number=i+1,completed=done||number<currentStep,active=!done&&number===currentStep;
      return '<div class="reflection-step'+(completed?' complete':'')+(active?' active':'')+'">'+
        '<span class="reflection-step-dot">'+(completed?'✓':number)+'</span><span>'+esc(label)+'</span></div>';
    }).join('')+'</div>';
    const history=reflection.history.length?'<details class="reflection-history"'+(done?' open':'')+'><summary>これまでの考えを振り返る（'+reflection.history.length+'件）</summary>'+
      reflection.history.map((h,i)=>'<div class="reflection-history-item"><span>QUESTION '+(i+1)+'</span><p>'+esc(h.question)+'</p><blockquote>'+esc(h.answer)+'</blockquote></div>').join('')+'</details>':'';
    if(done){
      node.innerHTML=stepper+'<div class="reflection-complete"><div class="reflection-finished">✦ 3つの問い返しが完了しました</div>'+
        '<h3>あなたの進路ノート</h3><p>回答をもとに、今の考えを整理しました。これは進路の決定ではなく、次の調査への出発点です。</p>'+
        '<div class="reflection-summary-grid">'+[
          ['01','大切にしていた価値観',reflection.summary.values],
          ['02','まだ確かめたいこと',reflection.summary.toExplore],
          ['03','これからの一歩',reflection.summary.nextStep]
        ].map(([n,t,v])=>'<div class="reflection-summary-card"><div class="reflection-summary-label">'+n+' · '+t+'</div><p>'+esc(v)+'</p></div>').join('')+'</div>'+
        '<div class="reflection-complete-actions"><button class="reflection-button" type="button" data-reflect-action="save"'+(busy?' disabled':'')+'>マトリクスと振り返りを保存</button>'+
        '<button class="reflection-outline" type="button" data-reflect-action="restart">もう一度考える</button></div>'+
        (info?'<p class="reflection-inline-notice" role="status">'+esc(info)+'</p>':'')+
        '</div>'+history;
      return;
    }
    node.innerHTML=stepper+history+
      '<div class="reflection-question-card"><div class="reflection-question-meta"><span>QUESTION '+currentStep+' / 3</span><span>'+labels[currentStep-1]+'</span></div>'+
      '<p class="reflection-question">'+esc(reflection.question)+'</p>'+
      '<label for="reflectionAnswer">あなたの考えを、あなたの言葉で</label>'+
      '<textarea id="reflectionAnswer" maxlength="500" rows="4" placeholder="正解はありません。今思っていることを自由に書いてみよう。"'+(busy?' disabled':'')+'>'+esc(reflection.draft)+'</textarea>'+
      '<div class="reflection-answer-footer"><span id="reflectionCharCount">'+reflection.draft.length+' / 500字</span>'+
      '<button class="reflection-button" type="button" data-reflect-action="submit"'+(busy||!reflection.draft.trim()?' disabled':'')+'>'+
      (busy?'AIが次の問いを考えています…':currentStep===3?'回答して振り返りを完成する →':'回答して次の問いへ →')+'</button></div>'+
      (error?'<p class="reflection-inline-notice error" role="alert">'+esc(error)+'</p>':'')+
      '</div><p class="reflection-privacy">※ AIには評価表と回答内容が送信されます。氏名・連絡先などの個人情報は入力しないでください。会話中にFirestoreへの自動保存は行いません。</p>'+
      '<div class="reflection-reset"><button class="reflection-text-button" type="button" data-reflect-action="restart"'+(busy?' disabled':'')+'>この振り返りを最初からやり直す</button></div>';
  }
  const content=$('reflectionContent');
  content.addEventListener('input',event=>{
    if(event.target.id!=='reflectionAnswer'||busy)return;
    reflection.draft=event.target.value.slice(0,500);
    update();
    $('reflectionCharCount').textContent=reflection.draft.length+' / 500字';
    const submit=content.querySelector('[data-reflect-action="submit"]');
    if(submit)submit.disabled=!reflection.draft.trim();
  });
  content.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-reflect-action]');
    if(!button||busy)return;
    const action=button.dataset.reflectAction;
    if(action==='save'){onSave?.();return;}
    if(action==='start'||action==='restart'){
      if(!isReady()||!getUser())return;
      if(action==='restart'&&reflection.history.length&&!window.confirm('これまでの回答を消して最初から振り返ります。よろしいですか？'))return;
      reflection=makeInitial(getMatrix());busy=false;error='';info='';update();render();
      $('reflectionAnswer')?.focus({preventScroll:true});
      return;
    }
    if(action!=='submit'||!reflection.draft.trim())return;
    const sig=reflection.signature;
    const answers=[...reflection.history,{question:reflection.question,answer:reflection.draft.trim()}];
    const nextStep=reflection.step+1;
    busy=true;error='';render();
    try{
      const response=await fetch(API,{method:'POST',headers:await apiHeaders(),
        body:JSON.stringify({step:nextStep,matrix:snapshot(getMatrix()),history:answers}),
        signal:AbortSignal.timeout(48000),cache:'no-store'});
      const output=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(output.error||'AIの問い返しに接続できませんでした。');
      if(reflection.signature!==sig||signatureOf(getMatrix())!==sig)return;
      if(nextStep===4){
        if(!output.summary||!['values','toExplore','nextStep'].every(k=>typeof output.summary[k]==='string'&&output.summary[k].trim()))throw Error('振り返りの出力を読み取れませんでした。');
        reflection={...reflection,phase:'done',step:3,history:answers,draft:'',summary:output.summary};
      }else{
        if(typeof output.question!=='string'||!output.question.trim()||output.question.length>220)throw Error('次の問いを読み取れませんでした。');
        reflection={...reflection,step:nextStep,question:output.question,history:answers,draft:''};
      }
      update();info='';render();
      if(nextStep!==4)$('reflectionAnswer')?.focus({preventScroll:true});
    }catch(e){
      error=e.name==='TimeoutError'||e.name==='AbortError'?'接続に時間がかかっています。回答は残っているので、もう一度押してください。':String(e.message||'AIに接続できませんでした。');
      render();
    }finally{busy=false;render();}
  });
  return {attachUser,mergeRemote,cloudPayload,notifySave,render};
}
