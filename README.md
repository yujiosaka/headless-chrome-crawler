# headless-chrome-crawler
Headless Chrome crawler for Node.js Powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer)

## Features

Crawlers based on simple requests to html files are generally fast. However, it sometimes end up just capturing empty bodies, especially when the websites are built on such modern frontend frameworks as AngularJS, ReactJS and Vue.js.

Powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer), headless-chrome-crawler allows you to scrape those single page applications with the following features:

* Configure concurrency, delay and retries
* Cancel requests by conditions
* Insert jQuery automatically
* Priority queue
* Device emulation
* Basic authentication
* Promise support

## Getting Started

### Installation

```
yarn add headless-chrome-crawler
```

> **Note**: headless-chrome-crawler is powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer). With installation, it automatically downloads a recent version of Chromium. To skip the download, see [Environment variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).

### Usage

The API of headless-chrome-crawler is inspired by that of [node-crawler](https://github.com/bda-research/node-crawler), so the API design is very similar but not exactly compatible.

```js
const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
    p: $('p').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result); // resolves status, options and evaluated result.
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com');
    crawler.queue(['https://example.net', 'https://example.org']);
    crawler.queue({
      jQuery: false,
      url: 'https://example.com',
      evaluatePage: (() => ({
        title: document.title,
        h1: document.getElementsByTagName('h1')[0].innerText,
        p: document.getElementsByTagName('p')[0].innerText
      })),
    });
    crawler.onIdle()
      .then(() => crawler.close());
  });
```

## Examples

See [here](https://github.com/yujiosaka/headless-chrome-crawler/tree/master/examples).

## API reference

### Table of Contents

* [class: HCCrawler](#class-hccrawler)
  * [hccrawler.launch([options])](#hccrawlerlaunchoptions)
* [class: Crawler](#class-crawler)
  * [crawler.queue([options])](#crawlerqueueoptions)
  * [crawler.onIdle()](#crawleronidle)
  * [crawler.close()](#crawlerclose)
  * [crawler.queueSize](#crawlerqueuesize)

### class: HCCrawler

You can pass the following options to the constructor.
Concurrency can only be set in the constructor, but other options can be overridden by each [crawler.queue](#crawlerqueueoptions)'s options

* `options` <[Object]>
  * `url` <[String]> Url to navigate to. The url should include scheme, e.g. `https://`.
  * `timeout` <[number]> Maximum navigation time in milliseconds, defaults to `30`, pass `0` to disable timeout.
  * `waitUntil` <string|Array<string>> When to consider navigation succeeded, defaults to `load`. Given an array of event strings, navigation is considered to be successful after all events have been fired. Events can be either:
    * `load` - consider navigation to be finished when the `load` event is fired.
    * `domcontentloaded` - consider navigation to be finished when the `DOMContentLoaded` event is fired.
    * `networkidle0` - consider navigation to be finished when there are no more than `0` network connections for at least `500` ms.
    * `networkidle2` - consider navigation to be finished when there are no more than `2` network connections for at least `500` ms.
  * `concurrency` <[number]> Number of pages to work concurrently, defaults to `10`.
  * `priority` <[number]> Basic priority of queues, defaults to `1`. Queues with larger priorities are preferred.
  * `delay` <[number]> Number of milliseconds after each request, defaults to `0`. When delay is set, concurrency must be `1`.
  * `retryCount` <[number]> Number of limit when retry fails, defaults to `3`.
  * `retryDelay` <[number]> Number of milliseconds after each retry fails, defaults to `10000`.
  * `jQuery` <[boolean]> Whether to automatically add jQuery tag to page, defaults to `true`.
  * `captureConsole` <[boolean]> Whether to capture browser's console. Useful for debugging, defaults to `false`.
  * `device` <[String]> Device to emulate. Available devices are listed [here](https://github.com/GoogleChrome/puppeteer/blob/master/DeviceDescriptors.js).
  * `username` <[String]> Username required for Basic Authentication. pass `null` if it's not necessary.
  * `password` <[String]> Password required for Basic Authentication. pass `null` if it's not necessary.
  * `shouldRequest(options)` <[Function]> Return `false` if you want to skip the request. Useful for skipping duplicates.
    * `options` <[Object]> Options merged with crawler.queue's options.
  * `evaluatePage()` <[Function]> Function to be evaluated in browsers. Return serializable object. If it's not serializable, the result will be `undefined`.
  * `onSuccess(response)` <[Function]> Function to be called when `evaluatePage()` successes.
    * `response` <[Object]>
      * `status` <[String]> status code of the request.
      * `options` <[Object]> Options merged with crawler.queue's options.
      * `result` <[Serializable]> The result resolved from `evaluatePage()`.
  * `onError(err)` <[Function]> Function to be called when request fails.
    * `err` <[Error]> Error object.

> **Note**: `url`, `timeout` are `waitUntil` options are passed to [Puppeteer](https://github.com/GoogleChrome/puppeteer). For updated information, see [Puppeteer's page.goto(url, options) API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options)

#### crawler.launch([options])

The options are passed straight to [Puppeteer.launch API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).
Following options may be useful for debugging.

- `options` <[Object]>
  - `headless` <[boolean]> Whether to run Chromium in [headless mode](https://developers.google.com/web/updates/2017/04/headless-chrome), defaults to `true` unless the `devtools` option is `true`.
  - `slowMo` <[number]> Slows down Puppeteer operations by the specified amount of milliseconds. Useful so that you can see what is going on.

#### crawler.queue([options])

Options can be either an array or an object.
All options are common with HCCrawler's constructor options except that `concurrency` option cannot be set in `crawler.queue`.
When both defined, crawler.queue's options are always preferred.

#### crawler.onIdle()

- returns: <[Promise]> Promise is chained when queues become empty.

#### crawler.close()

- returns: <[Promise]> Promise is chained when ther browser is successfully closed.

#### crawler.queueSize

* returns: <[number]> The size of queues. This property is read only.

## Debugging tips

### Puppeteer.launch's options

[crawler.launch](#chcrawlerlaunchoptions)'s options are passed straight to [Puppeteer.launch API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).
It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
HCcrawler.launch({ headless: false, slowMo: 10 });
```

### Enable debug logging

All requests and browser's logs are logged via the [debug]'(https://github.com/visionmedia/debug)' module under the `hccrawler` namespace.

```
env DEBUG="hccrawler:*" node script.js
env DEBUG="hccrawler:request" node script.js
env DEBUG="hccrawler:browser" node script.js
```
