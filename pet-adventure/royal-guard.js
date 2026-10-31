export const ROYAL_GUARD_FLOOR=90;
export function royalGuardForStage(stage,mode,phase=1){
 if(Number(stage)!==90||!['tower','dungeon'].includes(mode))return null;
 const form=phase===2?2:1;
 return {id:`royal-guard-${form}`,name:'魔王親衛隊',element:form===2?'fire':'leaf',level:90,maxMp:50,royal:true,phase:form,image:`royal-guard-lion-${form}.svg`};
}
export function royalGuardHp(base,phase){return Math.round(base*(phase===2?1.2:1));}
export function majorBossForStage(stage,mode,phase=1){
 if(Number(stage)===50&&['tower','dungeon'].includes(mode)){
  const form=phase===2?2:1;
  return {id:`dark-mage-${form}`,name:'闇の魔術師',element:form===2?'fire':'water',level:50,maxMp:form===2?1000:500,royal:true,mage:true,phase:form,image:`dark-mage-${form}.svg`,attackInterval:form===2?1500:2000};
 }
 return royalGuardForStage(stage,mode,phase);
}
export function adminAdventureBest(saved,isAdmin){return Math.max(1,Number(saved)||1,isAdmin?90:1);}


