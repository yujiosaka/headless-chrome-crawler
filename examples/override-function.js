const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  evaluatePage: (() => {
    throw new Error("Global functions won't be called");
  }),
  onSuccess: (result => {
    console.log(`Got ${result.result.title} for ${result.options.url}.`);
  }),
})
  .then(crawler => {
    crawler.queue({
      url: 'https://example.com/',
      evaluatePage: (() => ({
        title: $('title').text(),
      })),
    });
    crawler.onIdle()
      .then(() => crawler.close());
  });
