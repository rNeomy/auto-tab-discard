import {storage} from '../core/prefs.mjs';
import startup from './startup/core.mjs';
import focus from './focus/core.mjs';
import trash from './trash/core.mjs';
import force from './force/core.mjs';
import next from './next/core.mjs';
import previous from './previous/core.mjs';
import blank from './blank/core.mjs';
import create from './create/core.mjs';
import unloaded from './unloaded/core.mjs';
import youtube from './youtube/core.mjs';

const D = {
  'before-menu-click'() {
    return Promise.resolve();
  },
  'before-action'() {
    return ready;
  }
};

// this is used to interrupt an internal process from a plug-in
const interrupts = D;

const overwrite = (name, c) => {
  interrupts[name] = c;
};
const release = name => {
  interrupts[name] = D[name];
};

/* plug-in system */
const ready = storage({
  './plugins/focus/core.js': false,
  './plugins/trash/core.js': false,
  './plugins/force/core.js': false,
  './plugins/next/core.js': false,
  './plugins/previous/core.js': false,
  './plugins/blank/core.js': true,
  './plugins/new/core.js': false,
  './plugins/unloaded/core.js': false,
  './plugins/youtube/core.js': false
}).then(prefs => {
  startup.enable();

  if (prefs['./plugins/focus/core.js']) {
    focus.enable();
  }
  if (prefs['./plugins/trash/core.js']) {
    trash.enable();
  }
  if (prefs['./plugins/force/core.js']) {
    force.enable();
  }
  if (prefs['./plugins/next/core.js']) {
    next.enable();
  }
  if (prefs['./plugins/previous/core.js']) {
    previous.enable();
  }
  if (prefs['./plugins/blank/core.js']) {
    blank.enable();
  }
  if (prefs['./plugins/new/core.js']) {
    create.enable();
  }
  if (prefs['./plugins/unloaded/core.js']) {
    unloaded.enable();
  }
  if (prefs['./plugins/youtube/core.js']) {
    youtube.enable();
  }
});

chrome.storage.onChanged.addListener(ps => {
  // AMO does not like dynamic imports
  if ('./plugins/focus/core.js' in ps) {
    focus[ps['./plugins/focus/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/trash/core.js' in ps) {
    trash[ps['./plugins/trash/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/force/core.js' in ps) {
    force[ps['./plugins/force/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/next/core.js' in ps) {
    next[ps['./plugins/next/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/previous/core.js' in ps) {
    previous[ps['./plugins/previous/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/blank/core.js' in ps) {
    blank[ps['./plugins/blank/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/new/core.js' in ps) {
    create[ps['./plugins/new/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/unloaded/core.js' in ps) {
    unloaded[ps['./plugins/unloaded/core.js'].newValue ? 'enable' : 'disable']();
  }
  if ('./plugins/youtube/core.js' in ps) {
    youtube[ps['./plugins/youtube/core.js'].newValue ? 'enable' : 'disable']();
  }
});

export {
  interrupts,
  overwrite,
  release
};
