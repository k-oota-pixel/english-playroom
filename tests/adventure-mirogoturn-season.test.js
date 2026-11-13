import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAGIC_SPELLS,unlockedMagic} from '../pet-dungeons-model.js';
import {chooseMinibossAction} from '../pet-adventure/miniboss.js';
import {majorBossForStage} from '../pet-adventure/royal-guard.js';
import {createFinalEncounter,finalEnemyActions} from '../pet-adventure/final-encounter.js';
import {DUNGEON_SEASON_ID} from '../pet-adventure/dungeon-season.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('both adventure modes share the Lv20 MP5 reflect spell',()=>{
 const reflect=MAGIC_SPELLS.find(s=>s.id==='mirogoturn');
 assert.equal(reflect.level,20);assert.equal(reflect.mpCost,5);assert.equal(reflect.kind,'reflect');
 assert.equal(unlockedMagic(19).some(s=>s.id==='mirogoturn'),false);
 assert.equal(unlockedMagic(20).some(s=>s.id==='mirogoturn'),true);
 const game=source('pet-adventure/game.js');
 assert.match(game,/for\(const spell of MAGIC_SPELLS\)/);
 assert.match(game,/playerReflect=false/);assert.match(game,/actor\.hp=Math\.max\(0,actor\.hp-action\.amount\)/);
 assert.match(game,/if\(reflector\?\.magicReflect\|\|\(!finalEncounter&&enemyReflect\)\)/);
});

test('a Mimurose-capable boss can cast one shield; first-form mage cannot',()=>{
 const phase1=majorBossForStage(50,'dungeon',1),phase2=majorBossForStage(50,'dungeon',2);
 const input={hp:100,maxHp:100,mp:100,playerHp:100,lastAction:null};
 assert.notEqual(chooseMinibossAction({...input,boss:phase1},()=>0)?.id,'mirogoturn');
 assert.equal(chooseMinibossAction({...input,boss:phase2},()=>0)?.id,'mirogoturn');
 assert.notEqual(chooseMinibossAction({...input,boss:phase2,reflectActive:true},()=>0)?.id,'mirogoturn');
});

test('final king spends MP8 on shield and cannot activate two shields',()=>{
 const encounter=createFinalEncounter('dungeon');
 while(encounter.waveIndex<4){encounter.damageTarget(100000);encounter.settleDefeat();}
 const king=encounter.target;king.hp=king.maxHp;
 assert.equal(finalEnemyActions(king,100,()=>0)[0].kind,'reflect');
 assert.equal(king.mp,92);assert.equal(king.magicReflect,true);
 assert.equal(finalEnemyActions(king,100,()=>0)[0].kind,'physical');
});

test('dungeon progression resets once per season using the existing wallet read',()=>{
 assert.equal(DUNGEON_SEASON_ID,'2026-11-mamono-reflect');
 const game=source('pet-adventure/game.js');
 assert.match(game,/data\.eikenDungeonSeason===DUNGEON_SEASON_ID/);
 assert.match(game,/eikenDungeonBest:1,eikenDungeonCleared:false/);
 assert.match(game,/records\.dungeonBest=1/);
 assert.match(source('pet-adventure/ranking-publisher.js'),/DUNGEON_SEASON_ID/);
});