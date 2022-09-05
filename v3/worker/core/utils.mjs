import {prefs} from './prefs.mjs';

const log = (...args) => prefs.log && console.log(new Date(), ...args);

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

export {query, notify, log, match};

