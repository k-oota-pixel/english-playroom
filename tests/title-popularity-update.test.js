import test from 'node:test';
import assert from 'node:assert/strict';
import {validPopularityExport} from '../today/update-title-popularity.mjs';
test('daily title popularity export rejects incomplete or contradictory summaries',()=>{
 const good={schemaVersion:1,asOfDate:'2026-11-17',updatedAt:'2026-11-16T21:10:00.000Z',
  totalRegistered:160,pendingInitializations:5,titles:Object.fromEntries(Array.from({length:101},(_,i)=>['title:'+i,0]))};
 assert.equal(validPopularityExport(good),true);
 assert.equal(validPopularityExport({...good,totalRegistered:0}),false);
 assert.equal(validPopularityExport({...good,pendingInitializations:161}),false);
 assert.equal(validPopularityExport({...good,titles:{...good.titles,'title:0':161}}),false);
 assert.equal(validPopularityExport({...good,titles:{}}),false);
});
