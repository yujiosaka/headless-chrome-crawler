const HCCrawler = require('headless-chrome-crawler');

HCCrawler.launch({
  // Global functions won't be called
  evaluatePage: (() => {
    throw new Error('Evaluate page function is not overriden!');
  }),
  onSuccess: (() => {
    throw new Error('On sucess function is not overriden!');
  }),
})
  .then(crawler => {
    crawler.queue({
      url: 'https://example.com/',
      evaluatePage: (() => ({
        title: $('title').text(),
      })),
      onSuccess: (result => {
        console.log(result);
      }),
    });
    crawler.onIdle()
      .then(() => crawler.close());
  });
