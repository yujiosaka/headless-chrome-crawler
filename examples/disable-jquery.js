const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  jQuery: false, // jQuery script tag won't be added
  retryCount: 3, // Retry the same request up to 3 times
  retryDelay: 1000, // Wait 1000msecs before each retry
  // $ is undefined so that causes an error
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  // Should not be called because evaluatePage causes an error
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
  // Catch the error caused on evaluatePage
  onError: (err => {
    console.error('onError', err);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.onIdle()
      .then(() => crawler.close());
  });
