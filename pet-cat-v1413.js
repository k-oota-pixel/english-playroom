const SVG_NS='http://www.w3.org/2000/svg';
const XLINK_NS='http://www.w3.org/1999/xlink';
const CAT_BABY_EARS='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT_EARS='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';

function isLegacyCat(character){
  for(const el of character.querySelectorAll('path[d]')){
    const d=el.getAttribute('d');
    if(d===CAT_BABY_EARS||d===CAT_ADULT_EARS)return true;
  }
  return false;
}

function catAssetUrl(stage){
  const name=stage==='baby'?'cat_baby_exact2.png':'cat_adult_exact2.png';
  const url=new URL(`./${name}`,import.meta.url);
  url.searchParams.set('v','1.4.17');
  return url.href;
}

function redrawCat(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDedicatedV1417==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character||!isLegacyCat(character))return;

  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const legacy=character.firstElementChild?.cloneNode(true)||null;
  const accessories=[...character.children].slice(1).map(el=>el.cloneNode(true));
  const href=catAssetUrl(stage);

  const group=document.createElementNS(SVG_NS,'g');
  group.setAttribute('data-cat-png','1');

  const image=document.createElementNS(SVG_NS,'image');
  image.setAttribute('x','0');
  image.setAttribute('y','0');
  image.setAttribute('width','240');
  image.setAttribute('height','240');
  image.setAttribute('preserveAspectRatio','xMidYMid meet');
  image.setAttribute('href',href);
  image.setAttributeNS(XLINK_NS,'xlink:href',href);

  if(legacy){
    image.addEventListener('error',()=>{
      if(group.isConnected)group.replaceWith(legacy);
    },{once:true});
  }

  group.appendChild(image);
  character.replaceChildren(group,...accessories);
  svg.dataset.catDedicatedV1417='1';
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
