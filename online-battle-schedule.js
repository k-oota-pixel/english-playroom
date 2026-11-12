// Japan Standard Time (UTC+9): alternate modes every calendar day, including month boundaries.
// No Firebase reads/writes or timers are needed to choose today's homepage link.
export function scheduledBattleMode(now=Date.now()){
 const jstDay=Math.floor((Number(now)+9*60*60*1000)/86400000);
 return jstDay%2===0?'questions':'words';
}
export function scheduledBattleEntry(now=Date.now()){
 const questions=scheduledBattleMode(now)==='questions';
 return {
  title:questions?'オンライン対戦（問題）':'オンライン対戦（単語）',
  path:questions?'pet-adventure/online-battle-questions.html':'pet-adventure/online-battle.html',
  description:questions?'リトライノートの英検4級〜2級の語彙・文法問題で対戦！':'英検4級〜2級の英単語を使ってペットと対戦！'
 };
}
