'use strict';

var now = Date.now();

var prefs = {
  period: 10 * 60, // in seconds
  audio: true, // audio = true => do not suspend if audio is playing
  pinned: false, // pinned = true => do not suspend if tab is pinned
  form: true, // form = true => do not suspend if form data is changed
  battery: false, // battery = true => only suspend if power is disconnected,
  log: false,
  mode: 'time-based',
  whitelist: []
};

var log = (...args) => prefs.log && console.log(...args);
var form = false;

var tools = {};
// return true if tab is not supposed to be suspended
tools.audio = () => {
  if (prefs.audio) {
    return new Promise(resolve => chrome.runtime.sendMessage({
      method: 'is-playing'
    }, resolve));
  }
  else {
    Promise.resolve(false);
  }
};
tools.pinned = () => {
  if (prefs.pinned === false) {
    return Promise.resolve(false);
  }
  return new Promise(resolve => chrome.runtime.sendMessage({
    method: 'is-pinned'
  }, resolve));
};
tools.battery = () => {
  if (prefs.battery === false) {
    return Promise.resolve(false);
  }
  return new Promise(resolve => navigator.getBattery()
    .then(b => resolve(b.dischargingTime === Infinity)));
};
tools.form = () => {
  if (prefs.form === false) {
    return Promise.resolve(false);
  }
  return Promise.resolve(form);
};
tools.whitelist = () => {
  const {hostname, href} = document.location;
  const hl = prefs.whitelist.filter(s => s.startsWith('re:') === false);
  const rl = prefs.whitelist.filter(s => s.startsWith('re:') === true).map(s => s.substr(3));

  if (hl.indexOf(hostname) !== -1) {
    return Promise.resolve(true);
  }
  return Promise.resolve(rl.some(s => {
    try {
      return (new RegExp(s)).test(href);
    }
    catch (e) {
      console.log('regex error', e);
    }
  }));
};

tools.all = () => Promise.all([
  tools.audio(),
  tools.pinned(),
  tools.battery(),
  tools.form(),
  tools.whitelist()
]).then(([audio, pinned, battery, form, whitelist]) => {
  if (audio) {
    log('Tab discard is skipped', 'Audio is playing');
  }
  if (pinned) {
    log('Tab discard is skipped', 'Tab is pinned');
  }
  if (battery) {
    log('Tab discard is skipped', 'Power is plugged-in');
  }
  if (form) {
    log('Tab discard is skipped', 'Unsaved form is detected');
  }
  if (whitelist) {
    log('Tab discard is skipped', 'Hostname is in the list');
  }
  if (audio || pinned || battery || form || whitelist) {
    return true;
  }
});

var timer = {
  id: null,
  time: Infinity,
  set: (period, bypass = false) => {
    window.clearTimeout(timer.id);
    timer.time = Date.now() + (period || prefs.period * 1000);
    timer.id = window.setTimeout(timer.discard, period || prefs.period * 1000, bypass);
  },
  clear: () => {
    window.clearTimeout(timer.id);
    timer.time = Infinity;
  },
  check: () => {
    log('check timeouts', Date.now() > timer.time);
    if (Date.now() > timer.time) {
      timer.discard();
    }
  }
};

timer.discard = (bypass = false) => tools.all().then(r => {
  if (r && bypass === false) {
    log('skipped', 'double check before discarding');
  }
  log('discarding');
/*  chrome.runtime.sendMessage({
    method: 'discard'
  });*/
});

var check = (period, manual = false, bypass = false) => {
  if (prefs.mode === 'number-based' && bypass === false) {
    return log('skipped', 'number-based discarding');
  }
  if (document.hidden && (prefs.period || manual)) {
    tools.all().then(r => {
      if (r) {
        if (bypass === false) {
          return timer.clear();
        }
      }
      timer.set(period, bypass);
    });
  }
};

document.addEventListener('visibilitychange', () => check());
// https://github.com/rNeomy/auto-tab-discard/issues/1
document.addEventListener('DOMContentLoaded', () => check());

chrome.runtime.onMessage.addListener(({method}, sender, response) => {
  if (method === 'idle') {
    timer.check();
  }
  else if (method === 'can-discard') {
    check(1, true);
  }
  else if (method === 'bypass-discard') {
    check(1, true, true);
  }
  else if (method === 'introduce') {
    tools.all().then(exception => response({
      exception,
      now
    }));
    return true;
  }
});

// messages
var aID;
window.addEventListener('message', e => {
  if (e.data && e.data.cmd === 'ntd-command') {
    e.preventDefault();
    if (e.data.form) {
      form = e.data.form;
    }
    if ('audio' in e.data) { // check when media status is changed
      window.clearTimeout(aID);
      aID = window.setTimeout(() => check(), e.data.audio ? 0 : 5000);
    }
  }
});

// prefs
chrome.storage.local.get(prefs, ps => Object.assign(prefs, ps));
chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
  if (ps.period || ps.mode) {
    check();
  }
});
