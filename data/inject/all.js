'use strict';

var post = o => window.top.postMessage(Object.assign(o, {
  cmd: 'ntd-command'
}), '*');

let isPlaying = 0;
document.addEventListener('play', () => {
  isPlaying += 1;
  post({
    audio: true
  });
}, true);
document.addEventListener('pause', () => {
  isPlaying -= 1;
  post({
    audio: false
  });
}, true);

document.addEventListener('change', e => e.target.closest('form') && post({
  form: true
}), true);
document.addEventListener('submit', () => post({
  form: false
}), true);
