(function(){
 'use strict';
 let zoom=100,current=null,observer=null;
 try{zoom=Math.max(60,Math.min(140,Number(localStorage.getItem('peymanyar.gridZoom'))||100))}catch{}
 function sync(){
  if(!current?.viewport.isConnected)return;
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
  capture(box){const viewport=box.querySelector('.bulk-grid-viewport');return viewport?{left:viewport.scrollLeft,top:viewport.scrollTop}:null},
  mount(box,position){
   observer?.disconnect();
   const viewport=box.querySelector('.ledger-scroll'),table=viewport?.querySelector('.bulk-edit-table');if(!table)return;
   const shell=document.createElement('section');shell.className='bulk-grid-shell';shell.setAttribute('aria-label','جدول ورود تنخواه');
   viewport.before(shell);
   shell.innerHTML=`<div class="bulk-grid-toolbar"><strong>جدول تنخواه</strong><div class="bulk-zoom-controls" role="group" aria-label="بزرگ‌نمایی جدول"><button type="button" data-zoom="minus" aria-label="کوچک‌تر کردن جدول">−</button><input class="bulk-zoom-range" type="range" min="60" max="140" step="5" aria-label="درصد بزرگ‌نمایی جدول"><output class="bulk-zoom-value"></output><button type="button" data-zoom="plus" aria-label="بزرگ‌تر کردن جدول">＋</button><button type="button" data-zoom="reset">۱۰۰٪</button></div><button type="button" class="bulk-grid-expand" aria-pressed="false">⛶ نمای بزرگ</button></div>`;
   viewport.classList.add('bulk-grid-viewport');viewport.dir='ltr';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','جدول قابل پیمایش در هر دو جهت');table.dir='rtl';shell.append(viewport);
   shell.insertAdjacentHTML('beforeend',`<div class="bulk-grid-pan"><span>جابجایی ستون‌ها</span><button type="button" data-pan="left" aria-label="حرکت جدول به چپ">←</button><input type="range" min="0" max="0" step="1" value="0" dir="ltr" aria-label="جابجایی افقی جدول"><button type="button" data-pan="right" aria-label="حرکت جدول به راست">→</button></div>`);
   current={shell,viewport,table,pan:shell.querySelector('.bulk-grid-pan input')};
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
   viewport.addEventListener('focusin',e=>{table.querySelectorAll('.bulk-active-row').forEach(r=>r.classList.remove('bulk-active-row'));e.target.closest('tbody tr')?.classList.add('bulk-active-row')});
   viewport.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('bulk-grid-expanded')){modal.classList.remove('bulk-grid-expanded');expandLabel();sync()}});
   setZoom(zoom);viewport.scrollTop=position?.top||0;viewport.scrollLeft=position?position.left:Math.max(0,viewport.scrollWidth-viewport.clientWidth);sync();
   if(typeof ResizeObserver==='function'){observer=new ResizeObserver(sync);observer.observe(viewport);observer.observe(table)}
  }
 };
 window.addEventListener('resize',sync,{passive:true});
})();
