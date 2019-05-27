'use strict';

var log = (...args) => false && console.log(...args);

var starters = []; // startup scripts

var notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: 'data/icons/48.png',
  message: e.message || e
});

var storage = obj => new Promise(resolve => chrome.storage.local.get(obj, resolve));
storage.set = prefs => chrome.storage.local.set(prefs);
var query = options => new Promise(resolve => chrome.tabs.query(options, resolve));

var navigate = (method, discarded = false) => query({
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

const isFirefox = /Firefox/.test(navigator.userAgent);

const DELAY = isFirefox ? 500 : 100;

var restore = { // Firefox only
  cache: {}
};
if (isFirefox) {
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
          log('reloading');
        }
      });
    }
  });
  // https://github.com/rNeomy/auto-tab-discard/issues/24#issuecomment-391316498
  query({
    discarded: true
  }).then((tbs = []) => tbs.forEach(t => restore.cache[t.id] = t));
  chrome.tabs.onRemoved.addListener(tabId => delete restore.cache[tabId]);
}

var discard = tab => {
  if (tab.active) {
    return;
  }
  const next = () => {
    if (isFirefox) {
      chrome.tabs.discard(tab.id);
      restore.cache[tab.id] = tab;
    }
    else {
      chrome.tabs.discard(tab.id, () => chrome.runtime.lastError);
    }
  };
  // favicon
  storage({
    'favicon': true
  }).then(prefs => {
    if (prefs.favicon) {
      Object.assign(new Image(), {
        crossOrigin: 'anonymous',
        src: tab.favIconUrl || '/data/page.png',
        onerror: next,
        onload: function() {
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
            const href = canvas.toDataURL('image/png');

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
                    href: '${href}'
                  }));
                }
              `
            }, () => window.setTimeout(next, DELAY) && chrome.runtime.lastError);
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
};
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
var tabs = {
  id: null // timer id
};
tabs.check = msg => {
  log(msg);
  window.clearTimeout(tabs.id);
  tabs.id = window.setTimeout(tabs._check, DELAY);
};

tabs._check = async () => {
  log('tabs._check');
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
  const {number, period} = await storage({
    number: 6,
    period: 10 * 60 // in seconds
  });
  const now = Date.now();
  const arr = (await Promise.all(tbs.map(echo))).filter((a, i) => {
    if (a) {
      a.tabId = tbs[i].id;
      a.tab = tbs[i];
    }
    return a;
  });
  if (arr.length > number) {
    const possibleDiscardables = arr
      .sort((a, b) => a.now - b.now)
      .filter(a => {
        log('discardable', a, a.exception !== true, a.allowed, a.ready, !a.tab.active, (now - a.now > period * 1000));
        return a.exception !== true && a.allowed && a.ready && !a.tab.active && (now - a.now > period * 1000);
      });
    let total = arr.length;
    for (const o of possibleDiscardables) {
      discard(o.tab);
      total -= 1;
      if (total <= number) {
        break;
      }
    }
    log('number of tabs being discarded', arr.length - total);
  }
};

tabs.callbacks = {
  onCreated: () => tabs.check('chrome.tabs.onCreated'),
  onUpdated: (id, info, tab) => {
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
  onStateChanged: async state => {
    if (state === 'active') {
      tabs.check('chrome.idle.onStateChanged');
    }
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

starters.push(() => storage({
  period: 10 * 60 // in seconds
}).then(({period}) => period && tabs.install()));

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.period) {
    tabs[prefs.period.newValue ? 'install' : 'uninstall']();
  }
});

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
{
  const callback = async () => {
    const {click} = await storage({
      click: 'click.popup'
    });
    chrome.browserAction.setPopup({
      popup: click === 'click.popup' ? 'data/popup/index.html' : ''
    });
  };
  starters.push(callback);
  chrome.storage.onChanged.addListener(prefs => prefs.click && callback());
}
// start-up
document.addEventListener('DOMContentLoaded', () => {
  const onStartup = () => starters.forEach(c => c());
  // Firefox does not call "onStartup" after enabling the extension
  if (isFirefox) {
    onStartup();
  }
  else {
    chrome.runtime.onInstalled.addListener(onStartup);
    chrome.runtime.onStartup.addListener(onStartup);
  }
});

{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
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
