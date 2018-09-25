'use strict';

document.open();
document.close();
const title = document.createElement('title');
if (!document.head) {
  const head = document.createElement('head');
  document.documentElement.appendChild(head);
}
document.head.appendChild(title);

chrome.runtime.sendMessage({
  method: 'discard.on.load'
});
