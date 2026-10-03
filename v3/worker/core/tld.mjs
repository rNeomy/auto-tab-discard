/* thin wrapper over the vendored tldjs build (worker/tld.min.js).

   The bundle is a UMD module; when it is imported as an ES module it
   assigns itself to either window or self (globalThis.tldjs). It is
   CSP-safe: it performs no eval/Function construction on load or while
   parsing hostnames */

import '../tld.min.js';

const tld = globalThis.tldjs;

// the registrable domain (eTLD + 1) of a hostname, e.g. www.example.co.uk
// -> example.co.uk; null for IPs, single labels and public suffixes
const domain = hostname => {
  if (!tld || !hostname) {
    return null;
  }
  try {
    return tld.getDomain(hostname) || null;
  }
  catch (e) {
    return null;
  }
};

export {domain};
