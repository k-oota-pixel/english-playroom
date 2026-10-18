const DOG_ART_URL='./assets/dog-pet-cutout.webp?v=1.5.21';

function dogDesign(svg){
  return [...svg.querySelectorAll('g[data-pet-redesign]')].find(group=>(group.getAttribute('data-pet-redesign')||'').startsWith('dog-'))||null;
}

function redraw(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.dogV1521==='1')return;
  const design=dogDesign(svg);if(!design)return;
  const stage=(design.getAttribute('data-pet-redesign')||'').endsWith('-adult')?'adult':'baby';
  design.innerHTML=`<g data-dog-image-v1521="${stage}"><image href="${DOG_ART_URL}" x="17" y="15" width="206" height="206" preserveAspectRatio="xMidYMid meet" pointer-events="none"/></g>`;
  design.setAttribute('data-pet-redesign',`dog-${stage}`);
  svg.dataset.dogV1521='1';
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
