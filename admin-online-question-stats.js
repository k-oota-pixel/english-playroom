import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.36';
import {enableAppCheck} from './firebase-security.js?v=2.1.2';

const firebaseConfig={apiKey:"AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ",authDomain:"eiken-retry.firebaseapp.com",projectId:"eiken-retry",storageBucket:"eiken-retry.firebasestorage.app",messagingSenderId:"231308672297",appId:"1:231308672297:web:5e8b8ede3a0246c2318b38"};
const app=getApps().length?getApp():initializeApp(firebaseConfig);
enableAppCheck(app);
const auth=getAuth(app),cache=new Map(),gradeLabels=['4級','3級','準2級','2級'];
let questionMap=null,busy=false;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function loadQuestionMap(){
 if(questionMap)return questionMap;
 const response=await fetch('https://k-oota-pixel.github.io/eiken-retry/assets/question-index.json?v=20261103-1',{cache:'force-cache',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('リトライノートの問題一覧を取得できませんでした。');
 const records=await response.json();
 questionMap=new Map((Array.isArray(records)?records:[]).map(item=>[String(item.id),item]));
 return questionMap;
}
async function stats(grade,force){
 if(!force&&cache.has(grade))return cache.get(grade);
 const user=auth.currentUser;
 if(!user)throw Error('管理者ログインをしてください。');
 const token=await user.getIdToken();
 const url='https://task-quest.onrender.com/api/admin/online-battle-question-stats?grade='+encodeURIComponent(grade)+'&limit=100';
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(90000)});
 const value=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(value.error||'対戦の問題別正解率を取得できませんでした。');
 cache.set(grade,value);
 return value;
}
const style=document.createElement('style');
style.textContent='.online-question-stats-dialog{width:min(920px,calc(100vw - 26px));max-height:86vh;padding:0;border:0;border-radius:18px;background:#fff;color:#173b35;box-shadow:0 20px 65px #0f2d2544}.online-question-stats-dialog::backdrop{background:#102f2870}.online-question-stats-inner{padding:18px}.online-question-stats-title{display:flex;justify-content:space-between;gap:10px;align-items:start}.online-question-stats-title h2{margin:0 0 5px;font-size:19px}.online-question-stats-title p,.online-question-stats-note{font-size:11px;color:#667b70;line-height:1.6}.online-question-stats-control{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}.online-question-stats-control select{background:#fff;color:#173b35;border:1px solid #d7e3dc;border-radius:8px;padding:7px}.online-question-stats-wrap{max-height:55vh;overflow:auto;border:1px solid #d7e3dc;border-radius:12px}.online-question-stats-wrap table{border-collapse:collapse;width:100%;min-width:570px}.online-question-stats-wrap th,.online-question-stats-wrap td{border-bottom:1px solid #e9efeb;padding:9px;text-align:right;font-size:12px}.online-question-stats-wrap th{background:#f1f6f2;position:sticky;top:0}.online-question-stats-wrap th:nth-child(2),.online-question-stats-wrap td:nth-child(2){text-align:left}.online-question-stats-wrap small{display:block;font-size:10px;color:#74837b}.online-question-stats-error{color:#a33}';
document.head.appendChild(style);
const dialog=document.createElement('dialog');dialog.className='online-question-stats-dialog';
dialog.innerHTML='<section class="online-question-stats-inner"><div class="online-question-stats-title"><div><h2>オンライン対戦（問題）難問ランキング</h2><p>各利用者が対戦で初めて解いたときの正答率です。リトライノート本体とは別集計。</p></div><button class="btn" type="button" data-close>閉じる</button></div><div class="online-question-stats-control"><label>級 <select data-grade>'+gradeLabels.map(label=>'<option>'+label+'</option>').join('')+'</select></label><label>表示 <select data-limit>'+[10,20,30,50].map(n=>'<option value="'+n+'"'+(n===20?' selected':'')+'>下位'+n+'問</option>').join('')+'</select></label><button class="btn" type="button" data-reload>再取得</button></div><div class="online-question-stats-wrap" data-results><p>級を選んでください。</p></div><p class="online-question-stats-note" data-note>表示時のみFirebase① Realtime Databaseから取得します。回答・試合中の追加読み書きはありません。</p></section>';
document.body.appendChild(dialog);
const grade=dialog.querySelector('[data-grade]'),limit=dialog.querySelector('[data-limit]'),results=dialog.querySelector('[data-results]'),note=dialog.querySelector('[data-note]'),reload=dialog.querySelector('[data-reload]');
dialog.querySelector('[data-close]').onclick=()=>dialog.close();
async function render(force=false){
 if(busy)return;
 busy=true;reload.disabled=true;results.textContent='読み込んでいます…';
 try{
  const [data,questions]=await Promise.all([stats(grade.value,force),loadQuestionMap()]);
  const rows=(data.rows||[]).slice(0,Number(limit.value)||20);
  if(!rows.length){results.textContent='まだ対象の初回回答がありません。';note.textContent='問題対戦を終了した生徒の回答から順に蓄積されます。';return;}
  results.innerHTML='<table><thead><tr><th>順位</th><th>問題</th><th>初回正答率</th><th>回答人数</th><th>正解人数</th></tr></thead><tbody>'+
   rows.map((item,i)=>{
    const question=questions.get(String(item.id));
    const metadata=question?[question.year+'年度',question.session+'回','問'+question.question_number].join(' / '):'';
    return '<tr><td>'+(i+1)+'</td><td><strong>'+escapeHtml(question?.question||item.id)+'</strong><small>'+escapeHtml(metadata)+'</small></td><td>'+Number(item.accuracy).toFixed(1)+'%</td><td>'+Number(item.attempts).toLocaleString('ja-JP')+'人</td><td>'+Number(item.correct).toLocaleString('ja-JP')+'人</td></tr>';
   }).join('')+'</tbody></table>';
  note.textContent=grade.value+'：集計対象 '+Number(data.total||0).toLocaleString('ja-JP')+'問。表示件数の切り替えはキャッシュを使い、追加readは発生しません。';
 }catch(error){results.innerHTML='<p class="online-question-stats-error">'+escapeHtml(error.message)+'</p>';note.textContent='管理者ログインと通信状態を確認してください。';}
 finally{busy=false;reload.disabled=false;}
}
grade.onchange=()=>void render();
limit.onchange=()=>void render();
reload.onclick=()=>void render(true);
const anchor=document.getElementById('refresh');
if(anchor){
 const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='📉 対戦（問題）難問ランキング';
 button.onclick=()=>{if(!dialog.open)dialog.showModal();void render();};
 anchor.before(button);
}
