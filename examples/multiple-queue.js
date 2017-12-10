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
    crawler.queue('https://example.com/'); // one URL
    crawler.queue(['https://example.net/', { url: 'https://example.org/' }]); // multiple URLs in different styles.
    crawler.onIdle()
      .then(() => crawler.close());
  });
