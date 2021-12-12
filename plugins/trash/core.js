/* global log, storage, query */

/* define utility helper functions */
const Utils = {
  time: {
    check: (key, value, timeoutHours) => {
      const age = Date.now() - value;
      const timeout = Utils.time.converters.hoursToMilliseconds(timeoutHours);
      const millisecondsRemaining = timeout - age;
      const minutesRemaining = Utils.time.converters.millisecondsToMinutes(
        millisecondsRemaining
      );
      return [minutesRemaining, `minutes remaining for ${key}`];
    },
    logRemaining: (urlMap, timeoutHours) => {
      let list = [];
      for (const [key, value] of Object.entries(urlMap)) {
        list.push(Utils.time.check(key, value, timeoutHours));
      }
      list.sort((a, b) => a[0] - b[0]);
      list = list.map((item) => item.join(' '));
      log('logRemaining:time remaining for keys', list);
    },
    converters: {
      hoursToMilliseconds: (hours) => hours * 60 * 60 * 1000,
      millisecondsToMinutes: (milliseconds) =>
        (milliseconds / 1000 / 60).toFixed(),
    },
  },
};

/*
  collect and discard tabs at startup so that storage syncs with tabs.
  because on startup tabs do not retain their discarded state.
*/
const trashStartup = {
  discard: async (tabs = []) => {
    return await new Promise(async (resolve) => {
      const tabDiscardPromises = [];
      for (const tab of tabs) {
        log('trashStartup:discarding tab', tab.url, tab);
        tabDiscardPromises.push(discard(tab));
      }
      await Promise.all(tabDiscardPromises);
      log('trashStartup:tab discards complete');
      resolve();
    });
  },
  isComplete: false,
  run: async () => {
    await query({
      discarded: false,
      active: false,
    }).then(async (tabs = []) => {
      log('trashStartup:tabs', tabs);
      await trashStartup.discard(tabs);
      trashStartup.isComplete = true;
      log('trashStartup:complete');
    });
  },
};

function enable() {
  log('trash.enable is called');
  storage({
    'trash.interval': 30, // in minutes
  }).then((prefs) =>
    chrome.alarms.create('trash.check', {
      when: Date.now() + 10000,
      periodInMinutes: prefs['trash.interval'],
    })
  );
}
function disable() {
  chrome.alarms.clear('trash.check');
  chrome.storage.local.remove('trash.keys');
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'trash.check') {
    log('alarm fire', alarm.name);
    if (!trashStartup.isComplete) {
      await trashStartup.run();
    }
    query({
      discarded: true,
    }).then((tbs = []) => {
      const keys = tbs.map((t) => t.url);
      const now = Date.now();
      const removed = [];
      storage({
        'trash.period': 24, // in hours
        'trash.keys': {},
      }).then((prefs) => {
        const timeoutPeriod = prefs['trash.period'];
        const urlMap = prefs['trash.keys'];

        for (const [key, value] of Object.entries(urlMap)) {
          // remove removed keys
          if (keys.indexOf(key) === -1) {
            delete urlMap[key];
          }
          // remove old tabs
          else if (
            now - value >
            Utils.time.converters.hoursToMilliseconds(timeoutPeriod)
          ) {
            delete urlMap[key];
            removed.push(key);
            for (const tb of tbs.filter((t) => t.url === key)) {
              log('trash removing', tb.title, tb.url);
              chrome.tabs.remove(tb.id, () => chrome.runtime.lastError);
            }
          }
        }
        // add new keys
        for (const key of keys) {
          if (urlMap[key] === undefined && removed.indexOf(key) === -1) {
            urlMap[key] = now;
          }
        }

        log('alarm:trash.check:saving prefs', prefs);
        chrome.storage.local.set(prefs);
        Utils.time.logRemaining(urlMap, timeoutPeriod);
      });
    });
  }
});

export { enable, disable };
