function directEllipses(group){
  return [...group.children].filter(el=>el.tagName?.toLowerCase()==='ellipse');
}
function eyeGroup(svg){
  return [...svg.querySelectorAll('g[fill="#40564e"]')].find(group=>{
    if(group.hasAttribute('opacity'))return false;
    const ellipses=directEllipses(group);
    return ellipses.length>=2;
  })||null;
}
function emphasizeRound(group,eyes){
  const [left,right]=eyes;
  for(const eye of [left,right]){
    eye.setAttribute('rx','10.8');
    eye.setAttribute('ry','14.6');
    eye.removeAttribute('transform');
  }
  const highlights=group.querySelector(':scope > g[fill="white"]');
  if(highlights){
    const circles=[...highlights.querySelectorAll('circle')];
    circles.slice(0,2).forEach(c=>c.setAttribute('r','3.8'));
    circles.slice(2).forEach(c=>c.setAttribute('r','1.7'));
  }
}
function emphasizeGentle(group,eyes){
  const [left,right]=eyes;
  const leftCx=Number(left.getAttribute('cx'))||94;
  const rightCx=Number(right.getAttribute('cx'))||146;
  // Keep the original coordinates with the artwork, including cloned markup.
  for(const eye of [left,right]){
    if(!eye.hasAttribute('data-gentle-base-cy'))eye.setAttribute('data-gentle-base-cy',eye.getAttribute('cy')||'115');
  }
  const leftCy=Number(left.getAttribute('data-gentle-base-cy'))-1;
  const rightCy=Number(right.getAttribute('data-gentle-base-cy'))-1;

  // Droopy eyes are exactly the same large oval as round eyes.
  // Only the angle changes: each eye tilts downward toward the outside.
  left.setAttribute('rx','10.8');
  left.setAttribute('ry','14.6');
  left.setAttribute('cy',String(leftCy));
  left.setAttribute('transform',`rotate(14 ${leftCx} ${leftCy})`);

  right.setAttribute('rx','10.8');
  right.setAttribute('ry','14.6');
  right.setAttribute('cy',String(rightCy));
  right.setAttribute('transform',`rotate(-14 ${rightCx} ${rightCy})`);

  const highlights=group.querySelector(':scope > g[fill="white"]');
  if(highlights){
    const circles=[...highlights.querySelectorAll('circle')];
    if(circles[0]){circles[0].setAttribute('cx',String(leftCx-2.7));circles[0].setAttribute('cy',String(leftCy-4.5));circles[0].setAttribute('r','3.8');}
    if(circles[1]){circles[1].setAttribute('cx',String(rightCx-2.7));circles[1].setAttribute('cy',String(rightCy-4.5));circles[1].setAttribute('r','3.8');}
    if(circles[2]){circles[2].setAttribute('cx',String(leftCx+3.2));circles[2].setAttribute('cy',String(leftCy+4.5));circles[2].setAttribute('r','1.7');}
    if(circles[3]){circles[3].setAttribute('cx',String(rightCx+3.2));circles[3].setAttribute('cy',String(rightCy+4.5));circles[3].setAttribute('r','1.7');}
  }
}
function patchSvg(svg){
  // Care reactions move SVG groups. Only the SVG root owns the patch marker.
  if(!(svg instanceof SVGElement)||svg.tagName.toLowerCase()!=='svg'||svg.dataset.eyeEmphasisV146==='1')return;
  const group=eyeGroup(svg);if(!group)return;
  const eyes=directEllipses(group);if(eyes.length<2)return;
  const first=eyes[0],rx=Number(first.getAttribute('rx'))||0;
  const isGentle=eyes.slice(0,2).some(eye=>(eye.getAttribute('transform')||'').includes('rotate'));
  const isRound=!isGentle&&rx>0&&rx<=9.5;
  if(isGentle)emphasizeGentle(group,eyes);
  else if(isRound)emphasizeRound(group,eyes);
  else return;
  svg.dataset.eyeEmphasisV146='1';
}
function scan(root=document){
  if(root instanceof SVGElement)patchSvg(root);
  root.querySelectorAll?.('svg').forEach(patchSvg);
}
function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
