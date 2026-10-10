const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '../v3', file), 'utf8');
const watch = read('data/inject/watch.js');
const meta = read('data/inject/meta.js');
const mode = read('worker/modes/number.mjs').replace(/^import .*;$/gm, '')
  .replace(/^export .*;$/gm, '') + '\nthis.number = number;';
const epoch = 1700000000000;
const minute = 60000;

function fixture(preferences = {}) {
  let now = epoch + 40 * minute;
  const tabs = [];
  const pages = new Map();
  const discarded = [];
  const prefs = {period: 1800, number: 0, audio: true, paused: false, 'split-view': false, ...preferences};
  const noop = () => {};
  const event = {addListener: noop};
  const clock = class extends Date {static now() {return now;}};
  class Media {
    constructor(options = {}) {
      Object.assign(this, {paused: true, currentTime: 0, muted: false, volume: 1}, options);
    }
  }
  const addPage = (tab, options = {}) => {
    const listeners = new Map();
    const players = [];
    const sandbox = {Date: clock, console, HTMLMediaElement: Media,
      document: {querySelectorAll: () => players, readyState: 'complete'},
      performance: {timing: {domLoading: epoch}, memory: options.memory && {totalJSHeapSize: options.memory}},
      addEventListener: (name, fn, capture) => {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push({fn, capture});
      }};
    const ctx = vm.createContext(sandbox);
    vm.runInContext('this.window = this; this.top = ' + (options.frame ? '{}' : 'this') + ';', ctx);
    vm.runInContext(watch, ctx);
    ctx.lastVisit = options.visit ?? epoch;
    const page = {ctx, listeners, players,
      player: options => {const p = new Media(options); players.push(p); return p;},
      emit: (name, target, trusted = true) => {
        for (const {fn, capture} of listeners.get(name) || []) {
          // Native media events do not bubble: require capture listeners.
          if (capture === true) fn({target, isTrusted: trusted, type: name});
        }
      },
      metadata: () => vm.runInContext(meta, ctx)};
    pages.get(tab.id).push(page);
    return page;
  };
  const addTab = (options = {}) => {
    const tab = {id: tabs.length + 1, active: false, audible: false, discarded: false,
      status: 'complete', autoDiscardable: true, url: 'https://example.com/' + tabs.length, ...options};
    tabs.push(tab);
    pages.set(tab.id, []);
    return {tab, page: addPage(tab, options)};
  };
  const background = vm.createContext({console, Date: clock,
    storage: async defaults => ({...defaults, ...prefs}), log: noop,
    match: () => false, icon: {disabled: noop, reset: noop},
    discard: tab => discarded.push(tab.id),
    query: async filter => tabs.filter(tab => Object.entries(filter).every(([key, value]) =>
      key === 'url' || tab[key] === value)),
    starters: [], interrupts: {'before-action': async () => {}},
    chrome: {alarms: {create: noop, clear: noop, onAlarm: event}, idle: {onStateChanged: event},
      storage: {onChanged: event}, scripting: {executeScript: async ({target}) =>
        pages.get(target.tabId).map(page => ({result: page.metadata()}))}}});
  vm.runInContext(mode, background);
  return {addTab, addPage, discarded, prefs, now: () => now,
    advance: duration => {now += duration;},
    check: ops => background.number.check(undefined, ops), manual: () => background.number.check(undefined, background.number.IGNORE)};
}

function play(page, player) {
  player.paused = false;
  page.emit('play', player);
  player.currentTime = 120;
  page.emit('playing', player);
}
function pause(page, player) {
  player.paused = true;
  page.emit('pause', player);
}

