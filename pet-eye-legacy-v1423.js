const OUTLINE='#40564e';

const EYE_POS={
  'cat-baby':[96,144,103,1],
  'cat-adult':[95,145,91,1.04],
  'dog-baby':[95,145,104,1],
  'dog-adult':[95,145,88,1.05],
  'bird-baby':[99,141,111,.86],
  'bird-adult':[99,141,102,.9],
  'hamster-baby':[96,144,116,.92],
  'hamster-adult':[96,144,108,.96],
  'penguin-baby':[98,142,101,.82],
  'penguin-adult':[98,142,92,.86]
};

function directChildren(el,tag){
  return [...el.children].filter(child=>child.tagName?.toLowerCase()===tag);
}

function parseCurve(path){
  const d=path?.getAttribute('d')||'';
  const nums=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
  return nums.length>=6?nums:null;
}

function detectAndRemoveEyes(root){
  const curveGroups=[...root.querySelectorAll('g[fill="none"][stroke="#40564e"]')];
  for(const group of curveGroups){
    const paths=directChildren(group,'path');
    if(paths.length!==2)continue;
    const nums=parseCurve(paths[0]);
    if(!nums)continue;
    const startY=nums[1],controlY=nums[3],endY=nums[5];
    const style=controlY<Math.min(startY,endY)?'smile':'sleepy';
    group.remove();
    return style;
  }

  const sparkle=[...root.querySelectorAll('g[fill="#40564e"]')].find(group=>{
    return directChildren(group,'path').length>=2&&!!group.querySelector(':scope > g[fill="#fff"]');
  });
  if(sparkle){sparkle.remove();return 'sparkle';}

  const eyeGroups=[...root.querySelectorAll('g')].filter(group=>{
    const ellipses=directChildren(group,'ellipse');
    if(ellipses.length!==1)return false;
    const cx=Number(ellipses[0].getAttribute('cx'));
    return Number.isFinite(cx)&&cx>=80&&cx<=160;
  });
  if(eyeGroups.length>=2){
    const pair=eyeGroups.slice(0,2);
    const watery=pair.some(group=>directChildren(group,'circle').length>=2);
    const gentle=pair.some(group=>(group.getAttribute('transform')||'').includes('rotate'));
    pair.forEach(group=>group.remove());
    return watery?'watery':gentle?'gentle':'round';
  }

  return 'round';
}

function star(cx,cy,r){
  const inner=r*.43;let d='';
  for(let i=0;i<8;i++){
    const rr=i%2===0?r:inner,angle=-Math.PI/2+i*Math.PI/4;
    d+=(i?'L':'M')+(cx+Math.cos(angle)*rr).toFixed(1)+' '+(cy+Math.sin(angle)*rr).toFixed(1)+' ';
  }
  return d+'Z';
}

function oldEyes(style,lx,rx,y,s){
  const hi=(cx)=>`<circle cx="${cx-2.7*s}" cy="${y-4.5*s}" r="${3*s}" fill="#fff"/><circle cx="${cx+3.2*s}" cy="${y+4.5*s}" r="${1.4*s}" fill="#fff" opacity=".55"/>`;
  if(style==='gentle')return `<ellipse cx="${lx}" cy="${y+s}" rx="${9*s}" ry="${11.5*s}" transform="rotate(8 ${lx} ${y+s})" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y+s}" rx="${9*s}" ry="${11.5*s}" transform="rotate(-8 ${rx} ${y+s})" fill="${OUTLINE}"/>${hi(lx)}${hi(rx)}`;
  if(style==='watery')return `<ellipse cx="${lx}" cy="${y}" rx="${10.5*s}" ry="${14*s}" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y}" rx="${10.5*s}" ry="${14*s}" fill="${OUTLINE}"/><circle cx="${lx-2.7*s}" cy="${y-4.5*s}" r="${3.8*s}" fill="#fff"/><circle cx="${rx-2.7*s}" cy="${y-4.5*s}" r="${3.8*s}" fill="#fff"/><circle cx="${lx+3.2*s}" cy="${y+4.5*s}" r="${1.9*s}" fill="#fff" opacity=".55"/><circle cx="${rx+3.2*s}" cy="${y+4.5*s}" r="${1.9*s}" fill="#fff" opacity=".55"/><circle cx="${lx-4*s}" cy="${y+5*s}" r="${2.2*s}" fill="#fff" opacity=".82"/><circle cx="${rx-4*s}" cy="${y+5*s}" r="${2.2*s}" fill="#fff" opacity=".82"/>`;
  if(style==='smile')return `<path d="M${lx-11*s} ${y+s} Q${lx} ${y-10*s} ${lx+11*s} ${y+s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/><path d="M${rx-11*s} ${y+s} Q${rx} ${y-10*s} ${rx+11*s} ${y+s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/>`;
  if(style==='sleepy')return `<path d="M${lx-11*s} ${y-s} Q${lx} ${y+5*s} ${lx+11*s} ${y-s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/><path d="M${rx-11*s} ${y-s} Q${rx} ${y+5*s} ${rx+11*s} ${y-s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/>`;
  if(style==='sparkle')return `<path d="${star(lx,y,12*s)}" fill="${OUTLINE}"/><path d="${star(rx,y,12*s)}" fill="${OUTLINE}"/><circle cx="${lx}" cy="${y-2*s}" r="${2*s}" fill="#fff"/><circle cx="${rx}" cy="${y-2*s}" r="${2*s}" fill="#fff"/>`;
  return `<ellipse cx="${lx}" cy="${y}" rx="${8.5*s}" ry="${11.5*s}" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y}" rx="${8.5*s}" ry="${11.5*s}" fill="${OUTLINE}"/>${hi(lx)}${hi(rx)}`;
}

function patch(root){
  if(!(root instanceof Element))return;
  const groups=[];
  if(root.matches?.('g[data-pet-redesign]'))groups.push(root);
  root.querySelectorAll?.('g[data-pet-redesign]').forEach(group=>groups.push(group));
  for(const group of groups){
    if(group.dataset.legacyEyes1423==='1')continue;
    const key=group.getAttribute('data-pet-redesign');
    const pos=EYE_POS[key];
    if(!pos)continue;
    const style=detectAndRemoveEyes(group);
    const holder=document.createElementNS('http://www.w3.org/2000/svg','g');
    holder.setAttribute('data-legacy-eye-style',style);
    holder.innerHTML=oldEyes(style,...pos);
    group.appendChild(holder);
    group.dataset.legacyEyes1423='1';
  }
}

function start(){
  patch(document.documentElement);
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)patch(node);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
