import {getAuth} from './auth-session.js?v=2.3.1';
const panel=document.createElement('section');panel.style.cssText='padding:20px;border:1px solid #dce5da;border-radius:16px;margin:20px 0;background:white';
panel.innerHTML='<h2>登録コード・アカウント管理</h2><p>生徒名との対応表は学校で認められた保管先で管理してください。ここには生徒名を入力しないでください。</p><label>発行件数（1〜200） <input id="codeCount" type="number" min="1" max="200" value="30"></label> <button id="issueCodes">発行してCSVを保存</button><p><label>追加コード一覧の取り込み <input id="importCodes" type="file" accept=".csv,.txt"></label><small>今回お渡しする10,000件は登録済みです。追加の一覧を取り込む場合に使います。</small></p><hr><label>生徒の登録コード <input id="lookupCode" autocomplete="off" placeholder="AB3D7K"></label> <button id="lookupAccount">IDを確認</button> <button id="resetCodePassword">仮パスワードを発行</button><p id="codeAdminStatus" role="status" style="white-space:pre-wrap"></p>';
(document.querySelector('main')||document.body).append(panel);
const $=id=>panel.querySelector('#'+id),message=text=>$('codeAdminStatus').textContent=text;
async function call(action,body){
 const user=getAuth().currentUser;if(!user)throw Error('管理者としてログインしてください。');
 const r=await fetch('https://task-quest.onrender.com/api/admin/code-'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'処理に失敗しました。');return data;
}
function download(codes){
 const csv='\uFEFF番号,登録コード,生徒名（公務用PCでのみ記入）\r\n'+codes.map((code,i)=>(i+1)+','+code+',').join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='登録コード-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function operation(button,fn){button.disabled=true;try{await fn();}catch(error){message(error.message);}finally{button.disabled=false;}}
$('issueCodes').onclick=()=>operation($('issueCodes'),async()=>{const data=await call('issue',{count:Number($('codeCount').value)});download(data.codes);message(data.codes.length+'件を発行しました。ファイルを安全に保管してください。');});
$('lookupAccount').onclick=()=>operation($('lookupAccount'),async()=>{const data=await call('lookup',{code:$('lookupCode').value});message('ログインID：'+data.loginId);});
$('resetCodePassword').onclick=()=>operation($('resetCodePassword'),async()=>{
 if(!confirm('このコードに紐づいた利用者のパスワードを再設定しますか？現在のパスワードは使えなくなり、本人による変更まで教材の利用が制限されます。'))return;
 const data=await call('reset',{code:$('lookupCode').value});message('ログインID：'+data.loginId+'\n仮パスワード：'+data.temporaryPassword+'\n有効期限：発行から24時間\n本人へ個別に伝えてください。ログイン後に変更が必要です。');
});
$('importCodes').onchange=async()=>{
 const input=$('importCodes'),file=input.files[0];if(!file)return;input.disabled=true;
 try{
 const text=await file.text(),codes=text.split(/\r?\n/).flatMap(line=>line.split(',')).filter(value=>/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(value.trim())).map(value=>value.trim());
 if(!codes.length||codes.length>10000||new Set(codes).size!==codes.length)throw Error('コードが見つからないか、重複があります。');
 const hashes=await Promise.all(codes.map(async code=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code.replaceAll('-',''))))).map(byte=>byte.toString(16).padStart(2,'0')).join('')));
 let imported=0;for(let i=0;i<hashes.length;i+=200){message('取り込み中：'+i+' / '+hashes.length);const data=await call('import',{hashes:hashes.slice(i,i+200)});imported+=data.imported;}
 message('取り込み完了：新規 '+imported+'件（既存コードは上書きしません）。');
 }catch(error){message(error.message+' 再度同じファイルを取り込んでも使用済み状態は維持されます。');}finally{input.disabled=false;}
};
