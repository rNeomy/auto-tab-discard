/* this watches if there are any unsaved forms on the page */

let checked = false;
const elements = new Set();

/* untouched state of focused controls, so that moving a control back to it
   releases the tab; WeakMap keeps no references after the element is gone */
const originals = new WeakMap();
addEventListener('focus', e => {
  const o = e.composedPath()[0];
  if (e.isTrusted === false || originals.has(o) ||
      (o.tagName !== 'INPUT' && o.tagName !== 'SELECT')) {
    return;
  }
  originals.set(o, {
    checked: Boolean(o.checked),
    value: String(o.value),
    files: o.files ? o.files.length : 0
  });
}, true);

/* an element protects the tab only while it deviates from its untouched state;
   a snapshot-less INPUT falls back to its own initial attributes */
const isDirty = e => {
  const s = originals.get(e);
  if (s) {
    return e.checked !== s.checked || e.value !== s.value || (e.files || []).length !== s.files;
  }
  if (e.type === 'checkbox' || e.type === 'radio') {
    return e.checked !== e.defaultChecked;
  }
  if (e.type === 'file') {
    return (e.files || []).length > 0;
  }
  return Boolean(e.value || e.textContent);
};

Object.defineProperty(window, 'isReceivingFormInput', {
  get() {
    // there is no attached modified element or all of them are back to their initial state
    try {
      if ([...elements].filter(e => e.isConnected && isDirty(e)).length === 0) {
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

/* add an editable element so isReceivingFormInput stays true until it is back
   to its untouched state; isDirty decides per type whether the element still
   deviates, so inert types and reverted values cannot protect the tab.
   See https://github.com/rNeomy/auto-tab-discard/issues/176 */
const register = o => {
  if (o.tagName === 'INPUT' || o.tagName === 'SELECT' || o.tagName === 'TEXTAREA' ||
      o.tagName === 'FORM' || o.isContentEditable) {
    elements.add(o);
    checked = true;
  }
};

addEventListener('keydown', e => {
  const {keyCode, target} = e;
  if (keyCode >= 48 && keyCode <= 90 && target.tagName) {
    register(target);
    if (target.type === 'application/pdf') {
      checked = true;
    }
  }
}, true);

/* register edits that arrive without a keydown event in the 48-90 keyCode range:
   IME composition (keyCode 229), context-menu paste, drag & drop, middle-click
   paste, autofill and dictation fire no such keydown, but all of them fire input */
addEventListener('input', e => {
  const o = e.composedPath()[0];
  // trusted events only; composedPath()[0] reaches fields inside open shadow roots
  if (e.isTrusted === false || !o || !o.tagName) {
    return;
  }
  register(o);
}, true);

/*  */
addEventListener('visibilitychange', () => {
  window.lastVisit = Date.now();
});

{
  /* Restart inactivity when previously audible media stops, including native PiP. */
  const playing = new WeakSet();
  const audible = media => media.muted === false && media.volume > 0;
  const remember = ({target, isTrusted}) => {
    if (isTrusted && target instanceof HTMLMediaElement && !target.paused && audible(target)) {
      playing.add(target);
    }
  };
  const stopped = ({target, isTrusted, type}) => {
    if (isTrusted && target instanceof HTMLMediaElement) {
      if (playing.has(target) || (type !== 'emptied' && target.currentTime > 0 && audible(target))) {
        window.lastMediaStop = Date.now();
      }
      playing.delete(target);
    }
  };
  for (const type of ['play', 'playing', 'volumechange']) {
    addEventListener(type, remember, true);
  }
  for (const type of ['pause', 'ended', 'emptied']) {
    addEventListener(type, stopped, true);
  }
}
