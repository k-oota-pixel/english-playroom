import {MAGIC_SPELLS,rollMagicAmount} from '../pet-dungeons-model.js?v=2.4.96';
import {strengthLevel,strengthStatsFromAllocation} from '../pet-strength-model.js?v=2.3.23';

export const mazeSpells=MAGIC_SPELLS.filter(spell=>spell.kind==='attack'||spell.kind==='heal');
export function createCaster(data={}){
  const level=strengthLevel(data.petStrengthLevelPoints,data.petStrength);
  const {hp,mp}=strengthStatsFromAllocation(data.petStrength,data.petBaseStats,{
    ageDays:data.petLifeDays,adult:!!data.petHatched&&data.petAdult!==false
  });
  return {name:data.petName||'ぺっと',level,hp,maxHp:hp,mp,maxMp:mp};
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
  for(const key of reward.cards ?? (reward.card?[reward.card]:[])){
    const entry=profile.owned[key];
    if(entry) entry.copies=Math.min(999,entry.copies+1);
    else profile.owned[key]={level:1,copies:0};
  }
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
export const directions = [[0,-1],[1,0],[0,1],[-1,0]];
export function generateMaze(floor,course,random=Math.random){
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
  const [chestX,chestY]=pick(boxes,random);
  const bossFloor=floor===course.floors||floor%5===0;
  const bossId=bossFloor ? (floor===course.floors&&course.floors===20 ? 7 : 1)
    +Math.floor(random()*(floor===course.floors&&course.floors===20?4:6)) : null;
  return {tiles,x:1,y:1,exitX,exitY,chestX,chestY,chestOpened:false,steps:0,bossId};
}
export function movePet(maze,dx,dy,random=Math.random){
  if(!directions.some(([x,y])=>dx===x&&dy===y))return null;
  const x=maze.x+dx,y=maze.y+dy;
  if(!maze.tiles[y]?.[x])return null;
  maze.x=x;
  maze.y=y;
  if(x===maze.exitX&&y===maze.exitY)return maze.bossId?{kind:'boss',id:maze.bossId}:{kind:'exit'};
  if(x===maze.chestX&&y===maze.chestY&&!maze.chestOpened){
    maze.chestOpened=true;
    return {kind:'chest'};
  }
  maze.steps++;
  // The shortest route to an exit has at least ten moves, including landmarks.
  if(maze.steps<3||(maze.steps<7&&random()>=0.16))return {kind:'walk'};
  maze.steps=0;
  return {kind:'battle',id:1+Math.floor(random()*enemies.length)};
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
const actionRoles=['physical','magic','heal'];
export function canJoinAction(unit,action){
  return unit.hp>0&&actionRoles[unit.role]===action;
}
export function playTurn(run,correct,action,target,specialKey,random=Math.random,report=()=>{}){
  const living=run.team.filter(unit=>unit.hp>0);
  const special=correct && living.find(unit=>unit.key===specialKey && unit.rarity && unit.ct===0 && canJoinAction(unit,action));
  for(const unit of living) unit.ct=Math.max(0,unit.ct-(correct?1:0.5));
  const party=[run.caster,...living];
  const mostInjured=()=>party.filter(unit=>unit.hp>0).reduce((lowest,unit)=>
    !lowest||unit.hp/unit.maxHp<lowest.hp/lowest.maxHp?unit:lowest,null);
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
    let petCast=false;
    const spell=mazeSpells.find(item=>item.id===run.selectedSpell);
    if(spell && (spell.kind==='heal'?'heal':'magic')===action && spellAvailable(run.caster,spell)){
      const recipient=action==='heal'?mostInjured():enemyTarget();
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
        const multiplier=1.25+unit.rarity*0.33;
        if(unit.effect==='guard') run.guard={turns:unit.rarity===1?1:2,ratio:unit.rarity/10};
        else if(unit.effect==='heal')heal(unit,mostInjured(),Math.round(unit.heal*multiplier),unit.skill);
        else {
          const targets=unit.effect.endsWith('All')?run.foes.filter(foe=>foe.hp>0):[enemy];
          for(const foe of targets)strike(unit,foe,unit[action]*multiplier,action,unit.skill);
        }
        unit.ct=unit.maxCt;
      }else if(action==='heal')heal(unit,mostInjured(),unit.heal,roles[unit.role]);
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
export function drawReward(course,crystals,random=Math.random){
  if(random()>=course.drop) return {crystals:crystals+1,card:null};
  let roll=random()*100;
  const rarity=course.odds.findIndex(weight=>(roll-=weight)<0);
  return {crystals:crystals+1,card:pick(cards,random).id+'-'+rarity};
}
