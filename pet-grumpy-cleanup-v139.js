function removeLegacyGrumpyBubble(){
  if(!document.getElementById('petGrumpyCleanupStyle')){
    const style=document.createElement('style');
    style.id='petGrumpyCleanupStyle';
    style.textContent='.pet-grumpy-bubble{display:none!important}';
    document.head.appendChild(style);
  }
  for(const el of document.querySelectorAll('.pet-grumpy-bubble'))el.remove();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacyGrumpyBubble,{once:true});
else removeLegacyGrumpyBubble();

// Keep old cached sleep modules from re-adding the legacy text bubble.
const root=document.getElementById('petVisual')?.closest('.pet-visual-wrap')||document.body;
const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
    for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.matches?.('.pet-grumpy-bubble'))node.remove();
      for(const el of node.querySelectorAll?.('.pet-grumpy-bubble')||[])el.remove();
    }
  }
});
observer.observe(root,{childList:true,subtree:true});
