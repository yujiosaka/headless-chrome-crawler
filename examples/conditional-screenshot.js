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
    if (!options.saveAs) return false; // Skip the request by returning false
    options.screenshot = { path: `${PATH}${options.saveAs}` };
    return true;
  }),
})
  .then(crawler => {
    crawler.queue({ url: 'https://example.com/' });
    // saveAs is a custom option for preRequest to conditionally modify options and skip requests
    crawler.queue({ url: 'https://example.net/', saveAs: 'example-net.png' });
    crawler.queue({ url: 'https://example.org/', saveAs: 'example-org.png' });
    crawler.onIdle()
      .then(() => crawler.close());
  });
