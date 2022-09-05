// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e[e.dataset.i18nValue || 'textContent'] = chrome.i18n.getMessage(e.dataset.i18n);
});

const args = new URLSearchParams(location.search);
document.title = chrome.i18n.getMessage('blank_header') + ' ' + args.get('title');

const favicon = args.get('favicon');
if (favicon) {
  const link = document.createElement('link');
  link.setAttribute('rel', 'icon');
  link.setAttribute('href', favicon);
  document.head.appendChild(link);
}

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
