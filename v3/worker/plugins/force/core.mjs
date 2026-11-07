import {log, query, match} from '../../core/utils.mjs';
import {storage} from '../../core/prefs.mjs';
import {discard} from '../../core/discard.mjs';

const observe = () => {
  Promise.all([
    storage({
      'force.hostnames': [],
      'whitelist': []
    }),
    storage({
      'whitelist.session': []
    }, 'session')
  ]).then(([prefs, session]) => {
    if (prefs['force.hostnames'].length) {
      query({
        active: false,
        discarded: false,
        url: prefs['force.hostnames'].map(h => `*://${h}/*`)
      }).then(tbs => tbs.filter(tb => {
        // respect the per-tab exemption ("Keep Selected Tabs for This Session")
        if (tb.autoDiscardable === false) {
          log('force', 'tab is not discardable', tb.id, tb.url);
          return false;
        }
        // respect the permanent and session whitelists
        try {
          const {hostname} = new URL(tb.url);

          if (match(prefs['whitelist'], hostname, tb.url) ||
            match(session['whitelist.session'], hostname, tb.url)) {
            log('force', 'tab is ignored', 'whitelist', tb.url);
            return false;
          }
        }
        catch (e) {
          // url is not parseable; treat as a non-whitelisted tab
        }
        return true;
      }).forEach(discard));
    }
    else {
      log('Please disable forced plug-in', 'there is not hostname in the list');
    }
  });
};

function enable() {
  log('force.enable is called');
  chrome.tabs.onActivated.addListener(observe);
}
function disable() {
  log('force.disable is called');
  chrome.tabs.onActivated.removeListener(observe);
}

export default {
  enable,
  disable
};
