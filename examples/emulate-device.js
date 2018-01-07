const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  url: 'https://example.com/',
  evaluatePage: (() => ({
    userAgent: window.navigator.userAgent,
  })),
  onSuccess: (result => {
    console.log(`Emulated ${result.result.userAgent} for ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue({ device: 'Nexus 7' });
    crawler.queue({ userAgent: 'headless-chrome-crawler' }); // Only override userAgent
    crawler.onIdle()
      .then(() => crawler.close());
  });
