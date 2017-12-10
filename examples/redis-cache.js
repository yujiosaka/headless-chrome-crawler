const HCCrawler = require('../');

// Passing no options expects Redis to be run in the local machine with default port.
const cache = new HCCrawler.RedisCache();

HCCrawler.launch({
  maxConcurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
  cache,
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.queue('https://example.net/');
    crawler.queue('https://example.com/'); // The queue won't be requested
    crawler.onIdle()
      .then(() => crawler.close());
  });
