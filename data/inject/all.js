'use strict';

var post = o => window.top.postMessage(Object.assign(o, {
  cmd: 'ntd-command'
}), '*');

document.addEventListener('play', () => post({
  audio: true
}), true);
document.addEventListener('pause', () => post({
  audio: false
}), true);

document.addEventListener('change', e => e.target.closest('form') && post({
  form: true
}), true);
document.addEventListener('submit', () => post({
  form: false
}), true);
