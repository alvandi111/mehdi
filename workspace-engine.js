(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PeymanyarWorkspace=api;
})(typeof self!=='undefined'?self:this,function(){
  const VERSION=2;
  const PLANS={
    professional:{name:'پیمان‌یار حرفه‌ای',maxMembers:3,features:['projects','finance','documents','reports','ai']},
    enterprise:{name:'پیمان‌یار سازمانی',maxMembers:999,features:['projects','finance','documents','reports','ai','members','approvals','audit','portfolio']}
  };
  const INDUSTRIES={
    construction_management:{name:'مدیریت پیمان',projectLabel:'پروژه',partyLabel:'پیمانکار',stages:['شروع','در حال اجرا','تحویل موقت','تسویه','بسته‌شده']},
    cabinetry:{name:'کابینت‌سازی و دکوراسیون',projectLabel:'سفارش',partyLabel:'مشتری / نصاب',stages:['بازدید','طراحی','پیش‌فاکتور','قرارداد','تولید','نصب','تسویه']},
    architecture:{name:'معماری و طراحی',projectLabel:'پروژه',partyLabel:'کارفرما / مشاور',stages:['برداشت','کانسپت','طراحی','فاز دو','نظارت','تحویل']},
    renovation:{name:'بازسازی و اجرا',projectLabel:'پروژه',partyLabel:'پیمانکار / فروشنده',stages:['بازدید','برآورد','قرارداد','تخریب','اجرا','تحویل']},
    installations:{name:'تأسیسات و خدمات فنی',projectLabel:'مأموریت',partyLabel:'مشتری / تکنسین',stages:['درخواست','بازدید','برآورد','اجرا','تست','تسویه']},
    general:{name:'کسب‌وکار پروژه‌ای',projectLabel:'پروژه',partyLabel:'طرف حساب',stages:['جدید','در حال انجام','تحویل','بسته‌شده']}
  };
  const ROLE_PERMISSIONS={
    owner:['*'],
    project_manager:['project.view','project.edit','people.manage','daily.manage','document.manage','finance.view','finance.create','report.export','approval.manage','discussion.create','discussion.comment','discussion.moderate'],
    finance_manager:['project.view','finance.view','finance.create','finance.edit','document.manage','report.export','approval.finance','discussion.create','discussion.comment'],
    site_supervisor:['project.view','daily.manage','document.create','people.view','progress.update','discussion.create','discussion.comment','discussion.moderate'],
    observer:['project.view','daily.view','document.view','report.view','discussion.comment'],
    contractor:['project.view','daily.create','document.create','own.finance.view','discussion.create','discussion.comment'],
    custom:[]
  };
  const ROLE_NAMES={owner:'مالک سیستم',project_manager:'مدیر پروژه',finance_manager:'مدیر مالی',site_supervisor:'سرپرست کارگاه',observer:'ناظر',contractor:'پیمانکار',custom:'دسترسی سفارشی'};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const id=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  function ensure(db){
    if(!db.workspace)db.workspace={id:id('ws'),name:'دفتر من',industry:'construction_management',plan:'professional',createdAt:new Date().toISOString()};
    db.workspace.industry=INDUSTRIES[db.workspace.industry]?db.workspace.industry:'construction_management';
    db.workspace.plan=PLANS[db.workspace.plan]?db.workspace.plan:'professional';
    if(!Array.isArray(db.members)||!db.members.length)db.members=[{id:id('member'),name:'مدیر سیستم',email:'',phone:'',role:'owner',projectIds:[],status:'active',createdAt:new Date().toISOString()}];
    if(!Array.isArray(db.auditLogs))db.auditLogs=[];
    if(!Array.isArray(db.approvals))db.approvals=[];
    db.schemaVersion=VERSION;
    return db;
  }
  function plan(db){return PLANS[ensure(db).workspace.plan]}
  function industry(db){return INDUSTRIES[ensure(db).workspace.industry]}
  function permissions(member){return member?.permissions||ROLE_PERMISSIONS[member?.role]||[]}
  function can(member,permission){const list=permissions(member);return list.includes('*')||list.includes(permission)}
  function activeMember(db){ensure(db);return db.members.find(x=>x.id===db.activeMemberId)||db.members[0]}
  function memberCan(db,permission,projectId){const member=activeMember(db);if(!can(member,permission))return false;if(!projectId||member.role==='owner'||!member.projectIds?.length)return true;return member.projectIds.includes(String(projectId))}
  function audit(db,action,details){ensure(db);db.auditLogs.unshift({id:id('audit'),action,details:clone(details||{}),memberId:activeMember(db)?.id||'',at:new Date().toISOString()});db.auditLogs=db.auditLogs.slice(0,500)}
  function addMember(db,input){ensure(db);if(db.members.length>=plan(db).maxMembers)throw new Error('plan_member_limit');const member={id:id('member'),name:String(input.name||'').trim(),email:String(input.email||'').trim(),phone:String(input.phone||'').trim(),role:ROLE_PERMISSIONS[input.role]?input.role:'observer',projectIds:(input.projectIds||[]).map(String),status:'invited',createdAt:new Date().toISOString()};if(!member.name)throw new Error('member_name_required');db.members.push(member);audit(db,'member.invite',{memberId:member.id,name:member.name,role:member.role});return member}
  function updateWorkspace(db,input){ensure(db);if(input.name)db.workspace.name=String(input.name).trim();if(INDUSTRIES[input.industry])db.workspace.industry=input.industry;if(PLANS[input.plan])db.workspace.plan=input.plan;audit(db,'workspace.update',{name:db.workspace.name,industry:db.workspace.industry,plan:db.workspace.plan});return db.workspace}
  function updateMember(db,memberId,input){ensure(db);const member=db.members.find(x=>x.id===memberId);if(!member)throw new Error('member_not_found');Object.assign(member,{name:String(input.name??member.name).trim(),email:String(input.email??member.email).trim(),phone:String(input.phone??member.phone).trim(),role:ROLE_PERMISSIONS[input.role]?input.role:member.role,projectIds:(input.projectIds??member.projectIds).map(String),status:input.status||member.status});audit(db,'member.update',{memberId,role:member.role,status:member.status});return member}
  function removeMember(db,memberId){ensure(db);const member=db.members.find(x=>x.id===memberId);if(!member||member.role==='owner')throw new Error('member_remove_forbidden');db.members=db.members.filter(x=>x.id!==memberId);audit(db,'member.remove',{memberId,name:member.name})}
  function roleName(role){return ROLE_NAMES[role]||ROLE_NAMES.custom}
  return {VERSION,PLANS,INDUSTRIES,ROLE_PERMISSIONS,ROLE_NAMES,ensure,plan,industry,permissions,can,memberCan,activeMember,addMember,updateWorkspace,updateMember,removeMember,audit,roleName};
});
