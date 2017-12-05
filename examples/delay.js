const HCCrawler = require('../lib/hccrawler');

HCCrawler.launch({
  concurrency: 1, // Concurrency must be 1 when delay is set
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
  .then(hccrawler => {
    hccrawler.queue({ url: 'https://example.com' });
    hccrawler.queue({ url: 'https://example.net' });
    hccrawler.queue({ url: 'https://example.org' });
    hccrawler.onIdle().then(() => hccrawler.close());
  });
