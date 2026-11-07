import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FARMS,CROPS,SUPPLIES,freshFarm,normalizeFarm,plotKey,locate,growthPhase,applyFarmAction,applyPurchase,useProduce} from '../pet-farm/model.js';

test('farm preview has four rectangular gardens with 35 total cells and only the first unlocked',()=>{
 assert.deepEqual(FARMS.map(a=>a.w*a.h),[4,6,9,16]);
 assert.equal(FARMS.reduce((n,a)=>n+a.w*a.h,0),35);
 assert.deepEqual(freshFarm().unlocked,[true,false,false,false]);
 assert.deepEqual(locate(3,15),{x:22,y:14});
});

test('seed, watering, growth, fertilizer and harvest are functional',()=>{
 let f=freshFarm();
 f=applyFarmAction(f,{area:0,index:0,type:'plant',crop:'carrot'},1000).farm;
 assert.equal(f.inventory.seeds.carrot,2);
 assert.equal(growthPhase(f.plots['0-0'],1500),'dry');
 assert.throws(()=>applyFarmAction(f,{area:0,index:0,type:'harvest'},999999));
 f=applyFarmAction(f,{area:0,index:0,type:'water'},1100).farm;
 assert.equal(f.inventory.water,2);
 assert.equal(f.plots['0-0'].readyAt,61100);
 f.inventory.fertilizer=1;
 f=applyFarmAction(f,{area:0,index:0,type:'fertilize'},2100).farm;
 assert.equal(f.inventory.fertilizer,0);
 assert.equal(f.plots['0-0'].readyAt,31600);
 assert.equal(growthPhase(f.plots['0-0'],31600),'ready');
 f=applyFarmAction(f,{area:0,index:0,type:'harvest'},31601).farm;
 assert.equal(f.inventory.produce.carrot,1);
 assert.equal(f.harvests,1);
 assert.equal(f.plots['0-0'],undefined);
});

test('fertilizer also works before first watering',()=>{
 let f=freshFarm();
 f.inventory.fertilizer=1;
 f=applyFarmAction(f,{area:0,index:1,type:'plant',crop:'carrot'},1000).farm;
 f=applyFarmAction(f,{area:0,index:1,type:'fertilize'},1100).farm;
 f=applyFarmAction(f,{area:0,index:1,type:'water'},1200).farm;
 assert.equal(f.plots['0-1'].readyAt,31200);
});

test('garden expansion must be sequential and cannot exceed balance',()=>{
 const base=freshFarm();
 assert.throws(()=>applyPurchase(base,'area','2',999));
 assert.throws(()=>applyPurchase(base,'area','1',29));
 const purchased=applyPurchase(base,'area','1',30);
 assert.equal(purchased.cost,30);
 assert.equal(purchased.farm.unlocked[1],true);
 assert.equal(base.unlocked[1],false);
});

test('produce can be fed to the pet or placed in a recoverable gift box',()=>{
 let f=freshFarm();
 f.inventory.produce.carrot=3;
 f=useProduce(f,'feed','carrot').farm;
 assert.equal(f.inventory.produce.carrot,2);
 assert.equal(f.bond,1);
 f=useProduce(f,'pack','carrot').farm;
 assert.equal(f.inventory.giftBox.carrot,1);
 assert.equal(f.inventory.produce.carrot,1);
 f=useProduce(f,'unpack','carrot').farm;
 assert.equal(f.inventory.giftBox.carrot,0);
 assert.equal(f.inventory.produce.carrot,2);
});

