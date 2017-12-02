const HCCrawler = require('../lib/hccrawler');

const hccrawler = new HCCrawler({
  // Global functions won't be called
  evaluatePage: (() => {
    throw new Error('Evaluate page function is not overriden!');
  }),
  onSuccess: (() => {
    throw new Error('On sucess function is not overriden!');
  }),
});

hccrawler.launch()
  .then(() => {
    hccrawler.queue({
      url: 'https://example.com',
      evaluatePage: (() => ({
        title: $('title').text(),
        h1: $('h1').text(),
        p: $('p').text(),
      })),
      onSuccess: (result => {
        console.log('onSuccess', result);
      }),
    });
    return hccrawler.onIdle();
  })
  .then(() => {
    hccrawler.close();
  });
