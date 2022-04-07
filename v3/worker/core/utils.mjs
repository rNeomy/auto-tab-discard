import {prefs} from './prefs.mjs';

const log = (...args) => prefs.log && console.log(new Date(), ...args);

const notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  message: e.message || e
});

const query = options => new Promise(resolve => chrome.tabs.query(options, resolve));

export {query, notify, log};
