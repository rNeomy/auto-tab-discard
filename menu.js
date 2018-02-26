/* globals notify */
'use strict';

// Context Menu
{
  const TST = 'treestyletab@piro.sakura.ne.jp';
  const onStartup = () => {
    const contexts = ['browser_action'];
    if (chrome.contextMenus.ContextType.TAB) {
      contexts.push('tab');
    }
    const create = arr => {
      arr.forEach(o => chrome.contextMenus.create(o));
      // treestyletab support
      const add = () => chrome.runtime.sendMessage(TST, {
        type: 'register-self',
        name: chrome.runtime.getManifest().name
      }, r => {
        // console.log('TST test', r);
        if (r === true) {
          arr.forEach(params => chrome.runtime.sendMessage('treestyletab@piro.sakura.ne.jp', {
            type: 'fake-contextMenu-create',
            params
          }));
        }
      });
      chrome.runtime.onMessageExternal.addListener((request, sender) => {
        if (sender.id === TST && request.type === 'ready') {
          add();
        }
      });
      add();
    };

    create([
      {
        id: 'discard-tab',
        title: 'Discard this tab (forced)',
        contexts,
        documentUrlPatterns: ['*://*/*']
      },
      {
        id: 'discard-tabs',
        title: 'Discard all inactive tabs',
        contexts
      },
      {
        id: 'discard-window',
        title: 'Discard inactive tabs in current window',
        contexts
      },
      {
        id: 'discard-other-windows',
        title: 'Discard inactive tabs in other windows',
        contexts
      },
      {
        id: 'separator',
        type: 'separator',
        contexts,
        documentUrlPatterns: ['*://*/*']
      },
      {
        id: 'whitelist-domain',
        title: 'Do not discard this domain',
        contexts,
        documentUrlPatterns: ['*://*/*']
    }].filter(o => o));
  };
  // Firefox does not call "onStartup" after enabling the extension
  if (/Firefox/.test(navigator.userAgent)) {
    onStartup();
  }
  else {
    chrome.runtime.onInstalled.addListener(onStartup);
    chrome.runtime.onStartup.addListener(onStartup);
  }

  const onClicked = ({menuItemId}, tab) => {
    if (menuItemId === 'whitelist-domain') {
      chrome.storage.local.get({
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
        chrome.tabs.query({
          windowId: tab.windowId
        }, tabs => {
          const otab = tabs.filter(t => t.discarded === false && t.index !== tab.index).sort((a, b) => {
            const lb = Math.abs(b.index - tab.index);
            const la = Math.abs(a.index - tab.index);
            return la - lb;
          }).shift();
          if (otab) {
            chrome.tabs.update(otab.id, {
              active: true
            }, () => window.setTimeout(() => chrome.tabs.sendMessage(tab.id, {
              method: 'bypass-discard'
            }), 0));
          }
          else {
            notify('Cannot discard a tab when it is active');
          }
        });
      }
      else {
        chrome.tabs.sendMessage(tab.id, {
          method: 'bypass-discard'
        });
      }
    }
    else {
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
    }
  };
  chrome.contextMenus.onClicked.addListener(onClicked);
  chrome.runtime.onMessageExternal.addListener((request, sender) => {
    if (sender.id === TST && request.type === 'fake-contextMenu-click') {
      onClicked(request.info, request.tab);
    }
  });
}
