/* global log, storage, query, discard */

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

export {
  enable,
  disable
};
