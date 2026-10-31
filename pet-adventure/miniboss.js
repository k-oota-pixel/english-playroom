import {MAGIC_SPELLS} from '../pet-dungeons-model.js?v=1.10.22';

const BOSSES=Object.freeze([
 {floor:15,id:'crysturtle',name:'クリスタートル',element:'water'},
 {floor:30,id:'drillmole',name:'ドリルモグラ',element:'leaf'},
 {floor:45,id:'magmander',name:'マグマンダー',element:'fire'},
 {floor:60,id:'runegolem',name:'ルーンゴーレム',element:'leaf'},
 {floor:75,id:'abyssdragon',name:'アビスドラゴン',element:'water'}
]);
export function minibossForStage(stage,mode='dungeon'){
 const boss=(mode==='dungeon'||mode==='tower')&&BOSSES.find(b=>b.floor===Number(stage));
 return boss?{...boss,level:boss.floor,maxMp:5*(1+boss.floor/15)}:null;
}

// A spell replaces the normal timed attack. Every spell is followed by a normal attack.
export function chooseMinibossAction({boss,hp,maxHp,mp,playerHp,lastAction},random=Math.random){
 if(!boss||hp<=0||playerHp<=0||lastAction==='spell')return null;
 const heal=MAGIC_SPELLS.find(s=>s.id===(boss.royal&&mp>=10&&maxHp-hp>=25?'mimurose':'mimuros'));
 const attack=MAGIC_SPELLS.find(s=>s.id===(boss.royal&&mp>=10?'mirogoron':'mirogoro'));
 const canCast=spell=>boss.level>=spell.level&&mp>=spell.mpCost;
 if(canCast(heal)&&hp/maxHp<=.5&&maxHp-hp>=heal.base)return heal;
 if(canCast(attack)&&(playerHp<=attack.base-2||random()<(boss.royal?(boss.phase===2?.55:.4):.35)))return attack;
 return null;
}


