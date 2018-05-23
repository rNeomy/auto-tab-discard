'use strict';

var now = Date.now();

var prefs = {
  period: 10 * 60, // in seconds
  audio: true, // audio = true => do not suspend if audio is playing
  pinned: false, // pinned = true => do not suspend if tab is pinned
  form: true, // form = true => do not suspend if form data is changed
  battery: false, // battery = true => only suspend if power is disconnected,
  'notification.permission': false,
  log: false,
  mode: 'time-based',
  whitelist: [],
  'whitelist-url': []
};

var allowed = true; // if false, do not discard

chrome.runtime.sendMessage({
  method: 'is-autoDiscardable'
}, b => {
  if (typeof b === 'boolean') {
    allowed = b;
  }
});

var log = (...args) => prefs.log && console.log(...args);
var form = false;

var tools = {};
// return true if tab is not supposed to be suspended
tools.audio = () => {
  if (prefs.audio) {
    return new Promise(resolve => chrome.runtime.sendMessage({
      method: 'is-playing'
    }, r => resolve(r)));
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
tools.whitelist = (list = prefs.whitelist) => {
  const {hostname, href} = document.location;
  const hl = list.filter(s => s.startsWith('re:') === false);
  const rl = list.filter(s => s.startsWith('re:') === true).map(s => s.substr(3));

  if (hl.indexOf(hostname) !== -1) {
    return Promise.resolve(true);
  }
  return Promise.resolve(rl.some(s => {
    try {
      return (new RegExp(s)).test(href);
    }
    catch (e) {
      log('regex error', e);
    }
  }));
};
tools.permission = () => {
  if (prefs['notification.permission'] === false) {
    return Promise.resolve(false);
  }
  return new Promise(resolve => resolve(Notification.permission === 'granted'));
};
tools.urlBased = () => {
  if (prefs.mode === 'url-based') {
    return tools.whitelist(prefs['whitelist-url']).then(a => !a);
  }
  else {
    return Promise.resolve(false);
  }
};

tools.all = () => Promise.all([
  tools.audio(),
  tools.pinned(),
  tools.battery(),
  tools.form(),
  tools.whitelist(),
  tools.permission(),
  tools.urlBased()
]).then(([audio, pinned, battery, form, whitelist, permission, urlBased]) => {
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
  if (permission) {
    log('Tab discard is skipped', 'Tab has granted notification.permission');
  }
  if (urlBased) {
    log('Tab discard is skipped', 'URL does not match with the list');
  }
  if (audio || pinned || battery || form || whitelist || permission || urlBased) {
    return true;
  }
});

var timer = {
  id: null,
  time: Infinity,
  set: period => {
    log('set a new timer');
    window.clearTimeout(timer.id);
    timer.time = Date.now() + (period || prefs.period * 1000);
    timer.id = window.setTimeout(timer.discard, period || prefs.period * 1000);
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

timer.discard = async() => {
  if (allowed === false) {
    return log('skipped', 'not allowed in this session');
  }
  const r = await tools.all();
  if (r) {
    return log('skipped', 'double-check before discarding');
  }
  log('request tabs.check');
  chrome.runtime.sendMessage({
    method: 'tabs.check'
  });
};

var check = async(period) => {
  if (document.hidden && prefs.period) {
    const r = await tools.all();
    if (r) {
      log('skipped', 'condition match');
      return timer.clear();
    }
    timer.set(period);
  }
};
document.addEventListener('visibilitychange', () => {
  now = Date.now();
  setTimeout(check, 0);
});
// https://github.com/rNeomy/auto-tab-discard/issues/1
document.addEventListener('DOMContentLoaded', () => check());

chrome.runtime.onMessage.addListener(({method}, sender, response) => {
  if (method === 'introduce') {
    tools.all().then(exception => response({
      exception,
      ready: document.readyState === 'complete' || document.readyState === 'loaded',
      now,
      allowed
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
chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  // for already loaded tabs
  if (document.readyState === 'complete' || document.readyState === 'loaded') {
    if (document.hidden) {
      check();
    }
  }
});

chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
  if (ps.period || ps.mode) {
    check();
  }
});
