/* PDF rendering stays in the browser. The pinned renderer receives no uploaded report. */
(function(){
'use strict';
window.PeymanyarPdfExport=async function(source,landscape=false){
 const parsed=new DOMParser().parseFromString(source.documentElement.outerHTML,'text/html');
 parsed.querySelectorAll('script,iframe,object,embed,button,.print-help,base').forEach(n=>n.remove());
 parsed.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(/^on/i.test(a.name)||(/^(href|src)$/i.test(a.name)&&/^\s*javascript:/i.test(a.value)))n.removeAttribute(a.name)});
 const style=parsed.createElement('style');style.textContent='html{width:100%;overflow:visible!important;background:white;-webkit-text-size-adjust:100%}body{box-sizing:border-box;width:100%!important;max-width:none!important;margin:0!important;padding:16px!important;background:white;color:#17362f}table{max-width:100%;table-layout:auto}td,th{overflow-wrap:anywhere}tr,img{break-inside:avoid}';
 parsed.head.append(style);
 const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-same-origin allow-scripts');frame.style.cssText='position:fixed;left:-100000px;top:0;width:'+(landscape?1123:794)+'px;height:900px;border:0;pointer-events:none';
 document.body.append(frame);
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('آماده‌سازی PDF طول کشید؛ از چاپ سیستم استفاده کن.')),45000)});
 const work=async()=>{
 const w=frame.contentWindow,d=w.document;
 d.open();d.write('<!doctype html>'+parsed.documentElement.outerHTML);d.close();
 await new Promise((resolve,reject)=>{const script=d.createElement('script');script.src='https://cdn.jsdelivr.net/gh/eKoopmans/html2pdf.js@f6c5e835f420af58bc09262cf2ab310fb0190a79/dist/html2pdf.bundle.min.js';script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';script.onload=resolve;script.onerror=()=>reject(Error('ابزار PDF دریافت نشد؛ اتصال اینترنت را بررسی کن یا چاپ را بزن.'));d.head.append(script)});
 await d.fonts?.ready;
 await Promise.all([...d.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve;setTimeout(resolve,5000)})));
 const width=d.body.scrollWidth,height=d.body.scrollHeight;
 const scale=Math.min(1.5,Math.sqrt(10000000/Math.max(1,width*height)),14000/Math.max(1,height));
 if(scale<0.6)throw Error('این گزارش طولانی است؛ برای حفظ همهٔ سطرها از دکمهٔ چاپ استفاده کن.');
 const blob=await w.html2pdf().set({margin:8,image:{type:'jpeg',quality:0.96},pagebreak:{mode:['css','legacy'],avoid:['tr']},html2canvas:{scale,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:landscape?1123:794,scrollX:0,scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:landscape?'landscape':'portrait'}}).from(d.body).outputPdf('blob');
 if(!blob?.size)throw Error('فایل PDF ساخته نشد؛ از چاپ سیستم استفاده کن.');
 return blob;
 };
 try{return await Promise.race([work(),deadline])}finally{clearTimeout(timer);frame.remove()}
};
})();