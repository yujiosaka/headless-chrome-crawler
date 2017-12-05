const HCCrawler = require('../lib/hccrawler');

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
  .then(hccrawler => {
    hccrawler.queue('https://example.com');
    hccrawler.queue('https://example.net');
    hccrawler.queue('https://example.org');
    hccrawler.queue('https://example.com'); // The queue won't be requested
    hccrawler.onIdle()
      .then(() => hccrawler.close());
  });
