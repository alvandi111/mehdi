const fs=require('fs'),assert=require('node:assert/strict');const {webcrypto}=require('crypto');const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');const {indexedDB}=require(process.env.CLOUD_FAKE_IDB||'/tmp/peymanyar-cloud-build/node_modules/fake-indexeddb');const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;Object.defineProperty(w,'crypto',{value:{subtle:{digest:(alg,bytes)=>webcrypto.subtle.digest(alg,Buffer.from(new Uint8Array(bytes)))}}});const nativeClone=structuredClone;global.structuredClone=function clone(v){if(v instanceof w.Blob)return v;if(Array.isArray(v))return v.map(clone);if(v&&v.constructor?.name==='Object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return nativeClone(v)};w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','portable-backup.js']){const s=w.document.createElement('script');s.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(s)}

w.saveInventoryEntry=()=>{};
// Date validator dependency: this suite tests routing, not calendar validation.
w.PeymanyarStatements={date:s=>/^1[34]\d{2}\/\d{2}\/\d{2}$/.test(s)?s:''};
for(const f of ['quick-payment.js','live-dictation.js','payment-target-picker.js','intent-router.js'])w.eval(fs.readFileSync(f,'utf8'));

w.eval(fs.readFileSync('voice-interpretation.js','utf8'));
w.eval('db.projects=[{id:1,name:"آرشام"}];db.people=[{id:2,name:"یاسر مرادی",role:"نگهبان",project:"آرشام"}];db.transactions=[]');
const result={intent:'transaction_create',kind:'expense',amount_toman:2500000,amount_quote:'دو میلیون و پونصد هزار تومان',project:{id:'1',candidates:[],reason:'آرشان را با آرشام تطبیق دادم'},person:{id:'2',candidates:[]},category:'نگهبانی',questions:[]};
let response=result;
w.AbortController=AbortController;
w.fetch=async(url,opts)=>{assert.ok(url.endsWith('/interpret'));const body=JSON.parse(opts.body);assert.equal(body.people[0].role,'نگهبان');assert.equal(body.projects[0].name,'آرشام');assert.equal(body.transactions,undefined);return {ok:true,json:async()=>response}};
(async()=>{
 const raw='مبلغ دو میلیون و پونصد هزار تومان به حساب یاسر بابت نگهبانی پروژه آرشان پرداخت شد';
 w.openQuick();let input=w.document.getElementById('quickText');input.value=raw;await w.parseQuick();
 assert.ok(w.document.getElementById('voiceInterpretationReview'));
 assert.equal(w.document.querySelector('#voiceInterpretationReview select'),null);
 assert.ok(w.document.getElementById('voiceInterpretationReview').textContent.includes('دو میلیون و پانصد هزار تومان'));
 assert.equal(w.document.getElementById('spAmount'),null);
 assert.equal(w.eval('db.transactions.length'),0);
 w.document.getElementById('voiceInterpretationAccept').click();
 assert.equal(input.value,raw,'transcript preserved');
 assert.equal(w.eval('n("spAmount")'),2500000);
 assert.equal(w.document.getElementById('spProject').value,'آرشام');
 assert.equal(w.document.getElementById('spParty').value,'یاسر مرادی');
 assert.equal(String(w.v21Plan.pickPersonId),'2');
 assert.equal(w.eval('db.transactions.length'),0);
 w.confirmSmartPlan();assert.equal(w.eval('db.transactions.length'),1);assert.equal(w.eval('db.transactions[0].amount'),2500000);assert.equal(w.eval('db.transactions[0].personId'),2);assert.equal(w.eval('db.transactions[0].note'),raw);w.eval('db.transactions=[]');
 w.closeUniversalQuick();
 // A model's lost multiplier must never silently fill the amount.
 response={...result,amount_toman:2};w.openQuick();input=w.document.getElementById('quickText');input.value=raw;await w.parseQuick();
 assert.equal(w.document.getElementById('voiceInterpretationAccept').disabled,true);w.closeUniversalQuick();
 // No person selected: show candidates only, never the whole account directory.
 response={...result,person:{id:null,candidates:['2']}};w.openQuick();input=w.document.getElementById('quickText');input.value=raw;await w.parseQuick();
 assert.equal(w.document.getElementById('voiceInterpretationAccept').disabled,true);
 w.document.querySelector('[data-choice="person"]').click();assert.equal(w.document.getElementById('voiceInterpretationAccept').disabled,false);
 const edit=w.document.getElementById('voiceInterpretationText');edit.value='مبلغ جدید';edit.dispatchEvent(new w.Event('input'));assert.equal(w.document.getElementById('voiceInterpretationAccept').disabled,true);w.closeUniversalQuick();
 response={...result,person:{id:'not-in-account'}};w.openQuick();input=w.document.getElementById('quickText');input.value=raw;await w.parseQuick();assert.equal(w.document.getElementById('voiceInterpretationAccept'),null);assert.ok(w.document.getElementById('interpretManual'));w.closeUniversalQuick();
 assert.equal(w.eval('db.transactions.length'),0);
 assert.equal(w.PeymanyarVoiceInterpretation.words(24000000),'بیست و چهار میلیون');
 console.log('UI: prose review, full amount, identity, immutable transcript, ambiguity, model conflict, edited-text invalidation passed');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
