// Shared by standard equipment and expansion items, including shop previews.
export function equipmentTransform(slot,species,itemId){
 const headDrop=3; // Slightly lower every head item in previews and equipped views.
 const lower=new Set(['red-ribbon','blue-ribbon','wizard-hat','flower-crown','knit-hat','beret','baseball-cap','halo']);
 const neckLift=['green-scarf','striped-bowtie','flower-necklace'].includes(itemId)?24:['gold-medal','star-pendant'].includes(itemId)?8:0;
 if(slot==='neck')return `translate(0 ${(species==='cat'||species==='dog'?8:0)-neckLift})`;
 return slot==='head'?`translate(0 ${headDrop+(itemId==='bandana'?0:itemId==='beret'?9:itemId==='pirate-hat'?0:lower.has(itemId)?6:itemId==='top-hat'?-8:-3)})`:slot==='face'?`translate(0 ${species==='cat'||species==='dog'?12.5:5})`:slot==='neck'&&(species==='cat'||species==='dog')?'translate(0 8)':'';
}

export function normalizeEquipmentSlots(equipped={}){
 const result={...equipped};
 if(result.neck==='bandana'){if(!result.head)result.head='bandana';delete result.neck;}
 return result;
}
