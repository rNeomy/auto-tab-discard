/* globals isFirefox, discard */
'use strict';

{
  const hidden = {};

  hidden.install = () => chrome.storage.local.get({
    'go-hidden': false
  }, prefs => {
    chrome.tabs.onUpdated.removeListener(hidden.observe);
    if (prefs['go-hidden']) {
      chrome.tabs.onUpdated.addListener(hidden.observe, { properties: ["hidden"] });
    }
  });

  hidden.observe = (id, info, tab) => {
    if ('hidden' in info && tab.url.startsWith('http')) {
      if (tab.hidden && tab.discarded === false) {
        discard(tab);
      }
    }
  };

  if (isFirefox) {
    chrome.storage.onChanged.addListener(prefs => prefs['go-hidden'] && hidden.install());
    hidden.install();
  }
}
