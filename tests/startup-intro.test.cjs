const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script id="peymanyarIntroController">([\s\S]*?)<\/script>/)[1];
function boot({reduced=false,reject=false,inert=false}={}){
 const w=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'https://alvandi111.github.io/mehdi/',runScripts:'outside-only'}).window;
 let played=0,paused=0;const timers=new Map();let id=0;
 w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};w.clearTimeout=i=>timers.delete(i);
 w.matchMedia=()=>({matches:reduced});w.HTMLMediaElement.prototype.play=function(){played++;return reject?{catch:fn=>fn(Error('autoplay blocked'))}:Promise.resolve()};w.HTMLMediaElement.prototype.pause=()=>paused++;
 if(inert){w.document.getElementById('app').setAttribute('inert','');w.document.getElementById('app').setAttribute('aria-hidden','false')}
 w.localStorage.setItem('peymanyar-v1-data','financial-data');w.eval(script);
 return {w,timers,played:()=>played,paused:()=>paused,close:()=>w.close()};
}
let a=boot();const d=a.w.document;assert.equal(d.getElementById('peymanyarIntro').hidden,false);assert.ok(d.getElementById('app').hasAttribute('inert'));assert.equal(a.played(),1);assert.ok(d.getElementById('peymanyarIntroVideo').muted);assert.ok(d.getElementById('peymanyarIntroVideo').playsInline);d.getElementById('app').innerHTML='<main>ready</main>';d.getElementById('peymanyarIntroVideo').dispatchEvent(new a.w.Event('ended'));assert.ok(!d.getElementById('peymanyarIntro'));assert.ok(!d.getElementById('app').hasAttribute('inert'));assert.equal(d.querySelector('main').textContent,'ready');assert.equal(a.w.localStorage.getItem('peymanyar-v1-data'),'financial-data');assert.equal(a.timers.size,0);a.w.dispatchEvent(new a.w.Event('pageshow'));assert.ok(!d.getElementById('peymanyarIntro'),'no replay during navigation');a.close();
for(const event of ['error','skip','timeout','escape','source-error']){a=boot();const d=a.w.document;if(event==='error')d.getElementById('peymanyarIntroVideo').dispatchEvent(new a.w.Event('error'));if(event==='source-error')d.querySelector('#peymanyarIntroVideo source').dispatchEvent(new a.w.Event('error'));if(event==='skip')d.getElementById('peymanyarIntroSkip').click();if(event==='escape')d.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Escape'}));if(event==='timeout'){const t=[...a.timers.values()][0];assert.ok(t.ms<=4500);t.fn()}assert.ok(!d.getElementById('peymanyarIntro'),event+' must release the app');assert.ok(!d.getElementById('app').hasAttribute('inert'));a.close()}
a=boot({reject:true});assert.ok(!a.w.document.getElementById('peymanyarIntro'));a.close();a=boot({reduced:true});assert.equal(a.played(),0);assert.equal([...a.timers.values()][0].ms,450);[...a.timers.values()][0].fn();assert.ok(!a.w.document.getElementById('peymanyarIntro'));a.close();a=boot({inert:true});a.w.document.getElementById('peymanyarIntroSkip').click();assert.ok(a.w.document.getElementById('app').hasAttribute('inert'));assert.equal(a.w.document.getElementById('app').getAttribute('aria-hidden'),'false');a.close();
assert.ok(html.indexOf('peymanyarIntroController')<html.indexOf('src="app.js'));
console.log('PASS startup: muted inline media; concurrent app rendering; no financial writes; ended/skip/Escape/source failure/autoplay failure/timeout release; reduced motion; original accessibility state; no navigation replay');
