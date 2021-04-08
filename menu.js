/* globals discard, query, notify, navigate, starters, prefs, isFirefox, number, interrupts */
'use strict';

// Context Menu
{
  const TST = 'treestyletab@piro.sakura.ne.jp';

  const onStartup = async () => {
    const contexts = ['browser_action'];
    if (chrome.contextMenus.ContextType.TAB && prefs['tab.context']) {
      contexts.push('tab');
    }
    if (prefs['page.context']) {
      contexts.push('page');
    }
    const create = arr => {
      chrome.contextMenus.removeAll(() => {
        arr.forEach(o => chrome.contextMenus.create(o));
      });
    };

    create([{
      id: 'discard-tab',
      title: chrome.i18n.getMessage('menu_discard_tab'),
      contexts,
      documentUrlPatterns: ['*://*/*']
    },
    {
      id: 'discard-tree',
      title: chrome.i18n.getMessage('menu_discard_tree'),
      contexts,
      documentUrlPatterns: ['*://*/*']
    },
    {
      id: 'discard-other-windows',
      title: chrome.i18n.getMessage('menu_discard_other_windows'),
      contexts
    },
    {
      id: 'discard-sub-menu',
      title: chrome.i18n.getMessage('menu_discard_menu'),
      contexts
    },
    {
      id: 'discard-tabs',
      title: chrome.i18n.getMessage('menu_discard_tabs'),
      contexts
    },
    {
      id: 'discard-window',
      title: chrome.i18n.getMessage('menu_discard_window'),
      contexts,
      parentId: 'discard-sub-menu'
    },
    {
      id: 'discard-rights',
      title: chrome.i18n.getMessage('menu_discard_rights'),
      contexts,
      parentId: 'discard-sub-menu'
    },
    {
      id: 'discard-lefts',
      title: chrome.i18n.getMessage('menu_discard_lefts'),
      contexts,
      parentId: 'discard-sub-menu'
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
      contexts: ['link', 'bookmark'].filter(a => chrome.contextMenus.ContextType[a.toUpperCase()]),
      documentUrlPatterns: ['*://*/*']
    } : null].filter(o => o));
  };
  starters.push(onStartup);

  const onClicked = async (info, tab) => {
    if (tab && !tab.url) { // Tree Style Tab 3.0.12 and later don't deliver a real tab.
      // eslint-disable-next-line require-atomic-updates
      tab = await new Promise(resolve => chrome.tabs.get(tab.id, resolve));
    }
    // wait for plug-in to be ready
    await interrupts['before-action']();
    // wait for plug-in manipulations
    await interrupts['before-menu-click'](info, tab);
    //
    const {menuItemId, shiftKey} = info;
    if (menuItemId === 'whitelist-domain' || menuItemId === 'whitelist-session' || menuItemId === 'whitelist-exact') {
      const d = menuItemId !== 'whitelist-session';
      const {hostname, protocol = ''} = new URL(tab.url);

      let rule;
      if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
        let whitelist = prefs[d ? 'whitelist' : 'whitelist.session'];

        if (menuItemId === 'whitelist-exact') {
          rule = 're:^' + tab.url.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$';
        }
        else {
          rule = hostname;
        }
        whitelist.push(rule);
        whitelist = whitelist.filter((h, i, l) => l.indexOf(h) === i);
        chrome.storage.local.set({
          [d ? 'whitelist' : 'whitelist.session']: whitelist
        });
        notify(`"${rule}" ${chrome.i18n.getMessage(d ? 'menu_msg1' : 'menu_msg4')}`);
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
      const htabs = []; // these are tabs that will be discarded
      // discard-tree for Tree Style Tab
      if (menuItemId === 'discard-tree' && info.viewType === 'sidebar') {
        htabs.push(tab);
        await new Promise(resolve => chrome.runtime.sendMessage(TST, {
          type: 'get-tree',
          tab: tab.id
        }, tab => {
          const add = tab => {
            htabs.push(...tab.children);
            tab.children.filter(t => t.children).forEach(add);
          };
          add(tab);
          resolve();
        }));
      }
      // discard-tree for native
      else if (tab.highlighted && menuItemId === 'discard-tree') { // if a single not-active tab is called
        const tbs = tabs.filter(t => t.highlighted);
        if (tbs.length > 1) {
          htabs.push(...tbs);
        }
        else if (tab.groupId && tab.groupId > -1) {
          htabs.push(...tabs.filter(t => t.groupId === tab.groupId));
        }
        else {
          htabs.push(tab);
        }
      }
      else {
        htabs.push(tab);
      }

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
      if (isFirefox) {
        chrome.tabs.create({
          active: false,
          url: info.linkUrl,
          discarded: true
        });
      }
      else {
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
    else if (menuItemId === 'toggle-allowed') {
      chrome.tabs.update({
        autoDiscardable: tab.autoDiscardable === false
      });
    }
    // discard-tabs, discard-window, discard-other-windows, discard-rights, discard-lefts
    // release-tabs, release-window, release-other-windows, release-rights, release-lefts
    else {
      const info = {
        url: '*://*/*',
        discarded: menuItemId.startsWith('release'),
        active: false
      };
      if (
        ['discard-window', 'discard-rights', 'discard-lefts', 'release-window', 'release-rights', 'release-lefts']
          .some(k => k === menuItemId)
      ) {
        info.currentWindow = true;
      }
      else if (menuItemId === 'discard-other-windows' || menuItemId === 'release-other-windows') {
        info.currentWindow = false;
      }
      let tabs = await query(info);
      if (menuItemId.endsWith('rights') || menuItemId.endsWith('lefts')) {
        if (menuItemId.endsWith('lefts')) {
          tabs = tabs.filter(t => t.index < tab.index);
        }
        else {
          tabs = tabs.filter(t => t.index > tab.index);
        }
      }
      if (menuItemId.startsWith('discard')) {
        if (shiftKey) {
          tabs.forEach(discard);
        }
        else {
          // make sure to only discard possible tabs not all of them
          number.check(tabs, number.IGNORE);
        }
      }
      // release
      else {
        for (const tab of tabs) {
          chrome.tabs.reload(tab.id, {
            bypassCache: shiftKey ? true : false
          });
        }
      }
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
  chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.method === 'popup') {
      query({
        active: true,
        currentWindow: true
      }).then(tabs => {
        if (tabs.length) {
          onClicked({
            menuItemId: request.cmd,
            value: request.value,
            shiftKey: request.shiftKey
          }, tabs[0]);
        }
      });
    }
    else if (request.method === 'simulate') {
      onClicked({
        menuItemId: request.cmd
      }, sender.tab);
    }
    else if (request.method === 'build-context') {
      onStartup();
    }
  });
}
