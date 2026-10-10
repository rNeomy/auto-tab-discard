import {prefs, storage} from './prefs.mjs';
import {log} from './utils.mjs';
import {overlay} from './favicon.mjs';

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
    log('tab is active', tab);
    return;
  }
  if (tab.discarded) {
    log('already discarded', tab);
    return;
  }
  return storage(prefs).then(prefs => {
    if (discard.count > prefs['simultaneous-jobs'] && discard.time + 5000 < Date.now()) {
      discard.count = 0;
    }
    if (discard.count > prefs['simultaneous-jobs']) {
      log('discarding queue for', tab.id, tab.url);
      discard.tabs.push(tab);
      return;
    }

    return new Promise(resolve => {
      discard.count += 1;
      discard.time = Date.now();
      const next = () => {
        discard.perform(tab);

        discard.count -= 1;
        if (discard.tabs.length) {
          const tab = discard.tabs.shift();
          inprogress.delete(tab.id);
          discard(tab);
        }
        resolve();
      };
      // prepend a symbol to the tab title (e.g. 💤), so that discarded tabs can
      // be recognized at a glance. This step is kept separate from the favicon:
      // it only targets the top frame and is bounded by a timeout, so neither
      // slow sub-frames nor favicon failures can prevent the title from being
      // updated. On timeout the discarding still proceeds. There is no way to
      // mark tabs that are discarded by Firefox itself or restored lazily from
      // a session since they have no live DOM to modify
      const title = prefs.prepends ? Promise.race([
        new Promise(resolve => setTimeout(resolve, 1000)),
        chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          func: symbol => {
            window.stop();
            const title = document.title || location.href || '';
            if (title.startsWith(symbol) === false) {
              document.title = symbol + ' ' + title;
            }
          },
          args: [prefs.prepends]
        })
      ]).catch(e => log('title change failed', e.message)) : Promise.resolve();

      title.then(() => {
        // replace the favicon with a dimmed version that has a gray dot.
        // The icon is rendered in the background which is not restricted by
        // the page's CORS (see core/favicon.mjs), then a tiny script swaps
        // the icon link elements. If the icon cannot be obtained for any
        // reason, the original favicon stays untouched

        const go = prefs.favicon ? chrome.tabs.get(tab.id).then(t => overlay(t.favIconUrl || '')).then(dataUrl => {
          return chrome.scripting.executeScript({
            target: {
              tabId: tab.id
            },
            func: href => {
              [...document.querySelectorAll('link[rel*="icon"]')].forEach(link => link.remove());

              document.querySelector('head').appendChild(Object.assign(document.createElement('link'), {
                rel: 'icon',
                type: 'image/png',
                href
              }));
            },
            args: [dataUrl]
          });
        }).then(() => {
          log('favicon overlay applied');
          // wait for favicon to get applied
          return new Promise(resolve => setTimeout(resolve, 1000));
        }) : Promise.resolve();

        // do not wait longer than 3 seconds for the icon; in case of any
        // failure, the tab is discarded with its original favicon
        const painting = Promise.race([
          new Promise(resolve => setTimeout(resolve, 3000)),
          go
        ]).then(() => next('one'), e => {
          log('favicon overlay skipped', e.message || e);
          next('one');
        });
        go.catch(() => {}); // the unobserved promise is not ours to handle
        return painting;
      });
    });
  });
};
discard.tabs = [];
discard.count = 0;
discard.perform = tab => {
  try {
    log('discarding', tab.id, tab.title, tab.url);
    chrome.tabs.discard(tab.id).catch(e => {});
  }
  catch (e) {
    log('discarding failed', e);
  }
};

export {discard, inprogress};
