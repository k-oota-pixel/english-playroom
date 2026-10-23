// Shared by standard equipment and expansion items, including shop previews.
export function equipmentTransform(slot,species){
 return slot==='head'?'translate(0 -3)':slot==='face'?`translate(0 ${species==='cat'||species==='dog'?17:5})`:'';
}
