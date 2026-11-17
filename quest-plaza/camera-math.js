// Pure camera geometry shared by desktop and touch controls.
const finite=value=>Number.isFinite(value)?value:0;
const bound=(value,limit)=>Math.min(Math.max(finite(value),0),Math.max(0,finite(limit)));
export function clampCamera(left,top,viewWidth,viewHeight,worldWidth,worldHeight){
 return {
  left:bound(left,worldWidth-viewWidth),
  top:bound(top,worldHeight-viewHeight)
 };
}
export function centeredCamera(x,y,viewWidth,viewHeight,worldWidth,worldHeight){
 return clampCamera(x-viewWidth/2,y-viewHeight/2,viewWidth,viewHeight,worldWidth,worldHeight);
}
// Don't scroll inside the central 50% of the visible map. Once the pet enters
// the outer 25% band, move the camera just enough to keep it in that band.
export function followCamera(x,y,left,top,viewWidth,viewHeight,worldWidth,worldHeight,margin=.25){
 const m=Math.min(.45,Math.max(.1,finite(margin)));
 let nextLeft=left,nextTop=top;
 if(x<left+viewWidth*m)nextLeft=x-viewWidth*m;
 else if(x>left+viewWidth*(1-m))nextLeft=x-viewWidth*(1-m);
 if(y<top+viewHeight*m)nextTop=y-viewHeight*m;
 else if(y>top+viewHeight*(1-m))nextTop=y-viewHeight*(1-m);
 return clampCamera(nextLeft,nextTop,viewWidth,viewHeight,worldWidth,worldHeight);
}

// Estimate a fling's endpoint from the last touch movement (pixels/ms).
// Clamp both each projected axis and the final position to the map.
export function flingTarget(left,top,velocityX,velocityY,
 viewWidth,viewHeight,worldWidth,worldHeight,{duration=245,maxDistance=700,minSpeed=.38}={}){
 const speed=Math.hypot(finite(velocityX),finite(velocityY));
 if(speed<minSpeed)return clampCamera(left,top,viewWidth,viewHeight,worldWidth,worldHeight);
 const deltaX=Math.max(-maxDistance,Math.min(maxDistance,velocityX*duration));
 const deltaY=Math.max(-maxDistance,Math.min(maxDistance,velocityY*duration));
 return clampCamera(left+deltaX,top+deltaY,viewWidth,viewHeight,worldWidth,worldHeight);
}
