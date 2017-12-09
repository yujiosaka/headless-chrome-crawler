# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2017-12-09
### Added

- Automatically dismisses dialog
- Enrich unit tests

### Changed

- Refactor by separating HCCrawler and Crawler classes
- Make preparation of pages parallel

## [1.1.0] - 2017-12-08
### Added

- Support `extraHeaders` option
- Add comment in [JSDoc](http://usejsdoc.org) style

### Changed

- Public API to launch a browser has changed. Now you can launch browser by `HCCrawler.launch()`
- Rename `shouldRequest` to `preRequest`
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
