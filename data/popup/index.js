'use strict';

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
allowed.addEventListener('change', () =>       chrome.tabs.executeScript({
  code: `allowed = ${allowed.checked === false}`
}))

var whitelist = document.querySelector('[data-cmd=whitelist-domain]');

chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  if (tabs.length) {
    const {protocol = ''} = new URL(tabs[0].url);

    if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
      whitelist.dataset.disabled = false;
      chrome.tabs.executeScript({
        code: `tools.whitelist().then(bol => bol && chrome.runtime.sendMessage({
          method: 'disable-whitelist-domain'
        }));`
      });

      chrome.tabs.executeScript({
        code: 'allowed'
      }, ([a]) => {
        if (a === false || a === true) {
          allowed.parentNode.dataset.disabled = false;
        }
        allowed.checked = !a
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
