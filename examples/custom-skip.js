const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  cache: null, // Disable default session cache
  maxConcurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
  preRequest: (options => {
    if (options.customSkip) return false;
    return true;
  }),
})
  .then(crawler => {
    // You can set custom option to be used in preRequest arguments
    crawler.queue({ url: 'https://example.com/', customSkip: false });
    crawler.queue({ url: 'https://example.com/', customSkip: false }); // This queue will be requested because cache is disabled
    crawler.queue({ url: 'https://example.net/', customSkip: true }); // This queue won't be requrested because preRequest function returns false
    crawler.onIdle()
      .then(() => crawler.close());
  });