test('farm model is normalized and never modifies the main wallet',()=>{
 const f=freshFarm();
 const saved=normalizeFarm({...f,inventory:{...f.inventory,water:4.8}});
 assert.equal(saved.inventory.water,4);
 assert.equal(Object.hasOwn(saved,'coins'),false);
 const src=readFileSync(new URL('../pet-farm/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 assert.match(src,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.doesNotMatch(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/pet-farm\//);
 assert.match(app,/accountSession\(current\)/);
 assert.match(app,/runTransaction\(db/);
});


test('farm preview uses building and popup interactions rather than fixed side panels',()=>{
 const html=readFileSync(new URL('../pet-farm/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../pet-farm/style.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 assert.match(html,/id="shopBuilding"/);
 assert.match(html,/id="storageBuilding"/);
 for(const id of ['actionDialog','shopDialog','storageDialog','previewGate']){
  assert.ok(html.includes('id="'+id+'"'),id+' must exist');
 }
 assert.doesNotMatch(html,/id="bond"|class="sidebar"/,'no persistent mood or sidebar panels');
 assert.match(app,/showDialog\('actionDialog'\)/);
 assert.match(app,/await walkTo\(12\.7,6\.35\)/);
 assert.match(app,/showDialog\('shopDialog'\)/);
 assert.match(app,/actionConfirmation\(confirm,label,verb,/);
 assert.match(app,/actionButton\('やめる'/);
 assert.doesNotMatch(app,/confirm\(item\+/,'avoid native confirmation in the shop');
 assert.match(css,/#previewGate\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/pet-farm\//);
});

test('illustrated farm stage fills screen with responsive fit and interactive hotspots',()=>{
 const html=readFileSync(new URL('../pet-farm/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../pet-farm/style.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../pet-farm/scenery.js',import.meta.url),'utf8');
 assert.match(html,/id="scenery"/);
 for(const target of ['house','shopBuilding','storageBuilding','plotLayer','petWalker'])
  assert.match(html,new RegExp('id="'+target+'"'));
 assert.match(js,/installScenery\(\$\('scenery'\)\)/);
 assert.match(js,/function fitScene\(\)/);
 assert.match(js,/Math\.max\(view\.clientWidth\/scene\.width,view\.clientHeight\/scene\.height\)/);
 assert.match(css,/\.game-shell,\.farm-stage\{height:100%/);
 assert.match(css,/#scenery\{z-index:1;pointer-events:none\}/);
 assert.match(scene,/function store\(/);
 assert.match(scene,/function pond\(/);
 assert.match(scene,/function foliage\(/);
 assert.match(scene,/FARMS\.map\(bed\)/);
 assert.doesNotMatch(html,/id="grass"|id="paths"|id="deco"/);
 assert.doesNotMatch(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/pet-farm\//);
});

test('shop sells water and fertilizer individually with owned inventory counts',()=>{
 assert.deepEqual({name:SUPPLIES.water.name,price:SUPPLIES.water.price,count:SUPPLIES.water.count},{name:'水',price:1,count:1});
 assert.deepEqual({name:SUPPLIES.fertilizer.name,price:SUPPLIES.fertilizer.price,count:SUPPLIES.fertilizer.count},{name:'肥料',price:2,count:1});
 const base=freshFarm();
 const water=applyPurchase(base,'supply','water',10,4);
 assert.equal(water.cost,4);
 assert.equal(water.farm.inventory.water,7);
 assert.equal(base.inventory.water,3);
 const fert=applyPurchase(water.farm,'supply','fertilizer',10,3);
 assert.equal(fert.cost,6);
 assert.equal(fert.farm.inventory.fertilizer,3);
 const seeds=applyPurchase(fert.farm,'seed','carrot',10,5);
 assert.equal(seeds.cost,10);
 assert.equal(seeds.farm.inventory.seeds.carrot,8);
 assert.equal(seeds.quantity,5);
});

test('shop batches validate quantity, balance, per-item stock cap, and single area unlock',()=>{
 const base=freshFarm();
 for(const qty of [0,-1,1.5,100,NaN,Infinity,'2']){
  assert.throws(()=>applyPurchase(base,'seed','carrot',1000,qty),String(qty));
 }
 assert.throws(()=>applyPurchase(base,'seed','carrot',3,2),/コインが足りません/);
 assert.throws(()=>applyPurchase(base,'area','1',300,2),/敷地は1回ずつ/);
 const nearFull=freshFarm();nearFull.inventory.water=99998;
 assert.throws(()=>applyPurchase(nearFull,'supply','water',100,2),/所持上限/);
 assert.equal(applyPurchase(nearFull,'supply','water',100,1).farm.inventory.water,99999);
 assert.equal(applyPurchase(base,'area','1',30).farm.unlocked[1],true);
});

test('farm shop popup exposes quantity buttons, stock counts, and a single transaction',()=>{
 const app=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../pet-farm/style.css',import.meta.url),'utf8');
 assert.match(app,/shopStock\(kind,id\)/);
 assert.match(app,/shop-owned/);
 assert.match(app,/shop-quantity/);
 assert.match(app,/購入数を1個減らす/);
 assert.match(app,/購入数を1個増やす/);
 assert.match(app,/maxPurchaseQuantity\(item\)/);
 assert.match(app,/const total=current.price\*p.quantity/);
 assert.match(app,/async function buy\(kind,id,quantity=1\)/);
 assert.match(app,/applyPurchase\(fdoc.exists\(\)\?fdoc.data\(\):freshFarm\(\),kind,id,c,quantity\)/);
 assert.match(css,/\.shop-qty-btn/);
 assert.match(css,/\.shop-order-total/);
});

test('pet idling is slower than intentional farm movement and uses gentle short steps',()=>{
 const js=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../pet-farm/style.css',import.meta.url),'utf8');
 assert.match(js,/async function movePoint\(x,y,leisurely=false\)/);
 assert.match(js,/Math\.min\(3800,Math\.max\(450,dist\*480\)\)/);
 assert.match(js,/Math\.min\(1900,Math\.max\(160,dist\*120\)\)/);
 assert.match(js,/await walkTo\(target,6\.5,\{leisurely:true\}\)/);
 assert.match(js,/const drift=\(Math\.random\(\)-\.5\)\*3\.4/);
 assert.match(css,/#petWalker\.walking\.strolling svg\{animation:walkBob \.85s/);
});

test('farm pet artwork removes only the decorative frame, retaining effects and equipment',()=>{
 const js=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 const art=readFileSync(new URL('../pet-art.js',import.meta.url),'utf8');
 assert.match(art,/petFrameLayer\(shop\)/);
 assert.match(js,/const equipped=\{\.\.\.\(shop\.equipped\|\|\{\}\)\}/);
 assert.match(js,/delete equipped\['pet-frame'\]/);
 assert.match(js,/renderPetSVG\(petData\.petAppearance,\{\.\.\.shop,equipped\},'',\{background:false\}\)/);
 assert.doesNotMatch(js,/delete shop\.equipped\['pet-frame'\]/);
});

test('shop modal does not shift when selecting items or changing quantity',()=>{
 const css=readFileSync(new URL('../pet-farm/style.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 assert.match(css,/#shopDialog\[open\]\s*\{[\s\S]*?display:flex;[\s\S]*?height:min\(680px,calc\(100dvh - 24px\)\)/);
 assert.match(css,/#shopDialog #shopList\s*\{[\s\S]*?flex:1 1 auto;[\s\S]*?overflow-y:auto;/);
 assert.match(css,/#shopDialog #shopConfirmation\s*\{[\s\S]*?flex:0 0 224px;[\s\S]*?min-height:224px;/);
 assert.match(app,/const scrollBeforeUpdate=list.scrollTop/);
 assert.match(app,/list.scrollTop=scrollBeforeUpdate/);
 assert.match(app,/shop-selection-hint/);
 assert.match(app,/shopTab=tab.dataset.shop;chosenPurchase=null;\$\('shopList'\).scrollTop=0/);
});
