// v2
chrome.action = chrome.action || chrome.browserAction;

chrome.storage.session = chrome.storage.session || {
  get(ps, c) {
    const r = {};
    for (const [key, value] of Object.entries(ps)) {
      const o = sessionStorage.getItem(key);
      r[key] = o ? JSON.parse(o) : value;
    }
    c(r);
  },
  set(ps, c = () => {}) {
    for (const [key, value] of Object.entries(ps)) {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
    c();
  },
  remove(key) {
    sessionStorage.removeItem(key);
  }
};

chrome.scripting = chrome.scripting || {
  executeScript({target, files, func, world, args = []}) {
    const props = {};

    if (files) {
      props.file = files[0];
    }
    if (func) {
      const s = btoa(encodeURIComponent(JSON.stringify(args)));
      props.code = `{
        const f = ${func.toString()};
        const context = '${world}';


        if (context !== 'MAIN') {
          f(...JSON.parse(decodeURIComponent(atob('${s}'))));
        }
        else {
          const s = document.createElement('script');
          s.textContent = '(' + f.toString() + ')(...JSON.parse(decodeURIComponent(atob("${s}"))))';
          document.body.append(s);
          s.remove();
        }
      }`;
    }
    if (target.allFrames) {
      props.allFrames = true;
      props.matchAboutBlank = true;
    }
    props.runAt = 'document_start';

    return new Promise((resolve, reject) => chrome.tabs.executeScript(target.tabId, props, r => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(lastError);
      }
      else {
        resolve(r.map(result => ({result})));
      }
    }));
  }
};

chrome.contextMenus.create = new Proxy(chrome.contextMenus.create, {
  apply(target, self, [properties]) {
    properties.contexts = properties.contexts.map(s => s === 'action' ? 'browser_action' : s);
    Reflect.apply(target, self, [properties]);
  }
});

/* Firefox Only */
if (/Firefox/.test(navigator.userAgent)) {
  const cache = {};
  chrome.tabs.onRemoved.addListener(id => delete cache[id]);

  if (location.href.includes('popup')) {
    chrome.tabs.update = new Proxy(chrome.tabs.update, {
      apply(target, self, args) {
        chrome.runtime.getBackgroundPage(bg => {
          bg.chrome.tabs.update(...args);
        });
      }
    });
    chrome.tabs.query = new Proxy(chrome.tabs.query, {
      apply(target, self, args) {
        chrome.runtime.getBackgroundPage(bg => {
          bg.chrome.tabs.query(...args);
        });
      }
    });
  }
  else {
    chrome.tabs.update = new Proxy(chrome.tabs.update, {
      apply(target, self, args) {
        const [id, props] = args;

        if ('autoDiscardable' in props) {
          if (props.autoDiscardable) {
            delete cache[id];
          }
          else {
            cache[id] = true;
          }
          delete args[1].autoDiscardable;
        }
        if (Object.keys(args[1]).length) {
          Reflect.apply(target, self, args);
        }
      }
    });
    chrome.tabs.query = new Proxy(chrome.tabs.query, {
      apply(target, self, args) {
        const query = args[0];

        const b = args[0].autoDiscardable;
        delete args[0].autoDiscardable;

        const c = args[0].status;
        delete args[0].status;

        Reflect.apply(target, self, [query, tabs => {
          if (b) {
            tabs = tabs.filter(t => cache[t.id] !== true);
          }
          if (c) {
            tabs = tabs.filter(t => t.status === c);
          }
          for (const tab of tabs) {
            if (cache[tab.id]) {
              tab.autoDiscardable = false;
            }
          }

          args[1](tabs);
        }]);
      }
    });
  }
}
