import {prefs} from './prefs.mjs';
import {domain} from './tld.mjs';

const log = (...args) => prefs.log && console.log((new Date()).toLocaleTimeString(), ...args);

const notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  message: e.message || e
});

const query = options => chrome.tabs.query(options);

// matches a hostname against a rule list; a hostname entry matches when it is
// the hostname itself, one of its subdomains, or when both share the same
// registrable domain (eTLD + 1, e.g. www.example.com covers m.example.com).
// "re:"-prefixed entries are regular expressions that test the full URL
const match = (list, hostname, href) => {
  const h = (hostname || '').toLowerCase();
  const d = domain(h);
  return list.some(rule => {
    if (String(rule).startsWith('re:')) {
      try {
        return new RegExp(String(rule).slice(3)).test(href);
      }
      catch (e) {
        return false;
      }
    }
    const r = String(rule || '').trim().toLowerCase().replace(/^\*\./, '');
    if (h === r || h.endsWith('.' + r)) {
      return true;
    }
    const rd = domain(r);
    return d !== null && rd !== null && d === rd;
  });
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

