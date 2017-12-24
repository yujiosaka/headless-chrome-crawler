const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    userAgent: window.navigator.userAgent,
  })),
  onSuccess: (result => {
    console.log(`Emulated ${result.result.userAgent} for ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/', device: 'Nexus 7' });
    crawler.queue({ url: 'https://example.com/', userAgent: 'headless-chrome-crawler' }); // Only override userAgent
    crawler.onIdle()
      .then(() => crawler.close());
  });
