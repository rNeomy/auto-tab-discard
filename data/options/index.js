'use strict';

const isFirefox = /Firefox/.test(navigator.userAgent);

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
});

// memory
if (!window.performance || !window.performance.memory) {
  document.getElementById('memory').style = `
    pointer-events: none;
    opacity: 0.4;
  `;
}
// battery
if (!navigator.getBattery) {
  document.getElementById('battery').style = `
    pointer-events: none;
    opacity: 0.4;
  `;
}

const info = document.getElementById('info');

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});
const restore = () => storage({
  'period': 10 * 60, // in seconds
  'number': 6, // number of tabs before triggering discard
  'trash.period': 24, // in hours
  'audio': true, // audio = true => do not discard if audio is playing
  'pinned': false, // pinned = true => do not discard if tab is pinned
  'form': true, // form = true => do not discard if form data is changed
  'battery': false, // battery = true => only discard if power is disconnected
  'online': false, // online = true => do not discard if there is no INTERNET connection
  'notification.permission': false, // true => do not discard
  'page.context': false,
  'tab.context': true,
  'link.context': true,
  'log': false,
  'whitelist': [],
  'whitelist-url': [],
  'mode': 'time-based',
  'click': 'click.popup',
  'faqs': true,
  'use-cache': false,
  'favicon': true,
  'go-hidden': false,
  'memory-enabled': false,
  'memory-value': 60,
  'favicon-delay': isFirefox ? 500 : 100,
  'check-delay': 30 * 1000,
  'simultaneous-jobs': 10,
  'idle': false,
  'idle-timeout': 5 * 60,
  'startup-unpinned': false,
  'startup-pinned': false,
  'startup-release-pinned': false
}).then(prefs => {
  if (navigator.getBattery === undefined) {
    document.getElementById('battery_enabled').closest('tr').disabled = true;
  }
  document.getElementById('idle').checked = prefs.idle;
  document.getElementById('idle-timeout').value = parseInt(prefs['idle-timeout'] / 60);
  document.getElementById('faqs').checked = prefs.faqs;
  document.getElementById('use-cache').checked = prefs['use-cache'];
  document.getElementById('favicon').checked = prefs.favicon;
  document.getElementById('go-hidden').checked = prefs['go-hidden'];
  document.getElementById('period').value = prefs.period;
  document.getElementById('trash.period').value = prefs['trash.period'];
  document.getElementById('number').value = prefs.number;
  document.getElementById('simultaneous-jobs').value = prefs['simultaneous-jobs'];
  document.getElementById('favicon-delay').value = prefs['favicon-delay'];
  document.getElementById('check-delay').value = parseInt(prefs['check-delay'] / 1000);
  document.getElementById('audio').checked = prefs.audio;
  document.getElementById('pinned').checked = prefs.pinned;
  document.getElementById('form').checked = prefs.form;
  document.getElementById('battery_enabled').checked = prefs.battery;
  document.getElementById('online').checked = prefs.online;
  document.getElementById('notification.permission').checked = prefs['notification.permission'];
  document.getElementById('page.context').checked = prefs['page.context'];
  document.getElementById('tab.context').checked = prefs['tab.context'];
  document.getElementById('link.context').checked = prefs['link.context'];
  document.getElementById('log').checked = prefs.log;
  document.getElementById('whitelist').value = prefs.whitelist.join(', ');
  document.getElementById('whitelist-url').value = prefs['whitelist-url'].join(', ');
  document.getElementById('memory-enabled').checked = prefs['memory-enabled'];
  document.getElementById('memory-value').value = prefs['memory-value'];
  document.getElementById('startup-unpinned').checked = prefs['startup-unpinned'];
  document.getElementById('startup-pinned').checked = prefs['startup-pinned'];
  document.getElementById('startup-release-pinned').checked = prefs['startup-release-pinned'];
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
  number = Math.max(number, 1);
  let trash = document.getElementById('trash.period').value;
  trash = Number(trash);
  trash = Math.max(trash, 1);

  if (period !== 0) {
    period = Math.max(period, 10);
  }
  const click = document.querySelector('[name=left-click]:checked').id;
  localStorage.setItem('click', click.replace('click.', ''));
  chrome.storage.local.set({
    'idle': document.getElementById('idle').checked,
    'idle-timeout': Math.max(1, Number(document.getElementById('idle-timeout').value)) * 60,
    period,
    number,
    'trash.period': trash,
    'mode': document.getElementById('url-based').checked ? 'url-based' : 'time-based',
    click,
    'audio': document.getElementById('audio').checked,
    'pinned': document.getElementById('pinned').checked,
    'form': document.getElementById('form').checked,
    'battery': document.getElementById('battery_enabled').checked,
    'online': document.getElementById('online').checked,
    'notification.permission': document.getElementById('notification.permission').checked,
    'page.context': document.getElementById('page.context').checked,
    'tab.context': document.getElementById('tab.context').checked,
    'link.context': document.getElementById('link.context').checked,
    'log': document.getElementById('log').checked,
    'faqs': document.getElementById('faqs').checked,
    'use-cache': document.getElementById('use-cache').checked,
    'favicon': document.getElementById('favicon').checked,
    'go-hidden': document.getElementById('go-hidden').checked,
    'simultaneous-jobs': Math.max(1, Number(document.getElementById('simultaneous-jobs').value)),
    'favicon-delay': Math.max(100, Number(document.getElementById('favicon-delay').value)),
    'check-delay': Math.max(1, Number(document.getElementById('check-delay').value)) * 1000,
    'whitelist': document.getElementById('whitelist').value
      .split(/[,\n]/)
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'whitelist-url': document.getElementById('whitelist-url').value
      .split(/[,\n]/)
      .map(s => s.trim())
      .map(s => s.startsWith('http') || s.startsWith('ftp') ? (new URL(s)).hostname : s)
      .filter((h, i, l) => h && l.indexOf(h) === i),
    'memory-enabled': document.getElementById('memory-enabled').checked,
    'memory-value': Math.max(10, Number(document.getElementById('memory-value').value)),
    'startup-unpinned': document.getElementById('startup-unpinned').checked,
    'startup-pinned': document.getElementById('startup-pinned').checked,
    'startup-release-pinned': document.getElementById('startup-release-pinned').checked
  }, () => {
    info.textContent = 'Options saved';
    restore();
    window.setTimeout(() => info.textContent = '', 750);
  });
});

