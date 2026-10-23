// Shared by standard equipment and expansion items, including shop previews.
export function equipmentTransform(slot){
 return slot==='head'?'translate(0 -3)':slot==='face'?'translate(0 5)':'';
}
