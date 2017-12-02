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
    hccrawler.queue('https://example.com'); // one URL
    hccrawler.queue(['https://example.net', { url: 'https://example.org' }]); // multiple URLs in different styles.
    return hccrawler.onIdle();
  })
  .then(() => {
    hccrawler.close();
  });
