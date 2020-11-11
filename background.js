/* globals hidden */
'use strict';

const isFirefox = /Firefox/.test(navigator.userAgent);
const starters = []; // startup scripts

// Firefox only
const restore = {
  cache: {}
};

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

const prefs = {
  'idle': false,
  'favicon': true,
  'number': 6,
  'period': 10 * 60, // in seconds
  'click': 'click.popup',
  'go-hidden': false,
  'page.context': false,
  'tab.context': true,
  'link.context': true,
  'whitelist': [],
  'whitelist.session': [], // clear on restart
  'favicon-delay': isFirefox ? 500 : 100,
  'check-delay': 30 * 1000,
  'log': false,
  'simultaneous-jobs': 10,
  'idle-timeout': 5 * 60 // in seconds
};
// clear session only hostnames from the exception list; only on the local machine
starters.push(() => chrome.storage.local.set({
  'whitelist.session': []
}));
prefs.ready = false;
prefs.onReady = {
  es: [],
  add(c) {
    if (prefs.ready) {
      c();
    }
    else {
      prefs.onReady.es.push(c);
    }
  }
};
storage(prefs).then(ps => {
  delete ps.onReady;
  Object.assign(prefs, ps);
  prefs.ready = true;
  for (const c of prefs.onReady.es) {
    c();
  }
});

chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => {
    prefs[k] = ps[k].newValue;
  });
  if (ps.period) {
    tabs[prefs.period ? 'install' : 'uninstall']();
  }
  if (isFirefox && ps['go-hidden']) {
    hidden.install();
  }
  if (ps.click) {
    popup();
  }
  if (ps['idle-timeout']) {
    chrome.idle.setDetectionInterval(prefs['idle-timeout']);
  }
});

const log = (...args) => prefs.log && console.log(new Date(), ...args);

const notify = e => chrome.notifications.create({// eslint-disable-line no-unused-vars
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: 'data/icons/48.png',
  message: e.message || e
});

const query = options => new Promise(resolve => chrome.tabs.query(options, resolve));

const navigate = (method, discarded = false) => query({
  currentWindow: true
}).then(tbs => {
  const active = tbs.filter(tbs => tbs.active).shift();
  const next = tbs.filter(t => t.discarded === discarded && t.index > active.index);
  const previous = tbs.filter(t => t.discarded === discarded && t.index < active.index);
  let ntab;
  if (method === 'move-next') {
    ntab = next.length ? next.shift() : previous.shift();
  }
  else {
    ntab = previous.length ? previous.pop() : next.pop();
  }
  if (ntab) {
    chrome.tabs.update(ntab.id, {
      active: true
    }, () => {
      if (method === 'close') {
        chrome.tabs.remove(active.id);
      }
    });
  }
  else {
    // https://github.com/rNeomy/auto-tab-discard/issues/41#issuecomment-422923307
    return navigate(method, true);
  }
});

var isBackingUp = false;
// Used to backup all 
const backupTabs = () => {
  if(isBackingUp){return;}

  isBackingUp = true;
  chrome.tabs.query({}, function(tabs){
    var data = tabs.map((t) => {return{'url':t.url, 'title':t.title}})
    var backups = []
    chrome.storage.local.get({
      'tab-backup': []
    }, prefs => {
      backups = prefs['tab-backup']

      if(backups.length >= 5){ // Clean Old Backups
        backups.shift();
      }
      backups.push(data);
    
      chrome.storage.local.set({
        ['tab-backup']: backups
      }, () => {
        isBackingUp = false;
      });
    });
  });
}

