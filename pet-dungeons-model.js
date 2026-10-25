export const DUNGEON_ITEMS=Object.freeze([
 {id:'bandage',name:'ばんそうこう',icon:'🩹',kind:'hp',amount:10,price:8,description:'HPを10回復'},
 {id:'medicine',name:'きずぐすり',icon:'🧴',kind:'hp',amount:20,price:15,description:'HPを20回復'},
 {id:'date-hospital-prescription',name:'伊達医院の処方箋',icon:'📄',kind:'hp',amount:100,price:50,description:'HPを100回復'},
 {id:'inter-prescription',name:'インターの処方箋',icon:'📄',kind:'hp',amount:100,price:50,description:'HPを100回復'},
 {id:'date-water',name:'だてのみず',icon:'💧',kind:'mp',amount:10,price:8,description:'MPを10回復'},
 {id:'yoteizan-water',name:'ようていざんのみず',icon:'🏔️',kind:'mp',amount:20,price:20,description:'MPを20回復'}
]);

export const MAGIC_SPELLS=Object.freeze([
 {id:'mimuros',name:'ミムロス',level:5,kind:'heal',base:10,mpCost:5,description:'体力を小回復'},
 {id:'mirogoro',name:'ミロゴロ',level:15,kind:'attack',base:15,mpCost:5,description:'敵に小ダメージ'},
 {id:'mimurose',name:'ミムローズ',level:25,kind:'heal',base:30,mpCost:10,description:'体力を大回復'},
 {id:'mirogoron',name:'ミロゴロン',level:35,kind:'attack',base:30,mpCost:10,description:'敵に大ダメージ'}
]);

export function normalizeDungeonInventory(value={}){
 const next={};
 for(const item of DUNGEON_ITEMS){const n=Number(value?.[item.id]);next[item.id]=Number.isSafeInteger(n)&&n>0?n:0;}
 return next;
}

// 50% base, and 12.5% each for -2, -1, +1, +2.
export function rollMagicAmount(base,random=Math.random){
 const value=Math.max(0,Number(base)||0),r=Math.max(0,Math.min(.999999,Number(random())||0));
 if(r<.5)return value;
 if(r<.625)return Math.max(0,value-2);
 if(r<.75)return Math.max(0,value-1);
 if(r<.875)return value+1;
 return value+2;
}

export function unlockedMagic(level){
 const n=Math.max(1,Math.floor(Number(level)||1));return MAGIC_SPELLS.filter(spell=>n>=spell.level);
}

export function magicAtLevel(level){return MAGIC_SPELLS.find(spell=>spell.level===Number(level))||null;}
