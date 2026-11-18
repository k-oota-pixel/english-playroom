import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('./index.html'),js=read('./app.js'),css=read('./style.css');
test('personal pet shows exactly four accessible emote buttons',()=>{
 const buttons=[...html.matchAll(/<button[^>]+data-emote="([^"]+)"[^>]*>/g)];
 assert.deepEqual(buttons.map(m=>m[1]),['jump','heart','sparkle','spin']);
 assert.match(html,/id="emote-menu"/);
 assert.match(html,/aria-label="ぺっとのエモート"/);
 assert.match(js,/if\(id===clientId\)\{toggleEmoteMenu\(\);return;\}/);
 assert.match(js,/hideEmoteMenu\(\);\s*openRequest\(id\)/);
});
test('camera pan keeps emote menu from triggering unintended map drags',()=>{
 assert.match(js,/event\.target\?\.closest\?\.\('#emote-menu'\)/);
 assert.match(js,/function positionEmoteMenu\(\)/);
 assert.match(js,/function hideEmoteMenu\(\)/);
 assert.match(js,/suppressPlayerClickUntil/);
 assert.match(js,/if\(!drag.active\)\{\s*drag.active=true;camera.manual=true;\s*hideEmoteMenu\(\)/);
 assert.match(css,/\.emote-menu\[hidden\]\{display:none!important\}/);
});
test('server-authoritative broadcasts trigger self and peer CSS effects with no image downloads',()=>{
 assert.match(js,/case 'emote':showEmote\(message\.id,message\.kind\)/);
 assert.match(js,/send\(\{type:'emote',kind\}\)/);
 for(const kind of ['jump','heart','sparkle','spin']){
  assert.match(js,new RegExp("'"+kind+"'"));
  assert.match(css,new RegExp('emote-'+kind));
 }
 assert.match(css,/@keyframes plaza-emote-hop/);
 assert.match(css,/@keyframes plaza-emote-twirl/);
 assert.match(css,/@keyframes plaza-emote-float/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(js,/firestore.*emote|emote.*firestore/i);
});
