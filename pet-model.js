// Stable IDs are persisted; labels and SVG art may evolve independently.
export const OPTIONS = Object.freeze({
  species: [{id:'cat',label:'ねこ'},{id:'dog',label:'いぬ'},{id:'bird',label:'ことり'},{id:'mystery',label:'ふしぎな子'},{id:'rabbit',label:'うさぎ'},{id:'hamster',label:'ハムスター'},{id:'fox',label:'きつね'},{id:'panda',label:'パンダ'},{id:'penguin',label:'ペンギン'},{id:'dragon',label:'ドラゴン'}],
  bodyColor: [{id:'cream',label:'クリーム',color:'#f5d99b'},{id:'pink',label:'ピンク',color:'#f3b5c4'},{id:'blue',label:'ブルー',color:'#a4cce9'},{id:'mint',label:'ミント',color:'#a9d9bc'},{id:'lavender',label:'ラベンダー',color:'#c6b8e3'},{id:'orange',label:'オレンジ',color:'#efb478'}],
  eyes: [{id:'round',label:'まんまる'},{id:'sleepy',label:'ねむねむ'},{id:'sparkle',label:'きらきら'},{id:'cool',label:'クール'}],
  feature: [{id:'classic',label:'ベーシック'},{id:'long',label:'長い耳・羽'},{id:'horns',label:'小さな角'}],
  pattern: [{id:'none',label:'なし'},{id:'spots',label:'水玉'},{id:'stripes',label:'しましま'},{id:'star',label:'星'}],
  baseBackground: [{id:'ivory',label:'アイボリー',color:'#fff3d9'},{id:'sky',label:'そら',color:'#e3f0fc'},{id:'leaf',label:'わかば',color:'#e4f2e5'},{id:'rose',label:'さくら',color:'#fae6ed'}]
});
export const DEFAULT_APPEARANCE = Object.freeze(Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items[0].id])));
export function normalizeAppearance(value={}) {
  return Object.fromEntries(Object.entries(OPTIONS).map(([key,items])=>[key,items.some(item=>item.id===value?.[key])?value[key]:items[0].id]));
}
export function validAppearance(value) {
  return !!value && Object.entries(OPTIONS).every(([key,items])=>items.some(item=>item.id===value[key]));
}
export function loginProgress(data,today) {
  const raw=Number(data.petLoginDays);
  const days=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
  // Do not count a clock moved backwards as another login day.
  const last=typeof data.petLastLoginDate==='string'?data.petLastLoginDate:'';
  const count=!last || today>last;
  return {petLoginDays:days+(count?1:0),petLastLoginDate:count?today:last};
}
export function readyToHatch(data) { return !!data.petHatched || Number(data.petLoginDays)>=3; }
export function hasPet(data) { return !!data.petHatched && validAppearance(data.petAppearance); }

