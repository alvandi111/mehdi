const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');
const root=path.join(__dirname,'..'),bootstrap=fs.readFileSync(path.join(root,'account-bootstrap.js'),'utf8'),panel=fs.readFileSync(path.join(root,'access-panel.js'),'utf8');
function boot(id,token){const w=new JSDOM('<body><div id="app"></div></body>',{url:'https://alvandi111.github.io/mehdi/'+(token?'#invite='+token:''),runScripts:'outside-only'}).window;w.localStorage.setItem('peymanyar-v1-data','owner-financial-data');w.localStorage.setItem('peymanyar-v1-data:cloud-owner','00000000-0000-4000-8000-000000000100');if(id)w.localStorage.setItem('peymanyar-auth',JSON.stringify({user:{id}}));w.eval(bootstrap);return w}
async function main(){
 const owner='00000000-0000-4000-8000-000000000100',user='00000000-0000-4000-8000-000000000101';
 let w=boot(owner);assert.equal(w.PeymanyarAccountStorage,'peymanyar-v1-data');w.close();
 w=boot(user,'a'.repeat(64));assert.equal(w.PeymanyarAccountStorage,'peymanyar-account:'+user);assert.equal(w.localStorage.getItem('peymanyar-v1-data'),'owner-financial-data');assert.equal(w.location.hash,'');assert.equal(w.sessionStorage.getItem('peymanyar-invite'),'a'.repeat(64));w.sessionStorage.removeItem('peymanyar-invite');
 const calls=[],network=[];let state={user_id:user,email:'tester@example.invalid',status:'active',read:true,write:true,admin:false,features:{speech:true,ai:true},quotas:{speech:100,ai:50},usage:{}};
 w.fetch=async(url,init)=>{network.push({url,init});return {ok:true}};w.setInterval=()=>0;w.Response=Response;w.confirm=()=>true;w.toast=()=>{};w.fa=x=>String(x);w.esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));w.openCloudLogin=()=>{};w.openCloudAccountMenu=()=>{};w.settings=()=>'<main class="phone-content"></main>';
 w.PeymanyarCloud={client:{
 auth:{getSession:async()=>({data:{session:{user:{id:user},access_token:'test-session-token'}}})},
 rpc:async(name,args)=>{calls.push(args);const data=args.action==='state'?state:args.action==='list_users'?[{...state,last_seen:null,created_at:new Date().toISOString()}]:args.action==='list_invites'?[]:args.action==='create_invite'?{token:'b'.repeat(64)}:{ok:true};return {data};}
 }};
 w.eval("var STORAGE='test-data';var db={transactions:[{id:1,amount:200}]};var AI_ENDPOINT_KEY='ai-endpoint',DEFAULT_AI_ENDPOINT='https://peymanyar-ai.mehdi-alvandi111.workers.dev';function save(){localStorage.setItem(STORAGE,JSON.stringify(db))}");w.eval(panel);await w.PeymanyarAccess.refresh();
 assert.equal(w.document.body.classList.contains('access-locked'),false);assert.ok(!w.settings().includes('پنل مهدی'));
 await w.openSystemAdmin();assert.equal(w.document.getElementById('accessDialog'),null,'ordinary user has no admin panel');
 await w.fetch('https://peymanyar-ai.mehdi-alvandi111.workers.dev/transcribe',{method:'POST',body:'voice'});assert.ok(network[0].url.endsWith('/peymanyar-ai-gateway/transcribe'));assert.equal(network[0].init.headers.Authorization,'Bearer test-session-token');assert.equal(network[0].init.body,'voice');
 await w.fetch('https://example.invalid/not-ai');assert.equal(network[1].url,'https://example.invalid/not-ai');
 w.eval('save()');state={...state,write:false};await w.PeymanyarAccess.refresh();assert.throws(()=>w.eval('db.transactions[0].amount=999;save()'));assert.equal(w.eval('db.transactions[0].amount'),200,'expired write restores persisted local snapshot');
 state={...state,status:'suspended',read:false};await w.PeymanyarAccess.refresh();assert.ok(w.document.getElementById('accessGate'));assert.ok(w.document.body.classList.contains('access-locked'));
 state={...state,status:'active',read:true,write:true,admin:true};await w.PeymanyarAccess.refresh();await w.openSystemAdmin();assert.ok(w.document.getElementById('accessDialog').textContent.includes('مدیریت سامانه'));
 w.openAccessInvite();await w.createAccessInvite();const link=w.document.getElementById('accessInviteLink').value;assert.ok(link.endsWith('#invite='+'b'.repeat(64)));assert.ok(!link.includes('owner-financial-data'));
 const invite=calls.find(c=>c.action==='create_invite');assert.equal(invite.args.max_uses,10);assert.equal(invite.args.days,60);
 assert.equal(w.localStorage.getItem('peymanyar-v1-data'),'owner-financial-data');w.close();
 w=boot(null);assert.equal(w.PeymanyarAccountStorage,'peymanyar-guest-data');w.close();
 console.log('PASS account partition, owner preservation, invitation fragment, admin visibility, gateway routing, expired writes, suspended UI and 10-person invitation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
