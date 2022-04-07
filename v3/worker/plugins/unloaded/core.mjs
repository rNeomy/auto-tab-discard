import {log, query} from '../../core/utils.mjs';
import {discard} from '../../core/discard.mjs';

function enable() {
  log('unloaded.install is called');
  query({status: 'unloaded'}).then(tbs => {
    tbs.forEach(tb => discard(tb));
  });
}
function disable() {
  log('unloaded.disable is called');
}

export default {
  enable,
  disable
};
