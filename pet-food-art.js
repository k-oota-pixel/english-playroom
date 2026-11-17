// Twelve food types, one row each in the optional 5 x 12 WebP sprite.
// Built-in emoji art remains usable until the WebP sheet is deployed.
const FOOD_IDS=['apple','carrot','biscuit','cheese','fish','sandwich','burger','curry','omurice','steak','sashimi','parfait'];
const FOOD_ICONS=['🍎','🥕','🦴','🧀','🐟','🥪','🍔','🍛','🍳','🥩','🍣','🍨'];
const SPRITE_URL=new URL('./assets/pet-food/consumption.webp',import.meta.url).href;
const FOOD_STYLE=[
'#petFeedDialog{width:min(630px,calc(100vw - 24px));max-height:90dvh;box-sizing:border-box;overflow:auto}',
'#petFeedDialog .pet-feed-card{padding:22px 18px 14px}',
'.pet-food-tier{margin:16px 0}.pet-food-tier-title{font-size:14px;font-weight:800;color:#3c6758;margin:4px 0 9px}',
'.pet-food-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
'.pet-food-choice{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;width:100%;padding:10px 6px;border:2px solid #e9ddc6;border-radius:16px;background:#fffaf0;color:#214f43;text-align:center;font-family:inherit;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}',
'.pet-food-choice:hover:not(:disabled),.pet-food-choice:focus-visible{background:#eef8ee;border-color:#28745e;outline-offset:3px;transform:translateY(-2px)}',
'.pet-food-choice:disabled{opacity:.46;cursor:not-allowed}.pet-food-picture{width:74px;max-width:90%;flex:0 0 auto}',
'.pet-food-art{display:block;width:100%;aspect-ratio:1/1;position:relative;background-size:500% 1200%;background-repeat:no-repeat}',
'.pet-food-fallback{position:absolute;inset:0;display:grid;place-items:center;font-size:clamp(40px,7vw,62px);filter:drop-shadow(0 3px 3px #42332230);line-height:1}',
'.pet-food-sprite-ready .pet-food-fallback{display:none}',
'.pet-food-copy{min-width:0}.pet-food-copy strong{display:block;font-size:13px;line-height:1.45;overflow-wrap:anywhere}',
'.pet-food-copy small{display:block;color:#7d856d;font-size:12px;margin-top:3px}',
'.pet-food-price{font-size:15px;font-weight:800;white-space:nowrap}.pet-food-price small{font-size:10px;font-weight:500;margin-left:3px}',
'.pet-eating-food{position:absolute;right:0;bottom:4%;width:38%;z-index:12;pointer-events:none;filter:drop-shadow(0 3px 2px #543b2320)}',
'.pet-eating-food .pet-food-art{width:100%;height:auto}',
'.pet-eating-food .pet-feeding-caption{display:block;text-align:center;font:700 11px/1.5 sans-serif;color:#4e6958;background:#fff8e6e8;border-radius:12px}',
'#petVisual[data-care-reacting=eating] .pet-care-motion-layer{animation:petEatingBite .55s ease-in-out infinite;transform-origin:120px 200px;transform-box:view-box}',
'@keyframes petEatingBite{0%,100%{transform:translate(0,0) rotate(0)}45%{transform:translate(8px,7px) rotate(7deg)}70%{transform:translate(4px,3px) rotate(3deg)}}',
'@media(max-width:480px){.pet-food-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pet-food-picture{width:66px}.pet-food-copy strong{font-size:12px}}',
'@media(prefers-reduced-motion:reduce){#petVisual[data-care-reacting=eating] .pet-care-motion-layer{animation:none!important}.pet-food-choice{transition:none}}'
].join('\n');
if(typeof document!=='undefined'){
 if(!document.getElementById('petFoodStyle251')){
  const s=document.createElement('style');s.id='petFoodStyle251';s.textContent=FOOD_STYLE;document.head.append(s);
 }
 const image=new Image();
 image.onload=()=>document.documentElement.classList.add('pet-food-sprite-ready');
 image.onerror=()=>document.documentElement.classList.remove('pet-food-sprite-ready');
 image.src=SPRITE_URL;
}
export function foodArt(id,remaining=4){
 const row=FOOD_IDS.indexOf(id),safeRow=Math.max(0,row);
 const stage=4-Math.max(0,Math.min(4,Math.round(remaining)));
 const percent=([100,88,66,42,0])[stage];
 const polygon=stage===0?'none':stage===4?'none':
  'polygon(0 0,'+percent+'% 0,'+(percent-8)+'% 14%,'+(percent+1)+'% 30%,'+(percent-8)+'% 46%,'+(percent+1)+'% 61%,'+(percent-7)+'% 80%,'+percent+'% 100%,0 100%)';
 const icon=stage===4?'✨':FOOD_ICONS[safeRow],position=(safeRow*100/11).toFixed(5);
 return '<span class="pet-food-art" aria-hidden="true" style="background-image:url('+SPRITE_URL+');background-position:'+(stage*25)+'% '+position+'%"><span class="pet-food-fallback" style="clip-path:'+polygon+'">'+icon+'</span></span>';
}
