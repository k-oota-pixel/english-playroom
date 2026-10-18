const OUTLINE='#40564e';
const CREAM='#fff0d2';
const MUZZLE='#fff8ed';
const TONGUE='#ef9e9e';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);

function bodyColor(root){
  for(const el of root.querySelectorAll('[fill]')){
    const fill=(el.getAttribute('fill')||'').toLowerCase();
    if(BODY_COLORS.has(fill))return fill;
  }
  return '#f5d99b';
}

function dogDesign(svg){
  return [...svg.querySelectorAll('g[data-pet-redesign]')].find(group=>(group.getAttribute('data-pet-redesign')||'').startsWith('dog-'))||null;
}

function eyeMarkup(design,stage){
  const eyes=design.querySelector('[data-shared-legacy-eyes]')?.cloneNode(true);
  if(!eyes)return '';
  eyes.setAttribute('transform',stage==='baby'?'translate(0 -11)':'translate(0 -17)');
  return eyes.outerHTML;
}

function tail(color,stage){
  if(stage==='baby')return `<g><path d="M161 169 C181 163 191 151 189 137 C188 126 193 122 200 128 C211 137 214 152 210 165 C205 181 191 190 176 188 C166 187 159 182 156 174 C165 177 175 173 182 166 C190 157 190 149 186 144 C181 153 172 163 161 169Z" fill="${color}"/><path d="M188 136 C188 126 193 122 200 128 C207 134 211 142 211 151 C205 146 199 145 193 149 C193 144 191 139 188 136Z" fill="${CREAM}" stroke="none" opacity=".96"/></g>`;
  return `<g><path d="M161 163 C184 155 194 141 191 125 C189 113 195 108 203 115 C216 126 219 144 214 159 C209 178 193 189 176 188 C165 188 158 182 154 173 C166 176 177 171 185 162 C194 151 194 141 189 135 C183 145 174 156 161 163Z" fill="${color}"/><path d="M191 124 C190 113 196 109 203 115 C211 122 216 132 216 143 C209 137 203 136 196 140 C196 134 194 128 191 124Z" fill="${CREAM}" stroke="none" opacity=".96"/></g>`;
}

function ears(color,stage){
  const left=stage==='baby'
    ? 'M82 79 C68 61 45 62 39 83 C34 102 40 123 55 127 C68 130 75 115 78 101 C80 91 83 84 90 80Z'
    : 'M80 73 C64 53 41 57 35 81 C30 102 38 127 55 130 C70 132 77 115 80 98 C82 88 85 79 92 75Z';
  const right=stage==='baby'
    ? 'M158 79 C172 61 195 62 201 83 C206 102 200 123 185 127 C172 130 165 115 162 101 C160 91 157 84 150 80Z'
    : 'M160 73 C176 53 199 57 205 81 C210 102 202 127 185 130 C170 132 163 115 160 98 C158 88 155 79 148 75Z';
  return `<g><path d="${left}" fill="${color}"/><path d="${right}" fill="${color}"/><path d="${left}" fill="#6b4b43" stroke="none" opacity=".08"/><path d="${right}" fill="#6b4b43" stroke="none" opacity=".08"/></g>`;
}

