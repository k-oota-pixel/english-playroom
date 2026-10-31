import {ageGrowthBonuses,normalizeBaseStats,allocationTotal} from './pet-strength-model.js?v=2.3.23';
export const ADMIN_STATS_ADJUSTMENT='2026-11-01-hp100-atk30-def30-mp100';
export function adminStatsAdjustment(data={},verifiedAdmin=false){
 if(!verifiedAdmin||data.petAdminStatsAdjustment===ADMIN_STATS_ADJUSTMENT)return null;
 const petBaseStats=normalizeBaseStats(data.petBaseStats),bonus=ageGrowthBonuses(data.petLifeDays,data.petHatched===true&&data.petAdult!==false);
 // HP grows in steps of two. Preserve the individual base except for parity.
 if((100-petBaseStats.hp-bonus.hp)%2!==0)petBaseStats.hp+=petBaseStats.hp<15?1:-1;
 const petStrength={hp:(100-petBaseStats.hp-bonus.hp)/2,attack:30-petBaseStats.attack-bonus.attack,defense:30-petBaseStats.defense-bonus.defense,mp:100-petBaseStats.mp-bonus.mp};
 const points=allocationTotal(petStrength),generation=Math.max(1,Number(data.petGeneration)||1);
 return {petBaseStats,petStrength,petStrengthLevelPoints:Math.max(Number(data.petStrengthLevelPoints)||0,points),petAdminGrantedPoints:Math.max(points,Number(data.petAdminGrantedPoints)||0),petAdminGrantedGeneration:generation,petAdminStatsAdjustment:ADMIN_STATS_ADJUSTMENT};
}

