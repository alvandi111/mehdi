/* Select the local partition before any app data or drafts are loaded. */
(function(){
 let id=null;
 try{const raw=JSON.parse(localStorage.getItem('peymanyar-auth')||'null');id=raw?.user?.id||raw?.currentSession?.user?.id||null}catch{}
 window.PeymanyarInitialUser=id;
 window.PeymanyarAccountStorage=id&&localStorage.getItem('peymanyar-v1-data:cloud-owner')===id?'peymanyar-v1-data':id?'peymanyar-account:'+id:'peymanyar-guest-data';
 const hash=new URLSearchParams(location.hash.slice(1)),token=hash.get('invite');
 if(token&&/^[a-f0-9]{64}$/.test(token)){sessionStorage.setItem('peymanyar-invite',token);history.replaceState(history.state,'',location.pathname+location.search)}
 document.body.classList.add('access-checking');
})();
