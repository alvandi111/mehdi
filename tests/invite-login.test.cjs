const fs=require('fs'),assert=require('node:assert/strict');const {webcrypto}=require('crypto');const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');const {indexedDB}=require(process.env.CLOUD_FAKE_IDB||'/tmp/peymanyar-cloud-build/node_modules/fake-indexeddb');const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;Object.defineProperty(w,'crypto',{value:{subtle:{digest:(alg,bytes)=>webcrypto.subtle.digest(alg,Buffer.from(new Uint8Array(bytes)))}}});const nativeClone=structuredClone;global.structuredClone=function clone(v){if(v instanceof w.Blob)return v;if(Array.isArray(v))return v.map(clone);if(v&&v.constructor?.name==='Object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return nativeClone(v)};w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','portable-backup.js']){const s=w.document.createElement('script');s.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(s)}

const client={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}};
w.PeymanyarSupabase={createClient:()=>client};w.fetch=async()=>({ok:true});w.Response=Response;
for(const f of ['cloud-account.js','access-panel.js']){
const script=w.document.createElement('script');script.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(script);
}
const style=w.document.createElement('style');style.textContent='.modal{position:fixed;z-index:100}'+fs.readFileSync('access-panel.css','utf8');w.document.head.appendChild(style);
(async()=>{
await w.PeymanyarCloud.boot();await w.PeymanyarAccess.refresh();
const gate=w.document.getElementById('accessGate');assert.ok(gate);
gate.querySelector('button').click();
await new Promise(resolve=>setTimeout(resolve,0));
let dialog=w.document.getElementById('cloudLoginModal');assert.ok(dialog);
assert.ok(Number(w.getComputedStyle(dialog).zIndex)>Number(w.getComputedStyle(gate).zIndex),'login must be above invitation gate');
[...dialog.querySelectorAll('button')].find(b=>b.textContent==='ثبت‌نام حساب جدید').click();
dialog=w.document.getElementById('cloudLoginModal');
assert.ok(dialog.querySelector('#cloudSignupPassword'));
assert.ok(Number(w.getComputedStyle(dialog).zIndex)>Number(w.getComputedStyle(gate).zIndex),'registration must be above invitation gate');
assert.equal(w.document.querySelectorAll('#cloudLoginModal').length,1);
console.log('PASS signed-out gate click opens actual login and registration above gate');
w.PeymanyarCloud.stop();w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
