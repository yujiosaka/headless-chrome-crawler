## Debugging tips

### Puppeteer options

[hccrawler.launch](https://github.com/yujiosaka/headless-chrome-crawler#chcrawlerlaunchoptions)'s options are passed straight to [Puppeteer.launch API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).
It may be useful to set the `headless` and `slowMo` options so that you can see what is going on.

```js
crawler.launch({ headless: false, slowMo: 10 });
```
