/*
  add "autoDiscardable" support to "chrome.tabs.query" and "chrome.tabs.update"
*/
if (/Firefox/.test(navigator.userAgent)) {
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
