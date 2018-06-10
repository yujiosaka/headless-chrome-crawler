# Tips

## Distributed crawling

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

(async () => {
  const crawler = await HCCrawler.launch({
    maxDepth: 3,
    cache,
  });
  await crawler.queue(TOP_PAGES);
})();
```

## Launch options

[HCCrawler.launch()](#hccrawlerlaunchoptions)'s options are passed to [puppeteer.launch()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions). It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
HCCrawler.launch({ headless: false, slowMo: 10 });
```

Also, the `args` option is passed to the browser instance. List of Chromium flags can be found [here](http://peter.sh/experiments/chromium-command-line-switches/). Passing `--disable-web-security` flag is useful for crawling. If the flag is set, links within iframes are collected as those of parent frames. If it's not, the source attributes of the iframes are collected as links.

```js
HCCrawler.launch({ args: ['--disable-web-security'] });
```

## Running tests

All tests but [RedisCache's](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/test/cache/redis.test.js) are run by the following command:

```sh
yarn test
```

When you modify [RedisCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/cache/redis.js)'s code, make sure that [Redis](https://redis.io/) is installed, start the server and run all tests with the following command:

```sh
yarn test-all
```

## Enable debug logging

All requests and browser's logs are logged via the [debug](https://github.com/visionmedia/debug) module under the `hccrawler` namespace.

```sh
env DEBUG="hccrawler:*" node script.js
env DEBUG="hccrawler:request" node script.js
env DEBUG="hccrawler:browser" node script.js
```

## Crawl in Docker

Build the container with [this Dockerfile](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/Dockerfile):

```sh
docker build -t headless-chrome-crawler-linux .
```

Run the container by passing `node -e "<yourscript.js content as a string>"` as the command:

```sh
docker run -i --rm --cap-add=SYS_ADMIN \
  --name headless-chrome-crawler headless-chrome-crawler-linux \
  node -e "`cat yourscript.js`"
```
