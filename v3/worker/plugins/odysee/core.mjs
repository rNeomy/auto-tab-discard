import {log} from '../../core/utils.mjs';
import {discard} from '../../core/discard.mjs';

const perform = discard.perform;

function enable() {
  log('installing odysee/core.js');
  discard.perform = tab => {
    if (tab.url && tab.url.startsWith('https://odysee.com/')) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        world: 'MAIN',
        func: () => {
          /**
           * @type {HTMLVideoElement}
           */
          const player = document.querySelector('#vjs_video_3_html5_api');
          if (player) {
            const t = player.currentTime;
            if (t) {
              const s = new URLSearchParams(location.search);
              s.set('t', t.toString());
              history.replaceState(history.state, '', '?' + s.toString());
            }
          }
        }
      }).catch(e => {
        console.error('plugins/odysee -> error', e);
      }).then(() => perform(tab));
    }
    else {
      perform(tab);
    }
  };
}
function disable() {
  log('removing odysee/core.js');
  discard.perform = perform;
}

export default {
  enable,
  disable
};
