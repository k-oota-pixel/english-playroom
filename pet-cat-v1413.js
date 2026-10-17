const SVG_NS='http://www.w3.org/2000/svg';
const XLINK_NS='http://www.w3.org/1999/xlink';
const OUTLINE='#40564e';
const CAT_BABY_EARS='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT_EARS='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);
let filterSerial=0;

function isLegacyCat(character){
  for(const el of character.querySelectorAll('path[d]')){
    const d=el.getAttribute('d');
    if(d===CAT_BABY_EARS||d===CAT_ADULT_EARS)return true;
  }
  return false;
}

function assetUrl(name){
  const url=new URL(`./${name}`,import.meta.url);
  url.searchParams.set('v','1.4.19');
  return url.href;
}

function svgImage(href){
  const image=document.createElementNS(SVG_NS,'image');
  image.setAttribute('x','0');
  image.setAttribute('y','0');
  image.setAttribute('width','240');
  image.setAttribute('height','240');
  image.setAttribute('preserveAspectRatio','xMidYMid meet');
  image.setAttribute('href',href);
  image.setAttributeNS(XLINK_NS,'xlink:href',href);
  return image;
}

function bodyColorFrom(character){
  for(const el of character.querySelectorAll('[fill]')){
    const fill=(el.getAttribute('fill')||'').toLowerCase();
    if(BODY_COLORS.has(fill))return fill;
  }
  return '#f3b5c4';
}

function legacyEyeGroup(character){
  return [...character.querySelectorAll(`g[fill="${OUTLINE}"]`)].find(group=>{
    if(group.hasAttribute('opacity'))return false;
    return !!group.querySelector('ellipse,path');
  })||null;
}

function eyeStyleFrom(character){
  const group=legacyEyeGroup(character);
  if(!group)return 'round';
  const ellipses=[...group.children].filter(el=>el.tagName?.toLowerCase()==='ellipse');
  if(ellipses.length>=2){
    if(ellipses.slice(0,2).some(el=>(el.getAttribute('transform')||'').includes('rotate')))return 'cool';
    if(group.querySelectorAll('circle').length>4)return 'watery';
    return 'round';
  }
  const paths=[...group.children].filter(el=>el.tagName?.toLowerCase()==='path');
  if(paths.length>=2)return 'sparkle';
  const d=paths[0]?.getAttribute('d')||'';
  if(d.includes('Q94 98')||d.includes('Q94 97'))return 'smile';
  if(paths.length===1)return 'sleepy';
  return 'round';
}

function starPath(cx,cy,r=18){
  const inner=r*.42;
  let d='';
  for(let i=0;i<8;i++){
    const radius=i%2===0?r:inner;
    const angle=-Math.PI/2+i*Math.PI/4;
    const x=cx+Math.cos(angle)*radius;
    const y=cy+Math.sin(angle)*radius;
    d+=(i===0?'M':'L')+x.toFixed(2)+' '+y.toFixed(2)+' ';
  }
  return d+'Z';
}

function adultEyesMarkup(style){
  const dark='#123f46',aqua='#58c4b6',cream='#fff1d7';
  const left=88,right=152,y=100;
  if(style==='sleepy')return `<g data-cat-eyes="sleepy" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round"><path d="M69 99 Q88 112 107 99"/><path d="M133 99 Q152 112 171 99"/></g>`;
  if(style==='smile')return `<g data-cat-eyes="smile" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round"><path d="M69 103 Q88 88 107 103"/><path d="M133 103 Q152 88 171 103"/></g>`;
  if(style==='sparkle')return `<g data-cat-eyes="sparkle"><path d="${starPath(left,y,19)}" fill="${dark}"/><path d="${starPath(right,y,19)}" fill="${dark}"/><circle cx="${left-4}" cy="${y-5}" r="3.2" fill="#fff"/><circle cx="${right-4}" cy="${y-5}" r="3.2" fill="#fff"/></g>`;
  const tilt=style==='cool';
  const watery=style==='watery';
  const rx=watery?19:18,ry=watery?24:22;
  const eye=(cx,rot)=>`<g transform="${rot?`rotate(${rot} ${cx} ${y})`:''}"><ellipse cx="${cx}" cy="${y}" rx="${rx+2}" ry="${ry+2}" fill="${cream}"/><ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="${dark}"/><ellipse cx="${cx+2}" cy="${y+10}" rx="10" ry="6.5" fill="${aqua}"/><circle cx="${cx-6}" cy="${y-8}" r="4.3" fill="#fff"/>${watery?`<circle cx="${cx+6}" cy="${y+3}" r="2.5" fill="#fff" opacity=".85"/>`:''}</g>`;
  return `<g data-cat-eyes="${style}">${eye(left,tilt?12:0)}${eye(right,tilt?-12:0)}</g>`;
}

function babyGroup(legacy){
  const group=document.createElementNS(SVG_NS,'g');
  group.setAttribute('data-cat-png','baby');
  const image=svgImage(assetUrl('cat_baby_exact2.png'));
  if(legacy)image.addEventListener('error',()=>{if(group.isConnected)group.replaceWith(legacy);},{once:true});
  group.appendChild(image);
  return group;
}

function adultGroup(character,legacy){
  const group=document.createElementNS(SVG_NS,'g');
  group.setAttribute('data-cat-layered','adult');
  const color=bodyColorFrom(character);
  const eyeStyle=eyeStyleFrom(character);
  const filterId=`catAdultTint${++filterSerial}`;

  const defs=document.createElementNS(SVG_NS,'defs');
  const filter=document.createElementNS(SVG_NS,'filter');
  filter.setAttribute('id',filterId);
  filter.setAttribute('filterUnits','userSpaceOnUse');
  filter.setAttribute('x','0');
  filter.setAttribute('y','0');
  filter.setAttribute('width','240');
  filter.setAttribute('height','240');
  filter.setAttribute('color-interpolation-filters','sRGB');
  filter.innerHTML=`<feFlood flood-color="${color}" result="tint"/><feComposite in="tint" in2="SourceAlpha" operator="in"/>`;
  defs.appendChild(filter);

  const body=svgImage(assetUrl('cat_adult_body_mask.png'));
  body.setAttribute('filter',`url(#${filterId})`);

  const fixed=svgImage(assetUrl('cat_adult_fixed.png'));

  const eyes=document.createElementNS(SVG_NS,'g');
  eyes.innerHTML=adultEyesMarkup(eyeStyle);

  const fallback=()=>{if(legacy&&group.isConnected)group.replaceWith(legacy.cloneNode(true));};
  body.addEventListener('error',fallback,{once:true});
  fixed.addEventListener('error',fallback,{once:true});

  group.append(defs,body,fixed,eyes);
  return group;
}

function redrawCat(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDedicatedV1419==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character||!isLegacyCat(character))return;

  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const legacy=character.firstElementChild?.cloneNode(true)||null;
  const accessories=[...character.children].slice(1).map(el=>el.cloneNode(true));
  const group=stage==='baby'?babyGroup(legacy):adultGroup(character,legacy);

  character.replaceChildren(group,...accessories);
  svg.dataset.catDedicatedV1419='1';
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
