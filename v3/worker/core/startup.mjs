import {prefs, storage} from './prefs.mjs';

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
    starters.cache.length = 0;
  });

  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

export {starters};
