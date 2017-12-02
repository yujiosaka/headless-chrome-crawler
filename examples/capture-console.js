const HCCrawler = require('../lib/hccrawler');

const hccrawler = new HCCrawler({
  captureConsole: true,
  evaluatePage: (() => {
    const $elem = $('p');
    console.error('p length', $elem.length);
    return $elem.text();
  }),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
});

hccrawler.launch()
  .then(() => {
    hccrawler.queue('https://example.com');
    return hccrawler.onIdle();
  })
  .then(() => {
    hccrawler.close();
  });
