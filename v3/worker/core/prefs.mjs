const prefs = {
  'favicon': false,
  'prepends': '💤',
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
  'startup-unpinned': false,
  'startup-pinned': false,
  'startup-release-pinned': false,
  'startup-discarding-period': 10 // in seconds
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
