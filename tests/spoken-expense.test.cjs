const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),engine=require('../command-engine');
const text='برای پروژه آرشام مبلغ ۲ میلیون و ۴۰۰ بابت هزینه کرایه بالابر استفاده شد.';
const data={projects:[{id:1,name:'ها قسمت هزینه خرید مصالح رو'},{id:2,name:'آرشام'}],people:[]};
let c=engine.parse(text,data,'1405/07/11');
assert.equal(c.project,'آرشام');assert.equal(c.amount,2400000);assert.equal(c.category,'کرایه بالابر');assert.equal(c.kind,'expense');assert.ok(c.amountWarning);assert.deepEqual(c.missing,[]);
assert.equal(engine.parse(text,{projects:[data.projects[0]],people:[]},'1405/07/11').project,'آرشام');
assert.equal(engine.parse(text,{projects:[{name:'آرشام اصلی',aliases:['آرشام']}],people:[]},'1405/07/11').project,'آرشام اصلی');
for(const phrase of ['۲ میلیون و ۴۰۰ هزار','دو میلیون و چهارصد هزار','مبلغ دو میلیون و چهارصد هزار','مبلغ ۲ میلیون و ۴۰۰ هزار تومان'])assert.equal(engine.amountOf(phrase+' بابت کرایه بالابر'),2400000,phrase);
assert.equal(engine.amountOf('مبلغ ۲ میلیون و ۴۰۰ تومان بابت کرایه بالابر'),2000400);
assert.equal(engine.amountOf('مبلغ دو میلیون و اشتباه بابت کرایه بالابر'),0);
const {JSDOM}=require('../../voice-test-runtime/node_modules/jsdom');
const w=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously'}).window;
w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const f of ['workspace-engine.js','collaboration-engine.js','command-engine.js','contract-engine.js','receipt-date.js','app.js','daily-voice.js','persian-calendar.js','receipt-transport.js','live-dictation.js','entity-editor.js','financial-ledger.js','bulk-entry.js','dashboard-cash.js','project-merge.js']){const el=w.document.createElement('script');el.textContent=fs.readFileSync(path.join(__dirname,'..',f),'utf8');w.document.body.appendChild(el)}
const db=w.eval('db');db.projects=data.projects;db.people=[];db.transactions=[];
w.document.body.insertAdjacentHTML('beforeend','<textarea id="quickText"></textarea><div id="parsedResult"></div>');w.document.getElementById('quickText').value=text;w.parseQuick();
const html=w.document.getElementById('parsedResult').textContent;
assert.match(html,/آرشام/);assert.match(html,/کرایه بالابر/);assert.match(html,/واحد بخش آخر/);assert.equal(w.parsedCommand.amount,2400000);assert.equal(db.transactions.length,0);
console.log('PASS: screenshot project priority, aliases, compound amount, explicit units, rental category, review warning and actual app draft without saving');w.close();
