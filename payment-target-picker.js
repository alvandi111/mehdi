(function(){
 'use strict';
 const eq=(a,b)=>a!=null&&b!=null&&String(a)===String(b),clean=PeymanyarCommand.clean,key=s=>clean(s).replace(/آ/g,'ا');
 const roles=[['نگهبانی','نگهبان'],['نگهبان','نگهبان'],['جوشکاری','جوشکار'],['جوشکار','جوشکار'],['بنایی','بنا'],['بنا','بنا'],['کارگری','کارگر'],['کارگر','کارگر'],['برقکاری','برقکار'],['برقکار','برقکار'],['لوله کشی','لوله کش'],['لوله کش','لوله کش'],['نقاشی','نقاش'],['نقاش','نقاش']];
 const roleOf=s=>roles.find(([word])=>(' '+key(s)+' ').includes(' '+word+' '))?.[1]||'';
 const generic=s=>!clean(s)||roles.some(([word])=>key(s)===word)||/^(?:هزینه|پرداخت|طرف حساب|ثبت نشده)/.test(clean(s));
 const names=p=>[p.name,...(p.aliases||[])];
 function similar(a,b){a=key(a);b=key(b);if(!a||!b||Math.min(a.length,b.length)<3)return a===b;if(a.includes(b)||b.includes(a))return true;if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,miss=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++miss>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++}return miss+(a.length-i)+(b.length-j)<=1}
 function projectRows(value){const k=key(value);return db.projects.filter(p=>names(p).some(n=>key(n)===k))}
 function scoped(person,project){if(!project)return false;if(person.projectId!=null)return eq(person.projectId,project.id);const labels=[person.project,...(person.projects||[])].filter(Boolean);return labels.some(n=>names(project).includes(n))||(db.transactions||[]).some(t=>eq(t.personId??t.contractorId,person.id)&&(t.projectId!=null?eq(t.projectId,project.id):names(project).includes(t.project)))}
 function specialists(role){if(!role)return [];return db.people.filter(p=>!generic(p.name)&&(roleOf(p.role)===role||(db.transactions||[]).some(t=>(eq(t.personId??t.contractorId,p.id)||names(p).includes(t.party))&&roleOf([t.role,t.category,t.note].join(' '))===role)))}
 function selectedProject(p){const chosen=db.projects.find(x=>eq(x.id,p.pickProjectId));if(chosen&&chosen.name===v('spProject'))return chosen;const rows=projectRows(v('spProject')),aliases=rows.filter(x=>(x.aliases||[]).some(n=>key(n)===key(v('spProject')))),literal=rows.filter(x=>clean(x.name)===clean(v('spProject')));return aliases.length===1?aliases[0]:literal.length===1?literal[0]:rows.length===1?rows[0]:null}
 function selectedPerson(p){const chosen=db.people.find(x=>eq(x.id,p.pickPersonId));if(chosen&&chosen.name===v('spParty'))return chosen;return null}
 function strip(id,label,rows,type,chosen){const box=document.getElementById(id);if(!box)return;box.innerHTML=rows.length?`<small>${label}</small><div class="payment-choice-strip">${rows.map(r=>`<button type="button" data-payment-${type}="${esc(String(r.id))}" aria-pressed="${eq(r.id,chosen)}">${esc(r.name)}${type==='person'?`<small>${esc(r.role||'تخصص ثبت نشده')} • ${esc((r.projects||[r.project]).filter(Boolean).join('، '))}</small>`:`<small>${esc(r.client||r.location||'پروژه موجود')}</small>`}</button>`).join('')}</div>`:''}
 function refresh(auto=true){const p=window.v21Plan;if(!p?.recipientPicker)return;const project=selectedProject(p);if(project)p.pickProjectId=project.id;
  strip('paymentProjectChoices','پروژه‌های مشابه؛ منظورت کدام است؟',db.projects.filter(x=>names(x).some(n=>similar(n,v('spProject')))),'project',project?.id);
  const current=selectedPerson(p);if(!current)p.pickPersonId=null;
  const all=p.pickRole?specialists(p.pickRole):db.people.filter(x=>names(x).some(n=>similar(n,v('spParty'))));
  const local=all.filter(x=>scoped(x,project)),others=all.filter(x=>!scoped(x,project));
  if(auto&&p.roleOnly&&!p.pickDeferred&&!p.pickManual&&local.length===1){p.pickPersonId=local[0].id;document.getElementById('spParty').value=local[0].name}
  else if(auto&&p.roleOnly&&!p.pickManual&&!p.pickDeferred&&local.length!==1){p.pickPersonId=null;document.getElementById('spParty').value=''}
  strip('paymentPersonChoices',p.pickRole?(local.length?`${p.pickRole}‌های این پروژه؛ منظورت کدام است؟`:'افراد این تخصص در پروژه‌های دیگر؛ در این پروژه سابقه‌ای پیدا نشد'):'حساب‌های مشابه؛ یک نفر را انتخاب کن',local.length?local:all,'person',p.pickPersonId);
  strip('paymentOtherChoices','افراد این تخصص در پروژه‌های دیگر',local.length?others:[],'person',p.pickPersonId);
  const hint=document.getElementById('paymentDeferredHint');if(hint)hint.textContent=p.pickDeferred?'طرف حساب بعداً مشخص می‌شود؛ مبلغ و پروژه اکنون ثبت می‌شوند.':p.roleOnly&&!p.pickPersonId?'می‌توانی یک نفر را انتخاب کنی یا بدون نام ثبت کنی؛ در «موارد نیازمند تکمیل» پیگیری می‌شود.':'';
 }
 const parseBase=parseQuick;parseQuick=function(...args){const result=parseBase(...args),p=window.v21Plan;if(!p?.quickPayment||!document.getElementById('spParty'))return result;
  const explicit=PeymanyarCommand.paymentRecipient(p.note||''),role=roleOf(p.note||''),named=explicit&&!generic(explicit),spokenName=!generic(p.party)&&(' '+key(p.note)+' ').includes(' '+key(p.party)+' ');
  Object.assign(p,{recipientPicker:true,pickRole:role,roleOnly:!!role&&!named&&!spokenName,pickProjectId:null,pickPersonId:null,pickDeferred:false,pickManual:false});
  if(p.roleOnly)document.getElementById('spParty').value='';
  document.getElementById('spProject').closest('.field').insertAdjacentHTML('beforeend','<div id="paymentProjectChoices" class="payment-choices"></div>');
  document.getElementById('spParty').closest('.field').insertAdjacentHTML('beforeend','<div id="paymentPersonChoices" class="payment-choices"></div><div id="paymentOtherChoices" class="payment-choices"></div><button type="button" class="btn" data-payment-defer>نام را بعداً مشخص می‌کنم</button><p id="paymentDeferredHint" role="status"></p>');refresh();return result;
 };
 document.addEventListener('click',e=>{const button=e.target.closest('[data-payment-project],[data-payment-person],[data-payment-defer]'),p=window.v21Plan;if(!button||!p?.recipientPicker)return;
  if(button.hasAttribute('data-payment-project')){const row=db.projects.find(x=>eq(x.id,button.dataset.paymentProject));if(!row)return;p.pickProjectId=row.id;document.getElementById('spProject').value=row.name;if(p.roleOnly){p.pickPersonId=null;p.pickManual=false;p.pickDeferred=false}}
  else if(button.hasAttribute('data-payment-person')){const row=db.people.find(x=>eq(x.id,button.dataset.paymentPerson));if(!row)return;p.pickPersonId=row.id;p.pickManual=true;p.pickDeferred=false;document.getElementById('spParty').value=row.name}
  else{p.pickDeferred=true;p.pickPersonId=null;p.pickManual=false;document.getElementById('spParty').value=''}refresh();
 });
 document.addEventListener('input',e=>{const p=window.v21Plan;if(!p?.recipientPicker)return;if(e.target.id==='spProject'){p.pickProjectId=null;if(p.roleOnly){p.pickManual=false;p.pickPersonId=null;p.pickDeferred=false}refresh()}else if(e.target.id==='spParty'){p.pickPersonId=null;p.pickManual=true;p.pickDeferred=false;refresh(false)}});
 function uniqueId(rows){let id=uid();while(rows.some(x=>eq(x.id,id)))id++;return id}
 function commit(change){const before=db,draft=JSON.parse(JSON.stringify(db));try{change(draft);db=draft;save();return true}catch{db=before;toast('ثبت ذخیره نشد؛ اطلاعات قبلی حفظ شد');return false}}
 const confirmBase=confirmSmartPlan;confirmSmartPlan=function(...args){const p=window.v21Plan;if(!p?.recipientPicker)return confirmBase(...args);
  const project=selectedProject(p),projectText=v('spProject');if(!project&&projectRows(projectText).length)return toast('پروژه را از نوار پیشنهادها انتخاب کن');
  let person=selectedPerson(p),party=v('spParty');const deferred=p.pickDeferred||(!party&&p.roleOnly);
  if(!person&&!deferred&&party){const matches=db.people.filter(x=>names(x).some(n=>key(n)===key(party)));if(matches.length>1)return toast('چند شخص با این نام وجود دارد؛ از نوار پیشنهادها انتخاب کن');person=matches[0]||null;
   if(!person){const short=key(party).replace(/^(?:استاد|اوستا|اوسا|اقای)\s+/,'');const similar=db.people.filter(x=>key(x.name).replace(/^(?:استاد|اوستا|اوسا|اقای)\s+/,'').split(' ').includes(short));if(similar.length>1)return toast('نام چند نفر مشابه است؛ یکی را انتخاب کن یا نام را بعداً مشخص کن')}
  }
  const amount=n('spAmount'),date=PeymanyarStatements.date(v('spDate')),kind=v('spKind'),method=v('spMethod'),category=v('spCategory')||p.category||'هزینه عمومی',cheque=method==='cheque';
  const number=String(v('spChequeNumber')).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s/g,''),bank=v('spChequeBank'),due=PeymanyarStatements.date(v('spChequeDue'));
  if(!projectText||!date||!Number.isSafeInteger(amount)||amount<=0||!['expense','income'].includes(kind)||!['bank','cash','cheque'].includes(method))return toast('پروژه، مبلغ و تاریخ معتبر را وارد کن');
  if(cheque&&(kind!=='expense'||!number||!due))return toast('برای چک تحویلی، نوع پرداخت، شماره و سررسید را تکمیل کن');
  if(cheque&&db.transactions.some(t=>t.paymentMethod==='cheque'&&String(t.chequeNumber)===number&&t.chequeBank===bank&&t.chequeStatus!=='cancelled'))return toast('این چک قبلاً ثبت شده است؛ همان چک را ویرایش کن');
  let rowId;
  if(!commit(d=>{let proj=project&&d.projects.find(x=>eq(x.id,project.id)),who=person&&d.people.find(x=>eq(x.id,person.id));
   if(!proj){proj={id:uniqueId(d.projects),name:projectText,client:'ثبت نشده',status:'فعال',budget:0,progress:0,start:date,completeness:'draft'};d.projects.push(proj)}
   if(!who&&!deferred&&party&&!generic(party)){who={id:uniqueId(d.people),name:party,role:p.pickRole||'طرف حساب',project:proj.name,projects:[proj.name],completeness:'draft'};d.people.push(who)}
   rowId=uniqueId(d.transactions);const unresolved=!who;
   const row={id:rowId,project:proj.name,projectId:proj.id,party:who?.name||'طرف حساب نامشخص',personId:who?.id??null,contractorId:who?.id??null,role:p.pickRole||who?.role||'طرف حساب',amount,date,dateSource:p.dateSource||'default',kind,category,note:p.note,status:unresolved?'نیازمند تکمیل':'ثبت اولیه',source:'voice',paymentMethod:method};
   if(unresolved)Object.assign(row,{partyStatus:'unresolved',partyCandidates:specialists(p.pickRole).filter(x=>scoped(x,proj)).map(x=>x.id)});
   if(cheque)Object.assign(row,{chequeNumber:number,chequeBank:bank,chequeDue:due,chequeStatus:'delivered'});
   d.transactions.push(row);if(!d.categories.includes(category))d.categories.push(category);
   if(unresolved){d.completionTasks=d.completionTasks||[];d.completionTasks.unshift({id:'party-'+rowId,key:'transaction.party:'+rowId,type:'transaction.party',entityId:rowId,project:proj.name,eventDate:date,title:`طرف حساب ${category} ${money(amount)} در ${proj.name} چه کسی بود؟`,status:'open',createdAt:new Date().toISOString()})}
  }))return;
  finishQuickRegistration('ثبت مالی انجام شد'+(db.transactions.find(t=>eq(t.id,rowId)).partyStatus==='unresolved'?'؛ نام طرف حساب در موارد نیازمند تکمیل پیگیری می‌شود':''));
 };
 const personMatchBase=transactionPersonMatch;transactionPersonMatch=function(row,person){return row.partyStatus==='unresolved'?false:personMatchBase(row,person)};
 let review=null;
 window.openPaymentPartyCompletion=function(id){const row=db.transactions.find(x=>eq(x.id,id));if(!row)return;review=JSON.stringify(row);document.getElementById('completionInbox')?.remove();document.getElementById('paymentPartyCompletion')?.remove();const project=db.projects.find(x=>eq(x.id,row.projectId))||db.projects.find(x=>x.name===row.project),people=db.people.slice().sort((a,b)=>Number(scoped(b,project))-Number(scoped(a,project)));
  document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="paymentPartyCompletion"><div class="dialog" role="dialog" aria-label="تکمیل طرف حساب"><div class="dialog-head"><h2>این پرداخت برای چه کسی بود؟</h2><button class="close" onclick="document.getElementById('paymentPartyCompletion').remove()">×</button></div><p>${esc(row.project)} • ${esc(row.category)} • ${money(row.amount)} • ${esc(row.date)}</p>${field('شخص موجود',`<select id="paymentCompletionPerson"><option value="">انتخاب کن</option>${people.map(x=>`<option value="${esc(String(x.id))}">${esc(x.name)} — ${esc(x.role||'')} — ${esc(x.project||'')}</option>`).join('')}</select>`)}${field('یا نام شخص جدید','<input id="paymentCompletionName" placeholder="نام شخص جدید">')}<button class="btn primary" onclick="savePaymentPartyCompletion(${Number(row.id)})">اتصال به همین پرداخت</button></div></div>`);
 };
 window.savePaymentPartyCompletion=function(id){const row=db.transactions.find(x=>eq(x.id,id));if(!row||JSON.stringify(row)!==review)return toast('اطلاعات پرداخت تغییر کرده؛ پنجره را دوباره باز کن');let person=db.people.find(x=>eq(x.id,v('paymentCompletionPerson'))),name=v('paymentCompletionName');if(!person&&generic(name))return toast('شخص را انتخاب کن یا نام واقعی شخص را بنویس');if(!person){const matches=db.people.filter(x=>names(x).some(n=>key(n)===key(name)));if(matches.length>1)return toast('چند نام مشابه وجود دارد؛ شخص موجود را از فهرست انتخاب کن');person=matches[0]||null}
  if(!commit(d=>{let who=person&&d.people.find(x=>eq(x.id,person.id));if(!who){who={id:uniqueId(d.people),name,role:row.role||'طرف حساب',project:row.project,projects:[row.project]};d.people.push(who)}const target=d.transactions.find(x=>eq(x.id,id));Object.assign(target,{party:who.name,personId:who.id,contractorId:who.id,partyStatus:'resolved'});for(const t of d.completionTasks||[])if(t.type==='transaction.party'&&eq(t.entityId,id)){t.status='done';t.resolvedAt=new Date().toISOString()}}))return;
  document.getElementById('paymentPartyCompletion').remove();review=null;render();toast('طرف حساب به همان پرداخت وصل شد؛ مبلغ دوباره ثبت نشد');
 };
 const actionBase=completionAction;completionAction=function(id){const task=completionOpen().find(x=>eq(x.id,id));return task?.type==='transaction.party'?openPaymentPartyCompletion(task.entityId):actionBase(id)};
 const resolveBase=resolveCompletionTask;resolveCompletionTask=function(id){const task=completionOpen().find(x=>eq(x.id,id));return task?.type==='transaction.party'?completionAction(id):resolveBase(id)};
 const taskBase=completionTaskRow;completionTaskRow=function(task){return task.type==='transaction.party'?`<article class="completion-row"><div><strong>${esc(task.title)}</strong><small>${esc(task.project)} • ${esc(task.eventDate||'')}</small></div><button onclick="completionAction('${esc(String(task.id))}')">تعیین طرف حساب</button></article>`:taskBase(task)};
 const css=document.createElement('style');css.textContent='.payment-choices{margin-top:8px}.payment-choice-strip{display:flex;gap:8px;overflow-x:auto;padding:8px 0}.payment-choice-strip button{flex:0 0 auto;max-width:230px;white-space:normal;border:1px solid #d9c7a6;background:#fffaf1;border-radius:14px;padding:10px;text-align:right;color:#17362f}.payment-choice-strip button[aria-pressed="true"]{border:2px solid #17362f;background:#eaf3ec}.payment-choice-strip small{display:block;margin-top:4px}#paymentDeferredHint{font-size:13px;line-height:1.8}';document.head.append(css);
})();
