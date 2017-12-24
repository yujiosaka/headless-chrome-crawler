const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  onSuccess: (result => {
    console.log(`Got ${result.result.title} for ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/'); // Queue a request
    crawler.queue(['https://example.net/', { url: 'https://example.org/' }]); // Queue multiple requests in different styles
    crawler.onIdle()
      .then(() => crawler.close());
  });
