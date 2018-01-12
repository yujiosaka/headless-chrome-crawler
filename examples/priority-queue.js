const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  maxConcurrency: 1,
  onSuccess: (result => {
    console.log(`Requested ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/', priority: 1 }); // First queue will be requested first regardless of priority
    crawler.queue({ url: 'https://example.net/', priority: 2 }); // This queue is requested before the previous queue
    crawler.onIdle()
      .then(() => crawler.close());
  });
