# Changelog

Release notes for every tagged version of Auto Tab Discard, compiled once from the release notes published on addons.mozilla.org (AMO) and from the git commit history between tags. Each section links the compared changes between tags and, for versions on AMO, the AMO file. This file is a one-time backfill; for newer versions, see the [version history on AMO](https://addons.mozilla.org/en-US/firefox/addon/auto-tab-discard/versions/).

Each date is the AMO upload date of that version when it exists on AMO, otherwise the date of the tagged commit. Versions without notes on AMO (0.4.0, 0.6.0, 0.6.1, 0.6.3, 0.6.9, 0.7.4 and the 0.4.3.1/0.4.4 tags) are summarised from the commits since the previous tag. The tags `v0.4.0` and `v0.4.1` do not point at the commits of the same-numbered versions, so those sections follow the version number rather than the tag.

## 0.7.7 — 2026-10-12
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.6...v0.7.7) · [AMO](https://addons.mozilla.org/firefox/downloads/file/5111461/auto_tab_discard-0.7.7.xpi)

- Fixes [#422](https://github.com/rNeomy/auto-tab-discard/issues/422): [Feature Request] Tab Groups Integration (Firefox 139+)

## 0.7.6 — 2026-10-11
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.5...v0.7.6) · [AMO](https://addons.mozilla.org/firefox/downloads/file/5107827/auto_tab_discard-0.7.6.xpi)

- Fixes [#464](https://github.com/rNeomy/auto-tab-discard/issues/464): max.single.discard <= number silently disables automatic discarding
- Fixes PR [#467](https://github.com/rNeomy/auto-tab-discard/pull/467): Restart inactivity timeout after protected media stops

## 0.7.5 — 2026-10-06
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.4...v0.7.5) · [AMO](https://addons.mozilla.org/firefox/downloads/file/5090327/auto_tab_discard-0.7.5.xpi)

- Fixes [#276](https://github.com/rNeomy/auto-tab-discard/issues/276): Discard inactive tabs after X minutes doesn't work, based on [#464](https://github.com/rNeomy/auto-tab-discard/issues/464): max.single.discard <= number silently disables automatic discarding

## 0.7.4 — 2026-10-03
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.3...v0.7.4)

- Domain-based matching is used instead of hostname matching ([6437b17](https://github.com/rNeomy/auto-tab-discard/commit/6437b17)).
- The favicon overlay that marks discarded tabs is now rendered in the extension's own context ([e5a389c](https://github.com/rNeomy/auto-tab-discard/commit/e5a389c)).
- The "create" plugin now checks the whitelist before sending the discard-on-load message ([511e08f](https://github.com/rNeomy/auto-tab-discard/commit/511e08f)). Locales were also updated ([2cfb8ed](https://github.com/rNeomy/auto-tab-discard/commit/2cfb8ed), [81b7d05](https://github.com/rNeomy/auto-tab-discard/commit/81b7d05)).

## 0.7.3 — 2026-08-24
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.2...v0.7.3) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4978053/auto_tab_discard-0.7.3.xpi)

- Fixes [#456](https://github.com/rNeomy/auto-tab-discard/issues/456): Unloading a tab group (TST) no longer works in the newest version (0.7.2)
- Adds a "Force Discard" option to the popup interface. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/4978053/auto_tab_discard-0.7.3.xpi))

## 0.7.2 — 2026-08-16
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.1...v0.7.2) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4962080/auto_tab_discard-0.7.2.xpi)

- Fixes the problem reported in [#453](https://github.com/rNeomy/auto-tab-discard/issues/453) (see [this comment](https://github.com/rNeomy/auto-tab-discard/issues/453#issuecomment-5306207839)): [bug] [firefox] Tab discarding no longer works regardless of method as of 0.7.0

## 0.7.1 — 2026-08-15
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.7.0...v0.7.1) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4959845/auto_tab_discard-0.7.1.xpi)

- Fixes [#450](https://github.com/rNeomy/auto-tab-discard/issues/450): [bug] [firefox] "Discard Tab" extension shortcut doesn't discard tab

## 0.7.0 — 2026-08-13
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.6.9.1...v0.7.0) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4955895/auto_tab_discard-0.7.0.xpi)

- Fixes [#447](https://github.com/rNeomy/auto-tab-discard/issues/447): [bug] "Keep Selected Tabs For This Session" option using right-click on tab doesn't work on Firefox

## 0.6.9.1 — 2026-08-05
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.6.9...v0.6.9.1) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4939638/auto_tab_discard-0.6.9.1.xpi)

