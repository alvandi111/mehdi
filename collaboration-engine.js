(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PeymanyarCollaboration=api;
})(typeof self!=='undefined'?self:this,function(){
  const VERSION=1;
  const TYPES={
    technical:{name:'پرسش فنی',icon:'؟'},
    quality:{name:'کنترل کیفیت',icon:'✓'},
    coordination:{name:'هماهنگی اجرا',icon:'↔'},
    safety:{name:'ایمنی کارگاه',icon:'!'},
    daily_followup:{name:'پیگیری گزارش روزانه',icon:'☷'}
  };
  const PRIORITIES={normal:'عادی',important:'مهم',urgent:'فوری'};
  const STATUSES={open:'باز',reviewing:'در حال بررسی',approved:'تأیید شد',changes_requested:'نیازمند اصلاح',closed:'بسته شد'};
  const id=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const now=()=>new Date().toISOString();
  function ensure(db){
    if(!Array.isArray(db.discussions))db.discussions=[];
    db.collaborationSchemaVersion=VERSION;
    return db;
  }
  function activeMember(db){return db.members?.find(x=>x.id===db.activeMemberId)||db.members?.[0]||null}
  function projectMember(db,member,projectId){return !member?.projectIds?.length||member.projectIds.includes(String(projectId))}
  function canSee(db,thread,member=activeMember(db)){
    if(!member||!projectMember(db,member,thread.projectId))return false;
    if(member.role==='owner'||thread.createdBy===member.id)return true;
    if(thread.visibility!=='restricted')return true;
    return (thread.participantIds||[]).includes(member.id);
  }
  function canModerate(db,thread,member=activeMember(db)){
    return !!member&&(member.role==='owner'||member.role==='project_manager'||member.role==='site_supervisor'||thread.createdBy===member.id);
  }
  function list(db,projectId){ensure(db);return db.discussions.filter(x=>(!projectId||String(x.projectId)===String(projectId))&&canSee(db,x)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))}
  function create(db,input){
    ensure(db);const member=activeMember(db);if(!member)throw new Error('member_required');
    const title=String(input.title||'').trim(),body=String(input.body||'').trim();
    if(!title||!body)throw new Error('title_body_required');
    const participants=[...new Set((input.participantIds||[]).filter(Boolean))];
    const thread={id:id('discussion'),projectId:String(input.projectId||''),projectName:String(input.projectName||''),title,body,type:TYPES[input.type]?input.type:'technical',priority:PRIORITIES[input.priority]?input.priority:'normal',status:'open',visibility:participants.length?'restricted':'project',participantIds:participants,createdBy:member.id,createdAt:now(),updatedAt:now(),attachment:input.attachment||null,comments:[]};
    db.discussions.unshift(thread);return thread;
  }
  function comment(db,threadId,input){
    ensure(db);const thread=db.discussions.find(x=>x.id===threadId),member=activeMember(db);if(!thread||!canSee(db,thread,member))throw new Error('forbidden');
    const body=String(input.body||'').trim();if(!body&&!input.attachment)throw new Error('empty_comment');
    const row={id:id('comment'),body,attachment:input.attachment||null,createdBy:member.id,createdAt:now()};thread.comments.push(row);thread.updatedAt=now();return row;
  }
  function setStatus(db,threadId,status){
    ensure(db);const thread=db.discussions.find(x=>x.id===threadId);if(!thread||!canModerate(db,thread)||!STATUSES[status])throw new Error('forbidden');thread.status=status;thread.updatedAt=now();return thread;
  }
  function unreadCount(db,projectId){return list(db,projectId).filter(x=>!['approved','closed'].includes(x.status)).length}
  return{VERSION,TYPES,PRIORITIES,STATUSES,ensure,activeMember,canSee,canModerate,list,create,comment,setStatus,unreadCount};
});
