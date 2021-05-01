/*
  add "autoDiscardable" support to "chrome.tabs.query" and "chrome.tabs.update"
*/

const isFirefox = /Firefox/.test(navigator.userAgent) || typeof InstallTrigger !== 'undefined';

if (isFirefox) {
  const cache = {};
  const query = chrome.tabs.query;
  chrome.tabs.query = function(queryInfo, callback = () => {}) {
    const b = 'autoDiscardable' in queryInfo;
    const v = queryInfo.autoDiscardable;
    delete queryInfo.autoDiscardable;
    query.apply(this, [queryInfo, tabs => {
      if (b) {
        tabs = tabs.filter(tab => v ? cache[tab.id] !== false : cache[tab.id] === false);
      }
      for (const tab of tabs) {
        tab.autoDiscardable = tab.id in cache ? cache[tab.id] : true;
      }
      callback(tabs);
    }]);
  };
  const update = chrome.tabs.update;
  chrome.tabs.update = function(tabId, updateProperties, callback = () => {}) {
    const b = 'autoDiscardable' in updateProperties;
    const v = updateProperties.autoDiscardable;
    delete updateProperties.autoDiscardable;
    const next = () => {
      if (b) {
        cache[tabId] = v;
      }
      callback();
    };
    if (Object.keys(updateProperties).length) {
      update.apply(this, [tabId, updateProperties, next]);
    }
    else {
      next();
    }
  };
  chrome.tabs.onRemoved.addListener(tabId => delete cache[tabId]);
}

// FF onCreated is called when tab.url is still about:blank
if (isFirefox) {
  const pa = chrome.tabs.onCreated.addListener;
  chrome.tabs.onCreated.addListener = c => {
    c._ = tab => {
      if (tab.url === 'about:blank') {
        const observe = (id, info) => {
          if (id === tab.id && info.title) {
            chrome.tabs.onUpdated.removeListener(observe);
            setTimeout(c, 1000, tab);
          }
        };
        chrome.tabs.onUpdated.addListener(observe);
        setTimeout(() => {
          if (chrome.tabs.onUpdated.hasListener(observe)) {
            c(tab);
            chrome.tabs.onUpdated.removeListener(observe);
          }
        }, 10000);
      }
      else {
        c(tab);
      }
    };
    pa.call(chrome.tabs.onCreated, c._);
  };
  const pr = chrome.tabs.onCreated.removeListener;
  chrome.tabs.onCreated.removeListener = c => {
    pr.call(this, c._ || c);
  };
}
