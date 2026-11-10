import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const social=readFileSync(new URL('../pet-friends.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('friends modal close button is distinct from refresh and explicitly wired',()=>{
 assert.match(social, /id="msFriendsReload" class="ms-friends-close" type="button">更新<\/button>/);
 assert.match(social, /id="msFriendsClose" class="ms-friends-close" type="button">閉じる<\/button>/);
 assert.match(social, /\$\('#msFriendsClose',dialog\)\.onclick=\(\)=>dialog\.close\(\)/);
 assert.match(social, /\$\('#msFriendsReload',dialog\)\.onclick=async\(\)=>/);
 assert.doesNotMatch(social, /\$\('\.ms-friends-close',dialog\)\.onclick=/);
 assert.match(social, /\$\('\.ms-friends-close',petDialog\)\.onclick=\(\)=>petDialog\.close\(\)/);
});
test('social script cache entry matches displayed release',()=>{
 assert.match(home,/pet-friends\.js\?v=2\.4\.65/);
 assert.match(home,/ver2\.4\.65/);
});
