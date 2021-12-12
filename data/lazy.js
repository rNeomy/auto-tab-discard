'use strict';

const s = document.title;

document.open();
document.close();
const title = document.createElement('title');
title.textContent = s || location.href;
if (!document.head) {
  const head = document.createElement('head');
  document.documentElement.appendChild(head);
}
document.head.appendChild(title);

chrome.runtime.sendMessage({
  method: 'discard.on.load'
});
