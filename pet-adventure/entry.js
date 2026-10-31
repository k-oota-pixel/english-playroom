import {ensureTowerSeasonReset,installTowerSeasonAnnouncement} from './tower-season.js?v=2.3.25';

const mode=new URLSearchParams(location.search).get('mode');
if(mode==='tower'||mode==='dungeon'){
 document.body.classList.add('battle-mode');document.getElementById('adventureSelect').hidden=true;document.getElementById('battleView').hidden=false;
 const actionStyles=document.createElement('link');actionStyles.rel='stylesheet';actionStyles.href='./dungeons-actions.css?v=1.10.23';document.head.append(actionStyles);
 if(mode==='tower'){
  try{await ensureTowerSeasonReset();}catch(error){console.warn('Tower season reset deferred',error);}
 }
 await import('./game.js?v=2.3.25');
 await import('./ranking-publisher.js?v=2.3.14');
}
else{
 await Promise.all([installTowerSeasonAnnouncement(),import('./rankings.js?v=2.3.6')]);
}







