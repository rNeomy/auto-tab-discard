/* global log, query */

const run = tab => {
  chrome.tabs.executeScript(tab.id, {
    runAt: 'document_idle',
    code: `{
      if (document.hidden) {
        chrome.runtime.sendMessage({
          method: 'discard.on.load'
        });
      }
    }`
  }, () => chrome.runtime.lastError);
};

const observe = tab => tab.active === false && run(tab);

function enable() {
  log('new.enable is called');
  chrome.tabs.onCreated.addListener(observe);
  query({
    url: '*://*/*',
    status: 'loading',
    active: false
  }).then(tabs => tabs.forEach(run));
}
function disable() {
  log('new.disable is called');
  chrome.tabs.onCreated.removeListener(observe);
}

export {
  enable,
  disable
};
