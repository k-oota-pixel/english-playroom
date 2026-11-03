from pathlib import Path

p=Path('coin-reward.js')
s=p.read_text(encoding='utf-8')
start=s.index("async function recordRetrySession(")
end=s.index("async function recordRetryAttempt(questionId)", start)
fn=r'''async function recordRetrySession({sessionId='',attempts=[]}={}){
 await authReady;
 const user=currentUser;if(!user)return {ok:false,reason:'signed-out'};
 const today=todayKey(),session=cleanPart(sessionId||newClientEventId()).slice(0,32),raw=Array.isArray(attempts)?attempts:[];
 const seen=new Set(),normalized=[];
 for(const attempt of raw){
  const questionId=String(attempt?.questionId||'').trim();if(!questionId)continue;
  const coinId=cleanPart(questionId);if(seen.has(coinId))continue;seen.add(coinId);
  normalized.push({questionId,coinId,grade:String(attempt?.grade||'').slice(0,20),correct:!!attempt?.correct,first:attempt?.first===true,series:attempt?.series===true,previousMistakes:Math.max(0,Math.min(100000,Math.floor(Number(attempt?.previousMistakes)||0))),previousWrongAt:Math.max(0,Math.floor(Number(attempt?.previousWrongAt)||0))});
 }
 if(!normalized.length)return {ok:true,sessionId:String(sessionId||''),attempts:0};
 const coinKey=RETRY_OUTBOX_PREFIX+user.uid;
 await flushRetryAttempts(true);
 const oldPending=readRetryOutbox(coinKey).filter(row=>row.day===today&&row.at&&Date.now()-row.at<=86400000);
 if(oldPending.length)throw new Error('以前のリトライコイン処理を完了できませんでした。');
 const CHUNK_SIZE=100;
 for(let offset=0;offset<normalized.length;offset+=CHUNK_SIZE){
  const chunk=normalized.slice(offset,offset+CHUNK_SIZE),existing=readRetryOutbox(coinKey).filter(row=>row.day===today&&row.at&&Date.now()-row.at<=86400000),queued=new Set(existing.map(row=>row.questionId));
  for(const attempt of chunk)if(!queued.has(attempt.coinId)){existing.push({eventId:newClientEventId(),questionId:attempt.coinId,day:today,at:Date.now()});queued.add(attempt.coinId);}
  writeRetryOutbox(coinKey,existing.slice(-500));
  await flushRetryAttempts(true);
  const coinIds=new Set(chunk.map(attempt=>attempt.coinId));
  if(readRetryOutbox(coinKey).some(row=>row.day===today&&coinIds.has(row.questionId)))throw new Error('リトライのコイン処理を完了できませんでした。');
  const titleEvents=chunk.map((attempt,index)=>({eventId:`retry-${session}-${(offset+index).toString(36)}-${attempt.coinId.slice(0,32)}`,kind:'answer',itemId:attempt.questionId,sessionId:String(sessionId||session).slice(0,300),grade:attempt.grade,correct:attempt.correct,first:attempt.first,series:attempt.series,previousMistakes:attempt.previousMistakes,previousWrongAt:attempt.previousWrongAt,expectedUid:user.uid}));
  await recordTitleEvents('eiken-retry',titleEvents);
  const titleKey='monstudy-title-outbox:'+user.uid,titleIds=new Set(titleEvents.map(event=>event.eventId));
  if(readTitleOutbox(titleKey).some(row=>titleIds.has(row.event?.eventId)))throw new Error('リトライの称号・統計処理を完了できませんでした。');
 }
 void recordLearningActivity('eiken-retry');
 return {ok:true,sessionId:String(sessionId||''),attempts:normalized.length};
}

'''
s=s[:start]+fn+s[end:]
p.write_text(s,encoding='utf-8')
