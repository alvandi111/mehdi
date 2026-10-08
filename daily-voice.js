// Long daily reports are separate from quick commands and petty-cash dictation.
let dailyVoiceSession = null;
let dailyAudioUrls = [];

function dailyVoiceStatus(message) {
  const node = document.getElementById('dailyVoiceStatus');
  if (node) node.textContent = message;
}
function dailyVoiceControls() {
  const session = dailyVoiceSession;
  const recording = !!session?.recording, busy = recording || !!session?.pending;
  const start = document.getElementById('dailyVoiceStart'), stop = document.getElementById('dailyVoiceStop');
  const retry = document.getElementById('dailyVoiceRetry'), skip = document.getElementById('dailyVoiceSkip');
  const saveButton = document.getElementById('dailyVoiceSave'), text = document.getElementById('dailyVoiceText');
  if (start) start.disabled = busy;
  if (stop) stop.disabled = !recording;
  if (retry) retry.hidden = !session?.failed.length || busy;
  if (skip) skip.hidden = !session?.failed.length || busy;
  if (saveButton) saveButton.disabled = busy || !!session?.failed.length;
  if (text) text.readOnly = busy || !!session?.failed.length;
}
function openLongDailyReport(project = '') {
  if (document.getElementById('dailyLongModal')) return;
  dailyVoiceSession = null;
  const context = project || (page === 'projectDetail' ? db.projects.find(p => Number(p.id) === Number(selectedProjectId))?.name || '' : '');
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="dailyLongModal" onclick="if(event.target===this)closeLongDailyReport()"><div class="dialog bulk-cash-dialog" role="dialog" aria-modal="true" aria-label="گزارش روزانه طولانی"><div class="dialog-head"><h2>گزارش روزانهٔ صوتی</h2><button class="close" onclick="closeLongDailyReport()" aria-label="بستن">×</button></div><p>تا یک دقیقه پیوسته صحبت کن. صدا هر ۱۵ ثانیه جداگانه تبدیل می‌شود. متن را پیش از ثبت بررسی کن.</p><div class="field"><label for="dailyVoiceProject">پروژه</label><input id="dailyVoiceProject" list="dailyVoiceProjects" value="${esc(context)}" placeholder="نام پروژه"><datalist id="dailyVoiceProjects">${db.projects.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist></div><div class="form-grid"><div class="field"><label for="dailyVoiceDate">تاریخ شمسی گزارش</label><input id="dailyVoiceDate" value="${todayFa()}" inputmode="numeric"></div><div class="field"><label for="dailyVoiceWorkers">تعداد نیرو</label><input id="dailyVoiceWorkers" inputmode="numeric" placeholder="اختیاری"></div><div class="field"><label for="dailyVoiceWeather">وضعیت هوا</label><input id="dailyVoiceWeather" placeholder="اختیاری"></div></div><div class="dialog-actions"><button class="btn primary" id="dailyVoiceStart" onclick="startLongDailyVoice()">🎙 شروع ضبط</button><button class="btn" id="dailyVoiceStop" onclick="stopLongDailyVoice()" disabled>■ پایان ضبط</button><button class="btn" id="dailyVoiceRetry" onclick="retryLongDailyVoice()" hidden>تلاش دوباره برای بخش ناموفق</button><button class="btn" id="dailyVoiceSkip" onclick="skipLongDailyVoiceFailure()" hidden>تکمیل دستی بخش ناموفق</button></div><p id="dailyVoiceStatus" role="status" aria-live="polite">برای پایان زودتر، «پایان ضبط» را بزن.</p><div class="field"><label for="dailyVoiceText">شرح کامل گزارش؛ قابل ویرایش پیش از ثبت</label><textarea id="dailyVoiceText" rows="9" placeholder="عملیات، نیروها، مصالح، اتفاقات و تصمیم‌ها را بنویس یا ضبط کن."></textarea></div><div class="dialog-actions"><button class="btn" onclick="suggestDailyReportFields()">تشخیص پروژه و تاریخ از متن</button><button class="btn primary" id="dailyVoiceSave" onclick="saveLongDailyReport()">ثبت گزارش</button></div></div></div>`);
}
function closeLongDailyReport() {
  if (dailyVoiceSession?.recording) { stopLongDailyVoice(); dailyVoiceStatus('ضبط متوقف شد؛ منتظر تبدیل بخش‌های باقی‌مانده بمان.'); return; }
  if (dailyVoiceSession?.pending) { dailyVoiceStatus('بخش‌های ضبط‌شده هنوز در حال تبدیل‌اند.'); return; }
  if (dailyVoiceSession?.failed.length && !confirm('بخش‌هایی تبدیل نشده‌اند. بدون ثبت گزارش از صفحه خارج می‌شوی؟')) return;
  dailyVoiceSession = null;
  document.getElementById('dailyLongModal')?.remove();
}
async function transcribeDailyVoicePart(blob) {
  const saved = (localStorage.getItem(AI_ENDPOINT_KEY) || '').replace(/\/$/, '');
  const endpoints = [...new Set([saved || DEFAULT_AI_ENDPOINT, DEFAULT_AI_ENDPOINT])];
  const form = new FormData(); form.append('file', blob, 'daily-report.wav');
  let last;
  for (const endpoint of endpoints) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${endpoint}/transcribe`, {method: 'POST', body: form, signal: controller.signal});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || result.error || `HTTP ${response.status}`);
      const text = String(result.text || '').trim();
      if (!text) throw new Error('گفتاری در این بخش تشخیص داده نشد');
      return text;
    } catch (error) {
      last = error;
      if (error?.name !== 'TypeError' && error?.name !== 'AbortError' && !/502|503|504|timeout/i.test(String(error?.message || ''))) break;
    } finally { clearTimeout(timer); }
  }
  throw last;
}
function renderDailyVoiceText(session) {
  const input = document.getElementById('dailyVoiceText');
  if (!input) return;
  input.value = [session.baseText, ...[...session.transcripts].sort((a, b) => a[0] - b[0]).map(x => x[1])].filter(Boolean).join('\n');
}
function queueDailyVoicePart(session, blob, part = ++session.part) {
  session.audioParts.set(part, blob);
  session.pending++;
  dailyVoiceControls();
  session.queue = session.queue.then(async () => {
    try {
      const text = await transcribeDailyVoicePart(blob);
      session.transcripts.set(part, text);
      renderDailyVoiceText(session);
      dailyVoiceStatus(`بخش ${fa(part)} آماده شد${session.recording ? '؛ ضبط ادامه دارد.' : '؛ متن را بررسی کن.'}`);
    } catch (error) {
      session.failed.push({part, blob});
      dailyVoiceStatus(`بخش ${fa(part)} تبدیل نشد. دوباره تلاش کن یا آن را دستی بنویس. ${voiceServiceError(error)}`);
    } finally {
      session.pending--;
      dailyVoiceControls();
      if (!session.recording && !session.pending && !session.failed.length) suggestDailyReportFields(false);
    }
  });
}
function flushDailyVoice(session) {
  if (!session.chunks.length) return;
  const samples = mergePcmChunks(session.chunks); session.chunks = [];
  if (samples.length < session.rate * .35) return;
  queueDailyVoicePart(session, pcmToWav(downsamplePcm(samples, session.rate), 16000));
}
async function startLongDailyVoice() {
  if (dailyVoiceSession?.recording || dailyVoiceSession?.pending) return;
  if (!navigator.mediaDevices?.getUserMedia) return dailyVoiceStatus('میکروفن در این مرورگر در دسترس نیست؛ می‌توانی گزارش را تایپ کنی.');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return dailyVoiceStatus('برای ضبط، صفحه را در Safari یا Chrome باز کن.');
  let stream, context;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true}});
    context = new AudioEngine(); if (context.state === 'suspended') await context.resume();
    const source = context.createMediaStreamSource(stream), processor = context.createScriptProcessor(4096, 1, 1);
    const session = dailyVoiceSession || {part: 0, audioParts: new Map()};
    Object.assign(session, {stream, context, source, processor, chunks: [], rate: context.sampleRate, pending: 0, baseText: document.getElementById('dailyVoiceText')?.value.trim() || '', transcripts: new Map(), queue: Promise.resolve(), failed: [], recording: true, timer: null, limit: null});
    dailyVoiceSession = session;
    processor.onaudioprocess = event => {event.outputBuffer.getChannelData(0).fill(0); if (session.recording) session.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));};
    source.connect(processor); processor.connect(context.destination);
    session.timer = setInterval(() => flushDailyVoice(session), 15000);
    session.limit = setTimeout(() => stopLongDailyVoice(), 60000);
    dailyVoiceControls(); dailyVoiceStatus('در حال ضبط؛ سقف یک دقیقه است. هر ۱۵ ثانیه یک بخش آماده می‌شود.');
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop()); context?.close().catch(() => {});
    dailyVoiceStatus(error?.name === 'NotAllowedError' ? 'دسترسی میکروفن را فعال کن.' : 'میکروفن باز نشد؛ صفحه را مستقیم در Safari باز کن.');
  }
}
function stopLongDailyVoice() {
  const session = dailyVoiceSession; if (!session?.recording) return;
  session.recording = false;
  clearInterval(session.timer); clearTimeout(session.limit);
  flushDailyVoice(session);
  session.processor.onaudioprocess = null;
  session.source.disconnect(); session.processor.disconnect();
  session.stream.getTracks().forEach(track => track.stop()); session.context.close().catch(() => {});
  dailyVoiceControls();
  dailyVoiceStatus(session.pending ? 'ضبط پایان یافت؛ بخش‌های باقی‌مانده در حال تبدیل‌اند.' : 'ضبط پایان یافت؛ متن را بررسی کن.');
}
function retryLongDailyVoice() {
  const session = dailyVoiceSession; if (!session?.failed.length || session.pending) return;
  const failed = session.failed.splice(0);
  for (const item of failed) queueDailyVoicePart(session, item.blob, item.part);
  dailyVoiceStatus('در حال تبدیل دوبارهٔ بخش‌های ناموفق…');
}
function skipLongDailyVoiceFailure() {
  const session = dailyVoiceSession; if (!session?.failed.length) return;
  if (!confirm('متن بخش‌های ناموفق در گزارش نیست. آن‌ها را از روی صدا یا حافظه‌ات دستی در شرح گزارش کامل می‌کنی؟')) return;
  session.failed = [];
  dailyVoiceControls(); dailyVoiceStatus('بخش‌های ناموفق را دستی در شرح گزارش تکمیل کن.');
}
function suggestDailyReportFields(showStatus = true) {
  const text = document.getElementById('dailyVoiceText')?.value.trim() || '';
  if (!text) return;
  const plan = PeymanyarCommand.parse(text, db, todayFa());
  const project = document.getElementById('dailyVoiceProject'), date = document.getElementById('dailyVoiceDate');
  const workers = document.getElementById('dailyVoiceWorkers'), weather = document.getElementById('dailyVoiceWeather');
  if (project && !project.value.trim() && plan.project) project.value = plan.project;
  const dateInfo = PeymanyarCommand.dateInfo(text, todayFa());
  if (date && dateInfo.explicit && date.value === todayFa()) date.value = dateInfo.date;
  const people = normalizeDigits(text).match(/(\d+)\s*(?:نفر|کارگر|نیرو)/);
  if (workers && !workers.value && people) workers.value = people[1];
  if (weather && !weather.value) weather.value = (text.match(/(?:هوا|وضعیت هوا)\s+(آفتابی|بارانی|برفی|ابری|گرم|سرد)/) || [])[1] || '';
  if (showStatus) dailyVoiceStatus('پیشنهادهای پروژه، تاریخ و نیرو اعمال شد؛ پیش از ثبت بررسی کن.');
}
async function saveLongDailyReport() {
  const session = dailyVoiceSession;
  if (session?.recording || session?.pending || session?.failed.length) return dailyVoiceStatus('ابتدا ضبط و تبدیل همهٔ بخش‌ها را تمام کن.');
  const text = document.getElementById('dailyVoiceText')?.value.trim() || '';
  if (!text) return dailyVoiceStatus('شرح گزارش را بنویس یا ضبط کن.');
  const rawDate = document.getElementById('dailyVoiceDate')?.value.trim() || '';
  const dateInfo = PeymanyarCommand.dateInfo(rawDate, todayFa());
  if (!PeymanyarCalendar.parse(rawDate) || !rawDate || !dateInfo.explicit || dateInfo.date !== normalizeDateValue(rawDate)) return dailyVoiceStatus('تاریخ شمسی گزارش را به شکل ۱۴۰۵/۰۷/۰۶ بررسی کن.');
  const project = document.getElementById('dailyVoiceProject')?.value.trim() || 'بدون پروژه';
  const workers = n('dailyVoiceWorkers'), weather = document.getElementById('dailyVoiceWeather')?.value.trim() || '';
  let labour; try { labour = PeymanyarDaily.values('dailyVoice'); if (!Number.isInteger(workers) || workers < 0 || labour.labourWorkers != null && labour.labourWorkers > workers) throw Error('تعداد نیرو و کارگر روزمزد را بررسی کن'); } catch(error) { return dailyVoiceStatus(error.message); }
  if (db.daily.some(x => x.project === project && normalizeDateValue(x.date) === dateInfo.date && x.text === text) && !confirm('گزارش کاملاً مشابهی ثبت شده است. دوباره ثبت شود؟')) return;
  const id = uid(), audioIds = [];
  const saveButton = document.getElementById('dailyVoiceSave'); if (saveButton) saveButton.disabled = true;
  try {
    if (session?.audioParts.size) {
      for (const [part, blob] of [...session.audioParts].sort((a, b) => a[0] - b[0])) {
        const fileId = uid(), file = new File([blob], `گزارش-${id}-بخش-${part}.wav`, {type: 'audio/wav'});
        await storeFile(fileId, file); audioIds.push(fileId);
      }
    }
  } catch (error) {
    if (saveButton) saveButton.disabled = false;
    return dailyVoiceStatus('فایل صوتی روی این گوشی ذخیره نشد. فضای دستگاه را بررسی کن و دوباره ثبت بزن؛ متن هنوز اینجاست.');
  }
  const linkedProject = PeymanyarDaily.projectFor({project});
  const report = {id, project: linkedProject?.name || project, ...(linkedProject ? {projectId: linkedProject.id} : {}), date: dateInfo.date, workers, weather, text, audioIds, ...labour, source: session?.audioParts.size ? 'voice-long' : 'manual-long'};
  db.daily.unshift(report);
  if (project === 'بدون پروژه') addCompletionTask('daily.project', 'پروژهٔ گزارش روزانه را مشخص کن', {entityId: id, eventDate: dateInfo.date, key: `daily.project:${id}`});
  else if (!linkedProject && !db.projects.some(p => normalizedProjectName(p.name) === normalizedProjectName(project))) {
    const newProject = {id: uid(), name: project, client: 'ثبت نشده', location: '', budget: 0, progress: 0, status: 'فعال', start: dateInfo.date, completeness: 'draft'};
    db.projects.push(newProject); report.projectId = newProject.id;
    addCompletionTask('project.details', `تکمیل مشخصات پروژه ${project}`, {entityId: newProject.id, project, key: `project.details:${newProject.id}`});
  }
  save(); dailyVoiceSession = null; document.getElementById('dailyLongModal')?.remove(); render(); toast('گزارش روزانه ثبت شد');
}
async function openLongDailyDetail(id) {
  const row = db.daily.find(x => Number(x.id) === Number(id)); if (!row) return;
  closeLongDailyDetail();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="dailyDetailModal" onclick="if(event.target===this)closeLongDailyDetail()"><div class="dialog bulk-cash-dialog"><div class="dialog-head"><h2>گزارش ${esc(row.project)} • ${esc(row.date)}</h2><button class="close" onclick="closeLongDailyDetail()">×</button></div><p>تعداد نیرو: ${fa(row.workers || 0)} • هوا: ${esc(row.weather || 'ثبت نشده')}</p><div class="card" style="white-space:pre-wrap">${esc(row.text)}</div><div id="dailyAudioPlayers"></div></div></div>`);
  const box = document.getElementById('dailyAudioPlayers');
  if (!box || !row.audioIds?.length) return;
  for (let index = 0; index < row.audioIds.length; index++) {
    try {
      const stored = await readFile(row.audioIds[index]); if (!stored?.blob || !box.isConnected) continue;
      const url = URL.createObjectURL(stored.blob); dailyAudioUrls.push(url);
      box.insertAdjacentHTML('beforeend', `<div class="field"><label>صدای بخش ${fa(index + 1)}</label><audio controls preload="none" src="${url}"></audio><a class="btn" href="${url}" download="${esc(stored.name || `گزارش-${id}-${index + 1}.wav`)}">دانلود صدا</a></div>`);
    } catch { box.insertAdjacentHTML('beforeend', `<p>صدای بخش ${fa(index + 1)} روی این دستگاه پیدا نشد.</p>`); }
  }
}
function closeLongDailyDetail() {
  document.getElementById('dailyDetailModal')?.remove();
  for (const url of dailyAudioUrls) URL.revokeObjectURL(url);
  dailyAudioUrls = [];
}
daily = function () {
  return layout(`<div class="section-head"><div><h2>گزارش روزانه کارگاه</h2><p>عملیات، تعداد نیرو، وضعیت هوا و اتفاقات مهم</p></div><div class="dialog-actions"><button class="btn primary" onclick="openLongDailyReport()">🎙 گزارش صوتی طولانی</button><button class="btn" onclick="openForm('daily')">ثبت دستی</button></div></div><div class="project-list">${db.daily.map(row => `<article class="card"><div class="row-top"><strong>${esc(row.project)} • ${esc(row.date)}</strong><span class="pill">${fa(row.workers || 0)} نفر</span></div><p>${esc(row.text)}</p><small style="color:var(--muted)">وضعیت هوا: ${esc(row.weather || 'ثبت نشده')}</small><div class="dialog-actions"><button class="btn" onclick="openLongDailyDetail(${Number(row.id)})">مشاهده گزارش${row.audioIds?.length ? ' و صدا' : ''}</button></div></article>`).join('') || empty()}</div>`, 'گزارش روزانه');
};
const dashboardBeforeLongVoice = dashboard;
dashboard = function () {
  const html = dashboardBeforeLongVoice();
  const shortcut = '<section class="dashboard-projects"><button class="btn primary" onclick="openLongDailyReport()">🎙 گزارش روزانهٔ طولانی؛ تا یک دقیقه</button></section>';
  return html.replace('<section class="dashboard-projects">', shortcut + '<section class="dashboard-projects">');
};
render();

