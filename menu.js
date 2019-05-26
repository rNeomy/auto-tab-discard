/* globals discard, query, notify, navigate, starters, storage */
'use strict';

// Context Menu
{
  const TST = 'treestyletab@piro.sakura.ne.jp';

  const onStartup = async () => {
    const contexts = ['browser_action'];
    const prefs = await storage({
      'page.context': false,
      'tab.context': true,
      'link.context': true
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
        chrome.runtime.lastError;
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
      try {
        add();
      }
      catch (e) {}

      chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
        if (sender.id === TST && request.type === 'ready') {
          add();
          sendResponse(true);
        }
      });
    };

    create([{
      id: 'discard-tab',
      title: chrome.i18n.getMessage('menu_discard_tab'),
      contexts,
      documentUrlPatterns: ['*://*/*']
    },
    {
      id: 'discard-window',
      title: chrome.i18n.getMessage('menu_discard_window'),
      contexts
    },
    {
      id: 'discard-other-windows',
      title: chrome.i18n.getMessage('menu_discard_other_windows'),
      contexts
    },
    {
      id: 'discard-tabs',
      title: chrome.i18n.getMessage('menu_discard_tabs'),
      contexts
    },
    {
      id: 'auto-discardable',
      title: chrome.i18n.getMessage('popup_allowed'),
      contexts,
      documentUrlPatterns: ['*://*/*']
    },
    {
      id: 'whitelist-domain',
      title: chrome.i18n.getMessage('menu_whitelist_domain'),
      contexts,
      documentUrlPatterns: ['*://*/*']
    },
    prefs['link.context'] ? {
      id: 'open-tab-then-discard',
      title: chrome.i18n.getMessage('menu_open_tab_then_discard'),
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    } : null].filter(o => o));
  };
  starters.push(onStartup);

  const onClicked = async (info, tab) => {
    if (tab && !tab.url) { // Tree Style Tab 3.0.12 and later don't deliver a real tab.
      tab = await browser.tabs.get(tab.id);
    }
    const {menuItemId} = info;
    if (menuItemId === 'whitelist-domain') {
      const {hostname, protocol = ''} = new URL(tab.url);
      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        let {whitelist} = await storage({
          whitelist: []
        });

        whitelist.push(hostname);
        whitelist = whitelist.filter((h, i, l) => l.indexOf(h) === i);
        storage.set({
          whitelist
        });
        notify(`"${hostname}" ${chrome.i18n.getMessage('menu_msg1')}`);
      }
      else {
        notify(`"${protocol}" ${chrome.i18n.getMessage('menu_msg2')}`);
      }
    }
    else if (menuItemId === 'discard-tab' || menuItemId === 'discard-tree') {
      // it is possible to have multiple highlighted tabs. Let's discard all of them
      const tabs = await query({
        windowId: tab.windowId
      });
      // if a single not-highlighted tab is called
      const htabs = tab.highlighted ? tabs.filter(t => t.highlighted) : [tab];
      if (htabs.filter(t => t.active).length) {
        // ids to be discarded
        const ids = htabs.map(t => t.id);
        const otab = tabs
          .filter(t => t.discarded === false && t.highlighted === false && ids.indexOf(t.id) === -1)
          .sort((a, b) => Math.abs(a.index - tab.index) - Math.abs(b.index - tab.index))
          .shift();
        if (otab) {
          chrome.tabs.update(otab.id, {
            active: true
          }, () => {
            // at the time we record htabs, one tab was active. Let's mark it as inactive
            htabs.forEach(t => t.active = false);
            htabs.forEach(discard);
          });
        }
        else {
          notify(chrome.i18n.getMessage('menu_msg3'));
        }
      }
      else {
        htabs.forEach(discard);
      }
    }
    else if (menuItemId === 'open-tab-then-discard') {
      chrome.tabs.create({
        active: false,
        url: info.linkUrl
      }, tab => chrome.tabs.executeScript(tab.id, {
        runAt: 'document_start',
        code: 'window.stop()'
      }, () => chrome.tabs.executeScript(tab.id, {
        runAt: 'document_start',
        file: 'data/lazy.js'
      })));
    }
    else if (menuItemId === 'auto-discardable') {
      const autoDiscardable = info.value || false; // when called from page context menu, there is no value
      try {
        chrome.tabs.update(tab.id, {
          autoDiscardable
        });
      }
      catch (e) { // Firefox
        chrome.tabs.executeScript(tab.id, {
          code: `allowed = ${autoDiscardable};`
        });
      }
    }
    else { // discard-tabs, discard-window, discard-other-windows
      const info = {
        url: '*://*/*',
        discarded: false,
        active: false
      };
      if (menuItemId === 'discard-window') {
        info.currentWindow = true;
      }
      else if (menuItemId === 'discard-other-windows') {
        info.currentWindow = false;
      }
      const tabs = await query(info);
      tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {
        method: 'introduce'
      }, a => {
        chrome.runtime.lastError;
        if (a && a.exception !== true && a.allowed) {
          discard(tab);
        }
      }));
    }
  };
  chrome.contextMenus.onClicked.addListener(onClicked);
  chrome.browserAction.onClicked.addListener(tab => onClicked({
    menuItemId: localStorage.getItem('click')
  }, tab));
  // commands
  chrome.commands.onCommand.addListener(async command => {
    if (command.startsWith('move-') || command === 'close') {
      navigate(command);
    }
    else {
      const tabs = await query({
        active: true,
        currentWindow: true
      });
      if (tabs.length) {
        onClicked({
          menuItemId: command
        }, tabs[0]);
      }
    }
  });
  chrome.runtime.onMessage.addListener(async (request, sender) => {
    if (request.method === 'popup') {
      const tabs = await query({
        active: true,
        currentWindow: true
      });
      if (tabs.length) {
        onClicked({
          menuItemId: request.cmd,
          value: request.value
        }, tabs[0]);
      }
    }
    else if (request.method === 'simulate') {
      onClicked({
        menuItemId: request.cmd
      }, sender.tab);
    }
  });

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
