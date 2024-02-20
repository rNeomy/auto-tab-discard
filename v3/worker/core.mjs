import {log, query} from './core/utils.mjs';
import {prefs, storage} from './core/prefs.mjs';
import {starters} from './core/startup.mjs';
import {discard} from './core/discard.mjs';
import {navigate} from './core/navigate.mjs';
import './modes/number.mjs';
import './menu.mjs';
import '../firefox.mjs';

/*
  remote access

  request = {
    method: 'discard',
    query, {}, // query to find tabs with chrome.tabs
    forced: false // whether or not to filter pages
  }
*/

chrome.runtime.onMessageExternal.addListener((request, sender, resposne) => {
  if (request.method === 'discard') {
    log('onMessageExternal request received', request);

    query(request.query).then((tbs = []) => {
      if (request.forced !== true) {
        tbs = tbs.filter(({url = '', discarded, active}) => (url.startsWith('http') ||
          url.startsWith('ftp')) && !discarded && !active);
      }
      tbs.forEach(discard);

      resposne(tbs.map(t => t.id));
    });
    return true;
  }
});

chrome.runtime.onMessage.addListener((request, sender, resposne) => {
  log('onMessage request received', request);
  const {method} = request;
  if (method === 'discard.on.load') { // for links after initial load
    discard(sender.tab);
  }
  // navigation
  else if (method.startsWith('move-') || method === 'close') {
    navigate(method);
  }
  else if (method === 'storage') {
    Promise.all([
      storage(request.managed || {}, 'managed'),
      storage(request.session || {}, 'session')
    ]).then(a => Object.assign(...a)).then(resposne);

    return true;
  }
});

// left-click action
const popup = () => chrome.action.setPopup({
  popup: prefs.click === 'click.popup' ? 'data/popup/index.html' : ''
});
starters.push(() => popup());
storage.on('click', () => popup());

// idle timeout
starters.push(() => {
  chrome.idle.setDetectionInterval(prefs['idle-timeout']);
});
storage.on('idle-timeout', () => {
  chrome.idle.setDetectionInterval(prefs['idle-timeout']);
});

// badge
starters.push(() => chrome.action.setBadgeBackgroundColor({
  color: '#666'
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage({
        'faqs': true,
        'last-update': 0
      }).then(prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            chrome.storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
