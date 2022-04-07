// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
});

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'tab-is-active') {
    window.close();
  }
});
document.addEventListener('click', () => window.close());

// close this window if it is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.close();
  }
});
