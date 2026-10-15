const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { JSDOM } = require(process.env.LEDGER_JSDOM || '../../voice-test-runtime/node_modules/jsdom');
const w = new JSDOM('<div id="app"></div><div id="toast"></div>', { url: 'https://alvandi111.github.io/mehdi/', runScripts: 'dangerously' }).window;
w.structuredClone = structuredClone; w.TextEncoder = TextEncoder; w.scrollTo = () => {};
w.confirm = () => true; w.alert = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
const observers = [], Observer = w.MutationObserver;
w.MutationObserver = class extends Observer { constructor(callback) { super(callback); observers.push(this); } };
const root = process.env.LEDGER_SOURCE_ROOT || path.join(__dirname, '..');
for (const f of ['workspace-engine.js', 'collaboration-engine.js', 'command-engine.js', 'contract-engine.js', 'receipt-date.js', 'app.js', 'daily-voice.js', 'persian-calendar.js', 'receipt-transport.js', 'live-dictation.js', 'entity-editor.js', 'financial-ledger.js', 'bulk-voice-parser.js','bulk-entry.js', 'bulk-grid.js']) {
  const script = w.document.createElement('script');
  script.textContent = fs.readFileSync(f === 'bulk-entry.js' && process.env.BULK_ENTRY_SOURCE ? process.env.BULK_ENTRY_SOURCE : path.join(root, f), 'utf8');
  w.document.body.appendChild(script);
}
const db = w.eval('db');
db.projects = [{ id: 1, name: 'آرشام', status: 'فعال', progress: 0 }];
db.people = [{ id: 10, name: 'نخاله', project: 'آرشام' }]; db.transactions = [];
const cell = key => w.document.querySelector(`[aria-label="${key} ردیف 1"]`);
function type(key, text) {
  const input = cell(key); input.focus(); input.value = text;
  input.dispatchEvent(new w.Event('input', { bubbles: true })); return input;
}
w.openBulkCash();
let input = type('project', 'آر');
w.document.querySelector('.bulk-picker button').click();
assert.equal(input.value, 'آرشام', 'selection replaces the typed prefix in the original input');
assert.equal(cell('project'), input, 'selection keeps the input alive through focus/change events');
input.dispatchEvent(new w.Event('change', { bubbles: true }));
assert.equal(cell('project').value, 'آرشام');
assert.equal(w.document.activeElement, cell('party'));
input = type('party', 'نخ');
w.document.querySelector('.bulk-picker button').click();
assert.equal(input.value, 'نخاله');
input.dispatchEvent(new w.Event('change', { bubbles: true }));
assert.equal(cell('party').value, 'نخاله');
assert.equal(w.document.activeElement, cell('category'));
assert.equal(w.document.querySelector('.bulk-picker'), null);
w.bulkCell(0, 'date', '1405/07/22'); w.bulkCell(0, 'amount', '1000000'); w.saveBulkCash();
assert.equal(db.people.length, 1, 'the prefix does not become a new account');
assert.equal(db.projects.length, 1, 'the project prefix does not become a new project');
assert.equal(db.transactions[0].party, 'نخاله'); assert.equal(db.transactions[0].personId, 10);
assert.equal(db.transactions[0].project, 'آرشام'); assert.equal(db.transactions[0].rawEntry.party, 'نخاله');
w.openBulkCash('آرشام'); input = type('party', 'نخ');
input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert.equal(input.value, 'نخاله'); assert.equal(w.document.activeElement, cell('category'));
w.bulkCell(0, 'amount', '200'); w.saveBulkCash();
assert.equal(db.transactions[1].personId, 10); assert.equal(db.people.length, 1);
w.openBulkCash('آرشام'); type('party', 'حساب تازه'); w.bulkCell(0, 'amount', '300'); w.saveBulkCash();
assert.equal(db.people.length, 2, 'typing an unselected new name still creates it');
assert.equal(db.transactions[2].party, 'حساب تازه');
console.log('PASS: clicked/keyboard suggestions replace prefixes, delayed change preserves selection, save links existing accounts, new names remain supported');
observers.forEach(observer => observer.disconnect()); w.close();

