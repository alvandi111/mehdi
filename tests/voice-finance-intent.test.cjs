const fs=require('fs'),assert=require('node:assert/strict');const {webcrypto}=require('crypto');const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');const {indexedDB}=require(process.env.CLOUD_FAKE_IDB||'/tmp/peymanyar-cloud-build/node_modules/fake-indexeddb');const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;Object.defineProperty(w,'crypto',{value:{subtle:{digest:(alg,bytes)=>webcrypto.subtle.digest(alg,Buffer.from(new Uint8Array(bytes)))}}});const nativeClone=structuredClone;global.structuredClone=function clone(v){if(v instanceof w.Blob)return v;if(Array.isArray(v))return v.map(clone);if(v&&v.constructor?.name==='Object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return nativeClone(v)};w.indexedDB=indexedDB;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','portable-backup.js']){const s=w.document.createElement('script');s.textContent=fs.readFileSync(f,'utf8');w.document.body.appendChild(s)}

w.saveInventoryEntry=()=>{};
// Date validator dependency: this suite tests routing, not calendar validation.
w.PeymanyarStatements={date:s=>/^1[34]\d{2}\/\d{2}\/\d{2}$/.test(s)?s:''};
for(const f of ['quick-payment.js','live-dictation.js','payment-target-picker.js','intent-router.js'])w.eval(fs.readFileSync(f,'utf8'));
w.eval('db.projects=[{id:1,name:"حسنوند"}];db.people=[{id:2,name:"محمد مرادی",project:"حسنوند"}];db.transactions=[]');
const parse=(text,options)=>w.PeymanyarCommand.parse(text,w.eval('db'),'1405/08/07',options);
for(const [text,amount] of [['مبلغ چهار میلیون تومان',4000000],['مبلغ یک میلیون و پانصد هزار تومان',1500000],['مبلغ دویستوپنج هزار تومان',205000],['مبلغ ششصدوبیست هزار تومن',620000],['مبلغ ۲۴۰ میلیون ریال',24000000],['مبلغ بیست غلط میلیون تومان',0]])assert.equal(w.PeymanyarCommand.amountOf(text),amount,text);
const examples=[
'مبلغ بیست وچهار میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند پرداخت شد',
'مبلغ بیست‌وچهار میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند پرداخت شد',
'مبلغ بیستوچهار میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند پرداخت شد',
'مبلغ به عدد بیست و چهار میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند پرداخت شد',
'مبلغ ۲۴ میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند پرداخت شد',
'مبلغ بیست و چهار میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند واریز شد',
'مبلغ ۲۴ میلیون تومان به حساب محمد مرادی بابت پروژه حسنوند',
'مبلغ 24000000 تومان به حساب محمد مرادی بابت پروژه حسنوند',
];
for(const text of examples){
 w.openQuick();const input=w.document.getElementById('quickText');input.value=text;w.parseQuick();
 assert.equal(w.v21Plan.intent,'transaction_create');assert.equal(w.v21Plan.amount,24000000);assert.equal(w.document.getElementById('spProject').value,'حسنوند');assert.equal(w.document.getElementById('spParty').value,'محمد مرادی');assert.equal(w.document.getElementById('spKind').value,'expense');assert.equal(w.eval('n("spAmount")'),24000000);
 const blob={test:'original voice'};input._voiceBlob=blob;
 w.useExample('برای پروژه سپیدار بابت کرایه وانت دو میلیون تومان پرداخت کردم');
 assert.equal(input.value,text);assert.equal(input._voiceBlob,blob);assert.equal(w.v21Plan.amount,24000000);assert.equal(w.v21Plan.project,'حسنوند');assert.equal(w.v21Plan.note,w.PeymanyarCommand.clean(text));
 w.parseQuick();assert.equal(w.v21Plan.amount,24000000);assert.equal(input.value,text);
 assert.equal(w.eval('db.transactions.length'),0,'analysis never posts money');w.closeUniversalQuick();
}
// Exact screenshot transcription: verify both preview and the stored multiplier.
w.eval('db.projects=[{id:1,name:"خانه حسنوند"}];db.people=[{id:2,name:"آقای حامد مرادی",project:"خانه حسنوند"}];db.transactions=[]');
for(const amountText of ['24 ملیون تومن','۲۴ ملیون تومان','بیست و چهار ملیون تومن','24ملیونتومن','بیست و چهار میلیون تومان']){
 const screenshot='مبلغ '+amountText+' به حساب آقای حامد مرادی بابت پروژه خانه حسنوند پرداخت شد.';
 w.openQuick();w.document.getElementById('quickText').value=screenshot;w.parseQuick();
 assert.equal(w.v21Plan.amount,24000000,screenshot);assert.equal(w.eval('n("spAmount")'),24000000,screenshot);
 w.confirmSmartPlan();assert.equal(w.eval('db.transactions.at(-1).amount'),24000000,'stored amount includes million multiplier');
}
w.eval('db.projects=[{id:1,name:"حسنوند"}];db.people=[{id:2,name:"محمد مرادی",project:"حسنوند"}];db.transactions=[]');
// An unrecognized fragment can be classified without fake sample data or lost date/method.
w.openQuick();let input=w.document.getElementById('quickText');input.value='محمد مرادی پروژه حسنوند ۲۴ میلیون تومان تاریخ ۱۸/۶ با چک';
w.parseQuick();w.useExample('برای پروژه سپیدار بابت کرایه وانت دو میلیون تومان پرداخت کردم');
assert.equal(w.v21Plan.amount,24000000);assert.equal(w.v21Plan.date.slice(-5),'06/18');assert.equal(w.v21Plan.paymentMethod,'cheque');assert.equal(w.v21Plan.project,'حسنوند');assert.equal(w.v21Plan.party,'محمد مرادی');
assert.ok(!input.value.includes('سپیدار'));w.closeUniversalQuick();
// Empty helper opens an empty editable payment preview, never fictitious money.
w.openQuick();input=w.document.getElementById('quickText');input.value='';w.useExample('برای پروژه سپیدار بابت کرایه وانت دو میلیون تومان پرداخت کردم');assert.equal(input.value,'');assert.equal(w.v21Plan.amount,0);assert.equal(w.v21Plan.project,'');w.closeUniversalQuick();
assert.equal(parse('مبلغ ۱۵۰ میلیون تومان به حساب من واریز شد').kind,'income');
assert.equal(parse('از کارفرما مبلغ ۱۵۰ میلیون تومان دریافت کردم').kind,'income');
assert.equal(parse('مبلغ ۲۴ میلیون تومان واریز شد').kind,'expense');
assert.equal(parse('گزارش روزانه پروژه حسنوند امروز مبلغ ۲۴ میلیون تومان پرداخت شد').intent,'daily_create');
assert.equal(parse('گزارش مالی پروژه حسنوند را نشان بده').intent,'financial_query');
assert.equal(parse('قرارداد با محمد مرادی مبلغ ۲۴ میلیون تومان برای پروژه حسنوند تنظیم کن').intent,'contract_create');

// Confirming the tested sentence creates one expense; closing afterward keeps project context.
w.eval('page="projectDetail";selectedProjectId=1');w.openQuick();w.document.getElementById('quickText').value=examples[0];w.parseQuick();w.confirmSmartPlan();
assert.equal(w.eval('db.transactions.length'),1);assert.equal(w.eval('db.transactions[0].amount'),24000000);assert.equal(w.eval('db.transactions[0].kind'),'expense');assert.equal(w.eval('db.transactions[0].project'),'حسنوند');assert.equal(w.eval('db.transactions[0].party'),'محمد مرادی');assert.equal(w.eval('page'),'projectDetail');
console.log('PASS actual quick-payment/router UI: amount, direction, project, party, source/audio preservation, repeated analysis, forced intent, cheque/date, empty helper and report isolation');setTimeout(()=>w.close(),0);
