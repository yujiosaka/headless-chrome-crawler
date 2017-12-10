const HCCrawler = require('../');

HCCrawler.launch({
  maxConcurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
    p: $('p').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
  preRequest: (options => {
    if (options.url === 'https://example.net/') return false;
    return true;
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.queue('https://example.net/');
    crawler.onIdle()
      .then(() => crawler.close());
  });
