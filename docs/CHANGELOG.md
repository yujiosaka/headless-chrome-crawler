# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2018-05-14

- Set `options` and `depth` to errors.

### Added

- Support `cookies` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Make `onSuccess` pass `cookies` in the response.

### changed

- Update [Puppeteer](https://github.com/GoogleChrome/puppeteer) version to 1.4.0.

## [1.6.0] - 2018-04-21

### Added

- Support `viewport` and `skipRequestedRedirect` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Emit `requestdisallowed` event.
- Make `onSuccess` pass `redirectChain` in the response.

### changed

- Bump Node.js version up to 8.10.0.
- Update [Puppeteer](https://github.com/GoogleChrome/puppeteer) version to 1.3.0.
- Move [node_redis](https://github.com/NodeRedis/node_redis) to the peer dependencies.
- Make [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions) to return Promise.

### Fixed

- Fix a bug of silently failing to insert jQuery due to CSP.

## [1.5.0] - 2018-03-25

### Added

- Support `waitFor` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Support `slowMo` for [HCCrawler.connect()](#hccrawlerconnectoptions)'s options.

### Fixed

- Fix a bug of not allowed to set `timeout` option per request.
- Fix a bug of crawling twice if one url has a trailing slash on the root folder and the other does not.

## [1.4.0] - 2018-02-24

### Added

- Support `browserCache` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Support `depthPriority` option again.

## [1.3.4] - 2018-02-22

### changed

- Drop `depthPriority` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.

## [1.3.3] - 2018-02-21

### Added

- Emit `newpage` event.
- Support `deniedDomains` and `depthPriority` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.

### changed

-  Allow `allowedDomains` option to accept a list of regular expressions.

## [1.3.2] - 2018-01-19

### Added

- Support `followSitemapXml` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.

### Fixed

- Fix a bug of not showing console message properly.

## [1.3.1] - 2018-01-14

### Fixed

- Fix a bug of listing response properties as methods.
- Fix a bug of not obeying robots.txt.

## [1.3.0] - 2018-01-12
### Added

- Add [HCCrawler.defaultArgs()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerdefaultargs) method.
- Emit `requestretried` event.

### changed

- Use `cache` option not only for remembering already requested URLs but for request queue for distributed environments.
- Moved `onSuccess`, `onError` and `maxDepth` options from [HCCrawler.connect()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerconnectoptions) and [HCCrawler.launch()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerlaunchoptions) to [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions).

## [1.2.5] - 2018-01-03
### Added

- Support `obeyRobotsTxt` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Support `persist` for [RedisCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#rediscache)'s constructing options.

### changed

- Make `cache` to be required for [HCCrawler.connect()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerconnectoptions) and [HCCrawler.launch()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerlaunchoptions)'s options.
- Provide `skipDuplicates` to remember and skip duplicate URLs, instead of passing `null` to `cache` option.
- Modify `BaseCache` interface.

## [1.2.4] - 2017-12-25
### Added

- Support [CSV](https://tools.ietf.org/html/rfc4180) and [JSON Lines](http://jsonlines.org) formats for exporting results
- Emit `requeststarted`, `requestskipped`, `requestfinished`, `requestfailed`, `maxdepthreached`, `maxrequestreached` and `disconnected` events.
- Improve debug logs by tracing public APIs and events.

### Changed

- Allow `onSuccess` and `evaluatePage` options as `null`.
- Change `crawler.isPaused`, `crawler.queueSize`, `crawler.pendingQueueSize` and `crawler.requestedCount` from read-only properties to methods.

### Fixed

- Fix a bug of ignoring maxDepth option.

## [1.2.3] - 2017-12-17
### Changed

- Refactor by changing tye style of requiring cache directory.

### Fixed

- Fix a bug of starting too many crawlers more than maxConcurrency when requests fail.

## [1.2.2] - 2017-12-16
### Added

- Automatically collect and follow links found in the requested page.
- Support `maxDepth` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.

## [1.2.1] - 2017-12-13
### Added

- Support `screenshot` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.

## [1.2.0] - 2017-12-11
### Changed

- Rename `ensureCacheClear` to `persistCache` for [HCCrawler.connect()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerconnectoptions) and [HCCrawler.launch()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerlaunchoptions)'s options.

## [1.1.2] - 2017-12-10
### Added

- Support `maxRequest` for [HCCrawler.connect()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerconnectoptions) and [HCCrawler.launch()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerlaunchoptions)'s options.
- Support `allowedDomains` and `userAgent` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Support pluggable cache such as [SessionCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#class-sessioncache), [RedisCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#class-rediscache) and [BaseCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#class-basecache) interface for customizing caches.
- Add [crawler.setMaxRequest()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlersetmaxrequestmaxrequest), [crawler.pause()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerpause) and [crawler.resume()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerresume) methods.
- Add [crawler.pendingQueueSize](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerpendingqueuesize) and [crawler.requestedCount](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerrequestedcount) read-only properties.

## [1.1.1] - 2017-12-09
### Added

- Add [CHANGELOG.md](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/CHANGELOG.md) based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).
- Add unit tests.

### Changed

- Automatically dismisses dialog.
- Performance improvement by setting a page parallel.

## [1.1.0] - 2017-12-08
### Added

- Support `extraHeaders` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Add comment in [JSDoc](http://usejsdoc.org) style.

### Changed

- Public API to launch a browser has changed. Now you can launch browser by [HCCrawler.launch()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#hccrawlerlaunchoptions).
- Rename `shouldRequest` to `preRequest` for [crawler.queue()](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/docs/API.md#crawlerqueueoptions)'s options.
- Refactor by separating `HCCrawler` and `Crawler` classes.
- Refactor handlers for options.

## [1.0.0] - 2017-12-05
### Added

- Add test with [mocha](https://mochajs.org) and [power-assert](https://github.com/power-assert-js/power-assert).
- Add coverage with [istanbul](https://github.com/gotwarlost/istanbul).
- Add setting for CircleCI.
- Add [.editorconfig](http://editorconfig.org/).
- Add [debug](https://github.com/visionmedia/debug) log.

### Changed

- Migrate from NPM to [Yarn](https://yarnpkg.com/lang/en/).
- Refactor helper to class static method style.
