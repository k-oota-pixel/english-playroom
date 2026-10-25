// These keys match the public learning pages, not their storage documents.
export const ADMIN_CONTENTS=Object.freeze([
 ['word-breaker','ワードブレイカー'],['ateru','アテル'],['basic-quest','並べ替え問題（基礎）'],['eiken-retry','リトライノート'],['task-quest','タスク別英会話'],['eiken-cloze','長文空所補充'],['eiken-title','長文概要把握'],['listening-training','リスニング演習＆ディクテーション'],['pre2-interview-questions','準2級面接・質問4・5対策'],['eiken-pre2-interview-a','準2級面接A練習'],['talk-quest','テーマ別日常英会話'],['pet-catch','PET CATCH'],['word-tower','魔王の塔'],['eiken-dungeon','魔物の巣窟']
]);
const count=value=>Math.max(0,Math.floor(Number(value)||0));
export function adminContentRows(apps={},activity={}){
 const wallet=apps['english-playroom']||{},times=activity.contents||{};
 return ADMIN_CONTENTS.map(([id,label])=>{
  const lines=[],stored=apps[id]||{};let recorded=false,historicalLastLearningAt=null;
  const add=(label,value)=>{if(value!==undefined&&value!==null&&value!==''){recorded=true;lines.push(`${label}：${value}`);}};
  if(id==='word-breaker'){
   const bests=Object.values(wallet.wordBreakerBests||{});if(bests.length){add('最高スコア',Math.max(...bests.map(v=>count(v.score))));add('最高コンボ',Math.max(...bests.map(v=>count(v.combo))));add('学習したコース',bests.length);}
   add('最終学習日',wallet.wordBreakerLastPlayedDate);
  }else if(id==='eiken-retry'&&stored.state?.records){
   const records=Object.values(stored.state.records).filter(r=>count(r.attempts)>0);
   if(records.length){add('取り組んだ問題',records.length);add('解答回数',records.reduce((n,r)=>n+count(r.attempts),0));add('正解数',records.reduce((n,r)=>n+count(r.correct),0));add('復習が必要な問題',records.filter(r=>r.pending).length);historicalLastLearningAt=Math.max(...records.map(r=>count(r.updatedAt)))||null;}
  }else if(id==='word-tower'||id==='eiken-dungeon'){
   const field=id==='word-tower'?'wordTowerBest':'eikenDungeonBest';if(wallet[field]!=null)add('最高到達'+(id==='word-tower'?'階':'層'),count(wallet[field]));
  }else if(id==='pet-catch'){
   add('プレイ回数',wallet.petCatchGames);add('最高スコア',wallet.petCatchBestScore);add('正解数',wallet.petCatchCorrectTotal);add('最終学習日',wallet.petCatchLastPlayedDate);
  }else{
   const data=id==='eiken-pre2-interview-a'?{...stored,...wallet.pre2InterviewA}:stored;
   for(const [key,title] of [['submissions','解答回数'],['correctAnswers','正解数'],['completedStages','クリアしたステージ'],['attemptedIds','取り組んだ問題'],['clearCount','クリア回数'],['rounds','ラウンド数'],['attempts','挑戦回数'],['lastPlayedDate','最終学習日']]){
    if(Object.hasOwn(data,key)){const value=data[key];add(title,Array.isArray(value)?value.length:typeof value==='object'&&value!==null?Object.keys(value).length:value);}
   }
  }
  // Some exercises previously saved rewards rather than a separate progress doc.
  if(!recorded){const claims=(Array.isArray(wallet.coinRewardClaims)?wallet.coinRewardClaims:[]).filter(v=>typeof v==='string'&&v.startsWith(id+':'));if(claims.length){add('コイン対象の記録',claims.length);add('記録日',wallet.coinRewardDate);}}
  const lastLearningAt=times[id]?.lastLearningAt||historicalLastLearningAt;
  return {id,label,lines,recorded:recorded||!!lastLearningAt,lastLearningAt};
 });
}
