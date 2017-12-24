'use strict';

const notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: 'data/icons/128.png',
  message: e.message || e
});

chrome.runtime.onMessage.addListener(({method}, {tab}, resposne) => {
  if (method === 'is-pinned') {
    resposne(tab.pinned);
  }
  else if (method === 'discard') {
    if (tab.active) {
      return;
    }
    chrome.tabs.discard(tab.id);
  }
});

chrome.idle.onStateChanged.addListener(state => {
  if (state === 'active') {
    chrome.tabs.query({
      url: '*://*/*',
      discarded: false
    }, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {
      method: 'idle'
    })));
  }
});

// Context Menu
{
  const callback = () => {
    const contexts = ['browser_action'];
    if (chrome.contextMenus.ContextType.TAB) {
      contexts.push('tab');
    }
    chrome.contextMenus.create({
      id: 'discard-tabs',
      title: 'Discard all inactive tabs',
      contexts
    });
    chrome.contextMenus.create({
      id: 'discard-window',
      title: 'Discard inactive tabs in current window',
      contexts
    });
    chrome.contextMenus.create({
      id: 'discard-other-windows',
      title: 'Discard inactive tabs in other windows',
      contexts
    });
    chrome.contextMenus.create({
      id: 'whitelist-domain',
      title: 'Do not discard this domain',
      contexts
    });
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
chrome.contextMenus.onClicked.addListener(({menuItemId}, tab) => {
  if (menuItemId === 'whitelist-domain') {
    return chrome.storage.local.get({
      whitelist: []
    }, prefs => {
      const {hostname, protocol} = new URL(tab.url);
      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        prefs.whitelist.push(hostname);
        prefs.whitelist = prefs.whitelist.filter((h, i, l) => l.indexOf(h) === i);
        chrome.storage.local.set(prefs);
        notify(hostname + ' is added to the whitelist');
      }
      else {
        notify(protocol + ' protocol is not supported');
      }
    });
  }
  const info = {
    url: '*://*/*',
    discarded: false
  };
  if (menuItemId === 'discard-window') {
    info.currentWindow = true;
  }
  else if (menuItemId === 'discard-other-windows') {
    info.currentWindow = false;
  }
  console.log(menuItemId);
  chrome.tabs.query(info, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {
    method: 'can-discard'
  })));
});
// initial inject
{
  const callback = () => chrome.app && chrome.tabs.query({
    url: '*://*/*',
    discarded: false
  }, tabs => {
    const contentScripts = chrome.app.getDetails().content_scripts;
    for (const tab of tabs) {
      for (const cs of contentScripts) {
        chrome.tabs.executeScript(tab.id, {
          file: cs.js[0],
          runAt: cs.run_at,
          allFrames: cs.all_frames,
        });
      }
    }
  });
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
// browser action
chrome.browserAction.onClicked.addListener(() => chrome.runtime.openOptionsPage());
