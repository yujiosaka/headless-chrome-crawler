const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/'); // Queue a request
    // Queue multiple requests in different styles
    crawler.queue(['https://example.net/', { url: 'https://example.org/' }]);
    crawler.onIdle()
      .then(() => crawler.close());
  });
