import {getMonstudyApp,enableAppCheck} from '../firebase-security.js?v=2.4.37';
import {QUESTION_GROUPS as POTATO_GROUPS} from '../potato-harvest/questions.js';
import {BASIC_GRAMMAR_STAGES} from './basic-grammar-data.js';
import {getAuth} from '../auth-session.js?v=2.4.37';
import {getFirestore,doc,collection,getDoc,getDocs,query,orderBy,limit,startAfter,
  writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {buildQuestionBank,createSession,chooseQuestion,submitAnswer,isFinished,summarize,
  MIN_QUESTIONS,STANDARD_QUESTIONS,MAX_QUESTIONS,SCALE_VERSION} from './model.js?v=2.4.128';

const $=id=>document.getElementById(id);
const app=getMonstudyApp();
enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
let user=null,bankPromise=null,session=null,currentQuestion=null,lastSaved=null;
let summaryData={},pendingSave=null,lastHistorySnapshot=null,historyExhausted=false,historyBusy=false;
const recentLimit=120,previewLimit=12;
let selectedOrderIds=[];
const fmtDate=atMs=>atMs?new Date(Number(atMs)).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const escapeNumber=n=>Number.isFinite(Number(n))?Number(n):0;
const show=which=>{
  for(const key of ['entry','test','result'])$(key).hidden=key!==which;
};
const notice=text=>{$('notice').textContent=text;$('notice').hidden=!text;};
const walletRef=()=>doc(db,'users',user.uid,'apps','english-playroom');
const historyRef=()=>collection(db,'users',user.uid,'apps','english-playroom','diagnosticAttempts');
const numberFmt=score=>Math.max(0,Math.min(1000,Math.round(escapeNumber(score)))).toLocaleString('ja-JP');

function renderTrend(rows){
  const svg=$('trend');
  svg.replaceChildren();
  const ns='http://www.w3.org/2000/svg';
  const element=(tag,attrs)=>{
    const el=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs||{}))el.setAttribute(key,String(value));
    svg.appendChild(el);return el;
  };
  for(let i=0;i<=4;i++){
    const y=12+i*27;
    element('line',{x1:15,y1:y,x2:465,y2:y,stroke:'#dce9ef','stroke-width':1});
  }
  const points=[...rows].filter(r=>r?.scaleVersion===SCALE_VERSION&&Number.isFinite(Number(r?.score))&&r.atMs).sort((a,b)=>a.atMs-b.atMs).slice(-12);
  if(!points.length){
    const message=element('text',{x:240,y:67,'text-anchor':'middle','font-size':14,fill:'#79919f'});
    message.textContent='現行スコア基準の記録はまだありません';return;
  }
  const coords=points.map((row,i)=>{
    const x=points.length===1?240:24+i*432/(points.length-1);
    const y=114-Math.max(0,Math.min(1000,Number(row.score)))*.1;
    return {x,y};
  });
  element('polyline',{points:coords.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '),
    fill:'none',stroke:'#288dad','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'});
  for(const p of coords)element('circle',{cx:p.x,cy:p.y,r:4.2,fill:'#2b85a5',stroke:'white','stroke-width':2});
}
function liForRecord(row,previous=null){
  const li=document.createElement('li');
  const left=document.createElement('span');
  const time=document.createElement('time');
  time.dateTime=new Date(Number(row.atMs)||Date.now()).toISOString();
  time.textContent=fmtDate(row.atMs);
  left.append(time);
  const right=document.createElement('span');
  const strong=document.createElement('strong');
  strong.textContent=numberFmt(row.score)+'点';
  right.append(strong);
  if(previous&&row?.scaleVersion===previous?.scaleVersion&&Number.isFinite(Number(previous.score))){
    const diff=Number(row.score)-Number(previous.score);
    const em=document.createElement('em');
    em.textContent=(diff>0?'+':'')+diff+'点';
    if(diff<0)em.className='down';
    right.append(em);
  }
  if(row?.scaleVersion!==SCALE_VERSION){const old=document.createElement('em');old.className='down';old.textContent='旧基準';right.append(old);}
  li.append(left,right);
  return li;
}
function renderPreview(){
  const latest=summaryData.assessmentLatest||null;
  const best=summaryData.assessmentBest||null;
  const preview=Array.isArray(summaryData.assessmentHistoryPreview)?summaryData.assessmentHistoryPreview:[];
  $('latestDate').textContent=latest?fmtDate(latest.atMs):'未受験';
  $('latestSub').textContent=latest?(latest.grade+(latest.scaleVersion!==SCALE_VERSION?'（旧基準）':'')):'初回の診断を始めよう';
  $('latestScore').textContent=latest?numberFmt(latest.score)+'点':'—';
  $('bestScore').textContent=best&&best.scaleVersion===SCALE_VERSION?'自己ベスト '+numberFmt(best.score)+'点':'現行基準のベスト —';
  $('historyCount').textContent=preview.length?('最近の'+preview.length+'回'):'履歴なし';
  const list=$('previewList');list.replaceChildren();
  for(let i=0;i<preview.length;i++)list.append(liForRecord(preview[i],preview[i+1]));
  renderTrend(preview);
  $('historyBtn').disabled=!user;
}
function clearHistoryDisplay(){
  $('fullHistory').hidden=true;$('historyBtn').textContent='すべての受験履歴を見る';
  $('fullHistoryList').replaceChildren();
  $('moreBtn').hidden=true;
  lastHistorySnapshot=null;historyExhausted=false;
}
async function loadHistoryPage(){
  if(!user||historyBusy||historyExhausted)return;
  historyBusy=true;
  $('moreBtn').disabled=true;
  try{
    const constraints=[orderBy('createdAt','desc'),limit(20)];
    if(lastHistorySnapshot)constraints.push(startAfter(lastHistorySnapshot));
    const snapshots=await getDocs(query(historyRef(),...constraints));
    const rows=snapshots.docs.map(d=>({id:d.id,...d.data()}));
    for(let i=0;i<rows.length;i++){
      const earlier=rows[i+1]||null;
      $('fullHistoryList').append(liForRecord(rows[i],earlier));
    }
    lastHistorySnapshot=snapshots.docs[snapshots.docs.length-1]||lastHistorySnapshot;
    historyExhausted=snapshots.docs.length<20;
    $('moreBtn').hidden=historyExhausted;
    if(!rows.length&&!lastHistorySnapshot){
      const li=document.createElement('li');li.textContent='記録はありません。';
      $('fullHistoryList').append(li);
    }
  }catch(error){
    console.warn('診断履歴の読み込みに失敗',error);
    notice('古い履歴を取得できませんでした。通信状態を確認してください。');
    $('moreBtn').hidden=false;
  }finally{historyBusy=false;$('moreBtn').disabled=false;}
}
async function showHistory(){
  if(!$('fullHistory').hidden){
    $('fullHistory').hidden=true;$('historyBtn').textContent='すべての受験履歴を見る';
    return;
  }
  $('fullHistory').hidden=false;$('historyBtn').textContent='履歴を閉じる';
  if(!lastHistorySnapshot&&!historyExhausted)await loadHistoryPage();
}
function loadRetryQuestions(){
  if(Array.isArray(window.RETRY_QUESTIONS))return Promise.resolve(window.RETRY_QUESTIONS);
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://k-oota-pixel.github.io/eiken-retry/assets/question-data.js?v=split1';
    script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(Error('文法問題の読み込みがタイムアウトしました。'));},25000);
    script.onload=()=>{
      clearTimeout(timer);
      if(Array.isArray(window.RETRY_QUESTIONS))resolve(window.RETRY_QUESTIONS);
      else reject(Error('文法問題の形式が正しくありません。'));
    };
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('リトライノートの文法データを読み込めません。'));};
    document.head.appendChild(script);
  });
}
async function loadBank(){
  if(!bankPromise){
    bankPromise=(async()=>{
      const [vocabResponse,advancedResponse,retryRows]=await Promise.all([
        fetch('../pet-adventure/online-battle-vocab.json'),
        fetch('../data/vocab/pre1-advanced.json'),
        loadRetryQuestions()
      ]);
      if(!vocabResponse.ok||!advancedResponse.ok)throw Error('単語データを読み込めません。');
      const [vocab,advanced]=await Promise.all([vocabResponse.json(),advancedResponse.json()]);
      return buildQuestionBank(vocab,retryRows,advanced,{potatoGroups:POTATO_GROUPS,basicGrammarStages:BASIC_GRAMMAR_STAGES});
    })().catch(error=>{bankPromise=null;throw error;});
  }
  return bankPromise;
}
function renderOrderChoices(){
  const panel=$('orderPanel'),available=$('availableTokens'),selected=$('selectedTokens');
  available.replaceChildren();selected.replaceChildren();
  if(!currentQuestion||currentQuestion.source!=='order')return;
  for(const id of selectedOrderIds){
    const token=currentQuestion.tokens.find(t=>t.id===id);
    if(!token)continue;
    const button=document.createElement('button');
    button.type='button';button.textContent=token.text;
    button.setAttribute('aria-label',token.text+' を並べ替えから戻す');
    button.addEventListener('click',()=>{selectedOrderIds=selectedOrderIds.filter(n=>n!==id);renderOrderChoices();});
    selected.append(button);
  }
  for(const token of currentQuestion.tokens){
    if(selectedOrderIds.includes(token.id))continue;
    const button=document.createElement('button');button.type='button';
    button.textContent=token.text;
    button.setAttribute('aria-label',token.text+' を並べ替えに追加');
    button.addEventListener('click',()=>{selectedOrderIds.push(token.id);renderOrderChoices();});
    available.append(button);
  }
  $('orderSubmitBtn').disabled=selectedOrderIds.length!==currentQuestion.tokens.length;
  $('orderResetBtn').disabled=!selectedOrderIds.length;
}
function renderQuestion(){
  const question=currentQuestion;
  if(!question)return;
  $('questionKind').textContent=question.kind==='vocab'?'単語 · '+question.direction:'語彙文法 · '+question.direction;
  $('questionNumber').textContent='第'+(session.answers.length+1)+'問';
  $('questionGrade').textContent=question.grade;
  $('questionText').textContent=question.prompt;
  $('progressFill').style.width=(session.answers.length/MAX_QUESTIONS*100)+'%';
  $('questionProgress').textContent=(session.answers.length+1)+' / '+STANDARD_QUESTIONS+'問（単語10問・語彙文法10問）';
  const choices=$('choices');choices.replaceChildren();
  const ordering=question.source==='order';
  choices.hidden=ordering;$('orderPanel').hidden=!ordering;
  selectedOrderIds=[];
  if(ordering){renderOrderChoices();return;}
  for(const [i,label] of question.options.entries()){
    const b=document.createElement('button');b.type='button';
    const letter=document.createElement('b');letter.textContent=String.fromCharCode(65+i);
    b.append(letter,document.createTextNode(label));
    b.addEventListener('click',()=>answer(i));
    choices.append(b);
  }
}
function answer(value){
  if(!session||!currentQuestion)return;
  const item=currentQuestion;
  try{submitAnswer(session,item,value);}
  catch(error){notice(error.message||'回答を確認できませんでした。');return;}
  currentQuestion=null;
  if(isFinished(session)){void finish();return;}
  try{
    currentQuestion=chooseQuestion(session,window.__diagnosticBank);
    renderQuestion();
  }catch(error){
    notice('次の問題を選択できませんでした。診断を中断してやり直してください。');
    console.error(error);
  }
}
function setSavingStatus(text){$('saveStatus').textContent=text;}
let saveBusy=false;
async function saveResult(){
  if(!pendingSave||saveBusy||!user)return;
  saveBusy=true;$('retrySaveBtn').hidden=true;
  setSavingStatus('今回の診断結果を保存しています…');
  try{
    if(auth.currentUser?.uid!==user.uid)throw Error('ログインしている利用者が変わりました。');
    const {record,results}=pendingSave;
    const previous=Array.isArray(summaryData.assessmentHistoryPreview)?summaryData.assessmentHistoryPreview:[];
    const preview=[record,...previous.filter(row=>row.id!==record.id)].slice(0,previewLimit);
    const ids=[...session.answers.map(row=>row.id),...(summaryData.assessmentRecentIds||[])].filter((id,i,all)=>all.indexOf(id)===i).slice(0,recentLimit);
    const previousBest=summaryData.assessmentBest?.scaleVersion===SCALE_VERSION?summaryData.assessmentBest:null;
    const best=Number(record.score)>=Number(previousBest?.score??-1)?record:previousBest;
    const batch=writeBatch(db);
    batch.set(doc(historyRef(),record.id),{
      ...record,createdAt:serverTimestamp(),answers:results.answers
    });
    batch.set(walletRef(),{
      assessmentLatest:record,assessmentBest:best,
      assessmentHistoryPreview:preview,
      assessmentRecentIds:ids,
      assessmentScaleVersion:SCALE_VERSION,
      assessmentUpdatedAt:serverTimestamp()
    },{merge:true});
    await batch.commit();
    summaryData={...summaryData,assessmentLatest:record,assessmentBest:best,
      assessmentHistoryPreview:preview,assessmentRecentIds:ids};
    lastSaved=record;
    pendingSave=null;
    $('againBtn').disabled=false;
    $('backBtn').disabled=false;
    clearHistoryDisplay();
    renderPreview();
    setSavingStatus('診断結果を保存しました。');
  }catch(error){
    console.error('実力診断 保存失敗',error);
    setSavingStatus('保存できませんでした。通信状況を確認して再試行してください。');
    $('retrySaveBtn').hidden=false;
  }finally{saveBusy=false;}
}
async function finish(){
  const results=summarize(session),atMs=Date.now();
  const id=(globalThis.crypto?.randomUUID?.()||('run-'+atMs+'-'+Math.floor(Math.random()*1e8)));
  const record={id,atMs,score:results.score,grade:results.grade,
    vocabCorrect:results.vocabCorrect,grammarCorrect:results.grammarCorrect,
    vocabTotal:results.vocabTotal,grammarTotal:results.grammarTotal,
    correct:results.correct,total:results.total,uncertainty:results.uncertainty,
    scaleVersion:results.scaleVersion};
  pendingSave={record,results};
  $('againBtn').disabled=true;
  $('backBtn').disabled=true;
  $('resultScore').textContent=numberFmt(results.score);
  $('resultGrade').textContent=results.grade+'（推定）';
  $('vocabScore').textContent=results.vocabCorrect+' / '+results.vocabTotal+'問';
  $('grammarScore').textContent=results.grammarCorrect+' / '+results.grammarTotal+'問';
  $('vocabGrade').textContent='総合能力値の算出に使用';
  $('grammarGrade').textContent='総合能力値の算出に使用';
  $('confidence').textContent=results.referenceOnly?
    '推定の幅が広いため参考値です。再受験すると傾向を確かめられます。':
    '問題の正誤と難易度をもとにした参考推定です。';
  $('resultSummary').textContent='全'+results.total+'問中'+results.correct+'問正解。単語'+results.vocabCorrect+'問、語彙文法'+results.grammarCorrect+'問正解。両方の回答を使い、一つの英語力を推定しました。スコアの尺度は暫定版（'+SCALE_VERSION+'）です。';
  const last=summaryData.assessmentLatest;
  $('difference').textContent=last&&last.scaleVersion===record.scaleVersion?
    ('前回から '+(record.score-Number(last.score)>0?'+':'')+(record.score-Number(last.score))+'点'):
    'この尺度での診断を記録します。';
  session.finished=true;
  show('result');
  notice('');
  await saveResult();
}
async function start(){
  if(!user)return;
  $('startBtn').disabled=true;
  notice('語彙・文法データを準備しています…');
  try{
    const bank=await loadBank();
    window.__diagnosticBank=bank;
    session=createSession(summaryData.assessmentRecentIds||[]);
    currentQuestion=chooseQuestion(session,bank);
    if(!currentQuestion)throw Error('問題を用意できませんでした。');
    show('test');notice('');
    renderQuestion();
  }catch(error){
    console.error(error);
    notice('診断を開始できませんでした。'+(error.message||'再試行してください。'));
    session=null;currentQuestion=null;
  }finally{$('startBtn').disabled=false;}
}
async function init(){
  $('startBtn').addEventListener('click',start);
  $('againBtn').addEventListener('click',()=>{show('entry');void start();});
  $('backBtn').addEventListener('click',()=>{show('entry');notice('');renderPreview();});
  $('retrySaveBtn').addEventListener('click',saveResult);
  $('historyBtn').addEventListener('click',showHistory);
  $('moreBtn').addEventListener('click',loadHistoryPage);
  $('orderSubmitBtn').addEventListener('click',()=>answer([...selectedOrderIds]));
  $('orderResetBtn').addEventListener('click',()=>{selectedOrderIds=[];renderOrderChoices();});
  $('cancelBtn').addEventListener('click',()=>{
    if(confirm('診断を中断しますか？ 途中の結果は保存されません。')){
      session=null;currentQuestion=null;show('entry');notice('');
    }
  });
  globalThis.MonstudyMaterial?.setActivityGuard(()=>Boolean(session&&!session.finished));
  await auth.authStateReady();
  user=auth.currentUser;
  if(!user||user.isAnonymous){
    notice('利用するにはログインが必要です。もんすたでぃでログインしてください。');
    $('startBtn').disabled=true;show('entry');return;
  }
  try{
    const docSnap=await getDoc(walletRef());
    summaryData=docSnap.exists()?(docSnap.data()||{}):{};
    renderPreview();notice('');show('entry');
  }catch(error){
    console.warn('診断サマリー取得失敗',error);
    summaryData={};renderPreview();show('entry');
    notice('過去の履歴を読み込めませんでした。診断は開始できますが、保存できない場合があります。');
  }
}
void init().catch(error=>{console.error(error);notice('診断画面を初期化できませんでした。ページを開き直してください。');});
