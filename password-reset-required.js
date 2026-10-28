import {getAuth,onAuthStateChanged} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.2.1';

const auth=getAuth();
onAuthStateChanged(auth,user=>{
  const destination=user?'./':'./login.html?return='+encodeURIComponent(new URL('./',location.href).href);
  location.replace(destination);
});
