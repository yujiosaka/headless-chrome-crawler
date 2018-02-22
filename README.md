# headless-chrome-crawler [![npm](https://badge.fury.io/js/headless-chrome-crawler.svg)](https://www.npmjs.com/package/headless-chrome-crawler) [![build](https://circleci.com/gh/yujiosaka/headless-chrome-crawler/tree/master.svg?style=shield&circle-token=ba45f930aed7057b79f2ac09df6be3e1b8ee954b)](https://circleci.com/gh/yujiosaka/headless-chrome-crawler/tree/master) [![Greenkeeper badge](https://badges.greenkeeper.io/yujiosaka/headless-chrome-crawler.svg)](https://greenkeeper.io/)
Distributed crawler powered by Headless Chrome

<img src="https://user-images.githubusercontent.com/2261067/36531211-81d54840-1800-11e8-8aa7-019c777712bf.png" height="300" align="right">

## Features

Crawlers based on simple requests to HTML files are generally fast. However, it sometimes ends up capturing empty bodies, especially when the websites are built on such modern frontend frameworks as [AngularJS](https://angularjs.org), [React](https://reactjs.org) and [Vue.js](https://jp.vuejs.org/index.html).

Powered by Headless Chrome, the crawler provides [simple APIs](#api-reference) to crawl these dynamic websites with the following features:

* Distributed crawling
* Configure concurrency, delay and retry
* Breadth-first search (BFS) to automatically follow links
* Pluggable cache storages such as [Redis](https://redis.io)
* Support [CSV](https://tools.ietf.org/html/rfc4180) and [JSON Lines](http://jsonlines.org) for exporting results
* Pause at the max request and resume at any time
* Insert [jQuery](https://jquery.com) automatically for scraping
* Save screenshots for the crawling evidence
* Emulate devices and user agents
* Priority queue for crawling efficiency
* Obey [robots.txt](https://developers.google.com/search/reference/robots_txt)
* Follow [sitemap.xml](https://www.sitemaps.org/)
* [Promise] support

## Getting Started

### Installation

```
yarn add headless-chrome-crawler
# or "npm i headless-chrome-crawler"
```

> **Note**: headless-chrome-crawler contains [Puppeteer](https://github.com/GoogleChrome/puppeteer). During installation, it automatically downloads a recent version of Chromium. To skip the download, see [Environment variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).

### Usage

```js
const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  // Function to be evaluated in browsers
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  // Function to be called with evaluated results from browsers
  onSuccess: (result => {
    console.log(result);
  }),
})
  .then(crawler => {
    // Queue a request
    crawler.queue('https://example.com/');
    // Queue multiple requests
    crawler.queue(['https://example.net/', 'https://example.org/']);
    // Queue a request with custom options
    crawler.queue({
      url: 'https://example.com/',
      // Emulate a tablet device
      device: 'Nexus 7',
      // Enable screenshot by passing options
      screenshot: {
        path: './tmp/example-com.png'
      },
    });
    crawler.onIdle() // Resolved when no queue is left
      .then(() => crawler.close()); // Close the crawler
  });
```

## Examples

* [Priority queue for crawling efficiency](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/priority-queue.js)
* [Emulate device and user agent](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/emulate-device.js)
* [Redis cache to skip duplicate requests](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/redis-cache.js)
* [Export a CSV file for crawled results](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/csv-exporter.js)
* [Conditionally saving screenshots](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/conditional-screenshot.js)

See [here](https://github.com/yujiosaka/headless-chrome-crawler/tree/master/examples) for the full examples list. The examples can be run from the root folder as follows:

```sh
NODE_PATH=../ node examples/priority-queue.js
```

## API reference

### Table of Contents

* [class: HCCrawler](#class-hccrawler)
  * [HCCrawler.connect([options])](#hccrawlerconnectoptions)
  * [HCCrawler.launch([options])](#hccrawlerlaunchoptions)
  * [HCCrawler.executablePath()](#hccrawlerexecutablepath)
  * [HCCrawler.defaultArgs()](#hccrawlerdefaultargs)
  * [crawler.queue([options])](#crawlerqueueoptions)
  * [crawler.setMaxRequest(maxRequest)](#crawlersetmaxrequestmaxrequest)
  * [crawler.pause()](#crawlerpause)
  * [crawler.resume()](#crawlerresume)
  * [crawler.clearCache()](#crawlerclearcache)
  * [crawler.close()](#crawlerclose)
  * [crawler.disconnect()](#crawlerdisconnect)
  * [crawler.version()](#crawlerversion)
  * [crawler.userAgent()](#crawleruseragent)
  * [crawler.wsEndpoint()](#crawlerwsendpoint)
  * [crawler.onIdle()](#crawleronidle)
  * [crawler.isPaused()](#crawlerispaused)
  * [crawler.queueSize()](#crawlerqueuesize)
  * [crawler.pendingQueueSize()](#crawlerpendingqueuesize)
  * [crawler.requestedCount()](#crawlerrequestedcount)
  * [event: 'newpage'](#event-newpage)
  * [event: 'requeststarted'](#event-requeststarted)
  * [event: 'requestskipped'](#event-requestskipped)
  * [event: 'requestfinished'](#event-requestfinished)
  * [event: 'requestretried'](#event-requestretried)
  * [event: 'requestfailed'](#event-requestfailed)
  * [event: 'robotstxtrequestfailed'](#event-robotstxtrequestfailed)
  * [event: 'sitemapxmlrequestfailed'](#event-sitemapxmlrequestfailed)
  * [event: 'maxdepthreached'](#event-maxdepthreached)
  * [event: 'maxrequestreached'](#event-maxrequestreached)
  * [event: 'disconnected'](#event-disconnected)
* [class: SessionCache](#class-sessioncache)
* [class: RedisCache](#class-rediscache)
* [class: BaseCache](#class-basecache)
* [class: CSVExporter](#class-csvexporter)
* [class: JSONLineExporter](#class-jsonlineexporter)
* [class: BaseExporter](#class-baseexporter)

### class: HCCrawler

HCCrawler provides methods to launch or connect to a Chromium instance.

```js
const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  onSuccess: (result => {
    console.log(result);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.onIdle()
      .then(() => crawler.close());
  });
```

#### HCCrawler.connect([options])

* `options` <[Object]>
  * `maxConcurrency` <[number]> Maximum number of pages to open concurrently, defaults to `10`.
  * `maxRequest` <[number]> Maximum number of requests, defaults to `0`. Pass `0` to disable the limit.
  * `exporter` <[Exporter]> An exporter object which extends [BaseExporter](#class-baseexporter)'s interfaces to export results, default to `null`.
  * `cache` <[Cache]> A cache object which extends [BaseCache](#class-basecache)'s interfaces to remember and skip duplicate requests, defaults to a [SessionCache](#class-sessioncache) object.
  * `persistCache` <[boolean]> Whether to clear cache on closing or disconnecting from the Chromium instance, defaults to `false`.
  * `preRequest(options)` <[Function]> Function to do anything like modifying `options` before each request. You can also return `false` if you want to skip the request.
    * `options` <[Object]> [crawler.queue()](#crawlerqueueoptions)'s options with default values.
  * `onSuccess(response)` <[Function]> Function to be called when `evaluatePage()` successes.
    * `response` <[Object]>
      * `response` <[Object]>
        * `ok` <[boolean]> whether the status code in the range 200-299 or not.
        * `status` <[string]> status code of the request.
        * `url` <[string]> Last requested url.
        * `headers` <[Object]> Response headers.
      * `options` <[Object]> [crawler.queue()](#crawlerqueueoptions)'s options with default values.
      * `result` <[Serializable]> The result resolved from `evaluatePage()` option.
      * `screenshot` <[Buffer]> Buffer with the screenshot image, which is `null` when `screenshot` option not passed.
      * `links` <[Array]> List of links found in the requested page.
      * `depth` <[number]> Depth of the followed links.
  * `onError(error)` <[Function]> Function to be called when request fails.
    * `error` <[Error]> Error object.
* returns: <[Promise]<[HCCrawler]>> Promise which resolves to HCCrawler instance.

This method connects to an existing Chromium instance. The following options are passed to [puppeteer.connect()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerconnectoptions).

```
browserWSEndpoint, ignoreHTTPSErrors
```

Also, the following options can be set as default values when [crawler.queue()](#crawlerqueueoptions) are executed.

```
url, allowedDomains, deniedDomains, timeout, priority, delay, retryCount, retryDelay, jQuery, device, username, password, evaluatePage
```

> **Note**: In practice, setting the options every time you queue equests is redundant. Therefore, it's recommended to set the default values and override them depending on the necessity.

#### HCCrawler.launch([options])

* `options` <[Object]>
  * `maxConcurrency` <[number]> Maximum number of pages to open concurrently, defaults to `10`.
  * `maxRequest` <[number]> Maximum number of requests, defaults to `0`. Pass `0` to disable the limit.
  * `exporter` <[Exporter]> An exporter object which extends [BaseExporter](#class-baseexporter)'s interfaces to export results, default to `null`.
  * `cache` <[Cache]> A cache object which extends [BaseCache](#class-basecache)'s interfaces to remember and skip duplicate requests, defaults to a [SessionCache](#class-sessioncache) object.
  * `persistCache` <[boolean]> Whether to clear cache on closing or disconnecting from the Chromium instance, defaults to `false`.
  * `preRequest(options)` <[Function]> Function to do anything like modifying `options` before each request. You can also return `false` if you want to skip the request.
    * `options` <[Object]> [crawler.queue()](#crawlerqueueoptions)'s options with default values.
  * `onSuccess(response)` <[Function]> Function to be called when `evaluatePage()` successes.
    * `response` <[Object]>
      * `response` <[Object]>
        * `ok` <[boolean]> whether the status code in the range 200-299 or not.
        * `status` <[string]> status code of the request.
        * `url` <[string]> Last requested url.
        * `headers` <[Object]> Response headers.
      * `options` <[Object]> [crawler.queue()](#crawlerqueueoptions)'s options with default values.
      * `result` <[Serializable]> The result resolved from `evaluatePage()` option.
      * `screenshot` <[Buffer]> Buffer with the screenshot image, which is `null` when `screenshot` option not passed.
      * `links` <[Array]> List of links found in the requested page.
      * `depth` <[number]> Depth of the followed links.
  * `onError(error)` <[Function]> Function to be called when request fails.
    * `error` <[Error]> Error object.
* returns: <[Promise]<[HCCrawler]>> Promise which resolves to HCCrawler instance.

The method launches a Chromium instance. The following options are passed to [puppeteer.launch()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).

```
ignoreHTTPSErrors, headless, executablePath, slowMo, args, ignoreDefaultArgs, handleSIGINT, handleSIGTERM, handleSIGHUP, timeout, dumpio, userDataDir, env, devtools
```

Also, the following options can be set as default values when [crawler.queue()](#crawlerqueueoptions) are executed.

```
url, allowedDomains, deniedDomains, timeout, priority, delay, retryCount, retryDelay, jQuery, device, username, password, evaluatePage
```

> **Note**: In practice, setting the options every time you queue the requests is redundant. Therefore, it's recommended to set the default values and override them depending on the necessity.

#### HCCrawler.executablePath()

* returns: <[string]> An expected path to find bundled Chromium.

#### HCCrawler.defaultArgs()

* returns: <[Array]<[string]>> The default flags that Chromium will be launched with.

#### crawler.queue([options])

* `options` <[Object]>
  * `url` <[string]> Url to navigate to. The url should include scheme, e.g. `https://`.
  * `maxDepth` <[number]> Maximum depth for the crawler to follow links automatically, default to 1. Leave default to disable following links.
  * `priority` <[number]> Basic priority of queues, defaults to `1`. Priority with larger number is preferred.
  * `skipDuplicates` <[boolean]> Whether to skip duplicate requests, default to `null`. The request is considered to be the same if `url`, `userAgent`, `device` and `extraHeaders` are strictly the same.
  * `obeyRobotsTxt` <[boolean]> Whether to obey [robots.txt](https://developers.google.com/search/reference/robots_txt), default to `true`.
  * `followSitemapXml` <[boolean]> Whether to use [sitemap.xml](https://www.sitemaps.org/) to find locations, default to `false`.
  * `allowedDomains` <[Array]<[string]|[RegExp]>> List of domains allowed to request. Pass `null` or leave default to skip checking allowed domain
  * `deniedDomains` <[Array]<[string]|[RegExp]>> List of domains not allowed to request. Pass `null` or leave default to skip checking denied domain.
  * `delay` <[number]> Number of milliseconds after each request, defaults to `0`. When delay is set, `maxConcurrency` option must be `1`.
  * `retryCount` <[number]> Number of limit when retry fails, defaults to `3`.
  * `retryDelay` <[number]> Number of milliseconds after each retry fails, defaults to `10000`.
  * `jQuery` <[boolean]> Whether to automatically add [jQuery](https://jquery.com) tag to page, defaults to `true`.
  * `device` <[string]> Device to emulate. Available devices are listed [here](https://github.com/GoogleChrome/puppeteer/blob/master/DeviceDescriptors.js).
  * `username` <[string]> Username for basic authentication. pass `null` if it's not necessary.
  * `screenshot` <[Object]> Screenshot option, defaults to `null`. This option is passed to [Puppeteer's page.screenshot()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions). Pass `null` or leave default to disable screenshot.
  * `password` <[string]> Password for basic authentication. pass `null` if it's not necessary.
  * `userAgent` <[string]> User agent string to override in this page.
  * `extraHeaders` <[Object]> An object containing additional headers to be sent with every request. All header values must be strings.
  * `evaluatePage()` <[Function]> Function to be evaluated in browsers. Return serializable object. If it's not serializable, the result will be `undefined`.

> **Note**: `response.url` may be different from `options.url` especially when the requested url is redirected.

The following options are passed to [Puppeteer's page.goto()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options)'s options'.

```
timeout, waitUntil
```

The options can be either an object, an array, or a string. When it's an array, each item in the array will be executed. When it's a string, the options are transformed to an object with only url defined.

#### crawler.setMaxRequest(maxRequest)

* `maxRequest` <[number]> Modify `maxRequest` option you passed to [HCCrawler.connect()](#hccrawlerconnectoptions) or [HCCrawler.launch()](#hccrawlerlaunchoptions).

#### crawler.pause()

This method pauses processing queues. You can resume the queue by calling [crawler.resume()](#crawlerresume).

#### crawler.resume()

This method resumes processing queues. This method may be used after the crawler is intentionally closed by calling [crawler.pause()](#crawlerpause) or request count reached `maxRequest` option.

#### crawler.clearCache()

* returns: <[Promise]> Promise resolved when the cache is cleared.

This method clears the cache when it's used.

#### crawler.close()

* returns: <[Promise]> Promise resolved when ther browser is closed.

#### crawler.disconnect()

* returns: <[Promise]> Promise resolved when ther browser is disconnected.

#### crawler.version()

* returns: <[Promise]<[string]>> Promise resolved with the Chromium version.

#### crawler.userAgent()

* returns: <[Promise]<[string]>> Promise resolved with the default user agent.

#### crawler.wsEndpoint()

* returns: <[Promise]<[string]>> Promise resolved with websocket url.

#### crawler.onIdle()

* returns: <[Promise]> Promise resolved when queues become empty or paused.

#### crawler.isPaused()

* returns: <[boolean]> Whether the queue is paused.

#### crawler.queueSize()

* returns: <[Promise]<[number]>> Promise resolves to the size of queues.

#### crawler.pendingQueueSize()

* returns: <[number]> The size of pending queues.

#### crawler.requestedCount()

* returns: <[number]> The count of total requests.

#### event: 'newpage'

* `page` <[Page]>

Emitted when a [Puppeteer](https://github.com/GoogleChrome/puppeteer)'s page is opened.

#### event: 'requeststarted'

* `options` <[Object]>

Emitted when a request started.

#### event: 'requestskipped'

* `options` <[Object]>

Emitted when a request is skipped.

#### event: 'requestfinished'

* `options` <[Object]>

Emitted when a request finished successfully.

#### event: 'requestretried'

* `options` <[Object]>

Emitted when a request is retried.

#### event: 'requestfailed'

* `error` <[Error]>

Emitted when a request failed.

#### event: 'robotstxtrequestfailed'

* `error` <[Error]>

Emitted when a request to [robots.txt](https://developers.google.com/search/reference/robots_txt) failed

#### event: 'sitemapxmlrequestfailed'

* `error` <[Error]>

Emitted when a request to [sitemap.xml](https://www.sitemaps.org/) failed

#### event: 'maxdepthreached'

* `options` <[Object]>

Emitted when a queue reached the [crawler.queue()](#crawlerqueueoptions)'s `maxDepth` option.

#### event: 'maxrequestreached'

Emitted when a queue reached the [HCCrawler.connect()](#hccrawlerconnectoptions) or [HCCrawler.launch()](#hccrawlerlaunchoptions)'s `maxRequest` option.

#### event: 'disconnected'

Emitted when the browser instance is disconnected.

### class: SessionCache

`SessionCache` is the [HCCrawler.connect()](#hccrawlerconnectoptions)'s default `cache` option. By default, the crawler remembers already requested urls on its memory.

```js
const HCCrawler = require('headless-chrome-crawler');

// Pass null to the cache option to disable it.
HCCrawler.launch({ cache: null });
// ...
```

### class: RedisCache

* `options` <[Object]>
  * `expire` <[number]> Seconds to expires cache after setting each value, default to `null`.

Passing a `RedisCache` object to the [HCCrawler.connect()](#hccrawlerconnectoptions)'s `cache` option allows you to persist requested urls and [robots.txt](https://developers.google.com/search/reference/robots_txt) in [Redis](https://redis.io) so that it prevent from requesting same urls in a distributed servers' environment. It also works well with its `persistCache` option to be true.

Other constructing options are passed to [NodeRedis's redis.createClient()](https://github.com/NodeRedis/node_redis#rediscreateclient)'s options.

```js
const HCCrawler = require('headless-chrome-crawler');
const RedisCache = require('headless-chrome-crawler/cache/redis');

const cache = new RedisCache({ host: '127.0.0.1', port: 6379 });

HCCrawler.launch({
  persistCache: true, // Set true so that cache won't be cleared when closing the crawler
  cache,
});
// ...
```

### class: BaseCache

You can create your own cache by extending the [BaseCache's interfaces](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/cache/base.js).

See [here](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/custom-cache.js) for example.

### class: CSVExporter

* `options` <[Object]>
  * `file` <[string]> File path to export output.
  * `fields` <[Array]<[string]>> List of fields to be used for columns. This option is also used for the headers.
  * `separator` <[string]> Character to separate columns.

```js
const HCCrawler = require('headless-chrome-crawler');
const CSVExporter = require('headless-chrome-crawler/exporter/csv');

const FILE = './tmp/result.csv';

const exporter = new CSVExporter({
  file: FILE,
  fields: ['response.url', 'response.status', 'links.length'],
  separator: '\t',
});

HCCrawler.launch({ exporter })
// ...
```

### class: JSONLineExporter

* `options` <[Object]>
  * `file` <[string]> File path to export output.
  * `fields` <[Array]<[string]>> List of fields to be filtered in json, defaults to `null`. Leave default not to filter fields.
  * `jsonReplacer` <[Function]> Function that alters the behavior of the stringification process, defaults to `null`. This is useful to sorts keys always in the same order.

```js
const HCCrawler = require('headless-chrome-crawler');
const CSVExporter = require('headless-chrome-crawler/exporter/json-line');

const FILE = './tmp/result.json';

const exporter = new JSONLineExporter({
  file: FILE,
  fields: ['options', 'response'],
});

HCCrawler.launch({ exporter })
// ...
```

### class: BaseExporter

You can create your own exporter by extending the [BaseExporter's interfaces](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/exporter/base.js).

See [here](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/examples/custom-exporter.js) for example.

## Tips

### Distributed crawling

In order to crawl under distributed mode, use [Redis](https://redis.io) for the shared cache storage.
You can run the same script on multiple machines, so that [Redis](https://redis.io) is used to share and distribute task queues.

```js
const HCCrawler = require('headless-chrome-crawler');
const RedisCache = require('headless-chrome-crawler/cache/redis');

const TOP_PAGES = [
  // ...
];

const cache = new RedisCache({
  // ...
});

HCCrawler.launch({
  maxDepth: 3,
  cache,
})
  .then(crawler => {
    crawler.queue(TOP_PAGES);
  });
```

### Launch options

[HCCrawler.launch()](#hccrawlerlaunchoptions)'s options are passed to [puppeteer.launch()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions). It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
HCCrawler.launch({ headless: false, slowMo: 10 });
```

Also, the `args` option is passed to the browser instance. List of Chromium flags can be found [here](http://peter.sh/experiments/chromium-command-line-switches/). Passing `--disable-web-security` flag is useful for crawling. If the flag is set, links within iframes are collected as those of parent frames. If it's not, the source attributes of the iframes are collected as links.

```js
HCCrawler.launch({ args: ['--disable-web-security'] });
```

### Enable debug logging

All requests and browser's logs are logged via the [debug](https://github.com/visionmedia/debug) module under the `hccrawler` namespace.

```
env DEBUG="hccrawler:*" node script.js
env DEBUG="hccrawler:request" node script.js
env DEBUG="hccrawler:browser" node script.js
```

## FAQ

### How is this different from other crawlers?

There are roughly two types of crawlers. One is static and the other is dynamic.

The static crawlers are based on simple requests to HTML files. They are generally fast, but fail scraping the contents when the HTML dynamically changes on browsers.

Dynamic crawlers based on [PhantomJS](http://phantomjs.org) and [Selenium](http://www.seleniumhq.org) work magically on such dynamic applications. However, [PhantomJS's maintainer has stepped down and recommended to switch to Headless Chrome](https://groups.google.com/forum/#!topic/phantomjs/9aI5d-LDuNE), which is fast and stable. [Selenium](http://www.seleniumhq.org) is still a well-maintained cross browser platform which runs on Chrome, Safari, IE and so on. However, crawlers do not need such cross browsers support.

 This crawler is dynamic and based on Headless Chrome.

[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "Boolean"
[Buffer]: https://nodejs.org/api/buffer.html#buffer_class_buffer "Buffer"
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "Number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "String"
[RegExp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp "RegExp"
[Serializable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description "Serializable"
[Error]: https://nodejs.org/api/errors.html#errors_class_error "Error"
[HCCrawler]: #class-hccrawler "HCCrawler"
[Exporter]: #baseexporter "Exporter"
[Cache]: #basecache "Cache"
[Page]: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page "Page"
