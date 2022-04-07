/* globals storage */

/* plug-in system */
const ready = storage({
  './plugins/dummy/core.js': false,
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
  const actives = [
    import('./plugins/startup/core.js').then(o => o.enable())
  ];

  if (prefs['./plugins/dummy/core.js']) {
    const p = import('./plugins/dummy/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/focus/core.js']) {
    const p = import('./plugins/focus/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/trash/core.js']) {
    const p = import('./plugins/trash/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/force/core.js']) {
    const p = import('./plugins/force/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/next/core.js']) {
    const p = import('./plugins/next/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/previous/core.js']) {
    const p = import('./plugins/previous/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/blank/core.js']) {
    const p = import('./plugins/blank/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/new/core.js']) {
    const p = import('./plugins/new/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/unloaded/core.js']) {
    const p = import('./plugins/unloaded/core.js').then(o => o.enable());
    actives.push(p);
  }
  if (prefs['./plugins/youtube/core.js']) {
    const p = import('./plugins/youtube/core.js').then(o => o.enable());
    actives.push(p);
  }

  return Promise.all(actives);
});

const interrupts = { // eslint-disable-line no-unused-vars
  'before-menu-click'() {
    return Promise.resolve();
  },
  'before-action'() {
    return ready;
  }
}; // this is used to interrupt an internal process from a plug-in

chrome.storage.onChanged.addListener(ps => {
  // AMO does not like dynamic imports
  if ('./plugins/dummy/core.js' in ps) {
    import('./plugins/dummy/core.js').then(o => o[ps['./plugins/dummy/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/focus/core.js' in ps) {
    import('./plugins/focus/core.js').then(o => o[ps['./plugins/focus/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/trash/core.js' in ps) {
    import('./plugins/trash/core.js').then(o => o[ps['./plugins/trash/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/force/core.js' in ps) {
    import('./plugins/force/core.js').then(o => o[ps['./plugins/force/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/next/core.js' in ps) {
    import('./plugins/next/core.js').then(o => o[ps['./plugins/next/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/previous/core.js' in ps) {
    import('./plugins/previous/core.js').then(o => o[ps['./plugins/previous/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/blank/core.js' in ps) {
    import('./plugins/blank/core.js').then(o => o[ps['./plugins/blank/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/new/core.js' in ps) {
    import('./plugins/new/core.js').then(o => o[ps['./plugins/new/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/unloaded/core.js' in ps) {
    import('./plugins/unloaded/core.js').then(o => o[ps['./plugins/unloaded/core.js'].newValue ? 'enable' : 'disable']());
  }
  if ('./plugins/youtube/core.js' in ps) {
    import('./plugins/youtube/core.js').then(o => o[ps['./plugins/youtube/core.js'].newValue ? 'enable' : 'disable']());
  }
});
