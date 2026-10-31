import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const full=fs.readFileSync(new URL('../auth-session.js',import.meta.url),'utf8');
const source=full.slice(full.indexOf("const API="),full.indexOf('export function onAuthStateChanged')).replace('export async function','async function');
function setup(fetch){const context=vm.createContext({fetch,AbortSignal,Date});vm.runInContext(source,context);return context.accountSession;}
test('twenty simultaneous observers share one admission request',async()=>{let calls=0,release;const pending=new Promise(resolve=>release=resolve),check=setup(async()=>{calls++;await pending;return {ok:true,json:async()=>({registered:false,resetRequired:false})};}),user={getIdToken:async()=> 'token'};const promises=Array.from({length:20},()=>check(user));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);release();const values=await Promise.all(promises);assert.equal(values.length,20);assert.equal(values.every(x=>x.registered===false),true);await check(user);assert.equal(calls,1);});
test('a rejected admission never becomes a successful cached login and can be retried',async()=>{let calls=0;const check=setup(async()=>{calls++;return {ok:false,status:403,json:async()=>({error:'code required'})};}),user={getIdToken:async()=> 'token'};await assert.rejects(check(user),{status:403});await assert.rejects(check(user),{status:403});assert.equal(calls,2);});
test('changed credentials and different users must be checked separately',async()=>{let calls=0,token='old';const check=setup(async()=>{calls++;return {ok:true,json:async()=>({registered:false})};}),user={getIdToken:async()=>token};await check(user);token='new';await check(user);await check({getIdToken:async()=>token});assert.equal(calls,3);});
