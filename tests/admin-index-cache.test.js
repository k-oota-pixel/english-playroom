import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('both admin searches use the consolidated index instead of global server search',()=>{
 const main=fs.readFileSync('admin-ui.js','utf8');
 const popup=fs.readFileSync('admin-coin-grant.js','utf8');
 assert.match(main,/api\/admin\/search-index/);
 assert.match(main,/api\/admin\/search-preview/);
 assert.doesNotMatch(main,/api\/admin\/users\?search=/);
 assert.match(popup,/api\/admin\/search-index/);
 assert.match(popup,/api\/admin\/search-user\?uid=/);
 assert.doesNotMatch(popup,/api\/admin\/users\?search=/);
 assert.match(main,/u\.petName/);
 assert.match(popup,/u\.petName/);
});
test('messaging reads aggregated server pages lazily',()=>{
 const ui=fs.readFileSync('admin-contact-messages.js','utf8');
 assert.match(ui,/api\/admin\/contact-messages/);
 assert.match(ui,/nextPageToken/);
 assert.match(ui,/nextToken&&loadPage\(nextToken\)/);
});
test('pet creation triggers name index sync',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/api\/search-index\/self-sync/);
 assert.equal((html.match(/void syncAdminPetSearchIndex\(\);/g)||[]).length,2);
});
