import {query} from './utils.mjs';

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
  // prevent infinite loop
  else if (discarded === false) {
    // https://github.com/rNeomy/auto-tab-discard/issues/41#issuecomment-422923307
    return navigate(method, true);
  }

  // https://github.com/rNeomy/auto-tab-discard/issues/264#issuecomment-1001410665
  if (method === 'close' && !ntab && tbs.length === 1 && tbs[0].active) {
    chrome.tabs.remove(active.id);
  }
});

export {navigate};
