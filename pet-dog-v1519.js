const OUTLINE='#40564e';
const CREAM='#fff0d2';
const MUZZLE='#fff8ed';
const INNER_EAR='#efb7b2';
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
  eyes.setAttribute('transform',stage==='baby'?'translate(0 -13)':'translate(0 -20)');
  return eyes.outerHTML;
}

function tail(color,stage){
  if(stage==='baby')return `<g><path d="M159 166 C173 160 183 151 183 137 C183 127 188 124 195 130 C207 139 211 153 207 166 C203 181 190 191 176 190 C166 189 159 184 156 176 C165 179 175 175 182 168 C190 159 190 151 184 146 C178 153 171 160 159 166Z" fill="${color}"/><path d="M184 134 C186 126 190 125 195 130 C204 137 208 147 208 157 C203 152 197 151 191 154 C190 146 188 140 184 134Z" fill="${CREAM}" stroke="none"/></g>`;
  return `<g><path d="M160 158 C177 150 186 138 186 123 C186 112 191 109 199 116 C213 127 217 144 212 160 C207 178 192 190 176 190 C166 189 159 184 155 175 C166 178 177 173 184 164 C193 153 193 143 187 137 C181 146 173 153 160 158Z" fill="${color}"/><path d="M187 121 C189 111 194 111 199 116 C209 124 214 136 214 148 C208 142 201 141 194 145 C193 136 191 128 187 121Z" fill="${CREAM}" stroke="none"/></g>`;
}

function ears(color,stage){
  if(stage==='baby')return `<g><path d="M76 80 C58 65 40 73 42 102 C44 122 57 132 71 116 C79 106 82 92 89 84Z" fill="${color}"/><path d="M164 80 C182 65 200 73 198 102 C196 122 183 132 169 116 C161 106 158 92 151 84Z" fill="${color}"/><path d="M69 84 C58 76 50 82 51 101 C52 112 58 117 65 110 C70 104 72 94 76 88Z" fill="${INNER_EAR}" stroke="none" opacity=".55"/><path d="M171 84 C182 76 190 82 189 101 C188 112 182 117 175 110 C170 104 168 94 164 88Z" fill="${INNER_EAR}" stroke="none" opacity=".55"/></g>`;
  return `<g><path d="M74 72 C53 54 34 64 38 99 C41 123 56 134 72 114 C80 103 83 86 91 77Z" fill="${color}"/><path d="M166 72 C187 54 206 64 202 99 C199 123 184 134 168 114 C160 103 157 86 149 77Z" fill="${color}"/><path d="M66 78 C54 68 46 75 48 98 C49 111 56 118 64 109 C70 101 72 91 77 83Z" fill="${INNER_EAR}" stroke="none" opacity=".55"/><path d="M174 78 C186 68 194 75 192 98 C191 111 184 118 176 109 C170 101 168 91 163 83Z" fill="${INNER_EAR}" stroke="none" opacity=".55"/></g>`;
}

function face(stage,eyes){
  const baby=stage==='baby';
  const head=baby
    ? 'M71 103 C71 76 90 61 120 61 C150 61 169 76 169 103 C169 132 151 147 120 148 C89 147 71 132 71 103Z'
    : 'M68 96 C68 65 89 49 120 49 C151 49 172 65 172 96 C172 130 151 146 120 147 C89 146 68 130 68 96Z';
  const blaze=baby
    ? 'M108 69 C114 63 126 63 132 69 C136 79 132 91 132 101 C132 111 128 117 120 120 C112 117 108 111 108 101 C108 91 104 79 108 69Z'
    : 'M107 57 C113 50 127 50 133 57 C138 69 133 84 133 96 C133 108 129 115 120 119 C111 115 107 108 107 96 C107 84 102 69 107 57Z';
  const muzzleY=baby?124:121;
  const noseY=baby?118:115;
  const cheekY=baby?124:121;
  return `<path d="${head}" fill="var(--dog-color)"/><path d="${blaze}" fill="${CREAM}" stroke="none" opacity=".96"/><ellipse cx="120" cy="${muzzleY}" rx="${baby?31:33}" ry="${baby?23:24}" fill="${MUZZLE}" stroke="none" opacity=".97"/>${eyes}<g fill="#e69c9c" opacity=".48" stroke="none"><ellipse cx="82" cy="${cheekY}" rx="${baby?11:10}" ry="6"/><ellipse cx="158" cy="${cheekY}" rx="${baby?11:10}" ry="6"/></g><path d="M114 ${noseY} Q120 ${noseY-6} 126 ${noseY} Q120 ${noseY+7} 114 ${noseY}Z" fill="#5d4a43" stroke="none"/><path d="M120 ${noseY+6} V${noseY+11} M120 ${noseY+11} Q113 ${noseY+20} 106 ${noseY+13} M120 ${noseY+11} Q127 ${noseY+20} 134 ${noseY+13}" fill="none"/><path d="M113 ${noseY+17} Q120 ${noseY+27} 127 ${noseY+17} Q126 ${noseY+33} 120 ${noseY+35} Q114 ${noseY+33} 113 ${noseY+17}Z" fill="${TONGUE}" stroke="${OUTLINE}" stroke-width="3"/>`;
}

function body(color,stage){
  if(stage==='baby')return `<ellipse cx="120" cy="166" rx="45" ry="42" fill="${color}"/><ellipse cx="86" cy="184" rx="23" ry="18" fill="${color}"/><ellipse cx="154" cy="184" rx="23" ry="18" fill="${color}"/><ellipse cx="120" cy="170" rx="25" ry="29" fill="${CREAM}" stroke="none" opacity=".95"/><path d="M79 151 C79 170 83 193 96 198 C106 201 111 193 109 180 L107 155Z" fill="${color}"/><path d="M161 151 C161 170 157 193 144 198 C134 201 129 193 131 180 L133 155Z" fill="${color}"/><ellipse cx="98" cy="194" rx="14" ry="10" fill="${CREAM}"/><ellipse cx="142" cy="194" rx="14" ry="10" fill="${CREAM}"/><path d="M92 194 v5 M98 194 v6 M142 194 v6 M148 194 v5" fill="none" stroke-width="2.3"/>`;
  return `<ellipse cx="120" cy="164" rx="47" ry="48" fill="${color}"/><ellipse cx="83" cy="186" rx="24" ry="19" fill="${color}"/><ellipse cx="157" cy="186" rx="24" ry="19" fill="${color}"/><ellipse cx="120" cy="169" rx="27" ry="34" fill="${CREAM}" stroke="none" opacity=".95"/><path d="M77 145 C77 168 82 197 97 202 C108 205 113 196 111 180 L108 150Z" fill="${color}"/><path d="M163 145 C163 168 158 197 143 202 C132 205 127 196 129 180 L132 150Z" fill="${color}"/><ellipse cx="98" cy="198" rx="15" ry="10.5" fill="${CREAM}"/><ellipse cx="142" cy="198" rx="15" ry="10.5" fill="${CREAM}"/><path d="M91 198 v5 M98 198 v6 M142 198 v6 M149 198 v5" fill="none" stroke-width="2.3"/>`;
}

function dogMarkup(stage,color,eyes){
  const faceMarkup=face(stage,eyes).replaceAll('var(--dog-color)',color);
  return `<g data-dog-v1519="${stage}" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${tail(color,stage)}${ears(color,stage)}${body(color,stage)}${faceMarkup}</g>`;
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
