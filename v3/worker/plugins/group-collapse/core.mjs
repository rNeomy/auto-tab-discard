import {storage} from '../../core/prefs.mjs';
import {log, query, match} from '../../core/utils.mjs';
import {discard} from '../../core/discard.mjs';

/* auto-discard all tabs of a native tab group once the group remains collapsed
   for a configurable amount of time. The optional "tabGroups" permission is
   requested on the options page while the plug-in gets enabled.

   No recurring alarm is used here to keep the service worker lazy; the alarm
   gets installed only when it is actually needed: the moment a collapsed
   group with non-discarded tabs is found. It is a single one-shot timer armed
   to the earliest pending deadline, and it clears itself as soon as nothing
   is pending anymore */

const ALARM = 'group-collapse.check';
const TIMES = 'group-collapse.times'; // {"groupId": collapsed at (ms)}

// is the API available (the optional "tabGroups" permission is granted)
const available = () => {
  try {
    return chrome.tabGroups !== undefined;
  }
  catch (e) {
    return false;
  }
};

// fetch the collapse timestamps from the session storage
const times = () => chrome.storage.session.get(TIMES).then(ps => ps[TIMES] || {});
// persist the collapse timestamps in the session storage
const store = o => chrome.storage.session.set({[TIMES]: o});

/* plug-in settings; resolves to null when the plug-in is disabled */
const config = () => Promise.all([
  storage({
    './plugins/group-collapse/core.js': false,
    'group-collapse.period': 10, // in minutes
    'group-collapse.exceptions': 'whitelist',
    'whitelist': []
  }),
  storage({'whitelist.session': []}, 'session')
]).then(([a, b]) => Object.assign(a, b))
  .then(ps => ps['./plugins/group-collapse/core.js'] ? ps : null);

/* events (collapse, expand, removal, period change) mutate the collapse
   timestamps concurrently; run every read-modify-write cycle serially so that
   two events cannot overwrite each other's bookkeeping. Time-consuming tasks
   (like running a pass) must not block the queue */
let lock = Promise.resolve();
const locked = fn => {
  const next = lock.then(fn).catch(e => console.error('group-collapse', e));
  lock = next;
  return next;
};

/* arm (or clear) the alarm; the deadline of the earliest pending group
   decides when it fires. A zero period never reaches here since no timestamp
   gets recorded without waiting time */
const arm = (ts, ps) => {
  const ids = Object.keys(ts);
  if (ids.length === 0) {
    log('group-collapse', 'nothing is pending anymore', 'the alarm is cleared');
    return chrome.alarms.clear(ALARM);
  }
  const when = Math.max(
    Math.min(...ids.map(id => ts[id])) + ps['group-collapse.period'] * 60 * 1000,
    Date.now()
  );
  log('group-collapse', 'the alarm is armed', 'for ' + ids.length + ' group(s)',
    'at', new Date(when).toLocaleTimeString());
  chrome.alarms.create(ALARM, {when});
};

/* record (or clear) the timestamp of a collapsing (expanding) group. The
   countdown and the alarm are only needed when the group has non-discarded
   tabs; expanding always clears the timestamp, so only fully collapsed time
   counts toward the deadline. A zero period means no waiting time at all; the
   group's tabs are discarded right away (once per collapse event) */
const onUpdated = group => {
  if (group.collapsed === undefined) {
    return;
  }
  const id = String(group.id);
  config().then(ps => {
    if (ps === null) {
      return;
    }
    if (group.collapsed === false) {
      // expanding clears the timestamp; the alarm gets re-armed (or cleared)
      return locked(() => times().then(ts => {
        if (ts[id] !== undefined) {
          log('group-collapse', 'the group got expanded', id);
          delete ts[id];
          return store(ts).then(() => arm(ts, ps));
        }
      }));
    }
    if (ps['group-collapse.period'] === 0) {
      // the deadline is already due; do not wait for the check
      log('group-collapse', 'immediate discarding', id);
      return pass(Number(id), ps);
    }
    // a group whose tabs are all discarded does not need any alarm
    return query({groupId: group.id, discarded: false}).then(tbs => {
      if (tbs.length === 0) {
        return log('group-collapse', 'all tabs are already discarded', id);
      }
      return locked(() => times().then(ts => {
        if (ts[id] !== undefined) {
          return log('group-collapse', 'the countdown is still running', id);
        }
        log('group-collapse', 'the group got collapsed', id);
        ts[id] = Date.now();
        return store(ts).then(() => arm(ts, ps));
      }));
    });
  });
};
// Chrome passes the removed group itself, Firefox a removeInfo object
const onRemoved = info => {
  const id = String(info.groupId ?? info.id);
  config().then(ps => ps && locked(() => times().then(ts => {
    if (ts[id] !== undefined) {
      delete ts[id];
      return store(ts).then(() => arm(ts, ps));
    }
  })));
};

/* register the tab groups listeners. They are registered during the module
   evaluation if the permission is already granted, and once more right after
   the permission gets accepted on the options page */
let installed = false;
const install = () => {
  if (installed || available() === false) {
    return;
  }
  installed = true;
  log('group-collapse', 'tabGroups listeners are registered');
  chrome.tabGroups.onUpdated.addListener(onUpdated);
  chrome.tabGroups.onRemoved.addListener(onRemoved);
};
install();

/* scan the media and form state of a tab (the same inject used by number.check) */
const scan = tb => tb.status === 'unloaded' ? Promise.resolve([]) : chrome.scripting.executeScript({
  target: {
    tabId: tb.id,
    allFrames: true
  },
  files: ['/data/inject/meta.js']
}).then(r => r.map(o => o && o.result)).catch(() => []);

