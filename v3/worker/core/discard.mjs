import {prefs, storage} from './prefs.mjs';
import {log} from './utils.mjs';

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
      log('discarding queue for', tab);
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
      // change title or favicon
      if (prefs.prepends || prefs.favicon) {
        const href = tab.favIconUrl || '';
        Promise.race([
          new Promise(resolve => setTimeout(resolve, 1000, [])),
          chrome.scripting.executeScript({
            target: {
              tabId: tab.id,
              allFrames: true
            },
            func: (prefs, src) => {
              window.stop();
              if (window === window.top) {
                if (prefs.prepends) {
                  const title = document.title || location.href || '';
                  if (title.startsWith(prefs.prepends) === false) {
                    document.title = prefs.prepends + ' ' + title;
                  }

                  if (prefs.favicon === false) {
                    return true;
                  }
                }
                if (prefs.favicon) {
                  const observe = (request, sender, response) => {
                    if (request.method === 'fix-favicon') {
                      chrome.runtime.onMessage.removeListener(observe);

                      [...document.querySelectorAll('link[rel*="icon"]')].forEach(link => link.remove());

                      const draw = img => {
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
                          const href = canvas.toDataURL();
                          document.querySelector('head').appendChild(Object.assign(document.createElement('link'), {
                            rel: 'icon',
                            type: 'image/png',
                            href
                          }));
                          response('done');
                        }
                        else {
                          response('NO_CTX');
                        }
                      };
                      Object.assign(new Image(), {
                        crossOrigin: 'anonymous',
                        src,
                        onerror() { // fallback image
                          Object.assign(new Image(), {
                            src: chrome.runtime.getURL('/data/page.png'),
                            onerror(e) {
                              response(e.message || 'CORS');
                            },
                            onload() {
                              draw(this);
                            }
                          });
                        },
                        onload() {
                          draw(this);
                        }
                      });
                      return true;
                    }
                  };
                  chrome.runtime.onMessage.addListener(observe);
                  return 'async';
                }
              }
              return false;
            },
            args: [prefs, href]
          })
        ]).then(r => {
          if (r.some(o => o.result === 'async')) {
            chrome.tabs.sendMessage(tab.id, {
              method: 'fix-favicon'
            }, reason => setTimeout(next, prefs['favicon-delay'], reason));
          }
          else {
            next('one');
          }
        }).catch(e =>next(e.message));
      }
      else {
        next('two');
      }
    });
  });
};
discard.tabs = [];
discard.count = 0;
discard.perform = tab => {
  try {
    chrome.tabs.discard(tab.id, () => chrome.runtime.lastError);
  }
  catch (e) {
    log('discarding failed', e);
  }
};

export {discard, inprogress};
