const HCCrawler = require('../');

HCCrawler.launch({
  maxConcurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/' }); // First queue will be requested first regardless of priority
    crawler.queue({ url: 'https://example.net/', priority: 1 });
    crawler.queue({ url: 'https://example.org/', priority: 2 }); // This queue is requested before the previous queue
    crawler.onIdle()
      .then(() => crawler.close());
  });
