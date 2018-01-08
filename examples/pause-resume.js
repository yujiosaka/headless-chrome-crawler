const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  maxConcurrency: 1,
  maxRequest: 2,
  onSuccess: (result => {
    console.log(`Requested ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.queue('https://example.net/');
    crawler.queue('https://example.org/'); // The queue won't be requested until resumed
    crawler.onIdle()
      .then(() => {
        // Lift the max request limit so that it doesn't become idle right after resume called
        crawler.setMaxRequest(3);
        crawler.resume();
        return crawler.onIdle();
      })
      .then(() => crawler.close());
  });
