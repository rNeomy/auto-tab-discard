'use strict';

var tab;

document.addEventListener('click', ({target}) => {
  const cmd = target.dataset.cmd;

  if (cmd === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  else if (cmd.startsWith('move-') || cmd === 'close') {
    chrome.tabs.query({
      currentWindow: true,
      discarded: false
    }, tbs => {
      const active = tbs.filter(tbs => tbs.active).shift();
      const next = tbs.filter(t => t.index > active.index).shift();
      const previous = tbs.filter(t => t.index < active.index).pop();
      const ntab = (cmd === 'move-next' ? next : previous) || previous || next;
      if (ntab) {
        chrome.tabs.update(ntab.id, {
          active: true
        }, () => {
          if (cmd === 'close') {
            chrome.tabs.remove(tab.id);
          }
        });
      }
      else {
        chrome.runtime.sendMessage({
          method: 'notify',
          message: 'No active tab present'
        });
      }
    });
  }
  else if (cmd) {
    chrome.runtime.sendMessage({
      method: 'popup',
      cmd
    }, () => window.close());
  }
});

var allowed = document.getElementById('allowed');
allowed.addEventListener('change', () => {
  try {
    chrome.tabs.update(tab.id, {
      autoDiscardable: allowed.checked === false
    });
  }
  catch (e) { // Firefox
    chrome.tabs.executeScript(tab.id, {
      code: `allowed = ${allowed.checked === false};`
    });
  }
});

var whitelist = document.querySelector('[data-cmd=whitelist-domain]');

chrome.tabs.query({
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
  }
});

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'disable-whitelist-domain') {
    whitelist.dataset.disabled = true;
    whitelist.textContent += ' (already listed)';
  }
});
