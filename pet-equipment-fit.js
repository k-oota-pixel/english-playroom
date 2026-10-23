// Shared by standard equipment and expansion items, including shop previews.
export function equipmentTransform(slot,species,itemId){
 const lower=new Set(['red-ribbon','blue-ribbon','wizard-hat','flower-crown','knit-hat','beret','baseball-cap','halo']);
 return slot==='head'?`translate(0 ${itemId==='beret'?9:itemId==='pirate-hat'?0:lower.has(itemId)?6:itemId==='top-hat'?-8:-3})`:slot==='face'?`translate(0 ${species==='cat'||species==='dog'?12.5:5})`:slot==='neck'&&(species==='cat'||species==='dog')?'translate(0 8)':'';
}
