'use strict';

var tab;

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

var init = () => chrome.tabs.query({
  active: true,
  currentWindow: true
}, tabs => {
  if (tabs.length) {
    tab = tabs[0];
    console.log(tab);
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
  else if (cmd.startsWith('move-') || cmd === 'close') {
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
