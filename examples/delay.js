const HCCrawler = require('../');

HCCrawler.launch({
  maxConcurrency: 1, // Max concurrency must be 1 when delay is set
  delay: 2000, // Delay 2000 millisecnds before each request is sent
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
    p: $('p').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com' });
    crawler.queue({ url: 'https://example.net' });
    crawler.queue({ url: 'https://example.org' });
    crawler.onIdle()
      .then(() => crawler.close());
  });