// Discard Tab and replace with Dummy html
// Favicon handled by dummy.js itself
const discard = tab => new Promise(resolve => {
  // No need as it will be active with dummy.html
  // if (tab.active) {
  //   return resolve();
  // }
  if (discard.count > prefs['simultaneous-jobs'] && discard.time + 5000 < Date.now()) {
    discard.count = 0;
  }
  if (discard.count > prefs['simultaneous-jobs']) {
    log('discarding queue for', tab);
    discard.tabs.push(tab);
    return resolve();
  }

  discard.count += 1;
  discard.time = Date.now();
  const next = () => {
    // Load the Dummy page instead of directly discarding it.
    if(tab.url.indexOf(chrome.extension.getURL('dummy.html')) < 0){
      // log(tab)
      chrome.tabs.update(tab.id, {
        url: chrome.extension.getURL('dummy.html')+'#url='+encodeURIComponent(tab.url)+'&title='+tab.title+'&fav='+(tab.favIconUrl||'')
      })
    }
    discard.count -= 1;
    if (discard.tabs.length) {
      const tab = discard.tabs.shift();
      discard(tab);
    }
    resolve();
  };
  next();
});

// Discard Self gets called when a page is dummy.html and is active=false
// It the discards the dummy itself
const discardSelf = tab => new Promise(resolve => {
  const next = () => {
    // log(tab)
    try {
      if (isFirefox) {
        chrome.tabs.discard(tab.id);
        restore.cache[tab.id] = tab;
      }
      else {
        chrome.tabs.discard(tab.id, () => chrome.runtime.lastError);
      }
    }
    catch (e) {
      log('discarding failed', e);
    }
    resolve();
  };
  next();
});

// Used on First Load to load the title and Favicon
const loadDummy = (window=false) => {
  var options = {
    discarded: true,
    url: chrome.extension.getURL('dummy.html')
  }
  if(window){ // For window specific
    options.windowId = window.id
  }

  chrome.tabs.query(options, function(tabs){
    for (var i = 0; i < tabs.length; i++) {
      // log(tabs[i])
      chrome.tabs.update(tabs[i].id, {
        url: tabs[i].url
      }, function(tab){
        setTimeout(function(){
          // CODE TO FIX BUG - WHEN discardSelf gets called when tab is active
          // i.e. When, we visit it while this setTimeout period is running (quick hands)
          chrome.tabs.get(tab.id, function(timed_out_tab){
            if(timed_out_tab
              && !timed_out_tab.active 
              && !timed_out_tab.highlighted
              && timed_out_tab.autoDiscardable
            ){
              discardSelf(timed_out_tab);
            }
          })
        }, 2000) // Bit of delay to let it load its dummy.js
      })                
    }
  });
}

// Discard the dummy.html if it is active=false, discarded=false
// autoDiscardable=true
const discardDummy = () => {
  chrome.tabs.query({
    active: false,
    discarded: false,
    status: "complete",
    url: chrome.extension.getURL('dummy.html')
  }, function(tabs){
    // Good Place to Backup tabs occasionally
    // If some tabs are about to get discarded
    if(tabs.length > 0){backupTabs();}

    tabs.forEach((tab) => discardSelf(tab))
  });
}

// Call to discard any possible dummy.html which is not discarded and is not active
chrome.tabs.onActivated.addListener((activeInfo) => {
  discardDummy()
})

chrome.windows.onCreated.addListener((window) => {
  // Wait few seconds to load tabs and trigger loadDummy on new Window load
  // loadDummy Gets called from onStartup on first load
  // But, on windows created event it is called again. (only for this window/cases like open new window with our dummy in it.)
  setTimeout(function(){
    loadDummy(window);
  }, 2000);
});

discard.tabs = [];
discard.count = 0;

chrome.runtime.onMessageExternal.addListener((request, sender, resposne) => {
  if (request.method === 'discard') {
    query(request.query).then((tbs = []) => {
      tbs = tbs.filter(({url, discarded, active}) => (url.startsWith('http') ||
        url.startsWith('ftp')) && !discarded && !active);
      tbs.forEach(discard);
      resposne(tbs.map(t => t.id));
    });
    return true;
  }
});

// number-based discarding
const tabs = {
  id: null // timer id
};
tabs.check = msg => {
  if (tabs.check.busy && (tabs.check.busy + prefs['check-delay'] > Date.now())) {
    return log('tabs.check is ignored. Reason:', msg);
  }
  if (prefs.period) {
    log('set a new check timer. Based on:', msg);
    tabs.check.busy = Date.now();
    window.clearTimeout(tabs.check.id);
    tabs.check.id = window.setTimeout(() => {
      tabs._check();
      tabs.check.busy = false;
    }, prefs['check-delay']);
  }
};

