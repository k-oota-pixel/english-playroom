// Shared read-only actor loader for standalone 3D experiments.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth} from './auth-session.js?v=2.4.37';
import {enableAppCheck} from './firebase-security.js?v=2.1.9';
import {renderPetSVG} from './pet-art.js?v=2.5.37';
export async function loadLabPet(T,pet,report=()=>{}){
 const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp({apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'});enableAppCheck(app);
 const auth=getAuth(app);await auth.authStateReady();const user=auth.currentUser;
 if(!user){report('デモぺっと｜本編でログインすると自分のぺっとが表示されます');return}
 const cached=window.EnglishPlayroomWallet;
 const data=cached?.uid===user.uid&&cached.data?cached.data:(await getDoc(doc(getFirestore(app),'users',user.uid,'apps','english-playroom'))).data();
 if(!data?.petHatched){report('孵化待ち｜デモぺっとで試遊できます');return}
 const stage=data.petAdult===false?'mystery':'baby';
 const raw=renderPetSVG(data.petAdult===false?null:data.petAppearance,data.petShop||{},stage,{background:false});
 const root=new DOMParser().parseFromString(raw,'image/svg+xml').documentElement;
 root.setAttribute('width','512');root.setAttribute('height','512');
 root.querySelectorAll('.pet-frame-motion,.pet-shadow').forEach(n=>n.remove());
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml;charset=utf-8'}));
 let image;try{image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url})}finally{URL.revokeObjectURL(url)}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,512,512);
 // Trim transparent margins so the feet sit near the ground, retaining the original proportions.
 const pixels=ctx.getImageData(0,0,512,512).data;let x0=512,y0=512,x1=0,y1=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>12){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 if(x1<=x0||y1<=y0)throw Error('empty pet image');
 const crop=document.createElement('canvas');crop.width=x1-x0+1;crop.height=y1-y0+1;crop.getContext('2d').drawImage(canvas,x0,y0,crop.width,crop.height,0,0,crop.width,crop.height);
 const texture=new T.CanvasTexture(crop);texture.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.center.set(.5,0);sprite.scale.set(.92*crop.width/crop.height,.92,1);sprite.position.y=.035;
 pet.clear();pet.add(sprite);
 report(String(data.petName||'ぺっと').slice(0,40)+'｜いつものぺっと');
}
