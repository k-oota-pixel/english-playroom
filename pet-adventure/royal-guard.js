export const ROYAL_GUARD_FLOOR=90;
export function royalGuardForStage(stage,mode,phase=1){
 if(Number(stage)!==90||!['tower','dungeon'].includes(mode))return null;
 const form=phase===2?2:1;
 return {id:`royal-guard-${form}`,name:'魔王親衛隊',element:form===2?'fire':'leaf',level:90,maxMp:50,royal:true,phase:form,image:`royal-guard-${form}.svg`};
}
export function royalGuardHp(base,phase){return Math.round(base*(phase===2?1.2:1));}
export function adminAdventureBest(saved,isAdmin){return Math.max(1,Number(saved)||1,isAdmin?90:1);}

