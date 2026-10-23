export const pairs = [
  ['dog','犬','cat','猫'],['apple','りんご','orange','オレンジ'],['summer','夏','winter','冬'],['bus','バス','train','電車'],['soccer','サッカー','basketball','バスケットボール'],['tea','お茶','coffee','コーヒー'],['sea','海','pool','プール'],['rice','ご飯','bread','パン'],['piano','ピアノ','guitar','ギター'],['library','図書館','bookstore','本屋'],['mountain','山','river','川'],['cake','ケーキ','ice cream','アイスクリーム'],['bicycle','自転車','car','車'],['morning','朝','night','夜'],['rain','雨','snow','雪'],['zoo','動物園','aquarium','水族館'],['tennis','テニス','table tennis','卓球'],['shoes','靴','socks','靴下'],['strawberry','いちご','grape','ぶどう'],['pencil','鉛筆','pen','ペン'],['curry','カレー','stew','シチュー'],['lion','ライオン','tiger','トラ'],['doctor','医師','nurse','看護師'],['park','公園','school','学校'],['singing','歌うこと','dancing','踊ること'],['pizza','ピザ','hamburger','ハンバーガー'],['moon','月','sun','太陽'],['baseball','野球','softball','ソフトボール'],['shirt','シャツ','jacket','ジャケット'],['watermelon','すいか','melon','メロン']
];
export function createRound(count, random = Math.random) {
  if (!Number.isInteger(count) || count < 3 || count > 12) throw new RangeError('人数は3〜12人です');
  const pair = pairs[Math.floor(random()*pairs.length)];
  const reverse = random() < .5;
  const majority = pair.slice(reverse ? 2 : 0, reverse ? 4 : 2);
  const minority = pair.slice(reverse ? 0 : 2, reverse ? 2 : 4);
  const wolf = Math.floor(random()*count);
  return {count, majority, minority, wolf, words:Array.from({length:count},(_,i)=>i===wolf?minority:majority)};
}
