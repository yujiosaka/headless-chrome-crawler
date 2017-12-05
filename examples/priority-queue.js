const HCCrawler = require('../lib/hccrawler');

HCCrawler.launch({
  concurrency: 1,
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
    hccrawler.queue({ url: 'https://example.com' }); // First queue will be requested first regardless of priority
    hccrawler.queue({ url: 'https://example.net', priority: 1 });
    hccrawler.queue({ url: 'https://example.org', priority: 2 }); // This queue is requested before the previous queue
    hccrawler.onIdle()
      .then(() => hccrawler.close());
  });
