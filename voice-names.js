(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PeymanyarVoiceNames=api})(typeof self!=='undefined'?self:this,function(){
 const normalize=s=>String(s||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670ـ]/g,'').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim();
 const key=s=>normalize(s).replace(/\s/g,'');
 function distance(a,b){a=key(a);b=key(b);let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next}return row[b.length]}
 function vocabulary(db){return [...new Set([...(db?.projects||[]).map(x=>normalize(x.name).replace(/^پروژه\s*/,'')),...(db?.people||[]).flatMap(x=>{const name=normalize(x.name);return [name,...name.split(' ').filter(w=>w.length>=5)]}),'ترکاشوند'])].filter(x=>key(x).length>=4).slice(0,150)}
 function suggestions(text,db){
  const words=[...String(text||'').matchAll(/[آ-یيىك\u200c]+/g)].map(m=>({word:m[0],start:m.index,end:m.index+m[0].length})),names=vocabulary(db),known=new Set(names.map(key)),skip=new Set(['به','از','در','برای','با','و','را','آقای','خانم','پروژه','پرداخت','تومان','میلیون','میلیارد','هزار','بابت','کردم','امروز','دیروز','مصالح','خرید','حساب','واریز','تاریخ','گزارش']);const result=[];
  for(let i=0;i<words.length;i++)for(let size=1;size<=2&&i+size<=words.length;size++){
   const span=words.slice(i,i+size),heard=text.slice(span[0].start,span.at(-1).end),k=key(heard);if(k.length<5||span.some(x=>skip.has(normalize(x.word))||known.has(key(x.word)))||known.has(k))continue;
   for(const name of names){const d=distance(heard,name),limit=k.length>=8?2:1;if(d<1||d>limit||Math.abs(k.length-key(name).length)>limit)continue;result.push({heard,name,start:span[0].start,end:span.at(-1).end,distance:d})}
  }
  return result.sort((a,b)=>a.distance-b.distance||b.heard.length-a.heard.length).filter((x,i,a)=>a.findIndex(y=>y.start===x.start&&y.end===x.end&&y.name===x.name)===i).slice(0,6)
 }
 function configure(recognition,db){recognition.maxAlternatives=5;if('phrases'in recognition&&typeof globalThis.SpeechRecognitionPhrase==='function')try{recognition.phrases=vocabulary(db).map(name=>new globalThis.SpeechRecognitionPhrase(name,4))}catch{}}
 function review(input,db){
  if(typeof document==='undefined'||!input?.isConnected)return;
  document.getElementById('voiceNameReview')?.remove();const original=input.value,items=suggestions(original,db);if(!items.length)return;
  const panel=document.createElement('section');panel.id='voiceNameReview';panel.className='voice-name-review';const title=document.createElement('strong');title.textContent='نام‌ها را بررسی کن';const note=document.createElement('p');note.textContent='این‌ها فقط پیشنهادند؛ نام درست را انتخاب کن یا متن را خودت ویرایش کن.';panel.append(title,note);
  for(const item of items){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=`«${item.heard}» ← «${item.name}»`;button.onclick=()=>{if(!input.isConnected)return;if(input.value!==original){review(input,db);return}clearTimeout(window.commandAnalysisTimer);input.value=original.slice(0,item.start)+item.name+original.slice(item.end);document.getElementById('parsedResult')?.replaceChildren();review(input,db);input.focus()};panel.append(button)}
  const keep=document.createElement('button');keep.type='button';keep.className='btn';keep.textContent='متن فعلی درست است';keep.onclick=()=>panel.remove();panel.append(keep);input.insertAdjacentElement('afterend',panel)
 }
 return{normalize,distance,vocabulary,suggestions,configure,review};
});
