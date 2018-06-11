const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    customCrawl: async (page, crawl) => {
      // You can access the page object before requests
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().endsWith('/')) {
          request.continue();
        } else {
          request.abort();
        }
      });
      // The result contains options, links, cookies and etc.
      const result = await crawl();
      // You can access the page object after requests
      result.content = await page.content();
      // You need to extend and return the crawled result
      return result;
    },
    onSuccess: result => {
      console.log(`Got ${result.content} for ${result.options.url}.`);
    },
  });
  await crawler.queue('https://example.com/');
  await crawler.onIdle();
  await crawler.close();
})();
