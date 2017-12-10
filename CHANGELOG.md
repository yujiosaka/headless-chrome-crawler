# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2017-12-11
### Changed

- Rename `ensureCacheClear` to `persistCache` option for [HCCrawler.connect([options])](https://github.com/yujiosaka/headless-chrome-crawler#hccrawlerconnectoptions) and [HCCrawler.launch([options])](https://github.com/yujiosaka/headless-chrome-crawler#hccrawlerlaunchoptions) options

## [1.1.2] - 2017-12-10
### Added

- Support `maxRequest` option for [HCCrawler.connect([options])](https://github.com/yujiosaka/headless-chrome-crawler#hccrawlerconnectoptions) and [HCCrawler.launch([options])](https://github.com/yujiosaka/headless-chrome-crawler#hccrawlerlaunchoptions) options
- Support `allowedDomains` and `userAgent` option for [crawler.queue([options])](https://github.com/yujiosaka/headless-chrome-crawler#crawlerqueueoptions)
- Support pluggable cache
- Add [crawler.setMaxRequest(maxRequest)](https://github.com/yujiosaka/headless-chrome-crawler#crawlersetmaxrequestmaxrequest), [crawler.pause()](https://github.com/yujiosaka/headless-chrome-crawler#crawlerpause) and [crawler.resume()](https://github.com/yujiosaka/headless-chrome-crawler#crawlerresume) methods
- Add [crawler.pendingQueueSize](https://github.com/yujiosaka/headless-chrome-crawler#crawlerpendingqueuesize) and [crawler.requestedCount](https://github.com/yujiosaka/headless-chrome-crawler#crawlerrequestedcount) read-only properties

## [1.1.1] - 2017-12-09
### Added

- Add [CHANGELOG.md](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/CHANGELOG.md) based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
- Add unit tests

### Changed

- Automatically dismisses dialog
- Performance improvement by setting a page parallel

## [1.1.0] - 2017-12-08
### Added

- Support `extraHeaders` option for [crawler.queue([options])](https://github.com/yujiosaka/headless-chrome-crawler#crawlerqueueoptions)
- Add comment in [JSDoc](http://usejsdoc.org) style

### Changed

- Public API to launch a browser has changed. Now you can launch browser by [HCCrawler.launch([options])](https://github.com/yujiosaka/headless-chrome-crawler#hccrawlerlaunchoptions)
- Rename `shouldRequest` to `preRequest` option for [crawler.queue([options])](https://github.com/yujiosaka/headless-chrome-crawler#crawlerqueueoptions)
- Refactor by separating HCCrawler and Crawler classes
- Refactor handlers for options

## [1.0.0] - 2017-12-05
### Added

- Add test with [mocha](https://mochajs.org) and [power-assert](https://github.com/power-assert-js/power-assert)
- Add coverage with [istanbul](https://github.com/gotwarlost/istanbul)
- Add setting for CircleCI
- Add [.editorconfig](http://editorconfig.org/)
- Add [debug](https://github.com/visionmedia/debug) log

### Changed

- Migrate from NPM to [Yarn](https://yarnpkg.com/lang/en/)
- Refactor helper to class static method style
