'use strict';

// trash old discarded tabs
const trash = {
  observe(tabId, changeInfo) {
    if ('discarded' in changeInfo) {
      chrome.storage.local.get({
        'trash.list': {}
      }, prefs => {
        if (changeInfo.discarded) {
          prefs['trash.list'][tabId] = Date.now();
        }
        else {
          delete prefs['trash.list'][tabId];
        }
        chrome.storage.local.set(prefs);
      });
    }
  },
  observeRemoval(tabId) {
    trash.observe(tabId, {
      discarded: false
    });
  },
  install() {
    chrome.tabs.onUpdated.addListener(trash.observe);
    chrome.tabs.onRemoved.addListener(trash.observeRemoval);

    chrome.storage.local.get({
      'trash.interval': 30 // in minutes
    }, prefs => chrome.alarms.create('trash.check', {
      when: Date.now() + prefs['trash.interval'] * 60 * 1000,
      periodInMinutes: prefs['trash.interval']
    }));

    // ignore previous config. Reset all
    chrome.tabs.query({
      discarded: true
    }, tabs => chrome.storage.local.set({
      'trash.list': tabs.reduce((p, c) => {
        p[c.id] = Date.now();
        return p;
      }, {})
    }));
  },
  abort() {
    chrome.tabs.onUpdated.removeListener(trash.observe);
    chrome.tabs.onRemoved.removeListener(trash.observeRemoval);
    chrome.alarms.clear('trash.check');
  }
};
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'trash.check') {
    chrome.storage.local.get({
      'trash.list': {},
      'trash.period': 24 // in hours
    }, prefs => {
      const now = Date.now();
      Object.entries(prefs['trash.list']).forEach(([key, value]) => {
        if (now - value > prefs['trash.period'] * 60 * 60 * 1000) {
          delete prefs['trash.list'][key];
          chrome.tabs.remove(Number(key), () => chrome.runtime.lastError);
        }
      });
      chrome.storage.local.set(prefs);
    });
  }
});

{
  const startup = () => chrome.storage.local.get({
    'trash.enabled': false
  }, prefs => prefs['trash.enabled'] && trash.install());

  chrome.storage.onChanged.addListener(ps => {
    if (ps['trash.enabled']) {
      trash[ps['trash.enabled'].newValue ? 'install' : 'abort']();
    }
  });

  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
}
