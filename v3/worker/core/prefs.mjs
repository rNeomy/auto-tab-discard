const prefs = {
  'favicon': false,
  'prepends': '💤',
  'discard-protected-on-close': false,
  'number': 6,
  'period': 10 * 60, // in seconds
  'click': 'click.popup',
  'go-hidden': false,
  'page.context': false,
  'tab.context': true,
  'link.context': true,
  'whitelist': [], // whitelist hostnames and regexp rules
  'favicon-delay': /Firefox/.test(navigator.userAgent) ? 500 : 100,
  'log': false,
  'simultaneous-jobs': 10,
  'idle-timeout': 5 * 60, // in seconds
  'pinned': false, // pinned = true => do not discard if tab is pinned
  'split-view': true, // split-view = true => do not discard split tabs if either tab of the split is focused
  'startup-unpinned': false,
  'startup-pinned': false,
  'startup-release-pinned': false,
  'startup-discarding-period': 10, // in seconds
  /* menu visibility */
  'menu.discard-tab': true,
  'menu.discard-tree': true,
  'menu.discard-window': true,
  'menu.discard-rights': true,
  'menu.discard-lefts': true,
  'menu.discard-other-windows': true,
  'menu.discard-tabs': true,
  'menu.keep-tabs': true,
  /* popup visibility */
  'popup.discard-tab': true,
  'popup.discard-tree': true,
  'popup.discard-window': true,
  'popup.discard-rights': true,
  'popup.discard-lefts': true,
  'popup.discard-other-windows': true,
  'popup.discard-tabs': true
};

const storage = (prefs, type = 'managed') => new Promise(resolve => {
  if (type === 'managed') {
    chrome.storage.managed.get(prefs, ps => {
      chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, prefs => {
        resolve(prefs);
      });
    });
  }
  else if (type === 'session') {
    chrome.storage.session.get(prefs, resolve);
  }
  else {
    throw Error('storage type is not supported');
  }
});

// monitor changes
{
  const cache = {};
  storage.on = (name, callback) => {
    cache[name] = cache[name] || [];
    cache[name].push(callback);
  };
  chrome.storage.onChanged.addListener(ps => {
    for (const k of Object.keys(ps)) {
      prefs[k] = ps[k].newValue;
    }

    // only call callbacks if storage is not cleared
    for (const k of Object.keys(ps)) {
      if (k in cache && 'newValue' in ps[k]) {
        cache[k].forEach(c => c());
      }
    }
  });
}

export {
  prefs,
  storage
};