tabs._check = async () => {
  log('tabs._check is called');
  if (prefs.idle) {
    const state = await new Promise(resolve => chrome.idle.queryState(prefs['idle-timeout'], resolve));
    if (state !== chrome.idle.IdleState.IDLE) {
      return log('tabs._check is skipped', 'idle state is active');
    }
  }
  // in case
  discard.count = 0;
  //
  const echo = ({id}) => new Promise(resolve => chrome.tabs.sendMessage(id, {
    method: 'introduce'
  }, a => {
    chrome.runtime.lastError;
    resolve(a);
  }));

  const tbs = await query({
    url: '*://*/*',
    discarded: false
  });
  const {number, period} = prefs;
  const now = Date.now();
  const arr = [];
  for (const tab of tbs) {
    const a = await echo(tab);
    if (a) {
      a.tabId = tab.id;
      a.tab = tab;
    }
    arr.push(a);
  }
  if (arr.length > number) {
    log('tabs', arr);
    const possibleDiscardables = arr
      .sort((a, b) => a.now - b.now)
      .filter(a => {
        // https://github.com/rNeomy/auto-tab-discard/issues/84#issuecomment-559011394
        if (a) {
          log('discardable', a, a.exception !== true, a.allowed, a.ready, !a.tab.active, (now - a.now > period * 1000));
          return a.exception !== true && a.allowed && a.ready && !a.tab.active && (now - a.now > period * 1000);
        }
        else {
          return false;
        }
      });
    let total = arr.length;
    log('number of tabs to get discarded', possibleDiscardables.length);
    for (const o of possibleDiscardables) {
      discard(o.tab);
      total -= 1;
      if (total <= number) {
        break;
      }
    }
    log('number of tabs being discarded', arr.length - total);
  }
  else {
    log('tabs._check', 'number of active tabs', arr.length, 'is smaller than', number);
  }
};

tabs.callbacks = {
  onCreated: () => tabs.check('chrome.tabs.onCreated'),
  onUpdated(id, info, tab) {
    if (info.status !== 'unloaded' && tab.active === false) {
      tabs.check('chrome.tabs.onUpdated');
    }
    // update autoDiscardable set by this extension or other extensions
    if ('autoDiscardable' in info) {
      chrome.tabs.executeScript(tab.id, {
        code: `allowed = ${info.autoDiscardable}`
      });
      tabs.mark(id, info.autoDiscardable);
    }
  },
  onStateChanged() {
    tabs.check('chrome.idle.onStateChanged');
  }
};

tabs.install = () => {
  log('installing auto discarding listeners');
  // top.js does not being called
  chrome.tabs.onCreated.addListener(tabs.callbacks.onCreated);
  chrome.tabs.onUpdated.addListener(tabs.callbacks.onUpdated);
  chrome.idle.onStateChanged.addListener(tabs.callbacks.onStateChanged);
};

tabs.uninstall = () => {
  log('removing auto discarding listeners');

  chrome.tabs.onCreated.removeListener(tabs.callbacks.onCreated);
  chrome.tabs.onUpdated.removeListener(tabs.callbacks.onUpdated);
  chrome.idle.onStateChanged.removeListener(tabs.callbacks.onStateChanged);
};

starters.push(() => prefs.period && tabs.install());

tabs.mark = (tabId, autoDiscardable) => {
  chrome.browserAction.setBadgeText({
    tabId,
    text: autoDiscardable ? '' : 'd'
  });
  chrome.browserAction.setTitle({
    tabId,
    title: autoDiscardable ? '' : chrome.i18n.getMessage('bg_msg_1')
  });
};
chrome.browserAction.setBadgeBackgroundColor({
  color: '#666'
});

