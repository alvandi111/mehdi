(function(){
 'use strict';
 const names=entity=>[entity.name,...(entity.aliases||[])].filter(Boolean);
 const sameName=(a,b)=>!!personIdentityKey(a)&&!!personIdentityKey(b)&&personIdentityKey(a)===personIdentityKey(b);
 knownPerson=function(value){const exact=db.people.find(p=>sameName(p.name,value));if(exact)return exact;const matches=db.people.filter(p=>(p.aliases||[]).some(name=>sameName(name,value)));return matches.length===1?matches[0]:null};
 transactionPersonMatch=function(row,person){const target=typeof person==='object'?person:knownPerson(person);if(!target)return sameName(row.party,person);const linkedId=row.personId??row.contractorId;if(linkedId!=null&&db.people.some(p=>String(p.id)===String(linkedId)))return String(linkedId)===String(target.id);return names(target).some(name=>sameName(row.party,name))};
 function rename(kind,id,value){
  const list=kind==='project'?db.projects:db.people,entity=list.find(x=>String(x.id)===String(id)),name=String(value||'').trim();
  if(!entity)return toast('مورد انتخاب‌شده پیدا نشد'),false;
  if(!name)return toast('نام را وارد کن'),false;
  if(list.some(x=>String(x.id)!==String(id)&&names(x).some(old=>sameName(old,name))))return toast('این نام برای مورد دیگری ثبت شده است؛ نام متفاوتی وارد کن'),false;
  if(name===entity.name)return true;
  const oldNames=names(entity),matches=value=>oldNames.some(old=>sameName(old,value));
  if(kind==='person'){
   for(const key of ['transactions','contracts','documents'])for(const row of db[key]||[]){
    const linked=row.personId??row.contractorId;
    const linkedExists=linked!=null&&db.people.some(p=>String(p.id)===String(linked));
    if(linkedExists&&String(linked)!==String(id))continue;
    if(String(linked)===String(id)||matches(row.party))row.party=name;
    for(const field of ['personName','contractorName','origin','destination'])if(matches(row[field]))row[field]=name;
    if(row.fields)for(const field of ['contractor','contractorName','party'])if(matches(row.fields[field]))row.fields[field]=name;
   }
  }else{
   for(const rows of Object.values(db).filter(Array.isArray))for(const row of rows){
    for(const field of ['project','projectName'])if(matches(row[field]))row[field]=name;
    if(Array.isArray(row.projects))row.projects=row.projects.map(value=>matches(value)?name:value);
    if(row.fields)for(const field of ['project','projectName'])if(matches(row.fields[field]))row.fields[field]=name;
   }
  }
  entity.aliases=[...new Set([...oldNames,...(entity.aliases||[])])].filter(old=>old!==name);entity.name=name;return true;
 }
 window.renameEntity=rename;
 window.openEntityNameEditor=function(kind,id){const entity=(kind==='project'?db.projects:db.people).find(x=>String(x.id)===String(id));if(!entity)return;document.getElementById('entityNameEditor')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="entityNameEditor"><div class="dialog" role="dialog" aria-modal="true" aria-label="ویرایش نام و مشخصات"><div class="dialog-head"><h2>${kind==='project'?'ویرایش نام پروژه':'ویرایش نام و تخصص'}</h2><button class="close" onclick="document.getElementById('entityNameEditor').remove()">×</button></div>${field('نام',`<input id="entityEditableName" value="${esc(entity.name)}" autocomplete="off">`)}${kind==='person'?field('تخصص / نقش',`<input id="entityEditableRole" value="${esc(entity.role||'')}" placeholder="مثلاً جوشکار، بنا یا برقکار">`):''}<p>سوابق مالی و اسناد با نام جدید حفظ می‌شوند.</p><button type="button" class="btn primary full-action" onclick="saveEntityName('${kind}',${Number(id)})">${kind==='project'?'ذخیره نام':'ذخیره تغییرات'}</button></div></div>`);document.getElementById('entityEditableName').focus()};
 window.saveEntityName=function(kind,id){if(!rename(kind,id,v('entityEditableName')))return;if(kind==='person'){const person=db.people.find(x=>String(x.id)===String(id));person.role=v('entityEditableRole')}save();document.getElementById('entityNameEditor')?.remove();render();toast('تغییرات ذخیره شد؛ سوابق و اسناد حفظ شدند')};
 const identityOpen=openPersonIdentity;openPersonIdentity=function(id){identityOpen(id);const person=db.people.find(x=>String(x.id)===String(id)),grid=document.querySelector('#personIdentityModal .form-grid');if(person&&grid)grid.insertAdjacentHTML('afterbegin',field('نام شخص / پیمانکار',`<input id="personEditableName" value="${esc(person.name)}">`)+field('تخصص / نقش',`<input id="personEditableRole" value="${esc(person.role||'')}" placeholder="مثلاً جوشکار، بنا یا برقکار">`))};
 const identitySave=savePersonIdentity;savePersonIdentity=function(id){if(document.getElementById('personEditableName')&&!rename('person',id,v('personEditableName')))return;if(document.getElementById('personEditableRole')){const person=db.people.find(x=>String(x.id)===String(id));if(person)person.role=v('personEditableRole')}return identitySave(id)};
 const personBase=personDetail;personDetail=function(){const person=db.people.find(x=>String(x.id)===String(selectedPersonId));let html=personBase();if(!person)return html;html=html.replace(`<h2>${esc(person.name)}</h2>`,`<h2>${esc(person.name)}</h2><button type="button" class="btn entity-rename" onclick="openEntityNameEditor('person',${Number(person.id)})">✎ ویرایش نام و تخصص</button>`);const linkedDocs=new Set(reportRows({personId:person.id}).map(row=>String(row.documentId||'')));const docs=db.documents.filter(doc=>transactionPersonMatch(doc,person)||linkedDocs.has(String(doc.id)));const section=`<section class="detail-section"><div class="section-inline"><h3>اسناد و پیوست‌های ${esc(person.name)}</h3><span>${fa(docs.length)} سند</span></div><div class="document-list">${docs.map(documentInfoCard).join('')||empty()}</div></section>`;return html.replace('</main>',section+'</main>')};
 const projectBase=projectDetail;projectDetail=function(){const project=db.projects.find(x=>String(x.id)===String(selectedProjectId));const html=projectBase();return project?html.replace(`<h2>${esc(project.name)}</h2>`,`<h2>${esc(project.name)}</h2><button type="button" class="btn entity-rename" onclick="openEntityNameEditor('project',${Number(project.id)})">✎ ویرایش نام پروژه</button>`):html};
 const reportBase=transactionReportTable;transactionReportTable=function(rows){return reportBase(rows).replace(/(<button class="edit-amount" onclick="openRecordEditor\('transaction',(\d+)\)"[^>]*>[^<]*<\/button>)/g,(_all,button,id)=>`${button}<button type="button" class="record-delete-visible" onclick="removeTransaction(${id})">حذف ثبت مالی</button>`)};
 const documentBase=documentInfoCard;documentInfoCard=function(doc){return documentBase(doc).replace('</article>',`<button type="button" class="record-delete-visible" onclick="removeDocument(${Number(doc.id)})">حذف سند</button></article>`)};
 render();
})();
