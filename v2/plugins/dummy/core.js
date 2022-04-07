const discard = chrome.tabs.discard;

function enable() {
  chrome.tabs.discard = function(tabId, callback = () => {}) {
    chrome.tabs.executeScript(tabId, {
      code: `history.pushState('', '', '');`
    }, () => {
      chrome.tabs.get(tabId, tab => {
        chrome.tabs.update(tabId, {
          url: '/plugins/dummy/page.html?title=' + encodeURIComponent(tab.title) +
            '&href=' + encodeURIComponent(tab.href) +
            '&icon=' + encodeURIComponent(tab.favIconUrl)
        });
      });
    });
  };
}
function disable() {
  chrome.tabs.discard = discard;
}

export {
  enable,
  disable
};
