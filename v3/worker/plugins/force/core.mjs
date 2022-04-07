import {log, query} from '../../core/utils.mjs';
import {storage} from '../../core/prefs.mjs';
import {discard} from '../../core/discard.mjs';

const observe = () => {
  storage({
    'force.hostnames': []
  }).then(prefs => {
    if (prefs['force.hostnames'].length) {
      query({
        active: false,
        discarded: false,
        url: prefs['force.hostnames'].map(h => `*://${h}/*`)
      }).then(tbs => tbs.forEach(discard));
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
