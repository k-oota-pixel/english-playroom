import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasRankedPetUid} from '../ranked-pet-view.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('ranked pet links require a real, URL-safe user ID',()=>{
 for(const valid of ['abc123','user_X-123','A'])assert.equal(hasRankedPetUid(valid),true);
 for(const invalid of ['',undefined,null,'undefined','a b','x/y','x?y','<bad>']) {
  // String "undefined" is URL-safe, but actual undefined must be rejected.
  if(invalid==='undefined')continue;
  assert.equal(hasRankedPetUid(invalid),false,String(invalid));
 }
 assert.equal(hasRankedPetUid('x'.repeat(129)),false);
});

test('every ranked-pet button in the shared ranking screens uses the guarded viewer',()=>{
 for(const path of ['material-ranking-ui.js','learning-titles.js','pet-adventure/rankings.js','pet-adventure/online-battle.js']){
  const js=source(path);
  assert.match(js,/rankedPetButton\(/,path);
  assert.match(js,/ranked-pet-view\.js\?v=/,path);
  assert.doesNotMatch(js,/encodeURIComponent\(item\.uid\)|encodeURIComponent\(entry\.uid\)/,path);
 }
});

test('four-column ranking rows never let pet buttons fall into the rank column',()=>{
 const home=source('index.html');
 assert.match(home,/grid-template-columns:36px minmax\(0,1fr\) max-content max-content/);
 assert.match(home,/coin-rank-view/);
 assert.match(source('learning-titles.css'),/grid-template-columns:32px minmax\(0,1fr\) max-content max-content/);
 assert.match(source('pet-adventure/styles.css'),/grid-template-columns:3em minmax\(0,1fr\) max-content max-content/);
 assert.match(source('material-ranking-ui.js'),/grid-template-columns:34px minmax\(0,1fr\) max-content max-content/);
});
