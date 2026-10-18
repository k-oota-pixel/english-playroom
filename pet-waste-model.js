// One calendar day per user-local date; UTC ordinals avoid daylight-saving drift.
export function wasteDay(now=new Date()){
 return Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
}
export function wasteState(data={},today=wasteDay()){
 const saved=data.petWaste;
 const valid=saved&&Number.isInteger(saved.day)&&saved.day>=0;
 const count=Number.isFinite(Number(saved?.count))?Math.min(4,Math.max(0,Math.floor(Number(saved.count)))):0;
 if(!valid)return {count:1,day:today};
 return {count:Math.min(4,count+Math.max(0,today-saved.day)),day:Math.max(today,saved.day)};
}
export function cleanWaste(data={},today=wasteDay()){
 return {...wasteState(data,today),count:0};
}
