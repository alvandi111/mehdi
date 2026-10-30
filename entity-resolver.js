/* Safe entity resolution for AI/voice previews. Never mutates project data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PeymanyarEntityResolver=api})(typeof self!=='undefined'?self:this,function(){
'use strict';
const normalize=s=>String(s||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670ـ]/g,'').replace(/\u200c/g,' ').replace(/آ/g,'ا').replace(/^(?:اقای|خانم|جناب)\s+/,'').replace(/\s+/g,' ').trim();
const tokens=s=>normalize(s).split(' ').filter(Boolean);
function resolve(query,records,kind='person'){
 const q=normalize(query);if(!q)return{status:'missing',selected:null,candidates:[],canCreate:true};
 const list=(records||[]).filter(x=>x&&typeof x.name==='string').map(x=>{
  const names=[x.name,...(Array.isArray(x.aliases)?x.aliases:[])].map(normalize).filter(Boolean);
  const exact=names.some(n=>n===q),partial=names.some(n=>tokens(n).includes(q)),prefix=names.some(n=>n.startsWith(q+' ')||n.endsWith(' '+q));
  return{record:x,score:exact?3:partial?2:prefix?1:0,exact};
 }).filter(x=>x.score).sort((a,b)=>b.score-a.score);
 const best=list[0]?.score||0,candidates=list.filter(x=>x.score===best).map(x=>({id:x.record.id??null,name:x.record.name,record:x.record}));
 // Only exact unique matches may be suggested as a single choice; confirmation is always required.
 const status=!list.length?'new_or_unknown':candidates.length>1?'ambiguous':best===3?'exact_unconfirmed':'partial_unconfirmed';
 return{kind,query,status,selected:null,candidates,canCreate:true,requiresConfirmation:true};
}
function review({project='',party='',db={},amount=null,date='',kind='expense'}={}){
 const projects=resolve(project,db.projects||[],'project'),people=resolve(party,db.people||[],'person');
 const validAmount=Number.isSafeInteger(amount)&&amount>0;
 const validDate=/^1[34]\d{2}\/\d{2}\/\d{2}$/.test(String(date));
 return{projects,people,amount:validAmount?amount:null,date:validDate?date:null,kind,
  warnings:[...(!validAmount?['مبلغ معتبر نیست؛ ثبت ممنوع است']:[]),...(!validDate?['تاریخ شمسی معتبر مشخص نشده']:[]),
   ...(projects.status!=='exact_unconfirmed'?['پروژه نیازمند انتخاب است']:[]),
   ...(party&&people.status!=='exact_unconfirmed'?['شخص نیازمند انتخاب است']:[])],
  canCommit:false};
}
return{normalize,resolve,review};
});