// Shop art is trusted local SVG only. Saved data contains IDs only; it never becomes markup or a URL.
export const SHOP_LAYERS = Object.freeze({
  backgrounds: Object.freeze({
    'forest-bg': '<g aria-hidden="true"><circle cx="38" cy="58" r="31" fill="#8fc69c" opacity=".7"/><circle cx="68" cy="43" r="28" fill="#76b788" opacity=".72"/><circle cx="199" cy="53" r="34" fill="#78b989" opacity=".68"/><rect x="31" y="73" width="10" height="61" rx="5" fill="#866849" opacity=".55"/><rect x="194" y="78" width="10" height="58" rx="5" fill="#866849" opacity=".55"/><path d="M0 205 Q45 180 86 204 T168 202 T240 200 V240 H0Z" fill="#b9d8a7" opacity=".7"/></g>',
    'ocean-bg': '<g aria-hidden="true"><circle cx="198" cy="43" r="20" fill="#ffd36f" opacity=".85"/><path d="M0 150 Q30 137 60 150 T120 150 T180 150 T240 150 V240 H0Z" fill="#8fd0ea" opacity=".82"/><path d="M0 172 Q30 159 60 172 T120 172 T180 172 T240 172" fill="none" stroke="#ffffff" stroke-width="6" opacity=".65"/><path d="M18 72 Q30 60 42 72 Q54 60 66 72" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".78"/></g>',
    'space-bg': '<g aria-hidden="true"><rect width="240" height="240" rx="32" fill="#202747"/><g fill="#fff5bd"><circle cx="31" cy="41" r="3"/><circle cx="72" cy="28" r="2"/><circle cx="202" cy="38" r="3"/><circle cx="220" cy="91" r="2"/><circle cx="27" cy="112" r="2.5"/><circle cx="188" cy="118" r="2"/><circle cx="47" cy="191" r="2"/></g><circle cx="181" cy="70" r="22" fill="#b8c6ff" opacity=".68"/><path d="M156 70 Q181 56 206 70 Q181 86 156 70Z" fill="none" stroke="#e8ecff" stroke-width="5" opacity=".55"/></g>',
    'castle-bg': '<g aria-hidden="true"><path d="M0 196 H38 V125 H53 V109 H68 V125 H91 V98 H105 V80 H120 V98 H135 V125 H159 V108 H174 V125 H201 V196 H240 V240 H0Z" fill="#c4b3cf" opacity=".62"/><path d="M103 196 V158 Q120 137 137 158 V196" fill="#fff" opacity=".56"/><rect x="54" y="144" width="13" height="18" rx="5" fill="#fff" opacity=".65"/><rect x="173" y="144" width="13" height="18" rx="5" fill="#fff" opacity=".65"/></g>'
  }),
  patterns: Object.freeze({}),
  accessories: Object.freeze({
    'red-ribbon': '<g aria-hidden="true" stroke="#8f3343" stroke-width="3" stroke-linejoin="round"><path d="M108 168 Q89 153 84 169 Q87 185 108 176Z" fill="#e55f72"/><path d="M132 168 Q151 153 156 169 Q153 185 132 176Z" fill="#e55f72"/><circle cx="120" cy="172" r="9" fill="#ef7e8d"/></g>',
    'blue-ribbon': '<g aria-hidden="true" stroke="#355985" stroke-width="3" stroke-linejoin="round"><path d="M108 168 Q89 153 84 169 Q87 185 108 176Z" fill="#6ea8e5"/><path d="M132 168 Q151 153 156 169 Q153 185 132 176Z" fill="#6ea8e5"/><circle cx="120" cy="172" r="9" fill="#8ebbed"/></g>',
    'sunglasses': '<g aria-hidden="true" stroke="#26352f" stroke-width="5" stroke-linecap="round" fill="#344b58" opacity=".96"><path d="M78 101 H109 L105 122 Q94 132 82 120Z"/><path d="M131 101 H162 L158 120 Q146 132 135 122Z"/><path d="M109 105 Q120 99 131 105" fill="none"/><path d="M78 104 L66 101 M162 104 L174 101" fill="none"/></g>',
    'crown': '<g aria-hidden="true" stroke="#8d6a14" stroke-width="3" stroke-linejoin="round"><path d="M83 72 L76 38 L101 55 L120 29 L139 55 L164 38 L157 72Z" fill="#f6c94d"/><rect x="84" y="68" width="72" height="13" rx="5" fill="#eeb93f"/><circle cx="120" cy="51" r="5" fill="#ef7180" stroke="none"/></g>',
    'wizard-hat': '<g aria-hidden="true" stroke="#433b67" stroke-width="3" stroke-linejoin="round"><path d="M85 74 Q112 38 132 11 Q141 45 157 71Z" fill="#655b9c"/><ellipse cx="121" cy="75" rx="51" ry="10" fill="#544c86"/><path d="M113 44 l4 7 8 2 -6 5 1 8 -7-4 -7 4 1-8 -6-5 8-2Z" fill="#ffd76c" stroke="none"/></g>',
    'pirate-hat': '<g aria-hidden="true" stroke="#2e3834" stroke-width="3" stroke-linejoin="round"><path d="M75 69 Q87 36 120 46 Q153 36 165 69 Q145 82 120 70 Q95 82 75 69Z" fill="#34433e"/><path d="M81 65 Q120 89 159 65" fill="none"/><circle cx="120" cy="57" r="6" fill="#fff" stroke="none"/><path d="M108 66 L132 48 M108 48 L132 66" stroke="#fff" stroke-width="3"/></g>',
    'flower-crown': '<g aria-hidden="true" stroke="#6b8159" stroke-width="2"><path d="M81 70 Q120 49 159 70" fill="none" stroke="#6f9b64" stroke-width="5"/><g fill="#f7c8d9" stroke="none"><circle cx="92" cy="64" r="8"/><circle cx="120" cy="57" r="9"/><circle cx="149" cy="65" r="8"/></g><g fill="#ffe47b" stroke="none"><circle cx="92" cy="64" r="3"/><circle cx="120" cy="57" r="3"/><circle cx="149" cy="65" r="3"/></g></g>'
  }),
  effects: Object.freeze({
    'star-effect': '<g aria-hidden="true" fill="#f4c84f" stroke="#fff4bd" stroke-width="2" opacity=".95"><path d="M35 87 l5 10 11 2 -8 8 2 11 -10-5 -10 5 2-11 -8-8 11-2Z"/><path d="M204 118 l4 8 9 2 -7 6 2 9 -8-4 -8 4 2-9 -7-6 9-2Z"/><path d="M188 41 l3 6 7 1 -5 5 1 7 -6-3 -6 3 1-7 -5-5 7-1Z"/></g>',
    'sparkle-effect': '<g aria-hidden="true" fill="none" stroke="#ffe68a" stroke-width="4" stroke-linecap="round" opacity=".95"><path d="M35 62 v22 M24 73 h22 M199 82 v26 M186 95 h26 M191 174 v19 M181 184 h20 M48 170 v17 M40 179 h16"/><g stroke="#fff" stroke-width="2"><path d="M35 66 v14 M28 73 h14 M199 87 v16 M191 95 h16"/></g></g>'
  })
});
export function equippedLayers(shop={}) {
  const owned=Array.isArray(shop.ownedItems)?shop.ownedItems:[];
  const equipped=shop.equipped||{};
  return Object.fromEntries(Object.entries(SHOP_LAYERS).map(([slot,registry])=>{
    const id=equipped[slot];
    return [slot,typeof id==='string' && owned.includes(id) && Object.hasOwn(registry,id)?registry[id]:''];
  }));
}

// Every species remains possible; the answer gives two species triple weight.
export const PERSONALITY_POOLS = Object.freeze({
 calm:['cat','panda'], playful:['dog','hamster'], curious:['bird','penguin'],
 gentle:['rabbit','fox'], magical:['mystery','dragon']
});
export function chooseSpecies(preference, random=Math.random) {
 const favorites=Object.hasOwn(PERSONALITY_POOLS,preference)?PERSONALITY_POOLS[preference]:[];
 const tickets=OPTIONS.species.flatMap(({id})=>Array(favorites.includes(id)?3:1).fill(id));
 return tickets[Math.min(tickets.length-1,Math.max(0,Math.floor(random()*tickets.length)))];
}
export function appearanceFromAnswers(answers,random=Math.random) {
 const {personality,...appearance}=answers;
 return {...appearance,species:chooseSpecies(personality,random)};
}

export function normalizePetName(value) {
 return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim():'';
}
export function validPetName(value) {
 const name=normalizePetName(value);return name.length>0 && [...name].length<=12;
}
