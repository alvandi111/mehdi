/* Run with: node tests/document-preview.test.cjs */
async function checkPreview(source){
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const events={},docEvents={},urls={made:[],revoked:[]},timers=[],shared=[],downloads=[];
 let nativePrints=0,baseViews=0,back=0;
 const fakeDocument=()=>{
  const d={title:'ریز محاسبات',body:{innerText:'مهدی: ۲۰۰ تومان',textContent:'مهدی: ۲۰۰ تومان'},head:{append(){}},write(){},close(){},createElement(tag){return new El(tag)}};
  return d;
 };
 class El{
  constructor(tag){this.tag=tag;this.attrs={};this.style={};this.children=[];this.textContent='';this.map={};if(tag==='iframe')this.contentWindow={document:fakeDocument(),print(){nativePrints++}}}
  setAttribute(k,v){this.attrs[k]=v} getAttribute(k){return this.attrs[k]??null} hasAttribute(k){return k in this.attrs} removeAttribute(k){delete this.attrs[k]}
  append(n){this.children.push(n);n.parent=this}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}
  querySelector(s){return this.map[s]||(this.map[s]=new El(s))}
  focus(){document.activeElement=this} click(){if(this.tag==='a')downloads.push({href:this.href,name:this.download,target:this.target});this.onclick?.()}
 }
 const app=new El('app'),focus=new El('input'),document={body:new El('body'),activeElement:focus,createElement:t=>new El(t),getElementById:id=>id==='app'?app:null,addEventListener:(n,f)=>docEvents[n]=f};
 document.body.style.overflow='auto';
 const history={state:{page:'person'},pushState(s){this.state=s},back(){back++;this.state={page:'person'};events.popstate?.()}};
 const window={addEventListener:(n,f)=>events[n]=f,viewDocument(){baseViews++}};
 const URL={createObjectURL(b){const u='blob:'+urls.made.length;urls.made.push({u,b});return u},revokeObjectURL(u){urls.revoked.push(u)}};
 const navigator={canShare:()=>true,async share(v){shared.push(v)}};
 class File{constructor(parts,name,opts){this.parts=parts;this.name=name;this.type=opts.type}}
 class Blob{constructor(parts,opts){this.parts=parts;this.type=opts.type}}
 const db={transactions:[{id:1,amount:200}]},before=JSON.stringify(db),memoryFiles=new Map([[1,{name:'test.pdf',type:'application/pdf',blob:new Blob(['pdf'],{type:'application/pdf'})}]]);
 new Function('window','document','history','navigator','URL','File','Blob','db','memoryFiles','readFile','toast','setTimeout','closeViewer',source)(window,document,history,navigator,URL,File,Blob,db,memoryFiles,async id=>memoryFiles.get(id),()=>{},fn=>timers.push(fn),()=>{});
 let w=window.openPrintPreview();w.document.write('<html></html>');w.document.close();w.print();assert(nativePrints===0,'no automatic print');
 let panel=document.body.children.at(-1);assert(app.hasAttribute('inert'),'underlying app disabled');assert(panel.querySelector('strong').textContent==='ریز محاسبات','report title');
 panel.querySelector('[data-save]').click();assert(nativePrints===1,'explicit print to PDF');
 await panel.querySelector('[data-share]').onclick();assert(shared[0].text.includes('۲۰۰'),'report shares actual text');
 window.PeymanyarDocuments.close();assert(back===1&&!app.hasAttribute('inert')&&document.body.style.overflow==='auto','close returns to existing app');
 assert(document.activeElement===focus,'focus restored');
 await window.viewDocument(1);panel=document.body.children.at(-1);assert(panel.querySelector('[data-save]').textContent==='ذخیره فایل','PDF file toolbar');
 await panel.querySelector('[data-share]').onclick();assert(shared[1].files[0].name==='test.pdf'&&shared[1].files[0].type==='application/pdf','shares original PDF');
 panel.querySelector('[data-save]').click();assert(downloads[0].name==='test.pdf'&&downloads[0].target==='_blank','download isolated from app');
 navigator.canShare=()=>false;await panel.querySelector('[data-share]').onclick();assert(downloads.length===2,'unsupported sharing downloads');
 navigator.canShare=()=>true;navigator.share=async()=>{throw Object.assign(Error(),{name:'AbortError'})};await panel.querySelector('[data-share]').onclick();assert(downloads.length===2,'cancel is not download');
 history.state={page:'person'};events.popstate();assert(!app.hasAttribute('inert')&&urls.revoked.includes('blob:0'),'back closes PDF and revokes preview URL');
 for(const fn of timers)fn();assert(urls.revoked.includes('blob:1'),'download URL released separately');
 await window.viewDocument(2);assert(baseViews===1,'missing attachment uses existing recovery');
 memoryFiles.set(3,{name:'photo.jpg',type:'image/jpeg',blob:{}});await window.viewDocument(3);assert(baseViews===2,'image zoom viewer unchanged');
 app.setAttribute('inert','');app.setAttribute('aria-hidden','false');window.openPrintPreview();docEvents.keydown({key:'Escape',preventDefault(){}});assert(app.hasAttribute('inert')&&app.getAttribute('aria-hidden')==='false','original accessibility preserved');
 assert(JSON.stringify(db)===before,'financial data untouched');
 return 'PASS preview: explicit PDF print, original file share, download fallback, cancel, close/Escape/back, URL cleanup, focus, existing file recovery, no financial writes';
}
if(typeof module!=='undefined'&&require.main===module){
 const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');for(const f of ['app.js','financial-ledger.js','work-statements.js','secretariat.js','cheque-book.js','management-fee.js']){const code=fs.readFileSync(path.join(root,f),'utf8');if(code.includes("window.open('','_blank')"))throw Error('uncontained print path: '+f);new Function(code)};const html=fs.readFileSync(path.join(root,'index.html'),'utf8');if(!html.includes('document-preview.js?v=129')||!html.includes('document-preview.css?v=129'))throw Error('preview assets missing');checkPreview(fs.readFileSync(path.join(root,'document-preview.js'),'utf8')).then(console.log).catch(e=>{console.error(e);process.exitCode=1});
}