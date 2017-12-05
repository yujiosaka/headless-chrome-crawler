const HCCrawler = require('../');

const requestedObj = {};

HCCrawler.launch({
  concurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
    p: $('p').text(),
  })),
  onSuccess: (result => {
    requestedObj[result.options.url] = true;
    console.log('onSuccess', result);
  }),
  shouldRequest: (options => {
    if (requestedObj[options.url]) return false;
    return true;
  }),
})
  .then(crawler => {
    crawler.queue('https://example.com');
    crawler.queue('https://example.net');
    crawler.queue('https://example.com'); // The queue won't be requested
    crawler.onIdle()
      .then(() => crawler.close());
  });