test('old background tab gets a complete new interval after pause', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player();
  play(page, p); pause(page, p);
  await f.check(); assert.deepEqual(f.discarded, []);
  f.advance(30 * minute - 1); await f.check(); assert.deepEqual(f.discarded, []);
  f.advance(1); await f.check(); assert.deepEqual(f.discarded, [1]);
});
test('audibly playing tabs stay excluded before metadata collection', async () => {
  const f = fixture(); f.addTab({audible: true}); await f.check(); assert.deepEqual(f.discarded, []);
});
test('audio protection disabled preserves the old age behavior', async () => {
  const f = fixture({audio: false}); const {page} = f.addTab(); const p = page.player();
  play(page, p); pause(page, p); await f.check(); assert.deepEqual(f.discarded, [1]);
});
test('paused protection remains independent beyond media grace', async () => {
  const f = fixture({paused: true}); const {page} = f.addTab(); const p = page.player();
  play(page, p); pause(page, p); f.advance(31 * minute); await f.check(); assert.deepEqual(f.discarded, []);
});
test('untouched paused players get no grace, even with paused protection on', async () => {
  const f = fixture({paused: true}); const {page} = f.addTab(); const p = page.player();
  page.emit('pause', p); page.emit('emptied', p); await f.check(); assert.deepEqual(f.discarded, [1]);
});
test('muted and zero-volume playback get no grace', async () => {
  for (const options of [{muted: true}, {volume: 0}]) {
    const f = fixture(); const {page} = f.addTab(); const p = page.player(options);
    play(page, p); pause(page, p); await f.check(); assert.deepEqual(f.discarded, [1]);
  }
});
test('audible playback remains activity if muted before pausing', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player();
  play(page, p); p.muted = true; page.emit('volumechange', p); pause(page, p);
  await f.check(); assert.deepEqual(f.discarded, []);
});
test('unmuting a playing player begins audible activity', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player({muted: true});
  play(page, p); p.muted = false; page.emit('volumechange', p); p.muted = true;
  pause(page, p); await f.check(); assert.deepEqual(f.discarded, []);
});
test('ended and emptied reset age for media that actually played', async () => {
  for (const event of ['ended', 'emptied']) {
    const f = fixture(); const {page} = f.addTab(); const p = page.player(); play(page, p);
    p.paused = true; if (event === 'emptied') p.currentTime = 0;
    page.emit(event, p); await f.check(); assert.deepEqual(f.discarded, []);
  }
});
test('embedded frame stop time survives later empty frame metadata', async () => {
  const f = fixture(); const {tab} = f.addTab(); const frame = f.addPage(tab, {frame: true});
  f.addPage(tab, {frame: true}); const p = frame.player(); play(frame, p); pause(frame, p);
  await f.check(); assert.deepEqual(f.discarded, []);
});
test('resume and multiple dynamically created players use the latest stop', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player();
  play(page, p); pause(page, p); f.advance(29 * minute);
  const another = page.player(); play(page, another); pause(page, another);
  f.advance(2 * minute); await f.check(); assert.deepEqual(f.discarded, []);
  play(page, p); pause(page, p); f.advance(30 * minute - 1);
  await f.check(); assert.deepEqual(f.discarded, []);
});
test('visibility activity can be newer than media activity', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player();
  play(page, p); pause(page, p); f.advance(29 * minute);
  for (const {fn} of page.listeners.get('visibilitychange')) fn();
  f.advance(2 * minute); await f.check(); assert.deepEqual(f.discarded, []);
});
test('already playing media can qualify without a captured play event', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player({currentTime: 120});
  pause(page, p); await f.check(); assert.deepEqual(f.discarded, []);
});
test('synthetic events and nonmedia targets do not reset inactivity', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player({currentTime: 120});
  page.emit('pause', p, false); page.emit('pause', {currentTime: 120, volume: 1});
  await f.check(); assert.deepEqual(f.discarded, [1]);
});
test('reading metadata does not renew grace', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player(); play(page, p); pause(page, p);
  f.advance(29 * minute); await f.check(); f.advance(minute); await f.check();
  assert.deepEqual(f.discarded, [1]);
});
test('invalid media timestamps never prevent normal discarding', async () => {
  for (const value of [undefined, null, NaN, Infinity, -1, '1700002400000', epoch + 99 * minute]) {
    const f = fixture(); const {page} = f.addTab(); page.ctx.lastMediaStop = value;
    await f.check(); assert.deepEqual(f.discarded, [1]);
  }
});
test('candidate order uses effective media age', async () => {
  const f = fixture({number: 1, period: 600}); const first = f.addTab({visit: epoch - 20 * minute});
  f.addTab({visit: epoch}); const p = first.page.player(); play(first.page, p); pause(first.page, p);
  f.advance(11 * minute); await f.check(); assert.deepEqual(f.discarded, [2]);
});
test('a stop during an asynchronous metadata scan is not mistaken for a future timestamp', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player(); play(page, p);
  const metadata = page.metadata;
  page.metadata = () => {f.advance(1000); pause(page, p); return metadata();};
  await f.check(); assert.deepEqual(f.discarded, []);
});
test('manual zero-period check still discards a newly paused tab', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player(); play(page, p); pause(page, p);
  await f.manual(); assert.deepEqual(f.discarded, [1]);
});
test('manual zero-period check ignores media stopping during the metadata scan', async () => {
  const f = fixture(); const {page} = f.addTab(); const p = page.player(); play(page, p);
  const metadata = page.metadata;
  page.metadata = () => {f.advance(1000); pause(page, p); return metadata();};
  await f.manual(); assert.deepEqual(f.discarded, [1]);
});
test('memory threshold remains an immediate override', async () => {
  const f = fixture({'memory-enabled': true, 'memory-value': 1});
  const {page} = f.addTab({memory: 2 * 1024 * 1024}); const p = page.player(); play(page, p); pause(page, p);
  await f.check(); assert.deepEqual(f.discarded, [1]);
});
test('existing unsaved-form protection and submit reset are preserved', async () => {
  const f = fixture(); const {page} = f.addTab();
  const input = {tagName: 'INPUT', isConnected: true, value: 'unsaved text'};
  for (const {fn} of page.listeners.get('keydown')) fn({keyCode: 65, target: input});
  assert.equal(page.metadata().forms, true);
  await f.check(); assert.deepEqual(f.discarded, []);
  for (const {fn} of page.listeners.get('submit')) fn();
  assert.equal(page.metadata().forms, false);
  await f.check(); assert.deepEqual(f.discarded, [1]);
});
