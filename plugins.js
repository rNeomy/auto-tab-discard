/* globals storage */

const interrupts = { // eslint-disable-line no-unused-vars
  'before-menu-click'() {
    return Promise.resolve();
  }
}; // this is used to interrupt an internal process from a plug-in

/* plug-in system */
storage({
  './plugins/dummy/core.js': false,
  './plugins/focus/core.js': false,
  './plugins/trash/core.js': false,
  './plugins/force/core.js': false,
  './plugins/next/core.js': false,
  './plugins/previous/core.js': false,
  './plugins/blank/core.js': true
}).then(prefs => {
  if (prefs['./plugins/dummy/core.js']) {
    import('./plugins/dummy/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/focus/core.js']) {
    import('./plugins/focus/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/trash/core.js']) {
    import('./plugins/trash/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/force/core.js']) {
    import('./plugins/force/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/next/core.js']) {
    import('./plugins/next/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/previous/core.js']) {
    import('./plugins/previous/core.js').then(o => o.enable());
  }
  if (prefs['./plugins/blank/core.js']) {
    import('./plugins/blank/core.js').then(o => o.enable());
  }
});
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
});
