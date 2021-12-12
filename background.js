/* globals hidden, isFirefox */
'use strict';

const prefs = {
  'favicon': false,
  'prepends': '💤',
  'number': 6,
  'period': 10 * 60, // in seconds
  'click': 'click.popup',
  'go-hidden': false,
  'page.context': false,
  'tab.context': true,
  'link.context': true,
  'whitelist': [], // whitelist hostnames and regexp rules
  'whitelist.session': [], // clear on restart
  'favicon-delay': isFirefox ? 500 : 100,
  'check-delay': 30 * 1000,
  'log': false,
  'simultaneous-jobs': 10,
  'idle-timeout': 5 * 60, // in seconds
  'pinned': false, // pinned = true => do not discard if tab is pinned
  'startup-unpinned': false,
  'startup-pinned': false,
  'startup-release-pinned': false
};

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

const starters = {
  ready: false,
  cache: [],
  push(c) {
    if (starters.ready) {
      return c();
    }
    starters.cache.push(c);
  }
};

{
  // preference are only up-to-date on the first run. For all other needs call storage().then()
  const once = () => storage(prefs).then(ps => {
    Object.assign(prefs, ps);
    starters.ready = true;
    starters.cache.forEach(c => c());
    delete starters.cache;
  });
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

// clear session only hostnames from the exception list; only on the local machine
starters.push(() => chrome.storage.local.set({
  'whitelist.session': []
}));

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

const notify = e => chrome.notifications.create({ // eslint-disable-line no-unused-vars
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

// this list keeps ids of the tabs that are in progress of being discarded
const inprogress = new Set();

const discard = tab => {
  if (inprogress.has(tab.id)) {
    return;
  }
  // https://github.com/rNeomy/auto-tab-discard/issues/248
  inprogress.add(tab.id);
  setTimeout(() => inprogress.delete(tab.id), 2000);

  if (tab.active) {
    return;
  }
  if (tab.discarded) {
    return;
  }
  return storage(prefs).then(prefs => {
    if (discard.count > prefs['simultaneous-jobs'] && discard.time + 5000 < Date.now()) {
      discard.count = 0;
    }
    if (discard.count > prefs['simultaneous-jobs']) {
      log('discarding queue for', tab);
      discard.tabs.push(tab);
      return;
    }
    return new Promise(resolve => {
      discard.count += 1;
      discard.time = Date.now();
      const next = () => {
        try {
          if (isFirefox) {
            chrome.tabs.discard(tab.id);
          }
          else {
            chrome.tabs.discard(tab.id, () => chrome.runtime.lastError);
          }
        }
        catch (e) {
          log('discarding failed', e);
        }
        discard.count -= 1;
        if (discard.tabs.length) {
          const tab = discard.tabs.shift();
          inprogress.delete(tab.id);
          discard(tab);
        }
        resolve();
      };
      // favicon
      const icon = () => {
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

              ctx.globalAlpha = 0.6;
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
              }, () => setTimeout(next, prefs['favicon-delay']) && chrome.runtime.lastError);
            }
            else {
              next();
            }
          }
        });
      };
      // change title
      if (prefs.prepends) {
        chrome.tabs.executeScript(tab.id, {
          runAt: 'document_start',
          code: `
            window.stop();
            document.title = '${prefs.prepends.replace(/'/g, '_')} ' + (document.title || location.href);
          `
        }, () => {
          chrome.runtime.lastError;
          if (prefs.favicon) {
            icon();
          }
          else {
            setTimeout(next, prefs['favicon-delay']);
          }
        });
      }
      else {
        if (prefs.favicon) {
          icon();
        }
        else {
          next();
        }
      }
    });
  });
}
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
  }
  else if (method === 'storage') {
    storage(request.prefs).then(resposne);
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
const popup = () => chrome.browserAction.setPopup({
  popup: prefs.click === 'click.popup' ? 'data/popup/index.html' : ''
});
starters.push(popup);

// start-up
if (isFirefox) {
  // deal with hidden tabs
  hidden.install();
}

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage({
        'faqs': true,
        'last-update': 0
      }).then(prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            chrome.storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
