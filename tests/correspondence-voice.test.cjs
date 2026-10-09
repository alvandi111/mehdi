const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.LEDGER_JSDOM||'../../voice-test-runtime/node_modules/jsdom');
const root=path.join(__dirname,'..'),storage='peymanyar-v1-data';
function boot(saved){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const w=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'https://alvandi111.github.io/mehdi/',runScripts:'dangerously',virtualConsole:console}).window;
 w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>{throw Error('offline test')};
 if(saved)w.localStorage.setItem(storage,saved);
 // All app scripts in the deployed order. The network SDK is not used in this local ledger test.
 for(const m of html.matchAll(/<script src="([^?\"]+)/g)){const file=m[1];if(file.startsWith('vendor/'))continue;const s=w.document.createElement('script');s.textContent=fs.readFileSync(path.join(root,file),'utf8');w.document.body.append(s)}
 assert.deepEqual(errors,[]);return w;
}


(async()=>{
 const w=boot(),d=w.document;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 let stops=0,requests=[];Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})}});
 class Recorder {static isTypeSupported(){return true} constructor(){this.state='inactive';this.mimeType='audio/webm'} start(){this.state='recording'} stop(){this.state='inactive';this.ondataavailable({data:new w.Blob(['sample audio'],{type:this.mimeType})});this.onstop()}}
 w.MediaRecorder=Recorder;w.fetch=async(url)=>{requests.push(url);return {ok:true,json:async()=>({text:'برای بیمارستان نمونه پیش فاکتور کابینت بنویس'})}};
 w.openSecretariat();assert.ok(d.getElementById('secretariat').textContent.includes('پیش‌فاکتور با صدا'));
 w.openCorrespondence('quote');w.dictateCorrespondence();assert.ok(d.getElementById('secVoice'));assert.equal(d.getElementById('quickText'),null);
 await w.toggleCorrespondenceRecording();await w.toggleCorrespondenceRecording();await new Promise(r=>setTimeout(r,10));assert.equal(stops,1);assert.ok(requests[0].endsWith('/transcribe'));assert.match(d.getElementById('secVoiceText').value,/بیمارستان/);
 w.fetch=async()=>({ok:false,status:404});w.useCorrespondenceVoice(true);await new Promise(r=>setTimeout(r,10));assert.equal(d.getElementById('secVoice'),null);assert.match(d.getElementById('secRaw').value,/بیمارستان/);assert.match(d.getElementById('secEditorStatus').textContent,/هنوز فعال نیست/);assert.equal(w.eval('db.transactions.length'),0);
 w.dictateCorrespondence();await w.toggleCorrespondenceRecording();w.closeCorrespondenceRecorder();assert.equal(stops,2);assert.equal(d.getElementById('secVoice'),null);
 // Permission failure returns a usable text entry UI.
 w.navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(Error(),{name:'NotAllowedError'})};w.dictateCorrespondence();await w.toggleCorrespondenceRecording();assert.match(d.querySelector('#secVoice [role=status]').textContent,/اجازه/);d.getElementById('secVoiceText').value='متن تایپ شده';w.useCorrespondenceVoice(false);assert.equal(d.getElementById('secRaw').value,'متن تایپ شده');
 w.close();console.log('PASS: dedicated recorder, transcript review, missing compose service, unchanged finance, microphone cleanup and permission fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
