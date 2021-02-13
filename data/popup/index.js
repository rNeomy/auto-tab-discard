'use strict';

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
  if (e.dataset.i18nTitle) {
    e.title = chrome.i18n.getMessage(e.dataset.i18nTitle);
  }
});

let tab;

const allowed = document.getElementById('allowed');
allowed.addEventListener('change', () => chrome.runtime.sendMessage({
  method: 'tabs.update',
  tabId: tab.id,
  updateProperties: {
    autoDiscardable: allowed.checked === false
  }
}));

const whitelist = {
  always: document.querySelector('[data-cmd=whitelist-domain]'),
  session: document.querySelector('[data-cmd=whitelist-session]')
};

const init = () => {
  chrome.runtime.sendMessage({
    method: 'tabs.query',
    queryInfo: {
      active: true,
      currentWindow: true
    }
  }, tabs => {
    if (tabs.length) {
      tab = tabs[0];
      const {protocol = '', hostname} = new URL(tab.url);

      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        const match = list => {
          if (list.filter(s => s.startsWith('re:') === false).indexOf(hostname) !== -1) {
            return true;
          }
          if (list.filter(s => s.startsWith('re:') === true).map(s => s.substr(3)).some(s => {
            try {
              return (new RegExp(s)).test(tab.url);
            }
            catch (e) {}
          })) {
            return true;
          }
        };
        chrome.runtime.sendMessage({
          method: 'storage',
          prefs: {
            'whitelist': [],
            'whitelist.session': []
          }
        }, prefs => {
          whitelist.session.dataset.disabled = match(prefs['whitelist.session']) ? true : false;
          whitelist.always.dataset.disabled = match(prefs['whitelist']) ? true : false;
        });
        if (tab.autoDiscardable === false) {
          allowed.checked = true;
        }
        chrome.tabs.executeScript(tab.id, {
          code: 'document.title'
        }, () => {
          const lastError = chrome.runtime.lastError;
          allowed.parentNode.dataset.disabled = lastError ? true : false;
        });
      }
      else { // on navigation
        whitelist.session.dataset.disabled = true;
        whitelist.always.dataset.disabled = true;
        allowed.parentNode.dataset.disabled = true;
      }
    }
  });
};
init();

document.addEventListener('click', e => {
  const {target} = e;
  const cmd = target.dataset.cmd;

  if (cmd === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  else if (cmd && (cmd.startsWith('move-') || cmd === 'close')) {
    chrome.runtime.sendMessage({
      method: cmd,
      cmd
    }, init);
  }
  else if (cmd) {
    chrome.runtime.sendMessage({
      method: 'popup',
      cmd,
      shiftKey: e.shiftKey
    }, () => window.close());
  }
});
