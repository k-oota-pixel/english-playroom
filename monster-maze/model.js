import {DUNGEON_ITEMS,MAGIC_SPELLS,normalizeDungeonInventory,rollMagicAmount} from '../pet-dungeons-model.js?v=2.4.96';
import {strengthLevel,strengthStatsFromAllocation} from '../pet-strength-model.js?v=2.3.23';

export const mazeSpells=MAGIC_SPELLS.filter(spell=>spell.kind==='attack'||spell.kind==='heal');
export function createCaster(data={}){
  const level=strengthLevel(data.petStrengthLevelPoints,data.petStrength);
  const {hp,mp,attack}=strengthStatsFromAllocation(data.petStrength,data.petBaseStats,{
    ageDays:data.petLifeDays,adult:!!data.petHatched&&data.petAdult!==false
  });
  return {name:data.petName||'ぺっと',level,hp,maxHp:hp,mp,maxMp:mp,attack};
}
export function spellAvailable(caster,spell){
  return !!caster&&caster.hp>0&&caster.level>=spell.level&&caster.mp>=spell.mpCost;
}

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
  ['森の祝福',7,'heal'],['蜜のしずく',4,'heal'],['再生の翼',8,'heal'],
  ['花びらの手当て',5,'heal'],['夢のまくら',6,'heal'],['雪うさぎの祈り',5,'heal']
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
export const floorCount = 5;
const advancedOdds=[55,30,12,3];
export const courses = [
  {name:'英検4級',grade:'4',chests:0,coins:5,odds:[85,14,1,0],drop:0.75},
  {name:'英検3級',grade:'3',chests:1,coins:10,odds:[70,24,5,1],drop:0.9},
  {name:'英検準2級',grade:'pre2',chests:2,coins:15,odds:advancedOdds,drop:1,advancedBoss:true},
  {name:'英検2級',grade:'2',chests:3,coins:20,odds:advancedOdds,drop:1,advancedBoss:true},
  {name:'英検準1級',grade:'pre1',chests:4,coins:30,odds:advancedOdds,drop:1,advancedBoss:true}
];
const starters = ['1-0','7-0','13-0'];
const hpMultipliers=[0.60,0.57,0.55,0.52];
const enemyCountOdds=[[80,20,0],[40,60,0],[20,80,0],[10,70,20],[5,40,55]];
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
  const maxHp = Math.round((hp+(id%6)*3)*scale*hpMultipliers[rarity]);
  return {
    ...card,key,rarity,maxHp,hp:maxHp,
    physical:Math.round((physical+id%3)*scale),
    magic:Math.round((magic+(id+1)%3)*scale),
    heal:Math.round((heal+id%2)*scale),
    maxCt:Math.max(1,card.ct-(rarity===3?1:0)),ct:rarity?Math.max(1,card.ct-(rarity===3?1:0)):0
  };
}
// Number of cards needed for one level. Higher-rarity materials cannot be used.
export const upgradeMaterialCosts=[
  [1,null,null,null],
  [2,1,null,null],
  [4,2,1,null],
  [12,6,3,1]
];
export function materialCost(targetRarity,materialRarity){
  return upgradeMaterialCosts[targetRarity]?.[materialRarity]??null;
}
export function maxUpgradeMaterialCount(profile,targetKey,materialKey,draft=[]){
  const target=profile?.owned?.[targetKey];
  if(!target||target.level>=levelCaps[Number(targetKey.split('-')[1])])return 0;
  if(materialKey==='crystal')return profile.crystals||0;
  const material=profile.owned?.[materialKey];
  if(!material||materialCost(Number(targetKey.split('-')[1]),Number(materialKey.split('-')[1]))===null)return 0;
  if(materialKey===targetKey)return material.copies; // Never consume the target original.
  const originalAllowed=!starters.includes(materialKey)
    && !profile.team?.includes(materialKey)
    && !draft.includes(materialKey);
  return material.copies+(originalAllowed?1:0);
}
export function canUseCardAsMaterial(profile,targetKey,materialKey,draft=[]){
  return materialKey!==targetKey&&maxUpgradeMaterialCount(profile,targetKey,materialKey,draft)>0;
}
export function previewUpgradeBatch(profile,targetKey,selections,draft=[]){
  const entry=profile?.owned?.[targetKey];
  const rarity=Number(targetKey.split('-')[1]);
  const unit=upgradeMaterialCosts[rarity]?.[0];
  if(!entry||!unit||entry.level>=levelCaps[rarity])
    return {valid:false,points:0,unit:unit||1,levels:0,remainder:0,maxLevels:0};
  let points=0,selected=0,invalid=false;
  for(const [materialKey,count] of Object.entries(selections||{})){
    if(!Number.isSafeInteger(count)||count<1||count>maxUpgradeMaterialCount(profile,targetKey,materialKey,draft)){
      invalid=true;break;
    }
    const cost=materialKey==='crystal'?1:materialCost(rarity,Number(materialKey.split('-')[1]));
    if(!cost){invalid=true;break;}
    points+=count*(unit/cost);
    selected+=count;
  }
  const levels=Math.floor(points/unit),remainder=points%unit,maxLevels=levelCaps[rarity]-entry.level;
  return {valid:!invalid&&selected>0&&levels>0&&levels<=maxLevels&&remainder===0,
    points,unit,levels,remainder,maxLevels,invalid};
}
// Applies a mixed-rarity material basket atomically in memory; no Firebase calls.
export function applyUpgradeBatch(profile,targetKey,selections,draft=[]){
  const check=previewUpgradeBatch(profile,targetKey,selections,draft);
  if(!check.valid)return false;
  for(const [materialKey,count] of Object.entries(selections)){
    if(materialKey==='crystal'){
      profile.crystals-=count;
      continue;
    }
    const material=profile.owned[materialKey];
    if(count<=material.copies)material.copies-=count;
    else delete profile.owned[materialKey]; // The last unprotected original was consumed.
  }
  profile.owned[targetKey].level+=check.levels;
  return true;
}
// Legacy one-step entry points retain their old public signatures.
export function upgrade(profile,key,useCopy){
  return applyUpgradeBatch(profile,key,{[useCopy?key:'crystal']:1});
}
export function upgradeWithMaterial(profile,targetKey,materialKey,draft=[]){
  const cost=materialCost(Number(targetKey.split('-')[1]),Number(materialKey.split('-')[1]));
  return cost!==null&&applyUpgradeBatch(profile,targetKey,{[materialKey]:cost},draft);
}

