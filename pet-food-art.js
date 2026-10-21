const FOOD_STYLE=`
#petFeedDialog{width:min(440px,calc(100vw - 28px));max-height:90dvh;box-sizing:border-box;overflow:auto}
#petFeedDialog .pet-feed-card{padding:26px 20px 14px}
.pet-food-choice{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0;padding:10px 14px;border:2px solid #e9ddc6;border-radius:18px;background:#fffaf0;color:#214f43;text-align:left;font-family:inherit;cursor:pointer;transition:background .15s,border-color .15s}
.pet-food-choice:hover:not(:disabled),.pet-food-choice:focus-visible{background:#eef8ee;border-color:#28745e;outline-offset:3px}
.pet-food-choice:disabled{opacity:.45;cursor:default}.pet-food-picture{width:76px;flex:0 0 76px}.pet-food-art{display:block;width:100%;height:auto}
.pet-food-copy{flex:1;min-width:0}.pet-food-copy strong{display:block;font-size:16px;line-height:1.5}.pet-food-copy small{display:block;color:#7d856d;font-size:12px;margin-top:4px}
.pet-food-price{font-size:18px;font-weight:800;white-space:nowrap}.pet-food-price small{display:block;font-size:10px;text-align:right;font-weight:500}
.pet-eating-food{position:absolute;right:0;bottom:4%;width:38%;z-index:12;pointer-events:none;filter:drop-shadow(0 3px 2px #543b2320)}
.pet-eating-food span{display:block;text-align:center;font:700 11px/1.5 sans-serif;color:#4e6958;background:#fff8e6e8;border-radius:12px}
#petVisual[data-care-reacting=eating] .pet-care-motion-layer{animation:petEatingBite .7s ease-in-out infinite;transform-origin:120px 200px;transform-box:view-box}
@keyframes petEatingBite{0%,100%{transform:translate(0,0) rotate(0)}45%{transform:translate(8px,7px) rotate(7deg)}70%{transform:translate(4px,3px) rotate(3deg)}}
@media(max-width:380px){.pet-food-picture{width:64px;flex-basis:64px}.pet-food-choice{gap:8px;padding:9px}.pet-food-copy strong{font-size:14px}}
@media(prefers-reduced-motion:reduce){#petVisual[data-care-reacting=eating] .pet-care-motion-layer{animation:none!important}}
`;
if(typeof document!=='undefined'&&!document.getElementById('petFoodStyle180')){const s=document.createElement('style');s.id='petFoodStyle180';s.textContent=FOOD_STYLE;document.head.append(s);}
// One illustration shared by the menu and every stage of the meal.
export function foodArt(id,remaining=3){
 const drawings={
 snack:'<circle cx="48" cy="42" r="29" fill="#e7ae61"/><path d="M25 27 Q42 9 65 26" fill="none" stroke="#f9d294" stroke-width="5"/><g fill="#79503a" stroke="none"><circle cx="38" cy="29" r="4"/><circle cx="59" cy="33" r="5"/><circle cx="32" cy="49" r="5"/><circle cx="51" cy="52" r="4"/><circle cx="66" cy="51" r="3"/></g>',
 meal:'<path d="M58 43 L75 59 Q86 55 86 65 Q88 75 78 73 Q72 82 68 72 L52 55Z" fill="#fff6dc"/><path d="M22 26 Q39 10 57 23 Q74 32 62 52 Q50 72 30 60 Q9 48 22 26Z" fill="#b95d43"/><path d="M25 30 Q38 21 47 27 M22 40 Q29 35 34 37" stroke="#f3ac77" stroke-width="5" fill="none"/>',
 special:'<path d="M20 43 L72 37 L72 66 L20 72Z" fill="#f4bd78"/><path d="M20 52 L72 46 L72 55 L20 61Z" fill="#f4939d" stroke="none"/><path d="M20 43 L40 22 L72 37Z" fill="#fff8e7"/><path d="M20 43 L72 37 L72 44 L20 50Z" fill="#fff8e7"/><path d="M40 25 Q29 15 39 12 Q50 10 50 21Z" fill="#e77478"/><path d="M40 14 L43 8" stroke="#4f8b61" stroke-width="4"/>'
 };
 const amount=Math.max(0,Math.min(3,remaining));
 return `<svg class="pet-food-art" viewBox="0 0 96 88" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><ellipse cx="48" cy="75" rx="42" ry="9" fill="#ecdfc5"/><path d="M7 73 Q48 91 89 73" fill="none" stroke="#b9aa8c" stroke-width="3"/><svg x="${18*(3-amount)}" y="0" width="${96-18*(3-amount)}" height="76" viewBox="${18*(3-amount)} 0 ${96-18*(3-amount)} 76" overflow="hidden"><g stroke="#684832" stroke-width="2.5" stroke-linejoin="round">${amount?drawings[id]||drawings.snack:''}</g></svg></svg>`;
}
