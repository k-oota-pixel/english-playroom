import { GAME_NAME, COURSES, Round, LIMIT_MS, WARNING_MS } from './word-breaker-engine.js';
import { DEMO, loadVocabulary } from './word-breaker-data.js';

const $=id=>document.getElementById(id);
document.title=`${GAME_NAME} | もんすたでぃ`;
document.querySelectorAll('[data-game-name]').forEach(el=>el.textContent=GAME_NAME);
let vocabulary={},bests={},localBests={},store=null,user=null,round=null,course=null,run=null,playerUid=null;
let animation=0,transition=0,wrongReset=0,generation=0,saveChain=Promise.resolve(),savedCoins=0,saving=0,unsaved=false,oldBest={};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try {localBests=JSON.parse(localStorage.getItem('word-breaker-guest-bests')||'{}');} catch {}
function show(id) {for(const section of ['selection','play','result']) $(section).hidden=section!==id;}
function best(id) {return user ? bests[id]||{} : localBests[id]||{};}
function renderCourses() {
  $('courses').replaceChildren();
  for(const [id,label] of COURSES) {
    const button=document.createElement('button');button.className='course';button.disabled=!vocabulary[id];
    const title=document.createElement('strong');title.textContent=label;button.append(title);
    const record=best(id),row=document.createElement('div');row.className='best';
    for(const [name,value] of [['BEST SCORE',record.score||0],['BEST COMBO',record.combo||0]]){const el=document.createElement('small');el.textContent=`${name}　${value}`;row.append(el);}
    button.append(row);const count=document.createElement('small');count.textContent=vocabulary[id]?`${vocabulary[id].length} WORDS · ENDLESS`:'単語マスター待ち';button.append(count);
    button.onclick=()=>start(id);$('courses').append(button);
  }
}
function safeGuestSave() {
  if(course==='demo' || playerUid) return;
  const previous=localBests[course]||{};
  localBests[course]={score:Math.max(previous.score||0,round.score),combo:Math.max(previous.combo||0,round.bestCombo)};
  try {localStorage.setItem('word-breaker-guest-bests',JSON.stringify(localBests));} catch { $('message').textContent='このブラウザでは自己ベストを保存できません。'; }
}
function updateHUD() {$('score').textContent=round.score;$('combo').textContent=round.combo;$('life').textContent=round.life?'♥ '.repeat(round.life):'0';}
function saveProgress() {
  safeGuestSave();
  if(!run || !store || !user || course==='demo') return Promise.resolve();
  const snapshot={...run,rewards:round.rewards,score:round.score,bestCombo:round.bestCombo};
  saving++;$('save-status').textContent='記録とコインを保存中…';$('retry-save').hidden=true;
  saveChain=saveChain.catch(()=>{}).then(async()=>{
    try {await run.ready;} catch {run.ready=run.register();await run.ready;}
    savedCoins=await store.saveRun(snapshot);unsaved=false;
    bests[course]={score:Math.max(bests[course]?.score||0,snapshot.score),combo:Math.max(bests[course]?.combo||0,snapshot.bestCombo)};
    $('result-coins').textContent=savedCoins;
    $('save-status').textContent='共通コインと自己ベストを保存しました。';
  }).catch(error=>{unsaved=true;$('save-status').textContent=`保存できませんでした。画面を閉じずに再試行してください。${error.message}`;$('retry-save').hidden=false;})
    .finally(()=>{saving--; $('retry').disabled=saving>0||unsaved;$('choose').disabled=saving>0||unsaved;});
  $('retry').disabled=true;$('choose').disabled=true;
  return saveChain;
}
async function start(id) {
  if(saving||unsaved) return;
  cancelAnimationFrame(animation);clearTimeout(transition);clearTimeout(wrongReset);generation++;
  const current=generation;
  course=id;round=new Round(id==='demo'?DEMO:vocabulary[id]);oldBest={...best(id)};savedCoins=0;run=null;playerUid=null;
  $('save-status').textContent='';$('retry-save').hidden=true;$('feedback-empty').hidden=false;$('feedback-detail').hidden=true;
  show('play');updateHUD();$('message').textContent='';$('answer').disabled=true;
  // SDK failure must never prevent a guest from playing.
  if(store && id!=='demo') {
    try {user=await store.currentAccount();} catch {user=null;}
    if(user) {
      playerUid=user.uid;
      const record={id:crypto.randomUUID(),course:id,uid:user.uid};
      const register=()=>store.openRun(record.id,id,user.uid).then(ok=>{if(!ok)throw new Error('ログインを確認してください');});
      record.ready=register();
      record.register=register;
      // Keep failures handled until saving is requested.
      record.ready.catch(()=>{});run=record;
    }
  }
  if(current===generation)next();
}
function next() {
  clearTimeout(wrongReset);
  round.next(performance.now());$('word').textContent=round.current.word;$('word').className='word';$('word').style.opacity='1';
  $('arena').classList.remove('explode');$('burst').replaceChildren();$('answer').value='';$('answer').classList.remove('wrong');$('answer').disabled=false;$('submit').disabled=false;$('answer').focus();
  animation=requestAnimationFrame(tick);
}
function tick(now) {
  if(!round?.active) return;
  const elapsed=now-round.started,p=Math.min(1,elapsed/LIMIT_MS);
  $('word').style.transform=reduced?'none':`translateY(${p*38-28}px) scale(${.42+p*1.05})`;
  $('word').classList.toggle('danger',elapsed>=WARNING_MS);
  if(elapsed>=LIMIT_MS) settle(round.timeout()); else animation=requestAnimationFrame(tick);
}
function feedback(type) {
  $('feedback-empty').hidden=true;$('feedback-detail').hidden=false;
  $('feedback-word').textContent=round.current.word;$('feedback-user').textContent=round.lastAnswer||'（未回答）';
  $('feedback-answers').textContent=round.current.answers.join(' / ');
  $('feedback-result').textContent=type==='correct'?'✓ 正解':'時間切れ · LIFE −1';
}
function particles() {
  for(let i=0;i<16;i++){const el=document.createElement('i');el.className='shard';const angle=i*Math.PI/8;el.style.setProperty('--x',`${Math.cos(angle)*(70+i*6)}px`);el.style.setProperty('--y',`${Math.sin(angle)*100}px`);el.style.setProperty('--angle',`${i*23}deg`);$('burst').append(el);}
}
function wrongFeedback() {
  clearTimeout(wrongReset);
  const word=$('word'),answer=$('answer');
  word.classList.remove('wrong');answer.classList.remove('wrong');
  void word.offsetWidth;
  word.classList.add('wrong');answer.classList.add('wrong');
  wrongReset=setTimeout(()=>{word.classList.remove('wrong');answer.classList.remove('wrong');},460);
}
function settle(result) {
  if(result.type==='ignored') return;
  if(result.type==='wrong') {wrongFeedback();$('message').textContent='もう一度！ 制限時間内なら何回でも答えられます。';$('answer').select();return;}
  cancelAnimationFrame(animation);clearTimeout(wrongReset);$('answer').classList.remove('wrong');$('answer').disabled=true;$('submit').disabled=true;
  feedback(result.type);updateHUD();particles();$('word').style.opacity='0';
  if(result.type!=='correct') $('arena').classList.add('explode');
  $('message').textContent=result.type==='correct'?`✓ 撃破！${result.reward?' コイン獲得条件達成！':''}`:'時間切れ。COMBOが0になりました。';
  saveProgress();
  const current=generation;transition=setTimeout(()=>{if(current!==generation)return;if(!round.life)finish();else next();},reduced?180:650);
}
function finish(abandoned=false) {
  if(!round) return;
  cancelAnimationFrame(animation);clearTimeout(transition);clearTimeout(wrongReset);round.active=false;generation++;
  $('result-heading').textContent=abandoned?'今回の記録':course==='demo'?'操作体験の結果':'おつかれさま！';
  $('result-score').textContent=round.score;$('result-combo').textContent=round.bestCombo;$('result-coins').textContent=savedCoins;
  $('record').hidden=course==='demo'||!(round.score>(oldBest.score||0)||round.bestCombo>(oldBest.combo||0));
  if(course==='demo') $('save-status').textContent='操作体験です。コイン・自己ベストは保存されません。';
  else if(!playerUid) $('save-status').textContent='ゲスト記録はこのブラウザに保存。コイン獲得にはプレイ前にログインしてください。';
  show('result');$('result').focus();saveProgress();
}
$('answer-form').addEventListener('submit',e=>{e.preventDefault();if(e.isComposing || !round?.active || !$('answer').value.trim())return;settle(round.resolve($('answer').value,performance.now()));});
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter' && (e.isComposing||e.keyCode===229))e.preventDefault();});
$('quit').onclick=()=>finish(true);$('retry').onclick=()=>start(course);$('choose').onclick=()=>{show('selection');renderCourses();};$('demo').onclick=()=>start('demo');$('retry-save').onclick=()=>saveProgress();
// Leaving the tab does not grant extra time. Expiry resolves once on return.
document.addEventListener('visibilitychange',()=>{if(!document.hidden && round?.active && performance.now()-round.started>=LIMIT_MS)settle(round.timeout());});
renderCourses();
loadVocabulary().then(data=>{vocabulary=data;$('data-status').textContent='6コースから選択できます。';renderCourses();}).catch(error=>{$('data-status').textContent=error.message;$('demo').hidden=false;});
// Load Firebase independently: vocabulary and gameplay remain usable offline.
import('./word-breaker-store.js').then(async module=>{
  user=await module.currentAccount();store=module;
  if(user){$('account').textContent='ログイン中';$('account').href='./index.html';try{bests=await store.readBests();}catch{$('data-status').textContent+=' 自己ベストの読み込みに失敗しました。';}}
  renderCourses();
}).catch(()=>{$('account').textContent='ゲストでプレイ';});
