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
