import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,countWords,normalizeProfile,recommendedLevel,rankArticles,validateArticle} from '../today/model.js';

const levelText='This is a short English text for a learner.';
const article=(id,category,careerTags=[])=>({
  id,title:id,date:'2026-10-31',category,categories:[],careerTags,tags:[],sources:[{name:'source',url:'https://example.com'}],
  levels:Object.fromEntries(LEVELS.map(level=>[level,{text:levelText}]))
});

test('countWords counts English words and contractions',()=>{
  assert.equal(countWords("It's a learner-friendly story."),5);
});

test('profile is limited to five valid interests',()=>{
  const p=normalizeProfile({level:'2級',interests:['world','science','technology','health','sports','culture','unknown']});
  assert.equal(p.level,'2級');
  assert.equal(p.interests.length,5);
  assert.ok(!p.interests.includes('unknown'));
});

test('difficulty feedback adjusts recommended level',()=>{
  const a=article('a','science');
  const profile={level:'準2級',challenge:'balanced'};
  assert.equal(recommendedLevel(profile,a,{difficulty:{a:'easy'}}),'2級');
  assert.equal(recommendedLevel(profile,a,{difficulty:{a:'hard'}}),'3級');
});

test('ranking favors matching interests but keeps discovery',()=>{
  const items=[article('world','world'),article('science','science'),article('tech','technology'),article('health','health'),article('sport','sports'),article('culture','culture'),article('life','life')];
  const profile={level:'準2級',interests:['science']};
  const behavior={categoryReads:{science:5,world:2,technology:1,health:1,sports:1,culture:1},read:{}};
  const ranked=rankArticles(items,profile,behavior,6,Date.parse('2026-10-31T12:00:00Z'));
  assert.equal(ranked[0].id,'science');
  assert.ok(ranked.some(a=>a.id==='life'));
});

test('article validation requires all five levels and a source',()=>{
  assert.equal(validateArticle(article('ok','science')),true);
  const broken=article('broken','science');delete broken.levels['準1級'];
  assert.equal(validateArticle(broken),false);
});
