const HCCrawler = require('../lib/hccrawler');

const hccrawler = new HCCrawler({
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
    p: $('p').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
});

hccrawler.launch()
  .then(() => {
    hccrawler.queue({ url: 'https://example.com', device: 'iPhone 6 Plus' });
    hccrawler.queue({ url: 'https://example.com', device: 'iPad' });
    hccrawler.queue({ url: 'https://example.com', device: 'Nexus 7' });
    return hccrawler.onIdle();
  })
  .then(() => {
    hccrawler.close();
  });
