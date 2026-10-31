export function createFinalBattleUi(els){
 const primary=document.createElement('div');primary.className='final-target-fighter';primary.append(...els.enemySide.childNodes);
 const other=document.createElement('div');other.className='final-other-fighter';other.hidden=true;other.innerHTML='<div class="name-line"><strong></strong></div><div class="hp enemy-hp"><i></i></div><div class="hp-text"></div><div class="mp-text"></div><div class="enemy-visual"><img></div>';
 els.enemySide.append(primary,other);
 return {render(encounter){
  els.battlefield.classList.toggle('final-encounter',!!encounter);
  if(!encounter){other.hidden=true;return;}
  const target=encounter.target,partner=encounter.enemies.find(e=>e!==target);other.hidden=!partner;
  els.areaLabel.textContent='最終決戦';els.enemyCount.textContent=`最終決戦 · ${encounter.enemies.filter(e=>e.hp>0).length}体`;els.enemyName.textContent='▶ '+target.name;
  els.bossBadge.textContent='♛ 最終決戦';
  if(partner){other.classList.toggle('final-enemy-defeated',partner.hp<=0);other.dataset.enemy=partner.id;other.querySelector('strong').textContent=partner.name;other.querySelector('.hp i').style.width=`${partner.hp/partner.maxHp*100}%`;other.querySelector('.hp-text').textContent=`${partner.hp} / ${partner.maxHp}`;other.querySelector('.mp-text').textContent=`MP ${partner.mp} / ${partner.maxMp}`;const img=other.querySelector('img');if(img.dataset.enemy!==partner.id){img.src=`./bosses/${partner.image}?v=2.3.22`;img.dataset.enemy=partner.id;img.alt=partner.name;}}
 },visualFor(enemy,encounter){return enemy===encounter.target?els.enemyVisual:other.querySelector('.enemy-visual');}};
}


