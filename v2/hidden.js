/* globals discard, prefs */
'use strict';

const hidden = {};

hidden.install = () => {
  chrome.tabs.onUpdated.removeListener(hidden.observe);
  if (prefs['go-hidden']) {
    chrome.tabs.onUpdated.addListener(hidden.observe, {
      properties: ['hidden']
    });
  }
};

hidden.observe = (id, info, tab) => {
  if ('hidden' in info && tab.url.startsWith('http')) {
    if (tab.hidden && tab.discarded === false && prefs['go-hidden']) {
      discard(tab);
    }
  }
};
