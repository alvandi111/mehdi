(function(){
 'use strict';
 let zoom=100,current=null,observer=null;
 let picker=null,pickerInput=null;
 function visibleArea(){const v=window.visualViewport;return {top:v?.offsetTop||0,left:v?.offsetLeft||0,height:v?.height||window.innerHeight,width:v?.width||window.innerWidth}}
 function resizeWorkspace(){
  const modal=document.getElementById('bulkCashModal');if(!modal)return;
  const area=visibleArea(),focused=modal.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
  modal.style.setProperty('--bulk-visible-height',area.height+'px');modal.style.setProperty('--bulk-visible-top',area.top+'px');
  modal.classList.toggle('bulk-keyboard-open',focused&&window.innerHeight-area.height>120);
 }
 function positionPicker(){
  if(!picker?.isConnected)return;
  if(!pickerInput?.isConnected){picker.remove();picker=null;return}
  const area=visibleArea(),r=pickerInput.getBoundingClientRect(),edge=8;
  if(r.bottom<area.top||r.top>area.top+area.height){picker.remove();picker=null;return}
  const width=Math.min(Math.max(r.width,240),area.width-2*edge),left=Math.max(area.left+edge,Math.min(r.right-width,area.left+area.width-width-edge));
  const below=area.top+area.height-r.bottom-edge,above=r.top-area.top-edge;
  const down=below>=150||below>=above,room=Math.max(44,down?below:above),height=Math.min(240,room);
  picker.style.width=width+'px';picker.style.left=left+'px';picker.style.maxHeight=height+'px';
  picker.style.top=(down?r.bottom+4:Math.max(area.top+edge,r.top-Math.min(picker.scrollHeight||height,height)-4))+'px';
 }
 function revealRow(index,key='date'){
  if(!current?.viewport.isConnected)return;
  resizeWorkspace();
  const {viewport,table,shell}=current,rows=table.querySelectorAll('tbody tr'),row=rows[index];if(!row)return;
  syncTail();
  const previous=rows[Math.max(0,index-1)],head=table.querySelector('thead'),vr=viewport.getBoundingClientRect();
  viewport.scrollTop=Math.max(0,viewport.scrollTop+previous.getBoundingClientRect().top-vr.top-(head?.getBoundingClientRect().height||0));
  const input=row.querySelector(`[aria-label="${key} ردیف ${index+1}"]`),r=input?.getBoundingClientRect(),sticky=row.cells[1]?.getBoundingClientRect();
  if(r&&vr.width){const right=Math.min(vr.right,sticky?.left||vr.right)-10;if(r.left<vr.left+10)viewport.scrollLeft-=vr.left+10-r.left;else if(r.right>right)viewport.scrollLeft+=r.right-right}
  // Raise the workspace itself, keeping the current and previous row in view.
  const modal=shell.closest('#bulkCashModal'),dialog=shell.closest('.bulk-cash-dialog');
  if(modal&&!modal.matches('.bulk-manual-mode,.bulk-grid-expanded')&&dialog){const sr=shell.getBoundingClientRect(),dr=dialog.getBoundingClientRect();dialog.scrollTop+=Math.max(0,sr.top-dr.top-70)}
  positionPicker();sync();
 }
 try{zoom=Math.max(60,Math.min(140,Number(localStorage.getItem('peymanyar.gridZoom'))||100))}catch{}
 function syncTail(){
  if(!current?.viewport.isConnected)return;
  const {viewport,table,tail}=current,rows=table.querySelectorAll('tbody tr');
  const head=table.querySelector('thead')?.getBoundingClientRect().height||0;
  const last=rows[rows.length-1]?.getBoundingClientRect().height||0,previous=rows[rows.length-2]?.getBoundingClientRect().height||0;
  // Browsers clamp scrollTop at the end. Reserve blank space so the last
  // real row can sit second, directly beneath its previous row.
  const height=Math.max(0,viewport.clientHeight-head-last-previous);
  if(tail.style.height!==height+'px')tail.style.height=height+'px';
 }
 function sync(){
  if(!current?.viewport.isConnected)return;
  syncTail();
  const {viewport,pan}=current,max=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
  pan.max=String(max);pan.value=String(Math.max(0,viewport.scrollLeft));pan.disabled=max<2;
  pan.setAttribute('aria-valuetext',max<2?'تمام ستون‌ها دیده می‌شوند':`موقعیت افقی ${Math.round(Number(pan.value)/max*100)} درصد`);
 }
 function setZoom(value){
  zoom=Math.max(60,Math.min(140,Number(value)||100));
  if(!current)return;
  const {table,viewport,shell}=current,ratio=viewport.scrollWidth>viewport.clientWidth?viewport.scrollLeft/(viewport.scrollWidth-viewport.clientWidth):1;
  table.style.zoom=String(zoom/100);
  shell.querySelector('.bulk-zoom-value').textContent=`${zoom.toLocaleString('fa-IR')}٪`;
  shell.querySelector('.bulk-zoom-range').value=String(zoom);
  viewport.scrollLeft=ratio*Math.max(0,viewport.scrollWidth-viewport.clientWidth);sync();
  try{localStorage.setItem('peymanyar.gridZoom',String(zoom))}catch{}
 }
 window.PeymanyarBulkGrid={
  revealRow,
  placePicker(panel,input){picker=panel;pickerInput=input;panel.classList.add('bulk-floating-picker');(input.closest('#bulkCashModal')||document.body).append(panel);positionPicker()},
  capture(box){const viewport=box.querySelector('.bulk-grid-viewport');return viewport?{left:viewport.scrollLeft,top:viewport.scrollTop}:null},
  mount(box,position){
   observer?.disconnect();
   const viewport=box.querySelector('.ledger-scroll'),table=viewport?.querySelector('.bulk-edit-table');if(!table)return;
   const shell=document.createElement('section');shell.className='bulk-grid-shell';shell.setAttribute('aria-label','جدول ورود تنخواه');
   viewport.before(shell);
   shell.innerHTML=`<div class="bulk-grid-toolbar"><strong>جدول تنخواه</strong><div class="bulk-zoom-controls" role="group" aria-label="بزرگ‌نمایی جدول"><button type="button" data-zoom="minus" aria-label="کوچک‌تر کردن جدول">−</button><input class="bulk-zoom-range" type="range" min="60" max="140" step="5" aria-label="درصد بزرگ‌نمایی جدول"><output class="bulk-zoom-value"></output><button type="button" data-zoom="plus" aria-label="بزرگ‌تر کردن جدول">＋</button><button type="button" data-zoom="reset">۱۰۰٪</button></div><button type="button" class="bulk-grid-expand" aria-pressed="false">⛶ نمای بزرگ</button></div>`;
   viewport.classList.add('bulk-grid-viewport');viewport.dir='ltr';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','جدول قابل پیمایش در هر دو جهت');table.dir='rtl';shell.append(viewport);
   shell.insertAdjacentHTML('beforeend',`<div class="bulk-grid-pan"><span>جابجایی ستون‌ها</span><button type="button" data-pan="left" aria-label="حرکت جدول به چپ">←</button><input type="range" min="0" max="0" step="1" value="0" dir="ltr" aria-label="جابجایی افقی جدول"><button type="button" data-pan="right" aria-label="حرکت جدول به راست">→</button></div>`);
   const tail=document.createElement('div');tail.className='bulk-grid-tail';tail.setAttribute('aria-hidden','true');tail.style.cssText='width:1px;pointer-events:none';viewport.append(tail);
   current={shell,viewport,table,tail,pan:shell.querySelector('.bulk-grid-pan input')};
   const expand=shell.querySelector('.bulk-grid-expand'),modal=box.closest('#bulkCashModal');
   function expandLabel(){const expanded=modal.classList.contains('bulk-grid-expanded');expand.textContent=expanded?'⛶ بازگشت به فرم':'⛶ نمای بزرگ';expand.setAttribute('aria-pressed',String(expanded))}
   expand.onclick=()=>{modal.classList.toggle('bulk-grid-expanded');expandLabel();sync()};expandLabel();
   shell.querySelector('[data-zoom="minus"]').onclick=()=>setZoom(zoom-10);
   shell.querySelector('[data-zoom="plus"]').onclick=()=>setZoom(zoom+10);
   shell.querySelector('[data-zoom="reset"]').onclick=()=>setZoom(100);
   shell.querySelector('.bulk-zoom-range').oninput=e=>setZoom(e.target.value);
   current.pan.oninput=e=>{viewport.scrollLeft=Number(e.target.value);sync()};
   shell.querySelector('[data-pan="left"]').onclick=()=>{viewport.scrollLeft-=Math.max(100,viewport.clientWidth*.65);sync()};
   shell.querySelector('[data-pan="right"]').onclick=()=>{viewport.scrollLeft+=Math.max(100,viewport.clientWidth*.65);sync()};
   viewport.addEventListener('scroll',sync,{passive:true});
   viewport.addEventListener('focusin',e=>{table.querySelectorAll('.bulk-active-row').forEach(r=>r.classList.remove('bulk-active-row'));const row=e.target.closest('tbody tr');row?.classList.add('bulk-active-row');if(row){const index=[...table.querySelectorAll('tbody tr')].indexOf(row),key=(e.target.getAttribute('aria-label')||'date').split(' ')[0];revealRow(index,key)}});
   viewport.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('bulk-grid-expanded')){modal.classList.remove('bulk-grid-expanded');expandLabel();sync()}});
   setZoom(zoom);viewport.scrollTop=position?.top||0;viewport.scrollLeft=position?position.left:Math.max(0,viewport.scrollWidth-viewport.clientWidth);sync();
   resizeWorkspace();if(typeof ResizeObserver==='function'){observer=new ResizeObserver(()=>{sync();positionPicker()});observer.observe(viewport);observer.observe(table)}
  }
 };
 function resized(){resizeWorkspace();sync();const input=document.activeElement;if(input?.closest('.bulk-edit-table')){const label=input.getAttribute('aria-label')||'',match=label.match(/^(\w+) ردیف (\d+)$/);if(match)revealRow(Number(match[2])-1,match[1])}positionPicker()}
 window.addEventListener('resize',resized,{passive:true});
 window.visualViewport?.addEventListener('resize',resized,{passive:true});window.visualViewport?.addEventListener('scroll',resized,{passive:true});
 document.addEventListener('scroll',positionPicker,{capture:true,passive:true});
})();

