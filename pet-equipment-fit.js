// Shared by standard equipment and expansion items, including shop previews.
export function equipmentTransform(slot,species){
 return slot==='head'?'translate(0 -3)':slot==='face'?`translate(0 ${species==='cat'||species==='dog'?12.5:5})`:slot==='neck'&&(species==='cat'||species==='dog')?'translate(0 8)':'';
}
