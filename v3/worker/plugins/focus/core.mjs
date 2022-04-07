import {log, query} from '../../core/utils.mjs';
import {pluginFilters} from '../../modes/number.mjs';

const observe = windowId => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    query({
      discarded: true,
      windowId
    }).then(tabs => tabs.forEach(tab => chrome.tabs.reload(tab.id)));
  }
};

function enable() {
  log('installing focus/core.js');
  chrome.windows.onFocusChanged.addListener(observe);
  query({
    currentWindow: true,
    active: true
  }).then(tbs => tbs.length && observe(tbs[0].windowId));

  let id;
  pluginFilters['./plugins/focus/core.js'] = {
    prepare() {
      return query({
        active: true,
        currentWindow: true
      }).then(tbs => {
        id = tbs && tbs.length ? tbs[0].windowId : -1;
      });
    },
    check(tab) {
      return tab.windowId !== id;
    }
  };
}
function disable() {
  log('removing focus/core.js');
  delete pluginFilters['./plugins/focus/core.js'];
  chrome.windows.onFocusChanged.removeListener(observe);
}

export default {
  enable,
  disable
};
