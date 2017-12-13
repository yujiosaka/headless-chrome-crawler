const HCCrawler = require('headless-chrome-crawler');

const PATH = './tmp/';

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  onSuccess: (result => {
    console.log(`Screenshot is saved as ${PATH}${result.options.saveAs}`);
  }),
  preRequest: (options => {
    if (!options.saveAs) return false;
    options.screenshot = { path: `${PATH}${options.saveAs}` }; /* eslint no-param-reassign: 0 */
    return true;
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/' });
    // saveAd is a custom option added for onSuccess and screenshot callbacks
    crawler.queue({ url: 'https://example.net/', saveAs: 'example-net.png' });
    crawler.queue({ url: 'https://example.org/', saveAs: 'example-org.png' });
    crawler.onIdle()
      .then(() => crawler.close());
  });
