function installSleepEyeFix(){
  const visual=document.getElementById('petVisual');
  if(!visual){setTimeout(installSleepEyeFix,100);return;}
  if(visual.dataset.sleepEyeFix1426==='1')return;
  visual.dataset.sleepEyeFix1426='1';

  function sync(){
    const hide=visual.dataset.petSleeping==='1'||visual.dataset.petGrumpy==='1';
    visual.querySelectorAll('[data-shared-legacy-eyes]').forEach(group=>{
      group.style.opacity=hide?'0':'';
      group.style.pointerEvents=hide?'none':'';
    });
  }

  const observer=new MutationObserver(records=>{
    let needsSync=false;
    for(const record of records){
      if(record.type==='attributes'){
        if(record.attributeName==='data-pet-sleeping'||record.attributeName==='data-pet-grumpy')needsSync=true;
      }else if(record.type==='childList'&&record.addedNodes.length){
        needsSync=true;
      }
    }
    if(needsSync)sync();
  });

  observer.observe(visual,{attributes:true,attributeFilter:['data-pet-sleeping','data-pet-grumpy'],childList:true,subtree:true});
  sync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSleepEyeFix,{once:true});
else installSleepEyeFix();
