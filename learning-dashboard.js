import {adminContentRows} from './admin-content-model.js';
const count=value=>Math.max(0,Math.floor(Number(value)||0));
export function dayKey(value){
 const date=new Date(typeof value==='number'?value:String(value||''));
 if(!Number.isFinite(date.getTime()))return '';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function learningRows(apps={},activity={},today=dayKey(Date.now())){
 const wallet=apps['english-playroom']||{};
 return adminContentRows(apps,activity).map(row=>{
  const stored=apps[row.id]||{},data=row.id==='eiken-pre2-interview-a'?{...stored,...wallet.pre2InterviewA}:stored;
  const lines=[...row.lines];
  for(const [key,label] of [['gamesCompleted','クリア回数'],['questionsSolved','正解した問題'],['completedCount','クリア数'],['attemptedCount','取り組んだ問題'],['totalAnswers','解答数'],['positiveCount','良判定数']]){
   if(data[key]!==undefined)lines.push(`${label}：${count(data[key])}`);
  }
  const lastDate=row.id==='word-breaker'?wallet.wordBreakerLastPlayedDate:row.id==='pet-catch'?wallet.petCatchLastPlayedDate:data.lastPlayedDate;
  const retryDates=row.id==='eiken-retry'?Object.values(data.state?.records||{}).filter(r=>count(r.attempts)>0).map(r=>dayKey(r.updatedAt)):[];
  const claims=(wallet.coinRewardClaims||[]).filter(v=>typeof v==='string'&&v.startsWith(row.id+':'));
  const done=dayKey(row.lastLearningAt)===today||lastDate===today||retryDates.includes(today)||
   (row.id==='eiken-retry'&&dayKey(data.state?.updatedAt)===today)||
   (wallet.coinRewardDate===today&&claims.length>0);
  const recorded=row.recorded||lines.length>0;
  return {...row,lines,done,recorded,summary:lines.length?lines.join(' / '):recorded?'取り組み記録あり（回数の記録なし）':'取り組み記録はまだありません'};
 });
}
export function createLearningDashboard({button,list,note,getUser,load}){
 let active=null;
 function reset(){active=null;list.replaceChildren();list.hidden=true;button.disabled=!getUser();button.textContent='表示する';button.setAttribute('aria-expanded','false');note.textContent=getUser()?'クリックすると、全教材のこれまでと今日の取り組み状況を読み込みます。':'ログインすると学習状況を確認できます。';}
 async function refresh(){
  const user=getUser();if(!user||active)return;
  const request={uid:user.uid};active=request;button.disabled=true;button.textContent='読み込み中…';note.textContent='学習記録を読み込んでいます。';
  const current=()=>active===request&&getUser()?.uid===user.uid;
  try{
   const data=await load(user);if(!current())return;
   const rows=learningRows(data.apps,data.activity);list.replaceChildren();
   for(const row of rows){
    const item=document.createElement('article');item.className='learning-item';
    const name=document.createElement('strong');name.textContent=row.label;
    const status=document.createElement('span');status.className='learning-today'+(row.done?' done':'');status.textContent=row.done?'今日：取り組みあり':'今日：取り組み記録なし';
    const summary=document.createElement('p');summary.textContent='これまで：'+row.summary;
    item.append(name,status,summary);list.append(item);
   }
   list.hidden=false;button.setAttribute('aria-expanded','true');
   note.textContent=`今日取り組んだ教材：${rows.filter(r=>r.done).length} / ${rows.length}教材。日本時間の日付で集計。保存されている記録を表示しています。`;
  }catch(error){if(current()){list.hidden=true;note.textContent=error.message||'学習記録を取得できませんでした。もう一度お試しください。';}}
  finally{if(current()){active=null;button.disabled=false;button.textContent=list.hidden?'再試行':'↻ 更新';}}
 }
 button.addEventListener('click',refresh);return {reset,refresh};
}
