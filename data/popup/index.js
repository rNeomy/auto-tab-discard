'use strict';

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
});

let tab;

const allowed = document.getElementById('allowed');
allowed.addEventListener('change', () => chrome.runtime.sendMessage({
  method: 'popup',
  cmd: 'auto-discardable',
  value: allowed.checked === false
}));

const whitelist = document.querySelector('[data-cmd=whitelist-domain]');

const init = () => chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  if (tabs.length) {
    tab = tabs[0];
    const {protocol = ''} = new URL(tab.url);

    if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
      whitelist.dataset.disabled = false;
      chrome.tabs.executeScript(tab.id, {
        code: `tools.whitelist().then(bol => bol && chrome.runtime.sendMessage({
          method: 'disable-whitelist-domain'
        }));`
      });

      chrome.tabs.executeScript(tab.id, {
        code: 'allowed'
      }, ([a]) => {
        allowed.parentNode.dataset.disabled = typeof a !== 'boolean';
        allowed.checked = !a;
      });
    }
    else { // on navigation
      whitelist.dataset.disabled = true;
      allowed.parentNode.dataset.disabled = true;
    }
  }
});
init();

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'disable-whitelist-domain') {
    whitelist.dataset.disabled = true;
    whitelist.textContent += ' (already listed)';
  }
});

document.addEventListener('click', ({target}) => {
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
      cmd
    }, () => window.close());
  }
});
