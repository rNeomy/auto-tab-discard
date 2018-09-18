/* globals isFirefox, discard */
'use strict';

{
  const hidden = {};

  hidden.install = () => chrome.storage.local.get({
    'go-hidden': false
  }, prefs => {
    chrome.tabs.onUpdated.removeListener(hidden.observe);
    if (prefs['go-hidden']) {
      chrome.tabs.onUpdated.addListener(hidden.observe);
    }
  });

  hidden.observe = (id, info, tab) => {
    if ('hidden' in info && tab.url.startsWith('http')) {
      if (tab.hidden && tab.discarded === false) {
        chrome.storage.local.get({
          'go-hidden': false
        }, prefs => prefs['go-hidden'] && discard(tab));
      }
    }
  };

  chrome.storage.onChanged.addListener(prefs => prefs['go-hidden'] && hidden.install());
  if (isFirefox) {
    hidden.install();
  }
  else {
    chrome.runtime.onInstalled.addListener(hidden.install);
    chrome.runtime.onStartup.addListener(hidden.install);
  }
}
