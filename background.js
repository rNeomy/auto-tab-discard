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
  'idle-timeout': 5 * 60, // in seconds
  'pinned': false // pinned = true => do not discard if tab is pinned
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
  // if (tab.discarded) {
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
      let dummy_url = chrome.extension.getURL('dummy.html')+'#url='+encodeURIComponent(tab.url)+'&title='+tab.title+'&fav='+(tab.favIconUrl||'');
      // log(tab)
      // If normal tab, use location replace to remove this dummy from history
      if ((tab.url.indexOf('http') === 0 || tab.url.indexOf('ftp') === 0) && !tab.discarded){
        chrome.tabs.executeScript(tab.id, {
          runAt: 'document_start',
          matchAboutBlank: true,
          code: `
            window.stop();
            location.replace("${dummy_url}");
          `
        }, () => chrome.runtime.lastError);
      } 
      // Else use chrome update function
      else{
        chrome.tabs.update(tab.id, {
          url: dummy_url
        })
      }
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

// FIRST: Handle tabs that got discarded automatically (e.g. by browser itself) using this extension (by loading dummy)
// THEN: discard dummy.html pages that are not yet discarded
const checkForLeftOverDiscardedTabs = () => {
  chrome.tabs.query({
    active: false,
    discarded: true,
    url: "*://*/*"
  }, function(tabs){
    let i = 0;
    if(tabs.length > 0) {
      tabs.forEach((tab) => {
        discard(tab).then(() => {
          i = i++;
          if(i >= tabs.length) {
            discardDummy()
          }
        })      
      })
    } else {
      discardDummy()
    }
  });
}

// Call to discard any possible dummy.html which is not discarded and is not active
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkForLeftOverDiscardedTabs()
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

const tabs = {};
// number-based discarding

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

chrome.runtime.onMessage.addListener((request, sender, resposne) => {
  log('onMessage request received', request);
  const {method} = request;
  if (method === 'is-unload-blocked') {
    chrome.tabs.executeScript(sender.tab.id, {
      file: 'data/inject/form.js',
      allFrames: true,
      matchAboutBlank: true
    }, arr => {
      resposne((arr || []).some(a => a));
    });
    return true;
  }
  else if (method === 'tabs.check') {
    tabs.check('tab.timeout');
  }
  else if (method === 'discard.on.load') { // for links after initial load
    discard(sender.tab);
  }
  // navigation
  else if (method.startsWith('move-') || method === 'close') {
    navigate(method);
  }
  else if (method === 'report') {
    chrome.browserAction.setTitle({
      tabId: sender.tab.id,
      title: request.message
    });
  }else if (method === 'discard-self') {
    discardSelf(tab)
  }
  else if (method === 'storage') {
    storage(request.prefs).then(prefs => {
      resposne(prefs);
    });
    return true;
  }
  /* TO-DO: remove the following methods when autoDiscardable is supported in FF */
  else if (method === 'tabs.update') {
    chrome.tabs.update(request.tabId, request.updateProperties, resposne);
    return true;
  }
  else if (method === 'tabs.query') {
    chrome.tabs.query(request.queryInfo, resposne);
    return true;
  }
});
// idle timeout
starters.push(() => chrome.idle.setDetectionInterval(prefs['idle-timeout']));

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
  starters.push(() => storage({
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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
