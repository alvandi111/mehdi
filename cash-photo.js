(function(){
 'use strict';
 let busy=false,previewUrl='';
 const base=openCashMode;
 window.openCashMode=function(mode,project=''){
  base(mode==='photo'?'manual':mode,project);if(mode!=='photo')return;
  const modal=document.getElementById('bulkCashModal');modal.querySelector('.dialog-head h2').textContent='ورود تنخواه از عکس';
  const controls=modal.querySelector('.bulk-entry-controls');controls.insertAdjacentHTML('beforebegin',`<section class="card"><p>عکس برگه را انتخاب کن؛ نتیجه به جدول قابل‌ویرایش می‌آید. خانه‌های خالی مانع ذخیره نیستند.</p><div class="form-grid"><label class="field">واحد مبلغ روی برگه<select id="cashPhotoUnit"><option value="rial">ریال</option><option value="toman">تومان</option></select></label><label class="field">سال برگه (اختیاری)<input id="cashPhotoYear" inputmode="numeric" placeholder="مثلاً ۱۴۰۵"></label><label class="field full">عکس برگه<input id="cashPhotoFile" type="file" accept="image/*"></label></div><img id="cashPhotoPreview" alt="عکس برگه تنخواه" hidden style="max-width:100%;max-height:260px;object-fit:contain"><p id="cashPhotoStatus" role="status" aria-live="polite"></p><button class="btn primary" id="cashPhotoRead" type="button">خواندن عکس و ساخت جدول</button><p>جدول مبالغ را به تومان نشان می‌دهد؛ مبلغ ریالی هنگام انتقال بر ۱۰ تقسیم می‌شود.</p></section>`);
  modal.querySelector('#cashPhotoFile').onchange=function(){if(previewUrl)URL.revokeObjectURL(previewUrl);const file=this.files?.[0],img=modal.querySelector('#cashPhotoPreview');if(file){previewUrl=URL.createObjectURL(file);img.src=previewUrl;img.hidden=false}};
  modal.querySelector('#cashPhotoRead').onclick=()=>read(modal);
 };
 async function read(modal){
  if(busy)return;const file=modal.querySelector('#cashPhotoFile').files?.[0],status=modal.querySelector('#cashPhotoStatus'),button=modal.querySelector('#cashPhotoRead');if(!file){status.textContent='ابتدا عکس برگه را انتخاب کن.';return}
  const year=normalizeDigits(modal.querySelector('#cashPhotoYear').value).trim();if(year&&!/^1[34]\d{2}$/.test(year)){status.textContent='سال را چهاررقمی وارد کن.';return}
  busy=true;button.disabled=true;status.textContent='در حال خواندن سطرهای عکس…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{
   const form=new FormData();form.append('file',await window.prepareCashPhoto(file),file.name||'cash.jpg');form.append('unit',modal.querySelector('#cashPhotoUnit').value);form.append('year',year);form.append('project',v('bulkDefaultProject'));
   const response=await fetch(aiEndpoint()+'/cash-table',{method:'POST',body:form,signal:controller.signal});const result=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(response.status===404?'سرویس جدول هنوز به‌روزرسانی نشده است.':response.status===429?'سهمیهٔ خواندن عکس محدود شده؛ بعداً دوباره تلاش کن.':'خواندن عکس انجام نشد؛ کد '+response.status);
   if(!result||!Array.isArray(result.rows)||!result.rows.length)throw new Error('سطر قابل‌خواندنی پیدا نشد. می‌توانی جدول را دستی پر و ذخیره کنی.');
   if(!modal.isConnected)return;const count=bulkImportPhotoRows(result.rows);status.textContent=count+' سطر به جدول اضافه شد؛ اسم‌ها، تاریخ‌ها و مبلغ‌ها را بررسی کن. سطر ناقص هم قابل ذخیره و ویرایش بعدی است.';
  }catch(error){if(modal.isConnected)status.textContent=(error.name==='AbortError'?'خواندن عکس به موقع پاسخ نداد.':error.message)+' اطلاعات جدول حفظ شده؛ می‌توانی دستی تکمیل و ذخیره کنی.'}
  finally{clearTimeout(timer);busy=false;if(modal.isConnected)button.disabled=false}
 }
})();
