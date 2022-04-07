import {log, query} from '../../core/utils.mjs';

const observe = activeInfo => chrome.tabs.get(activeInfo.tabId, tab => tab.index - 1 >= 0 && query({
  windowId: activeInfo.windowId,
  index: tab.index - 1,
  discarded: true
}).then(tbs => {
  if (tbs.length) {
    log('release discarding of the previous tab', tbs[0]);
    chrome.tabs.reload(tbs[0].id);
  }
}));

function enable() {
  log('previous.enable is called');
  chrome.tabs.onActivated.addListener(observe);
  query({
    active: true,
    currentWindow: true
  }).then(tbs => {
    if (tbs.length) {
      observe({
        tabId: tbs[0].id
      });
    }
  });
}
function disable() {
  log('previous.disable is called');
  chrome.tabs.onActivated.removeListener(observe);
}

export default {
  enable,
  disable
};
