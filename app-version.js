(function(){
 'use strict';
 const version=document.querySelector('meta[name="app-revision"]')?.content||'';
 const base=layout;layout=function(...args){return base(...args).replace('<small>پیمان‌یار</small>',`<small>پیمان‌یار <span class="app-revision" aria-label="ویرایش برنامه">ویرایش ${fa(version)}</span> <button type="button" onclick="refreshPeymanyarApp()" aria-label="به‌روزرسانی برنامه">↻</button></small>`).replace('</h1>',`</h1><small class="app-revision" aria-label="ویرایش برنامه">ویرایش ${fa(version)}</small>`).replace('نسخه آزمایشی حرفه‌ای ۱.۰',`پیمان‌یار — ویرایش ${fa(version)}`)};
 render();
})();

