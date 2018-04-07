const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    maxConcurrency: 1,
    maxRequest: 2,
    onSuccess: (result => {
      console.log(`Requested ${result.options.url}.`);
    }),
  });
  await crawler.queue('https://example.com/');
  await crawler.queue('https://example.net/');
  await crawler.queue('https://example.org/'); // The queue won't be requested until resumed
  await crawler.onIdle();
  crawler.setMaxRequest(3);
  crawler.resume();
  await crawler.onIdle();
  await crawler.close();
})();
