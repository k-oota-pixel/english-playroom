const OUTLINE='#40564e';
const CAT_BABY_EARS='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT_EARS='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';

function isLegacyCat(character){
  for(const el of character.querySelectorAll('path[d]')){
    const d=el.getAttribute('d');
    if(d===CAT_BABY_EARS||d===CAT_ADULT_EARS)return true;
  }
  return false;
}

function redrawCat(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDedicatedV1416==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character||!isLegacyCat(character))return;

  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');
  const href=stage==='baby'?'./cat_baby_exact2.png?v=1.4.16':'./cat_adult_exact2.png?v=1.4.16';

  character.innerHTML=`<g data-cat-png="1"><image href="${href}" x="0" y="0" width="240" height="240" preserveAspectRatio="xMidYMid meet"/></g>${accessories}`;
  svg.dataset.catDedicatedV1416='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redrawCat(root);
  root.querySelectorAll?.('svg').forEach(redrawCat);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element)scan(node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
