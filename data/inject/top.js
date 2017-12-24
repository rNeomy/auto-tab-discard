'use strict';

var prefs = {
  period: 10 * 60, // in seconds
  audio: true, // audio = true => do not suspend if audio is playing
  pinned: false, // pinned = true => do not suspend if tab is pinned
  form: true, // form = true => do not suspend if form data is changed
  battery: false, // battery = true => only suspend if power is disconnected,
  log: false,
  whitelist: []
};

var audio = false;
var form = false;

var timer = {
  id: null,
  time: Infinity,
  set: period => {
    window.clearTimeout(timer.id);
    timer.time = Date.now() + (period || prefs.period * 1000);
    timer.id = window.setTimeout(timer.discard, period || prefs.period * 1000);
  },
  clear: () => {
    window.clearTimeout(timer.id);
    timer.time = Infinity;
  },
  check: () => {
    if (prefs.log) {
      console.log('check timeouts', Date.now() > timer.time);
    }
    if (Date.now() > timer.time) {
      timer.discard();
    }
  }
};
timer.discard = () => {
  if (prefs.log) {
    console.log('discard now');
  }
  chrome.runtime.sendMessage({
    method: 'discard'
  });
};

var tools = {};
// return true if tab is not supposed to be suspended
tools.audio = () => Promise.resolve(prefs.audio === true ? audio : false);
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
  const {hostname} = document.location;
  return Promise.resolve(prefs.whitelist.indexOf(hostname) !== -1);
};

var check = period => {
  if (document.hidden && prefs.period) {
    Promise.all([
      tools.audio(),
      tools.pinned(),
      tools.battery(),
      tools.form(),
      tools.whitelist()
    ]).then(([audio, pinned, battery, form, whitelist]) => {
      if (audio && prefs.log) {
        console.log('Tab discard is skipped', 'Audio is playing');
      }
      if (pinned && prefs.log) {
        console.log('Tab discard is skipped', 'Tab is pinned');
      }
      if (battery && prefs.log) {
        console.log('Tab discard is skipped', 'Power is plugged-in');
      }
      if (form && prefs.log) {
        console.log('Tab discard is skipped', 'Unsaved form is detected');
      }
      if (whitelist && prefs.log) {
        console.log('Tab discard is skipped', 'Hostname is in the list');
      }
      if (audio || pinned || battery || form || whitelist) {
        return timer.clear();
      }
      timer.set(period);
    });
  }
};

document.addEventListener('visibilitychange', () => check());

chrome.runtime.onMessage.addListener(({method}) => {
  if (method === 'idle') {
    timer.check();
  }
  else if (method === 'can-discard') {
    check(1);
  }
});

// messages
window.addEventListener('message', e => {
  if (e.data && e.data.cmd === 'ntd-command') {
    e.preventDefault();
    if (e.data.audio) {
      audio = e.data.audio;
    }
    if (e.data.form) {
      form = e.data.form;
    }
  }
});

// prefs
chrome.storage.local.get(prefs, ps => Object.assign(prefs, ps));
chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
  if (ps.period) {
    check();
  }
});
