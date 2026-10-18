// One shared sparkle-eye design for every selectable species.
// Keep the pupils as direct ellipses so legacy cat/lion redraws preserve this group.
export function renderSparkleEyes(left,right,y){
 return [left,right].map(x=>`<ellipse data-sparkle-eye="soft-star" cx="${x}" cy="${y}" rx="10.7" ry="14.5" fill="#513b36" stroke="none"/><g stroke="none"><path d="M${x-7.8} ${y+6} Q${x} ${y+11} ${x+7.8} ${y+6} Q${x+5.8} ${y+13} ${x} ${y+13} Q${x-5.8} ${y+13} ${x-7.8} ${y+6}Z" fill="#c3a4cc" opacity=".75"/><path d="M${x-2.8} ${y-10} Q${x-1.7} ${y-5.6} ${x+2.7} ${y-4.5} Q${x-1.7} ${y-3.4} ${x-2.8} ${y+1} Q${x-3.9} ${y-3.4} ${x-8.3} ${y-4.5} Q${x-3.9} ${y-5.6} ${x-2.8} ${y-10}Z" fill="#fffdf5"/><circle cx="${x+4}" cy="${y+3.2}" r="2.5" fill="white"/><circle cx="${x+5.7}" cy="${y-6}" r="1.15" fill="#fff7ce"/></g>`).join('');
}
