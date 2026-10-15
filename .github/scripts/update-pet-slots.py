from pathlib import Path
import re


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# pet-model.js ---------------------------------------------------------------
p = Path('pet-model.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "'red-ribbon': '<g aria-hidden=\"true\" stroke=\"#8f3343\"",
    "'red-ribbon': '<g aria-hidden=\"true\" transform=\"translate(30 -100) rotate(18 120 172)\" stroke=\"#8f3343\"",
    'red ribbon position',
)
s = replace_once(
    s,
    "'blue-ribbon': '<g aria-hidden=\"true\" stroke=\"#355985\"",
    "'blue-ribbon': '<g aria-hidden=\"true\" transform=\"translate(30 -100) rotate(18 120 172)\" stroke=\"#355985\"",
    'blue ribbon position',
)

slot_block = """export const ACCESSORY_ITEM_SLOTS = Object.freeze({
  'red-ribbon':'head',
  'blue-ribbon':'head',
  'crown':'head',
  'wizard-hat':'head',
  'pirate-hat':'head',
  'flower-crown':'head',
  'sunglasses':'face'
});

export function equippedLayers(shop={}) {
  const owned=Array.isArray(shop.ownedItems)?shop.ownedItems:[];
  const equipped=shop.equipped&&typeof shop.equipped==='object'?shop.equipped:{};
  const directLayer=slot=>{
    const registry=SHOP_LAYERS[slot],id=equipped[slot];
    return typeof id==='string' && owned.includes(id) && Object.hasOwn(registry,id)?registry[id]:'';
  };
  const accessoryIds=[];
  for(const slot of ['head','face','neck','body']){
    const id=equipped[slot];
    if(typeof id==='string' && owned.includes(id) && Object.hasOwn(SHOP_LAYERS.accessories,id))accessoryIds.push(id);
  }
  const legacy=equipped.accessories;
  const legacySlot=typeof legacy==='string'?ACCESSORY_ITEM_SLOTS[legacy]:null;
  if(typeof legacy==='string' && owned.includes(legacy) && Object.hasOwn(SHOP_LAYERS.accessories,legacy) && (!legacySlot || !equipped[legacySlot]))accessoryIds.push(legacy);
  const uniqueAccessories=[...new Set(accessoryIds)].map(id=>SHOP_LAYERS.accessories[id]).join('');
  return {
    backgrounds:directLayer('backgrounds'),
    patterns:directLayer('patterns'),
    accessories:uniqueAccessories,
    effects:directLayer('effects')
  };
}
"""
if 'export const ACCESSORY_ITEM_SLOTS' not in s:
    s, n = re.subn(
        r"export function equippedLayers\(shop=\{\}\) \{.*?\n\}\n\n// Every species",
        slot_block + "\n// Every species",
        s,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit('equippedLayers block not found')
write(p, s)

# pet-art.js -----------------------------------------------------------------
p = Path('pet-art.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "  if(a.pattern==='star') pattern=star(120,163);",
    "  // The old center-chest star looked like an accessory hanging below the mouth, so it is intentionally hidden.\n  if(a.pattern==='star') pattern='';",
    'chest star',
)
write(p, s)

# pet-shop.js ----------------------------------------------------------------
p = Path('pet-shop.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "import { OPTIONS, hasPet, normalizeAppearance, normalizePetName, validPetName } from './pet-model.js';",
    "import { OPTIONS, ACCESSORY_ITEM_SLOTS, hasPet, normalizeAppearance, normalizePetName, validPetName } from './pet-model.js';",
    'shop import',
)
for item_id, slot in {
    'red-ribbon':'head', 'blue-ribbon':'head', 'sunglasses':'face', 'crown':'head',
    'wizard-hat':'head', 'pirate-hat':'head', 'flower-crown':'head'
}.items():
    s = s.replace(f"id:'{item_id}', name:", f"id:'{item_id}', name:", 1)
    s = s.replace(f"id:'{item_id}', name:", f"id:'{item_id}', name:", 1)
    pattern = re.compile(r"(\{ id:'" + re.escape(item_id) + r"', name:'[^']+', price:\d+, slot:)'accessories'", re.M)
    s, n = pattern.subn(r"\1'" + slot + "'", s, count=1)
    if n != 1 and f"id:'{item_id}'" in s and f"slot:'{slot}'" not in s:
        raise SystemExit(f'{item_id} slot not patched')

if 'const SLOT_GROUPS' not in s:
    s = replace_once(
        s,
        "]);\n\nconst STYLE = `",
        "]);\n\nconst SLOT_GROUPS = Object.freeze([\n  {slot:'head',label:'あたま',icon:'🎀'},\n  {slot:'face',label:'かお',icon:'🕶️'},\n  {slot:'effects',label:'エフェクト',icon:'✨'},\n  {slot:'backgrounds',label:'背景',icon:'🖼️'}\n]);\n\nconst STYLE = `",
        'slot groups',
    )

if '.pet-shop-groups{' not in s:
    s = replace_once(
        s,
        ".pet-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}",
        ".pet-shop-groups{display:grid;gap:14px}.pet-shop-group{border:1px solid #ebe7d9;background:#fbfaf4;border-radius:16px;padding:10px}.pet-shop-group-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:900;color:#314d46;margin:0 0 9px;padding:0 2px}.pet-shop-group-slot{font-size:9px;color:#8b8f87;font-weight:800;margin-left:auto}\n.pet-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}",
        'shop group styles',
    )

s = replace_once(
    s,
    '<div class="pet-shop-note">買ったアイテムは何度でも着け替えできます。同じ種類のアイテムは1つだけ装備できます。</div><div id="petShopGrid" class="pet-shop-grid"></div>',
    '<div class="pet-shop-note">アイテムは装着スロットごとに整理しました。同じスロットでは1つだけ装備でき、あたま・かお・エフェクト・背景は同時に楽しめます。</div><div id="petShopGrid" class="pet-shop-groups"></div>',
    'shop note and group container',
)

helper = """const equippedIdFor=(shop,slot)=>{
  const direct=shop?.equipped?.[slot];
  if(typeof direct==='string')return direct;
  const legacy=shop?.equipped?.accessories;
  return typeof legacy==='string' && ACCESSORY_ITEM_SLOTS[legacy]===slot ? legacy : null;
};
"""
if 'const equippedIdFor=' not in s:
    s = replace_once(s, "const refFor=user=>doc(db,'users',user.uid,'apps','english-playroom');\n", "const refFor=user=>doc(db,'users',user.uid,'apps','english-playroom');\n" + helper, 'equipped helper')

render_shop = """function renderShop(){
  if(!grid)return;
  const coins=coinsOf(currentData),shop=shopOf(currentData);
  balance.textContent=`🪙 ${coins} コイン`;
  const currentSpecies=normalizeAppearance(currentData.petAppearance).species;
  speciesSelect.value=currentSpecies;
  if(document.activeElement!==nameInput)nameInput.value=validPetName(currentData.petName)?normalizePetName(currentData.petName):'';
  grid.innerHTML='';
  for(const group of SLOT_GROUPS){
    const items=ITEMS.filter(item=>item.slot===group.slot);
    if(!items.length)continue;
    const section=document.createElement('section');section.className='pet-shop-group';
    const heading=document.createElement('div');heading.className='pet-shop-group-title';heading.innerHTML=`<span>${group.icon}</span><span>${group.label}</span><span class="pet-shop-group-slot">装着スロット</span>`;section.appendChild(heading);
    const itemGrid=document.createElement('div');itemGrid.className='pet-shop-grid';
    for(const item of items){
      const owned=shop.ownedItems.includes(item.id),equipped=equippedIdFor(shop,item.slot)===item.id;
      const card=document.createElement('div');card.className='pet-shop-item';
      const action=equipped?'はずす':owned?'装備':`${item.price}コインで購入`;
      card.innerHTML=`<div class="pet-shop-icon">${item.icon}</div><div class="pet-shop-name">${item.name}</div><div class="pet-shop-price">${owned?'購入済み':`🪙 ${item.price}`}</div><button class="pet-shop-action ${owned?'owned':''} ${equipped?'equipped':''}" type="button">${action}</button>`;
      const btn=card.querySelector('button');btn.disabled=busy||(!owned&&coins<item.price);btn.addEventListener('click',()=>handleItem(item));itemGrid.appendChild(card);
    }
    section.appendChild(itemGrid);grid.appendChild(section);
  }
  const rename=dialog.querySelector('#petRenameButton'),species=dialog.querySelector('#petSpeciesButton');
  rename.disabled=busy||coins<50;species.disabled=busy||coins<100;
}
"""
s, n = re.subn(r"function renderShop\(\)\{.*?\n\}\n\nasync function withBusy", render_shop + "\nasync function withBusy", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('renderShop function not found')

handle_item = """async function handleItem(item){
  const user=currentUser;if(!user)return;
  const previewShop=shopOf(currentData);
  if(!previewShop.ownedItems.includes(item.id)){
    const ok=await requestCoinConfirm({title:'購入の確認',message:`${item.price}コインを消費して「${item.name}」を購入します。\\nよろしいですか？`,confirmLabel:'購入する'});
    if(!ok)return;
  }
  await withBusy(async()=>{
    try{
      let result='';
      await runTransaction(db,async tx=>{
        const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
        if(!hasPet(data))throw Error('ペットが誕生してから使えます。');
        const coins=coinsOf(data),shop=shopOf(data),owned=shop.ownedItems.includes(item.id),equipped=equippedIdFor(shop,item.slot)===item.id;
        const next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}};
        let nextCoins=coins;
        if(equipped){
          if(next.equipped[item.slot]===item.id)next.equipped[item.slot]=null;
          if(next.equipped.accessories===item.id)next.equipped.accessories=null;
          result=`${item.name}をはずしました。`;
        } else if(owned){
          next.equipped[item.slot]=item.id;
          const legacy=next.equipped.accessories;
          if(typeof legacy==='string' && ACCESSORY_ITEM_SLOTS[legacy]===item.slot)next.equipped.accessories=null;
          result=`${item.name}を装備しました！`;
        } else {
          if(coins<item.price)throw Error('コインが足りません。');
          nextCoins=coins-item.price;next.ownedItems.push(item.id);next.equipped[item.slot]=item.id;
          const legacy=next.equipped.accessories;
          if(typeof legacy==='string' && ACCESSORY_ITEM_SLOTS[legacy]===item.slot)next.equipped.accessories=null;
          result=`${item.name}をゲット！`;
        }
        tx.set(ref,{coins:nextCoins,petShop:next,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
      setToast(result,'ok');
    }catch(e){setToast(e?.message||'ショップの処理に失敗しました。','error');}
  });
}
"""
s, n = re.subn(r"async function handleItem\(item\)\{.*?\n\}\nasync function renamePet", handle_item + "async function renamePet", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('handleItem function not found')
write(p, s)

print('Pet design and slot shop patch applied')
