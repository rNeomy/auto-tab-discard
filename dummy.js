// Used to parse hash key value
function getHashVariable(key, urlStr) {
  var valuesByKey = {},
    keyPairRegEx = /^(.+)=(.+)/,
    hashStr;

  if (!urlStr || urlStr.length === 0 || urlStr.indexOf("#") === -1) {
    return false;
  }

  //extract hash component from url
  hashStr = urlStr.replace(/^[^#]+#+(.*)/, "$1");

  if (hashStr.length === 0) {
    return false;
  }

  //handle possible unencoded final var called 'uri'
  let uriIndex = hashStr.indexOf("uri=");
  if (uriIndex >= 0) {
    valuesByKey.uri = hashStr.substr(uriIndex + 4);
    hashStr = hashStr.substr(0, uriIndex);
  }

  hashStr.split("&").forEach(function (keyPair) {
    if (keyPair && keyPair.match(keyPairRegEx)) {
      valuesByKey[keyPair.replace(keyPairRegEx, "$1")] = keyPair.replace(
        keyPairRegEx,
        "$2"
      );
    }
  });
  return valuesByKey[key] || false;
}

window.onload = function () {
  // title & url
  var title = decodeURIComponent(getHashVariable("title", location.href) || '');
  var favicon = decodeURIComponent(getHashVariable("fav", location.href) || '');
  var url = decodeURIComponent(getHashVariable("url", location.href) || '');
  var trimmed_url = url.split("?")[0].split("#")[0];
  var interval = null;

  // Set title and url in body
  document.title = title;
  document.getElementById("title").textContent = title;
  document.getElementById("url").textContent = trimmed_url;

  // Change Favicon
  const src = favicon || "/data/page.png";
  Object.assign(new Image(), {
    crossOrigin: "anonymous",
    src,
    onload() {
      const img = this;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, 0, 0);

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.fillStyle = "#a1a0a1";
        ctx.arc(
          img.width * 0.75,
          img.height * 0.75,
          img.width * 0.25,
          0,
          2 * Math.PI,
          false
        );
        ctx.fill();
        document.querySelector('head').appendChild(Object.assign(document.createElement('link'), {
          rel: 'icon',
          type: 'image/png',
          href: canvas.toDataURL("image/png")
        }));
      }
    },
  });

  // WHICH APPROACH IS BETTER?
  // 1) chrome.tabs.onActivated listener in background.js and loop through all dummy.html page
  // 2) Or as below send message from tab on hidden

  // I vote for 1

  // interval = setInterval(function () {
  //   if (document.hidden) {
  //     // Trigger to Discard Self..
  //     chrome.runtime.sendMessage({
  //       method: 'discard-self'
  //     });
  //     // document.title = new Date();
  //     clearInterval(interval);
  //   }
  // }, 2000); // wait to seconds

  window.onfocus = function () {
    clearInterval(interval);
  };

  function loadWebpage(){
    document.getElementById('icon').classList.add('bounce')
    location.replace(url)
  }

  // Check if user reloaded the page so open url directly.
  if(performance
    && performance.getEntriesByType("navigation").length > 0
    && performance.getEntriesByType("navigation")[0].type == 'reload'
  ){
    loadWebpage()
  }

  document.addEventListener('click', loadWebpage);
};
