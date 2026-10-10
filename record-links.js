/* Shared identity resolution for dashboard writes and account/project reads. */
(function(){
'use strict';
const eq=(a,b)=>a!=null&&b!=null&&String(a)===String(b),key=s=>PeymanyarCommand.clean(String(s||'')).replace(/آ/g,'ا');
function named(list,name){if(!key(name))return null;const found=list.filter(p=>[p.name,...(p.aliases||[])].some(n=>key(n)===key(name)));return found.length===1?found[0]:null}
function project(row,data=db){return row.projectId!=null?data.projects.find(p=>eq(p.id,row.projectId))||null:named(data.projects,row.project||row.projectName)}
function person(row,data=db){const id=row.personId??row.contractorId;return id!=null?data.people.find(p=>eq(p.id,id))||null:named(data.people,row.party)}
function projectMatch(row,scope){if(!scope)return true;const p=typeof scope==='object'?scope:named(db.projects,scope)||db.projects.find(p=>eq(p.id,scope));return !!p&&eq(project(row)?.id,p.id)}
function personMatch(row,target){const p=typeof target==='object'?target:named(db.people,target);return !!p&&eq(person(row)?.id,p.id)}
function canonicalize(data,baseline=null){const changes=[];function put(row,k,value){if(row[k]===value)return;changes.push([row,k,Object.prototype.hasOwnProperty.call(row,k),row[k]]);row[k]=value}
 for(const collection of ['transactions','contracts','documents','daily','workStatements','correspondence'])for(const row of data[collection]||[]){
  const old=(baseline?.[collection]||[]).find(r=>eq(r.id,row.id));if(old&&JSON.stringify(old)===JSON.stringify(row))continue;
  const p=project(row,data);if(p){if(row.projectId==null)put(row,'projectId',p.id);put(row,'project',p.name)}
  if(['transactions','contracts','documents','workStatements'].includes(collection)){const who=person(row,data);if(who){if(row.personId==null)put(row,'personId',who.id);if(row.contractorId==null)put(row,'contractorId',who.id);put(row,'party',who.name)}}
 }return changes}
 const baseSave=save;save=function(...args){let baseline=null;try{baseline=JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{}const changes=canonicalize(db,baseline);try{return baseSave(...args)}catch(e){for(const [row,k,had,value]of changes.reverse()){if(had)row[k]=value;else delete row[k]}throw e}};
 transactionPersonMatch=personMatch;
 reportRows=function({project='',person='',personId='',dateFrom='',dateTo=''}={}){const from=normalizeDateValue(dateFrom),to=normalizeDateValue(dateTo),p=personId?db.people.find(p=>eq(p.id,personId)):person;return db.transactions.filter(row=>{const d=normalizeDateValue(row.date);return projectMatch(row,project)&&(!person&&!personId||personMatch(row,p))&&(!from||d>=from)&&(!to||d<=to)})};
 contractAccount=function(project,person){const contracts=db.contracts.filter(r=>projectMatch(r,project)&&(!person||personMatch(r,person))),payments=db.transactions.filter(r=>r.kind==='expense'&&projectMatch(r,project)&&(!person||personMatch(r,person)));const contract=contracts.reduce((n,r)=>n+Number(r.amount||0),0),paid=payments.reduce((n,r)=>n+Number(r.amount||0),0);return {contract,paid,remain:contract-paid}};
 window.PeymanyarLinks={project,person,projectMatch,personMatch,canonicalize};
})();
