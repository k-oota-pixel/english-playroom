export function enemyAttackInterval(stage,mode='tower'){
  if(mode==='dungeon')return 20000;
  const floor=Math.max(1,Math.floor(Number(stage)||1));
  const base=9000;
  const minimum=3000;
  return Math.max(minimum,Math.round(base/(1+(floor-1)*.035)));
}

// Only visible, active frame time counts; a stalled/background tab cannot burst attacks.
export function createAttackClock(interval){
  let elapsed=0,last=null;
  return {
    reset(nextInterval=interval){interval=Math.max(1,nextInterval);elapsed=0;last=null;},
    tick(now,paused=false){
      if(paused){last=null;return {delta:0,attack:false,progress:elapsed/interval};}
      const delta=last===null?0:Math.min(250,Math.max(0,now-last));last=now;
      elapsed+=delta;
      const attack=elapsed>=interval;
      if(attack)elapsed-=interval;
      return {delta,attack,progress:elapsed/interval};
    }
  };
}
