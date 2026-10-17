const SVG_NS='http://www.w3.org/2000/svg';

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
function droopyPath(d){
  const path=document.createElementNS(SVG_NS,'path');
  path.setAttribute('d',d);
  return path;
}
function emphasizeGentle(group,eyes){
  const [left,right]=eyes;
  const leftCy=Number(left.getAttribute('cy'))||115;
  const rightCy=Number(right.getAttribute('cy'))||115;
  left.remove();right.remove();

  const leftPath=droopyPath(`M82 ${leftCy-1} Q93 ${leftCy-14} 107 ${leftCy-7} Q103 ${leftCy+8} 93 ${leftCy+10} Q84 ${leftCy+9} 82 ${leftCy-1} Z`);
  const rightPath=droopyPath(`M133 ${rightCy-7} Q147 ${rightCy-14} 158 ${rightCy-1} Q156 ${rightCy+9} 147 ${rightCy+10} Q137 ${rightCy+8} 133 ${rightCy-7} Z`);
  const first=group.firstChild;
  group.insertBefore(rightPath,first);
  group.insertBefore(leftPath,rightPath);

  const highlights=group.querySelector(':scope > g[fill="white"]');
  if(highlights){
    const circles=[...highlights.querySelectorAll('circle')];
    if(circles[0]){circles[0].setAttribute('cx','92');circles[0].setAttribute('cy',String(leftCy-5));circles[0].setAttribute('r','2.7');}
    if(circles[1]){circles[1].setAttribute('cx','144');circles[1].setAttribute('cy',String(rightCy-5));circles[1].setAttribute('r','2.7');}
    if(circles[2]){circles[2].setAttribute('cx','98');circles[2].setAttribute('cy',String(leftCy+4));circles[2].setAttribute('r','1.2');}
    if(circles[3]){circles[3].setAttribute('cx','150');circles[3].setAttribute('cy',String(rightCy+4));circles[3].setAttribute('r','1.2');}
  }
}
function patchSvg(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.eyeEmphasisV144==='1')return;
  const group=eyeGroup(svg);if(!group)return;
  const eyes=directEllipses(group);if(eyes.length<2)return;
  const first=eyes[0],rx=Number(first.getAttribute('rx'))||0;
  const isGentle=eyes.slice(0,2).some(eye=>(eye.getAttribute('transform')||'').includes('rotate'));
  const isRound=!isGentle&&rx>0&&rx<=9.5;
  if(isGentle)emphasizeGentle(group,eyes);
  else if(isRound)emphasizeRound(group,eyes);
  else return;
  svg.dataset.eyeEmphasisV144='1';
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
