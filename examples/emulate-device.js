const HCCrawler = require('../');

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
    crawler.queue({ url: 'https://example.com/', device: 'iPhone 6 Plus' });
    crawler.queue({ url: 'https://example.com/', device: 'Nexus 7' });
    crawler.onIdle()
      .then(() => crawler.close());
  });
