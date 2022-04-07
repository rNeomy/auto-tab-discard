/* global discard, log */

const perform = discard.perform;

function enable() {
  log('installing youtube/core.js');
  discard.perform = tab => {
    if (tab.url && tab.url.startsWith('https://www.youtube.com/')) {
      chrome.tabs.executeScript(tab.id, {
        runAt: 'document_start',
        file: '/plugins/youtube/inject.js'
      }, () => {
        chrome.runtime.lastError;
        perform(tab);
      });
    }
    else {
      perform(tab);
    }
  };
}
function disable() {
  log('removing youtube/core.js');
  discard.perform = perform;
}

export {
  enable,
  disable
};