chrome.runtime.onMessage.addListener((request, {tab}, resposne) => {
  log('onMessage request received', request);
  const {method} = request;
  if (method === 'is-pinned') {
    resposne(tab.pinned);
  }
  else if (method === 'is-playing') {
    if (tab.audible) {
      resposne(true);
    }
    else {
      chrome.tabs.executeScript(tab.id, {
        code: 'document.pictureInPictureElement ? 10 : isPlaying',
        allFrames: true,
        matchAboutBlank: true
      }, arr => {
        if (arr) {
          resposne(arr.some(a => a > 0));
        }
        else {
          resposne(false);
        }
      });
    }
    return true;
  }
  else if (method === 'is-autoDiscardable') {
    resposne(tab.autoDiscardable);
    if (tab.autoDiscardable === false) {
      tabs.mark(tab.id, false);
    }
  }
  else if (method === 'tabs.check') {
    tabs.check('tab.timeout');
  }
  else if (method === 'discard.on.load') { // for links after initial load
    discard(tab);
  }
  // navigation
  else if (method.startsWith('move-') || method === 'close') {
    navigate(method);
  }
  else if (method === 'report') {
    chrome.browserAction.setTitle({
      tabId: tab.id,
      title: request.message
    });
  }else if (method === 'discard-self') {
    discardSelf(tab)
  }
});
// idle timeout
starters.push(() => chrome.idle.setDetectionInterval(prefs['idle-timeout']));

// initial inject
starters.push(() => chrome.app && query({
  url: '*://*/*',
  discarded: false
}).then(tbs => {
  const contentScripts = chrome.app.getDetails().content_scripts;
  for (const tab of tbs) {
    for (const cs of contentScripts) {
      chrome.tabs.executeScript(tab.id, {
        file: cs.js[0],
        runAt: cs.run_at,
        allFrames: cs.all_frames
      }, () => chrome.runtime.lastError);
    }
  }
}));
// left-click action
const popup = async () => {
  chrome.browserAction.setPopup({
    popup: prefs.click === 'click.popup' ? 'data/popup/index.html' : ''
  });
};
starters.push(popup);
// start-up
(() => {
  const onStartup = () => prefs.onReady.add(() => {
    starters.forEach(c => c());
    loadDummy();
  });
  // Firefox does not call "onStartup" after enabling the extension
  if (isFirefox) {
    // restore crashed tabs
    chrome.tabs.onActivated.addListener(({tabId}) => {
      const tab = restore.cache[tabId];
      if (tab) {
        chrome.tabs.executeScript(tabId, {
          code: ''
        }, () => {
          const lastError = chrome.runtime.lastError;
          if (lastError && lastError.message === 'No matching message handler') {
            chrome.tabs.update(tabId, {
              url: tab.url
            });
            log('[Firefox] force reloading due to communication error', lastError);
          }
        });
      }
    });
    // https://github.com/rNeomy/auto-tab-discard/issues/24#issuecomment-391316498
    query({
      discarded: true
    }).then((tbs = []) => tbs.forEach(t => restore.cache[t.id] = t));
    chrome.tabs.onRemoved.addListener(tabId => delete restore.cache[tabId]);
    // deal with hidden tabs
    hidden.install();
    // start-up
    onStartup();
  }
  else {
    chrome.runtime.onInstalled.addListener(onStartup);
    chrome.runtime.onStartup.addListener(onStartup);
  }
})();

/* discard on startup */
{
  chrome.runtime.onStartup.addListener(() => storage({
    'startup-unpinned': false,
    'startup-pinned': false,
    'startup-release-pinned': false
  }).then(prefs => {
    if (prefs['startup-unpinned']) {
      chrome.tabs.query({
        discarded: false,
        pinned: false
      }, tabs => tabs.forEach(discard));
    }
    if (prefs['startup-pinned']) {
      chrome.tabs.query({
        discarded: false,
        pinned: true
      }, tabs => tabs.forEach(discard));
    }
    else if (prefs['startup-release-pinned']) {
      chrome.tabs.query({
        discarded: true,
        pinned: true
      }, tabs => tabs.forEach(tab => chrome.tabs.reload(tab.id)));
    }
  }));
}

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
