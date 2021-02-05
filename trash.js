/* global storage, log, starters */
'use strict';

// trash old discarded tabs
const trash = {
  observe(tabId, changeInfo) {
    if ('discarded' in changeInfo) {
      log('trash.observe is called');
      storage({
        'trash.list': {}
      }).then(prefs => {
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
    log('trash.install is called');
    chrome.tabs.onUpdated.addListener(trash.observe);
    chrome.tabs.onRemoved.addListener(trash.observeRemoval);

    storage({
      'trash.interval': 30 // in minutes
    }).then(prefs => chrome.alarms.create('trash.check', {
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
    log('trash.abort is called');
    chrome.tabs.onUpdated.removeListener(trash.observe);
    chrome.tabs.onRemoved.removeListener(trash.observeRemoval);
    chrome.alarms.clear('trash.check');
  }
};
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'trash.check') {
    log('alarm fire', 'trash.check', alarm.name);
    storage({
      'trash.list': {},
      'trash.period': 24 // in hours
    }).then(prefs => {
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
  const startup = () => storage({
    'trash.enabled': false
  }).then(prefs => prefs['trash.enabled'] && trash.install());

  chrome.storage.onChanged.addListener(ps => {
    if (ps['trash.enabled']) {
      trash[ps['trash.enabled'].newValue ? 'install' : 'abort']();
    }
  });

  starters.push(startup);
}
