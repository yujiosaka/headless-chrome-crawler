const HCCrawler = require('../');

HCCrawler.launch({
  maxConcurrency: 1,
  maxRequest: 2,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/' });
    crawler.queue({ url: 'https://example.net/' });
    crawler.queue({ url: 'https://example.org/' }); // The queue won't be requested until resumed
    crawler.onIdle()
      .then(() => {
        crawler.setMaxRequest(3);
        crawler.resume();
        return crawler.onIdle();
      })
      .then(() => crawler.close());
  });
