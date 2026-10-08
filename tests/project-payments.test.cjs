const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.LEDGER_JSDOM||'../../voice-test-runtime/node_modules/jsdom');
const root=path.join(__dirname,'..'),storage='peymanyar-v1-data';
function boot(saved){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const w=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously',virtualConsole:console}).window;
 w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>{throw Error('offline test')};
 if(saved)w.localStorage.setItem(storage,saved);
 // All app scripts in the deployed order. The network SDK is not used in this local ledger test.
 for(const m of html.matchAll(/<script src="([^?\"]+)/g)){const file=m[1];if(file.startsWith('vendor/'))continue;const s=w.document.createElement('script');s.textContent=fs.readFileSync(path.join(root,file),'utf8');w.document.body.append(s)}
 assert.deepEqual(errors,[]);return w;
}

const initial={projects:[{id:1,name:'آرشام',aliases:['ارشام']},{id:2,name:'حسن‌وند'}],people:[{id:10,name:'یاسر',role:'نگهبان',project:'آرشام'}],transactions:[],documents:[],contracts:[],daily:[],workStatements:[],completionTasks:[]};
(async()=>{const w=boot(JSON.stringify(initial)),d=w.document,set=(id,v)=>d.getElementById(id).value=v,db=()=>w.eval('db');
for(const phrase of ['پرداختی به یاسر بابت نگهبانی آرشام دو میلیون تومان','دو میلیون تومان بابت نگهبانی یاسر در پروژه آرشام واریز شد','پرداختی به یاسر بابت نگهبانی در پروژه آرشام دو میلیون تومان']){w.openQuick();set('quickText',phrase);w.parseQuick();assert.equal(d.getElementById('spKind').value,'expense');assert.equal(d.getElementById('spProject').value,'آرشام');assert.equal(d.getElementById('spParty').value,'یاسر');w.confirmSmartPlan();}
assert.equal(db().transactions.length,3);assert.equal(db().projects.length,2);assert.equal(db().people.length,1);for(const r of db().transactions){assert.equal(r.projectId,1);assert.equal(r.personId,10);assert.equal(r.kind,'expense');assert.equal(r.amount,2000000);assert.ok(w.activityRow(r).includes('−'));}assert.equal(w.PeymanyarFunding.sum(db().transactions).paid,6000000);
const income=w.PeymanyarCommand.parse('دو میلیون تومان از کارفرما برای پروژه آرشام دریافت کردم',db(),'1405/07/16');assert.equal(income.kind,'income');assert.equal(income.project,'آرشام');
// Existing record correction must replace stale project ID and keep the same row and document.
const row=db().transactions[0];row.projectId=2;row.kind='income';row.documentId=88;db().documents.push({id:88,name:'رسید',project:'حسن‌وند',projectId:2,party:'یاسر',type:'image/jpeg'});
w.openProjectSection(1,'finance');assert.ok(d.getElementById('app').textContent.includes('بررسی و اصلاح همین ثبت'));w.reviewProjectPayment(row.id,1);assert.equal(d.getElementById('reProject').value,'آرشام');assert.equal(d.getElementById('reKind').value,'expense');set('reProject','ارشام');set('reKind','expense');set('reParty','یاسر');w.saveRecordEditor('transaction',row.id);assert.equal(row.projectId,1);assert.equal(row.project,'آرشام');assert.equal(row.contractorId,10);assert.equal(row.documentId,88);assert.equal(row.kind,'expense');assert.equal(db().documents[0].projectId,1);assert.equal(db().transactions.length,3);
for(let i=0;i<11;i++)db().transactions.push({id:100+i,projectId:i===5?2:1,project:i===5?'حسن‌وند':'آرشام',party:'یاسر',amount:100+i,kind:'expense',date:i===10?'1405/01/01':'1405/07/16'});
w.openProjectSection(1,'finance');w.ledgerSet('project:1','kind','income');assert.equal(d.querySelectorAll('.ledger-table tbody tr').length,1);w.projectFinanceView('recent');assert.equal(w.eval('activeReport.rows.length'),10);assert.equal(w.eval('activeReport.rows[0].id'),110);assert.ok(w.eval('activeReport.rows.every(x=>x.projectId===1)'));assert.equal(d.querySelectorAll('.ledger-table tbody tr').length,10);assert.ok(!d.getElementById('ledgerFrom'));assert.equal(w.eval('activeReport.rows[0].date'),'1405/01/01');w.projectFinanceView('all');assert.ok(d.getElementById('ledgerFrom'));w.ledgerReset('project:1');assert.equal(w.eval('activeReport.rows.length'),13);
const stored=w.localStorage.getItem(storage);w.close();const again=boot(stored);assert.equal(again.eval('db.transactions[0].projectId'),1);assert.equal(again.eval('db.transactions[0].kind'),'expense');again.close();console.log('PASS: Yaser 2m Persian input/preview/save; outgoing sign; project/account IDs; alias; no duplicate entities; correct existing income/project ID in place with document; reload; project recent 10 in registration order incl backdated; separate persistent all filters')})().catch(e=>{console.error(e);process.exitCode=1});
