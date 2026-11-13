import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFinalEncounter,finalEnemyActions,FINAL_WAVES} from '../pet-adventure/final-encounter.js';
const kill=e=>{e.damageTarget(100000);return e.settleDefeat();};
function wave(n,mode='tower'){const e=createFinalEncounter(mode);while(e.waveIndex<n){e.damageTarget(100000);e.settleDefeat();}return e;}
test('seven waves preserve the requested order, art, targeting and shared encounter completion',()=>{
 for(const mode of ['tower','dungeon']){
 const e=createFinalEncounter(mode),seen=[];while(!e.complete){const t=e.target;seen.push(t.id);assert.match(fs.readFileSync(new URL(`../pet-adventure/bosses/${t.image}`,import.meta.url),'utf8'),/<svg/);kill(e);}
 assert.deepEqual(seen,['king-1','mage-1','guard-1','mage-2','guard-2','king-2','mage-3','guard-3','king-3']);assert.equal(e.waveIndex,6);assert.equal(e.settleDefeat().type,'none');
 }
 assert.equal(FINAL_WAVES.length,7);
});
test('updated king and third-form intervals match requirements; summons retain existing modes',()=>{
 assert.equal(wave(0).target.interval,3500);assert.equal(wave(4).target.interval,3000);assert.equal(wave(6).target.interval,1500);assert.equal(wave(6).target.mp,10000);
 assert.deepEqual(wave(5).enemies.map(e=>e.interval),[2500,4000]);assert.deepEqual(wave(5).enemies.map(e=>e.mp),[1000,1000]);assert.deepEqual(wave(3,'dungeon').enemies.map(e=>e.interval),[16000,20000]);
 assert.equal(wave(1).target.mp,500);assert.equal(wave(3).target.mp,1000);
});
test('dungeon timing is slower in every final wave while tower timing stays unchanged',()=>{
 const dungeon=[[18000],[18000],[20000],[16000,20000],[16000],[14000,20000],[14000]];
 const tower=[[3500],[2000],[3000],[1500,3000],[3000],[2500,4000],[1500]];
 for(let i=0;i<7;i++){assert.deepEqual(wave(i,'dungeon').enemies.map(e=>e.interval),dungeon[i]);assert.deepEqual(wave(i,'tower').enemies.map(e=>e.interval),tower[i]);}
 const e=wave(5,'dungeon'),counts={};for(let now=0;now<=40000;now+=250)for(const actor of e.tick(now))counts[actor.kind]=(counts[actor.kind]||0)+1;assert.deepEqual(counts,{mage:2,guard:2});
});
test('both enemies run independent clocks and dead enemies stop; surviving clock is not reset',()=>{
 const e=wave(5);const hits={};for(let now=0;now<=10000;now+=250)for(const a of e.tick(now))hits[a.kind]=(hits[a.kind]||0)+1;
 assert.deepEqual(hits,{mage:4,guard:2});
 const partner=e.enemies[1];e.target.hp=0;assert.equal(e.settleDefeat().type,'target');assert.equal(e.target,partner);
 const after=[];for(let now=10250;now<=12000;now+=250)after.push(...e.tick(now).map(a=>a.kind));assert.deepEqual(after,['guard']);
});
test('pausing both enemies preserves elapsed time and never counts the presentation duration',()=>{
 const e=wave(5);for(let now=0;now<=1000;now+=250)e.tick(now);assert.deepEqual(e.tick(90000,true),[]);assert.deepEqual(e.tick(90001),[]);for(let now=90251;now<91501;now+=250)assert.deepEqual(e.tick(now),[]);assert.deepEqual(e.tick(91501).map(a=>a.kind),['mage']);
});
test('guard MP carries from first to second form; neither target nor wave transitions restore resources',()=>{
 const e=wave(2);e.target.mp=25;kill(e);assert.equal(e.waveIndex,3);assert.equal(e.enemies[1].mp,25);const guard=e.enemies[1];guard.hp-=17;guard.mp-=10;kill(e);assert.equal(e.target,guard);assert.equal(guard.mp,15);assert.equal(guard.hp,guard.maxHp-17);
});
test('king first form stays physical; king second form uses Mimurose or physical; third forms are magic-only',()=>{
 const first=wave(0).target;first.hp=1;assert.deepEqual(finalEnemyActions(first,100).map(a=>a.kind),['physical']);
 for(const enemy of [...wave(5).enemies,wave(6).target]){enemy.hp=1;const actions=finalEnemyActions(enemy,100,()=>.1);assert.ok(actions.length);assert.ok(actions.every(a=>a.kind!=='physical'));}
 const king=wave(4).target;king.hp=Math.floor(king.maxHp*.5);const actions=finalEnemyActions(king,100,()=>.1);assert.equal(actions[0].spell.id,'mimurose');assert.equal(king.mp,90);king.hp=king.maxHp;assert.equal(finalEnemyActions(king,100,()=>.9)[0].kind,'physical');
 assert.equal(finalEnemyActions(king,100,()=>0)[0].kind,'reflect');
 assert.equal(king.magicReflect,true);
});
test('last king casts each spell without physical attacks and respects 10000 MP budget',()=>{
 const used=new Set();for(const choice of [.01,.26,.51,.76,.99]){const king=wave(6).target;king.hp=Math.round(king.maxHp*.8);const values=[choice,.1],actions=finalEnemyActions(king,100,()=>values.shift()??.1);assert.equal(actions.length,1);const cast=actions[0];assert.notEqual(cast.kind,'physical');used.add(cast.spell.id);assert.equal(king.mp,10000-cast.spell.mpCost);}
 assert.deepEqual([...used].sort(),['mimurose','mimuros','mirogoro','mirogoron','mirogoturn'].sort());const king=wave(6).target;king.mp=0;assert.deepEqual(finalEnemyActions(king,100,()=>0),[]);
});
test('third-form guard heals injured living mage first, spends own MP, caps recovery and never resurrects',()=>{
 const e=wave(5),[mage,guard]=e.enemies;mage.hp-=40;guard.hp-=50;const own=guard.hp;let actions=finalEnemyActions(guard,100,()=>.1,e.enemies);assert.equal(actions[0].spell.id,'mimurose');assert.equal(actions[0].target,mage);assert.equal(mage.hp,mage.maxHp-10);assert.equal(guard.hp,own);assert.equal(guard.mp,990);
 mage.hp=mage.maxHp-3;actions=finalEnemyActions(guard,100,()=>.1,e.enemies);assert.equal(actions[0].spell.id,'mimuros');assert.equal(actions[0].amount,3);assert.equal(mage.hp,mage.maxHp);assert.equal(guard.mp,985);
 mage.hp=0;actions=finalEnemyActions(guard,100,()=>.1,e.enemies);assert.ok(actions.every(a=>a.target!==mage));assert.equal(mage.hp,0);
 guard.mp=0;assert.deepEqual(finalEnemyActions(guard,100,()=>.1,e.enemies),[]);
});



