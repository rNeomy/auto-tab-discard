/* global storage, log */
'use strict';

// release next tab
const next = {
  observe(activeInfo) {
    log('check next discarded tab');
    chrome.tabs.get(activeInfo.tabId, tab => chrome.tabs.query({
      windowId: activeInfo.windowId,
      index: tab.index + 1,
      discarded: true
    }, tabs => {
      if (tabs.length) {
        chrome.tabs.reload(tabs[0].id);
      }
    }));
  },
  install() {
    log('next.install is called');
    chrome.tabs.onActivated.addListener(next.observe);
  },
  abort() {
    log('next.abort is called');
    chrome.tabs.onActivated.removeListener(next.observe);
  }
};

{
  const startup = () => storage({
    'release-next-tab': false
  }).then(prefs => prefs['release-next-tab'] && next.install());

  chrome.storage.onChanged.addListener(ps => {
    if (ps['release-next-tab']) {
      next[ps['release-next-tab'].newValue ? 'install' : 'abort']();
    }
  });

  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
}