export function addReward(profile,round,reward){
  if(profile.recentRuns.includes(round)) return;
  profile.recentRuns = [...profile.recentRuns.slice(-24),round];
  profile.crystals = Math.min(maxMaterials,profile.crystals+reward.crystals);
  for(const key of reward.cards ?? (reward.card?[reward.card]:[])){
    const entry=profile.owned[key];
    if(entry) entry.copies=Math.min(999,entry.copies+1);
    else profile.owned[key]={level:1,copies:0};
  }
}
const pick=(values,random)=>values[Math.floor(random()*values.length)];
export function shuffle(values,random=Math.random){
  const result = [...values];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export const directions = [[0,-1],[1,0],[0,1],[-1,0]];
export function planChests(course,random=Math.random){
  const floors=Array(floorCount+1).fill(0);
  for(let i=0;i<course.chests;i++)floors[2+Math.floor(random()*(floorCount-1))]++;
  return floors;
}
export function generateMaze(floor,course,chestCount=0,random=Math.random){
  const width=9, height=7;
  const tiles=Array.from({length:height},()=>Array(width).fill(false));
  const stack=[[1,1]];
  tiles[1][1]=true;
  while(stack.length){
    const [x,y]=stack.at(-1);
    const branches=directions.filter(([dx,dy])=>{
      const nx=x+2*dx, ny=y+2*dy;
      return nx>0&&nx<width-1&&ny>0&&ny<height-1&&!tiles[ny][nx];
    });
    if(!branches.length){stack.pop();continue;}
    const [dx,dy]=pick(branches,random);
    tiles[y+dy][x+dx]=true;
    tiles[y+2*dy][x+2*dx]=true;
    stack.push([x+2*dx,y+2*dy]);
  }
  const shortcuts=[];
  for(let y=1;y<height-1;y++){
    for(let x=1;x<width-1;x++){
      if(!tiles[y][x]&&((x%2===0&&y%2===1)||(x%2===1&&y%2===0))) shortcuts.push([x,y]);
    }
  }
  for(const [x,y] of shuffle(shortcuts,random).slice(0,2))tiles[y][x]=true;
  const queue=[[1,1,0]],seen=new Set(['1,1']);
  for(const [x,y,distance] of queue){
    for(const [dx,dy] of directions){
      const nx=x+dx,ny=y+dy,id=nx+','+ny;
      if(tiles[ny]?.[nx]&&!seen.has(id)){
        seen.add(id);
        queue.push([nx,ny,distance+1]);
      }
    }
  }
  const [exitX,exitY]=queue.at(-1);
  const boxes=queue.filter(([x,y,distance])=>distance>=4&& (x!==exitX||y!==exitY));
  const chests=shuffle(boxes,random).slice(0,chestCount).map(([x,y])=>({x,y,opened:false}));
  const bossId=floor===floorCount ? (course.advancedBoss?7:1)
    +Math.floor(random()*(course.advancedBoss?4:6)) : null;
  return {tiles,x:1,y:1,exitX,exitY,chests,steps:0,bossId};
}
export function movePet(maze,dx,dy,random=Math.random){
  if(!directions.some(([x,y])=>dx===x&&dy===y))return null;
  const x=maze.x+dx,y=maze.y+dy;
  if(!maze.tiles[y]?.[x])return null;
  maze.x=x;
  maze.y=y;
  if(x===maze.exitX&&y===maze.exitY)return maze.bossId?{kind:'boss',id:maze.bossId}:{kind:'exit'};
  const chest=maze.chests.find(item=>item.x===x&&item.y===y&&!item.opened);
  if(chest){
    chest.opened=true;
    return {kind:'chest'};
  }
  maze.steps++;
  if(maze.steps<3||random()>=0.16)return {kind:'walk'};
  maze.steps=0;
  return {kind:'battle',id:1+Math.floor(random()*enemies.length)};
}
export function makeFoes(room,floor,random=Math.random){
  const major=room.kind==='boss';
  const ids=[room.id];
  if(!major){
    let roll=random()*100;
    const extra=enemyCountOdds[floor-1].findIndex(odds=>(roll-=odds)<0);
    if(extra>0){
      const others=enemies.map((_,i)=>i+1).filter(id=>id!==room.id);
      ids.push(...shuffle(others,random).slice(0,extra));
    }
  }
  return ids.map(id=>{
    const hp=major?120+floor*8+(id>6?35:0):38+floor*3+id%7;
    return {id,major,name:(major?bosses:enemies)[id-1],hp,maxHp:hp,
      power:major?10+Math.floor(floor/2)+(id>6?3:0):5+Math.floor(floor/5)+id%3,weak:id%2?'physical':'magic'};
  });
}
const normalizeChoice=text=>text.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
function vocabularyQuestion(words,previous,reverse,random){
  const pool=words.filter(row=>row.answers?.[0]);
  const candidates=pool.filter(row=>row.word!==previous);
  for(const row of shuffle(candidates,random)){
    const word=normalizeChoice(row.word);
    const correctMeanings=new Set(pool.filter(other=>normalizeChoice(other.word)===word)
      .flatMap(other=>other.answers.map(normalizeChoice)));
    const distractors=new Map();
    for(const other of pool){
      if(normalizeChoice(other.word)===word||other.answers.some(answer=>correctMeanings.has(normalizeChoice(answer))))continue;
      const value=reverse?other.word:other.answers[0];
      distractors.set(normalizeChoice(value),value);
    }
    if(distractors.size<3)continue;
    const [prompt,answer]=reverse?[row.answers[0],row.word]:[row.word,row.answers[0]];
    const options=shuffle([answer,...shuffle([...distractors.values()],random).slice(0,3)],random);
    return {id:row.word,prompt,answer,options,type:'vocabulary',direction:reverse?'ja-en':'en-ja'};
  }
  throw Error('4択を作れる問題が見つかりません。');
}
export function retryVocabulary(rows,meanings,grade){
  const words=new Map();
  for(const row of rows){
    if(row.grade!==grade)continue;
    const word=row.choices.find(choice=>Number(choice.number)===Number(row.answer_number))?.text.trim();
    if(!word)continue;
    const key=word.toLowerCase();
    const meaning=meanings[key];
    if(typeof meaning!=='string'||!meaning.trim())continue;
    words.set(key,{word,answers:[meaning.trim()]});
  }
  return [...words.values()];
}
export function prepareQuestions(wordBank,retryRows,idiomQuestions=[],supplemental={}){
  return Object.fromEntries(courses.map(course=>{
    const grade=course.name.slice(2);
    // 文法枠はリトライノートの「語彙・文法」4択を全問使用する。
    const grammar=retryRows.filter(row=>row.grade===grade&&row.choices.length===4).map(row=>({
      id:row.id,prompt:row.question,
      answer:row.choices.find(choice=>Number(choice.number)===Number(row.answer_number))?.text,
      options:row.choices.map(choice=>choice.text),tip:row.manual_tip
    })).filter(row=>new Set(row.options).size===4&&row.options.includes(row.answer));
    const words=wordBank[course.grade]?.words;
    if(grammar.length<2||!Array.isArray(words)||words.length<5)throw Error(course.name+'の出題データが不足しています。');
    const extra=supplemental.grades?.[course.grade]||{};
    return [course.grade,{words,grammar,idioms:course.grade==='2'?idiomQuestions:[],
      ordering:Array.isArray(extra.ordering)?extra.ordering:[],
      potato:Array.isArray(extra.potato)?extra.potato:[]}];
  }));
}
function idiomQuestion(rows,previous,random){
  const candidates=rows.filter(row=>row.id!==previous&&row.phrase&&row.meaning);
  const pool=candidates.length?candidates:rows;
  const reverse=random()<0.5;
  for(const row of shuffle(pool,random)){
    const answer=reverse?row.phrase:row.meaning;
    const otherOptions=new Map();
    for(const other of rows){
      if(other.id===row.id)continue;
      // Exclude equivalent meanings and duplicate English expressions, so the
      // quiz always has exactly one defensible answer.
      if(normalizeChoice(other.meaning)===normalizeChoice(row.meaning)
        ||normalizeChoice(other.phrase)===normalizeChoice(row.phrase))continue;
      const text=reverse?other.phrase:other.meaning;
      if(!text||normalizeChoice(text)===normalizeChoice(answer))continue;
      otherOptions.set(normalizeChoice(text),text);
    }
    if(otherOptions.size<3)continue;
    const options=shuffle([answer,...shuffle([...otherOptions.values()],random).slice(0,3)],random);
    return {id:row.id,type:'idiom',direction:reverse?'ja-en':'en-ja',
      prompt:reverse?'次の日本語に合う熟語を選ぼう：'+row.meaning:'次の熟語の意味を選ぼう：'+row.phrase,
      answer,options,tip:row.phrase+' ＝ '+row.meaning};
  }
  throw Error('熟語の4択を作れる問題が見つかりません。');
}
// 並べ替え問題は原教材と同じ語分割を使用。文頭大文字と文末記号をヒントとして見せない。
export function orderTokens(sentence){
  return sentence.match(/(?:Mr|Mrs|Ms|Miss|Dr|Prof)\\.\\s+[A-Z][A-Za-z'’-]*|(?:[A-Za-z]\\.){2,}|[A-Za-z]+(?:[-'’][A-Za-z]+)*|\\d+(?:\\.\\d+)?(?:th|st|nd|rd)?/g)||[];
}
const normalizedOrder=sentence=>orderTokens(sentence).join(' ').replace(/[’]/g,"'").normalize('NFKC').toLowerCase();
export function correctOrdering(quiz,answer){
  if(quiz?.type!=='ordering'||!answer)return false;
  const value=normalizedOrder(answer);
  return [quiz.answer,...(quiz.acceptedAnswers||[])].some(expected=>normalizedOrder(expected)===value);
}
export function question(bank,previous,random=Math.random){
  // 各問題形式を均等に抽選。問題は読み込み済みの静的データから選ぶためFirestore通信は発生しない。
  const kinds=['vocabulary','grammar'];
  if(Array.isArray(bank.idioms)&&bank.idioms.length>=4)kinds.push('idiom');
  if(Array.isArray(bank.ordering)&&bank.ordering.length)kinds.push('ordering');
  if(Array.isArray(bank.potato)&&bank.potato.length)kinds.push('potato');
  const kind=kinds[Math.floor(random()*kinds.length)];
  if(kind==='vocabulary')return vocabularyQuestion(bank.words,previous,random()<0.5,random);
  if(kind==='idiom')return idiomQuestion(bank.idioms,previous,random);
  if(kind==='ordering'){
    const pool=bank.ordering.filter(item=>item.id!==previous);
    const item=pick(pool.length?pool:bank.ordering,random);
    return {...item,type:'ordering',tokens:orderTokens(item.answer).map(token=>token.toLowerCase())};
  }
  if(kind==='potato'){
    const pool=bank.potato.filter(item=>item.id!==previous);
    const item=pick(pool.length?pool:bank.potato,random);
    return {...item,type:'potato',options:shuffle(item.options,random)};
  }
  const pool=bank.grammar.filter(item=>item.id!==previous);
  return {...pick(pool.length?pool:bank.grammar,random),type:'grammar'};
}
const specialPower=rarity=>1.25+rarity*0.33;
const guardEffect=rarity=>({turns:rarity===1?1:2,ratio:rarity/10});
export function specialDescription(unit){
  if(unit.effect==='guard'){
    const {turns,ratio}=guardEffect(unit.rarity);
    return turns+'ターン、味方全員が受けるダメージを'+Math.round(ratio*100)+'％軽減する。発動したターンを含む。';
  }
  const power=Math.round(specialPower(unit.rarity)*100)+'％';
  if(unit.effect==='heal')return '残りHPの割合が最も低い味方1体を、回復力の'+power+'分だけ回復する。';
  const target=unit.effect.endsWith('All')?'敵全体':'敵1体';
  return target+'に、通常の'+power+'の威力で'+roles[unit.role]+'を行う。';
}
const actionRoles=['physical','magic','heal'];
export function canJoinAction(unit,action){
  return unit.hp>0&&actionRoles[unit.role]===action;
}
function mostInjured(party){
  return party.filter(unit=>unit.hp>0).reduce((lowest,unit)=>
    !lowest||unit.hp/unit.maxHp<lowest.hp/lowest.maxHp?unit:lowest,null);
}
export function injuredAlly(run){
  const target=mostInjured([run.caster,...run.team]);
  return target&&target.hp<target.maxHp?target:null;
}
export function healWhileWalking(run,spell,random=Math.random){
  if(spell.kind!=='heal'||!spellAvailable(run.caster,spell))return null;
  const unit=injuredAlly(run);
  if(!unit)return null;
  const amount=Math.min(unit.maxHp-unit.hp,rollMagicAmount(spell.base,random));
  run.caster.mp-=spell.mpCost;
  unit.hp+=amount;
  return {unit,amount};
}
export function canUseItem(run,item){
  const pet=run.caster;
  return pet.hp>0&&run.inventory[item.id]>0&&(item.kind==='hp'?pet.hp<pet.maxHp:pet.mp<pet.maxMp);
}
export function useItem(run,item){
  if(!canUseItem(run,item))return 0;
  const pet=run.caster;
  const stat=item.kind;
  const restored=Math.min(item.amount,(stat==='hp'?pet.maxHp:pet.maxMp)-pet[stat]);
  run.inventory[item.id]--;
  pet[stat]+=restored;
  return restored;
}
export function settleItems(value,delta){
  const inventory=normalizeDungeonInventory(value);
  for(const item of DUNGEON_ITEMS){
    const next=inventory[item.id]+(delta[item.id]||0);
    if(next<0)throw Error(item.name+'が足りません。別のモードで使った場合は、補充してから保存をやり直してください。');
    inventory[item.id]=next;
  }
  return inventory;
}
export function playTurn(run,correct,action,target,specialKey,random=Math.random,report=()=>{}){
  const living=run.team.filter(unit=>unit.hp>0);
  const special=correct && living.find(unit=>unit.key===specialKey && unit.rarity && unit.ct===0 && canJoinAction(unit,action));
  for(const unit of living) unit.ct=Math.max(0,unit.ct-(correct?1:0.5));
  const party=[run.caster,...living];
  const enemyTarget=()=>run.foes[target]?.hp>0?run.foes[target]:run.foes.find(foe=>foe.hp>0);
  const changeHp=(actor,unit,next,kind,actionName)=>{
    const delta=next-unit.hp;
    unit.hp=next;
    if(delta||kind==='heal')report({actor,unit,hp:next,delta,kind,actionName});
  };
  const heal=(actor,unit,amount,name)=>changeHp(actor,unit,Math.min(unit.maxHp,unit.hp+amount),'heal',name);
  const strike=(actor,enemy,power,kind,name)=>changeHp(actor,enemy,
    Math.max(0,enemy.hp-Math.round(power*(enemy.weak===kind?1.25:0.9))),kind,name);
  if(correct){
    if(action==='physical'&&run.caster.hp>0){
      const enemy=enemyTarget();
      if(enemy)strike(run.caster,enemy,run.caster.attack,action,roles[0]);
    }
    let petCast=false;
    const spell=mazeSpells.find(item=>item.id===run.selectedSpell);
    if(spell && (spell.kind==='heal'?'heal':'magic')===action && spellAvailable(run.caster,spell)){
      const recipient=action==='heal'?mostInjured(party):enemyTarget();
      if(recipient){
        petCast=true;
        run.caster.mp-=spell.mpCost;
        const amount=rollMagicAmount(spell.base,random);
        if(action==='heal')heal(run.caster,recipient,amount,spell.name);
        else strike(run.caster,recipient,amount,action,spell.name);
      }
    }
    const acting=action==='heal'&&!petCast?[]:living.filter(ally=>canJoinAction(ally,action));
    for(const unit of acting){
      const enemy=enemyTarget();
      if(!enemy)break;
      if(unit===special){
        const multiplier=specialPower(unit.rarity);
        if(unit.effect==='guard') run.guard=guardEffect(unit.rarity);
        else if(unit.effect==='heal')heal(unit,mostInjured(party),Math.round(unit.heal*multiplier),unit.skill);
        else {
          const targets=unit.effect.endsWith('All')?run.foes.filter(foe=>foe.hp>0):[enemy];
          for(const foe of targets)strike(unit,foe,unit[action]*multiplier,action,unit.skill);
        }
        unit.ct=unit.maxCt;
      }else if(action==='heal')heal(unit,mostInjured(party),unit.heal,roles[unit.role]);
      else strike(unit,enemy,unit[action],action,roles[unit.role]);
    }
  }
  for(const enemy of run.foes.filter(unit=>unit.hp>0)){
    const available=party.filter(unit=>unit.hp>0);
    if(!available.length) break;
    const victim=pick(available,random);
    const damage=Math.max(1,Math.round(enemy.power*(1-(run.guard?.ratio||0))));
    changeHp(enemy,victim,Math.max(0,victim.hp-damage),'physical','反撃');
  }
  if(run.guard && --run.guard.turns===0) run.guard=null;
  run.turns++;
  if(correct) run.correct++;
  return run.foes.every(unit=>unit.hp===0)?'won':party.every(unit=>unit.hp===0)?'lost':'continue';
}
export const gacha={
  odds:advancedOdds,
  packs:[{count:5,cost:50},{count:10,cost:100}]
};
function drawCard(odds,random){
  let roll=random()*100;
  const rarity=odds.findIndex(weight=>(roll-=weight)<0);
  return pick(cards,random).id+'-'+rarity;
}
export function drawGacha(count,random=Math.random){
  return Array.from({length:count},()=>drawCard(gacha.odds,random));
}
export function drawReward(course,crystals,random=Math.random){
  const card=random()<course.drop?drawCard(course.odds,random):null;
  return {crystals:crystals+1,card};
}
export function drawChest(course,random=Math.random){
  return random()<0.5
    ?{card:drawCard(course.odds,random)}
    :{item:pick(DUNGEON_ITEMS,random)};
}
