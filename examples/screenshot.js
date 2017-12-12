const HCCrawler = require('headless-chrome-crawler');

const PATH = './tmp/example-com.png';

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  onSuccess: (result => {
    console.log(`Screenshot is saved as ${PATH}`, result);
  }),
  screenshot: {
    path: PATH,
  },
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.onIdle()
      .then(() => crawler.close());
  });
