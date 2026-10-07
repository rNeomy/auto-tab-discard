# Media inactivity regression tests

Run with Node.js 18 or newer:

```sh
node --test tests/media-inactivity.test.cjs
```

The tests execute the real v3 content scripts and inactivity module in controlled browser/clock fixtures. They verify the stop-to-discard interval and option interactions; they do not emulate native Firefox picture-in-picture. Live Firefox/Zen verification is required for that event path.

Create a temporary Firefox development package with Python 3:

```sh
python tools/build-development.py /path/to/media-grace.xpi
```

This changes the extension name, version, and Gecko ID only in the archive. Source retains the upstream identity. Load the XPI through `about:debugging` in a separate profile, reload already-open media pages, and enable playing protection with paused-player protection disabled. Temporary installation ends when the browser restarts.

Native PiP check: use a short inactivity interval, play an audible video in background PiP longer than that interval, pause it in PiP, close the PiP window, and leave its tab unselected. Confirm it stays loaded for a complete new interval and becomes eligible afterward. Also verify never-played paused videos still discard and enabling paused-player protection retains previously played paused videos. Control browser-owned unloading separately and attribute discards to the extension. A shortened test does not establish a natural 30-minute run.
