(function(){
 'use strict';
 const current=document.querySelector('meta[name="app-revision"]')?.content;
 let checking=false,pending='',lastCheck=0;
 const busy=()=>!!document.querySelector('.modal, [role="dialog"], input:not([type="hidden"]), textarea, select, [contenteditable="true"]');
 function reload(revision){const url=new URL(location.href);url.searchParams.set('v',revision||current);url.searchParams.set('refresh',String(Date.now()));location.replace(url.href)}
 window.refreshPeymanyarApp=function(){if(busy()&&!confirm('صفحه دوباره باز می‌شود. ابتدا اطلاعات فرم را ثبت کن؛ ادامه می‌دهی؟'))return;reload(pending||current)};
 async function check(){
  if(checking||document.hidden||Date.now()-lastCheck<10000)return;
  checking=true;lastCheck=Date.now();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{const url=new URL('index.html',location.href);url.searchParams.set('check',String(Date.now()));const response=await fetch(url.href,{cache:'no-store',signal:controller.signal});if(!response.ok)return;
   const html=new DOMParser().parseFromString(await response.text(),'text/html'),revision=html.querySelector('meta[name="app-revision"]')?.content;
   if(!/^\d+$/.test(revision||'')||Number(revision)<=Number(current))return;
   pending=revision;
   if(document.hidden)return;
   if(busy())toast('نسخهٔ جدید آماده است؛ پس از ثبت فرم، دکمهٔ ↻ کنار ویرایش را بزن.');else reload(revision);
  }catch(error){/* Offline use keeps the current page and all stored data. */}
  finally{clearTimeout(timer);checking=false}
 }
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 check();
})();
