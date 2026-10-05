/* Visible deletion and horizontal swipe actions, shared by phone and desktop. */
(function(){
 'use strict';
 const collections={person:'people',project:'projects',contract:'contracts',daily:'daily'};
 const labels={person:'فرد',project:'پروژه',contract:'قرارداد',daily:'گزارش روزانه'};
 const eq=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
 window.removeEntity=function(kind,id){
  const key=collections[kind],record=key&&(db[key]||[]).find(r=>eq(r.id,id));if(!record)return;
  const title=record.name||record.title||[record.project,record.date].filter(Boolean).join(' — ');
  const notice=kind==='person'||kind==='project'?'پرداخت‌ها، قراردادها، گزارش‌ها و تصاویر قبلی با نام فعلی باقی می‌مانند.':kind==='contract'?'پرداخت‌ها و فایل‌های پیوست باقی می‌مانند؛ مبلغ این قرارداد از جمع قراردادها حذف می‌شود.':'فقط همین گزارش حذف می‌شود.';
  if(!confirm(`${labels[kind]} «${title}» حذف شود؟\n${notice}`))return;
  const before=db,draft=JSON.parse(JSON.stringify(db));
  draft[key]=draft[key].filter(r=>!eq(r.id,id));
  const refs=kind==='person'?['personId','contractorId']:kind==='project'?['projectId']:kind==='contract'?['contractId']:['dailyId'];
  for(const rows of Object.values(draft).filter(Array.isArray))for(const row of rows){
   if(kind==='person'&&eq(row.personId??row.contractorId,id)&&!row.party)row.party=record.name;
   for(const ref of refs)if(eq(row[ref],id))row[ref]=null;
  }
  draft.completionTasks=(draft.completionTasks||[]).filter(t=>!(eq(t.entityId,id)&&(t.entityType===kind||String(t.type||'').startsWith(kind+'.'))));
  try{db=draft;save()}catch{db=before;toast('حذف ذخیره نشد؛ دوباره تلاش کن');return}
  document.getElementById('entityNameEditor')?.remove();
  if(kind==='project'&&page==='projectDetail'&&eq(selectedProjectId,id)){selectedProjectId=0;go('projects')}
  else if(kind==='person'&&page==='personDetail'&&eq(selectedPersonId,id)){selectedPersonId=0;go('people')}
  else render();
  toast(`${labels[kind]} حذف شد`);
 };
 function action(kind,id,hidden=false){const b=document.createElement('button');b.type='button';b.className=hidden?'entity-delete-reveal':'entity-delete-visible';b.textContent='حذف';b.setAttribute('aria-label',`حذف ${labels[kind]}`);if(hidden){b.tabIndex=-1;b.setAttribute('aria-hidden','true')}b.addEventListener('click',e=>{e.stopPropagation();removeEntity(kind,id)});return b}
 function wrap(el,kind,id){
  if(!el||el.closest('.entity-swipe'))return;
  const row=document.createElement('div'),content=document.createElement('div');row.className='entity-swipe';content.className='entity-swipe-content';
  el.replaceWith(row);row.append(action(kind,id,true),content);content.append(el);
  const bar=document.createElement('div');bar.className='entity-delete-bar';bar.append(action(kind,id));content.append(bar);
  let start=null,blockUntil=0;
  row.addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('input,textarea,select'))return;const t=e.touches[0];start={x:t.clientX,y:t.clientY}}, {passive:true});
  row.addEventListener('touchcancel',()=>{start=null},{passive:true});
  row.addEventListener('touchend',e=>{
   if(!start)return;const t=e.changedTouches[0];if(!t){start=null;return}const dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;
   if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.5)return;
   blockUntil=Date.now()+450;
   const open=!row.classList.contains('entity-swipe-open');
   document.querySelectorAll('.entity-swipe-open').forEach(other=>{other.classList.remove('entity-swipe-open');const b=other.querySelector('.entity-delete-reveal');b.tabIndex=-1;b.setAttribute('aria-hidden','true')});
   row.classList.toggle('entity-swipe-open',open);row.classList.toggle('entity-swipe-right',dx>0);row.style.setProperty('--delete-shift',dx>0?'88px':'-88px');
   const b=row.querySelector('.entity-delete-reveal');b.tabIndex=open?0:-1;b.setAttribute('aria-hidden',String(!open));
  },{passive:true});
  row.addEventListener('click',e=>{if(Date.now()<blockUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 }
 function decorate(){
  const root=document.getElementById('app');if(!root)return;
  root.querySelectorAll('button[onclick]').forEach(el=>{const m=el.getAttribute('onclick').match(/^open(Project|Person)\((\d+)\)$/);if(m&&(el.classList.contains('project-card-button')||el.classList.contains('entity-row')))wrap(el,m[1]==='Project'?'project':'person',m[2])});
  if(page==='contracts')root.querySelectorAll('.phone-list > .phone-row').forEach((el,i)=>{if(db.contracts[i])wrap(el,'contract',db.contracts[i].id)});
  if(page==='daily')root.querySelectorAll('.project-list > .card').forEach((el,i)=>{if(db.daily[i])wrap(el,'daily',db.daily[i].id)});
  const kind=page==='projectDetail'?'project':page==='personDetail'?'person':null;
  if(kind){const hero=root.querySelector('.ledger-context,.project-hero');if(hero&&!hero.querySelector('.entity-delete-visible'))hero.append(action(kind,kind==='project'?selectedProjectId:selectedPersonId))}
 }
 const baseRender=render;render=function(){const result=baseRender();decorate();return result};
 const css=document.createElement('style');css.textContent=`
 .entity-swipe{position:relative;min-width:0;overflow:hidden;border-radius:16px;background:#b42318;isolation:isolate;touch-action:pan-y}
 .entity-swipe-content{position:relative;z-index:1;background:var(--paper,#fff);border-radius:16px;transition:transform .18s ease;min-height:100%;height:100%}
 .entity-swipe-content>.card,.entity-swipe-content>.entity-row,.entity-swipe-content>.phone-row{width:100%;margin:0;box-sizing:border-box}
 .entity-swipe-open .entity-swipe-content{transform:translateX(var(--delete-shift,-88px))}
 .entity-delete-reveal{position:absolute;right:0;top:0;bottom:0;width:88px;border:0;background:#b42318;color:#fff;font:inherit;font-weight:700;visibility:hidden}
 .entity-swipe-open>.entity-delete-reveal{visibility:visible}.entity-swipe-right>.entity-delete-reveal{right:auto;left:0}
 .entity-delete-bar{display:flex;justify-content:flex-end;padding:6px 12px 10px;background:var(--paper,#fff);border-radius:0 0 16px 16px}
 .entity-delete-visible{border:1px solid #efbbb6;background:#fff0ee;color:#a01c13;border-radius:10px;padding:8px 16px;min-height:40px;font:inherit;cursor:pointer}
 .entity-delete-visible:focus-visible,.entity-delete-reveal:focus-visible{outline:3px solid #dda84f;outline-offset:-3px}
 @media(prefers-reduced-motion:reduce){.entity-swipe-content{transition:none}}
 `;document.head.append(css);render();
})();
