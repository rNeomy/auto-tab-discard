/* global log, storage, query */

function enable() {
  log('trash.install is called');
  storage({
    'trash.interval': 30 // in minutes
  }).then(prefs => chrome.alarms.create('trash.check', {
    when: Date.now(),
    periodInMinutes: prefs['trash.interval']
  }));
}
function disable() {
  log('trash.disable is called');
  chrome.alarms.clear('trash.check');
  chrome.storage.local.remove('trash.keys');
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'trash.check') {
    log('alarm fire', 'trash.check', alarm.name);

    storage({
      'trash.period': 24, // in hours
      'trash.keys': {},
      'trash.unloaded': true,
      'trash.whitelist-url': []
    }).then(async prefs => {
      const tbs = await query({discarded: true});

      // https://github.com/rNeomy/auto-tab-discard/issues/243
      if (prefs['trash.unloaded']) {
        const ids = new Set(tbs.map(t => t.id));
        for (const tb of await query({status: 'unloaded'})) {
          if (ids.has(tb.id) === false) {
            tbs.push(tb);
          }
        }
      }

      const units = {
        'mo': 30 * 24 * 60 * 60, // close enough...
        'w': 7 * 24 * 60 * 60,
        'd': 24 * 60 * 60,
        'h': 60 * 60,
        'm': 60,
        's': 1
      };

      const parseInterval = value => {
        if (value === undefined) {
          return 0;
        }
        const [s, number, unit] = value.match(/(\d+)(\w+)?/);
        return parseInt(number) * (units[unit] ?? 1);
      };

      const match = (href, hostname, list) => {
        if (list.length === 0) {
          return prefs['trash.period'] * 60 * 60;
        }
        return list.map(item => item.match(/^(?:(\w+):)?([^@]+)(?:@(\d+\w*))?/)).map(
          ([rule, exprtype, expr, interval]) => {
            if (
              (exprtype === undefined && hostname.indexOf(expr) !== -1) ||
              (exprtype === 're' && (new RegExp(expr)).test(href))
            ) {
              return parseInterval(interval) || prefs['trash.period'] * 60 * 60;
            }
          }
        ).find(interval => interval > 0);
      };

      const keys = (
        prefs['trash.whitelist-url'].length ?
          tbs.map(t => t.url).map(url =>
            [url, match(url, new URL(url).hostname, prefs['trash.whitelist-url'])]
          ).filter( ([url, interval]) => interval > 0 ) : tbs.map(t => [t.url, prefs['trash.period'] * 60 * 60])
      );
      const now = Date.now();
      const removed = [];

      for (const [url, [timestamp, interval]] of Object.entries(prefs['trash.keys'])) {
        // remove removed keys
        if (! keys.find(([u]) => url == u)) {
          delete prefs['trash.keys'][url];
        }
        // remove old tabs
        else if (now - timestamp > interval * 1000) {
          delete prefs['trash.keys'][url];
          removed.push(url);
          for (const tb of tbs.filter(t => t.url === url)) {
            log('trash', 'removing', tb.title);
            chrome.tabs.remove(tb.id, () => chrome.runtime.lastError);
          }
        }
      }
      // add new keys
      for (const [url, interval] of keys) {
        if (prefs['trash.keys'][url] === undefined && removed.indexOf(url) === -1) {
          prefs['trash.keys'][url] = [now, interval];
        }
      }

      chrome.storage.local.set(prefs);
    });
  }
});

export {
  enable,
  disable
};
