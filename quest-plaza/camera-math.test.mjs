import test from 'node:test';
import assert from 'node:assert/strict';
import {clampCamera,centeredCamera,followCamera,flingTarget} from './camera-math.js';
const dimensions=[480,320,1728,1152];
test('camera centers only once and clamps at map edges',()=>{
 assert.deepEqual(centeredCamera(864,576,...dimensions),{left:624,top:416});
 assert.deepEqual(centeredCamera(0,0,...dimensions),{left:0,top:0});
 assert.deepEqual(centeredCamera(1728,1152,...dimensions),{left:1248,top:832});
});
test('moving inside safe zone leaves viewport fixed',()=>{
 const fixed={left:400,top:300};
 assert.deepEqual(followCamera(640,460,fixed.left,fixed.top,...dimensions),fixed);
 assert.deepEqual(followCamera(740,510,fixed.left,fixed.top,...dimensions),fixed);
});
test('pet near right and bottom edges shifts camera just enough',()=>{
 assert.deepEqual(followCamera(790,570,400,300,...dimensions),{left:430,top:330});
});
test('manual pan clamps when dragging outside edges',()=>{
 assert.deepEqual(clampCamera(-900,5000,...dimensions),{left:0,top:832});
 assert.deepEqual(clampCamera(0,0,2000,1400,1728,1152),{left:0,top:0});
});

test('a quick touch flick carries the map past the finger travel',()=>{
 const result=flingTarget(200,200,1.8,1.2,...dimensions);
 assert.deepEqual(result,{left:641,top:494});
});
test('slow touch drags stop precisely without unwanted inertia',()=>{
 assert.deepEqual(flingTarget(200,220,.1,.1,...dimensions),{left:200,top:220});
});
test('a powerful flick is bounded and never scrolls beyond the map',()=>{
 assert.deepEqual(flingTarget(1100,800,20,30,...dimensions),{left:1248,top:832});
 assert.deepEqual(flingTarget(100,100,-20,-30,...dimensions),{left:0,top:0});
});
