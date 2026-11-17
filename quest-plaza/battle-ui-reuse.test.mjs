import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('./index.html'),js=read('./app.js'),theme=read('./battle-quest-theme.css');
test('PvP reuses Quest rarity cards and battle stage styling',()=>{
 assert.match(html,/battle-panel battle-stage/);
 assert.match(js,/ranked-card.*rarity-/);
 assert.match(js,/card-art/);
 assert.match(theme,/\.rarity-ssr/);
 assert.match(theme,/\.rarity-sr/);
 assert.match(theme,/\.battle-energy/);
 assert.match(html,/battle-quest-theme\.css/);
});
test('PvP has battle tabs, visible HP and MP and confirmed action effects',()=>{
 for(const tab of ['attack','magic','items'])assert.match(html,new RegExp('data-battle-tab="'+tab+'"'));
 assert.match(js,/hp-meter/);
 assert.match(js,/mp-meter/);
 assert.match(js,/playBattleEffect\(message\)/);
 assert.match(js,/reviveTarget:selectedReviveTarget/);
 assert.match(html,/id="battle-forfeit"/);
 assert.match(js,/type:'forfeit'/);
});
