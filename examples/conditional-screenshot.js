const HCCrawler = require('headless-chrome-crawler');

const PATH = './tmp/';

HCCrawler.launch({
  evaluatePage: (() => ({
    title: $('title').text(),
  })),
  onSuccess: (result => {
    if (!result.options.saveAs) return;
    console.log(`Screenshot is saved as ${PATH}${result.options.saveAs}`);
  }),
  // Passing a function which resolves screenshot options
  screenshot: (options => {
    if (!options.saveAs) return null;
    return { path: `${PATH}${options.saveAs}` };
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
