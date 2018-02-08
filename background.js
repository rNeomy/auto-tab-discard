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
  else if (method === 'is-playing') {
    resposne(tab.audible);
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
      chrome.contextMenus.create({
        id: 'discard-tab',
        title: 'Discard this tab',
        contexts: ['tab'],
        documentUrlPatterns: ['*://*/*']
      });
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
      id: 'separator',
      type: 'separator',
      contexts,
      documentUrlPatterns: ['*://*/*']
    });
    chrome.contextMenus.create({
      id: 'whitelist-domain',
      title: 'Do not discard this domain',
      contexts,
      documentUrlPatterns: ['*://*/*']
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
      const {hostname, protocol = ''} = new URL(tab.url);
      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        prefs.whitelist.push(hostname);
        prefs.whitelist = prefs.whitelist.filter((h, i, l) => l.indexOf(h) === i);
        chrome.storage.local.set(prefs);
        notify(`"${hostname}" is added to the whitelist`);
      }
      else {
        notify(`"${protocol}" protocol is not supported`);
      }
    });
  }
  else if (menuItemId === 'discard-tab') {
    if (tab.active) {
      return notify('Cannot discard a tab when it is active');
    }
    return chrome.tabs.sendMessage(tab.id, {
      method: 'bypass-discard'
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

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': false,
  'last-update': 0,
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '?rd=feedback&name=' + name + '&version=' + version
  );
}
