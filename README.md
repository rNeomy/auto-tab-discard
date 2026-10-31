# Auto Tab Discard
A browser extension which uses the native tab discarding method (`chrome.tabs.discard`) to automatically reduce memory usage of inactive tabs. This extension is more efficient and should be less buggy compared to the alternatives extensions that use DOM replacement method.

### Preview

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/S0rHU38OnTE/0.jpg)](https://www.youtube.com/watch?v=S0rHU38OnTE)

### Links

  * Homepage: https://webextension.org/listing/tab-discard.html
  * Privacy Policy: https://webextension.org/privacy-policy/extension/tab-discard.html
  * Chrome: https://chrome.google.com/webstore/detail/auto-tab-discard/jhnleheckmknfcgijgkadoemagpecfol
  * Edge: https://microsoftedge.microsoft.com/addons/detail/auto-tab-discard/nfkkljlcjnkngcmdpcammanncbhkndfe
  * Firefox: https://addons.mozilla.org/firefox/addon/auto-tab-discard/
  * Opera: https://addons.opera.com/en/extensions/details/auto-tab-discard/
  * Product Review: https://webextension.org/blog/2022/04/17/auto-tab-discard-extension.html
  * Preview: https://www.youtube.com/watch?v=S0rHU38OnTE

### Versions, releases and installing

**The project is active.** New versions are published directly to the browser stores. The GitHub *Releases* list stops at 0.6.7 (2022) and is no longer updated; every store version has a git tag instead, see [Tags](https://github.com/rNeomy/auto-tab-discard/tags). (Background: [#418](https://github.com/rNeomy/auto-tab-discard/issues/418), [#427](https://github.com/rNeomy/auto-tab-discard/issues/427).)

| What | Where |
|---|---|
| Current source | [`v3/`](v3) (Manifest V3; the version is in `v3/manifest.json`) |
| Earlier code | [`v2/`](v2) (Manifest V2, last version 0.5.0) |
| Version history | git tags `vX.Y.Z`, one per store release (older tags have no `v` prefix) |
| Release notes | [Firefox Add-ons version history](https://addons.mozilla.org/firefox/addon/auto-tab-discard/versions/) |
| Install | the store links above, or on Debian: `sudo apt install webext-auto-tab-discard` |

#### Why there are no downloadable builds here

Store builds are signed. Release and beta versions of Firefox only install add-ons that Mozilla has signed, and that signing happens through addons.mozilla.org ([Firefox Extension Workshop](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/): "Add-ons need to be signed before they can be installed into release and beta versions of Firefox"). A zip attached to a GitHub release could not be installed permanently in a normal Firefox, while the store copy is signed and updates itself. The Chrome, Edge and Opera stores likewise serve their own packages. So the stores are the release channel, and this repository holds the source with a tag for each released version.

#### Running from source

  * Firefox: open `about:debugging#/runtime/this-firefox`, click *Load Temporary Add-on* and select `v3/manifest.json` (it is removed when Firefox restarts).
  * Chrome / Edge: open `chrome://extensions`, enable *Developer mode*, click *Load unpacked* and select the `v3/` folder.
