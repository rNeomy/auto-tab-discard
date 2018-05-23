'use strict';

var tab;
const isFirefox = /Firefox/.test(navigator.userAgent);

document.addEventListener('click', ({target}) => {
  const cmd = target.dataset.cmd;

  if (cmd === 'open-options') {
    chrome.runtime.openOptionsPage();
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
  if (isFirefox) { // Firefox does not support autoDiscardable for tab.update yet
    chrome.tabs.executeScript(tab.id, {
      code: `allowed = ${allowed.checked === false};`
    });
  }
  else {
    chrome.tabs.update(tab.id, {
      autoDiscardable: allowed.checked === false
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
        console.log(a);
        if (a === false || a === true) {
          allowed.parentNode.dataset.disabled = false;
        }
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
