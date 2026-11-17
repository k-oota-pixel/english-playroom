import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,addQuestAchievements,questMilestoneCount} from '../monster-maze/model.js';
test('Quest tracks failed and cleared runs without losing counters',()=>{
 const p=normalizeProfile({});
 assert.equal(questMilestoneCount(p),0);
 addQuestAchievements(p,{grade:'4',cleared:false,turns:11,correct:11,defeats:3,chestsOpened:1,revivals:1});
 assert.equal(p.achievements.clears,0);
 assert.equal(p.achievements.perfectRuns,1);
 assert.equal(p.achievements.correctAnswers,11);
 addQuestAchievements(p,{grade:'4',cleared:true,turns:10,correct:8,defeats:2,allAlive:true});
 assert.equal(p.achievements.clearsByGrade['4'],1);
 assert.equal(p.achievements.allAliveClears,1);
 assert.deepEqual(normalizeProfile(p).achievements,p.achievements);
 assert.equal(questMilestoneCount(p),4);
});
test('Quest counts exactly fifteen permanent milestones across five grades',()=>{
 const p=normalizeProfile({});
 for(const grade of ['4','3','pre2','2','pre1'])addQuestAchievements(p,{
  grade,cleared:true,turns:20,correct:20,defeats:40,chestsOpened:4,revivals:grade==='4'?1:0,allAlive:true
 });
 assert.equal(p.achievements.clears,5);
 assert.equal(questMilestoneCount(p),13);
 for(let i=0;i<45;i++)addQuestAchievements(p,{grade:'4',cleared:true,turns:0,correct:0});
 assert.equal(questMilestoneCount(p),15);
});
test('Quest normalizes older profiles and invalid counters',()=>{
 const p=normalizeProfile({achievements:{defeats:-100,correctAnswers:NaN,clearsByGrade:{'2':2},perfectRuns:3}});
 assert.equal(p.achievements.defeats,0);
 assert.equal(p.achievements.correctAnswers,0);
 assert.equal(p.achievements.clears,2);
 assert.equal(p.achievements.perfectRuns,3);
});
