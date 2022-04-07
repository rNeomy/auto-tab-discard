/* global log, query, discard */

function enable() {
  log('unloaded.install is called');
  query({status: 'unloaded'}).then(tbs => {
    tbs.forEach(tb => discard(tb));
  });
}
function disable() {
  log('unloaded.disable is called');
}

export {
  enable,
  disable
};
