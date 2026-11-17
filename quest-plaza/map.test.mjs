import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readText=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('new WebP map uses original 48x32 logical grid without changing coordinates',()=>{
 const image=readFileSync(new URL('./plaza-map.webp',import.meta.url));
 assert.equal(image.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(image.subarray(8,12).toString('ascii'),'WEBP');
 assert.equal(image.subarray(12,16).toString('ascii'),'VP8 ');
 assert.equal(image.subarray(23,26).toString('hex'),'9d012a');
 const width=image.readUInt16LE(26)&0x3fff,height=image.readUInt16LE(28)&0x3fff;
 assert.deepEqual([width,height],[1728,1152]);
 const js=readText('./app.js');
 assert.match(js,/CELL=36/);
 assert.match(js,/WORLD_WIDTH=48\*CELL,WORLD_HEIGHT=32\*CELL/);
});
test('WebP is sole scenery layer, leaving active players and camera intact',()=>{
 const css=readText('./style.css'),html=readText('./index.html'),js=readText('./app.js');
 assert.match(css,/background-image:url\("\.\/plaza-map\.webp\?v=2\.5\.28"\)/);
 assert.match(css,/\.world\{[^}]*width:1728px;height:1152px/);
 assert.doesNotMatch(html,/class="plaza-floor"|class="fountain"|id="decorations"/);
 assert.doesNotMatch(js,/initDecor\(/);
 assert.match(html,/id="players"/);
 assert.match(js,/function paintCamera\(/);
 assert.match(js,/function updateNearby\(/);
 assert.doesNotMatch(readText('../index.html'),/quest-plaza\//);
});
