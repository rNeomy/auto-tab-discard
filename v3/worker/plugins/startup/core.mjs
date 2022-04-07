import {log, query} from '../../core/utils.mjs';
import {prefs} from '../../core/prefs.mjs';
import {starters} from '../../core/startup.mjs';
import {number} from '../../modes/number.mjs';

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
        const observe = (id, info, tab) => {
          if (info.status === 'complete') {
            if (rst.some(t => t.id === id)) {
              number.check([tab], number.IGNORE);
            }
          }
        };
        const remove = alarm => {
          if (alarm.name === 'remove.startup.discarding.observer') {
            chrome.tabs.onUpdated.removeListener(observe);
            chrome.alarms.onAlarm.removeListener(remove);
          }
        };
        chrome.tabs.onUpdated.addListener(observe);
        // we keep discarding for the next 10 seconds
        chrome.alarms.create('remove.startup.discarding.observer', {
          when: Date.now() + prefs['startup-discarding-period'] * 1000
        });
        chrome.alarms.onAlarm.addListener(remove);
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

export default {
  enable,
  disable
};
