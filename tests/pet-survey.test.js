import test from 'node:test';import assert from 'node:assert/strict';
import {QUESTIONS,appearanceFromAnswers} from '../pet-maker.js';
import {validAppearance} from '../pet-model.js';
const expected={bright:{sparkle:3,round:2},gentle:{gentle:3,watery:2},happy:{smile:3,mugyu:2},drowsy:{sleepy:3,oyoyo:2},spirited:{kiri:3,punsuka:2}};
test('five survey moods reach all ten eyes with 60/40 weights and no direct eye choices',()=>{
 assert.equal(QUESTIONS.length,3);assert.deepEqual(QUESTIONS[2].answers.map(x=>x[0]),Object.keys(expected));const reached=new Set();
 for(const [eyeMood,counts] of Object.entries(expected)){const actual={};for(let i=0;i<5;i++){const a=appearanceFromAnswers({personality:'calm',bodyColor:'mint',eyeMood},()=> (i+.5)/5);assert.ok(validAppearance(a));assert.equal(a.bodyColor,'mint');actual[a.eyeStyle]=(actual[a.eyeStyle]||0)+1;reached.add(a.eyeStyle);}assert.deepEqual(actual,counts);}assert.equal(reached.size,10);
});
test('every mood and color can reach all seven animals; personality retains threefold weights',()=>{
 const favorites={calm:['cat','panda'],playful:['dog','hamster'],curious:['bird','penguin','dragon']};
 for(const [personality,favs] of Object.entries(favorites)){const total=7+2*favs.length;for(const [bodyColor] of QUESTIONS[1].answers)for(const [eyeMood] of QUESTIONS[2].answers){const counts={};for(let i=0;i<total;i++){let call=0;const a=appearanceFromAnswers({personality,bodyColor,eyeMood},()=>call++===0?.1:(i+.5)/total);assert.equal(a.bodyColor,bodyColor);counts[a.species]=(counts[a.species]||0)+1;assert.ok(validAppearance(a));}assert.equal(Object.keys(counts).length,7);for(const [species,n] of Object.entries(counts))assert.equal(n,favs.includes(species)?3:1);}}
});
