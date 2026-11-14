const names = [
  '鉄甲ガメル','紅蓮フォクス','岩王ゴロン','トゲマル','シザーク','獅子王レオン',
  'フレアンド','クリオペン','ライコ','ヨルフクロウ','スタークラゲ','ミラーモン',
  '森のフィリア','ミツビー','シロツル','ポポタン','ネムヒツジ','ユキウサ'
];
const skills = [
  ['俺が守る！',6,'guard'],['紅蓮爪',5,'physical'],['岩盤崩し',7,'physicalAll'],
  ['トゲ連撃',4,'physical'],['大ばさみ',5,'physical'],['獅子王の咆哮',7,'physicalAll'],
  ['フレアバースト',6,'magicAll'],['氷晶弾',5,'magic'],['雷鳴連鎖',6,'magicAll'],
  ['夜の羽ばたき',5,'magic'],['星降り',7,'magicAll'],['鏡光線',4,'magic'],
  ['森の祝福',7,'healAll'],['蜜のしずく',4,'heal'],['再生の翼',8,'healAll'],
  ['花びらの手当て',5,'heal'],['夢のまくら',6,'healAll'],['雪うさぎの祈り',5,'heal']
];
export const cards = names.map((name,index)=>{
  const role = Math.floor(index/6);
  const [skill,ct,effect] = skills[index];
  return {id:index+1,name,role,skill,ct,effect};
});
export const roles = ['物理攻撃','魔法攻撃','回復魔法'];
export const rarities = ['N','R','SR','SSR'];
export const levelCaps = [20,30,50,70];
export const enemies = [
  'いしごろスライム','まよいび','キノコボム','ナイトバット','いわどろゴーレム',
  'アクアジェリー','トゲサボ','ゼンマイコガネ','カラカラマスク','こおりヤドカリ',
  'パチパチモグラ','すなトッキー','カゼダコ','ぬまグチ','もくもクラウド',
  'カンテラコ','からくりハサミ','ペタペタブック','コロコロガイ','ほねベル'
];
export const bosses = [
  'ゴロガン','カマドン','ウズシオーン','イバラナイト','フブキバッファ','ガチャグモ',
  'カゲミミク','ムオンランタン','ユガミドケイ','ヌルカゲ'
];
export const courses = [
  {name:'初級',grade:'4',floors:5,odds:[85,14,1,0],drop:0.75},
  {name:'中級',grade:'3',floors:10,odds:[70,24,5,1],drop:0.9},
  {name:'上級',grade:'pre2',floors:20,odds:[55,30,12,3],drop:1}
];
const starters = ['1-0','7-0','13-0'];
const baseStats = [[104,22,11,9],[79,10,24,10],[86,8,12,20]];
const maxMaterials = 99999;
const integer = (value,min,max) => Number.isSafeInteger(value) ? Math.max(min,Math.min(max,value)) : min;
export function normalizeProfile(value){
  const owned = {};
  for(const {id} of cards){
    for(let rarity=0;rarity<4;rarity++){
      const key = id+'-'+rarity;
      const saved = value?.owned?.[key];
      if(!saved && !starters.includes(key)) continue;
      owned[key] = {level:integer(saved?.level,1,levelCaps[rarity]),copies:integer(saved?.copies,0,999)};
    }
  }
  const team = Array.isArray(value?.team)
    ? [...new Set(value.team.filter(key=>typeof key==='string' && owned[key]))].slice(0,3) : [];
  return {
    owned,team:team.length===3?team:[...starters],
    crystals:integer(value?.crystals,0,maxMaterials),
    recentRuns:Array.isArray(value?.recentRuns)?value.recentRuns.filter(id=>typeof id==='string').slice(-25):[]
  };
}
export function stats(key,entry){
  const [id,rarity] = key.split('-').map(Number);
  const card = cards[id-1];
  const [hp,physical,magic,heal] = baseStats[card.role];
  const scale = 1+(entry.level-1)*0.045+rarity*0.17;
  const maxHp = Math.round((hp+(id%6)*3)*scale);
  return {
    ...card,key,rarity,maxHp,hp:maxHp,
    physical:Math.round((physical+id%3)*scale),
    magic:Math.round((magic+(id+1)%3)*scale),
    heal:Math.round((heal+id%2)*scale),
    maxCt:Math.max(1,card.ct-(rarity===3?1:0)),ct:rarity?Math.max(1,card.ct-(rarity===3?1:0)):0
  };
}
export function upgrade(profile,key,useCopy){
  const entry = profile.owned[key];
  if(!entry || entry.level>=levelCaps[Number(key.split('-')[1])]) return false;
  if(useCopy ? !entry.copies : !profile.crystals) return false;
  if(useCopy) entry.copies--;
  else profile.crystals--;
  entry.level++;
  return true;
}
export function addReward(profile,round,reward){
  if(profile.recentRuns.includes(round)) return;
  profile.recentRuns = [...profile.recentRuns.slice(-24),round];
  profile.crystals = Math.min(maxMaterials,profile.crystals+reward.crystals);
  if(!reward.card) return;
  const entry = profile.owned[reward.card];
  if(entry) entry.copies = Math.min(999,entry.copies+1);
  else profile.owned[reward.card] = {level:1,copies:0};
}
const pick=(values,random)=>values[Math.floor(random()*values.length)];
function shuffle(values,random){
  const result = [...values];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export function roomOptions(floor,course,random=Math.random){
  if(floor===course.floors) return [{kind:'boss',id:1+Math.floor(random()*(course.floors===20?10:6))}];
  if(floor%5===0) return [{kind:'boss',id:1+Math.floor(random()*6)}];
  const ids=shuffle(enemies.map((_,i)=>i+1),random);
  const third=pick([{kind:'treasure'},{kind:'mystery'},{kind:'battle',id:ids[2]}],random);
  return [{kind:'battle',id:ids[0]},{kind:'battle',id:ids[1]},third];
}
export function makeFoes(room,floor,random=Math.random){
  const major=room.kind==='boss';
  const other=shuffle(enemies.map((_,i)=>i+1).filter(id=>major || id!==room.id),random);
  const ids=major||floor<=2?[room.id]:[room.id,...other.slice(0,floor>=8?2:1)];
  return ids.map(id=>{
    const hp=major?120+floor*8+(id>6?35:0):38+floor*3+id%7;
    return {id,major,name:(major?bosses:enemies)[id-1],hp,maxHp:hp,
      power:major?10+Math.floor(floor/2)+(id>6?3:0):5+Math.floor(floor/5)+id%3,weak:id%2?'physical':'magic'};
  });
}
export function question(words,previous,random=Math.random){
  const pool=words.filter(row=>row.word!==previous && row.answers?.[0]);
  for(const row of shuffle(pool,random)){
    const valid=new Set(row.answers);
    const distractors=[...new Set(pool.filter(other=>other.word!==row.word &&
      !other.answers.some(answer=>valid.has(answer))).map(other=>other.answers[0]).filter(Boolean))];
    if(distractors.length>=3){
      return {word:row.word,answer:row.answers[0],options:shuffle([row.answers[0],...shuffle(distractors,random).slice(0,3)],random)};
    }
  }
  throw Error('4択を作れる問題が見つかりません。');
}
export function playTurn(run,correct,action,target,specialKey,random=Math.random){
  const living=run.team.filter(unit=>unit.hp>0);
  const special=correct && living.find(unit=>unit.key===specialKey && unit.rarity && unit.ct===0);
  for(const unit of living) unit.ct=Math.max(0,unit.ct-(correct?1:0.5));
  const heal=(unit,amount)=>{unit.hp=Math.min(unit.maxHp,unit.hp+amount);};
  const strike=(enemy,power,type)=>{
    enemy.hp=Math.max(0,enemy.hp-Math.round(power*(enemy.weak===type?1.25:0.9)));
  };
  if(correct){
    for(const unit of living){
      const foes=run.foes.filter(enemy=>enemy.hp>0);
      if(!foes.length) break;
      const enemy=run.foes[target]?.hp>0?run.foes[target]:foes[0];
      const weakest=[...living].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(unit===special){
        const multiplier=1.25+unit.rarity*0.33;
        if(unit.effect==='guard') run.guard={turns:unit.rarity===1?1:2,ratio:unit.rarity/10};
        else if(unit.effect==='heal') heal(weakest,Math.round(unit.heal*multiplier));
        else if(unit.effect==='healAll') living.forEach(ally=>heal(ally,Math.round(unit.heal*multiplier)));
        else {
          const type=unit.effect.replace('All','');
          (unit.effect.endsWith('All')?foes:[enemy]).forEach(foe=>strike(foe,unit[type]*multiplier,type));
        }
        unit.ct=unit.maxCt;
      }else if(action==='heal') heal(weakest,unit.heal);
      else strike(enemy,unit[action],action);
    }
  }
  for(const enemy of run.foes.filter(unit=>unit.hp>0)){
    const available=living.filter(unit=>unit.hp>0);
    if(!available.length) break;
    const victim=pick(available,random);
    victim.hp=Math.max(0,victim.hp-Math.max(1,Math.round(enemy.power*(1-(run.guard?.ratio||0)))));
  }
  if(run.guard && --run.guard.turns===0) run.guard=null;
  run.turns++;
  if(correct) run.correct++;
  return run.foes.every(unit=>unit.hp===0)?'won':run.team.every(unit=>unit.hp===0)?'lost':'continue';
}
export function drawReward(course,crystals,random=Math.random){
  if(random()>=course.drop) return {crystals:crystals+1,card:null};
  let roll=random()*100;
  const rarity=course.odds.findIndex(weight=>(roll-=weight)<0);
  return {crystals:crystals+1,card:pick(cards,random).id+'-'+rarity};
}
