const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    maxConcurrency: 1,
    onSuccess: (result => {
      console.log(`Requested ${result.options.url}.`);
    }),
  });
  crawler.queue({ url: 'https://example.com/', priority: 1 });
  crawler.queue({ url: 'https://example.net/', priority: 2 }); // This queue is requested before the previous queue
  await crawler.onIdle();
  await crawler.close();
})();
