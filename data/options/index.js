'use strict';

const restore = () => chrome.storage.local.get({
  period: 10 * 60, // in seconds
  'period-url': 10 * 60, // in seconds
  number: 6, // number of tabs before triggering discard
  audio: true, // audio = true => do not suspend if audio is playing
  pinned: false, // pinned = true => do not suspend if tab is pinned
  form: true, // form = true => do not suspend if form data is changed
  battery: false, // battery = true => only suspend if power is disconnected,
  'notification.permission': true, // true => do not discard
  log: false,
  whitelist: [],
  'whitelist-url': [],
  mode: 'time-based'
}, prefs => {
  document.getElementById('period').value = prefs.period;
  document.getElementById('period-url').value = prefs['period-url'];
  document.getElementById('number').value = prefs.number;
  document.getElementById('audio').checked = prefs.audio;
  document.getElementById('pinned').checked = prefs.pinned;
  document.getElementById('form').checked = prefs.form;
  document.getElementById('battery').checked = prefs.battery;
  document.getElementById('notification.permission').checked = prefs['notification.permission'];
  document.getElementById('log').checked = prefs.log;
  document.getElementById('whitelist').value = prefs.whitelist.join(', ');
  document.getElementById('whitelist-url').value = prefs['whitelist-url'].join(', ');
  document.getElementById(prefs.mode).checked = true;
});

document.getElementById('save').addEventListener('click', () => {
  let period = document.getElementById('period').value;
  period = Number(period);
  period = Math.max(period, 0);
  let number = document.getElementById('number').value;
  number = Number(number);
  number = Math.max(number, 3);

  if (period !== 0) {
    period = Math.max(period, 10);
  }
  chrome.storage.local.set({
    period,
    'period-url': Math.max(10, Number(document.getElementById('period-url').value)),
    number,
    mode: document.querySelector('[name=mode]:checked').id,
    audio: document.getElementById('audio').checked,
    pinned: document.getElementById('pinned').checked,
    form: document.getElementById('form').checked,
    battery: document.getElementById('battery').checked,
    'notification.permission': document.getElementById('notification.permission').checked,
    log: document.getElementById('log').checked,
    whitelist: document.getElementById('whitelist').value
      .split(',')
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'whitelist-url': document.getElementById('whitelist-url').value
      .split(',')
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i)
  }, () => {
    const info = document.getElementById('info');
    info.textContent = 'Options saved';
    restore();
    window.setTimeout(() => info.textContent = '', 750);
  });
});

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.paypal.me/addondonation/10usd'
}));

document.addEventListener('DOMContentLoaded', restore);
