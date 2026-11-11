import {ensureTowerSeasonReset,installTowerSeasonAnnouncement} from './tower-season.js?v=2.3.26-hq2';

const mode=new URLSearchParams(location.search).get('mode');
if(mode==='tower'||mode==='dungeon'){
 document.body.classList.add('battle-mode');document.getElementById('adventureSelect').hidden=true;document.getElementById('battleView').hidden=false;
 const actionStyles=document.createElement('link');actionStyles.rel='stylesheet';actionStyles.href='./dungeons-actions.css?v=1.10.23';document.head.append(actionStyles);
 if(mode==='tower'){
  try{await ensureTowerSeasonReset();}catch(error){console.warn('Tower season reset deferred',error);}
 }
 // Register ranking listeners before game initialization can emit its ready event.
 await import('./ranking-publisher.js?v=2.3.43');
 await import('./game.js?v=2.4.38');
}
else{
 await Promise.all([installTowerSeasonAnnouncement(),import('./rankings.js?v=2.4.71')]);
}







