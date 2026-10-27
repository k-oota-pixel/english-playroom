import {createRound} from './model.js';
const game = document.querySelector('#game');
globalThis.MonstudyMaterial?.setActivityGuard(()=>stage!=='setup' && stage!=='answer');
let count = 4, round, player = 0, stage = 'setup';
function show(html) {
  game.innerHTML = html;
  const heading = game.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus();
}
function button(id,text,secondary=false){return `<button id="${id}" class="${secondary?'secondary':''}" type="button">${text}</button>`;}
function on(id,fn){document.getElementById(id).addEventListener('click',fn);}
function setup(){
  stage='setup'; round=undefined;
  show(`<h2 id="heading">みんなで準備しよう</h2><p>自分の単語だけを確認して、タブレットを回します。少数派かどうかは、まだ秘密です。</p><label for="count">プレイ人数</label><select id="count">${Array.from({length:10},(_,i)=>`<option value="${i+3}" ${count===i+3?'selected':''}>${i+3}人</option>`).join('')}</select><p class="note">3〜12人・少数派は1人。英単語と日本語を表示します。</p>${button('start','単語を配る')}`);
  on('start',()=>{count=Number(document.querySelector('#count').value);round=createRound(count);player=0;pass();});
}
function pass(){
  stage='pass';
  show(`<p class="progress">単語の確認 ${player+1} / ${count}人</p><h2 id="heading">${player+1}人目の人に渡してください</h2><p>周りの人に画面が見えないようにしてから、ボタンを押してください。</p>${button('reveal','自分の単語を見る')}`);
  on('reveal',reveal);
}
function reveal(){
  stage='reveal';
  const word=round.words[player];
  show(`<p class="progress">${player+1}人目 / ${count}人</p><h2 id="heading">あなたの単語はこちらです</h2><div class="word"><strong>${word[0]}</strong><span>${word[1]}</span></div><p class="note">覚えたら必ず隠してから、次の人に渡しましょう。</p>${button('hide','覚えたので隠す')}`);
  on('hide',()=>{player++;player<count?pass():discussion();});
}
function discussion(){
  stage='discussion';
  show(`<h2 id="heading">全員の確認が終わりました！</h2><p>タブレットを置いて、話し合いましょう。</p><ul><li>自分の単語をそのまま言わず、特徴や好きなところを話そう。</li><li>できる人は英語で伝えてみよう。</li><li>ひとりだけ違う単語を持つ人を予想して、みんなで投票しよう。</li></ul><p class="note">「何人目だったか」で投票できます。投票が終わってから答えを見てください。</p>${button('check','答え合わせへ')}`);
  on('check',confirmAnswer);
}
function confirmAnswer(){
  stage='confirm';
  show(`<h2 id="heading">投票は終わりましたか？</h2><p>次の画面で、2つの単語と少数派の人を公開します。</p>${button('answer','投票が終わったので答えを見る')}${button('cancel','話し合いに戻る',true)}`);
  on('answer',answer);on('cancel',discussion);
}
function answer(){
  stage='answer';void window.MonstudyMaterial?.recordActivity?.('word-wolf');
  show(`<h2 id="heading">少数派は ${round.wolf+1}人目でした！</h2><div class="answer">多数派の単語<strong>${round.majority[0]}（${round.majority[1]}）</strong></div><div class="answer">少数派の単語<strong>${round.minority[0]}（${round.minority[1]}）</strong></div><p>どんなヒントで気づきましたか？ みんなで振り返ってみよう。</p>${button('again','もう一度あそぶ')}`);
  on('again',setup);
}
// Switching away always removes the secret before the screen is handed over.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stage==='reveal')pass();});
window.addEventListener('pagehide',()=>{if(stage==='reveal')pass();});
setup();
