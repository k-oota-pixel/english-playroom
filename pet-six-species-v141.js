import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.2";
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const LEGACY_MAP=Object.freeze({rabbit:'hamster',fox:'dog',dragon:'bird',mystery:'cat'});

function start(){
  if(!getApps().length)return;
  const app=getApp(),auth=getAuth(app),db=getFirestore(app);
  let unsubscribe=null,migrating=false;
  onAuthStateChanged(auth,user=>{
    if(unsubscribe){unsubscribe();unsubscribe=null;}
    if(!user)return;
    const ref=doc(db,'users',user.uid,'apps','english-playroom');
    unsubscribe=onSnapshot(ref,snap=>{
      if(migrating||!snap.exists()||auth.currentUser?.uid!==user.uid)return;
      const data=snap.data()||{},appearance=data.petAppearance;
      const mapped=appearance&&LEGACY_MAP[appearance.species];
      if(!mapped)return;
      migrating=true;
      runTransaction(db,async tx=>{
        const freshSnap=await tx.get(ref);if(!freshSnap.exists())return;
        const fresh=freshSnap.data()||{},current=fresh.petAppearance||{},nextSpecies=LEGACY_MAP[current.species];
        if(!nextSpecies)return;
        tx.set(ref,{petAppearance:{...current,species:nextSpecies},petUpdatedAt:serverTimestamp()},{merge:true});
      }).catch(error=>console.error('Six-species migration failed',error)).finally(()=>{migrating=false;});
    },error=>console.error('Six-species migration snapshot failed',error));
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
