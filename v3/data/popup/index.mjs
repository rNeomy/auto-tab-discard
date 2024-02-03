import {match} from '../../worker/core/utils.mjs';

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
  if (e.dataset.i18nTitle) {
    e.title = chrome.i18n.getMessage(e.dataset.i18nTitle);
  }
});

let tab;

// works on all highlighted tabs in the current window
const allowed = document.getElementById('allowed');
allowed.addEventListener('change', () => chrome.tabs.query({
  currentWindow: true,
  highlighted: true
}, async tabs => {
  for (const tab of tabs) {
    await new Promise(resolve => chrome.tabs.update(tab.id, {
      autoDiscardable: allowed.checked === false
    }, resolve));
  }
  chrome.runtime.sendMessage({
    method: 'run-check-on-action',
    ids: tabs.map(t => t.id)
  });
}));

const whitelist = {
  always: document.querySelector('[data-cmd=whitelist-domain]'),
  session: document.querySelector('[data-cmd=whitelist-session]')
};

const init = () => {
  chrome.alarms.get('tmp.disable', a => {
    chrome.runtime.sendMessage({
      'method': 'storage',
      'managed': {
        'tmp_disable': 0
      }
    }, prefs => {
      document.getElementById('tmp_disable').value = a ? prefs['tmp_disable'] : 0;
    });
  });

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs.length) {
      tab = tabs[0];

      try {
        const {protocol = '', hostname} = new URL(tab.url);

        if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
          chrome.runtime.sendMessage({
            'method': 'storage',
            'managed': {
              'whitelist': []
            },
            'session': {
              'whitelist.session': []
            }
          }, prefs => {
            whitelist.session.checked = match(prefs['whitelist.session'], hostname, tab.url) ? true : false;
            whitelist.always.checked = match(prefs['whitelist'], hostname, tab.url) ? true : false;
          });
          if (tab.autoDiscardable === false) {
            allowed.checked = true;
          }
          chrome.scripting.executeScript({
            target: {
              tabId: tab.id
            },
            func: () => document.title
          }).catch(e => {
            console.warn('Cannot access to this tab', e);
            allowed.parentElement.dataset.disabled = true;
          });
        }
        else {
          throw Error('no HTTP');
        }
      }
      catch (e) {
        // on navigation
        whitelist.session.closest('.mlt').dataset.disabled = true;
        allowed.parentElement.dataset.disabled = true;
      }
    }
  });
  /* disable unavailable releasing options */
  chrome.tabs.query({
    currentWindow: true,
    discarded: true
  }, tabs => {
    if (tabs.length === 0) {
      document.querySelector('[data-cmd=release-window]').classList.add('disabled');
    }
    if (tabs.some(t => t.index > tab.index) === false) {
      document.querySelector('[data-cmd=release-rights]').classList.add('disabled');
    }
    if (tabs.some(t => t.index < tab.index) === false) {
      document.querySelector('[data-cmd=release-lefts]').classList.add('disabled');
    }
  });
  chrome.tabs.query({
    currentWindow: false,
    discarded: true
  }, tabs => {
    if (tabs.length === 0) {
      document.querySelector('[data-cmd=release-other-windows]').classList.add('disabled');
    }
  });
  chrome.tabs.query({
    discarded: true
  }, tabs => {
    if (tabs.length === 0) {
      document.querySelector('[data-cmd=release-tabs]').classList.add('disabled');
    }
  });
};
init();

document.addEventListener('click', e => {
  const {target} = e;
  const cmd = target.dataset.cmd;

  if (cmd === 'open-options') {
    chrome.runtime.openOptionsPage();
    window.close();
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
      shiftKey: e.shiftKey,
      checked: e.target.checked
    }, () => {
      if (['whitelist-session', 'whitelist-domain'].includes(cmd) === false) {
        window.close();
      }
      chrome.runtime.lastError;
    });
  }
});

document.getElementById('tmp_disable').addEventListener('change', e => {
  chrome.storage.local.set({
    'tmp_disable': Number(e.target.value)
  });
});