document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

document.addEventListener('DOMContentLoaded', restore);

// restart if needed
const onChanged = prefs => {
  const tab = prefs['tab.context'];
  const page = prefs['page.context'];
  const link = prefs['link.context'];
  if (tab || page || link) { // Firefox
    if ((tab && (tab.newValue !== tab.oldValue)) ||
      (page && (page.newValue !== page.oldValue)) ||
      (link && (link.newValue !== link.oldValue))) {
      chrome.runtime.sendMessage({
        method: 'build-context'
      });
    }
  }
};
chrome.storage.onChanged.addListener(onChanged);
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
  document.getElementById('rate').href = 'https://addons.mozilla.org/firefox/addon/auto-tab-discard/reviews/';
}
else if (/Edg\//.test(navigator.userAgent)) {
  document.getElementById('rate').href = 'https://microsoftedge.microsoft.com/addons/detail/nfkkljlcjnkngcmdpcammanncbhkndfe';
}
// export
document.getElementById('export').addEventListener('click', () => {
  chrome.storage.local.get(null, prefs => {
    const obj = Object.keys(localStorage).reduce((p, c) => {
      p[c] = localStorage.getItem(c);
      return p;
    }, {});

    const text = JSON.stringify({
      'chrome.storage.local': prefs,
      'localStorage': obj
    }, null, '  ');
    const blob = new Blob([text], {type: 'application/json'});
    const objectURL = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'application/json',
      download: 'auto-tab-discard-preferences.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
  });
});
// import
document.getElementById('import').addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.style.display = 'none';
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.acceptCharset = 'utf-8';

  document.body.appendChild(fileInput);
  fileInput.initialValue = fileInput.value;
  fileInput.onchange = () => {
    if (fileInput.value !== fileInput.initialValue) {
      const file = fileInput.files[0];
      if (file.size > 100e6) {
        console.warn('100MB backup? I don\'t believe you.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = event => {
        fileInput.remove();
        const json = JSON.parse(event.target.result);
        for (const key in json.localStorage) {
          if (json.localStorage.hasOwnProperty(key)) {
            localStorage.setItem(key, json.localStorage[key]);
          }
        }
        chrome.storage.onChanged.removeListener(onChanged);
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(json['chrome.storage.local'], () => {
            chrome.runtime.reload();
            window.close();
          });
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  fileInput.click();
});
