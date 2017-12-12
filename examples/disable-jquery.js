const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  jQuery: false, // jQuery script tag won't be added
  retryCount: 3, // Retry the same request up to 3 times
  retryDelay: 1000, // Wait 1000 msecs before each retry
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  // Should not be called because evaluatePage causes an error
  onSuccess: (result => {
    console.log(result);
  }),
  // Catch the error vecause $ is undefined
  onError: (err => {
    console.error('onError', err);
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.onIdle()
      .then(() => crawler.close());
  });
