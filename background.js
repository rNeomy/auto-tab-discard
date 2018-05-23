'use strict';

const notify = e => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: 'data/icons/128.png',
  message: e.message || e
});

var prefs = obj => new Promise(resolve => chrome.storage.local.get(obj, resolve));
var query = options => new Promise(resolve => chrome.tabs.query(options, resolve));

var navigate = method => chrome.tabs.query({
  currentWindow: true,
  discarded: false
}, tbs => {
  const active = tbs.filter(tbs => tbs.active).shift();
  const next = tbs.filter(t => t.index > active.index);
  const previous = tbs.filter(t => t.index < active.index);
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
    notify('No active tab is present');
  }
});

// https://github.com/rNeomy/auto-tab-discard/issues/24
const isFirefox = /Firefox/.test(navigator.userAgent);

const DELAY = isFirefox ? 500 : 100;

var restore = {
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
          // console.log('reloading');
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
    chrome.tabs.discard(tab.id);
    if (isFirefox) {
      restore.cache[tab.id] = tab;
    }
  };
  // favicon
  Object.assign(new Image(), {
    crossOrigin: 'anonymous',
    src: tab.favIconUrl || '/data/page.png',
    onerror: next,
    onload: function() {
      const img = this;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
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
            console.log(document.readyState);
          }
        `,
      }, () => window.setTimeout(next, DELAY));
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
const tabs = {
  id: null
};
tabs.check = (msg) => {
  // console.log(msg);
  window.clearTimeout(tabs.id);
  tabs.id = window.setTimeout(tabs._check, DELAY);
};

tabs._check = async() => {
  // console.log('tabs._check');
  const echo = ({id}) => new Promise(resolve => chrome.tabs.sendMessage(id, {
    method: 'introduce'
  }, resolve));

  const tbs = await query({
    url: '*://*/*'
  });
  const {number, period} = await prefs({
    number: 6,
    period: 10 * 60, // in seconds
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
    const toBeDiscarded = arr
      .filter(a => a.exception !== true && a.allowed && a.ready && !a.tab.active && (now - a.now > period * 1000))
      .sort((a, b) => b.now - a.now).slice(number);
    //console.log(toBeDiscarded);
    toBeDiscarded.map(a => a.tab).forEach(discard);
    // console.log('number of tabs being discarded', toBeDiscarded.length, toBeDiscarded.map(t => t.tab.title));
  }
};
// top.js does not being called
chrome.tabs.onCreated.addListener(() => tabs.check('chrome.tabs.onCreated'));
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.status === 'complete' && tab.active === false) {
    tabs.check('chrome.tabs.onUpdated');
  }
  // update autoDiscardable set by this extension or other extensions
  if ('autoDiscardable' in info) {
    chrome.tabs.executeScript(tab.id, {
      code: `allowed = ${info.autoDiscardable}`
    });
  }
});
chrome.idle.onStateChanged.addListener(async(state) => {
  if (state === 'active') {
    tabs.check('chrome.idle.onStateChanged');
  }
});
chrome.runtime.onMessage.addListener(({method, message}, {tab}, resposne) => {
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
  else if (method === 'notify') {
    notify(message);
  }
  // navigation
  else if (method.startsWith('move-') || method === 'close') {
    navigate(method);
  }
});
// initial inject
{
  const callback = () => chrome.app && chrome.tabs.query({
    url: '*://*/*',
    discarded: false
  }, tbs => {
    const contentScripts = chrome.app.getDetails().content_scripts;
    for (const tab of tbs) {
      for (const cs of contentScripts) {
        chrome.tabs.executeScript(tab.id, {
          file: cs.js[0],
          runAt: cs.run_at,
          allFrames: cs.all_frames,
        });
      }
    }
  });
  // Firefox does not call "onStartup" after enabling the extension
  if (isFirefox) {
    callback();
  }
  else {
    chrome.runtime.onInstalled.addListener(callback);
    chrome.runtime.onStartup.addListener(callback);
  }
}

// left-click action
{
  const callback = async() => {
    const {click} = await prefs({
      click: 'click.popup'
    });
    chrome.browserAction.setPopup({
      popup: click === 'click.popup' ? 'data/popup/index.html' : ''
    });
  };
  // Firefox does not call "onStartup" after enabling the extension
  if (isFirefox) {
    callback();
  }
  else {
    chrome.runtime.onInstalled.addListener(callback);
    chrome.runtime.onStartup.addListener(callback);
  }
  chrome.storage.onChanged.addListener(prefs => prefs.click && callback());
}

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': true,
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
