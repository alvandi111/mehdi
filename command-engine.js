(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PeymanyarCommand=api})(typeof self!=='undefined'?self:this,function(){
 const faDigits='۰۱۲۳۴۵۶۷۸۹',arDigits='٠١٢٣٤٥٦٧٨٩';
 const clean=s=>String(s||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[‌]/g,' ').replace(/[؛،]/g,' ').replace(/\s+/g,' ').trim();
 const digits=s=>clean(s).replace(/[۰-۹]/g,d=>faDigits.indexOf(d)).replace(/[٠-٩]/g,d=>arDigits.indexOf(d)).replace(/[٬,]/g,'');
 const wordValues={صفر:0,یک:1,یه:1,دو:2,سه:3,چهار:4,پنج:5,شش:6,شیش:6,هفت:7,هشت:8,نه:9,ده:10,یازده:11,دوازده:12,سیزده:13,چهارده:14,پانزده:15,شانزده:16,هفده:17,هجده:18,نوزده:19,بیست:20,سی:30,چهل:40,پنجاه:50,شصت:60,هفتاد:70,هشتاد:80,نود:90,صد:100,یکصد:100,دویست:200,سیصد:300,چهارصد:400,پانصد:500,ششصد:600,هفتصد:700,هشتصد:800,نهصد:900};
 const scales={هزار:1e3,میلیون:1e6,میلیارد:1e9};
 const numericWord=w=>w==='و'||Object.hasOwn(wordValues,w)||Object.hasOwn(scales,w)||/^\d+(?:\.\d+)?$/.test(w);
 function wordsNumber(words){let total=0,current=0,used=false;for(const word of words){if(word==='و')continue;if(/^\d+(?:\.\d+)?$/.test(word)){current+=Number(word);used=true;continue}if(Object.hasOwn(wordValues,word)){current+=wordValues[word];used=true;continue}if(Object.hasOwn(scales,word)){current=(current||1)*scales[word];total+=current;current=0;used=true;continue}return null}return used?total+current:null}
 function amountOf(text){const s=digits(text);let m=s.match(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار)?\s*(?:تومان|تومن|ریال)/);if(!m)m=s.match(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار)(?=\s|$)/);if(m){let n=Number(m[1]);if(m[2]==='هزار')n*=1e3;if(m[2]==='میلیون')n*=1e6;if(m[2]==='میلیارد')n*=1e9;if(/ریال/.test(m[0]))n/=10;return Math.round(n)}
  const tokens=s.split(' ');let end=tokens.findIndex(w=>/^(?:تومان|تومن|ریال)$/.test(w));if(end<0){for(let i=tokens.length-1;i>=0;i--)if(Object.hasOwn(scales,tokens[i])){end=i+1;break}}if(end<0)return 0;let start=end-1;while(start>=0&&numericWord(tokens[start]))start--;const value=wordsNumber(tokens.slice(start+1,end));if(value===null)return 0;return Math.round(/ریال/.test(tokens[end]||'')?value/10:value)}
 function dateOf(text,fallback){const s=digits(text);const m=s.match(/(?:1[34]\d{2}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]1[34]\d{2})/);if(!m)return fallback;const p=m[0].split(/[\/-]/);return p[0].length===4?`${p[0]}/${p[1].padStart(2,'0')}/${p[2].padStart(2,'0')}`:`${p[2]}/${p[1].padStart(2,'0')}/${p[0].padStart(2,'0')}`}
 const between=(s,re,stops)=>{const m=s.match(re);if(!m)return'';return clean(m[1].split(new RegExp(`\\s+(?:${stops.join('|')})\\s*`))[0]).replace(/^(?:به نام|بنام|اسم)\s+/,'').replace(/^(?:بساز|ایجاد(?: کن| شود)?|تعریف کن|ثبت کن)$/,'')};
 function entity(text,list){const source=clean(text),direct=list.find(x=>source.includes(clean(x.name)));if(direct)return direct;const sourceWords=new Set(source.split(' ').filter(w=>w.length>2));const scored=list.map(item=>({item,hits:clean(item.name).split(' ').filter(w=>sourceWords.has(w)).length})).filter(x=>x.hits);if(!scored.length)return null;scored.sort((a,b)=>b.hits-a.hits);return scored.length===1||scored[0].hits>scored[1].hits?scored[0].item:null}
 function parse(input,db,today){const text=clean(input),normalized=digits(text);const projects=db.projects||[],people=db.people||[];const project=entity(text,projects),person=entity(text,people);const date=dateOf(text,today);
  if(/(?:^|\s)(?:یک\s+)?پروژه(?:\s+جدید)?(?:\s+به نام)?[^.]{0,100}(?:بساز|ایجاد|تعریف)/.test(text)){
   const name=between(text,/(?:به نام|بنام|اسم)\s+(.+)/,['کارفرما','با کارفرما','در','واقع در','بودجه','مبلغ','شروع','بساز','ایجاد','تعریف','ثبت'])||between(text,/پروژه(?: جدید)?\s+(.+)/,['بساز','ایجاد کن','ایجاد شود','تعریف کن','ثبت کن','کارفرما','در','بودجه']);
   const client=between(text,/(?:کارفرما(?:ی آن)?|با کارفرما)\s+(.+)/,['در','واقع در','بودجه','مبلغ','شروع','بساز','ایجاد','تعریف','ثبت']);
   const location=between(text,/(?:واقع در|موقعیت|آدرس)\s+(.+)/,['بودجه','مبلغ','شروع','بساز','ایجاد','تعریف','ثبت']);
   const progress=Number((normalized.match(/(\d+)\s*(?:درصد|٪)\s*(?:پیشرفت)?/)||[])[1]||0),duplicate=name&&projects.some(p=>clean(p.name)===clean(name));
   return {intent:'project_create',label:'ساخت پروژه جدید',name,client,location,budget:amountOf(text),progress,date,missing:[!name&&'نام پروژه',duplicate&&'این پروژه قبلاً ثبت شده است'].filter(Boolean)};
  }
  if(/(?:پیمانکار|استادکار|کارگر|نیرو|فرد).*(?:جدید|اضافه|تعریف|ثبت|بساز|ایجاد)/.test(text)){
   const roles=['جوشکار','بنا','برقکار','لوله کش','لوله‌کش','نگهبان','کارگر','کابینت کار','کابینت‌کار','نقاش','گچ کار','گچ‌کار','سرامیک کار','سرامیک‌کار','تاسیسات کار','تأسیسات کار','تأسیسات‌کار'];
   const role=roles.find(r=>text.includes(r))||'';
   let name=between(text,/(?:به نام|بنام|اسم)\s+(.+)/,[...roles,'برای پروژه','در پروژه','شماره','موبایل','اضافه','تعریف','ثبت','بساز','ایجاد']);
   if(!name)name=between(text,/(?:پیمانکار|استادکار|کارگر|نیرو|فرد)(?: جدید)?\s+(.+)/,[...roles,'برای پروژه','در پروژه','شماره','موبایل','اضافه','تعریف','ثبت','بساز','ایجاد']);
   const phone=(normalized.match(/09\d{9}/)||[])[0]||'',duplicate=name&&people.some(p=>clean(p.name)===clean(name));
   return {intent:'person_create',label:'تعریف پیمانکار یا نیرو',name,role,project:project?.name||'',phone,missing:[!name&&'نام شخص',!role&&'تخصص',duplicate&&'این شخص قبلاً ثبت شده است'].filter(Boolean)};
  }
  if(/(?:گزارش روزانه|گزارش کارگاه|امروز).*(?:ثبت|بنویس|کار|انجام|شد)/.test(text)){
   const workers=Number((normalized.match(/(\d+)\s*(?:نفر|کارگر|نیرو)/)||[])[1]||0),weather=(text.match(/(?:هوا|وضعیت هوا)\s+(آفتابی|بارانی|برفی|ابری|گرم|سرد)/)||[])[1]||'';
   return {intent:'daily_create',label:'ثبت گزارش روزانه',project:project?.name||'',date,workers,weather,text,missing:[!project&&'نام پروژه'].filter(Boolean)};
  }
  if(/(?:چقدر|جمع|مجموع|مانده|گزارش مالی)/.test(text))return {intent:'financial_query',label:'گزارش مالی',person:person?.name||'',project:project?.name||'',missing:[]};
  if(/(?:پرداخت|واریز|هزینه|خرید|دریافت|گرفتم|دادم|خریدم|تنخواه)/.test(text)){
   const kind=/(?:دریافت|گرفتم|واریز شد|از کارفرما گرفتم)/.test(text)?'income':'expense';
   const contractorPayment=kind==='expense'&&(/(?:پرداخت|دادم|واریز)/.test(text)||!!person);
   const category=/(?:مصالح|خرید|فاکتور|خریدم)/.test(text)?'خرید مصالح':/تنخواه/.test(text)?'تنخواه':/حقوق|دستمزد/.test(text)?'حقوق و دستمزد':kind==='income'?'دریافت از کارفرما':contractorPayment?'پرداخت پیمانکار':'هزینه عمومی';
   const amount=amountOf(text),candidate=between(text,/(?:به|از)\s+(.+)/,['برای پروژه','در پروژه','پروژه','مبلغ','به مبلغ','پرداخت','واریز','دادم','گرفتم','تومان','تومن','ریال'])||'';
   return {intent:'transaction_create',label:kind==='income'?'ثبت دریافت':'ثبت پرداخت یا هزینه',project:project?.name||'',party:person?.name||candidate||(category==='هزینه عمومی'?'هزینه پروژه':''),amount,date,kind,category,note:text,missing:[!project&&'نام پروژه',!amount&&'مبلغ',contractorPayment&&!person&&'نام پیمانکار ثبت‌شده'].filter(Boolean)};
  }
  return {intent:'unknown',label:'فرمان نامشخص',missing:['نوع عملیات']};
 }
 return {parse,amountOf,dateOf,clean};
});
