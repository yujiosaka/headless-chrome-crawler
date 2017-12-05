const HCCrawler = require('../lib/hccrawler');

HCCrawler.launch({
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
    hccrawler.queue('https://example.com'); // one URL
    hccrawler.queue(['https://example.net', { url: 'https://example.org' }]); // multiple URLs in different styles.
    return hccrawler.onIdle()
      .then(() => hccrawler.close());
  });
