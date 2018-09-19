'use strict';

document.write(`<head><title>${location.href}</title></head><body>Lazy Loading...</body>`);

chrome.runtime.sendMessage({
  method: 'discard.on.load'
});
