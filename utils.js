// Generate/Parse Hash Parameters to JSON Object
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