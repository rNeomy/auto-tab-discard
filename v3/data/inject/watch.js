/* this watches if there are any unsaved forms on the page */

window.isReceivingFormInput = false;
addEventListener('keydown', e => {
  const {keyCode, target, path} = e;
  // check target
  if (keyCode >= 48 && keyCode <= 90 && target.tagName) {
    if (target.isContentEditable) {
      window.isReceivingFormInput = true;
    }
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'FORM') {
      window.isReceivingFormInput = true;
    }
    if (target.type === 'application/pdf') {
      window.isReceivingFormInput = true;
    }
  }
  // check custom elements
  if (keyCode >= 48 && keyCode <= 90 && path && path[0] !== target) {
    const o = path[0];
    if (o.isContentEditable) {
      window.isReceivingFormInput = true;
    }
    if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA' || o.tagName === 'FORM') {
      window.isReceivingFormInput = true;
    }
    if (o.type === 'application/pdf') {
      window.isReceivingFormInput = true;
    }
  }
}, true);

/*  */
addEventListener('visibilitychange', () => {
  window.lastVisit = Date.now();
});
