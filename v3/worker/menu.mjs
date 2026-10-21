import {number} from './modes/number.mjs';
import {storage, prefs} from './core/prefs.mjs';
import {navigate} from './core/navigate.mjs';
import {discard, inprogress} from './core/discard.mjs';
import {query, notify, match, icon} from './core/utils.mjs';
import {starters} from './core/startup.mjs';
import {interrupts} from './plugins/loader.mjs';

// Context Menu
{
  const buildMenu = async () => {
    if (buildMenu.busy) {
      return;
    }
    buildMenu.busy = true;

    const visibilityPrefs = await storage({
      'menu.discard-tab': true,
      'menu.discard-tree': true,
      'menu.discard-window': false,
      'menu.discard-rights': false,
      'menu.discard-lefts': false,
      'menu.discard-other-windows': true,
      'menu.discard-tabs': true,
      'menu.auto-discardable': true,
      'menu.allow-discardable': true,
      'menu.whitelist-domain': true,
      'menu.release-tab': false,
      'menu.release-tree': false,
      'menu.release-window': false,
      'menu.release-rights': false,
      'menu.release-lefts': false,
      'menu.release-other-windows': false,
      'menu.release-tabs': true
    });

    const contexts = ['action'];
    if (chrome.contextMenus.ContextType.TAB && prefs['tab.context']) {
      contexts.push('tab');
    }
    if (prefs['page.context']) {
      contexts.push('page');
    }

    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
      id: 'discard-tab',
      title: chrome.i18n.getMessage('menu_discard_tab'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      visible: visibilityPrefs['menu.discard-tab']
    });
    chrome.contextMenus.create({
      id: 'discard-tree',
      title: chrome.i18n.getMessage('menu_discard_tree'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      visible: visibilityPrefs['menu.discard-tree']
    });
    chrome.contextMenus.create({
      id: 'discard-other-windows',
      title: chrome.i18n.getMessage('menu_discard_other_windows'),
      contexts,
      visible: visibilityPrefs['menu.discard-other-windows']
    });
    chrome.contextMenus.create({
      id: 'discard-tabs',
      title: chrome.i18n.getMessage('menu_discard_tabs'),
      contexts,
      visible: visibilityPrefs['menu.discard-tabs']
    });
    chrome.contextMenus.create({
      id: 'discard-sub-menu',
      title: chrome.i18n.getMessage('menu_discard_menu'),
      contexts,
      visible: visibilityPrefs['menu.discard-window'] ||
        visibilityPrefs['menu.discard-rights'] ||
        visibilityPrefs['menu.discard-lefts']
    });
    chrome.contextMenus.create({
      id: 'discard-window',
      title: chrome.i18n.getMessage('menu_discard_window'),
      contexts,
      parentId: 'discard-sub-menu',
      visible: visibilityPrefs['menu.discard-window']
    });
    chrome.contextMenus.create({
      id: 'discard-rights',
      title: chrome.i18n.getMessage('menu_discard_rights'),
      contexts,
      parentId: 'discard-sub-menu',
      visible: visibilityPrefs['menu.discard-rights']
    });
    chrome.contextMenus.create({
      id: 'discard-lefts',
      title: chrome.i18n.getMessage('menu_discard_lefts'),
      contexts,
      parentId: 'discard-sub-menu',
      visible: visibilityPrefs['menu.discard-lefts']
    });
    chrome.contextMenus.create({
      id: 'release-tab',
      title: chrome.i18n.getMessage('menu_release_tab'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      visible: visibilityPrefs['menu.release-tab']
    });
    chrome.contextMenus.create({
      id: 'release-tree',
      title: chrome.i18n.getMessage('menu_release_tree'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      visible: visibilityPrefs['menu.release-tree']
    });
    chrome.contextMenus.create({
      id: 'release-other-windows',
      title: chrome.i18n.getMessage('menu_release_other_windows'),
      contexts,
      visible: visibilityPrefs['menu.release-other-windows']
    });
    chrome.contextMenus.create({
      id: 'release-tabs',
      title: chrome.i18n.getMessage('menu_release_tabs'),
      contexts,
      visible: visibilityPrefs['menu.release-tabs']
    });
    chrome.contextMenus.create({
      id: 'release-sub-menu',
      title: chrome.i18n.getMessage('menu_release_menu'),
      contexts,
      visible: visibilityPrefs['menu.release-window'] ||
        visibilityPrefs['menu.release-rights'] ||
        visibilityPrefs['menu.release-lefts']
    });
    chrome.contextMenus.create({
      id: 'release-window',
      title: chrome.i18n.getMessage('menu_release_window'),
      contexts,
      parentId: 'release-sub-menu',
      visible: visibilityPrefs['menu.release-window']
    });
    chrome.contextMenus.create({
      id: 'release-rights',
      title: chrome.i18n.getMessage('menu_release_rights'),
      contexts,
      parentId: 'release-sub-menu',
      visible: visibilityPrefs['menu.release-rights']
    });
    chrome.contextMenus.create({
      id: 'release-lefts',
      title: chrome.i18n.getMessage('menu_release_lefts'),
      contexts,
      parentId: 'release-sub-menu',
      visible: visibilityPrefs['menu.release-lefts']
    });
    chrome.contextMenus.create({
      id: 'extra',
      title: chrome.i18n.getMessage('menu_extra'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      visible: visibilityPrefs['menu.auto-discardable'] ||
        visibilityPrefs['menu.allow-discardable'] ||
        visibilityPrefs['menu.whitelist-domain']
    });
    chrome.contextMenus.create({
      id: 'auto-discardable',
      title: chrome.i18n.getMessage('popup_allowed'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      parentId: 'extra',
      visible: visibilityPrefs['menu.auto-discardable']
    });
    chrome.contextMenus.create({
      id: 'allow-discardable',
      title: chrome.i18n.getMessage('popup_allowed_reset'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      parentId: 'extra',
      visible: visibilityPrefs['menu.allow-discardable']
    });
    chrome.contextMenus.create({
      id: 'whitelist-domain',
      title: chrome.i18n.getMessage('menu_whitelist_domain'),
      contexts,
      documentUrlPatterns: ['*://*/*'],
      parentId: 'extra',
      visible: visibilityPrefs['menu.whitelist-domain']
    });
    chrome.contextMenus.create({
      id: 'open-tab-then-discard',
      title: chrome.i18n.getMessage('menu_open_tab_then_discard'),
      contexts: ['link', 'bookmark'].filter(a => chrome.contextMenus.ContextType[a.toUpperCase()]),
      documentUrlPatterns: ['*://*/*'],
      visible: prefs['link.context']
    });

    buildMenu.busy = false;
  };

  const onStartup = () => buildMenu();
  starters.push(onStartup);
  chrome.storage.onChanged.addListener(ps => {
    for (const [key, value] of Object.entries(ps)) {
      if (key.startsWith('menu.')) {
        chrome.contextMenus.update(key.replace('menu.', ''), {
          visible: value.newValue
        });

        if (key === 'menu.auto-discardable' || key === 'menu.allow-discardable' || key === 'menu.whitelist-domain') {
          storage({
            'menu.auto-discardable': true,
            'menu.allow-discardable': true,
            'menu.whitelist-domain': true
          }).then(prefs => chrome.contextMenus.update('extra', {
            visible: prefs['menu.auto-discardable'] ||
              prefs['menu.allow-discardable'] ||
              prefs['menu.whitelist-domain']
          }));
        }
        if (key === 'menu.discard-window' || key === 'menu.discard-rights' || key === 'menu.discard-lefts') {
          storage({
            'menu.discard-window': false,
            'menu.discard-rights': false,
            'menu.discard-lefts': false
          }).then(prefs => chrome.contextMenus.update('discard-sub-menu', {
            visible: prefs['menu.discard-window'] || prefs['menu.discard-rights'] || prefs['menu.discard-lefts']
          }));
        }
        if (key === 'menu.release-window' || key === 'menu.release-rights' || key === 'menu.release-lefts') {
          storage({
            'menu.release-window': false,
            'menu.release-rights': false,
            'menu.release-lefts': false
          }).then(prefs => chrome.contextMenus.update('release-sub-menu', {
            visible: prefs['menu.release-window'] || prefs['menu.release-rights'] || prefs['menu.release-lefts']
          }));
        }
      }
      else if (key === 'link.context') {
        chrome.contextMenus.update('open-tab-then-discard', {
          visible: value.newValue
        });
      }
      else if (key === 'page.context' || key === 'tab.context') {
        buildMenu();
      }
    }
  });

  const onClicked = async (info, tab) => {
    if (typeof interrupts !== 'undefined') {
      // wait for plug-in to be ready
      await interrupts['before-action']();
      // wait for plug-in manipulations
      await interrupts['before-menu-click'](info, tab);
    }
    else {
      console.warn('plugins module is not loaded');
    }
    //
    const {menuItemId, shiftKey, checked} = info;

    if (menuItemId === 'whitelist-domain' || menuItemId === 'whitelist-session') {
      storage(prefs).then(async prefs => {
        Object.assign(prefs, await storage({
          'whitelist.session': []
        }, 'session'));

        const d = menuItemId !== 'whitelist-session';

        const {hostname, protocol = ''} = new URL(tab.url);

        let rule;
        if (protocol.startsWith('http') || protocol.startsWith('ftp')) {
          let whitelist = prefs[d ? 'whitelist' : 'whitelist.session'];

          if (shiftKey) {
            rule = 're:^' + tab.url.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$';
          }
          else {
            rule = hostname;
          }

          if (checked === false) {
            whitelist = whitelist.filter(rule => {
              const m = match([rule], hostname, tab.url);

              if (m) {
                // https://github.com/rNeomy/auto-tab-discard/issues/350
                // notify(`"${rule}" ${chrome.i18n.getMessage(d ? 'menu_msg5' : 'menu_msg6')}`);
                return false;
              }
              else {
                return true;
              }
            });
          }
          else {
            whitelist.push(rule);

            // https://github.com/rNeomy/auto-tab-discard/issues/350
            // notify(`"${rule}" ${chrome.i18n.getMessage(d ? 'menu_msg1' : 'menu_msg4')}`);
          }
          whitelist = whitelist.filter((h, i, l) => l.indexOf(h) === i);

          const check = () => number.check([], {
            'exclude-active': false,
            'icon-update': true
          }, 'menu/1');

          if (d) {
            chrome.storage.local.set({whitelist}, check);
          }
          else {
            chrome.storage.session.set({
              'whitelist.session': whitelist
            }, check);
          }
        }
        else {
          notify(`"${protocol}" ${chrome.i18n.getMessage('menu_msg2')}`);
        }
      });
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
        try {
          const resp = await chrome.runtime.sendMessage('treestyletab@piro.sakura.ne.jp', {
            type: 'get-tree',
            tab: tab.id
          });
          const add = resp => {
            htabs.push(...resp.children);
            resp.children.filter(t => t.children).forEach(add);
          };
          add(resp);
        }
        catch (e) {
          console.error(e);
        }
      }
      // discard-tree for native (discards highlighted tabs. if not discards tabs of the same group)
      else if (menuItemId === 'discard-tree') { // if a single not-active tab is called
        if (tab.highlighted) {
          const tbs = tabs.filter(t => t.highlighted);
          if (tbs.length > 1) {
            htabs.push(...tbs);
          }
        }
        if (htabs.length < 2) {
          if (tab.groupId && tab.groupId > -1) {
            htabs.push(...tabs.filter(t => t.groupId === tab.groupId));
          }
        }
        if (htabs.length === 0) {
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
          .filter(t => {
            return t.discarded === false && t.highlighted === false && t.status !== 'unloaded' &&
              ids.indexOf(t.id) === -1 &&
              inprogress.has(t.id) === false;
          })
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
      if (/Firefox/.test(navigator.userAgent)) {
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
        }, tab => chrome.scripting.executeScript({
          target: {tabId: tab.id},
          func: () => window.stop()
        }).then(() => chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['/data/lazy.js']
        })));
      }
    }
    else if (
      menuItemId === 'auto-discardable' || menuItemId === 'allow-discardable' || menuItemId === 'toggle-allowed'
    ) {
      // must work on all selected tabs
      const tabs = await query({
        currentWindow: true,
        highlighted: true
      });

      // when called from page context menu, there is no value
      let autoDiscardable;
      if (menuItemId === 'auto-discardable') {
        autoDiscardable = false;
      }
      else if (menuItemId === 'allow-discardable') {
        autoDiscardable = true;
      }
      else {
        autoDiscardable = tab.autoDiscardable === false;
      }
      for (const tab of tabs) {
        await chrome.tabs.update(tab.id, {
          autoDiscardable
        });
      }
      if (autoDiscardable === false) {
        number.check(tabs, {
          'exclude-active': false,
          'icon-update': true
        }, 'menu/3');
      }
      else {
        for (const tab of tabs) {
          icon.reset(tab);
        }
      }
    }
    // discard-tabs, discard-window, discard-other-windows, discard-rights, discard-lefts
    // release-tabs, release-window, release-other-windows, release-rights, release-lefts
    else if (menuItemId === 'release-tab') {
      chrome.tabs.reload(tab.id, {
        bypassCache: shiftKey ? true : false
      });
    }
    else if (menuItemId === 'release-tree') {
      let tabs = await query({
        windowId: tab.windowId,
        url: '*://*/*',
        discarded: true,
        active: false
      });
      // release-tree for Tree Style Tab
      if (info.viewType === 'sidebar') {
        const ids = [tab.id];
        try {
          const resp = await chrome.runtime.sendMessage('treestyletab@piro.sakura.ne.jp', {
            type: 'get-tree',
            tab: tab.id
          });
          const add = resp => {
            ids.push(...resp.children.map(t => t.id));
            resp.children.filter(t => t.children).forEach(add);
          };
          add(resp);
        }
        catch (e) {
          console.error(e);
        }
        tabs = tabs.filter(t => ids.includes(t.id));
      }
      // release-tree for native
      else if (tab.groupId && tab.groupId > -1) {
        tabs = tabs.filter(t => t.groupId === tab.groupId);
      }
      else {
        tabs = tabs.filter(t => t.highlighted);
      }
      for (const t of tabs) {
        chrome.tabs.reload(t.id, {
          bypassCache: shiftKey ? true : false
        });
      }
    }
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
          number.check(tabs, number.IGNORE, 'menu/2');
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

  const onMessage = (request, sender) => {
    if (request.method === 'popup') {
      query({
        active: true,
        currentWindow: true
      }).then(tabs => {
        if (tabs.length) {
          onClicked({
            menuItemId: request.cmd,
            value: request.value,
            checked: request.checked,
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
    else if (request.method === 'allow-discardable' || request.method === 'auto-discardable') {
      onClicked({
        menuItemId: request.method
      }, {}); // there is no sender tab from popup but we dont need it for these actions
    }
    // navigation
    else if (request.method.startsWith('move-') || request.method === 'close') {
      if (request.method.startsWith('move-')) {
        navigate(request.method);
      }
      else { // close
        storage({
          'discard-protected-on-close': false
        }).then(prefs => {
          if (prefs['discard-protected-on-close']) {
            // Is this a pinned tab or part of a group?
            query({
              active: true,
              currentWindow: true
            }).then(tabs => {
              for (const tab of tabs) {
                if (tab.pinned || (Number.isInteger(tab.groupId) && tab.groupId !== -1)) {
                  onClicked({
                    menuItemId: 'discard-tab'
                  }, tab);
                }
                else {
                  navigate(request.method);
                }
              }
            });
          }
          else {
            navigate(request.method);
          }
        });
      }
    }
  };

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // respect the popup's "Force Discard" toggle; context-menu events carry no shift info
    if (String(info.menuItemId).startsWith('discard')) {
      info.shiftKey = info.shiftKey || (await storage({
        'force-discard': false
      }))['force-discard'];
    }
    await onClicked(info, tab);
  });
  chrome.action.onClicked.addListener(async tab => {
    const prefs = await storage({
      'click': 'click.popup'
    });
    onClicked({
      menuItemId: prefs.click.replace('click.', '')
    }, tab);
  });
  // commands
  chrome.commands.onCommand.addListener(async command => {
    // 'toggle-discarding' is handled by the "temporarily disable auto discarding" block in modes/number.mjs
    if (command === 'toggle-discarding') {
      return;
    }
    const tabs = await query({
      active: true,
      currentWindow: true
    });
    if (tabs.length) {
      const tab = tabs.at(0);
      if (command.startsWith('move-') || command === 'close') {
        onMessage({
          method: command
        }, {
          tab
        });
      }
      else {
        if (tabs.length) {
          onClicked({
            menuItemId: command
          }, tab);
        }
      }
    }
  });
  chrome.runtime.onMessage.addListener((request, sender) => onMessage(request, sender));
}
