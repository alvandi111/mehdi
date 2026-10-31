// The existing speech/writing provider remains unchanged; licences and quotas are checked here.
const ORIGIN='https://alvandi111.github.io';
const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type','Vary':'Origin'};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 const route=new URL(req.url).pathname.split('/').pop();
 if(req.method==='GET'&&route==='health')return json({ok:true,version:'131-access-gateway'});
 if(req.method!=='POST'||!['transcribe','compose','receipt','cash-table','interpret'].includes(route||''))return json({error:'not_found'},404);
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer .+/i.test(authorization))return json({error:'authentication_required',detail:'ابتدا وارد حساب شو.'},401);
 const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
 try{
 const auth=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
 if(!auth.ok)return json({error:'authentication_required',detail:'ورود حساب را دوباره بررسی کن.'},401);
 const declared=Number(req.headers.get('Content-Length')||0);if(declared>18*1024*1024)return json({error:'file_too_large'},413);
 const body=await req.arrayBuffer();if(body.byteLength>18*1024*1024)return json({error:'file_too_large'},413);
 if(route!=='interpret'){
 const access=await fetch(base+'/rest/v1/rpc/peymanyar_access',{method:'POST',headers:{apikey:key,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({action:'consume',args:{feature:route==='transcribe'?'speech':'ai'}})});
 if(!access.ok){const e=await access.json().catch(()=>({}));return json({error:'access_denied',detail:/quota_exceeded/.test(e.message||'')?'سهمیهٔ این ماه تمام شده است؛ درخواست افزایش سهمیه بده.':'دسترسی این قابلیت فعال نیست یا دوره پایان یافته است.'},403)}
 }
 const upstream=await fetch('https://peymanyar-ai.mehdi-alvandi111.workers.dev/'+route,{method:'POST',headers:{...(route==='interpret'?{'Authorization':authorization}:{}),'Content-Type':req.headers.get('Content-Type')||'application/octet-stream'},body,signal:AbortSignal.timeout(55000),redirect:'error'});
 return new Response(upstream.body,{status:upstream.status,headers:{...headers,'Content-Type':upstream.headers.get('Content-Type')||'application/json'}});
 }catch{return json({error:'gateway_failed',detail:'ارتباط با سرویس برقرار نشد؛ فایل صوتی را نگه دار و دوباره تلاش کن.'},502)}
});
