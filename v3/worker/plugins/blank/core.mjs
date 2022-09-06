import {overwrite, release} from '../loader.mjs';
import {log, query} from '../../core/utils.mjs';

function enable() {
  log('blank.enable is called');
  overwrite('before-menu-click', function({menuItemId}, tab) {
    log('menu command:', menuItemId);
    if (menuItemId === 'release-tabs' || menuItemId === 'release-other-windows') {
      return query({
        active: true,
        currentWindow: false
      }).then(tbs => {
        for (const tb of tbs) {
          chrome.tabs.sendMessage(tb.id, {
            method: 'tab-is-active'
          });
        }
      });
    }
    else if (menuItemId === 'discard-other-windows' || menuItemId === 'discard-tabs') {
      return query({
        active: true,
        currentWindow: false,
        url: '*://*/*' // only if the active tab is not an internal page
      }).then(tbs => {
        return Promise.all(tbs.map(tb => new Promise(resolve => {
          const args = new URLSearchParams();
          args.set('title', tb.title);
          args.set('favicon', tb.favIconUrl);

          chrome.tabs.create({
            openerTabId: tb.id,
            windowId: tb.windowId,
            url: '/worker/plugins/blank/blank.html?' + args.toString(),
            index: tb.index
          }, resolve);
        })));
      });
    }
    else if (menuItemId === 'discard-tab' || menuItemId === 'discard-tree') {
      return query({
        active: false,
        highlighted: false,
        currentWindow: true,
        discarded: false
      }).then(tbs => {
        if (tbs.length === 0 && tab.url.startsWith('http')) {
          const args = new URLSearchParams();
          args.set('title', tab.title);
          args.set('favicon', tab.favIconUrl);

          return new Promise(resolve => chrome.tabs.create({
            openerTabId: tab.id,
            windowId: tab.windowId,
            url: '/worker/plugins/blank/blank.html?' + args.toString(),
            index: tab.index,
            active: false // so that this tab gets focused
          }, resolve));
        }
      });
    }
  });
}
function disable() {
  log('blank.disable is called');
  release('before-menu-click');
}

export default {
  enable,
  disable
};
