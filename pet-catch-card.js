function installPetCatchCard(){
  const cards=document.querySelector('.cards');
  if(!cards||document.getElementById('petCatchCard'))return;
  const card=document.createElement('a');
  card.id='petCatchCard';
  card.className='card';
  card.href='./pet-catch/';
  card.innerHTML=`
    <div class="icon" aria-hidden="true">⌄</div>
    <div class="eyebrow">PET MINI GAME · VOCABULARY</div>
    <div class="title">PET CATCH</div>
    <div class="desc">自分のペットを左右に動かして、英単語に合う日本語をキャッチ！ スコアとコンボを伸ばそう。</div>
    <div class="chips"><span class="chip">3 LIFE</span><span class="chip">左右操作</span><span class="chip">10正解で1C</span></div>
    <div class="play">ペットとキャッチする <span aria-hidden="true">→</span></div>
    <div class="open-note">キーボード・スマホ操作対応</div>`;
  const first=cards.querySelector('.card');
  if(first)first.insertAdjacentElement('afterend',card);else cards.appendChild(card);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPetCatchCard,{once:true});
else installPetCatchCard();
