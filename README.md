# Headless Chrome Crawler [![npm](https://badge.fury.io/js/headless-chrome-crawler.svg)](https://www.npmjs.com/package/headless-chrome-crawler) [![build](https://circleci.com/gh/yujiosaka/headless-chrome-crawler/tree/master.svg?style=shield&circle-token=ba45f930aed7057b79f2ac09df6be3e1b8ee954b)](https://circleci.com/gh/yujiosaka/headless-chrome-crawler/tree/master) [![Greenkeeper badge](https://badges.greenkeeper.io/yujiosaka/headless-chrome-crawler.svg)](https://greenkeeper.io/)
Distributed crawler powered by Headless Chrome

<img src="https://user-images.githubusercontent.com/2261067/36531211-81d54840-1800-11e8-8aa7-019c777712bf.png" height="300" align="right">

## Features

Crawlers based on simple requests to HTML files are generally fast. However, it sometimes ends up capturing empty bodies, especially when the websites are built on such modern frontend frameworks as [AngularJS](https://angularjs.org), [React](https://reactjs.org) and [Vue.js](https://jp.vuejs.org/index.html).

Powered by Headless Chrome, the crawler provides [simple APIs](#api-reference) to crawl these dynamic websites with the following features:

* Distributed crawling
* Configure concurrency, delay and retry
* Support both [depth-first search](https://en.wikipedia.org/wiki/Depth-first_search) and [breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search) algorithm
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

```sh
yarn add headless-chrome-crawler
# or "npm i headless-chrome-crawler"
```

> **Note**: headless-chrome-crawler contains [Puppeteer](https://github.com/GoogleChrome/puppeteer). During installation, it automatically downloads a recent version of Chromium. To skip the download, see [Environment variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).

### Usage

```js
const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    // Function to be evaluated in browsers
    evaluatePage: (() => ({
      title: $('title').text(),
    })),
    // Function to be called with evaluated results from browsers
    onSuccess: (result => {
      console.log(result);
    }),
  });
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
  await crawler.onIdle(); // Resolved when no queue is left
  await crawler.close(); // Close the crawler
})();
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

See [here](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/API.md) for the API reference.

### Launch options

[HCCrawler.launch()](#hccrawlerlaunchoptions)'s options are passed to [puppeteer.launch()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions). It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
HCCrawler.launch({ headless: false, slowMo: 10 });
```

Also, the `args` option is passed to the browser instance. List of Chromium flags can be found [here](http://peter.sh/experiments/chromium-command-line-switches/). Passing `--disable-web-security` flag is useful for crawling. If the flag is set, links within iframes are collected as those of parent frames. If it's not, the source attributes of the iframes are collected as links.

```js
HCCrawler.launch({ args: ['--disable-web-security'] });
```

### Running tests

All tests but [RedisCache's](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/test/cache/redis.test.js) are run by the following command:

```sh
yarn test
```

When you modify [RedisCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/cache/redis.js)'s code, make sure that [Redis](https://redis.io/) is installed, start the server and run all tests with the following command:

```sh
yarn test-all
```

### Enable debug logging

All requests and browser's logs are logged via the [debug](https://github.com/visionmedia/debug) module under the `hccrawler` namespace.

```sh
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

### How is this different from Puppeteer?

This crawler is built on top of [Puppeteer](https://github.com/GoogleChrome/puppeteer).

[Puppeteer](https://github.com/GoogleChrome/puppeteer) provides low to mid level APIs to manupulate Headless Chrome, so you can build your own crawler with it. This way you have more controls on what features to implement in order to satisfy your needs.

However, most crawlers requires such common features as following links, obeying [robots.txt](https://developers.google.com/search/reference/robots_txt) and etc. This crawler is a general solution for most crawling purposes. If you want to quickly start crawling with Headless Chrome, this crawler is for you.

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
