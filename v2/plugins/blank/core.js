/* global log, query, interrupts  */

const pointer = interrupts['before-menu-click'];

function enable() {
  log('blank.enable is called');
  interrupts['before-menu-click'] = function({menuItemId}) {
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
        currentWindow: false
      }).then(tbs => {
        // only if the active tab is not an internal page
        tbs = tbs.filter(tb => tb.url.startsWith('http'));
        return Promise.all(tbs.map(tb => new Promise(resolve => chrome.tabs.create({
          openerTabId: tb.id,
          windowId: tb.windowId,
          url: '/plugins/blank/blank.html'
        }, resolve))));
      });
    }
  };
}
function disable() {
  log('blank.disable is called');
  interrupts['before-menu-click'] = pointer;
}

export {
  enable,
  disable
};
