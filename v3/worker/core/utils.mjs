import {prefs} from './prefs.mjs';

const log = (...args) => prefs.log && console.log((new Date()).toLocaleTimeString(), ...args);

const notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  message: e.message || e
});

const query = options => chrome.tabs.query(options);

const match = (list, hostname, href) => {
  if (list.filter(s => s.startsWith('re:') === false).indexOf(hostname) !== -1) {
    return true;
  }
  if (list.filter(s => s.startsWith('re:') === true).map(s => s.substr(3)).some(s => {
    try {
      return (new RegExp(s)).test(href);
    }
    catch (e) {}
  })) {
    return true;
  }
};

const icon = {
  disabled(tab, title) {
    chrome.action.setTitle({
      tabId: tab.id,
      title
    }, () => chrome.runtime.lastError);
    chrome.action.setIcon({
      tabId: tab.id,
      path: {
        '16': '/data/icons/disabled/16.png',
        '32': '/data/icons/disabled/32.png'
      }
    });
  },
  reset(tab) {
    chrome.action.setTitle({
      tabId: tab.id,
      title: chrome.runtime.getManifest().name
    }, () => chrome.runtime.lastError);
    chrome.action.setIcon({
      tabId: tab.id,
      path: {
        '16': '/data/icons/16.png',
        '32': '/data/icons/32.png'
      }
    });
  }
};

export {query, notify, log, match, icon};

