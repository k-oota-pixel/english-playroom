// Keep the cleaning effect separate from the pet's SVG and walking timeline.
export function prepareCleaning(visual){
 const source=visual?.querySelector('.pet-waste-layer');
 if(!source)return {play:async()=>{},stop(){}};
 const rect=visual.getBoundingClientRect(),overlay=source.cloneNode(true);
 overlay.className='pet-clean-overlay';
 overlay.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:1000`;
 overlay.setAttribute('aria-hidden','true');
 document.body.append(overlay);
 const pieces=[...overlay.children].sort((a,b)=>parseFloat(a.style.left)-parseFloat(b.style.left));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const animations=[];
 function animate(el,frames,options){const a=el.animate(frames,options);animations.push(a);return a.finished.catch(()=>{});}
 return {
  async play(){
   if(reduced)return;
   const broom=document.createElement('span');broom.textContent='🧹';
   broom.style.cssText='position:absolute;left:0;bottom:4%;font-size:36px;line-height:1';
   overlay.append(broom);
   const sweep=animate(broom,[{transform:'translateX(-10px) rotate(-25deg)',opacity:0},{opacity:1,offset:.1},{transform:`translateX(${rect.width*.85}px) rotate(20deg)`,opacity:1,offset:.85},{transform:`translateX(${rect.width}px) rotate(20deg)`,opacity:0}],{duration:1000,fill:'forwards'});
   await Promise.all([sweep,...pieces.map((piece,i)=>animate(piece,[{transform:'scale(1)',opacity:1},{transform:'scale(.6)',opacity:0}],{duration:220,delay:120+i*160,fill:'forwards'}).then(()=>{
    const star=document.createElement('span');star.textContent='✨';star.style.cssText=piece.style.cssText;overlay.append(star);
    return animate(star,[{transform:'translateY(0) scale(.6)',opacity:0},{opacity:1,offset:.3},{transform:'translateY(-20px) scale(1.1)',opacity:0}],{duration:350,fill:'forwards'});
   }))]);
   // Animate the outer SVG only: the character keeps its exact walk phase.
   const svg=visual.querySelector(':scope > svg');
   if(svg)await animate(svg,[{translate:'0 0'},{translate:'0 -12px',offset:.45},{translate:'0 0'}],{duration:420});
  },
  stop(){animations.forEach(a=>a.cancel());overlay.remove();}
 };
}
