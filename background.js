/* globals hidden */
'use strict';

const isFirefox = /Firefox/.test(navigator.userAgent);

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
  'favicon-delay': isFirefox ? 500 : 100,
  'check-delay': 30 * 1000,
  'log': false,
  'simultaneous-jobs': 10,
  'idle-timeout': 5 * 60 // in seconds
};
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

const log = (...args) => prefs.log && console.log(...args);

const starters = []; // startup scripts

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

const discard = tab => new Promise(resolve => {
  if (tab.active) {
    return resolve();
  }
  if (discard.count > prefs['simultaneous-jobs']) {
    log('discarding queue for', tab);
    discard.tabs.push(tab);
    return resolve();
  }

  discard.count += 1;
  const next = () => {
    try {
      if (isFirefox) {
        chrome.tabs.discard(tab.id);
        restore.cache[tab.id] = tab;
      }
      else {
        chrome.tabs.discard(tab.id, () => chrome.runtime.lastError);
      }
    }
    catch (e) {}
    discard.count -= 1;
    if (discard.tabs.length) {
      const tab = discard.tabs.shift();
      discard(tab);
    }
    resolve();
  };
  // favicon
  if (prefs.favicon) {
    const src = tab.favIconUrl || '/data/page.png';

    Object.assign(new Image(), {
      crossOrigin: 'anonymous',
      src,
      onerror() {
        next();
      },
      onload() {
        const img = this;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.globalAlpha = 0.4;
          ctx.drawImage(img, 0, 0);

          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.fillStyle = '#a1a0a1';
          ctx.arc(img.width * 0.75, img.height * 0.75, img.width * 0.25, 0, 2 * Math.PI, false);
          ctx.fill();
          chrome.tabs.executeScript(tab.id, {
            runAt: 'document_start',
            allFrames: true,
            matchAboutBlank: true,
            code: `
              window.stop();
              if (window === window.top) {
                [...document.querySelectorAll('link[rel*="icon"]')].forEach(link => link.remove());

                document.querySelector('head').appendChild(Object.assign(document.createElement('link'), {
                  rel: 'icon',
                  type: 'image/png',
                  href: '${canvas.toDataURL('image/png')}'
                }));
              }
            `
          }, () => window.setTimeout(next, prefs['favicon-delay']) && chrome.runtime.lastError);
        }
        else {
          next();
        }
      }
    });
  }
  else {
    next();
  }
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
    if (info.status === 'complete' && tab.active === false) {
      tabs.check('chrome.tabs.onUpdated');
    }
    // update autoDiscardable set by this extension or other extensions
    if ('autoDiscardable' in info) {
      chrome.tabs.executeScript(tab.id, {
        code: `allowed = ${info.autoDiscardable}`
      });
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

chrome.runtime.onMessage.addListener((request, {tab}, resposne) => {
  const {method} = request;
  if (method === 'is-pinned') {
    resposne(tab.pinned);
  }
  else if (method === 'is-playing') {
    resposne(tab.audible);
  }
  else if (method === 'is-autoDiscardable') {
    resposne(tab.autoDiscardable);
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
  const onStartup = async () => {
    await storage(prefs).then(ps => Object.assign(prefs, ps));
    starters.forEach(c => c());
  };
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

// FAQs and Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    storage({
      'faqs': true,
      'last-update': 0
    }).then(prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