- Fixes [#444](https://github.com/rNeomy/auto-tab-discard/issues/444): [Feature request] Add a new config option to prevent discarding of split tabs
- Fixes locale issues ([fa73d67](https://github.com/rNeomy/auto-tab-discard/commit/fa73d67)).

## 0.6.9 — 2026-08-05
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.7...v0.6.9)

- Split-view tabs are no longer discarded by default ([#444](https://github.com/rNeomy/auto-tab-discard/issues/444): [Feature request] Add a new config option to prevent discarding of split tabs; [ccac8f4](https://github.com/rNeomy/auto-tab-discard/commit/ccac8f4), [daf9aa7](https://github.com/rNeomy/auto-tab-discard/commit/daf9aa7)).
- Firefox compatibility fixes ([16dbbab](https://github.com/rNeomy/auto-tab-discard/commit/16dbbab)). Updates the zh_TW Traditional Chinese locale (PR [#425](https://github.com/rNeomy/auto-tab-discard/pull/425): Update zh_TW Traditional Chinese locale; [694c5be](https://github.com/rNeomy/auto-tab-discard/commit/694c5be), [a95ad97](https://github.com/rNeomy/auto-tab-discard/commit/a95ad97)).
- Also includes work done after 0.6.7 that was never tagged on its own (versions 0.6.8 to 0.6.8.2, February 2024): final changes for the move to Manifest V3 ([5b81a8f](https://github.com/rNeomy/auto-tab-discard/commit/5b81a8f)), improved scheduled discarding ([f50430f](https://github.com/rNeomy/auto-tab-discard/commit/f50430f)), "(suspend)" added to the title to clarify its use ([123be23](https://github.com/rNeomy/auto-tab-discard/commit/123be23)), and improved icon colouring on user action (based on [#348](https://github.com/rNeomy/auto-tab-discard/issues/348): [Not working] Toggle 'Keep This Tab for This Session' option; [60aac69](https://github.com/rNeomy/auto-tab-discard/commit/60aac69)). Fixes [#350](https://github.com/rNeomy/auto-tab-discard/issues/350) (Disable notifications; [bf9432f](https://github.com/rNeomy/auto-tab-discard/commit/bf9432f)), [#353](https://github.com/rNeomy/auto-tab-discard/issues/353) ([Feature request]: Keep this tab group for this session; [30f0d63](https://github.com/rNeomy/auto-tab-discard/commit/30f0d63)), [#354](https://github.com/rNeomy/auto-tab-discard/issues/354) ([Feature request] Additional shortcuts for discarding tabs to left or right; [70b629f](https://github.com/rNeomy/auto-tab-discard/commit/70b629f)) and [#358](https://github.com/rNeomy/auto-tab-discard/issues/358) (Pinned Tabs are being removed; [a812f73](https://github.com/rNeomy/auto-tab-discard/commit/a812f73)), with a possible fix for [#352](https://github.com/rNeomy/auto-tab-discard/issues/352) (Tasks not getting permanently discarded; [436d725](https://github.com/rNeomy/auto-tab-discard/commit/436d725)).

## 0.6.7 — 2022-12-17
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.6...0.6.7) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4045009/auto_tab_discard-0.6.7.xpi)

- Updates the "en" and "nl" locales, thanks to [Tonnes](https://www.transifex.com/user/profile/Tonnes/).

## 0.6.6 — 2022-11-16
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.5...0.6.6) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4031079/auto_tab_discard-0.6.6.xpi)

- Fixes [#326](https://github.com/rNeomy/auto-tab-discard/issues/326): Saving youtube timestamp on firefox not working
- Fixes [#323](https://github.com/rNeomy/auto-tab-discard/issues/323): "Discard Tab Group" + Tree Style Tab not working

## 0.6.5 — 2022-10-22
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.4...0.6.5) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4019536/auto_tab_discard-0.6.5.xpi)

- Fixes [#317](https://github.com/rNeomy/auto-tab-discard/issues/317) (the issue title is no longer available on GitHub).
- Fixes [#319](https://github.com/rNeomy/auto-tab-discard/issues/319): [Firefox v104+] Context menu options to not unload sites are broken

## 0.6.4 — 2022-10-19
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.3.2...0.6.4) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4017803/auto_tab_discard-0.6.4.xpi)

- Fixes [#310](https://github.com/rNeomy/auto-tab-discard/issues/310): [Ubuntu/Firefox Beta 106] Auto Discard Stopped Working

## 0.6.3.2 — 2022-09-19
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.3...0.6.3.2) · [AMO](https://addons.mozilla.org/firefox/downloads/file/4004129/auto_tab_discard-0.6.3.2.xpi)

- Possible fix for [#307](https://github.com/rNeomy/auto-tab-discard/issues/307) (the issue title is no longer available on GitHub).

## 0.6.3.1 — 2022-09-12 (no git tag)
[AMO](https://addons.mozilla.org/firefox/downloads/file/4000753/auto_tab_discard-0.6.3.1.xpi)

- Possible fix for [#307](https://github.com/rNeomy/auto-tab-discard/issues/307) (the issue title is no longer available on GitHub).

## 0.6.3 — 2022-09-07
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.6.2...0.6.3)

- Updates the "ru" locale. No other changes since 0.6.2 ([c84abb0](https://github.com/rNeomy/auto-tab-discard/commit/c84abb0)).

## 0.6.2 — 2022-09-06
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.6.1...0.6.2) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3999034/auto_tab_discard-0.6.2.xpi)

- Fixes [#294](https://github.com/rNeomy/auto-tab-discard/issues/294): [Feature Request] Temporarily disable
- Fixes [#288](https://github.com/rNeomy/auto-tab-discard/issues/288): New tabs get discarded too soon
- Prepares the extension to move to Manifest V3. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3999034/auto_tab_discard-0.6.2.xpi))

## 0.6.1 — 2022-04-12
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.6.0...v0.6.1)

- Fixes [#282](https://github.com/rNeomy/auto-tab-discard/issues/282): [Bug] YouTube Does Not Discard ([1ea6539](https://github.com/rNeomy/auto-tab-discard/commit/1ea6539)).
- Improves time-based discarding of inactive tabs ([93c1848](https://github.com/rNeomy/auto-tab-discard/commit/93c1848)).
- Updates locales ([1ff0bdc](https://github.com/rNeomy/auto-tab-discard/commit/1ff0bdc)).

## 0.6.0 — 2022-04-09
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.5.0...v0.6.0)

- Prepares the migration to Manifest V3 ([c11c583](https://github.com/rNeomy/auto-tab-discard/commit/c11c583)).
- Improves discarding of tabs on startup ([2e7cf95](https://github.com/rNeomy/auto-tab-discard/commit/2e7cf95)).
- Fixes a problem reported in [a comment on the extension's website](http://add0n.com/tab-discard.html#IDComment1110791167) ([94ae2b0](https://github.com/rNeomy/auto-tab-discard/commit/94ae2b0)), and updates locales ([291cb92](https://github.com/rNeomy/auto-tab-discard/commit/291cb92)).

## 0.5.0 — 2022-01-04
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.9...0.5.0) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3889015/auto_tab_discard-0.5.0.xpi)

- Adds a plugin to save YouTube's current timestamp. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3889015/auto_tab_discard-0.5.0.xpi))
- Allows closing the last active tab in a window with the close command. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3889015/auto_tab_discard-0.5.0.xpi))

## 0.4.9 — 2021-12-26
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.8...0.4.9) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3886197/auto_tab_discard-0.4.9.xpi)

- Supports custom intervals for trash, thanks to [@tonycpsu](https://github.com/tonycpsu).
- Fixes [#264](https://github.com/rNeomy/auto-tab-discard/issues/264): Bug: "close tab" with single-tab window malfunctions

## 0.4.8 — 2021-12-13
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.7...0.4.8) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3880782/auto_tab_discard-0.4.8.xpi)

- Fixes [#248](https://github.com/rNeomy/auto-tab-discard/issues/248): Discarding consecutive tabs too quickly locks the Firefox browser
- Fixes [#231](https://github.com/rNeomy/auto-tab-discard/issues/231): Control-Click, the tab is improperly discarded around one second after loading

## 0.4.7 — 2021-04-28
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.6...0.4.7) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3767563/auto_tab_discard-0.4.7.xpi)

- Fixes [#228](https://github.com/rNeomy/auto-tab-discard/issues/228): Popup window too small when button is in overflow (Firefox)
- Fixes [#208](https://github.com/rNeomy/auto-tab-discard/issues/208): Whilelist keeps reseting to default

## 0.4.6 — 2021-04-22
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.5.1...0.4.6) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3764231/auto_tab_discard-0.4.6.xpi)

- Fixes [#226](https://github.com/rNeomy/auto-tab-discard/issues/226): [Feature Request] Auto-Discard new tabs

## 0.4.5.1 — 2021-04-16
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.4...0.4.5.1) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3761150/auto_tab_discard-0.4.5.1.xpi)

- Fixes [#225](https://github.com/rNeomy/auto-tab-discard/issues/225): general.useragent.override breaks Auto Tab Discard
- New fix for [#224](https://github.com/rNeomy/auto-tab-discard/issues/224) (New version 0.4.3 seems to ignore any discard rules) and [#220](https://github.com/rNeomy/auto-tab-discard/issues/220) ("Keep tabs for this site 'Session'" tabs - discarded anyway).
- Uses an alternative approach to visualize discarding; fixes [#223](https://github.com/rNeomy/auto-tab-discard/issues/223): Bookmark favicon automatically changes to ATD's discarded favicon
- Fixes [#221](https://github.com/rNeomy/auto-tab-discard/issues/221): [Feature request] Add dark mode

## 0.4.4 — 2021-04-08
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.3.1...0.4.4)

- Improves the plugins' compatibility with the non-persistent background page ([4fd1c18](https://github.com/rNeomy/auto-tab-discard/commit/4fd1c18)).

## 0.4.3.1 — 2021-04-07
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.3...0.4.3.1)

- Fixes [#220](https://github.com/rNeomy/auto-tab-discard/issues/220): "Keep tabs for this site 'Session'" tabs - discarded anyway ([e2314ce](https://github.com/rNeomy/auto-tab-discard/commit/e2314ce)).
- Updates the Catalan (ca) locale from a [Transifex translation](https://www.transifex.com/open-source-dev/auto-tab-discard/translate/#ca/messagesjson/317602874/) ([044e405](https://github.com/rNeomy/auto-tab-discard/commit/044e405)).

## 0.4.3 — 2021-04-05
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.2...0.4.3) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3755275/auto_tab_discard-0.4.3.xpi)

- Merges PR [#211](https://github.com/rNeomy/auto-tab-discard/pull/211): Delete _locales/zh directory
- Fixes [#130](https://github.com/rNeomy/auto-tab-discard/issues/130): ADD button action: open new tab with list of windows
- Fixes [#218](https://github.com/rNeomy/auto-tab-discard/issues/218): [Feature Request] Add "Discard & Blank Tabs in Other Windows" button
- Fixes [#193](https://github.com/rNeomy/auto-tab-discard/issues/193): [Feature Request] Add "Release all tabs" action
- Fixes [#175](https://github.com/rNeomy/auto-tab-discard/issues/175): [Request] Add easy options to whitelist individual URLs / tabs
- Fixes [#216](https://github.com/rNeomy/auto-tab-discard/issues/216): Settings loaded from managed storage not applied

## 0.4.2 — 2021-02-28
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/0.4.1.1...0.4.2) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3734569/auto_tab_discard-0.4.2.xpi)

- Fixes [#186](https://github.com/rNeomy/auto-tab-discard/issues/186): [Feature Request] Auto un-discard 1 tab to the left
- Adds two plugins to release discarding of the previous and next tabs. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3734569/auto_tab_discard-0.4.2.xpi))
- Adds a plugin to force discarding of certain hostnames when they are not active. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3734569/auto_tab_discard-0.4.2.xpi))

## 0.4.1.1 — 2021-02-24
[Changes](https://github.com/rNeomy/auto-tab-discard/compare/v0.4.1...0.4.1.1) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3732237/auto_tab_discard-0.4.1.1.xpi)

- Fixes [#204](https://github.com/rNeomy/auto-tab-discard/issues/204): Timeout Discards Not Happening
- Fixes [#206](https://github.com/rNeomy/auto-tab-discard/issues/206): [Solved] [v0.4.1] [FF 85.0.2] Not working ...

## 0.4.1 — 2021-02-13
[Tag v0.4.1](https://github.com/rNeomy/auto-tab-discard/tree/v0.4.1) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3726075/auto_tab_discard-0.4.1.xpi)

- Supports a plugin system. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3726075/auto_tab_discard-0.4.1.xpi))
- Supports a "do not discard active window" plugin. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3726075/auto_tab_discard-0.4.1.xpi))
- Supports a "trash old discarded tabs" plugin. ([AMO notes](https://addons.mozilla.org/firefox/downloads/file/3726075/auto_tab_discard-0.4.1.xpi))

## 0.4.0 — 2021-02-02
[Tag v0.4.0](https://github.com/rNeomy/auto-tab-discard/tree/v0.4.0) · [AMO](https://addons.mozilla.org/firefox/downloads/file/3719384/auto_tab_discard-0.4.0.xpi)

- Fixes [#168](https://github.com/rNeomy/auto-tab-discard/issues/168): "Discard Tab Group" option gone in new versions ([adf9e03](https://github.com/rNeomy/auto-tab-discard/commit/adf9e03))
- Follow-up on [#174](https://github.com/rNeomy/auto-tab-discard/issues/174): [Feature Request] Do not discard tabs which have unsaved data on them ([9df411d](https://github.com/rNeomy/auto-tab-discard/commit/9df411d))
- Updates the core of number-based discarding ([6e1e623](https://github.com/rNeomy/auto-tab-discard/commit/6e1e623)), supports discarding tab groups on Chrome ([8f5d029](https://github.com/rNeomy/auto-tab-discard/commit/8f5d029)), and avoids discarding a tab multiple times ([4dae1d9](https://github.com/rNeomy/auto-tab-discard/commit/4dae1d9)).