function body(color,stage){
  if(stage==='baby')return `<g><ellipse cx="120" cy="166" rx="45" ry="42" fill="${color}"/><ellipse cx="84" cy="187" rx="23" ry="17" fill="${color}"/><ellipse cx="156" cy="187" rx="23" ry="17" fill="${color}"/><ellipse cx="120" cy="170" rx="24" ry="28" fill="${CREAM}" stroke="none" opacity=".95"/><path d="M82 145 C80 163 84 190 97 197 C105 201 111 193 109 180 L106 152Z" fill="${color}"/><path d="M158 145 C160 163 156 190 143 197 C135 201 129 193 131 180 L134 152Z" fill="${color}"/><ellipse cx="98" cy="195" rx="14" ry="10" fill="${CREAM}"/><ellipse cx="142" cy="195" rx="14" ry="10" fill="${CREAM}"/><path d="M92 195 v5 M98 195 v6 M142 195 v6 M148 195 v5" fill="none" stroke-width="2.2"/></g>`;
  return `<g><ellipse cx="120" cy="164" rx="47" ry="47" fill="${color}"/><ellipse cx="83" cy="188" rx="24" ry="18" fill="${color}"/><ellipse cx="157" cy="188" rx="24" ry="18" fill="${color}"/><ellipse cx="120" cy="169" rx="26" ry="33" fill="${CREAM}" stroke="none" opacity=".95"/><path d="M79 142 C77 165 82 195 97 202 C107 206 113 197 111 181 L108 149Z" fill="${color}"/><path d="M161 142 C163 165 158 195 143 202 C133 206 127 197 129 181 L132 149Z" fill="${color}"/><ellipse cx="98" cy="199" rx="15" ry="10.5" fill="${CREAM}"/><ellipse cx="142" cy="199" rx="15" ry="10.5" fill="${CREAM}"/><path d="M91 199 v5 M98 199 v6 M142 199 v6 M149 199 v5" fill="none" stroke-width="2.2"/></g>`;
}

function face(stage,color,eyes){
  const baby=stage==='baby';
  const head=baby
    ? 'M69 100 C69 68 90 51 120 51 C150 51 171 68 171 100 C171 132 151 147 120 148 C89 147 69 132 69 100Z'
    : 'M67 96 C67 62 89 45 120 45 C151 45 173 62 173 96 C173 131 151 147 120 148 C89 147 67 131 67 96Z';
  const blaze=baby
    ? 'M108 60 C114 53 126 53 132 60 C136 71 132 84 132 96 C132 106 128 113 120 117 C112 113 108 106 108 96 C108 84 104 71 108 60Z'
    : 'M107 54 C113 47 127 47 133 54 C138 66 133 81 133 94 C133 106 129 113 120 117 C111 113 107 106 107 94 C107 81 102 66 107 54Z';
  const eyeY=baby?103:99;
  const muzzleY=baby?122:119;
  const noseY=baby?117:114;
  const cheekY=baby?122:119;
  return `<g><path d="${head}" fill="${color}"/><path d="${blaze}" fill="${CREAM}" stroke="none" opacity=".96"/><ellipse cx="120" cy="${muzzleY}" rx="${baby?33:34}" ry="${baby?24:25}" fill="${MUZZLE}" stroke="none" opacity=".98"/>${eyes}<g fill="#e69c9c" opacity=".42" stroke="none"><ellipse cx="82" cy="${cheekY}" rx="9" ry="5.5"/><ellipse cx="158" cy="${cheekY}" rx="9" ry="5.5"/></g><path d="M114 ${noseY} Q120 ${noseY-6} 126 ${noseY} Q120 ${noseY+7} 114 ${noseY}Z" fill="#5d4a43" stroke="none"/><path d="M120 ${noseY+6} V${noseY+11} M120 ${noseY+11} Q113 ${noseY+20} 106 ${noseY+13} M120 ${noseY+11} Q127 ${noseY+20} 134 ${noseY+13}" fill="none"/><path d="M113 ${noseY+17} Q120 ${noseY+26} 127 ${noseY+17} Q126 ${noseY+32} 120 ${noseY+34} Q114 ${noseY+32} 113 ${noseY+17}Z" fill="${TONGUE}" stroke="${OUTLINE}" stroke-width="3"/></g>`;
}

function dogMarkup(stage,color,eyes){
  return `<g data-dog-v1519="${stage}" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${tail(color,stage)}${body(color,stage)}${ears(color,stage)}${face(stage,color,eyes)}</g>`;
}

function redraw(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.dogV1519==='1')return;
  const design=dogDesign(svg);if(!design)return;
  const stage=(design.getAttribute('data-pet-redesign')||'').endsWith('-adult')?'adult':'baby';
  const color=bodyColor(design);
  const eyes=eyeMarkup(design,stage);
  design.innerHTML=dogMarkup(stage,color,eyes);
  design.setAttribute('data-pet-redesign',`dog-${stage}`);
  svg.dataset.dogV1519='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redraw(root);
  root.querySelectorAll?.('svg').forEach(redraw);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
