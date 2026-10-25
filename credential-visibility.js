/* Visibility controls only: values, validation and authentication stay unchanged. */
(()=>{
 const style=document.createElement('style');
 style.textContent='.credential-field{display:flex;align-items:center;gap:8px;width:100%}.credential-field input{flex:1;min-width:0}.credential-eye{flex:none;width:46px;min-height:46px;display:grid;place-items:center;border:1px solid #bccbc4;border-radius:12px;background:#fff;color:#173b32;cursor:pointer}.credential-eye svg{width:24px;height:24px}.credential-eye:focus-visible{outline:3px solid #bf8b30;outline-offset:2px}';
 document.head.append(style);
 function enhance(root){
  if(!root.querySelectorAll)return;
  const fields=[...(root.matches?.('input')?[root]:[]),...root.querySelectorAll('input')];
  for(const input of fields){
   if(input.dataset.visibilityControl||!(input.type==='password'||input.autocomplete==='one-time-code'||input.id==='cloudCode'))continue;
   input.dataset.visibilityControl='true';
   const wrap=document.createElement('div'),button=document.createElement('button');
   wrap.className='credential-field';button.className='credential-eye';button.type='button';
   input.before(wrap);wrap.append(input,button);
   const code=input.autocomplete==='one-time-code'||input.id==='cloudCode';
   function update(){const visible=input.type!=='password';const label=(visible?'پنهان کردن ':'نمایش ')+(code?'کد تأیید':'رمز عبور');button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(visible));button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(visible?'<path d="m3 3 18 18"/>':'')+'</svg>'}
   button.addEventListener('click',()=>{const start=input.selectionStart,end=input.selectionEnd;input.type=input.type==='password'?'text':'password';update();input.focus({preventScroll:true});try{input.setSelectionRange(start,end)}catch{}});
   update();
  }
 }
 enhance(document.body);
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)enhance(node)}).observe(document.body,{childList:true,subtree:true});
})();
