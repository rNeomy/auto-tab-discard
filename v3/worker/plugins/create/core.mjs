import {log, query, match} from '../../core/utils.mjs';
import {storage} from '../../core/prefs.mjs';

const observing = new Set(); // ids of the tabs that are currently being observed

const real = url => /^(https?|ftp):/i.test(url || '');
const shouldInject = tab => tab.status === 'complete' ||
  (tab.status === 'loading' && real(tab.url));
const gone = tab => tab.status === 'unloaded' || tab.discarded;

const inject = tab => chrome.scripting.executeScript({
  target: {
    tabId: tab.id
  },
  func: () => {
    const run = () => chrome.runtime.sendMessage({
      method: 'discard.on.load'
    });
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      run();
    }
    else {
      document.addEventListener('DOMContentLoaded', run);
    }
  }
}).catch(e => console.error('plugins/create -> error', e));

const isWhitelisted = url => Promise.all([
  storage({'whitelist': []}),
  storage({'whitelist.session': []}, 'session')
]).then(([local, session]) => {
  try {
    const {hostname} = new URL(url);

    return Boolean(match(local['whitelist'], hostname, url) ||
      match(session['whitelist.session'], hostname, url));
  }
  catch (e) {
    return false; // url is not parseable; treat as a non-whitelisted tab
  }
});

const run = tab => {
  const id = tab.id;
  if (observing.has(id)) {
    return;
  }
  observing.add(id);

  const timer = setTimeout(() => cleanup(), 30 * 1000);
  const cleanup = () => {
    observing.delete(id);
    chrome.tabs.onUpdated.removeListener(observe);
    chrome.tabs.onRemoved.removeListener(remove);
    clearTimeout(timer);
  };
  const remove = tabId => tabId === id && cleanup();
  let injected; // url of the document that has already been injected
  const observe = (tabId, info, tab) => {
    if (tabId !== id) {
      return;
    }
    if (gone(tab)) {
      return cleanup();
    }
    if (!tab.url) {
      return;
    }

    // inject once per committed document; a redirect changes tab.url and injects again
    if (shouldInject(tab) && tab.url !== injected) {
      injected = tab.url;

      isWhitelisted(tab.url).then(skip => {
        if (skip) {
          log('create', 'tab is whitelisted; discarding is skipped', tab.url);
        }
        else {
          inject(tab);
        }
      });
    }
    // the final document of the tab; no need to observe anymore
    if (tab.status === 'complete') {
      cleanup();
    }
  };

  chrome.tabs.get(id).then(tab => observe(id, {}, tab), cleanup);
  chrome.tabs.onUpdated.addListener(observe);
  chrome.tabs.onRemoved.addListener(remove);
};

const observe = {
  tab: tab => {
    if (tab.active === false) {
      run(tab);
    }
  },
  window: win => {
    setTimeout(() => chrome.tabs.query({
      windowId: win.id,
      active: false
    }, tbs => tbs.forEach(observe.tab)), 0);
  }
};

function enable() {
  log('create.enable is called');
  chrome.tabs.onCreated.addListener(observe.tab);
  chrome.windows.onCreated.addListener(observe.window);
  query({
    url: '*://*/*',
    status: 'loading',
    active: false
  }).then(tabs => tabs.forEach(run));
}
function disable() {
  log('create.disable is called');
  chrome.tabs.onCreated.removeListener(observe.tab);
  chrome.windows.onCreated.removeListener(observe.window);
}

export default {
  enable,
  disable
};
