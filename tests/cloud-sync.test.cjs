const fs=require('fs'),assert=require('node:assert/strict');const {webcrypto}=require('crypto');const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');const {indexedDB}=require('/tmp/peymanyar-cloud-build/node_modules/fake-indexeddb');const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;Object.defineProperty(w,'crypto',{value:{subtle:{digest:(alg,bytes)=>webcrypto.subtle.digest(alg,Buffer.from(new Uint8Array(bytes)))}}});const nativeClone=structuredClone;global.structuredClone=function clone(v){if(v instanceof w.Blob)return v;if(Array.isArray(v))return v.map(clone);if(v&&v.constructor?.name==='Object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return nativeClone(v)};w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','portable-backup.js']){const s=w.document.createElement('script');s.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(s)}
let uid='user-a',snapshot=null,rpcError=null,rpcCalls=0,queryError=null;const blobs=new Map();const client={auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),getUser:async()=>({data:{user:{id:uid,email:uid+'@example.com'}}}),onAuthStateChange(){},signOut:async()=>({}),signInWithOtp:async()=>({}),verifyOtp:async()=>({})},from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:snapshot?structuredClone(snapshot):null,error:queryError})}},rpc:async(name,arg)=>{rpcCalls++;assert.equal(arg.expected_user_id,uid);if(rpcError)return {error:rpcError};if((snapshot?.revision||0)!==arg.expected_revision)return {error:{message:'revision_conflict'}};snapshot={revision:arg.expected_revision+1,payload:structuredClone(arg.new_payload),files:arg.new_files};return {data:snapshot.revision}},storage:{from(){return {upload:async(p,b)=>{blobs.set(p,b);return {}},download:async(p)=>({data:blobs.get(p)})}}}};w.PeymanyarSupabase={createClient:()=>client};const s=w.document.createElement('script');s.textContent=fs.readFileSync('cloud-account.js','utf8');w.document.body.appendChild(s);
(async()=>{
await w.PeymanyarCloud.boot();w.PeymanyarCloud.stop();
assert.equal(await w.PeymanyarCloud.sync(),false);
w.eval('db.projects=[{id:1,name:"پروژه گوشی"}];save()');
assert.equal(await w.PeymanyarCloud.push(true),true);
const key=w.eval('STORAGE'),base=key+':cloud-baseline';
// A desktop edit arriving at the server is received without a confirmation.
snapshot.payload.projects[0].name='ویرایش دسکتاپ';snapshot.revision++;
w.confirm=()=>{throw Error('automatic sync must not confirm')};
assert.equal(await w.PeymanyarCloud.sync(),true);
assert.equal(w.eval('db.projects[0].name'),'ویرایش دسکتاپ');
// Local phone edit travels back to the same account.
w.eval('db.projects[0].name="ویرایش گوشی";save()');
assert.equal(await w.PeymanyarCloud.sync(),true);
assert.equal(snapshot.payload.projects[0].name,'ویرایش گوشی');
// Active input defers remote updates until editing ends.
const input=w.document.createElement('input');w.document.body.append(input);input.focus();
snapshot.payload.projects[0].name='بعد از ویرایش';snapshot.revision++;
assert.equal(await w.PeymanyarCloud.sync(),false);
assert.equal(w.eval('db.projects[0].name'),'ویرایش گوشی');input.blur();input.remove();
assert.equal(await w.PeymanyarCloud.sync(),true);
assert.equal(w.eval('db.projects[0].name'),'بعد از ویرایش');
// Concurrent edits preserve both copies instead of overwriting either.
w.eval('db.projects[0].name="تغییر محلی";save()');
snapshot.payload.projects[0].name='تغییر دستگاه دوم';snapshot.revision++;
const calls=rpcCalls;
assert.equal(await w.PeymanyarCloud.sync(),false);assert.equal(rpcCalls,calls);
assert.equal(w.eval('db.projects[0].name'),'تغییر محلی');
assert.equal(snapshot.payload.projects[0].name,'تغییر دستگاه دوم');
w.confirm=()=>true;assert.equal(await w.PeymanyarCloud.pull(),true);
// Legacy migration survives JSONB key order normalization.
w.localStorage.removeItem(base);
snapshot.payload=Object.fromEntries(Object.entries(snapshot.payload).reverse());
assert.equal(await w.PeymanyarCloud.sync(),true);assert.ok(w.localStorage.getItem(base));
// Fresh desktop receives cloud records automatically on login, no confirmation.
const bindingKey=key+':cloud-binding';
w.localStorage.removeItem(bindingKey);w.localStorage.removeItem(base);w.localStorage.removeItem(key+':cloud-owner');
w.eval("db.projects=[];db.people=[];db.transactions=[];db.contracts=[];db.daily=[];db.documents=[];save()");
w.confirm=()=>{throw Error('fresh device should fetch automatically')};
assert.equal(await w.PeymanyarCloud.sync(),true);
assert.equal(w.eval('db.projects[0].name'),'تغییر دستگاه دوم');
assert.equal(w.PeymanyarCloud.getBinding().revision,snapshot.revision);
// Unbound local records are not overwritten by a different server copy.
w.localStorage.removeItem(bindingKey);w.localStorage.removeItem(base);
w.eval('db.projects[0].name="موجود روی گوشی";save()');
assert.equal(await w.PeymanyarCloud.sync(),false);
assert.equal(w.eval('db.projects[0].name'),'موجود روی گوشی');
w.confirm=()=>true;await w.PeymanyarCloud.pull();
// Guard rechecks during async file restoration, before committing local records.
const original=w.eval('JSON.stringify(db)');
let checks=0;
await assert.rejects(w.PeymanyarBackup.restore({format:'peymanyar-portable',version:1,data:snapshot.payload,files:[]},false,()=>{if(++checks===2)throw Error('changed during restore')}));
assert.equal(w.eval('JSON.stringify(db)'),original);
const rs=w.document.createElement('script');rs.textContent=fs.readFileSync('responsive-layout.js','utf8');w.document.body.append(rs);
assert.equal(w.document.querySelectorAll('.desktop-sidebar nav button').length,8);
w.document.querySelector('.desktop-sidebar nav button[onclick="go(\'projects\')"]').click();
assert.equal(w.eval('page'),'projects');assert.equal(w.document.querySelectorAll('.phone-nav').length,1);
console.log('PASS bidirectional sync, deferred editing, concurrent conflict preservation, legacy JSONB migration, async restore guard, desktop routes and retained mobile navigation');
w.PeymanyarCloud.stop();w.close();
})().catch(e=>{console.error(e);w.PeymanyarCloud.stop();w.close();process.exitCode=1});