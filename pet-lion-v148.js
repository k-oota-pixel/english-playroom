const OUTLINE='#40564e';
const BABY_MANE='#d89b5c';
const ADULT_MANE='#b97845';

function manePath(stage){
  if(stage==='baby')return 'M120 48 C134 43 147 49 153 60 C168 54 181 62 181 76 C196 80 202 94 194 107 C203 119 196 136 180 140 C176 155 160 162 146 156 C136 169 106 169 95 156 C80 163 64 154 61 140 C45 137 37 122 47 109 C37 96 44 81 60 77 C58 63 73 54 88 61 C95 49 106 45 120 48 Z';
  return 'M120 31 C137 25 152 33 159 46 C178 38 193 48 194 65 C214 71 220 89 209 105 C220 121 212 143 193 148 C190 168 169 179 151 169 C139 185 102 185 89 169 C70 179 49 168 46 148 C27 143 20 122 31 105 C20 89 27 70 47 65 C48 48 63 38 82 46 C89 33 103 26 120 31 Z';
}

function frontManeMarkup(stage,mane){
  if(stage==='baby')return `<g data-lion-front="1"><path d="M91 79 Q98 62 110 67 Q120 53 129 68 Q142 60 150 79 Q140 91 120 88 Q100 91 91 79Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="4"/><path d="M78 145 Q91 136 103 144 Q120 133 137 144 Q149 136 162 145 Q159 160 145 162 Q134 174 120 165 Q106 174 95 162 Q81 160 78 145Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="4"/><ellipse cx="120" cy="174" rx="25" ry="22" fill="#fff0d2" stroke="none" opacity=".82"/></g>`;
  return `<g data-lion-front="1"><path d="M87 69 Q96 48 110 56 Q120 38 131 57 Q147 47 156 69 Q145 84 120 82 Q96 84 87 69Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="4"/><path d="M69 142 Q84 129 100 141 Q120 124 140 141 Q156 129 171 142 Q168 160 151 164 Q137 181 120 170 Q103 181 89 164 Q72 160 69 142Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="4"/></g>`;
}

function patchTailTuft(svg,anatomyGroup,mane,stage){
  const candidates=[...svg.querySelectorAll(`circle[fill="${mane}"]`)].filter(el=>!anatomyGroup.contains(el));
  const tuft=candidates.at(-1);if(!tuft)return;
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('fill',mane);p.setAttribute('stroke',OUTLINE);p.setAttribute('stroke-width','3.5');p.setAttribute('stroke-linejoin','round');
  p.setAttribute('d',stage==='baby'?'M196 128 Q205 120 212 128 Q220 135 214 144 Q209 151 201 148 Q195 154 188 149 Q181 143 186 135 Q189 130 196 128Z':'M199 106 Q210 96 220 106 Q230 115 222 127 Q216 136 206 132 Q198 140 189 133 Q181 126 187 116 Q191 109 199 106Z');
  tuft.replaceWith(p);
}

function patchLionSvg(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.lionV148==='1')return;
  const stage=svg.dataset.petStage==='baby'?'baby':'adult',mane=stage==='baby'?BABY_MANE:ADULT_MANE;
  const seed=svg.querySelector(`.pet-character g > ellipse[fill="${mane}"]`);
  if(!seed)return;
  const anatomyGroup=seed.parentElement;if(!anatomyGroup)return;
  const ear=[...anatomyGroup.querySelectorAll('circle[fill]')].find(el=>el.getAttribute('fill')!=='#eab58b');
  const bodyColor=ear?.getAttribute('fill')||'#f5d99b';
  const earY=stage==='baby'?76:64,earR=stage==='baby'?19:22,innerR=stage==='baby'?11:13;
  anatomyGroup.innerHTML=`<path d="${manePath(stage)}" fill="${mane}"/><circle cx="72" cy="${earY}" r="${earR}" fill="${bodyColor}"/><circle cx="168" cy="${earY}" r="${earR}" fill="${bodyColor}"/><circle cx="72" cy="${earY}" r="${innerR}" fill="#f3b7b7" stroke="none" opacity=".88"/><circle cx="168" cy="${earY}" r="${innerR}" fill="#f3b7b7" stroke="none" opacity=".88"/>`;
  const frame=anatomyGroup.parentElement;
  const eyeGroup=[...frame.children].find(el=>el.tagName?.toLowerCase()==='g'&&el.getAttribute('fill')===OUTLINE);
  if(eyeGroup&&!frame.querySelector('[data-lion-front="1"]'))eyeGroup.insertAdjacentHTML('beforebegin',frontManeMarkup(stage,mane));
  patchTailTuft(svg,anatomyGroup,mane,stage);
  svg.dataset.lionV148='1';
}

function scan(root=document){
  if(root instanceof SVGElement)patchLionSvg(root);
  root.querySelectorAll?.('svg').forEach(patchLionSvg);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element||node.nodeType===Node.TEXT_NODE)scan(node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
