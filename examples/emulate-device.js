const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
    userAgent: window.navigator.userAgent,
  })),
  onSuccess: (result => {
    console.log(result);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/', device: 'Nexus 7' });
    crawler.queue({ url: 'https://example.com/', userAgent: 'headless-chrome-crawler' }); // Only override userAgent
    crawler.onIdle()
      .then(() => crawler.close());
  });
