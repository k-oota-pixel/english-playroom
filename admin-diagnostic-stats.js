import {apiHeaders} from './firebase-security.js?v=2.4.37';

const API='https://task-quest.onrender.com/api/admin/diagnostic-stats';
const host=document.getElementById('panel');
const root=document.createElement('section');
root.className='diagnostic-admin';
root.innerHTML='<div class="diagnostic-head"><div><h2>英語レベル判定・成績集計</h2><p class="sub">最新の受験結果を1人1件で集計。通常の表示は保存済み1ドキュメントのみ読み取ります。</p></div><div class="diagnostic-buttons"><button type="button" class="btn" data-view>保存済み集計を表示</button><button type="button" class="btn primary" data-refresh>集計を更新</button></div></div><p class="sub" data-state role="status">管理者ログイン後に表示できます。</p><div data-results hidden><div class="diagnostic-metrics" data-metrics></div><div class="diagnostic-tables"><div><h3>推定レベル別</h3><table><thead><tr><th>レベル</th><th>人数</th></tr></thead><tbody data-grades></tbody></table></div><div><h3>得点分布</h3><table><thead><tr><th>点数帯</th><th>人数</th><th>構成比</th></tr></thead><tbody data-bands></tbody></table></div></div><p class="sub" data-footnote></p></div>';
host.insertBefore(root,document.getElementById('updated'));
const $=key=>root.querySelector('[data-'+key+']');
let authorized=document.documentElement.dataset.monstudyAdminAuthorized==='true';
let revision=0,busy=false;

const format=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))?Number(n).toLocaleString('ja-JP'):'—';
const date=at=>{const d=new Date(at);return !at||Number.isNaN(d.getTime())?'—':
  d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});};

function controls(){
 $('view').disabled=!authorized||busy;
 $('refresh').disabled=!authorized||busy;
}
function row(tbody,values){
 const tr=document.createElement('tr');
 for(const value of values){const cell=document.createElement('td');cell.textContent=String(value);tr.append(cell);}
 tbody.append(tr);
}
function render(summary){
 const body=$('results');body.hidden=false;
 const people=Number(summary.participantCount)||0;
 const stats=[
  ['受験者',format(people)+'人'],
  ['平均点',format(summary.averageScore)+'点'],
  ['中央値',format(summary.medianScore)+'点'],
  ['最高点',format(summary.maximumScore)+'点'],
  ['最低点',format(summary.minimumScore)+'点'],
  ['単語／語彙文法の平均正答数',format(summary.averageVocabCorrect)+'／'+format(summary.averageGrammarCorrect)+'問（各10問）']
 ];
 const container=$('metrics');container.replaceChildren();
 for(const [label,value] of stats){
  const card=document.createElement('div');card.className='diagnostic-metric';
  const name=document.createElement('span');name.textContent=label;
  const val=document.createElement('strong');val.textContent=people||label==='受験者'?value:'—';
  card.append(name,val);container.append(card);
 }
 const gradeBody=$('grades');gradeBody.replaceChildren();
 for(const label of ['4級','3級','準2級','2級','準1級程度','不明'])
  row(gradeBody,[label,format(summary.gradeCounts?.[label]||0)+'人']);
 const bands=$('bands');bands.replaceChildren();
 for(const band of summary.scoreBands||[])
  row(bands,[band.label,format(band.count)+'人',people?(band.count/people*100).toFixed(1)+'%':'—']);
 $('footnote').textContent='集計日時：'+date(summary.updatedAt)
  +' ／ 最新受験：'+date(summary.latestAttemptAt)
  +' ／ 今回の集計で参照した個別データ：約'+format(summary.sourceReads)+'件'
  +' ／ 暫定スコア尺度 '+summary.scaleVersion
  +'。受験履歴は変更せず、今回の集計は最新の受験結果のみを使用しています。';
}
async function request(method){
 const response=await fetch(API,{method,headers:await apiHeaders(),signal:AbortSignal.timeout(90000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.error||'集計APIエラー（'+response.status+'）');
 return body;
}
async function load(method){
 if(!authorized||busy)return;
 const own=++revision;
 busy=true;controls();
 $('state').textContent=method==='POST'?
  '最新の受験結果を確認し、匿名の集計ドキュメントを更新しています…':
  '保存済みの集計ドキュメント1件を読み込んでいます…';
 try{
  const response=await request(method);
  if(own!==revision||!authorized)return;
  if(!response.ready){
   $('results').hidden=true;
   $('state').textContent='まだ集計がありません。「集計を更新」で初回の集計を作成してください。';
   return;
  }
  render(response.summary);
  $('state').textContent=method==='POST'?
   (response.summary?.source==='unchanged'?'新しい受験結果はありません。集計ドキュメントへのwriteは行っていません。':'集計結果を保存しました。次回は更新された利用者だけ読み取ります。'):
   '保存済みの集計を表示しています。新しい受験結果を反映するには「集計を更新」を押してください。';
 }catch(error){
  if(own===revision&&authorized)$('state').textContent=error?.name==='TimeoutError'?
    '管理サーバーの応答がありません。再度お試しください。':
    '集計結果を取得できませんでした：'+(error?.message||'通信エラー');
 }finally{
  if(own===revision){busy=false;controls();}
 }
}
$('view').onclick=()=>load('GET');
$('refresh').onclick=()=>load('POST');
window.addEventListener('monstudy-admin-access-change',event=>{
 authorized=event.detail?.authorized===true;
 revision++;busy=false;$('results').hidden=true;
 $('state').textContent=authorized?
  '「保存済み集計を表示」は1readです。最新データの再集計は「集計を更新」から実行します。':
  '管理者ログイン後に表示できます。';
 controls();
});
controls();
