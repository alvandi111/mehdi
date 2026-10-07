const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app-update.js'),'utf8');
async function run({revision='101',busy=false,offline=false,current='100'}={}){
 const moves=[],events={},notices=[],writes=[];let time=20000;
 const context={URL,AbortController,Date:{now:()=>time},setTimeout:()=>1,clearTimeout(){},location:{href:'https://alvandi111.github.io/mehdi/?x=1',replace:u=>moves.push(u)},document:{hidden:false,querySelector:s=>s.startsWith('meta')?{content:current}:busy?{}:null,addEventListener:(n,f)=>events[n]=f},window:{addEventListener:(n,f)=>events[n]=f},confirm:()=>false,toast:s=>notices.push(s),localStorage:{setItem:()=>writes.push(1),removeItem:()=>writes.push(1)},DOMParser:class{parseFromString(){return{querySelector:()=>({content:revision})}}},fetch:async(u,o)=>{assert.equal(o.cache,'no-store');assert.match(u,/index.html\?check=/);if(offline)throw Error('offline');return{ok:true,text:async()=>'<html>'}}};
 vm.runInNewContext(code,context);await new Promise(setImmediate);assert.equal(writes.length,0);return{moves,notices,context,events,advance:()=>time+=11000};
}
(async()=>{let r=await run();assert.equal(r.moves.length,1);assert.match(r.moves[0],/v=101/);assert.match(r.moves[0],/x=1/);
 r=await run({revision:'100'});assert.equal(r.moves.length,0);r.advance();await r.events.visibilitychange();assert.equal(r.moves.length,0);
 r=await run({busy:true});assert.equal(r.moves.length,0);assert.equal(r.notices.length,1);r.context.window.refreshPeymanyarApp();assert.equal(r.moves.length,0);
 r=await run({offline:true});assert.equal(r.moves.length,0);r.context.window.refreshPeymanyarApp();assert.equal(r.moves.length,1);
 r=await run({revision:'98'});assert.equal(r.moves.length,0);
 console.log('PASS: launch/resume update checks, no stale downgrade, busy form protection, offline use, manual refresh, no data writes');
})().catch(e=>{console.error(e);process.exitCode=1});
