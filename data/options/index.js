'use strict';

const info = document.getElementById('info');

const restore = () => chrome.storage.local.get({
  period: 10 * 60, // in seconds
  number: 6, // number of tabs before triggering discard
  audio: true, // audio = true => do not suspend if audio is playing
  pinned: false, // pinned = true => do not suspend if tab is pinned
  form: true, // form = true => do not suspend if form data is changed
  battery: false, // battery = true => only suspend if power is disconnected,
  'notification.permission': false, // true => do not discard
  'page.context': false,
  'tab.context': true,
  log: false,
  whitelist: [],
  'whitelist-url': [],
  mode: 'time-based',
  click: 'click.popup',
  faqs: true
}, prefs => {
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('period').value = prefs.period;
  document.getElementById('number').value = prefs.number;
  document.getElementById('audio').checked = prefs.audio;
  document.getElementById('pinned').checked = prefs.pinned;
  document.getElementById('form').checked = prefs.form;
  document.getElementById('battery').checked = prefs.battery;
  document.getElementById('notification.permission').checked = prefs['notification.permission'];
  document.getElementById('page.context').checked = prefs['page.context'];
  document.getElementById('tab.context').checked = prefs['tab.context'];
  document.getElementById('log').checked = prefs.log;
  document.getElementById('whitelist').value = prefs.whitelist.join(', ');
  document.getElementById('whitelist-url').value = prefs['whitelist-url'].join(', ');
  if (prefs.mode === 'url-based') {
    document.getElementById('url-based').checked = true;
  }
  document.getElementById(prefs.click).checked = true;
});

document.getElementById('save').addEventListener('click', () => {
  let period = document.getElementById('period').value;
  period = Number(period);
  period = Math.max(period, 0);
  let number = document.getElementById('number').value;
  number = Number(number);
  number = Math.max(number, 0);

  if (period !== 0) {
    period = Math.max(period, 10);
  }
  const click = document.querySelector('[name=left-click]:checked').id;
  localStorage.setItem('click', click.replace('click.', ''));
  chrome.storage.local.set({
    period,
    number,
    mode: document.getElementById('url-based').checked ? 'url-based' : 'time-based',
    click,
    audio: document.getElementById('audio').checked,
    pinned: document.getElementById('pinned').checked,
    form: document.getElementById('form').checked,
    battery: document.getElementById('battery').checked,
    'notification.permission': document.getElementById('notification.permission').checked,
    'page.context': document.getElementById('page.context').checked,
    'tab.context': document.getElementById('tab.context').checked,
    log: document.getElementById('log').checked,
    faqs: document.getElementById('faqs').checked,
    whitelist: document.getElementById('whitelist').value
      .split(/[,\n]/)
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'whitelist-url': document.getElementById('whitelist-url').value
      .split(/[,\n]/)
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i)
  }, () => {
    info.textContent = 'Options saved';
    restore();
    window.setTimeout(() => info.textContent = '', 750);
  });
});

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.paypal.me/addondonation/10usd'
}));

document.addEventListener('DOMContentLoaded', restore);

// restart if needed
chrome.storage.onChanged.addListener(prefs => {
  if (prefs['page.context'] || prefs['tab.context']) {
    window.setTimeout(() => {
      chrome.runtime.reload();
      window.close();
    }, 2000);
  }
});
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    info.textContent = 'Double-click to reset!';
    window.setTimeout(() => info.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// rate
if (/Firefox/.test(navigator.userAgent)) {
  document.getElementById('rate').href = 'https://addons.mozilla.org/en-US/firefox/addon/auto-tab-discard/reviews/';
}
