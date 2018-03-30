/* globals notify */
'use strict';

// Context Menu
{
  const TST = 'treestyletab@piro.sakura.ne.jp';

  const storage = prefs => new Promise(resolve => chrome.storage.local.get(prefs, resolve));

  const onStartup = async() => {
    const contexts = ['browser_action'];
    const prefs = await storage({
      'page.context': false,
      'tab.context': true
    });
    if (chrome.contextMenus.ContextType.TAB && prefs['tab.context']) {
      contexts.push('tab');
    }
    if (prefs['page.context']) {
      contexts.push('page');
    }
    const create = arr => {
      arr.forEach(o => chrome.contextMenus.create(o));
      arr.splice(1, 0, {
        id: 'discard-tree',
        title: 'Discard this tab tree (forced)',
        contexts,
        documentUrlPatterns: ['*://*/*']
      });
      // treestyletab support
      const add = () => chrome.runtime.sendMessage(TST, {
        type: 'register-self',
        name: chrome.runtime.getManifest().name
      }, r => {
        if (r === true) {
          arr.forEach(params => chrome.runtime.sendMessage(TST, {
            type: 'fake-contextMenu-remove',
            params
          }));
          chrome.runtime.sendMessage(TST, {
            type: 'fake-contextMenu-remove-all'
          }, () => {
            arr.forEach(params => chrome.runtime.sendMessage(TST, {
              type: 'fake-contextMenu-create',
              params
            }));
          });
        }
      });
      add();

      chrome.runtime.onMessageExternal.addListener((request, sender) => {
        if (sender.id === TST && request.type === 'ready') {
          add();
        }
      });
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

  const onClicked = async({menuItemId}, tab) => {
    if (menuItemId === 'whitelist-domain') {
      const {hostname, protocol = ''} = new URL(tab.url);
      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        let {whitelist} = await storage({
          whitelist: []
        });

        whitelist.push(hostname);
        whitelist = whitelist.filter((h, i, l) => l.indexOf(h) === i);
        chrome.storage.local.set(prefs);
        notify(`"${hostname}" is added to the whitelist`);
      }
      else {
        notify(`"${protocol}" protocol is not supported`);
      }
    }
    else if (menuItemId === 'discard-tab' || menuItemId === 'discard-tree') {
      if (tab.active) {
        chrome.tabs.query({
          windowId: tab.windowId
        }, tabs => {
          const otab = tabs.filter(t => t.discarded === false && t.id !== tab.id).sort((a, b) => {
            const lb = Math.abs(b.index - tab.index);
            const la = Math.abs(a.index - tab.index);
            return la - lb;
          }).shift();
          if (otab) {
            chrome.tabs.update(otab.id, {
              active: true
            }, () => window.setTimeout(() => chrome.tabs.sendMessage(tab.id, {
              method: 'bypass-discard'
            }), 500)); // in Firefox it takes sometime for document.hidden becomes true!
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
  // commands
  chrome.commands.onCommand.addListener(command => chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs.length) {
      onClicked({
        menuItemId: command
      }, tabs[0]);
    }
  }));

  chrome.runtime.onMessageExternal.addListener((request, sender) => {
    if (sender.id === TST && request.type === 'fake-contextMenu-click' && request.info.menuItemId === 'discard-tree') {
      // apply on all tabs in the tree
      chrome.runtime.sendMessage(TST, {
        type: 'get-tree',
        tabs: [request.tab.id]
      }, tbs => {
        const tabs = [];
        const list = tab => {
          tabs.push(tab);
          tab.children.forEach(list);
        };
        tbs.forEach(list);
        tabs.filter(t => t.active === false).forEach(tab => onClicked(request.info, tab));
        window.setTimeout(() => {
          tabs.filter(t => t.active).forEach(tab => onClicked(request.info, tab));
        }, 1000);
      });
    }
    else if (sender.id === TST && request.type === 'fake-contextMenu-click') {
      onClicked(request.info, request.tab);
    }
  });
}
