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

const initial={projects:[{id:1,name:'آرشام',aliases:['ارشام']},{id:2,name:'حسن‌وند'}],people:[{id:10,name:'رضاییان',aliases:['رضائیان'],role:'بنا',project:'آرشام'},{id:11,name:'یاسر',role:'نگهبان',project:'آرشام'}],transactions:[],documents:[],contracts:[],daily:[],workStatements:[]};
(async()=>{
 let w=boot(JSON.stringify(initial)),d=w.document,db=()=>w.eval('db'),set=(id,v)=>d.getElementById(id).value=v;
 // Enter from the global/dashboard statement list, not from a person page.
 w.showWorkStatements();w.openWorkStatement();set('wsPerson','10');set('wsProject','آرشام');set('wsTitle','صورت رضاییان از داشبورد');set('wsDate','1405/07/17');let tr=d.querySelector('#wsItems tbody tr');tr.querySelector('.ws-description').value='دیوارچینی';tr.querySelector('.ws-quantity').value='10';tr.querySelector('.ws-rate').value='200000';w.saveWorkStatement('draft');let r=db().workStatements[0],id=r.id;assert.equal(r.personId,10);assert.equal(r.contractorId,10);assert.equal(r.projectId,1);assert.equal(r.status,'draft');assert.equal(db().people.length,2);assert.equal(db().transactions.length,0);
 w.openPerson(10);assert.ok(d.querySelector('.statement-records').textContent.includes('صورت رضاییان از داشبورد'));assert.ok(d.querySelector('.statement-records').textContent.includes('منتظر تأیید'));assert.equal(w.PeymanyarStatements.account(10).earned,0);
 w.openProjectSection(1,'statements');assert.ok(d.getElementById('app').textContent.includes('صورت رضاییان از داشبورد'));w.openProjectSection(2,'statements');assert.ok(!d.getElementById('app').textContent.includes('صورت رضاییان از داشبورد'));
 w.openWorkStatement('','',id);w.saveWorkStatement('approved');assert.equal(db().workStatements.length,1);assert.equal(db().workStatements[0].id,id);assert.equal(w.PeymanyarStatements.account(10,'آرشام').earned,2000000);assert.equal(w.PeymanyarStatements.account(10,'حسن‌وند').earned,0);
 // Stable IDs win over stale labels, while aliases in legacy rows still resolve uniquely.
 db().workStatements[0].project='نام قدیمی';assert.equal(w.PeymanyarStatements.account(10,'آرشام').earned,2000000);assert.equal(w.PeymanyarProjectHub.data(db().projects[0]).statements.length,1);w.showWorkStatements(10,'آرشام');assert.ok(d.getElementById('app').textContent.includes('صورت رضاییان از داشبورد'));
 // Persian payment through the dashboard preview -> same person/project account.
 w.openQuick();set('quickText','پرداختی به یاسر بابت نگهبانی آرشام دو میلیون تومان');w.parseQuick();w.confirmSmartPlan();assert.equal(db().transactions.at(-1).personId,11);assert.equal(db().transactions.at(-1).projectId,1);
 // Dashboard cash grid now persists all identity fields, not only labels.
 w.openCashMode('manual');w.bulkCell(0,'project','ارشام');w.bulkCell(0,'party','رضائیان');w.bulkCell(0,'amount','500000');w.bulkCell(0,'date','1405/07/17');w.saveBulkCash();const cash=db().transactions.at(-1);assert.equal(cash.personId,10);assert.equal(cash.contractorId,10);assert.equal(cash.projectId,1);assert.equal(db().people.length,2);assert.equal(w.PeymanyarStatements.account(10,'آرشام').balance,1500000);
 // Dashboard report routing persists canonical project and is shown by the project module.
 w.openQuick();set('quickText','گزارش پروژه آرشام امروز هفت کارگر داشتیم');w.parseQuick();await w.saveRoutedCommand(false);assert.equal(db().daily[0].projectId,1);w.openProjectSection(1,'daily');assert.ok(d.getElementById('app').textContent.includes('هفت'));
 // Contract command stays in both the same person's dossier and the selected project.
 w.openQuick();set('quickText','یک قرارداد با رضاییان برای پروژه آرشام موضوع بنایی مبلغ دو میلیون تومان بساز');w.parseQuick();set('irParty','رضاییان');await w.saveRoutedCommand(false);assert.equal(db().contracts[0].personId,10);assert.equal(db().contracts[0].contractorId,10);assert.equal(db().contracts[0].projectId,1);assert.equal(db().people.length,2);assert.equal(w.PeymanyarProjectHub.data(db().projects[0]).contracts.length,1);assert.equal(w.PeymanyarProjectHub.data(db().projects[1]).contracts.length,0);
 // Existing document attached to a payment follows the payment IDs and does not create a second payment.
 w.storeFile=async()=>{};w.attachTransactionDocument(cash.id);w.eval('pendingSmartFile=new File(["image"],"test.jpg",{type:"image/jpeg"})');const count=db().transactions.length;await w.saveSmartDocument();assert.equal(db().transactions.length,count);assert.equal(db().documents[0].personId,10);assert.equal(db().documents[0].projectId,1);assert.equal(db().documents[0].transactionId,cash.id);
 // Old unmatched/ambiguous rows are not assigned to a random person by the common reader.
 db().people.push({id:12,name:'همنام'},{id:13,name:'همنام'});assert.equal(w.PeymanyarLinks.person({party:'همنام'}),null);assert.equal(w.PeymanyarLinks.personMatch({party:'همنام'},db().people[2]),false);
 const stale={id:900,projectId:2,project:'آرشام',personId:10,party:'نام قبلی',amount:77,kind:'expense',date:'1405/07/17'};db().transactions.push(stale);w.save();assert.equal(stale.project,'حسن‌وند');assert.equal(w.reportRows({project:'آرشام',personId:10}).some(x=>x.id===900),false);assert.equal(w.reportRows({project:'حسن‌وند',personId:10}).some(x=>x.id===900),true);
 // No implicit approval, financial duplication or ID change after reload.
 const saved=w.localStorage.getItem(storage);w.close();w=boot(saved);d=w.document;db=()=>w.eval('db');assert.equal(db().workStatements[0].id,id);assert.equal(db().transactions.length,count+1);w.openPerson(10);assert.ok(d.querySelector('.statement-records').textContent.includes('صورت رضاییان از داشبورد'));assert.equal(w.PeymanyarStatements.account(10,'آرشام').balance,1500000);
 // Save failure rolls back only generated linkage metadata; existing amount and IDs survive.
 const legacy={id:999,project:'ارشام',party:'رضائیان',amount:3,kind:'expense'};db().transactions.push(legacy);const proto=Object.getPrototypeOf(w.localStorage),real=proto.setItem;proto.setItem=()=>{throw Error('quota')};assert.throws(()=>w.save());assert.equal(legacy.projectId,undefined);assert.equal(legacy.personId,undefined);assert.equal(legacy.project,'ارشام');assert.equal(legacy.amount,3);proto.setItem=real;
 w.close();console.log('PASS: dashboard statement draft visibility, approval in place, canonical person/project IDs, scoped account and project display, payment, cash grid, report, linked receipt, ambiguous names, stale labels, reload and failed-save linkage rollback');
})().catch(e=>{console.error(e);process.exitCode=1});