/* run one discarding pass over the not-discarded tabs of a collapsed group */
const pass = (id, ps) => query({
  groupId: id,
  discarded: false
}).then(tbs => tbs.filter(tb => (tb.url.startsWith('http') || tb.url.startsWith('ftp')) &&
  tb.autoDiscardable !== false
)).then(tbs => {
  if (ps['group-collapse.exceptions'] === 'none') {
    return tbs;
  }
  // respect the permanent and session whitelists
  tbs = tbs.filter(tb => {
    try {
      const {hostname} = new URL(tb.url);
      return match(ps.whitelist, hostname, tb.url) === false &&
        match(ps['whitelist.session'], hostname, tb.url) === false;
    }
    catch (e) {
      return false;
    }
  });
  if (ps['group-collapse.exceptions'] !== 'standard') {
    return tbs;
  }
  // also skip tabs that play audio, have a paused player or unsaved forms
  return Promise.all(tbs.map(scan)).then(ms => tbs.filter((tb, i) => {
    if (ms[i].length === 0) {
      log('group-collapse', 'tab is skipped', 'cannot scan', tb.id, tb.url);
      return false;
    }
    const skipped = {
      'audible': ms.some(o => o && o.audible),
      'paused': ms.some(o => o && o.paused),
      'forms': ms.some(o => o && o.forms)
    };
    for (const [reason, skipped2] of Object.entries(skipped)) {
      if (skipped2) {
        log('group-collapse', 'tab is skipped', reason, tb.id, tb.url);
        return false;
      }
    }
    return true;
  }));
}).then(tbs => {
  console.log(tbs);
  for (const tb of tbs) {
    log('group-collapse', 'discarding', tb.id, tb.title);
    discard(tb);
  }
});

/* the alarm has fired: discard the tabs of every group that remains collapsed
   for longer than the configured period; the group's timestamp is removed
   either way so that releasing a tab inside a collapsed group never triggers
   an instant rediscarding. The remaining groups keep their countdown and the
   alarm gets re-armed to the next earliest deadline */
const check = () => {
  if (available() === false) {
    return chrome.alarms.clear(ALARM);
  }
  return config().then(ps => ps && locked(() => Promise.all([
    chrome.tabGroups.query({collapsed: true}),
    times()
  ]).then(([groups, ts]) => {
    const collapsed = new Set(groups.map(g => String(g.id)));
    const now = Date.now() - ps['group-collapse.period'] * 60 * 1000;
    const jobs = [];
    for (const [id, at] of Object.entries(ts)) {
      if (at <= now && collapsed.has(id)) {
        delete ts[id];
        // pass runs after the bookkeeping got released
        jobs.push(pass(Number(id), ps));
      }
    }
    // prune the timestamps of removed (or expanded) groups
    for (const id of Object.keys(ts)) {
      if (collapsed.has(id) === false) {
        delete ts[id];
      }
    }
    return store(ts).then(() => arm(ts, ps)).then(() => Promise.all(jobs));
  })));
};

/* track all currently collapsed groups on start-ups; groups are persisted
   across restarts and the original collapse time is unknown. Only groups with
   non-discarded tabs get a countdown (those are the only ones an alarm is
   useful for), so the alarm gets installed just when it is needed */
const seed = () => chrome.tabGroups.query({collapsed: true}).then(groups => Promise.all(
  groups.map(g => query({groupId: g.id, discarded: false}).then(tbs =>
    tbs.length === 0 ? null : g.id
  ).catch(() => null))
)).then(ids => Promise.all([times(), config()]).then(([ts, ps]) => {
  const collapsed = new Set(ids.filter(i => i !== null).map(String));
  if (ps) {
    for (const id of collapsed) {
      if (ts[id] === undefined) {
        ts[id] = Date.now();
        log('group-collapse', 'the group got seeded', id);
      }
    }
  }
  // drop the stale entries of groups that got expanded, removed or emptied
  for (const id of Object.keys(ts)) {
    if (collapsed.has(id) === false) {
      delete ts[id];
    }
  }
  return store(ts).then(() => ps ? arm(ts, ps) : chrome.alarms.clear(ALARM));
}));

/* the pref might get enabled before the permission is granted; verify and
   revert the pref so that the options page is not showing a broken state */
function enable() {
  log('group-collapse/core.js is installed');
  install();
  if (available() === false) {
    log('group-collapse', 'disabled', 'no "tabGroups" permission');
    chrome.storage.local.set({'./plugins/group-collapse/core.js': false});
    return;
  }
  // no recurring alarm; seed() installs the one-shot alarm only when needed
  return seed();
}
function disable() {
  log('group-collapse/core.js is removed');
  chrome.alarms.clear(ALARM);
  chrome.storage.session.remove(TIMES);
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM) {
    log('alarm fire', ALARM);
    check();
  }
});

/* deadlines are based on "collapse time + period"; when the period changes,
   re-arm the pending groups right away so that the change applies without
   expanding and re-collapsing them */
storage.on('group-collapse.period', () => locked(() => Promise.all([
  config(), times()
]).then(([ps, ts]) => ps === null ? chrome.alarms.clear(ALARM) : arm(ts, ps))));

/* keep the preferences truthful; the grant can be revoked from the browser's
   extension permissions UI at any time */
chrome.permissions.onRemoved.addListener(changes => {
  if (changes.permissions.includes('tabGroups')) {
    storage({'./plugins/group-collapse/core.js': false}).then(ps => {
      if (ps['./plugins/group-collapse/core.js']) {
        log('group-collapse', 'disabled', 'the "tabGroups" permission got revoked');
        chrome.storage.local.set({'./plugins/group-collapse/core.js': false});
      }
    });
  }
});

export default {
  enable,
  disable
};
