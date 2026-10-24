const fs=require('fs'),assert=require('node:assert/strict');const {webcrypto}=require('crypto');const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');const {indexedDB}=require(process.env.CLOUD_FAKE_IDB||'/tmp/peymanyar-cloud-build/node_modules/fake-indexeddb');const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;Object.defineProperty(w,'crypto',{value:{subtle:{digest:(alg,bytes)=>webcrypto.subtle.digest(alg,Buffer.from(new Uint8Array(bytes)))}}});const nativeClone=structuredClone;global.structuredClone=function clone(v){if(v instanceof w.Blob)return v;if(Array.isArray(v))return v.map(clone);if(v&&v.constructor?.name==='Object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return nativeClone(v)};w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','portable-backup.js']){const s=w.document.createElement('script');s.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(s)}
let uid='user-a',snapshot=null,rpcError=null,rpcCalls=0,queryError=null;const blobs=new Map();const client={auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),getUser:async()=>({data:{user:{id:uid,email:uid+'@example.com'}}}),onAuthStateChange(){},signOut:async()=>({}),signInWithOtp:async()=>({}),verifyOtp:async()=>({})},from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:snapshot?structuredClone(snapshot):null,error:queryError})}},rpc:async(name,arg)=>{rpcCalls++;assert.equal(arg.expected_user_id,uid);if(rpcError)return {error:rpcError};if((snapshot?.revision||0)!==arg.expected_revision)return {error:{message:'revision_conflict'}};snapshot={revision:arg.expected_revision+1,payload:structuredClone(arg.new_payload),files:arg.new_files};return {data:snapshot.revision}},storage:{from(){return {upload:async(p,b)=>{blobs.set(p,b);return {}},download:async(p)=>({data:blobs.get(p)})}}}};w.eval(fs.readFileSync('sync-merge.js','utf8'));w.PeymanyarSupabase={createClient:()=>client};const s=w.document.createElement('script');s.textContent=fs.readFileSync(process.env.CLOUD_ACCOUNT_SOURCE||'cloud-account.js','utf8');w.document.body.appendChild(s);

(async()=>{
await w.PeymanyarCloud.boot();w.PeymanyarCloud.stop();
w.eval('db.projects=[{id:1,name:"آمفی تئاتر"}];db.transactions=[];db.documents=[];save()');
assert.equal(await w.PeymanyarCloud.push(true),true);
w.openQuick();let modal=w.document.getElementById('modal');
w.document.getElementById('quickText').value='هزینه حمل';
modal.dispatchEvent(new w.Event('touchmove',{bubbles:true}));modal.click();
assert.ok(modal.isConnected,'scroll/backdrop does not dismiss finance entry');
assert.equal(w.document.getElementById('quickText').value,'هزینه حمل');
w.closeModal();w.openForm('transaction');modal=w.document.getElementById('modal');modal.click();assert.ok(modal.isConnected);w.closeModal();
// Simulate desktop adding a record while phone has an unsent different record.
snapshot.payload.transactions.push({id:20,amount:200,project:'آمفی تئاتر'});snapshot.revision++;
w.eval('db.transactions.push({id:30,amount:300,project:"آمفی تئاتر"});save()');
assert.equal(await w.PeymanyarCloud.sync(),true);
assert.equal(JSON.stringify(snapshot.payload.transactions.map(x=>x.id).sort()),"[20,30]");
assert.equal(w.eval('db.transactions.length'),2);
// Editing is never interrupted by remote refresh.
w.openForm('transaction');w.document.getElementById('fAmount').value='123';
snapshot.payload.transactions.push({id:40,amount:400});snapshot.revision++;
assert.equal(await w.PeymanyarCloud.sync(),false);assert.equal(w.document.getElementById('fAmount').value,'123');
w.closeModal();assert.equal(await w.PeymanyarCloud.sync(),true);assert.equal(w.eval('db.transactions.length'),3);
// Same field conflict preserves local and remote versions.
snapshot.payload.transactions.find(x=>x.id===20).amount=999;snapshot.revision++;
w.eval('db.transactions.find(x=>x.id===20).amount=888;save()');
assert.equal(await w.PeymanyarCloud.sync(),false);assert.equal(snapshot.payload.transactions.find(x=>x.id===20).amount,999);assert.equal(w.eval('db.transactions.find(x=>x.id===20).amount'),888);
const merge=w.PeymanyarMerge.merge;
assert.equal(JSON.stringify(merge([{id:1,a:1}],[{id:1,a:1}],[])),'[]');
assert.throws(()=>merge([{id:1,a:1}],[{id:1,a:2}],[]),/sync_conflict/);
assert.equal(JSON.stringify(merge({a:1,b:1},{a:2,b:1},{a:1,b:2})),JSON.stringify({a:2,b:2}));
console.log('PASS finance backdrop/scroll preservation, cross-device record merge, open-form deferral, same-field conflicts, deletions');
w.PeymanyarCloud.stop();w.close();
})().catch(e=>{console.error(e);w.PeymanyarCloud.stop();w.close();process.exitCode=1});
