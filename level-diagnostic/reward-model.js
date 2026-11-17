// Isolated reward arithmetic; no Firestore reads are needed for testing.
export const DIAGNOSTIC_REWARD_COINS=3;
const japanDateFormatter=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
});
export function japanTodayKey(date=new Date()){
  const parts=japanDateFormatter.formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function diagnosticCoinFields(data={},today=japanTodayKey()){
  const balance=Math.max(0,Math.floor(Number(data.coins)||0));
  const earned=data.coinEarnedDate===today?Math.max(0,Math.floor(Number(data.coinsEarnedToday)||0)):0;
  return {coins:balance+DIAGNOSTIC_REWARD_COINS,
    coinEarnedDate:today,coinsEarnedToday:earned+DIAGNOSTIC_REWARD_COINS,coinSchemaVersion:1};
}
