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

chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  if (tabs.length) {
    const {protocol = ''} = new URL(tabs[0].url);
    const e = document.querySelector('[data-cmd="whitelist-domain"]');
    if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
      e.dataset.disabled = false;

      chrome.tabs.executeScript({
        code: `tools.whitelist().then(bol => bol && chrome.runtime.sendMessage({
          method: 'disable-whitelist-domain'
        }));`
      }, arr => console.log(arr));
    }
    else {
      e.textContent += ' (not supported)';
    }
  }
});

chrome.runtime.onMessage.addListener(request => {
  console.log(request);
  if (request.method === 'disable-whitelist-domain') {
    const e = document.querySelector('[data-cmd="whitelist-domain"]');
    e.dataset.disabled = true;
    e.textContent += ' (already listed)';
  }
});
