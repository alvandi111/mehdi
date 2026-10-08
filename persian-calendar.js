(function(){
 'use strict';
 const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
 const formatter=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
 const number=n=>new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(n);
 const digits=s=>String(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
 const pad=n=>String(n).padStart(2,'0'),key=(y,m,d)=>`${y}/${pad(m)}/${pad(d)}`;
 const todayFormatter=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Tehran'});
 function todayParts(){const p=todayFormatter.formatToParts(new Date()),get=t=>Number(p.find(x=>x.type===t).value);return{y:get('year'),m:get('month'),d:get('day')}}
 function parts(date){const p=formatter.formatToParts(date),get=t=>Number(p.find(x=>x.type===t).value);return{y:get('year'),m:get('month'),d:get('day')}}
 function epoch(y,m,d){let lo=Math.floor(Date.UTC(y+620,0,1)/86400000),hi=Math.floor(Date.UTC(y+623,0,1)/86400000),target=y*10000+m*100+d;while(lo<=hi){const mid=Math.floor((lo+hi)/2),p=parts(new Date(mid*86400000)),v=p.y*10000+p.m*100+p.d;if(v===target)return mid;if(v<target)lo=mid+1;else hi=mid-1}return null}
 function monthDays(y,m){const next=m===12?[y+1,1]:[y,m+1];return epoch(...next,1)-epoch(y,m,1)}
 function parse(s){const p=digits(s).trim().replace(/-/g,'/').split('/').map(Number);if(p.length!==3||!p.every(Number.isFinite)||p[0]<1300||p[0]>1499||p[1]<1||p[1]>12||p[2]<1||p[2]>monthDays(p[0],p[1]))return null;return{y:p[0],m:p[1],d:p[2]}}
 const controls=new WeakMap();
 let target=null,shown=null,selected='',popup=null;
 function valueParts(input){return parse(input.value)||(/^(?:19|20)\d{2}[-/]/.test(digits(input.value))&&window.PeymanyarReceiptDate?parse(PeymanyarReceiptDate.date(input.value)):null)}
 function editable(input){return input?.isConnected&&!input.disabled&&!input.readOnly}
 function setValue(input,p){if(!editable(input))return false;input.value=key(p.y,p.m,p.d);input.dispatchEvent(new Event('input',{bubbles:true}));if(input.isConnected)input.dispatchEvent(new Event('change',{bubbles:true}));return true}
 function step(input,delta){if(!editable(input))return;const current=valueParts(input);if(!current)return open(input);const day=epoch(current.y,current.m,current.d),next=parts(new Date((day+delta)*86400000));if(next.y<1300||next.y>1499)return;setValue(input,next);if(input.isConnected)input.focus({preventScroll:true})}
 function close(){popup?.remove();popup=null;if(target?.isConnected)target.focus({preventScroll:true});target=null}
 function choose(y,m,d){if(!target?.isConnected)return close();setValue(target,{y,m,d});close()}
 function paint(){popup.querySelector('.pc-current').textContent=selected?'تاریخ انتخاب‌شده: '+number(parse(selected).d)+' '+months[parse(selected).m-1]+' '+number(parse(selected).y):'یک روز را انتخاب کن؛ تا تأیید، تاریخ فیلد تغییر نمی‌کند';const body=popup.querySelector('.pc-body');body.replaceChildren();const header=document.createElement('div');header.className='pc-nav';const button=(text,fn,label)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;if(label)b.setAttribute('aria-label',label);return b};
 const change=delta=>{let m=shown.m+delta,y=shown.y;if(m===0){m=12;y--}if(m===13){m=1;y++}if(y<1300||y>1499)return;shown={y,m,d:1};paint()};
 header.append(button('ماه قبل',()=>change(-1)));
 const month=document.createElement('select');month.setAttribute('aria-label','ماه');months.forEach((name,i)=>{const o=new Option(name,String(i+1));o.selected=i+1===shown.m;month.add(o)});month.onchange=()=>{shown.m=Number(month.value);paint()};header.append(month);
 const year=document.createElement('select');year.setAttribute('aria-label','سال');for(let y=1300;y<=1499;y++){const o=new Option(number(y),String(y));o.selected=y===shown.y;year.add(o)}year.onchange=()=>{shown.y=Number(year.value);paint()};header.append(year,button('ماه بعد',()=>change(1)));body.append(header);
 const grid=document.createElement('div');grid.className='pc-grid';['ش','ی','د','س','چ','پ','ج'].forEach(x=>{const el=document.createElement('span');el.textContent=x;grid.append(el)});const offset=(new Date(epoch(shown.y,shown.m,1)*86400000).getUTCDay()+1)%7;for(let i=0;i<offset;i++)grid.append(document.createElement('span'));
 const today=todayParts();for(let d=1;d<=monthDays(shown.y,shown.m);d++){const date=key(shown.y,shown.m,d),b=button(number(d),()=>choose(shown.y,shown.m,d),`${number(d)} ${months[shown.m-1]} ${number(shown.y)}`);b.className='pc-day';if(date===selected){b.classList.add('pc-selected');b.setAttribute('aria-current','date')}if(date===key(today.y,today.m,today.d))b.classList.add('pc-today');grid.append(b)}body.append(grid);
 const footer=document.createElement('div');footer.className='pc-footer';footer.append(button('امروز',()=>choose(today.y,today.m,today.d)),button('ورود دستی',close),button('بستن',close));body.append(footer);
 }
 function open(input){if(!editable(input))return;if(popup)close();target=input;const current=valueParts(input),p=current||todayParts();shown={...p};selected=current?key(p.y,p.m,p.d):'';popup=document.createElement('div');popup.className='pc-overlay';popup.innerHTML='<section class="pc-dialog" role="dialog" aria-modal="true" aria-label="انتخاب تاریخ شمسی"><h3>انتخاب تاریخ شمسی</h3><p class="pc-current"></p><div class="pc-body"></div></section>';popup.addEventListener('click',e=>{if(e.target===popup)close()});popup.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const all=[...popup.querySelectorAll('button,select')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});document.body.append(popup);paint();popup.querySelector('select').focus()}
 function labelFor(input){return input.closest('.field')?.querySelector('label')?.textContent||input.closest('label')?.textContent||[...document.querySelectorAll('label[for]')].find(l=>l.htmlFor===input.id)?.textContent||input.getAttribute('aria-label')||''}
 function isDate(input,label){if(input.hasAttribute('data-persian-calendar'))return true;if(/تاریخ|سررسید|موعد|آغاز|پایان اجاره/.test(label))return true;return /(?:date|start|due|from|to)$/i.test(input.id)||!!parse(input.value)||input.type==='date'}
 function scan(){document.querySelectorAll('input').forEach(input=>{
  if(!['text','search','date',''].includes(input.type))return;
  const label=labelFor(input);if(!isDate(input,label))return;
  const old=controls.get(input);if(old?.isConnected){for(const b of old.querySelectorAll('button'))if(b.disabled!==(input.disabled||input.readOnly))b.disabled=input.disabled||input.readOnly;return}
  if(input.type==='date'){const converted=window.PeymanyarReceiptDate?.date(input.value);input.type='text';if(converted)input.value=converted}
  input.dataset.persianCalendar='1';input.setAttribute('inputmode','numeric');input.setAttribute('dir','ltr');
  // Explicit date markers request enhancement; they do not mean controls already exist.
  // Leave the field available for typing; only the calendar button opens the picker.
  if(/^\s*PeymanyarCalendar\.open\(this\)\s*;?\s*$/.test(input.getAttribute('onclick')||''))input.removeAttribute('onclick');
  const bar=document.createElement('div');bar.className='pc-controls';bar.setAttribute('role','group');bar.setAttribute('aria-label','کنترل '+(label||'تاریخ شمسی'));
  const add=(text,name,fn,className)=>{const b=document.createElement('button');b.type='button';b.className=className;b.textContent=text;b.setAttribute('aria-label',name+' — '+(label||'تاریخ شمسی'));b.disabled=input.disabled||input.readOnly;b.onclick=fn;bar.append(b)};
  add('‹ روز قبل','روز قبل',()=>step(input,-1),'pc-step pc-previous');
  add('📅 تقویم شمسی','انتخاب تاریخ شمسی',()=>open(input),'pc-trigger');
  add('روز بعد ›','روز بعد',()=>step(input,1),'pc-step pc-next');
  controls.set(input,bar);input.insertAdjacentElement('afterend',bar);
 })}
 const style=document.createElement('style');style.textContent='.pc-controls{display:flex;align-items:stretch;gap:5px;margin-top:7px;direction:rtl;flex-wrap:wrap}.pc-controls button{font:inherit;font-size:12px;padding:9px 7px;min-height:42px;border:1px solid #d8c6a1;border-radius:9px;background:#fff9ec;color:#1c3932;cursor:pointer;flex:1;white-space:nowrap}.pc-controls .pc-trigger{flex:1.25;margin:0}.pc-controls button:disabled{opacity:.45;cursor:default}.pc-current{font-size:13px;color:#53685a;margin:0 0 14px}.pc-trigger{font:inherit;font-size:12px;padding:7px 10px;margin-top:6px;border:1px solid #d8c6a1;border-radius:9px;background:#fff9ec;color:#1c3932;cursor:pointer}.pc-overlay{position:fixed;inset:0;z-index:10000;background:#0008;display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl}.pc-dialog{background:#fffdf7;border-radius:20px;width:min(100%,410px);max-height:90dvh;overflow:auto;padding:18px;box-shadow:0 10px 50px #0005;font-family:inherit}.pc-dialog h3{margin:0 0 15px}.pc-nav{display:flex;align-items:center;gap:5px}.pc-dialog button,.pc-dialog select{font:inherit;border:1px solid #d9d5c8;border-radius:9px;background:white;padding:9px 5px;color:#1c3932}.pc-nav button{font-size:12px;flex:1}.pc-nav select{max-width:100px}.pc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:15px 0;text-align:center}.pc-grid span{padding:7px}.pc-day{min-height:42px}.pc-grid .pc-selected{background:#1c3932;color:white}.pc-today{outline:2px solid #dba84d}.pc-footer{display:flex;gap:8px;justify-content:space-between}.pc-dialog button:focus-visible,.pc-dialog select:focus-visible{outline:3px solid #dba84d}';document.head.append(style);
 window.PeymanyarCalendar={parse,epoch,monthDays,key,open,scan,step};scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly','data-persian-calendar','id']});
})();

