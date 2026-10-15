/* Pure parser for dictated petty-cash rows; never changes the database. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PeymanyarBulkVoice=api})(typeof self!=='undefined'?self:this,function(){
'use strict';
const numbers='صفر یک یه دو سه چهار پنج شش شیش هفت هشت نه ده یازده دوازده سیزده چهارده پانزده شانزده هفده هجده نوزده بیست سی چهل پنجاه شصت هفتاد هشتاد نود صد یکصد دویست سیصد چهارصد پانصد پونصد ششصد هفتصد هشتصد نهصد هزار میلیون میلیارد و'.split(' ');
const norm=s=>String(s||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/آ/g,'ا').replace(/[‌]/g,' ').replace(/^(?:اقای|خانم|جناب)\s+/,'').replace(/علی\s+رضا/g,'علیرضا').replace(/\s+/g,' ').trim();
const digits=s=>String(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,]/g,'');
function numeric(word){return numbers.includes(word)||/^\d+(?:[.٫]\d+)?$/.test(digits(word))}
function money(text,command){
 const currency=/تومان(?:ی|ه|ها)?|تومن(?:ی|ه|ها)?|ریال(?:ی)?/g,match=currency.exec(text);
 if(match){const before=text.slice(0,match.index),marker=/(?:به\s+)?مبلغ\s*[:：]?\s*/g;let m,last=null;while((m=marker.exec(before)))last=m;let phrase,start;
  if(last){start=last.index;phrase=before.slice(last.index+last[0].length).trim()}else{const tokens=[...before.matchAll(/\S+/g)];let i=tokens.length-1;while(i>=0&&numeric(tokens[i][0]))i--;phrase=tokens.slice(i+1).map(t=>t[0]).join(' ');start=tokens[i+1]?.index??before.length}
  const normalized=digits(phrase).replace(/ملیون/g,'میلیون').replace(/یک\s+و\s+نیم\s+میلیون/g,'1.5 میلیون').replace(/نیم\s+میلیون/g,'0.5 میلیون').replace(/٫/g,'.');
  const amount=command.amountOf('مبلغ '+normalized+' '+(match[0].startsWith('ریال')?'ریال':'تومان'));
  return{amount:Number.isSafeInteger(amount)&&amount>0?amount:'',start,end:match.index+match[0].length,warning:amount?'':'مبلغ روشن نیست؛ عدد را قبل از ثبت کامل کن'};
 }
 const amount=command.amountOf(text);return{amount:Number.isSafeInteger(amount)&&amount>0?amount:'',start:text.indexOf('مبلغ')>=0?text.indexOf('مبلغ'):text.length,end:text.length,warning:amount?'':'مبلغ روشن نیست؛ عدد را قبل از ثبت کامل کن'};
}
function personFor(name,people){const key=norm(name);if(!key)return{party:'',matches:[]};const exact=people.filter(p=>[p.name,...(p.aliases||[])].some(n=>norm(n)===key));if(exact.length)return{party:exact.length===1?exact[0].name:'',matches:exact};const hits=people.filter(p=>norm(p.name).endsWith(' '+key)||norm(p.name).startsWith(key+' '));return{party:hits.length===1?hits[0].name:hits.length?'':name,matches:hits}}
function parseRow(raw,context){const {command,db,today,project:defaultProject='',defaultDate=''}=context;
 let text=command.clean(raw).replace(/ملیون/g,'میلیون').replace(/ردیف\s*(?:بعدی?|جدید)/g,'').trim();
 text=text.replace(/(^|تاریخ\s+)([۰-۹٠-٩\d]{1,2})\s*[.٫]\s*([۰-۹٠-٩\d]{1,2})(?=\s|$)/g,'$1$2/$3');
 const m=money(text,command),base=command.parse(text,db,today),date=command.dateInfo(text,today),explicitProject=/پروژه\s+/.test(text);
 const project=explicitProject?base.project||defaultProject:defaultProject;
 let prefix=text.slice(0,m.start).replace(/(?:در\s+)?تاریخ\s+[^\s]+/g,'').replace(/^(?:در\s+)?[۰-۹٠-٩\d]{1,4}[\/-][۰-۹٠-٩\d/]+\s*/,'').trim();
 if(explicitProject)prefix=prefix.replace(/(?:در|برای)?\s*پروژه\s+.+?(?=\s+(?:بابت|به|از)|$)/,'').trim();
 const about=prefix.match(/بابت\s+(.+)$/),to=prefix.match(/(?:به|از)\s+(?:حساب\s+)?(.+)$/);
 let party=(about?.[1]||to?.[1]||base.party||prefix).replace(/^(?:هم|و)\s+/,'').replace(/^(?:آقای|اقای|خانم|جناب)\s+/,'').replace(/\s+(?:پرداخت(?: شد| کردم)?|واریز(?: شد| کردم)?|دریافت(?: شد| کردم)?|گرفتم|دادم)$/,'').replace(/^(?:پرداخت|دریافت|واریز|ثبت|تنخواه)(?:\s+شد)?$/,'').trim();
 if(!party||party.length>100||/^هم?\s*$/.test(party))party='';
 const known=personFor(party,db.people||[]),ambiguous=known.matches.length>1;
 const income=/دریافت(?:\s+(?:شد|کردم))?|دریافتی|گرفتم|به\s+حساب\s+(?:من|ما|خودم|شرکت)|از\s+کارفرما/.test(text),outgoing=/پرداخت|دادم|هزینه کردم|واریز کردم/.test(text);
 const kind=income&&!outgoing?'income':'expense',kindWarning=income&&outgoing?'هم دریافت و هم پرداخت گفته شده؛ نوع را انتخاب کن':!income&&!outgoing&&/واریز\s+شد/.test(text)?'«واریز شد» بدون مقصد روشن نیست؛ فعلاً پرداخت انتخاب شده':'';
 let note=text.slice(m.end).replace(/^[\s.،؛]+/,'').replace(/^(?:(?:پرداخت|واریز|دریافت)\s+(?:شد|کردم)|گرفتم|دادم)\s*/,'').replace(/^(?:توضیحات(?:ش)?|توضیح(?:ش)?|شرح(?:ش)?)\s*[:：]?\s*/,'').replace(/(?:\s+(?:پرداخت|واریز|دریافت)\s+شد)[.،\s]*$/,'').trim();
 const explicitNote=text.match(/(?:توضیحات(?:ش)?|توضیح(?:ش)?|شرح(?:ش)?)\s*[:：]?\s*(.+)$/);if(explicitNote)note=explicitNote[1].trim();
 if(ambiguous)note=[note,'طرف حساب گفته‌شده: '+party+'؛ انتخاب کن: '+known.matches.map(p=>p.name).join('، ')].filter(Boolean).join(' — ');
 const category=/^(?:حمل|کرایه|نخاله)(?:\s|$)/.test(party)?party:base.category&&!['هزینه عمومی','پرداخت پیمانکار','دریافت از کارفرما'].includes(base.category)?base.category:'تنخواه';
 return{project,party:known.party,category,amount:m.amount,date:date.explicit?date.date:defaultDate,kind,note,rawText:String(raw),amountWarning:m.warning,kindWarning,partyWarning:ambiguous?'طرف حساب مشابه است؛ نام کامل را از پیشنهادها انتخاب کن':''};
}
function parseAll(text,context){return String(text||'').replace(/ردیف\s*(?:بعدی?|جدید)\s*[:：،.]?/g,'\n').split(/\n+|\s*؛\s*|\s+(?:سپس|بعدش|بعد از آن)\s+/).map(s=>s.trim()).filter(Boolean).map(row=>parseRow(row,context))}
return{parseAll,parseRow,personFor};
});
