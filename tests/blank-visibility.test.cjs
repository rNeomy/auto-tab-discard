const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual extension placeholder script, not a reimplementation.
const source = fs.readFileSync(path.join(__dirname, '../v3/worker/plugins/blank/blank.js'), 'utf8');

function fixture({hidden = false, active = true, tabExists = true, getCurrentError = null} = {}) {
  const listeners = new Map();
  const warnings = [];
  let closeCount = 0;
  let currentActive = active;
  let currentHidden = hidden;

  const document = {
    get hidden() {return currentHidden;},
    title: '',
    querySelectorAll: () => [],
    addEventListener(name, listener) {listeners.set(name, listener);},
    head: {appendChild() {}},
    createElement: () => ({setAttribute() {}})
  };
  const chrome = {
    i18n: {getMessage: name => name},
    runtime: {onMessage: {addListener: fn => listeners.set('message', fn)}},
    tabs: {async getCurrent() {
      if (getCurrentError) throw getCurrentError;
      return tabExists ? {active: currentActive} : undefined;
    }}
  };
  const window = {close() {closeCount++;}};
  vm.runInNewContext(source, {document, chrome, window,
    location: {search: ''}, URLSearchParams, console: {warn: (...args) => warnings.push(args)}},
  {filename: 'blank.js'});
  return {
    get closeCount() {return closeCount;},
    warnings,
    setHidden(value) {currentHidden = value;},
    setActive(value) {currentActive = value;},
    async emitVisibility() {await listeners.get('visibilitychange')();},
    click() {listeners.get('click')();},
    message(request) {listeners.get('message')(request);}
  };
}

test('minimizing the window retains the selected placeholder', async () => {
  const f = fixture({hidden: true, active: true});
  await f.emitVisibility();
  assert.equal(f.closeCount, 0);
});

test('moving focus to another window does not close its selected placeholder', async () => {
  const f = fixture({hidden: true, active: true});
  await f.emitVisibility();
  assert.equal(f.closeCount, 0);
});

test('switching away to another tab closes the hidden placeholder', async () => {
  const f = fixture({hidden: true, active: false});
  await f.emitVisibility();
  assert.equal(f.closeCount, 1);
});

test('a visible placeholder remains open', async () => {
  const f = fixture({hidden: false, active: false});
  await f.emitVisibility();
  assert.equal(f.closeCount, 0);
});

test('clicking the placeholder still closes it', () => {
  const f = fixture();
  f.click();
  assert.equal(f.closeCount, 1);
});

test('tab-is-active message still closes the placeholder', () => {
  const f = fixture();
  f.message({method: 'tab-is-active'});
  assert.equal(f.closeCount, 1);
});

test('unrelated messages do not close the placeholder', () => {
  const f = fixture();
  f.message({method: 'not-a-close-command'});
  assert.equal(f.closeCount, 0);
});

test('missing current-tab information fails closed to no action', async () => {
  const f = fixture({hidden: true, tabExists: false});
  await f.emitVisibility();
  assert.equal(f.closeCount, 0);
});

test('tab API failure does not close the placeholder or produce an unhandled rejection', async () => {
  const f = fixture({hidden: true, getCurrentError: Error('test API failure')});
  await f.emitVisibility();
  assert.equal(f.closeCount, 0);
  assert.equal(f.warnings.length, 1);
});
