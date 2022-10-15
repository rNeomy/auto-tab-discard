/* this watches if there are any unsaved forms on the page */

let checked = false;
const elements = new Set();

Object.defineProperty(window, 'isReceivingFormInput', {
  get() {
    // there is no attached modified element or all of them are empty
    try {
      if ([...elements].filter(e => e.isConnected && (e.value || e.textContent)).length === 0) {
        return false;
      }
    }
    catch (e) {}

    return checked;
  }
});
// reset on submit;
addEventListener('submit', () => {
  checked = false;
  elements.clear();
});

addEventListener('keydown', e => {
  const {keyCode, target, path} = e;
  // check target
  if (keyCode >= 48 && keyCode <= 90 && target.tagName) {
    if (target.isContentEditable) {
      elements.add(target);
      checked = true;
    }
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'FORM') {
      elements.add(target);
      checked = true;
    }
    if (target.type === 'application/pdf') {
      checked = true;
    }
  }
  // check custom elements
  if (keyCode >= 48 && keyCode <= 90 && path && path[0] !== target) {
    const o = path[0];
    if (o.isContentEditable) {
      elements.add(o);
      checked = true;
    }
    if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA' || o.tagName === 'FORM') {
      elements.add(o);
      checked = true;
    }
    if (o.type === 'application/pdf') {
      checked = true;
    }
  }
}, true);

/*  */
addEventListener('visibilitychange', () => {
  window.lastVisit = Date.now();
});
