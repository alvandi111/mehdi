const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.LEDGER_JSDOM||'../../voice-test-runtime/node_modules/jsdom');
const root=path.join(__dirname,'..'),storage='peymanyar-v1-data';
function boot(data){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const w=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously',virtualConsole:vc}).window;
 w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>{throw Error('offline')};
 w.localStorage.setItem(storage,JSON.stringify(data));
 for(const m of html.matchAll(/<script src="([^?\"]+)/g)){if(m[1].startsWith('vendor/'))continue;const s=w.document.createElement('script');s.textContent=fs.readFileSync(path.join(root,m[1]),'utf8');w.document.body.append(s)}
 assert.deepEqual(errors,[]);return w;
}
const initial={projects:[{id:1,name:'ارشام'},{id:2,name:'آرشام'}],people:[{id:10,name:'نگهبانی'}],transactions:[{id:100,project:'ارشام',party:'نگهبانی',amount:2000000,kind:'expense',date:'1405/07/14',note:'قبلی'}],documents:[],contracts:[],daily:[],workStatements:[],completionTasks:[]};
let w=boot(initial);const db=()=>w.eval('db');const phrase='مبلغ یک میلیون تومان بابت نگهبانی یاسر در پروژه آرشام دیروز پرداخت شد';
function preview(text){w.openQuick();w.document.getElementById('quickText').value=text;w.parseQuick()}
preview(phrase);assert.equal(w.document.getElementById('spParty').value,'یاسر');assert.equal(w.document.getElementById('spCategory').value,'هزینه نگهبانی');assert.equal(w.document.getElementById('spProject').value,'آرشام');assert.equal(w.v21Plan.ambiguousTarget,false);
const date=w.document.getElementById('spDate').value;w.confirmSmartPlan();assert.equal(db().transactions.length,2);const row=db().transactions[1];assert.equal(row.party,'یاسر');assert.equal(row.amount,1000000);assert.equal(row.date,date);assert.equal(row.category,'هزینه نگهبانی');assert.equal(row.project,'آرشام');assert.equal(db().projects.length,2);assert.equal(db().people.length,2);assert.equal(row.personId,db().people.find(p=>p.name==='یاسر').id);assert.deepEqual(JSON.parse(JSON.stringify(db().transactions[0])),initial.transactions[0]);
let saved=JSON.parse(w.localStorage.getItem(storage));w.close();w=boot(saved);assert.equal(db().transactions.length,2);assert.equal(w.reportRows({personId:row.personId,project:'آرشام'}).length,1);w.openPerson(row.personId);assert.match(w.document.querySelector('.statement-payment-list').textContent,/۱,۰۰۰,۰۰۰|۱٬۰۰۰٬۰۰۰|1,000,000/);
// A trusted alias routes the same phrase to the main project; existing Yaser is reused.
db().projects[0].aliases=['آرشام'];preview('یک میلیون تومان به یاسر بابت نگهبانی در پروژه آرشام دیروز پرداخت شد');assert.equal(w.document.getElementById('spProject').value,'ارشام');assert.equal(w.document.getElementById('spParty').value,'یاسر');w.confirmSmartPlan();assert.equal(db().transactions.length,3);assert.equal(db().people.length,2);assert.equal(db().transactions[2].personId,row.personId);assert.equal(db().transactions[2].project,'ارشام');
// Genuine duplicate names remain blocked, with the field identified.
db().people.push({id:11,name:'یاسر'});preview(phrase);w.confirmSmartPlan();assert.equal(db().transactions.length,3);assert.match(w.document.getElementById('toast').textContent,/چند شخص/);
w.close();console.log('PASS: guard category does not replace Yaser; exact alef project spelling; trusted canonical alias; one saved payment; old rows preserved; existing person reused; genuine ambiguity blocked; report and fresh reload');
