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
test('king and third-form physical intervals match requirements; summons retain existing modes',()=>{
 assert.equal(wave(0).target.interval,3000);assert.equal(wave(4).target.interval,4000);assert.equal(wave(6).target.interval,5000);assert.equal(wave(6).target.mp,10000);
 assert.deepEqual(wave(5).enemies.map(e=>e.interval),[1500,4000]);assert.deepEqual(wave(3,'dungeon').enemies.map(e=>e.interval),[1500,20000]);
 assert.equal(wave(1).target.mp,500);assert.equal(wave(3).target.mp,1000);
});
test('both enemies run independent clocks and dead enemies stop; surviving clock is not reset',()=>{
 const e=wave(5);const hits={};for(let now=0;now<=6000;now+=250)for(const a of e.tick(now))hits[a.kind]=(hits[a.kind]||0)+1;
 assert.deepEqual(hits,{mage:4,guard:1});
 const partner=e.enemies[1];e.target.hp=0;assert.equal(e.settleDefeat().type,'target');assert.equal(e.target,partner);
 const after=[];for(let now=6250;now<=8000;now+=250)after.push(...e.tick(now).map(a=>a.kind));assert.deepEqual(after,['guard']);
});
test('pausing both enemies preserves elapsed time and never counts the presentation duration',()=>{
 const e=wave(5);for(let now=0;now<=1000;now+=250)e.tick(now);assert.deepEqual(e.tick(90000,true),[]);assert.deepEqual(e.tick(90001),[]);assert.deepEqual(e.tick(90251),[]);assert.deepEqual(e.tick(90501).map(a=>a.kind),['mage']);
});
test('guard MP carries from first to second form; neither target nor wave transitions restore resources',()=>{
 const e=wave(2);e.target.mp=25;kill(e);assert.equal(e.waveIndex,3);assert.equal(e.enemies[1].mp,25);const guard=e.enemies[1];guard.hp-=17;guard.mp-=10;kill(e);assert.equal(e.target,guard);assert.equal(guard.mp,15);assert.equal(guard.hp,guard.maxHp-17);
});
test('physical-only forms never cast; king second form uses only Mimurose or physical attacks',()=>{
 for(const enemy of [wave(0).target,...wave(5).enemies]){enemy.hp=1;assert.deepEqual(finalEnemyActions(enemy,100).map(a=>a.kind),['physical']);}
 const king=wave(4).target;king.hp=Math.floor(king.maxHp*.5);const actions=finalEnemyActions(king,100,()=>.1);assert.equal(actions[0].spell.id,'mimurose');assert.equal(king.mp,90);king.hp=king.maxHp;assert.equal(finalEnemyActions(king,100)[0].kind,'physical');
});
test('last king always attacks physically, can use each spell, and respects 10000 MP budget',()=>{
 const used=new Set();for(const choice of [.01,.3,.6,.9]){const king=wave(6).target;king.hp=Math.round(king.maxHp*.8);const values=[.01,choice,.1],actions=finalEnemyActions(king,100,()=>values.shift()??.1);assert.equal(actions[0].kind,'physical');const cast=actions[1];used.add(cast.spell.id);assert.equal(king.mp,10000-cast.spell.mpCost);}
 assert.deepEqual([...used].sort(),['mimurose','mimuros','mirogoro','mirogoron'].sort());const king=wave(6).target;king.mp=0;assert.deepEqual(finalEnemyActions(king,100,()=>0).map(a=>a.kind),['physical']);
});

