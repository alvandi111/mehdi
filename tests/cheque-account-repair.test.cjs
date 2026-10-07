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
const initial={projects:[{id:1,name:'ارشام',aliases:['آرشام']},{id:2,name:'دیگر'}],people:[{id:10,name:'اوسا احمد بنا',aliases:['استاد احمد'],project:'ارشام'},{id:11,name:'اوسا احمد',project:'دیگر'}],transactions:[{id:100,personId:11,contractorId:11,party:'اوسا احمد',project:'آرشام',projectId:2,amount:2000000,date:'1405/07/14',kind:'expense',paymentMethod:'cheque',chequeNumber:'123',chequeBank:'ملت',chequeDue:'1405/08/01',chequeStatus:'delivered',documentId:200,note:'چک قبلی'}],documents:[{id:200,name:'تصویر چک'}],contracts:[],daily:[],workStatements:[],completionTasks:[]};
let w=boot(JSON.stringify(initial));let d=w.document;const set=(id,value)=>d.getElementById(id).value=String(value),db=()=>w.eval('db');
assert.equal(w.PeymanyarStatements.account(10,'ارشام').paid,0);w.openPerson(10);assert.match(d.querySelector('.statement-actions').textContent,/اتصال چک قبلی/);
w.go('finance');assert.match(d.querySelector('.ledger-heading').textContent,/اصلاح حساب چک قبلی/);assert.match(d.querySelector('.ledger-row-menu').textContent,/اصلاح حساب این چک/);
w.openChequeAccountRepair(100,10);set('crProject',1);const original=JSON.parse(JSON.stringify(db().transactions[0]));
w.confirm=()=>false;w.saveChequeAccountRepair();assert.deepEqual(JSON.parse(JSON.stringify(db().transactions[0])),original);
w.confirm=()=>true;const save=w.save;w.save=()=>{throw Error('quota')};w.saveChequeAccountRepair();assert.deepEqual(JSON.parse(JSON.stringify(db().transactions[0])),original);w.save=save;
w.saveChequeAccountRepair();assert.equal(db().transactions.length,1);assert.equal(db().people.length,2);assert.equal(db().projects.length,2);
const repaired=JSON.parse(JSON.stringify(db().transactions[0]));assert.deepEqual(repaired,{...original,personId:10,contractorId:10,party:'اوسا احمد بنا',projectId:1,project:'ارشام'});
assert.equal(w.reportRows({personId:10,project:'ارشام'}).length,1);assert.equal(w.PeymanyarStatements.account(10,'ارشام').paid,2000000);assert.equal(w.PeymanyarStatements.account(11).paid,0);
w.openPerson(10);assert.match(d.querySelector('.statement-payment-list').textContent,/123/);w.openProject(1);assert.equal(w.eval('activeReport.rows.length'),1);
let saved=w.localStorage.getItem(storage);w.close();w=boot(saved);d=w.document;assert.deepEqual(JSON.parse(JSON.stringify(db().transactions[0])),repaired);assert.equal(w.PeymanyarStatements.account(10,'ارشام').pending,2000000);
// A fresh command traverses the production wrappers, both forms, storage and a fresh page load.
w.openQuick();set('quickText','سه میلیون تومان به استاد احمد در پروژه آرشام به صورت چک پرداخت شد');w.parseQuick();set('spChequeNumber','۴۵۶');set('spChequeBank','ملت');set('spChequeDue','1405/08/02');w.confirmSmartPlan();
assert.equal(db().transactions.length,2);let created=JSON.parse(JSON.stringify(db().transactions[1]));assert.equal(created.personId,10);assert.equal(created.contractorId,10);assert.equal(created.projectId,1);assert.equal(created.project,'ارشام');
w.openQuick();set('quickText','سه میلیون تومان به استاد احمد در پروژه آرشام به صورت چک پرداخت شد');w.parseQuick();set('spChequeNumber','456');set('spChequeBank','ملت');set('spChequeDue','1405/08/02');w.confirmSmartPlan();assert.equal(db().transactions.length,2);
w.openContractorPayment('','',created.id);set('cpNote','توضیح اصلاح‌شده');w.saveContractorPayment();assert.equal(db().transactions.length,2);assert.equal(db().transactions[1].id,created.id);assert.equal(db().transactions[1].projectId,1);
w.setContractorCheque(created.id,'cleared');assert.equal(db().transactions.length,2);assert.equal(w.PeymanyarStatements.account(10,'ارشام').paid,5000000);
saved=w.localStorage.getItem(storage);w.close();w=boot(saved);d=w.document;assert.equal(db().transactions.length,2);assert.equal(w.PeymanyarStatements.account(10,'ارشام').paid,5000000);assert.equal(w.PeymanyarStatements.account(10,'ارشام').pending,2000000);w.openPerson(10);assert.equal(d.querySelectorAll('.statement-payment-list tbody tr').length,2);
// Stale review cannot silently overwrite newer sync or user edits.
w.openChequeAccountRepair(100,11);set('crProject',2);db().transactions[0].note='تغییر هم‌زمان';w.saveChequeAccountRepair();assert.equal(db().transactions[0].personId,10);
// Legacy settled rows with only contractorId keep their account when edited.
delete db().transactions[1].personId;w.openContractorPayment('','',created.id);set('cpNote','اصلاح یادداشت');w.saveContractorPayment();assert.equal(db().transactions[1].personId,10);assert.equal(db().transactions[1].contractorId,10);assert.equal(db().transactions.length,2);
w.close();console.log('PASS: production app order; repair existing cheque without duplication; all IDs; attachment, amount and status preserved; cancel confirmation; quota rollback; stale review; quick-entry cheque; edit and clear; fresh-page reload; contractor-only settled legacy row');
// Mock only the microphone and ASR response; use the actual recorder, HTTP adapter,
// parser, preview, confirmation, payment writer, account view and fresh-page load.
(async()=>{
 w=boot(JSON.stringify({...initial,transactions:[]}));d=w.document;
 let processor,stopped=0,requests=0;
 w.AudioContext=class{constructor(){this.sampleRate=16000;this.state='running'}createMediaStreamSource(){return{connect(){},disconnect(){}}}createScriptProcessor(){return processor={connect(){},disconnect(){}}}close(){this.state='closed';return Promise.resolve()}};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}});
 w.fetch=async(url,options)=>{assert.match(url,/\/transcribe$/);assert.equal(options.method,'POST');assert.ok(options.body.get('file').size>400);requests++;return {ok:true,json:async()=>({text:'چهار میلیون تومان به استاد احمد در پروژه آرشام به صورت چک پرداخت شد'})}};
 w.openQuick();await w.startVoice();processor.onaudioprocess({outputBuffer:{getChannelData:()=>new Float32Array(8000)},inputBuffer:{getChannelData:()=>new Float32Array(8000).fill(.2)}});
 d.querySelector('.voice-main-button').click();await new Promise(r=>setImmediate(r));assert.equal(stopped,1);assert.equal(requests,1);assert.equal(d.querySelector('.voice-fullscreen'),null);assert.match(d.getElementById('quickText').value,/چهار میلیون/);assert.equal(db().transactions.length,0);assert.equal(d.getElementById('spMethod'),null);
 w.parseQuick();set('spChequeNumber','۷۸۹');set('spChequeBank','ملت');set('spChequeDue','1405/08/03');w.confirmSmartPlan();assert.equal(db().transactions.length,1);const row=db().transactions[0];assert.equal(row.personId,10);assert.equal(row.contractorId,10);assert.equal(row.projectId,1);assert.equal(row.amount,4000000);
 const saved=w.localStorage.getItem(storage);w.close();w=boot(saved);d=w.document;assert.equal(db().transactions.length,1);assert.equal(w.PeymanyarStatements.account(10,'ارشام').paid,4000000);w.openPerson(10);assert.match(d.querySelector('.statement-payment-list').textContent,/789/);w.close();console.log('PASS: mocked microphone and Persian ASR HTTP response through real recorder, review, parse, cheque save, all IDs, account and fresh-page reload');
})().catch(error=>{w.close();console.error(error);process.exitCode=1});
