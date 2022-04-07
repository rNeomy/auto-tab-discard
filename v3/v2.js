// v2
chrome.action = chrome.action || chrome.browserAction;

chrome.storage.cache = {};
chrome.storage.session = chrome.storage.session || {
  get(ps, c) {
    const r = {};
    for (const [key, value] of Object.entries(ps)) {
      r[key] = chrome.storage.cache[key] || value;
    }
    c(r);
  },
  set(ps) {
    for (const [key, value] of Object.entries(ps)) {
      chrome.storage.cache[key] = value;
    }
  },
  remove(key) {
    delete chrome.storage.cache[key];
  }
};

chrome.scripting = chrome.scripting || {
  executeScript({target, files, func, args = []}) {
    const props = {};

    if (files) {
      props.file = files[0];
    }
    if (func) {
      const s = btoa(encodeURIComponent(JSON.stringify(args)));
      props.code = '(' + func.toString() + `)(...JSON.parse(decodeURIComponent(atob('${s}'))))`;
    }
    if (target.allFrames) {
      props.allFrames = true;
      props.matchAboutBlank = true;
    }

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
