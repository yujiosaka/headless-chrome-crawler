const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
    userAgent: window.navigator.userAgent,
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/', device: 'iPhone 6 Plus' });
    crawler.queue({ url: 'https://example.com/', device: 'Nexus 7' });
    crawler.queue({ url: 'https://example.com/', userAgent: 'Awesome Crawler' }); // Only override userAgent
    crawler.onIdle()
      .then(() => crawler.close());
  });
