# headless-chrome-crawler
Headless Chrome Crawler for Node.js Powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer)

## Features

Crawlers based on simple requests to html files are generally fast. However, it sometimes end up capturing empty bodies, especially when the websites are built on such modern frontend frameworks as AngularJS, ReactJS and Vue.js.

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
# or "npm i headless-chrome-crawler"
```

> **Note**: headless-chrome-crawler is powered by [Puppeteer](https://github.com/GoogleChrome/puppeteer). While installation, it automatically downloads a recent version of Chromium. To skip the download, see [Environment variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).

### Usage

The basic API of headless-chrome-crawler is inspired by that of [node-crawler](https://github.com/bda-research/node-crawler), so the API design is somewhat similar but not exactly compatible.

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
    // Queue a single request
    crawler.queue('https://example.com');
    // Queue multiple requests
    crawler.queue(['https://example.net', 'https://example.org']);
    // Queue a query custom options
    crawler.queue({
      jQuery: false,
      url: 'https://example.com',
      evaluatePage: (() => ({
        title: document.title,
        h1: document.getElementsByTagName('h1')[0].innerText,
        p: document.getElementsByTagName('p')[0].innerText
      })),
    });
    // Called when no queue is left
    crawler.onIdle()
      .then(() => crawler.close());
  });
```

## Examples

See [here](https://github.com/yujiosaka/headless-chrome-crawler/tree/master/examples).

## API reference

### Table of Contents

* [class: HCCrawler](#class-hccrawler)
  * [HCCrawler.connect([options])](#hccrawlerconnectoptions)
  * [HCCrawler.launch([options])](#hccrawlerlaunchoptions)
* [class: Crawler](#class-crawler)
  * [crawler.queue([options])](#crawlerqueueoptions)
  * [crawler.close()](#crawlerclose)
  * [crawler.onIdle()](#crawleronidle)
  * [crawler.queueSize](#crawlerqueuesize)

### class: HCCrawler

HCCrawler provides a method to launch a crawler. It extends [Puppeteer class](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-puppeteer), so any methods like `HCCrawler.executablePath()` are available.

#### HCCrawler.connect([options])

* `options` <[Object]>
  * `concurrency` <[number]> Maximum number of pages to open concurrently, defaults to `10`.
* returns: <Promise<Crawler>> Promise which resolves to Crawler instance.

This method connects to an existing Chromium instance. The following options are passed straight to [Puppeteer.connect API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerconnectoptions).

```
browserWSEndpoint, ignoreHTTPSErrors
```

Also, the following options can be set as default values when [crawler.queue([options])](#crawlerqueueoptions) are executed.

```
url, timeout, priority, delay, retryCount, retryDelay, jQuery, device, username, password, shouldRequest, evaluatePage, onSuccess, onError
```

> **Note**: In practice, setting the options every time you queue the requests is not only redundant but also slow. Therefore, it's recommended to set the default values and override them depending on the necessity.

#### HCCrawler.launch([options])

* `options` <[Object]>
  * `concurrency` <[number]> Maximum number of pages to open concurrently, defaults to `10`.
* returns: <Promise<Crawler>> Promise which resolves to Crawler instance.

The method launches a Chromium instance. The following options are passed straight to [Puppeteer.launch API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).

```
ignoreHTTPSErrors, headless, executablePath, slowMo, args, handleSIGINT, handleSIGTERM, handleSIGHUP, timeout, dumpio, userDataDir, env, devtools
```

Also, the following options can be set as default values when [crawler.queue([options])](#crawlerqueueoptions) are executed.

```
url, timeout, priority, delay, retryCount, retryDelay, jQuery, device, username, password, shouldRequest, evaluatePage, onSuccess, onError
```

> **Note**: In practice, setting the options every time you queue the requests is not only redundant but also slow. Therefore, it's recommended to set the default values and override them depending on the necessity.

### class: Crawler

HCCrawler provides a method to queue a request. It extends [Puppeteer's Browser class](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-browser), so any methods like `crawler.close()` are available.

#### crawler.queue([options])

* `options` <[Object]>
  * `url` <[String]> Url to navigate to. The url should include scheme, e.g. `https://`.
  * `priority` <[number]> Basic priority of queues, defaults to `1`. Queues with larger priorities are preferred.
  * `delay` <[number]> Number of milliseconds after each request, defaults to `0`. When delay is set, concurrency must be `1`.
  * `retryCount` <[number]> Number of limit when retry fails, defaults to `3`.
  * `retryDelay` <[number]> Number of milliseconds after each retry fails, defaults to `10000`.
  * `jQuery` <[boolean]> Whether to automatically add jQuery tag to page, defaults to `true`.
  * `device` <[String]> Device to emulate. Available devices are listed [here](https://github.com/GoogleChrome/puppeteer/blob/master/DeviceDescriptors.js).
  * `username` <[String]> Username required for Basic Authentication. pass `null` if it's not necessary.
  * `password` <[String]> Password required for Basic Authentication. pass `null` if it's not necessary.
  * `extraHeaders` <[Object]> An object containing additional http headers to be sent with every request. All header values must be strings.
  * `preRequest(options)` <[Function]> Function to do anything like waiting and modifying options before each request. You can also return `false` if you want to skip the request.
    * `options` <[Object]> [crawler.queue([options])](#crawlerqueueoptions)'s options with default values.
  * `evaluatePage()` <[Function]> Function to be evaluated in browsers. Return serializable object. If it's not serializable, the result will be `undefined`.
  * `onSuccess(response)` <[Function]> Function to be called when `evaluatePage()` successes.
    * `response` <[Object]>
      * `status` <[String]> status code of the request.
      * `options` <[Object]> crawler.queue([options])](#crawlerqueueoptions)'s options with default values.
      * `result` <[Serializable]> The result resolved from `evaluatePage()`.
  * `onError(error)` <[Function]> Function to be called when request fails.
    * `error` <[Error]> Error object.

> **Note**: `extraHeaders` options do not guarantee the order of headers in the outgoing requests.

The options can be either an object, an array, or a string. When it's an array, each item in the array will be executed. When it's a string, the options are transformed to an object with only url defined.

#### hccrawler.close()

returns: <[Promise]> Promise which is resolved when ther browser is closed.

#### crawler.onIdle()

- returns: <[Promise]> Promise which is resolved when queues become empty.

#### crawler.queueSize

* returns: <[number]> The size of queues. This property is read only.

## Debugging tips

### Launch options

[HCCrawler.launch([options])](#hccrawlerlaunchoptions)'s options are passed straight to [Puppeteer.launch API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions). It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
HCCrawler.launch({ headless: false, slowMo: 10 });
```

### Enable debug logging

All requests and browser's logs are logged via the [debug](https://github.com/visionmedia/debug) module under the `hccrawler` namespace.

```
env DEBUG="hccrawler:*" node script.js
env DEBUG="hccrawler:request" node script.js
env DEBUG="hccrawler:browser" node script.js
```
