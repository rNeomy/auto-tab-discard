/* global log, query */

const run = tab => {
  chrome.tabs.executeScript(tab.id, {
    runAt: 'document_start',
    code: `{
      const run = () => chrome.runtime.sendMessage({
        method: 'discard.on.load'
      });
      if (document.readyState === 'uninitialized' || document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
      }
      else {
        run();
      }
    }`
  }, () => chrome.runtime.lastError);
};

const observe = {
  tab: tab => tab.active === false && run(tab),
  window: win => {
    setTimeout(() => chrome.tabs.query({
      windowId: win.id,
      active: false
    }, tbs => tbs.forEach(observe.tab)), 0);
  }
};

function enable() {
  log('new.enable is called');
  chrome.tabs.onCreated.addListener(observe.tab);
  chrome.windows.onCreated.addListener(observe.window);
  query({
    url: '*://*/*',
    status: 'loading',
    active: false
  }).then(tabs => tabs.forEach(run));
}
function disable() {
  log('new.disable is called');
  chrome.tabs.onCreated.removeListener(observe.tab);
  chrome.windows.onCreated.removeListener(observe.window);
}

export {
  enable,
  disable
};
