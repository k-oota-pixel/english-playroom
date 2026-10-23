export function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function deal(count){if(!Number.isInteger(count)||count<2||count>12)throw new RangeError('人数は2〜12人');return shuffle(Array.from({length:100},(_,i)=>i+1)).slice(0,count);}
export function isCorrect(order,numbers){return order.length===numbers.length&&new Set(order).size===numbers.length&&order.every((id,i)=>Number.isInteger(id)&&id>=0&&id<numbers.length&&(i===0||numbers[order[i-1]]<numbers[id]));}
export function swap(order,a,b){const result=[...order];const x=result.indexOf(a),y=result.indexOf(b);if(x<0||y<0)throw new RangeError('不明なプレイヤー');[result[x],result[y]]=[result[y],result[x]];return result;}
