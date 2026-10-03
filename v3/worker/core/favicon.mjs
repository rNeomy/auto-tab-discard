/* draws the discarded-tab favicon overlay in the extension's own context.

   The original implementation loaded the page's favicon with
   `new Image({crossOrigin: 'anonymous'})` from the page which fails on
   most domains since they do not send CORS headers for their icons.
   Here the icon is obtained directly (data urls handed to us by Firefox or
   a fetch that is privileged thanks to the wide host permissions), painted
   on a canvas and returned as a data url. If it cannot be obtained for any
   reason the original favicon is left untouched. */

// convert a blob to a data uri with FileReader; service workers have no
// FileReader, so they encode through btoa instead
const dataUri = blob => new Response(blob).arrayBuffer().then(ab => {
  const u8 = new Uint8Array(ab);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  }
  return 'data:image/png;base64,' + btoa(s);
});

const paint = bitmap => {
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = typeof OffscreenCanvas === 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(w, h);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('NO_CTX'));
  }
  ctx.globalAlpha = 0.6;
  ctx.drawImage(bitmap, 0, 0);

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.fillStyle = '#a1a0a1';
  ctx.arc(w * 0.75, h * 0.75, w * 0.25, 0, 2 * Math.PI, false);
  ctx.fill();

  // both canvas flavors end up as a Blob and then as a data uri
  if (canvas.toBlob) {
    return new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
      'image/png'
    )).then(dataUri);
  }
  return canvas.convertToBlob().then(dataUri);
};

const decode = async blob => {
  try {
    return await createImageBitmap(blob);
  }
  catch (e) {
    // object-url + Image fallback for runtimes without createImageBitmap
    const src = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode failed'));
        img.onload = () => resolve(img);
        img.src = src;
      });
    }
    finally {
      URL.revokeObjectURL(src);
    }
  }
};

const overlay = async href => {
  if (!href) {
    throw new Error('empty favicon');
  }
  try {
    // a data url is read directly; anything else is fetched with the
    // extension's own host permissions
    const res = await fetch(href);
    if (res.ok === false && href.startsWith('data:') === false) {
      throw new Error('fetch error ' + res.status);
    }
    const blob = await res.blob();
    return await paint(await decode(blob));
  }
  catch (e) {
    throw new Error('overlay failed: ' + (e.message || e));
  }
};

export {overlay};
