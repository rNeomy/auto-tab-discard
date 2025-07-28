/* globals storage, log, query, starters, discard, interrupts */
'use strict';

const number = {
  IGNORE: { // ignore defaults
    'idle': false,
    'battery': false,
    'online': false,
    'number': 0,
    'period': 0,
    'max.single.discard': Infinity
  }
};
const pluginFilters = {}; // this object adds custom filters to the number-based discarding

number.install = period => {
  // checking period is between 1 minute to 20 minutes
  period = Math.min(20 * 60, Math.max(60, period / 3));

  chrome.alarms.create('number.check', {
    when: Date.now() + period * 1000,
    periodInMinutes: period / 60
  });
};
number.remove = () => {
  chrome.alarms.clear('number.check');
};
// filterTabsFrom is a list of tab that if provided, discarding only happens on them
// ops is the preference object overwrite
number.check = async (filterTabsFrom, ops = {}) => {
  if (typeof interrupts !== 'undefined') {
    // wait for plug-ins to be ready
    await interrupts['before-action']();
  }
  else {
    console.warn('plugins module is not loaded');
  }

  log('number.check is called');
  const prefs = await storage({
    'mode': 'time-based',
    'number': 6,
    'max.single.discard': 50, // max number of tabs to discard
    'period': 10 * 60, // in seconds
    'audio': true, // audio = true => do not discard if audio is playing
    'pinned': false, // pinned = true => do not discard if tab is pinned
    'battery': false, // battery = true => only discard if power is disconnected
    'online': false, // online = true => do not discard if there is no INTERNET connection
    'form': true, // form = true => do not discard if form data is changed
    'whitelist': [],
    'whitelist.session': [],
    'notification.permission': false,
    'whitelist-url': [],
    'memory-enabled': false,
    'memory-value': 60,
    'idle': false,
    'idle-timeout': 5 * 60 // in seconds
  });
  Object.assign(prefs, ops);
  // only check if idle
  if (prefs.idle) {
    const state = await new Promise(resolve => chrome.idle.queryState(prefs['idle-timeout'], resolve));
    if (state !== chrome.idle.IdleState.IDLE) {
      return log('discarding is skipped', 'idle state is active');
    }
  }
  // only check if on battery
  if (prefs.battery && navigator.getBattery) {
    const charging = await navigator.getBattery().then(b => b.charging === true || b.chargingTime !== Infinity);
    if (charging) {
      return log('discarding is skipped', 'Power is plugged-in');
    }
  }
  // only check if INTERNET is connected
  if (prefs.online && navigator.onLine === false) {
    return log('discarding is skipped', 'No INTERNET connection detected');
  }

  // get the total number of active tabs
  const options = {
    url: '*://*/*',
    discarded: false,
    active: false,
    autoDiscardable: true
  };
  if (prefs.pinned) {
    options.pinned = false;
  }
  if (prefs.audio) {
    options.audible = false;
  }
  let tbs = await query(options);
  const icon = (tb, title) => {
    chrome.browserAction.setTitle({
      tabId: tb.id,
      title
    }, () => chrome.runtime.lastError);
    chrome.browserAction.setIcon({
      tabId: tb.id,
      path: {
        '16': 'data/icons/disabled/16.png',
        '32': 'data/icons/disabled/32.png'
      }
    });
  };
  // remove tabs based on custom filters
  for (const {prepare, check} of Object.values(pluginFilters)) {
    await prepare();
    tbs = tbs.filter(check);
  }
  // remove tabs that match one of the matching lists
  if (
    prefs['whitelist'].length ||
    prefs['whitelist.session'].length ||
    (prefs.mode === 'url-based' && prefs['whitelist-url'].length)
  ) {
    const match = (href, hostname, list) => {
      if (list.length === 0) {
        return false;
      }
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
    tbs = tbs.filter(tb => {
      try {
        const {hostname} = new URL(tb.url);

        const m = list => match(tb.url, hostname, list);
        // if we are on url-based mode, remove tabs that are not on the list (before fetching meta)
        if (prefs.mode === 'url-based' && m(prefs['whitelist-url']) !== true) {
          icon(tb, 'tab is in the whitelist');
          return false;
        }
        // is the tab in whitelist, remove it (before fetching meta)
        if (m(prefs['whitelist']) || m(prefs['whitelist.session'])) {
          icon(tb, 'tab is in either the session whitelist or permanent whitelist');
          return false;
        }
        return true;
      }
      catch (e) {
        return false;
      }
    });
  }
  if (filterTabsFrom) {
    tbs = tbs.filter(tb => filterTabsFrom.some(t => t.id === tb.id));
  }

  const metas = (
    await Promise.all(
      tbs.map(
        (tb) =>
          new Promise((resolve) =>
            chrome.tabs.executeScript(
              tb.id,
              {
                file: '/data/inject/meta.js',
                runAt: 'document_start',
                matchAboutBlank: true,
                allFrames: true,
              },
              (r) => {
                chrome.runtime.lastError;
                resolve(r);
              },
            ),
          ),
      ),
    )
  ).map((r) => (r ? Object.assign({}, ...r) : null));

  // Store {tab, meta} pair
  const tabMetas = tbs
    .map((tb, i) => {
      const meta = metas[i];
      // remove protected tabs (e.g. addons.mozilla.org)
      if (!meta) {
        log('discarding aborted', 'metadata fetch error');
        icon(tb, 'metadata fetch error');
        return null;
      }
      return {
        tab: tb,
        meta,
      };
    })
    .filter((o) => o !== null)
    // remove tabs that are not ready
    .filter(({ meta }) => meta.ready === true);

  // do not discard if number of tabs is smaller than required
  if (tbs.length <= prefs.number) {
    return log('number.check', 'number of active tabs', tbs.length, 'is smaller than', prefs.number);
  }
  const now = Date.now();
  const map = new Map();
  const arr = [];
    log('number check', 'got meta data of tab');
  for (const { tab, meta } of tabMetas) {

    // is the tab using too much memory, discard instantly
    if (prefs['memory-enabled'] && meta.memory && meta.memory > prefs['memory-value'] * 1024 * 1024) {
      log('forced discarding', 'memory usage');
      discard(tb);
    if (
      prefs["memory-enabled"] &&
      meta.memory &&
      meta.memory > prefs["memory-value"] * 1024 * 1024
    ) {
      log("forced discarding", "memory usage");
      discard(tab);
      continue;
    }
    // check tab's age
    if (now - meta.time < prefs.period * 1000) {
      log('discarding aborted', 'tab is not old');
      continue;
    }
    // is this tab loaded
    if (meta.ready !== true) {
      log('discarding aborted', 'tab is not ready');
      continue;
    }
    // is tab playing audio
    if (prefs.audio && meta.audible) {
      log("discarding aborted", "audio is playing");
      icon(tab, "tab plays an audio");
      continue;
    }
    // is there an unsaved form
    if (prefs.form && meta.forms) {
      log("discarding aborted", "active form");
      icon(tab, "there is an active form on this tab");
      continue;
    }
    // is notification allowed
    if (prefs['notification.permission'] && meta.permission) {
      log('discarding aborted', 'tab has notification permission');
      icon(tb, 'tab has notification permission');
      log("discarding aborted", "tab has notification permission");
      icon(tab, "tab has notification permission");
      continue;
    // tab can be discarded
    }
    map.set(tb, meta);
    arr.push(tb);
    if (arr.length > prefs['max.single.discard']) {
      log('breaking', 'max number of tabs reached');
      break;
    }
  }
  // ready to discard
  log('number check', 'possible tabs that could get discarded', arr.length);
  const tbds = arr
    .sort((a, b) => map.get(a).time - map.get(b).time)
    .slice(0, Math.min(arr.length - prefs.number, prefs['max.single.discard']));

  log('number check', 'discarding', tbds.length);
  for (const tb of tbds) {
    discard(tb);
  }
};

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'number.check') {
    log('alarm fire', 'number.check', alarm.name);
    number.check();
  }
});

/* start */
{
  const check = () => storage({
    'mode': 'time-based',
    'period': 10 * 60 // in seconds
  }).then(ps => {
    if (ps.period && (ps.mode === 'time-based' || ps.mode === 'url-based')) {
      number.install(ps.period);
    }
    else {
      number.remove();
    }
  });
  starters.push(check);
  chrome.storage.onChanged.addListener(ps => {
    if (ps.period || ps.mode) {
      check();
    }
  });
}
/* inject to existing tabs */
starters.push(() => chrome.app && query({
  url: '*://*/*',
  discarded: false
}).then(tbs => {
  const contentScripts = chrome.app.getDetails().content_scripts;
  for (const tab of tbs) {
    for (const cs of contentScripts) {
      chrome.tabs.executeScript(tab.id, {
        file: cs.js[0],
        runAt: cs.run_at,
        allFrames: cs.all_frames
      }, () => chrome.runtime.lastError);
    }
  }
}));
