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

// Shop art is trusted local SVG only. The registry controls which layers exist;
// saved data never becomes markup or a URL. Populate via a future shop purchase.
export const SHOP_LAYERS = Object.freeze({
  backgrounds: {}, patterns: {}, accessories: {}
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
