import {log, query} from '../../core/utils.mjs';
import {storage} from '../../core/prefs.mjs';

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
      'trash.whitelist-url': [],
      'pinned': false
    }).then(async prefs => {
      // TO-DO: remove this check after a few updates
      // https://github.com/rNeomy/auto-tab-discard/issues/352
      try {
        Object.entries(prefs['trash.keys']);
      }
      catch (e) {
        log('trash', 'trash.keys is messed up', 'regenerating');
        prefs['trash.keys'] = {};
      }

      const tbs = new Set(await query({discarded: true}));

      // https://github.com/rNeomy/auto-tab-discard/issues/243
      if (prefs['trash.unloaded']) {
        for (const tb of await query({status: 'unloaded'})) {
          tbs.add(tb);
        }
      }
      // https://github.com/rNeomy/auto-tab-discard/issues/358
      if (prefs['pinned']) {
        for (const tb of tbs) {
          if (tb.pinned) {
            tbs.delete(tb);
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
        const [, number, unit] = value.match(/(\d+)(\w+)?/);
        return parseInt(number) * (units[unit] ?? 1);
      };

      const findInterval = (href, hostname, list) => {
        if (list.length === 0) {
          return prefs['trash.period'] * 60 * 60;
        }
        return list.map(item => item.match(/^(?:(\w+):)?([^@]+)(?:@(\d+\w*))?/)).map(
          ([, exprtype, expr, interval]) => {
            if (
              (exprtype === undefined && hostname.indexOf(expr) !== -1) ||
              (exprtype === 're' && (new RegExp(expr)).test(href))
            ) {
              return parseInterval(interval) || prefs['trash.period'] * 60 * 60;
            }
          }
        ).find(interval => interval > 0);
      };

      const keys = new Map();
      for (const tab of tbs) {
        if (keys.has(tab.url) === false) {
          if (prefs['trash.whitelist-url'].length) {
            keys.set(tab.url, {
              interval: findInterval(tab.url, new URL(tab.url).hostname, prefs['trash.whitelist-url']),
              tabs: []
            });
          }
          else {
            keys.set(tab.url, {
              interval: prefs['trash.period'] * 60 * 60,
              tabs: []
            });
          }
        }
        keys.get(tab.url).tabs.push(tab);
      }

      const now = Date.now();

      // make sure all stored keys are still related to a tab
      for (const url of Object.keys(prefs['trash.keys'])) {
        if (keys.has(url) === false) {
          delete prefs['trash.keys'][url];
        }
        // if the user switches to whitelist mode
        else if (!keys.get(url).interval) {
          delete prefs['trash.keys'][url];
        }
      }

      // removing old tabs
      for (const [url, [timestamp, interval]] of Object.entries(prefs['trash.keys'])) {
        if (now - timestamp > interval * 1000) {
          for (const tab of keys.get(url).tabs) {
            log('trash', 'removing', tab.title);
            chrome.tabs.remove(tab.id, () => chrome.runtime.lastError);
          }
          delete prefs['trash.keys'][url];
          keys.delete(url);
        }
      }

      // add new keys
      for (const [url, {interval}] of keys.entries()) {
        if (prefs['trash.keys'][url] === undefined && interval) {
          prefs['trash.keys'][url] = [now, interval];
        }
      }

      chrome.storage.local.set(prefs);
    });
  }
});

export default {
  enable,
  disable
};
