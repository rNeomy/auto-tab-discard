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
    try {
      focus.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/trash/core.js']) {
    try {
      trash.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/force/core.js']) {
    try {
      force.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/next/core.js']) {
    try {
      next.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/previous/core.js']) {
    try {
      previous.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/blank/core.js']) {
    try {
      blank.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/new/core.js']) {
    try {
      create.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/unloaded/core.js']) {
    try {
      unloaded.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
  }
  if (prefs['./plugins/youtube/core.js']) {
    try {
      youtube.enable();
    }
    catch (e) {
      console.error('Failed to load plugin', e);
    }
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
