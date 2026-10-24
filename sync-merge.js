/* Three-way merge: independent records/fields combine; conflicting edits never overwrite. */
(function(root){
 const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k)=>(o[k]=x[k],o),{}):x);
 const equal=(a,b)=>stable(a)===stable(b);
 function merge(base,local,remote,path=''){
  if(equal(local,remote))return local;
  if(equal(local,base))return remote;
  if(equal(remote,base))return local;
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  if(object(base)&&object(local)&&object(remote)){
   const out={};for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
    const v=merge(base[k],local[k],remote[k],path+'/'+k);if(v!==undefined)out[k]=v;
   }return out;
  }
  if([base,local,remote].every(Array.isArray)){
   const keyed=a=>a.every(x=>object(x)&&x.id!==undefined)&&new Set(a.map(x=>String(x.id))).size===a.length;
   if([base,local,remote].every(keyed)){
    const maps=[base,local,remote].map(a=>new Map(a.map(x=>[String(x.id),x]))),out=[];
    for(const id of new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])){
     const v=merge(maps[0].get(id),maps[1].get(id),maps[2].get(id),path+'/'+id);if(v!==undefined)out.push(v);
    }return out;
   }
  }
  throw Error('sync_conflict:'+path);
 }
 root.PeymanyarMerge={merge};
})(typeof window==='undefined'?globalThis:window);
