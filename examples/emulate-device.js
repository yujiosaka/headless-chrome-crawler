const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    url: 'https://example.com/',
    evaluatePage: () => ({
      userAgent: window.navigator.userAgent,
    }),
    onSuccess: result => {
      console.log(`Emulated ${result.result.userAgent} for ${result.options.url}.`);
    },
  });
  await crawler.queue({ device: 'Nexus 7' });
  await crawler.queue({ userAgent: 'headless-chrome-crawler' }); // Only override userAgent
  await crawler.onIdle();
  await crawler.close();
})();
