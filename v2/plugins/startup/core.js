/* global log, query, starters, prefs, number */

const observe = () => {
  const opts = {
    url: '*://*/*',
    discarded: false,
    active: false
  };

  if (prefs['startup-pinned'] || prefs['startup-unpinned']) {
    if (prefs['startup-pinned'] && prefs['startup-unpinned'] === false) {
      opts.pinned = true;
    }
    else if (prefs['startup-unpinned'] && prefs['startup-pinned'] === false) {
      opts.pinned = false;
    }
    query(opts).then(tbs => {
      // discard loaded tabs
      log('startup plug-in', 'number of tabs that can be discarded on startup', tbs.length);
      number.check(tbs.filter(t => t.status !== 'unloaded'), number.IGNORE);
      const rst = tbs.filter(t => t.status === 'unloaded');
      if (rst.length) {
        const observe = (id, info) => {
          if (info.status === 'complete') {
            const tbs = rst.filter(t => t.id === id);
            if (tbs.length) {
              number.check(tbs, number.IGNORE);
            }
          }
        };
        chrome.tabs.onUpdated.addListener(observe);
        // we do discard for the next 10 seconds
        setTimeout(() => chrome.tabs.onUpdated.removeListener(observe), 10000);
      }
    });
  }
  if (prefs['startup-release-pinned'] && prefs['startup-pinned'] === false) {
    query({
      url: '*://*/*',
      discarded: true,
      pinned: true
    }).then(tabs => tabs.forEach(tab => chrome.tabs.reload(tab.id)));
  }
};

function enable() {
  log('startup.enable is called');
  // only run on start-up
  starters.push(observe);
}
function disable() {
  log('startup.disable is called');
}

export {
  enable,
  disable
};
