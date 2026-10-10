# Media inactivity regression tests

Run with Node.js 18 or newer:

```sh
node --test tests/media-inactivity.test.cjs
```

The tests execute the real v3 content scripts and inactivity module in controlled browser/clock fixtures. They verify the stop-to-discard interval and option interactions; they do not emulate native Firefox picture-in-picture. Live Firefox/Zen verification is required for that event path.
